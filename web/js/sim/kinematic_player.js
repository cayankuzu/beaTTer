// @ts-check
/**
 * beaTTer v4 — synthetic kinematic player: generates the camera frames of one complete round (pure).
 *
 * A round = lead-in rest, `primeBeats` fist pumps, the throw stroke with finger opening, and a settle
 * period. Palm height follows alternating minimum-jerk strokes; each finger opens along a minimum-jerk
 * profile [FlashHogan1985; FriedmanFlash2009] whose onset (lead before landing) and duration are drawn
 * from the chosen opener style. Options add in-air feints, late throws, tracking drop-outs, non-RPS
 * shapes and a missing fist.
 *
 * The style parameters are ASSUMPTIONS that span the range reported for fast and relaxed hand opening
 * (about 60-130 ms for fast throws [Katsuki2015; Li2023]); they are not measurements of real players.
 * Everything produced here is simulation.
 *
 * By default this player is MATCHED to the detector: it opens along the same minimum-jerk family the
 * opening detector assumes, to full amplitude, with independent Gaussian landmark noise and a hand that
 * is the exact inverse of the kinematics module. Numbers measured on it show the system at its best.
 * The `perturb` option breaks each of those assumptions on purpose (other opening profiles, partial
 * openings, finger asynchrony, correlated / speed-dependent noise, outliers, a differently built hand);
 * experiment E8 uses it to show how much of the result depends on the match.
 */

import { minJerk } from '../core/math.js';
import { ROCK, PAPER, SCISSORS } from '../core/constants.js';
import { handLandmarks, rotationFromEuler } from './hand_model.js';
import { palmSize, defaultCalibration } from '../core/kinematics.js';

/** @typedef {import('../core/constants.js').HandFrame} HandFrame */

/** Opener styles: when the fingers start to open, as a lead before landing (ms). */
export const STYLES = Object.freeze({
  early: Object.freeze({ leadMean: 260, leadSd: 60 }),
  normal: Object.freeze({ leadMean: 170, leadSd: 60 }),
  late: Object.freeze({ leadMean: 80, leadSd: 35 }),
});

/** @param {keyof typeof STYLES | {leadMean:number, leadSd:number}} style */
export function makeStyle(style) {
  if (typeof style === 'string') {
    const s = STYLES[style];
    if (!s) throw new RangeError(`makeStyle: unknown style ${style}`);
    return s;
  }
  return style;
}

export const DEFAULTS = Object.freeze({
  fps: 30,
  primeBeats: 3,
  leadInMs: 450,
  settleMs: 750,
  /** Rhythm: mean period (ms), its coefficient of variation, share of the period spent descending. */
  periodMs: 520,
  periodCv: 0.05,
  descentFrac: 0.38,
  /** Stroke amplitude in palm lengths. */
  amplitudeMean: 1.6,
  amplitudeSd: 0.3,
  /** Opening duration: LogNormal(ln durMedianMs, durLogSd). */
  durMedianMs: 130,
  durLogSd: 0.35,
  /** Ring/pinky onset relative to index/middle for PAPER (ms). */
  groupDelayMean: 15,
  groupDelaySd: 20,
  /** Residual ring/pinky opening in SCISSORS (enslaving). */
  enslaveMean: 0.08,
  enslaveSd: 0.04,
  /** Landmark noise: world coordinates (m) and image coordinates (image heights). */
  worldNoiseSd: 0.002,
  imageNoiseSd: 0.003,
  /** Palm size and position in the image (image-height units). */
  palmSize: 0.19,
  palmX: 0.66,
  palmTopY: 0.36,
  aspect: 4 / 3,
  timestampJitterMs: 2,
  /** Probability that the canned gesture label is wrong/absent on a settled shape. */
  neuralMissRate: 0.05,
});

/** Opening profiles (progress 0..1 over normalised time 0..1). Only 'minjerk' is what the detector assumes. */
export const PROFILES = Object.freeze({
  minjerk: (/** @type {number} */ s) => minJerk(s),
  linear: (/** @type {number} */ s) => Math.min(1, Math.max(0, s)),
  /** abrupt start, slow finish */
  exponential: (/** @type {number} */ s) => (s <= 0 ? 0 : s >= 1 ? 1 : (1 - Math.exp(-4 * s)) / (1 - Math.exp(-4))),
  /** slow start, late acceleration */
  cubicIn: (/** @type {number} */ s) => (s <= 0 ? 0 : s >= 1 ? 1 : s * s * s),
});

/**
 * @typedef {Object} Perturbation  deliberate mismatches between the synthetic player and the detector
 * @property {keyof typeof PROFILES} [profile]          finger opening profile (default 'minjerk')
 * @property {number} [asyncSdMs]                       sd of each finger's own onset offset (default 5)
 * @property {{mean:number, sd:number}} [openAmplitude] final extension of the fingers that open (default 1)
 * @property {number} [durMedianMs]                     median opening duration (default cfg.durMedianMs)
 * @property {{mean:number, sd:number}} [groupDelay]    ring/pinky delay in PAPER
 * @property {number} [noiseRho]                        AR(1) correlation of the landmark noise between frames
 * @property {number} [noiseSpeedGain]                  noise sd x (1 + gain * min(1.5, palm speed / 8 PL/s))
 * @property {number} [outlierRate]                     share of frames in which one fingertip jumps
 * @property {number} [outlierM]                        size of that jump (m, sd; default 0.03)
 * @property {number} [palmJitterSd]                    relative jitter of the apparent hand size per frame
 * @property {number} [pitchDeg]                        wrist pitch along the stroke (foreshortens the palm)
 * @property {number} [loosen]                          inertial loosening of closed fingers at stroke speed
 * @property {boolean} [loosenThrowOnly]                ... only during the throw stroke
 * @property {{thetaFist:number[], thetaOpen:number[]}} [handCalibration]  the hand's true fist / open angles
 */

/**
 * Value of a chained trajectory at time t.
 * @param {number} base @param {{t0:number, dur:number, to:number}[]} segs in time order
 * @param {number} t @param {(s:number) => number} [profile]
 */
function chained(base, segs, t, profile = minJerk) {
  let v = base;
  for (const s of segs) {
    if (t < s.t0) break;
    v = v + (s.to - v) * profile((t - s.t0) / s.dur);
  }
  return v;
}

/**
 * Vertical stroke profile: palm height (palm lengths below the top position) at time t.
 * @param {{bottoms:number[], descents:number[], amplitudes:number[]}} plan bottom times, descent durations and amplitudes per stroke
 * @param {number} t
 * @returns {{y:number, speed:number}} y in PL (0 = top), speed in PL/s (absolute)
 */
export function strokeProfile(plan, t) {
  const { bottoms, descents, amplitudes } = plan;
  const n = bottoms.length;
  const eps = 4;
  const pos = (/** @type {number} */ tt) => {
    if (n === 0 || tt <= bottoms[0] - descents[0]) return 0;
    for (let k = 0; k < n; k++) {
      const start = bottoms[k] - descents[k];
      if (tt >= start && tt <= bottoms[k]) return amplitudes[k] * minJerk((tt - start) / descents[k]);
      if (k + 1 < n) {
        const nextStart = bottoms[k + 1] - descents[k + 1];
        if (tt > bottoms[k] && tt < nextStart) return amplitudes[k] * (1 - minJerk((tt - bottoms[k]) / (nextStart - bottoms[k])));
      }
    }
    return amplitudes[n - 1]; // after the last bottom: hold
  };
  const y = pos(t);
  return { y, speed: Math.abs((pos(t + eps) - pos(t - eps)) / (2 * eps)) * 1000 };
}

/**
 * Generate the frames of one round.
 * @param {Object} o
 * @param {0|1|2} o.move                                   intended final throw
 * @param {{next():number, normal(m?:number,s?:number):number, int(n:number):number}} o.rng
 * @param {number} [o.fps]
 * @param {keyof typeof STYLES | {leadMean:number, leadSd:number}} [o.style]
 * @param {number} [o.primeBeats]                          0, 2 or 3
 * @param {number} [o.t0]                                  capture time of the first frame (ms)
 * @param {number} [o.frameIndex]                          index of the first frame
 * @param {{from:0|1|2, switchLeadMs:number, morphMs:number, fromLeadMs?:number}|null} [o.feint]  in-air feint
 * @param {{afterLandingMs:number}|null} [o.late]          fingers start to open only after landing
 * @param {number[]|null} [o.nonRps]                       final extension vector (thumb..pinky) of a non-RPS shape
 * @param {boolean} [o.noFist]                             shape already shown during the priming beats
 * @param {number} [o.dropout]                             base probability that a frame has no hand
 * @param {'Left'|'Right'} [o.handed]
 * @param {number} [o.throwAmplitudeScale]                 scale of the throw stroke (soft throws < 1)
 * @param {number[]} [o.beatTimes]                         explicit bottom times (primeBeats + 1 values) for metronome-led rounds
 * @param {boolean} [o.still]                              hand held still: only the fingers move
 * @param {Perturbation} [o.perturb]                       deliberate model mismatch (see the typedef)
 * @param {Partial<typeof DEFAULTS>} [o.cfg]
 * @returns {{frames: HandFrame[], truth: any}}
 */
export function simulateThrow(o) {
  const c = { ...DEFAULTS, ...(o.cfg ?? {}) };
  const rng = o.rng;
  const fps = o.fps ?? c.fps;
  const primeBeats = o.primeBeats ?? c.primeBeats;
  const style = makeStyle(o.style ?? 'normal');
  const t0 = o.t0 ?? 0;
  const move = o.move;
  const P = o.perturb ?? null;
  const profile = P && P.profile ? PROFILES[P.profile] : minJerk;

  // ---- rhythm plan
  const amp = () => Math.min(2.6, Math.max(0.9, rng.normal(c.amplitudeMean, c.amplitudeSd)));
  const period = () => Math.max(300, rng.normal(c.periodMs, c.periodCv * c.periodMs));
  const bottoms = [], descents = [], amplitudes = [];
  // single-stroke rounds need a longer rest first: the engine arms on a steady fist
  const leadIn = primeBeats === 0 ? Math.max(c.leadInMs, 1000) : c.leadInMs;
  let tb = t0 + leadIn + c.descentFrac * c.periodMs;
  for (let k = 0; k <= primeBeats; k++) {
    const p = period();
    if (k > 0) tb += p;
    // explicit beat times (metronome-led rounds) override the self-paced rhythm
    bottoms.push(o.beatTimes ? o.beatTimes[k] : tb);
    descents.push(c.descentFrac * p);
    amplitudes.push(o.still ? 0 : amp() * (k === primeBeats ? (o.throwAmplitudeScale ?? 1) : 1));
  }
  const plan = { bottoms, descents, amplitudes };
  const tLanding = bottoms[primeBeats];
  const tEnd = tLanding + c.settleMs;

  // ---- finger plan (order thumb, index, middle, ring, pinky)
  const enslave = () => Math.min(0.25, Math.max(0, rng.normal(c.enslaveMean, c.enslaveSd)));
  const open = () => (P && P.openAmplitude ? Math.min(1.1, Math.max(0.5, rng.normal(P.openAmplitude.mean, P.openAmplitude.sd))) : 1);
  const shape = (/** @type {number} */ mv) => (mv === ROCK ? [0.15, 0, 0, 0, 0] : mv === PAPER ? [0.9, open(), open(), open(), open()] : [0.2, open(), open(), enslave(), enslave()]);
  const finalE = o.nonRps ? [...o.nonRps] : shape(move);
  const base = [0.12, 0, 0, 0, 0].map((v) => Math.max(0, v + rng.normal(0.03, 0.015)));
  const dur = Math.min(400, Math.max(50, Math.exp(rng.normal(Math.log(P && P.durMedianMs ? P.durMedianMs : c.durMedianMs), c.durLogSd))));
  const lead = Math.max(10, rng.normal(style.leadMean, style.leadSd));
  const groupDelay = P && P.groupDelay ? rng.normal(P.groupDelay.mean, P.groupDelay.sd) : rng.normal(c.groupDelayMean, c.groupDelaySd);
  let onsetFront = tLanding - lead;
  if (o.late) onsetFront = tLanding + o.late.afterLandingMs;
  const onsetBack = onsetFront + groupDelay;
  /** @type {{t0:number, dur:number, to:number}[][]} */
  const segs = [[], [], [], [], []];
  const fingerOnset = (/** @type {number} */ f, /** @type {number} */ front, /** @type {number} */ back) => (f >= 3 ? back : front) + rng.normal(0, P && P.asyncSdMs !== undefined ? P.asyncSdMs : 5);
  if (!o.noFist) {
    if (o.feint) {
      const tSwitch = tLanding - o.feint.switchLeadMs;
      const fromShape = shape(o.feint.from);
      const fromOnset = tLanding - (o.feint.fromLeadMs ?? o.feint.switchLeadMs + 150);
      for (let f = 0; f < 5; f++) {
        if (Math.abs(fromShape[f] - base[f]) > 0.05) segs[f].push({ t0: fingerOnset(f, fromOnset, fromOnset + groupDelay), dur, to: fromShape[f] });
        segs[f].push({ t0: tSwitch + rng.normal(0, 4), dur: o.feint.morphMs, to: finalE[f] });
      }
    } else {
      for (let f = 0; f < 5; f++) {
        if (Math.abs(finalE[f] - base[f]) > 0.05) segs[f].push({ t0: fingerOnset(f, onsetFront, onsetBack), dur: dur * (0.9 + 0.2 * rng.next()), to: finalE[f] });
      }
    }
  }
  const peakThrowSpeed = (1.875 * amplitudes[primeBeats]) / (descents[primeBeats] / 1000); // peak speed of a minimum-jerk stroke
  const extensionAt = (/** @type {number} */ t, /** @type {number} */ speed = 0) => {
    if (o.noFist) return finalE.slice();
    return base.map((b, f) => {
      let v = chained(b, segs[f], t, profile);
      if (P && P.loosen && f >= 1 && peakThrowSpeed > 0 && (!P.loosenThrowOnly || t > bottoms[Math.max(0, primeBeats - 1)])) {
        v += P.loosen * Math.min(1, speed / peakThrowSpeed) * (1 - Math.min(1, Math.max(0, v))); // closed fingers give way under the stroke
      }
      return v;
    });
  };

  // ---- camera geometry
  const R0 = [160 + rng.normal(0, 6), 25 + rng.normal(0, 8), 8 + rng.normal(0, 6)];
  const probe = handLandmarks({ e: [0.1, 0, 0, 0, 0], R: rotationFromEuler(R0[0], R0[1], R0[2]), unitsPerMetre: 1, aspect: c.aspect });
  const unitsPerMetre = c.palmSize / palmSize(probe.image, c.aspect);

  // ---- frames
  /** @type {HandFrame[]} */
  const frames = [];
  // perturbed landmark noise is generated here (correlated between frames, growing with the stroke speed);
  // the unperturbed path keeps the independent Gaussian noise of the hand model
  const ownNoise = !!(P && (P.noiseRho || P.noiseSpeedGain || P.outlierRate));
  const rho = P && P.noiseRho ? Math.min(0.99, Math.max(0, P.noiseRho)) : 0;
  const innov = Math.sqrt(1 - rho * rho);
  const arWorld = new Float64Array(63), arImage = new Float64Array(42);
  const AXES = /** @type {const} */ (['x', 'y', 'z']);
  const handCalib = P && P.handCalibration ? P.handCalibration : defaultCalibration();
  const dt = 1000 / fps;
  let index = o.frameIndex ?? 0;
  let lastT = -Infinity;
  for (let k = 0, t = t0; t <= tEnd; k++, t = t0 + k * dt) {
    let tc = t + (rng.next() * 2 - 1) * c.timestampJitterMs;
    if (tc <= lastT) tc = lastT + 0.5;
    lastT = tc;
    const { y, speed } = strokeProfile(plan, tc);
    const pDrop = (o.dropout ?? 0) * (1 + 3 * Math.min(1, speed / 8));
    if (pDrop > 0 && rng.next() < pDrop) {
      frames.push({ t: tc, index: index++, present: false, image: null, world: null, aspect: c.aspect, handedness: null, neural: null });
      continue;
    }
    const e = extensionAt(tc, speed);
    const wobble = Math.sin(tc / 180) * 2;
    const pitch = P && P.pitchDeg && amplitudes[primeBeats] > 0 ? P.pitchDeg * (y / amplitudes[primeBeats]) : 0;
    const lm = handLandmarks({
      e,
      R: rotationFromEuler(R0[0] + wobble + pitch, R0[1], R0[2] + wobble * 0.5),
      handed: o.handed ?? 'Right',
      calib: handCalib,
      palmAt: { x: c.palmX + 0.01 * Math.sin(tc / 400), y: c.palmTopY + y * c.palmSize },
      unitsPerMetre: P && P.palmJitterSd ? unitsPerMetre * (1 + rng.normal(0, P.palmJitterSd)) : unitsPerMetre,
      aspect: c.aspect,
      noise: ownNoise ? undefined : { worldSd: c.worldNoiseSd, imageSd: c.imageNoiseSd },
      rng,
    });
    if (ownNoise && P) {
      const gain = 1 + (P.noiseSpeedGain ?? 0) * Math.min(1.5, speed / 8);
      const wSd = c.worldNoiseSd * gain, iSd = c.imageNoiseSd * gain;
      for (let i = 0; i < 21; i++) {
        for (let d = 0; d < 3; d++) {
          const j = i * 3 + d;
          arWorld[j] = rho * arWorld[j] + innov * rng.normal(0, 1);
          lm.world[i][AXES[d]] += wSd * arWorld[j];
        }
        for (let d = 0; d < 2; d++) {
          const j = i * 2 + d;
          arImage[j] = rho * arImage[j] + innov * rng.normal(0, 1);
          if (d === 0) lm.image[i].x += (iSd * arImage[j]) / c.aspect; else lm.image[i].y += iSd * arImage[j];
        }
      }
      if (P.outlierRate && rng.next() < P.outlierRate) { // one fingertip jumps (model confusion, motion blur)
        const tip = [8, 12, 16, 20][rng.int(4)];
        const m = P.outlierM ?? 0.03;
        for (const a of AXES) { lm.world[tip][a] += rng.normal(0, m); lm.world[tip - 1][a] += rng.normal(0, m * 0.6); }
      }
    }
    // canned-gesture label as a landmark model would report it: only on clear shapes, sometimes missing
    const front = (e[1] + e[2]) / 2, back = (e[3] + e[4]) / 2;
    let label = 'NONE';
    if (front > 0.8 && back > 0.8) label = 'PAPER';
    else if (front > 0.8 && back < 0.3) label = 'SCISSORS';
    else if (front < 0.2 && back < 0.2) label = 'ROCK';
    if (rng.next() < c.neuralMissRate) label = 'NONE';
    frames.push({
      t: tc, index: index++, present: true, image: lm.image, world: lm.world, aspect: c.aspect,
      handedness: o.handed ?? 'Right',
      neural: { label: /** @type {any} */ (label), score: label === 'NONE' ? 0 : 0.55 + 0.4 * rng.next() },
    });
  }

  return {
    frames,
    truth: {
      move: o.nonRps ? null : move,
      tBeats: bottoms.slice(0, primeBeats),
      tThrowDescentStart: tLanding - descents[primeBeats],
      tLanding,
      tEnd,
      onsetFrontT: finalE[1] > 0.5 || o.feint ? onsetFront : null,
      onsetBackT: finalE[3] > 0.5 ? onsetBack : null,
      leadMs: o.late ? -o.late.afterLandingMs : lead,
      durationMs: dur,
      finalE,
      baseE: base,
      style,
      fps,
      primeBeats,
      feint: o.feint ?? null,
      late: o.late ?? null,
      noFist: !!o.noFist,
      nonRps: !!o.nonRps,
      nextFrameIndex: index,
    },
  };
}
