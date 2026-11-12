// @ts-check
/**
 * beaTTer v4 — opening detector: a Bayesian matched-filter bank that recognises the ONSET of finger
 * opening while the hand is still in the air (pure).
 *
 * Signal u(t): opening of one finger group relative to the round's fist baseline (0 = fist, 1 = open).
 * Hypotheses for one flight:
 *   H0          "stays closed":  u(t) = 0
 *   H1(a, D)    "opens":         u(t) = A * g((t - a) / D),  g(s) = 10 s^3 - 15 s^4 + 6 s^5
 * with latent onset time `a` and duration `D` (minimum-jerk reach [FlashHogan1985]; shown to describe
 * finger joint trajectories [FriedmanFlash2009]) and amplitude A ~ N(ampMean, ampVar).
 * Observations are RAW per-frame samples with independent Gaussian noise; velocity information is used
 * implicitly through the fit to the trajectory family, never through numerical differentiation.
 *
 * Two read-outs:
 *   headingNow()  — the REFEREE's quantity: P(group has measurably opened by now | frames so far) under a
 *                   fixed flat prior. It depends on nothing but the observed frames (no landing estimate,
 *                   no player model), so the AI and the referee always compute the same number.
 *   evidence()    — the AI's quantity: marginal log-likelihoods of "stay", "opens in time", "opens too
 *                   late" under a learned onset prior anchored to the predicted landing time. A fist that
 *                   is still closed as landing approaches becomes evidence for ROCK because the prior mass
 *                   of onsets that could still be in time runs out ("evidence of absence").
 */

export const DEFAULTS = Object.freeze({
  /** Spacing of the latent onset grid (ms). */
  onsetStepMs: 16,
  /** Length of the onset grid = longest flight handled (ms). */
  maxFlightMs: 1200,
  /**
   * Latent opening durations (ms). Fast throws complete in roughly 60-130 ms [Katsuki2015; Li2023];
   * relaxed ones take several hundred ms [Carpinella2011].
   */
  durationsMs: Object.freeze([45, 65, 90, 125, 175, 245, 340]),
  /** Time constant of the exponential forgetting of log-evidence (ms). */
  memoryMs: 140,
  /** Mean and variance of the final opening amplitude (baseline-relative units). */
  ampMean: 1,
  ampVar: 0.03,
  /** Extra variance of a closed group around 0 (fist wobble, scissors enslaving of ring/pinky). */
  stayVar: 0.004,
  /** A group counts as "measurably open" from this fraction of its amplitude (dimensionless). */
  legalProgress: 0.15,
  /** evidence(): onsets up to this long after the predicted landing are still modelled (ms). */
  lateSlackMs: 150,
  /** Flat prior over durations used by headingNow(): LogNormal(log-mean, log-sd). */
  flatDurLogMean: Math.log(120),
  flatDurLogSd: 0.6,
  /** Re-anchoring: closed threshold = max(closedSigmas * noise sd, closedMin), for reanchorFrames frames. */
  closedSigmas: 3,
  closedMin: 0.12,
  reanchorFrames: 2,
});

/**
 * @typedef {{kind:'lead', leadMeanMs:number, leadSdMs:number, durLogMean:number, durLogSd:number}
 *         | {kind:'absolute', onsetMeanT:number, onsetSdMs:number, durLogMean:number, durLogSd:number}} OnsetPrior
 */

/**
 * @typedef {Object} OpeningEvidence
 * @property {number} logStay       log-likelihood of H0
 * @property {number} logOpenLegal  log marginal likelihood of openings that reach legalProgress by landing
 * @property {number} logOpenLate   log marginal likelihood of openings that do not
 * @property {number|null} meanOnsetT  posterior-mean onset time under H1
 * @property {number|null} mapOnsetT   onset time of the best cell
 * @property {number|null} mapDurationMs
 * @property {number|null} expectedProgressAtLanding posterior-mean progress at the predicted landing under H1
 * @property {number} frames        frames observed since the last (re)anchor
 */

const LOG_2PI = Math.log(2 * Math.PI);
/** Gaussian log-density without argument checks (hot path). @param {number} x @param {number} m @param {number} v */
const glp = (x, m, v) => -0.5 * (LOG_2PI + Math.log(v)) - (0.5 * (x - m) * (x - m)) / v;
/** Minimum-jerk position profile, clamped. @param {number} s */
const mj = (s) => (s <= 0 ? 0 : s >= 1 ? 1 : s * s * s * (10 - 15 * s + 6 * s * s));

/** Streaming log-sum-exp accumulator. */
function makeLse() {
  let m = -Infinity, acc = 0;
  return {
    /** @param {number} v */
    add(v) {
      if (v === -Infinity || v !== v) return;
      if (v > m) { acc = acc * Math.exp(m - v) + 1; m = v; } else acc += Math.exp(v - m);
    },
    value: () => (m === -Infinity ? -Infinity : m + Math.log(acc)),
  };
}

/**
 * @param {Partial<typeof DEFAULTS>} [cfg]
 */
export function createOpeningDetector(cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const D = Float64Array.from(c.durationsMs);
  const nD = D.length;
  const nTotal = Math.floor(c.maxFlightMs / c.onsetStepMs) + 1;
  /** log-weights of the materialised cells, row i (onset) x column j (duration) */
  let LW = new Float64Array(nTotal * nD);
  let nMat = 0;
  let lw0 = 0;
  let tStart = 0;
  let tNow = 0;
  /** @type {number|null} */ let lastT = null;
  let frames = 0;
  let closedRun = 0;
  let reanchors = 0;
  /** @type {number[]} */ let traceT = [];
  /** @type {number[]} */ let traceU = [];

  // flat duration weights for headingNow(), normalised
  const flatD = new Float64Array(nD);
  {
    const acc = makeLse();
    for (let j = 0; j < nD; j++) { flatD[j] = glp(Math.log(D[j]), c.flatDurLogMean, c.flatDurLogSd * c.flatDurLogSd); acc.add(flatD[j]); }
    const z = acc.value();
    for (let j = 0; j < nD; j++) flatD[j] -= z;
  }
  const LOG_HALF = Math.log(0.5);
  const LOG_CELL = LOG_HALF - Math.log(nTotal);

  /** @param {number} t */
  const anchor = (t) => {
    tStart = t; tNow = t; nMat = 0; lw0 = 0; lastT = null; frames = 0; closedRun = 0;
  };

  /** (Re)start the bank: every onset is >= tStart. Clears the trace. @param {number} t */
  const reset = (t) => {
    anchor(Number.isFinite(t) ? t : 0);
    traceT = []; traceU = []; reanchors = 0;
  };

  /**
   * Move the anchor to `t` without clearing the trace or counting a feint. Only meaningful while the
   * group is still closed (heading ~ 0): it keeps the onset grid over the near future when the wait
   * before the throw is longer than the grid (single-stroke mode).
   * @param {number} t
   */
  const slide = (t) => { if (Number.isFinite(t)) anchor(t); };

  const headingNow = () => {
    const open = makeLse(), closed = makeLse();
    closed.add(LOG_HALF + lw0);
    for (let i = 0; i < nMat; i++) {
      const el = tNow - (tStart + i * c.onsetStepMs);
      const row = i * nD;
      for (let j = 0; j < nD; j++) {
        const v = LOG_CELL + flatD[j] + LW[row + j];
        if (mj(el / D[j]) >= c.legalProgress) open.add(v); else closed.add(v);
      }
    }
    if (nMat < nTotal) closed.add(LOG_HALF + Math.log((nTotal - nMat) / nTotal) + lw0);
    const so = open.value(), sc = closed.value();
    if (so === -Infinity) return 0;
    const m = Math.max(so, sc);
    return Math.exp(so - m) / (Math.exp(so - m) + Math.exp(sc - m));
  };

  /**
   * Feed one in-flight frame.
   * @param {number} t capture time (ms) @param {number} uObs raw baseline-relative opening
   * @param {number} noiseVar measurement variance of uObs
   * @returns {{reanchored: boolean}}
   */
  const observe = (t, uObs, noiseVar) => {
    if (!Number.isFinite(t) || !Number.isFinite(uObs) || !(noiseVar > 0) || !Number.isFinite(noiseVar)) return { reanchored: false };
    if (lastT !== null && t < lastT) return { reanchored: false };
    traceT.push(t); traceU.push(uObs);

    // Re-anchoring: the bank models ONE opening from a fist. If the group is measurably back at the fist
    // while the bank still says "open", restart it (legitimate in-air feints: open, then re-close).
    let reanchored = false;
    const closedThresh = Math.max(c.closedSigmas * Math.sqrt(noiseVar), c.closedMin);
    closedRun = uObs < closedThresh ? closedRun + 1 : 0;
    if (closedRun >= c.reanchorFrames && frames > 0 && headingNow() > 0.5) {
      anchor(t); reanchors += 1; reanchored = true;
    }

    // materialise the onset rows that have just become "past": until now they predicted u = 0, exactly as H0
    while (nMat < nTotal && tStart + nMat * c.onsetStepMs <= t) {
      LW.fill(lw0, nMat * nD, (nMat + 1) * nD);
      nMat += 1;
    }
    const dt = lastT === null ? 0 : t - lastT;
    const lam = Math.exp(-dt / c.memoryMs);
    const l0 = glp(uObs, 0, noiseVar + c.stayVar);
    for (let i = 0; i < nMat; i++) {
      const el = t - (tStart + i * c.onsetStepMs);
      const row = i * nD;
      for (let j = 0; j < nD; j++) {
        const g = mj(el / D[j]);
        LW[row + j] = lam * LW[row + j] + (g === 0 ? l0 : glp(uObs, c.ampMean * g, noiseVar + g * g * c.ampVar));
      }
    }
    lw0 = lam * lw0 + l0;
    lastT = t; tNow = t; frames += 1;
    return { reanchored };
  };

  /**
   * Marginal log-likelihoods under a learned onset prior anchored to the predicted landing.
   * @param {number} tLandHat predicted (or measured) landing time
   * @param {OnsetPrior} prior
   * @returns {OpeningEvidence}
   */
  const evidence = (tLandHat, prior) => {
    const tL = Number.isFinite(tLandHat) ? tLandHat : tNow;
    const horizon = Math.max(tL + c.lateSlackMs, tNow);
    const rows = Math.min(nTotal, Math.max(1, Math.floor((horizon - tStart) / c.onsetStepMs) + 1));
    const lpD = new Float64Array(nD);
    const dVar = prior.durLogSd * prior.durLogSd;
    for (let j = 0; j < nD; j++) lpD[j] = glp(Math.log(D[j]), prior.durLogMean, dVar);
    const absolute = prior.kind === 'absolute';
    const onMean = absolute ? prior.onsetMeanT : prior.leadMeanMs;
    const onVar = absolute ? prior.onsetSdMs * prior.onsetSdMs : prior.leadSdMs * prior.leadSdMs;

    // pass 1: prior normaliser
    const zAcc = makeLse();
    const lpOn = new Float64Array(rows);
    for (let i = 0; i < rows; i++) {
      const a = tStart + i * c.onsetStepMs;
      lpOn[i] = glp(absolute ? a : tL - a, onMean, onVar);
      for (let j = 0; j < nD; j++) zAcc.add(lpOn[i] + lpD[j]);
    }
    const z = zAcc.value();

    // pass 2: posterior mass split into legal / late, plus summaries under H1
    const legal = makeLse(), late = makeLse();
    let best = -Infinity, bestA = null, bestD = null;
    let wSum = 0, wOnset = 0, wProg = 0, ref = -Infinity;
    for (let i = 0; i < rows; i++) {
      const a = tStart + i * c.onsetStepMs;
      const row = i * nD;
      for (let j = 0; j < nD; j++) {
        const v = lpOn[i] + lpD[j] - z + (i < nMat ? LW[row + j] : lw0);
        const prog = mj((tL - a) / D[j]);
        if (prog >= c.legalProgress) legal.add(v); else late.add(v);
        if (v > best) { best = v; bestA = a; bestD = D[j]; }
        if (v > ref) { const k = Math.exp(ref - v); wSum *= k; wOnset *= k; wProg *= k; ref = v; }
        const w = Math.exp(v - ref);
        wSum += w; wOnset += w * a; wProg += w * prog;
      }
    }
    return {
      logStay: lw0,
      logOpenLegal: legal.value(),
      logOpenLate: late.value(),
      meanOnsetT: wSum > 0 ? wOnset / wSum : null,
      mapOnsetT: bestA,
      mapDurationMs: bestD,
      expectedProgressAtLanding: wSum > 0 ? wProg / wSum : null,
      frames,
    };
  };

  const trace = () => ({ t: traceT.slice(), u: traceU.slice() });

  const clone = () => {
    const d = createOpeningDetector(c);
    d._restore({ LW: LW.slice(), nMat, lw0, tStart, tNow, lastT, frames, closedRun, reanchors, traceT: traceT.slice(), traceU: traceU.slice() });
    return d;
  };

  /** @param {any} s internal: used by clone() only */
  const _restore = (s) => {
    LW = s.LW; nMat = s.nMat; lw0 = s.lw0; tStart = s.tStart; tNow = s.tNow; lastT = s.lastT;
    frames = s.frames; closedRun = s.closedRun; reanchors = s.reanchors; traceT = s.traceT; traceU = s.traceU;
  };

  return {
    reset, slide, observe, headingNow, evidence, trace, clone, _restore,
    get frames() { return frames; },
    get reanchors() { return reanchors; },
    get anchorT() { return tStart; },
  };
}

/** Linear interpolation of the first upward crossing of `level` at or after sample k0. */
function crossing(/** @type {number[]} */ t, /** @type {number[]} */ u, /** @type {number} */ level, k0 = 0) {
  for (let k = Math.max(0, k0); k < u.length; k++) {
    if (u[k] >= level) {
      if (k === 0 || u[k - 1] >= level) return t[k];
      const f = (level - u[k - 1]) / (u[k] - u[k - 1]);
      return t[k - 1] + f * (t[k] - t[k - 1]);
    }
  }
  return null;
}

/**
 * Measure an opening after the fact (for learning the player's onset timing and speed).
 * @param {{t:number[], u:number[]}} trace raw samples of one flight (may extend past landing)
 * @param {number} tLand measured landing time
 * @param {number} noiseSd measurement noise sd of u
 * @returns {{opened:boolean, onsetT:number|null, t10:number|null, t90:number|null, durationMs:number|null,
 *            progressAtLanding:number|null, amplitude:number, peakVelocity:number|null} | null}
 */
export function measureOpening(trace, tLand, noiseSd) {
  const { t, u } = trace;
  const n = Math.min(t.length, u.length);
  if (n < 3) return null;
  const thr = Math.max(3 * noiseSd, 0.08);
  let onsetK = -1;
  for (let k = 0; k + 1 < n; k++) if (u[k] > thr && u[k + 1] > thr) { onsetK = k; break; }
  const sorted = u.slice(0, n).sort((a, b) => a - b);
  const amplitude = sorted[Math.min(n - 1, Math.floor(0.95 * n))];
  let peakVelocity = null;
  for (let k = 1; k < n; k++) {
    const dt = t[k] - t[k - 1];
    if (dt > 0) { const v = (1000 * (u[k] - u[k - 1])) / dt; if (peakVelocity === null || v > peakVelocity) peakVelocity = v; }
  }
  if (onsetK < 0 || amplitude < 0.4) {
    return { opened: false, onsetT: null, t10: null, t90: null, durationMs: null, progressAtLanding: null, amplitude, peakVelocity };
  }
  const t10 = crossing(t, u, 0.1 * amplitude, Math.max(0, onsetK - 2));
  const t90 = t10 === null ? null : crossing(t, u, 0.9 * amplitude, onsetK);
  // the 10-90 % rise of a minimum-jerk profile lasts 0.506 * D
  const durationMs = t10 !== null && t90 !== null && t90 > t10 ? (t90 - t10) / 0.506 : null;
  // onset of the fitted profile: the 10 % point lies 0.247 * D after the true onset
  const onsetT = t10 !== null && durationMs !== null ? t10 - 0.247 * durationMs : crossing(t, u, thr, Math.max(0, onsetK - 1));
  let progressAtLanding = null;
  for (let k = 1; k < n; k++) {
    if (t[k] >= tLand) {
      const f = t[k] === t[k - 1] ? 0 : Math.min(1, Math.max(0, (tLand - t[k - 1]) / (t[k] - t[k - 1])));
      progressAtLanding = Math.min(1.2, Math.max(0, (u[k - 1] + f * (u[k] - u[k - 1])) / amplitude));
      break;
    }
  }
  if (progressAtLanding === null) progressAtLanding = Math.min(1.2, Math.max(0, u[n - 1] / amplitude));
  return { opened: true, onsetT, t10, t90, durationMs, progressAtLanding, amplitude, peakVelocity };
}
