// @ts-check
/**
 * beaTTer v4 — everything the system has learned about one player, as one versioned JSON document (pure).
 *
 *   sequence      behavioural experts + mixture (Channel A)
 *   safety        exploitation budget of Channel A
 *   fusion        learned weights of the log-linear pool of the two channels
 *   onset         when this player's fingers start to open, relative to landing (per finger group)
 *   duration      how fast they open
 *   groupDelay    ring/pinky onset relative to index/middle in PAPER
 *   calibration   fist / open flexion angles
 *   pose          final-shape templates and the confusion of the landmark model's gesture label
 *   stroke        rhythm habits (descent duration, how the throw interval differs from the beat)
 *   metrics       evaluation
 *
 * Timing parameters use conjugate Normal-Inverse-Gamma updates [Murphy2007], capped so the model keeps
 * adapting; everything is clamped to physically plausible ranges.
 *
 * Honesty invariant I6: everything about the GAME (move sequence, safety budget, fusion weights, onset
 * timing, shape templates, metrics) is learned only from valid rounds - the engine never calls
 * learnFromRound for fouls or voids. The one thing that may also adapt on a void round is the sensor
 * calibration (learnPosture: which flexion angles this camera reports for this hand's fist and open
 * fingers). It describes the measuring instrument, uses no game outcome, and without it a hand the
 * default calibration misreads could never produce a valid round to learn from.
 */

import { ROCK, PAPER, SCISSORS, SCHEMA_VERSION } from './constants.js';
import { createSequenceModel } from './sequence/index.js';
import { createSafeExploiter } from './safety.js';
import { createMetrics } from './metrics.js';
import { learnFusionWeights } from './decision.js';
import { measureOpening } from './opening.js';
import { defaultCalibration } from './kinematics.js';
import { DEFAULTS as POSE_DEFAULTS } from './pose.js';

export const DEFAULTS = Object.freeze({
  /**
   * Prior belief about when fingers start to open, as a lead before landing (ms). Assumption, not a
   * measurement: the throw is formed during the final down-stroke (a few hundred ms long) and a fast
   * opening itself lasts roughly 60-130 ms [Katsuki2015; Li2023]. Learned per player from round 1.
   */
  leadMeanMs: 170,
  leadSdMs: 85,
  /** Opening duration prior: LogNormal(ln 130 ms, 0.5). */
  durLogMean: Math.log(130),
  durLogSd: 0.5,
  /** Ring/pinky onset minus index/middle onset in PAPER (ms). */
  groupDelayMeanMs: 15,
  groupDelaySdMs: 40,
  /** Pseudo-observations behind each prior. */
  kappa0: 4,
  alpha0: 3,
  /** Caps that keep the posteriors adaptive (a player's habits drift). */
  kappaMax: 40,
  alphaMax: 21,
  /** Exponential-average weight for slowly varying quantities (calibration, stroke, noise). */
  slowRate: 0.15,
  /** Pseudo-count blending pose templates with their defaults. */
  posePseudo: 5,
  bounds: Object.freeze({
    leadMs: Object.freeze([-100, 700]),
    leadSdMs: Object.freeze([40, 200]),
    durMs: Object.freeze([40, 600]),
    durLogSd: Object.freeze([0.2, 0.8]),
    groupDelayMs: Object.freeze([-150, 250]),
    groupDelaySdMs: Object.freeze([15, 120]),
    thetaFistLong: Object.freeze([120, 290]),
    thetaFistThumb: Object.freeze([40, 170]),
    thetaOpen: Object.freeze([0, 80]),
    poseSd: Object.freeze([0.12, 0.35]),
    noiseSd: Object.freeze([0.02, 0.2]),
    descentMs: Object.freeze([60, 600]),
    intervalBias: Object.freeze([-0.4, 0.6]),
  }),
});

const clamp = (/** @type {number} */ x, /** @type {readonly number[]} */ b) => Math.min(b[1], Math.max(b[0], x));

/** Normal-Inverse-Gamma belief about a scalar; `sd` is the predictive scale for the next observation. */
class Nig {
  /** @param {number} mean @param {number} sd @param {number} kappa @param {number} alpha */
  constructor(mean, sd, kappa, alpha) {
    this.mu = mean; this.kappa = kappa; this.alpha = alpha;
    this.beta = (sd * sd * alpha * kappa) / (kappa + 1); // so that the initial predictive sd equals `sd`
    this.n = 0;
  }
  /** @param {number} x @param {number} kappaMax @param {number} alphaMax */
  update(x, kappaMax, alphaMax) {
    if (!Number.isFinite(x)) return;
    const k1 = this.kappa + 1;
    this.beta += (this.kappa * (x - this.mu) ** 2) / (2 * k1);
    this.mu = (this.kappa * this.mu + x) / k1;
    this.kappa = Math.min(kappaMax, k1);
    this.alpha += 0.5;
    if (this.alpha > alphaMax) { this.beta *= alphaMax / this.alpha; this.alpha = alphaMax; }
    this.n += 1;
  }
  get mean() { return this.mu; }
  get sd() { return Math.sqrt((this.beta * (this.kappa + 1)) / (this.alpha * this.kappa)); }
  toJSON() { return { mu: this.mu, kappa: this.kappa, alpha: this.alpha, beta: this.beta, n: this.n }; }
  /** @param {any} o @param {Nig} fallback */
  static from(o, fallback) {
    if (!o || ![o.mu, o.kappa, o.alpha, o.beta].every(Number.isFinite) || o.kappa <= 0 || o.alpha <= 0 || o.beta <= 0) return fallback;
    const n = new Nig(0, 1, 1, 1);
    n.mu = o.mu; n.kappa = o.kappa; n.alpha = o.alpha; n.beta = o.beta; n.n = Number.isFinite(o.n) ? o.n : 0;
    return n;
  }
}

/**
 * @typedef {Object} RoundLearning  what the engine hands over after a VALID round
 * @property {0|1|2} playerMove
 * @property {0|1|2} aiMove                    the judged move
 * @property {{t:number[], u:number[]}} traceFront  whole-round trace of the front group opening
 * @property {{t:number[], u:number[]}} traceBack
 * @property {number} tLanding
 * @property {number} noiseSd
 * @property {number[]|null} primingTheta      mean total flexion per finger while pumping the fist (deg)
 * @property {number[]|null} finalTheta        mean total flexion per finger of the settled shape (deg)
 * @property {number[]|null} finalU4           settled opening of index, middle, ring, pinky
 * @property {string|null} neuralLabel         canned gesture label of the settled shape
 * @property {{throwDescentMs:number|null, throwIntervalMs:number|null, periodMs:number|null, apexToBottomMs:number|null}} stroke
 * @property {{prior:number[], kinLik:number[], informative:boolean}} belief   at the judged commit
 * @property {{best:number, lambda:number}} behaviour
 * @property {any} result                      the RoundResult (for metrics)
 */

/**
 * @param {Partial<typeof DEFAULTS>} [cfg]
 */
export function createPlayerModel(cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const B = c.bounds;
  const sequence = createSequenceModel();
  const safety = createSafeExploiter();
  const metrics = createMetrics();
  const freshNig = (/** @type {number} */ m, /** @type {number} */ sd) => new Nig(m, sd, c.kappa0, c.alpha0);

  const m = {
    fusion: { wPrior: 1, wKin: 1 },
    calibration: { ...defaultCalibration(), n: 0 },
    leadFront: freshNig(c.leadMeanMs, c.leadSdMs),
    leadBack: freshNig(c.leadMeanMs, c.leadSdMs),
    durLog: freshNig(c.durLogMean, c.durLogSd),
    groupDelay: freshNig(c.groupDelayMeanMs, c.groupDelaySdMs),
    pose: {
      mean: POSE_DEFAULTS.mean.map((r) => [...r]),
      variance: POSE_DEFAULTS.sd.map((row) => row.map((s) => s * s)),
      n: [0, 0, 0],
    },
    neuralCounts: POSE_DEFAULTS.neuralCounts.map((r) => [...r]),
    stroke: { meanDescentMs: /** @type {number|null} */ (null), meanApexToBottomMs: /** @type {number|null} */ (null), lastIntervalBias: 0, n: 0 },
    noiseSd: /** @type {number|null} */ (null),
    rounds: 0,
  };

  /**
   * Onset prior for a finger group, as the opening detector expects it.
   * @param {'front'|'back'} group
   * @returns {import('./opening.js').OnsetPrior}
   */
  const onsetPrior = (group) => {
    const nig = group === 'front' ? m.leadFront : m.leadBack;
    return {
      kind: 'lead',
      leadMeanMs: clamp(nig.mean, B.leadMs),
      leadSdMs: clamp(nig.sd, B.leadSdMs),
      durLogMean: clamp(m.durLog.mean, [Math.log(B.durMs[0]), Math.log(B.durMs[1])]),
      durLogSd: clamp(m.durLog.sd, B.durLogSd),
    };
  };

  /** PAPER couples the back group's onset to the front group's. @param {number} frontOnsetT */
  const coupledBackPrior = (frontOnsetT) => {
    const p = onsetPrior('back');
    return /** @type {import('./opening.js').OnsetPrior} */ ({
      kind: 'absolute',
      onsetMeanT: frontOnsetT + clamp(m.groupDelay.mean, B.groupDelayMs),
      onsetSdMs: clamp(m.groupDelay.sd, B.groupDelaySdMs),
      durLogMean: p.durLogMean,
      durLogSd: p.durLogSd,
    });
  };

  const slow = (/** @type {number|null} */ old, /** @type {number} */ x) => (old === null ? x : old + c.slowRate * (x - old));

  /**
   * Sensor calibration. `openFingers` lists the long fingers (1 = index .. 4 = pinky) that ended open.
   * @param {{primingTheta:number[]|null, finalTheta:number[]|null, openFingers:number[]}} p
   */
  const learnPosture = (p) => {
    if (p.primingTheta && p.primingTheta.length === 5 && p.primingTheta.every(Number.isFinite)) {
      for (let f = 0; f < 5; f++) {
        const b = f === 0 ? B.thetaFistThumb : B.thetaFistLong;
        m.calibration.thetaFist[f] += c.slowRate * (clamp(p.primingTheta[f], b) - m.calibration.thetaFist[f]);
      }
    }
    if (p.finalTheta && p.finalTheta.length === 5) {
      for (const f of p.openFingers) {
        if (f >= 1 && f <= 4 && Number.isFinite(p.finalTheta[f])) {
          m.calibration.thetaOpen[f] += c.slowRate * (clamp(p.finalTheta[f], B.thetaOpen) - m.calibration.thetaOpen[f]);
        }
      }
    }
    // keep a usable span between fist and open
    for (let f = 0; f < 5; f++) if (m.calibration.thetaFist[f] - m.calibration.thetaOpen[f] < 60) m.calibration.thetaFist[f] = m.calibration.thetaOpen[f] + 60;
    m.calibration.n += 1;
  };

  /** @param {RoundLearning} r */
  const learnFromRound = (r) => {
    const y = r.playerMove;
    if (!(y === ROCK || y === PAPER || y === SCISSORS)) return;
    m.rounds += 1;
    sequence.update(y, r.aiMove);
    safety.account(r.behaviour.best, r.behaviour.lambda, y);
    if (r.belief.informative) m.fusion = learnFusionWeights(m.fusion, { prior: r.belief.prior, kinLik: r.belief.kinLik, yTrue: y });

    // opening timing (only for groups that opened in this throw)
    const noise = Number.isFinite(r.noiseSd) ? r.noiseSd : 0.05;
    const mf = y !== ROCK ? measureOpening(r.traceFront, r.tLanding, noise) : null;
    const mb = y === PAPER ? measureOpening(r.traceBack, r.tLanding, noise) : null;
    if (mf && mf.opened && mf.onsetT !== null) {
      m.leadFront.update(clamp(r.tLanding - mf.onsetT, B.leadMs), c.kappaMax, c.alphaMax);
      if (mf.durationMs !== null && mf.durationMs >= B.durMs[0] && mf.durationMs <= B.durMs[1]) m.durLog.update(Math.log(mf.durationMs), c.kappaMax, c.alphaMax);
    }
    if (mb && mb.opened && mb.onsetT !== null) {
      m.leadBack.update(clamp(r.tLanding - mb.onsetT, B.leadMs), c.kappaMax, c.alphaMax);
      if (mf && mf.opened && mf.onsetT !== null) m.groupDelay.update(clamp(mb.onsetT - mf.onsetT, B.groupDelayMs), c.kappaMax, c.alphaMax);
    }

    // rhythm habits
    const s = r.stroke;
    if (s.throwDescentMs !== null && Number.isFinite(s.throwDescentMs)) m.stroke.meanDescentMs = slow(m.stroke.meanDescentMs, clamp(s.throwDescentMs, B.descentMs));
    if (s.apexToBottomMs !== null && Number.isFinite(s.apexToBottomMs)) m.stroke.meanApexToBottomMs = slow(m.stroke.meanApexToBottomMs, clamp(s.apexToBottomMs, B.descentMs));
    if (s.throwIntervalMs !== null && s.periodMs !== null && s.periodMs > 0) {
      m.stroke.lastIntervalBias = /** @type {number} */ (slow(m.stroke.lastIntervalBias, clamp(s.throwIntervalMs / s.periodMs - 1, B.intervalBias)));
    }
    m.stroke.n += 1;
    m.noiseSd = slow(m.noiseSd, clamp(noise, B.noiseSd));

    // calibration: fist from the priming beats, open from the fingers this throw holds open
    learnPosture({ primingTheta: r.primingTheta, finalTheta: r.finalTheta, openFingers: y === PAPER ? [1, 2, 3, 4] : y === SCISSORS ? [1, 2] : [] });

    // final-shape template and gesture-label confusion of this class
    if (r.finalU4 && r.finalU4.length === 4 && r.finalU4.every(Number.isFinite)) {
      const n = m.pose.n[y] + c.posePseudo;
      for (let k = 0; k < 4; k++) {
        const d = r.finalU4[k] - m.pose.mean[y][k];
        m.pose.mean[y][k] += d / (n + 1);
        const v = m.pose.variance[y][k] + (d * (r.finalU4[k] - m.pose.mean[y][k]) - m.pose.variance[y][k]) / (n + 1);
        m.pose.variance[y][k] = clamp(Math.sqrt(Math.max(v, 0)), B.poseSd) ** 2;
      }
      m.pose.n[y] += 1;
    }
    const li = ['ROCK', 'PAPER', 'SCISSORS', 'NONE'].indexOf(r.neuralLabel ?? '');
    if (li >= 0) m.neuralCounts[y][li] += 1;

    metrics.record(r.result);
  };

  const toJSON = () => ({
    v: SCHEMA_VERSION,
    sequence: sequence.toJSON(),
    safety: safety.toJSON(),
    metrics: metrics.toJSON(),
    fusion: { ...m.fusion },
    calibration: { thetaFist: [...m.calibration.thetaFist], thetaOpen: [...m.calibration.thetaOpen], n: m.calibration.n },
    leadFront: m.leadFront.toJSON(), leadBack: m.leadBack.toJSON(), durLog: m.durLog.toJSON(), groupDelay: m.groupDelay.toJSON(),
    pose: { mean: m.pose.mean.map((r) => [...r]), variance: m.pose.variance.map((r) => [...r]), n: [...m.pose.n] },
    neuralCounts: m.neuralCounts.map((r) => [...r]),
    stroke: { ...m.stroke },
    noiseSd: m.noiseSd,
    rounds: m.rounds,
  });

  const isVec = (/** @type {any} */ a, /** @type {number} */ n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
  const isMat = (/** @type {any} */ a, /** @type {number} */ r, /** @type {number} */ k) => Array.isArray(a) && a.length === r && a.every((/** @type {any} */ row) => isVec(row, k));

  /**
   * Restore from JSON. Unknown versions or malformed parts fall back to fresh defaults for that part.
   * @param {any} o @returns {boolean} true if a v4 document was accepted
   */
  const load = (o) => {
    if (!o || o.v !== SCHEMA_VERSION) return false;
    sequence.load(o.sequence);
    safety.load(o.safety);
    metrics.load(o.metrics);
    if (o.fusion && Number.isFinite(o.fusion.wPrior) && Number.isFinite(o.fusion.wKin)) m.fusion = { wPrior: clamp(o.fusion.wPrior, [0.25, 2.5]), wKin: clamp(o.fusion.wKin, [0.25, 2.5]) };
    if (o.calibration && isVec(o.calibration.thetaFist, 5) && isVec(o.calibration.thetaOpen, 5)) {
      m.calibration.thetaFist = o.calibration.thetaFist.map((/** @type {number} */ v, /** @type {number} */ f) => clamp(v, f === 0 ? B.thetaFistThumb : B.thetaFistLong));
      m.calibration.thetaOpen = o.calibration.thetaOpen.map((/** @type {number} */ v) => clamp(v, B.thetaOpen));
      m.calibration.n = Number.isFinite(o.calibration.n) ? o.calibration.n : 0;
    }
    m.leadFront = Nig.from(o.leadFront, m.leadFront);
    m.leadBack = Nig.from(o.leadBack, m.leadBack);
    m.durLog = Nig.from(o.durLog, m.durLog);
    m.groupDelay = Nig.from(o.groupDelay, m.groupDelay);
    if (o.pose && isMat(o.pose.mean, 3, 4) && isMat(o.pose.variance, 3, 4) && isVec(o.pose.n, 3)) {
      m.pose = {
        mean: o.pose.mean.map((/** @type {number[]} */ r) => r.map((v) => clamp(v, [-0.3, 1.3]))),
        variance: o.pose.variance.map((/** @type {number[]} */ r) => r.map((v) => clamp(Math.sqrt(Math.max(v, 0)), B.poseSd) ** 2)),
        n: [...o.pose.n],
      };
    }
    if (isMat(o.neuralCounts, 3, 4) && o.neuralCounts.every((/** @type {number[]} */ r) => r.every((v) => v > 0))) m.neuralCounts = o.neuralCounts.map((/** @type {number[]} */ r) => [...r]);
    if (o.stroke) {
      m.stroke = {
        meanDescentMs: Number.isFinite(o.stroke.meanDescentMs) ? clamp(o.stroke.meanDescentMs, B.descentMs) : null,
        meanApexToBottomMs: Number.isFinite(o.stroke.meanApexToBottomMs) ? clamp(o.stroke.meanApexToBottomMs, B.descentMs) : null,
        lastIntervalBias: Number.isFinite(o.stroke.lastIntervalBias) ? clamp(o.stroke.lastIntervalBias, B.intervalBias) : 0,
        n: Number.isFinite(o.stroke.n) ? o.stroke.n : 0,
      };
    }
    m.noiseSd = Number.isFinite(o.noiseSd) ? clamp(o.noiseSd, B.noiseSd) : null;
    m.rounds = Number.isFinite(o.rounds) && o.rounds >= 0 ? o.rounds : 0;
    return true;
  };

  /** Human-readable summary of what has been learned (numbers only; the UI formats them). */
  const profile = () => ({
    rounds: m.rounds,
    fusion: { ...m.fusion },
    onsetLeadFrontMs: { mean: m.leadFront.mean, sd: m.leadFront.sd, n: m.leadFront.n },
    onsetLeadBackMs: { mean: m.leadBack.mean, sd: m.leadBack.sd, n: m.leadBack.n },
    openingMs: { median: Math.exp(m.durLog.mean), n: m.durLog.n },
    groupDelayMs: { mean: m.groupDelay.mean, sd: m.groupDelay.sd, n: m.groupDelay.n },
    noiseSd: m.noiseSd,
    stroke: { ...m.stroke },
    safety: { lambda: safety.lambda(), budget: safety.budget },
    behaviour: sequence.stats(),
  });

  return {
    sequence, safety, metrics,
    get fusion() { return m.fusion; },
    get calibration() { return m.calibration; },
    get poseState() { return { mean: m.pose.mean, variance: m.pose.variance, neuralCounts: m.neuralCounts }; },
    get stroke() { return m.stroke; },
    get noiseSd() { return m.noiseSd; },
    get rounds() { return m.rounds; },
    onsetPrior, coupledBackPrior, learnFromRound, learnPosture, toJSON, load, profile,
  };
}
