// @ts-check
/**
 * beaTTer v4 — mixture of experts for the behavioural channel (pure).
 *
 * Hypotheses = every base expert under three rotations + one always-awake uniform (Nash) expert.
 * Rotation r of a prediction q:  rot(q, r)[y] = q[(y - r) mod 3]  — "the player plays r steps beyond
 * what this expert predicts". This is Iocaine Powder's second-guessing [Egnor2000] expressed on
 * distributions: r = 0 trusts the expert, r = 1 / r = 2 assume the player out-thinks it once / twice.
 *
 * Weights: Bayesian mixture under log loss with
 *   - specialists / sleeping experts: an abstaining hypothesis is charged the mixture's own
 *     loss, so its weight relative to the awake set is unchanged;
 *   - exponential forgetting (gamma < 1) and fixed-share [HerbsterWarmuth1998], so the mixture can follow
 *     a player who changes style;
 *   - a probability floor, which bounds the per-round loss.
 * With the uniform expert always present, the mixture drifts to 1/3-1/3-1/3 by itself whenever nothing
 * predicts better than chance.
 */

export const DEFAULTS = Object.freeze({
  /** Rotations per expert (0, +1, +2). */
  rotations: 3,
  /** Learning rate on log loss (1 = Bayes). */
  eta: 1.0,
  /**
   * Forgetting: log-weights are multiplied by gamma each round (memory of roughly 1/(1-gamma) rounds).
   * Human biases are weak (a few hundredths of a bit per round [ForderDyson2016]), so evidence has to
   * accumulate over hundreds of rounds; a short memory (0.985) left most of that signal unused in the
   * parameter sweep (experiments/E1).
   */
  gamma: 0.999,
  /**
   * Fixed-share: fraction of the weight redistributed uniformly each round. It must stay below the
   * per-round likelihood advantage of a useful expert, otherwise that expert can never accumulate weight.
   */
  share: 0.002,
  /** Probabilities are floored at this value inside the logarithm. */
  probFloor: 0.02,
});

/**
 * @param {{nExperts:number} & Partial<typeof DEFAULTS>} cfg
 */
export function createMixture(cfg) {
  const c = { ...DEFAULTS, ...cfg };
  const R = c.rotations;
  const N = c.nExperts * R + 1; // last = uniform
  let logw = new Float64Array(N); // log of normalised weights (all equal at start)
  logw.fill(-Math.log(N));

  /** @param {Float64Array|null} q @param {number} r @param {number} y */
  const rot = (q, r, y) => /** @type {Float64Array} */ (q)[(y - r + 3) % 3];

  /**
   * @param {(Float64Array|null)[]} preds one entry per base expert (null = abstains)
   * @returns {{p: Float64Array, top: {expert:number, rotation:number, weight:number}[], awakeMass: number}}
   *   top: awake hypotheses by weight (expert = -1 is the uniform expert), weights relative to the awake set
   */
  const combine = (preds) => {
    const p = new Float64Array(3);
    let mass = 0;
    /** @type {{expert:number, rotation:number, weight:number}[]} */
    const top = [];
    for (let i = 0; i < c.nExperts; i++) {
      const q = preds[i];
      if (!q) continue;
      for (let r = 0; r < R; r++) {
        const w = Math.exp(logw[i * R + r]);
        mass += w;
        for (let y = 0; y < 3; y++) p[y] += w * rot(q, r, y);
        top.push({ expert: i, rotation: r, weight: w });
      }
    }
    const wU = Math.exp(logw[N - 1]);
    mass += wU;
    for (let y = 0; y < 3; y++) p[y] += wU / 3;
    top.push({ expert: -1, rotation: 0, weight: wU });
    for (let y = 0; y < 3; y++) p[y] /= mass;
    top.sort((a, b) => b.weight - a.weight);
    for (const t of top) t.weight /= mass;
    return { p, top: top.slice(0, 5), awakeMass: mass };
  };

  /**
   * @param {(Float64Array|null)[]} preds the predictions that were combined BEFORE y was seen
   * @param {number} y the player's actual move
   */
  const update = (preds, y) => {
    if (!(y === 0 || y === 1 || y === 2)) return;
    const pMix = Math.max(combine(preds).p[y], c.probFloor);
    for (let i = 0; i < c.nExperts; i++) {
      const q = preds[i];
      for (let r = 0; r < R; r++) {
        const loss = q ? Math.max(rot(q, r, y), c.probFloor) : pMix;
        logw[i * R + r] = c.gamma * logw[i * R + r] + c.eta * Math.log(loss);
      }
    }
    logw[N - 1] = c.gamma * logw[N - 1] + c.eta * Math.log(Math.max(1 / 3, c.probFloor));
    // normalise, then fixed-share in the probability domain
    let m = -Infinity;
    for (let k = 0; k < N; k++) if (logw[k] > m) m = logw[k];
    let s = 0;
    for (let k = 0; k < N; k++) s += Math.exp(logw[k] - m);
    const logZ = m + Math.log(s);
    for (let k = 0; k < N; k++) logw[k] = Math.log((1 - c.share) * Math.exp(logw[k] - logZ) + c.share / N);
  };

  const weights = () => { const w = new Float64Array(N); for (let k = 0; k < N; k++) w[k] = Math.exp(logw[k]); return w; };

  return { combine, update, weights, size: N };
}
