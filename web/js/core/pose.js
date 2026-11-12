// @ts-check
/**
 * beaTTer v4 — static posture classifier: which throw is the settled hand showing? (pure)
 *
 * Input: baseline-relative opening of (index, middle, ring, pinky). Class-conditional independent
 * Gaussians around ROCK [0,0,0,0], PAPER [1,1,1,1], SCISSORS [1,1,k,k] plus a broad OTHER class that
 * absorbs non-RPS shapes (one finger, three fingers, ...). The landmark model's own gesture label is
 * fused as a second, tempered opinion through a learned confusion matrix.
 *
 * Used by the referee only AFTER landing (final throw) and to date the completion of the shape. It is
 * never used to choose the AI's move.
 */

import { ROCK, PAPER, SCISSORS } from './constants.js';

export const OTHER = 3;
const NEURAL_LABELS = ['ROCK', 'PAPER', 'SCISSORS', 'NONE'];

export const DEFAULTS = Object.freeze({
  /** Class means of (index, middle, ring, pinky) opening. Scissors keeps a little ring/pinky opening
   *  because the ring finger is the least independent digit [HagerRoss2000]. */
  mean: Object.freeze([
    Object.freeze([0, 0, 0, 0]),
    Object.freeze([1, 1, 1, 1]),
    Object.freeze([0.95, 0.95, 0.12, 0.08]),
  ]),
  /**
   * Class standard deviations per finger (rows ROCK, PAPER, SCISSORS). Closed fingers are tight. Open
   * fingers get more room: a relaxed open finger is not fully straight, and because flexion is a sum of
   * non-negative bend angles, landmark noise can only make a straight finger read as bent.
   */
  sd: Object.freeze([
    Object.freeze([0.16, 0.16, 0.18, 0.20]),
    Object.freeze([0.22, 0.22, 0.24, 0.26]),
    Object.freeze([0.25, 0.25, 0.22, 0.22]),
  ]),
  /** OTHER: broad Gaussian per finger. */
  otherMean: 0.5,
  otherSd: 0.6,
  /** Prior over [ROCK, PAPER, SCISSORS, OTHER]. */
  prior: Object.freeze([0.3, 0.3, 0.3, 0.1]),
  /** Dirichlet pseudo-counts of P(neural label | class): rows ROCK, PAPER, SCISSORS; columns R, P, S, NONE. */
  neuralCounts: Object.freeze([
    Object.freeze([6, 1, 1, 2]),
    Object.freeze([1, 6, 1, 2]),
    Object.freeze([1, 1, 6, 2]),
  ]),
  /** Exponent applied to the neural likelihood (it is correlated with the landmarks). */
  neuralWeight: 0.5,
  /** Final throw: same class for >= stableFrames consecutive samples spanning >= stableMs with posterior >= stableProb. */
  stableFrames: 3,
  stableMs: 70,
  stableProb: 0.85,
});

const LOG_2PI = Math.log(2 * Math.PI);
const glp = (/** @type {number} */ x, /** @type {number} */ m, /** @type {number} */ v) => -0.5 * (LOG_2PI + Math.log(v)) - (0.5 * (x - m) * (x - m)) / v;

/**
 * @typedef {{t:number, u4:number[], neural?: {label:string, score:number}|null}} PoseSample
 */

/**
 * @param {{mean?: number[][], variance?: number[][], neuralCounts?: number[][]}} [state] per-player adapted templates
 * @param {Partial<typeof DEFAULTS>} [cfg]
 */
export function createPoseClassifier(state = {}, cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const mean = (state.mean ?? c.mean).map((row) => [...row]);
  const variance = (state.variance ?? c.sd.map((row) => row.map((s) => s * s))).map((row) => [...row]);
  const neuralCounts = (state.neuralCounts ?? c.neuralCounts).map((row) => [...row]);
  const otherVar = c.otherSd * c.otherSd;

  /**
   * @param {number[]} u4 @param {{label:string, score:number}|null} [neural]
   * @returns {number[]} log-likelihoods of [ROCK, PAPER, SCISSORS, OTHER]
   */
  const logLik = (u4, neural) => {
    const out = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
      const x = Number.isFinite(u4[k]) ? u4[k] : 0;
      for (let y = 0; y < 3; y++) out[y] += glp(x, mean[y][k], variance[y][k]);
      out[OTHER] += glp(x, c.otherMean, otherVar);
    }
    const li = neural ? NEURAL_LABELS.indexOf(neural.label) : -1;
    if (li >= 0) {
      const nw = c.neuralWeight * (neural && Number.isFinite(neural.score) && neural.score >= 0.65 ? 0.6 + 0.9 * neural.score : 1);
      for (let y = 0; y < 3; y++) {
        const row = neuralCounts[y];
        out[y] += nw * Math.log(row[li] / (row[0] + row[1] + row[2] + row[3]));
      }
      out[OTHER] += nw * Math.log(0.25);
    }
    return out;
  };

  /**
   * @param {number[]} u4 @param {{label:string, score:number}|null} [neural] @param {readonly number[]} [prior]
   * @returns {number[]} posterior over [ROCK, PAPER, SCISSORS, OTHER]
   */
  const posterior = (u4, neural, prior = c.prior) => {
    const ll = logLik(u4, neural);
    let m = -Infinity;
    const v = ll.map((l, i) => { const x = l + Math.log(prior[i]); if (x > m) m = x; return x; });
    let s = 0;
    const p = v.map((x) => { const e = Math.exp(x - m); s += e; return e; });
    return p.map((x) => x / s);
  };

  return { logLik, posterior, templates: { mean, variance }, neuralCounts, cfg: c };
}

/**
 * Decide the final throw from the settle-window samples.
 * @param {PoseSample[]} samples in time order
 * @param {ReturnType<typeof createPoseClassifier>} clf
 * @returns {{move: 0|1|2|null, tStable: number|null, confidence: number|null, reason: 'OK'|'NO_HAND'|'OTHER'|'UNSTABLE'}}
 */
export function decideFinal(samples, clf) {
  const c = clf.cfg;
  if (!samples.length) return { move: null, tStable: null, confidence: null, reason: 'NO_HAND' };
  let runStart = -1, runClass = -1, runSum = 0, otherCount = 0;
  for (let k = 0; k < samples.length; k++) {
    const p = clf.posterior(samples[k].u4, samples[k].neural ?? null);
    let best = 0;
    for (let i = 1; i < 4; i++) if (p[i] > p[best]) best = i;
    if (best === OTHER) otherCount += 1;
    const ok = best !== OTHER && p[best] >= c.stableProb;
    if (ok && best === runClass) {
      runSum += p[best];
    } else if (ok) {
      runStart = k; runClass = best; runSum = p[best];
    } else {
      runStart = -1; runClass = -1; runSum = 0;
    }
    if (runStart >= 0) {
      const len = k - runStart + 1;
      if (len >= c.stableFrames && samples[k].t - samples[runStart].t >= c.stableMs) {
        return { move: /** @type {0|1|2} */ (runClass), tStable: samples[runStart].t, confidence: runSum / len, reason: 'OK' };
      }
    }
  }
  return { move: null, tStable: null, confidence: null, reason: otherCount * 2 > samples.length ? 'OTHER' : 'UNSTABLE' };
}

/**
 * Earliest time from which the static posterior of `move` stays >= stableProb up to `tStable`
 * (may lie before the landing: the shape was complete in the air).
 * @param {PoseSample[]} samples all samples of the round (flight + settle), in time order
 * @param {number} move @param {number} tStable
 * @param {ReturnType<typeof createPoseClassifier>} clf
 * @returns {number|null}
 */
export function completionTime(samples, move, tStable, clf) {
  let k = -1;
  for (let i = 0; i < samples.length; i++) if (samples[i].t <= tStable) k = i;
  if (k < 0) return null;
  let first = null;
  for (let i = k; i >= 0; i--) {
    const p = clf.posterior(samples[i].u4, samples[i].neural ?? null);
    if (p[move] >= clf.cfg.stableProb) first = samples[i].t; else break;
  }
  return first;
}

export { ROCK, PAPER, SCISSORS };
