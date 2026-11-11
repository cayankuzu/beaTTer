// @ts-check
/**
 * beaTTer v4 — Context Tree Weighting for a ternary target with an m-ary context alphabet (pure).
 *
 * CTW [Willems1995] is a Bayesian mixture over ALL context-tree (variable-order Markov) sources up to a
 * given depth, with the Krichevsky-Trofimov estimator [KT1981] at every node:
 *     Pe:  P(x | counts) = (c_x + 1/2) / (n + 3/2)
 *     Pw(node) = Pe(node)                                   at depth D
 *              = 1/2 Pe(node) + 1/2 * prod_children Pw      otherwise (missing children contribute 1)
 * The predictive probability is exact: P(x | past) = Pw_root(past, x) / Pw_root(past).
 * Contexts before the start of the history are padded with symbol 0.
 *
 * The tree is never pruned: a context tree of depth D over an m-ary alphabet has at most
 * (m^(D+1) - 1) / (m - 1) nodes (1093 for D = 6, m = 3), so memory is bounded by construction, and a
 * pruned tree would no longer be a probability model.
 */

const LOG_HALF = Math.log(0.5);
const LOG_THIRD = Math.log(1 / 3);
const logAdd = (/** @type {number} */ a, /** @type {number} */ b) => (a > b ? a + Math.log1p(Math.exp(b - a)) : b + Math.log1p(Math.exp(a - b)));

/**
 * @param {{depth:number, contextAlphabet?:number}} cfg
 */
export function createCTW({ depth, contextAlphabet = 3 }) {
  // structure-of-arrays node store
  /** @type {number[]} */ let c0 = [], c1 = [], c2 = [], logPe = [], logPw = [], sumKids = [];
  /** @type {Int32Array[]} */ let kids = [];
  const newNode = () => {
    c0.push(0); c1.push(0); c2.push(0); logPe.push(0); logPw.push(0); sumKids.push(0);
    kids.push(new Int32Array(contextAlphabet).fill(-1));
    return c0.length - 1;
  };
  newNode(); // root = 0

  const count = (/** @type {number} */ n, /** @type {number} */ x) => (x === 0 ? c0[n] : x === 1 ? c1[n] : c2[n]);
  const logKT = (/** @type {number} */ n, /** @type {number} */ x) => Math.log((count(n, x) + 0.5) / (c0[n] + c1[n] + c2[n] + 1.5));
  const sym = (/** @type {ArrayLike<number>} */ ctx, /** @type {number} */ d) => {
    const s = d < ctx.length ? ctx[d] : 0;
    return s >= 0 && s < contextAlphabet ? s | 0 : 0;
  };

  /**
   * Existing nodes along the context path, root first.
   * @param {ArrayLike<number>} ctx context symbols, most recent first
   */
  const path = (ctx) => {
    const nodes = [0];
    let n = 0;
    for (let d = 0; d < depth; d++) {
      const k = kids[n][sym(ctx, d)];
      if (k < 0) break;
      nodes.push(k); n = k;
    }
    return nodes;
  };

  /**
   * Predictive masses exactly as the recursion gives them (they sum to 1 up to rounding).
   * @param {ArrayLike<number>} ctx context symbols, most recent first (padded with 0)
   * @returns {Float64Array}
   */
  const raw = (ctx) => {
    const nodes = path(ctx);
    const out = new Float64Array(3);
    const rootOld = logPw[0];
    for (let x = 0; x < 3; x++) {
      // change of the child's log Pw seen by its parent; a missing child goes from "empty" (log 1 = 0) to 1/3
      let childDelta = nodes.length - 1 < depth ? LOG_THIRD : 0;
      let newPw = 0;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const pe = logPe[n] + logKT(n, x);
        newPw = i === depth ? pe : logAdd(LOG_HALF + pe, LOG_HALF + sumKids[n] + childDelta);
        childDelta = newPw - logPw[n];
      }
      out[x] = Math.exp(newPw - rootOld);
    }
    return out;
  };

  /**
   * @param {ArrayLike<number>} ctx context symbols, most recent first (padded with 0)
   * @returns {Float64Array} P(next target symbol = 0, 1, 2)
   */
  const predict = (ctx) => {
    const out = raw(ctx);
    const s = out[0] + out[1] + out[2];
    // rounding guard only: the recursion is a proper probability model (see the test on rawMass)
    if (s > 0 && Number.isFinite(s)) { out[0] /= s; out[1] /= s; out[2] /= s; } else out.fill(1 / 3);
    return out;
  };

  /** Sum of the un-normalised predictive masses: 1 for an exact implementation. @param {ArrayLike<number>} ctx */
  const rawMass = (ctx) => { const o = raw(ctx); return o[0] + o[1] + o[2]; };

  /**
   * @param {ArrayLike<number>} ctx context symbols, most recent first
   * @param {number} y observed target symbol (0, 1 or 2)
   */
  const update = (ctx, y) => {
    if (!(y === 0 || y === 1 || y === 2)) return;
    const nodes = [0];
    let n = 0;
    for (let d = 0; d < depth; d++) {
      const s = sym(ctx, d);
      let k = kids[n][s];
      if (k < 0) { k = newNode(); kids[n][s] = k; }
      nodes.push(k); n = k;
    }
    let childDelta = 0;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const m = nodes[i];
      logPe[m] += logKT(m, y);
      if (y === 0) c0[m] += 1; else if (y === 1) c1[m] += 1; else c2[m] += 1;
      sumKids[m] += childDelta;
      const old = logPw[m];
      // a node at full depth is a leaf
      logPw[m] = i === depth ? logPe[m] : logAdd(LOG_HALF + logPe[m], LOG_HALF + sumKids[m]);
      childDelta = logPw[m] - old;
    }
  };

  return { predict, rawMass, update, get size() { return c0.length; }, depth };
}
