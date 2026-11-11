// @ts-check
/**
 * beaTTer v4 — PPM-C variable-order predictor over a ternary sequence (pure).
 *
 * Prediction by Partial Matching [ClearyWitten1984], escape method C, without exclusion: at a context
 * with total count n and d distinct symbols seen,
 *     P_k(x) = c(x) / (n + d),      escape = d / (n + d),
 * and the escaped mass falls through to the next shorter context; order -1 is uniform.
 */

/**
 * @param {{maxOrder:number}} cfg
 */
export function createPPM({ maxOrder }) {
  /** @type {Map<string, Float64Array>[]} one table per order 0..maxOrder */
  const tables = Array.from({ length: maxOrder + 1 }, () => new Map());

  /** @param {ArrayLike<number>} hist @param {number} k */
  const key = (hist, k) => {
    let s = '';
    for (let i = hist.length - k; i < hist.length; i++) s += hist[i];
    return s;
  };

  /**
   * @param {ArrayLike<number>} hist sequence so far (oldest first)
   * @returns {Float64Array} distribution over the next symbol
   */
  const predict = (hist) => {
    const out = new Float64Array(3);
    let weight = 1;
    for (let k = Math.min(maxOrder, hist.length); k >= 0 && weight > 1e-12; k--) {
      const c = tables[k].get(key(hist, k));
      if (!c) continue;
      const n = c[0] + c[1] + c[2];
      if (n <= 0) continue;
      const d = (c[0] > 0 ? 1 : 0) + (c[1] > 0 ? 1 : 0) + (c[2] > 0 ? 1 : 0);
      for (let x = 0; x < 3; x++) out[x] += (weight * c[x]) / (n + d);
      weight *= d / (n + d);
    }
    for (let x = 0; x < 3; x++) out[x] += weight / 3;
    return out;
  };

  /** @param {ArrayLike<number>} hist sequence BEFORE the new symbol @param {number} y */
  const update = (hist, y) => {
    if (!(y === 0 || y === 1 || y === 2)) return;
    for (let k = 0; k <= Math.min(maxOrder, hist.length); k++) {
      const id = key(hist, k);
      let c = tables[k].get(id);
      if (!c) { c = new Float64Array(3); tables[k].set(id, c); }
      c[y] += 1;
    }
  };

  return { predict, update };
}
