// @ts-check
/**
 * Numerical helpers shared by every core module (spec §4.1). Pure functions, no state.
 *
 * Input policy (spec §3, "never propagate NaN"):
 *  - A NaN, undefined or non-numeric argument is a programming error and throws `RangeError`.
 *  - Where a degenerate input has a mathematically natural answer the function returns it (an empty
 *    sum is 0, the log-sum of nothing is -Infinity, the angle with a zero vector is 0, normalising a
 *    vector without mass gives the uniform distribution). Each such case is documented on the function.
 *  - A statistic of an empty sample (mean, median, quantile) has no value; these throw instead of
 *    inventing one (honesty invariant I4).
 *  - No function ever returns NaN. ±Infinity is returned only where it is the exact answer.
 *
 * Functions that return a vector never mutate their input and return a container of the same kind
 * (`Float64Array` in -> `Float64Array` out, anything else -> plain `Array`).
 */

/** @typedef {import('./constants.js').Vec3} Vec3 */

/** Tunable defaults of this module. */
export const DEFAULTS = Object.freeze({
  /** Standard-normal quantile of a two-sided 95 % interval (dimensionless). */
  wilsonZ: 1.959964,
});

const DEG_PER_RAD = 180 / Math.PI;
const LOG_2PI = Math.log(2 * Math.PI);

// ------------------------------------------------------------------------------------------------
// Argument guards
// ------------------------------------------------------------------------------------------------

/**
 * @param {unknown} x
 * @returns {string}
 */
const describe = (x) => (typeof x === 'number' || x == null ? String(x) : typeof x);

/**
 * @param {unknown} x
 * @param {string} what
 * @returns {number} `x`, guaranteed not NaN (may be ±Infinity)
 */
function requireNumber(x, what) {
  if (typeof x !== 'number' || x !== x) throw new RangeError(`${what} must be a number, got ${describe(x)}`);
  return x;
}

/**
 * @param {unknown} x
 * @param {string} what
 * @returns {number} `x`, guaranteed finite
 */
function requireFinite(x, what) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new RangeError(`${what} must be a finite number, got ${describe(x)}`);
  return x;
}

/**
 * @param {ArrayLike<number>} arr
 * @param {string} what
 * @returns {number} the length of `arr`
 */
function requireArrayLike(arr, what) {
  if (arr == null || typeof arr.length !== 'number') throw new RangeError(`${what} must be an array of numbers, got ${describe(arr)}`);
  return arr.length;
}

/**
 * Error for a bad list entry. Built only on the failure path, so the per-entry checks stay
 * allocation-free in the loops that call them.
 * @param {string} where
 * @param {number} i
 * @param {unknown} x
 * @param {string} [requirement]
 * @returns {RangeError}
 */
const badEntry = (where, i, x, requirement = 'a number') => new RangeError(`${where}: entry ${i} must be ${requirement}, got ${describe(x)}`);

/**
 * @param {Vec3} v
 * @param {string} what
 * @returns {Vec3}
 */
function requireVec(v, what) {
  if (v == null) throw new RangeError(`${what} must be a {x, y, z} vector, got ${describe(v)}`);
  return v;
}

/**
 * @param {number} value
 * @param {string} where
 * @returns {number} `value`, guaranteed not NaN
 */
function requireDefined(value, where) {
  if (value !== value) throw new RangeError(`${where}: a component is missing or not a number, or the operation has no defined result (∞ - ∞, 0·∞)`);
  return value;
}

/**
 * Empty container of the same kind as `like`.
 * @param {ArrayLike<number>} like
 * @param {number} n
 * @returns {number[]|Float64Array}
 */
const emptyLike = (like, n) => (like instanceof Float64Array ? new Float64Array(n) : new Array(n).fill(0));

// ------------------------------------------------------------------------------------------------
// Scalars
// ------------------------------------------------------------------------------------------------

/**
 * Limit `x` to the closed interval [lo, hi]. ±Infinity is clamped like any other value.
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 * @throws {RangeError} if an argument is NaN / not a number, or `lo > hi`
 */
export function clamp(x, lo, hi) {
  requireNumber(x, 'clamp: x');
  requireNumber(lo, 'clamp: lo');
  requireNumber(hi, 'clamp: hi');
  if (lo > hi) throw new RangeError(`clamp: lo (${lo}) must not exceed hi (${hi})`);
  if (x < lo) return lo;
  return x > hi ? hi : x;
}

/**
 * Linear interpolation `(1 - t)·a + t·b`: exactly `a` at t = 0 and exactly `b` at t = 1. `t` is not
 * clamped, so values outside [0, 1] extrapolate.
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 * @throws {RangeError} if an argument is not finite, or an extreme extrapolation overflows to ∞ - ∞
 */
export function lerp(a, b, t) {
  requireFinite(a, 'lerp: a');
  requireFinite(b, 'lerp: b');
  requireFinite(t, 'lerp: t');
  return requireDefined((1 - t) * a + t * b, 'lerp');
}

/**
 * Square of `x`.
 * @param {number} x
 * @returns {number}
 * @throws {RangeError} if `x` is NaN / not a number
 */
export function sq(x) {
  requireNumber(x, 'sq: x');
  return x * x;
}

// ------------------------------------------------------------------------------------------------
// Aggregates
// ------------------------------------------------------------------------------------------------

/**
 * Sum of the entries, with Neumaier's compensated summation so that long lists and
 * mixed magnitudes do not lose low-order digits (e.g. `sum([1e16, 1, -1e16]) === 1`).
 * An empty list sums to 0. ±Infinity entries give ±Infinity.
 * @param {ArrayLike<number>} arr
 * @returns {number}
 * @throws {RangeError} if an entry is NaN / not a number, or +Infinity and -Infinity both occur
 */
export function sum(arr) {
  const n = requireArrayLike(arr, 'sum: arr');
  let total = 0;
  let lost = 0; // running compensation: the low-order part that `total` could not hold
  let infinite = 0; // sign of the infinite entries seen so far, 0 = none
  for (let i = 0; i < n; i++) {
    const x = arr[i];
    if (typeof x !== 'number' || x !== x) throw badEntry('sum', i, x);
    if (x === Infinity || x === -Infinity) {
      const sign = x > 0 ? 1 : -1;
      if (infinite === -sign) throw new RangeError('sum: +Infinity and -Infinity have no defined sum');
      infinite = sign;
      continue;
    }
    const next = total + x;
    lost += Math.abs(total) >= Math.abs(x) ? (total - next) + x : (x - next) + total;
    total = next;
  }
  if (infinite !== 0) return infinite * Infinity;
  const compensated = total + lost;
  // Finite entries whose sum leaves the double range make the compensation term meaningless (∞ - ∞);
  // the plain total is then already the overflowed ±Infinity.
  return compensated === compensated ? compensated : total;
}

/**
 * Arithmetic mean.
 * @param {ArrayLike<number>} arr
 * @returns {number}
 * @throws {RangeError} if `arr` is empty (the mean of nothing is not a number), or as {@link sum}
 */
export function mean(arr) {
  const n = requireArrayLike(arr, 'mean: arr');
  if (n === 0) throw new RangeError('mean: an empty sample has no mean');
  return sum(arr) / n;
}

/**
 * Index of the largest entry; the FIRST one on ties. Returns -1 for an empty list.
 * @param {ArrayLike<number>} arr
 * @returns {number}
 * @throws {RangeError} if an entry is NaN / not a number
 */
export function argmax(arr) {
  const n = requireArrayLike(arr, 'argmax: arr');
  let best = -1;
  let bestValue = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = arr[i];
    if (typeof x !== 'number' || x !== x) throw badEntry('argmax', i, x);
    if (best === -1 || x > bestValue) {
      best = i;
      bestValue = x;
    }
  }
  return best;
}

/**
 * Scale non-negative weights so that they sum to 1. Returns the UNIFORM distribution when the weights
 * carry no usable mass: total <= 0, total not finite, or any entry missing / NaN. Entries are assumed
 * non-negative and are not checked individually.
 * @template {ArrayLike<number>} T
 * @param {T} p
 * @returns {T extends Float64Array ? Float64Array : number[]}
 * @throws {RangeError} if `p` is not array-like
 */
export function normalize(p) {
  const n = requireArrayLike(p, 'normalize: p');
  const out = emptyLike(p, n);
  let total = 0;
  for (let i = 0; i < n; i++) total += typeof p[i] === 'number' ? p[i] : NaN;
  if (total > 0 && total < Infinity) {
    for (let i = 0; i < n; i++) out[i] = p[i] / total;
  } else {
    out.fill(1 / n);
  }
  return /** @type {any} */ (out);
}

/**
 * `ln(Σ exp(arr[i]))` without overflow or underflow: the largest entry is factored out and the rest
 * goes through `log1p`, so `logSumExp([0, -40])` keeps the e^-40 that `log(1 + e^-40)` would drop.
 * -Infinity entries are log(0) terms and contribute nothing; an empty list (or all -Infinity) gives
 * -Infinity; a +Infinity entry gives +Infinity.
 * @param {ArrayLike<number>} arr
 * @returns {number}
 * @throws {RangeError} if an entry is NaN / not a number
 */
export function logSumExp(arr) {
  const n = requireArrayLike(arr, 'logSumExp: arr');
  let top = -Infinity;
  let at = -1;
  for (let i = 0; i < n; i++) {
    const x = arr[i];
    if (typeof x !== 'number' || x !== x) throw badEntry('logSumExp', i, x);
    if (x > top) {
      top = x;
      at = i;
    }
  }
  if (at === -1 || top === Infinity) return top;
  let rest = 0;
  for (let i = 0; i < n; i++) if (i !== at) rest += Math.exp(arr[i] - top);
  return top + Math.log1p(rest);
}

/**
 * Softmax `p_i ∝ exp(logits_i / temperature)`, computed relative to the largest logit so that it cannot
 * overflow. A -Infinity logit gets probability 0. Degenerate inputs: if every logit is -Infinity the
 * result is uniform (no option is preferred over another); +Infinity logits share all the mass equally.
 * @template {ArrayLike<number>} T
 * @param {T} logits
 * @param {number} [temperature]  > 0; values below 1 sharpen, above 1 flatten
 * @returns {T extends Float64Array ? Float64Array : number[]}
 * @throws {RangeError} if a logit is NaN / not a number, or `temperature` is not finite and positive
 */
export function softmax(logits, temperature = 1) {
  const n = requireArrayLike(logits, 'softmax: logits');
  if (typeof temperature !== 'number' || !(temperature > 0) || temperature === Infinity) {
    throw new RangeError(`softmax: temperature must be finite and > 0, got ${describe(temperature)}`);
  }
  const out = emptyLike(logits, n);
  let top = -Infinity;
  let nInfinite = 0;
  for (let i = 0; i < n; i++) {
    const x = logits[i];
    if (typeof x !== 'number' || x !== x) throw badEntry('softmax', i, x);
    if (x === Infinity) nInfinite++;
    if (x > top) top = x;
  }
  if (top === -Infinity) {
    out.fill(1 / n);
  } else if (nInfinite > 0) {
    for (let i = 0; i < n; i++) out[i] = logits[i] === Infinity ? 1 / nInfinite : 0;
  } else {
    let total = 0;
    for (let i = 0; i < n; i++) {
      out[i] = Math.exp((logits[i] - top) / temperature);
      total += out[i];
    }
    for (let i = 0; i < n; i++) out[i] /= total;
  }
  return /** @type {any} */ (out);
}

/**
 * Shannon entropy `-Σ p_i·log2(p_i)` in bits, with `0·log 0 = 0`. `p` is used as given (it is not
 * renormalised), so the result is an entropy only if `p` sums to 1.
 * @param {ArrayLike<number>} p
 * @returns {number}
 * @throws {RangeError} if an entry is negative, not finite or not a number
 */
export function entropyBits(p) {
  const n = requireArrayLike(p, 'entropyBits: p');
  let h = 0;
  for (let i = 0; i < n; i++) {
    const x = p[i];
    if (typeof x !== 'number' || !(x >= 0) || x === Infinity) throw badEntry('entropyBits', i, x, 'a finite number >= 0');
    if (x > 0) h -= x * Math.log2(x);
  }
  return h;
}

/**
 * Kullback–Leibler divergence `Σ p_i·log2(p_i / q_i)` in bits, with `0·log(0/q) = 0`. Returns +Infinity
 * (the exact value) when `q` gives zero probability to something `p` allows. Neither argument is
 * renormalised.
 * @param {ArrayLike<number>} p
 * @param {ArrayLike<number>} q
 * @returns {number}
 * @throws {RangeError} if the lengths differ or an entry is negative, not finite or not a number
 */
export function klBits(p, q) {
  const n = requireArrayLike(p, 'klBits: p');
  if (requireArrayLike(q, 'klBits: q') !== n) throw new RangeError(`klBits: p has ${n} entries but q has ${q.length}`);
  let d = 0;
  for (let i = 0; i < n; i++) {
    const pi = p[i];
    const qi = q[i];
    if (typeof pi !== 'number' || !(pi >= 0) || pi === Infinity) throw badEntry('klBits(p)', i, pi, 'a finite number >= 0');
    if (typeof qi !== 'number' || !(qi >= 0) || qi === Infinity) throw badEntry('klBits(q)', i, qi, 'a finite number >= 0');
    if (pi === 0) continue;
    if (qi === 0) return Infinity;
    const ratio = pi / qi;
    // The quotient is the accurate form when p ≈ q; the difference of logs takes over only where the
    // quotient itself would leave the double range.
    d += pi * (ratio > 0 && ratio < Infinity ? Math.log2(ratio) : Math.log2(pi) - Math.log2(qi));
  }
  return d;
}

// ------------------------------------------------------------------------------------------------
// Gaussian
// ------------------------------------------------------------------------------------------------

/**
 * Natural log of the normal density N(x; mean, variance).
 * @param {number} x
 * @param {number} mean
 * @param {number} variance  must be finite and > 0
 * @returns {number} a finite number, or -Infinity when `x` is so far out that the exponent overflows
 * @throws {RangeError} if `x` or `mean` is not finite, or `variance` is not finite and positive
 */
export function gaussLogPdf(x, mean, variance) {
  requireFinite(x, 'gaussLogPdf: x');
  requireFinite(mean, 'gaussLogPdf: mean');
  if (typeof variance !== 'number' || !(variance > 0) || variance === Infinity) {
    throw new RangeError(`gaussLogPdf: variance must be finite and > 0, got ${describe(variance)}`);
  }
  const d = x - mean;
  // d·(d/variance) instead of d²/(2·variance): neither factor can turn into ∞/∞.
  return -0.5 * (LOG_2PI + Math.log(variance)) - 0.5 * d * (d / variance);
}

// Coefficients of W. J. Cody's rational Chebyshev approximations for the normal distribution function
// (W. J. Cody, "Rational Chebyshev approximations for the error function", Math. Comp. 23,
// 1969, 631-637), in the arrangement of his ANORM routine that R's `pnorm` also uses.
const CDF_CENTRE_NUM = Object.freeze([2.2352520354606839287, 161.02823106855587881, 1067.6894854603709582, 18154.981253343561249, 0.065682337918207449113]);
const CDF_CENTRE_DEN = Object.freeze([47.20258190468824187, 976.09855173777669322, 10260.932208618978205, 45507.789335026729956]);
const CDF_MID_NUM = Object.freeze([
  0.39894151208813466764, 8.8831497943883759412, 93.506656132177855979, 597.27027639480026226, 2494.5375852903726711,
  6848.1904505362823326, 11602.651437647349555, 9842.7148383839780218, 1.0765576773720192317e-8,
]);
const CDF_MID_DEN = Object.freeze([
  22.266688044328115691, 235.38790178262499861, 1519.377599407554805, 6485.558298266760755, 18615.571640885098091,
  34900.952721145977266, 38912.003286093271411, 19685.429676859990727,
]);
const CDF_TAIL_NUM = Object.freeze([0.21589853405795699, 0.1274011611602473639, 0.022235277870649807, 0.001421619193227893466, 2.9112874951168792e-5, 0.02307344176494017303]);
const CDF_TAIL_DEN = Object.freeze([1.28426009614491121, 0.468238212480865118, 0.0659881378689285515, 0.00378239633202758244, 7.29751555083966205e-5]);
/** Up to this |z| the central approximation applies (it is the 75 % quantile of N(0, 1)). */
const CDF_CENTRE_LIMIT = 0.67448975;
/** Up to this |z| the mid-range approximation applies; beyond it the asymptotic one. */
const CDF_MID_LIMIT = Math.sqrt(32);
/** From this |z| on the tail probability is smaller than the smallest double (5e-324), i.e. exactly 0. */
const CDF_UNDERFLOW_LIMIT = 39;
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
/** `y` is split at this resolution so that the leading part of y² is exact in binary floating point. */
const CDF_SPLIT = 16;

/**
 * exp(-y²/2) with y² split into an exactly representable leading part and a small remainder, which keeps
 * full relative accuracy in the far tail where y² itself would already be rounded.
 * @param {number} y
 * @returns {number}
 */
function expNegHalfSquare(y) {
  const lead = Math.trunc(y * CDF_SPLIT) / CDF_SPLIT;
  const rest = (y - lead) * (y + lead);
  return Math.exp(-0.5 * lead * lead) * Math.exp(-0.5 * rest);
}

/**
 * Standard normal distribution function Φ(z) = P(Z <= z), by Cody's rational Chebyshev approximations
 * of the error function (reference above the coefficient tables).
 *
 * Accuracy (measured against an arbitrary-precision evaluation of the defining series on about 6000
 * exactly representable arguments in [-38.5, 38.5]; `tests/math.test.js` repeats the comparison on a
 * smaller grid): relative error below 1e-15 everywhere (largest observed 6.9e-16, in the lower tail),
 * absolute error below 1.2e-16. The lower tail is computed directly, never as 1 - Φ(-z), so it stays
 * accurate down to the underflow threshold near z = -38.5.
 * @param {number} z
 * @returns {number} a probability in [0, 1]; exactly 0 / 1 for z = -Infinity / +Infinity
 * @throws {RangeError} if `z` is NaN / not a number
 */
export function gaussCdf(z) {
  requireNumber(z, 'gaussCdf: z');
  const y = Math.abs(z);
  if (y <= CDF_CENTRE_LIMIT) {
    const s = z * z;
    let num = CDF_CENTRE_NUM[4] * s;
    let den = s;
    for (let i = 0; i < 3; i++) {
      num = (num + CDF_CENTRE_NUM[i]) * s;
      den = (den + CDF_CENTRE_DEN[i]) * s;
    }
    return 0.5 + (z * (num + CDF_CENTRE_NUM[3])) / (den + CDF_CENTRE_DEN[3]);
  }
  let tail = 0; // P(Z > |z|)
  if (y <= CDF_MID_LIMIT) {
    let num = CDF_MID_NUM[8] * y;
    let den = y;
    for (let i = 0; i < 7; i++) {
      num = (num + CDF_MID_NUM[i]) * y;
      den = (den + CDF_MID_DEN[i]) * y;
    }
    tail = (expNegHalfSquare(y) * (num + CDF_MID_NUM[7])) / (den + CDF_MID_DEN[7]);
  } else if (y < CDF_UNDERFLOW_LIMIT) {
    const s = 1 / (y * y);
    let num = CDF_TAIL_NUM[5] * s;
    let den = s;
    for (let i = 0; i < 4; i++) {
      num = (num + CDF_TAIL_NUM[i]) * s;
      den = (den + CDF_TAIL_DEN[i]) * s;
    }
    const correction = (s * (num + CDF_TAIL_NUM[4])) / (den + CDF_TAIL_DEN[4]);
    tail = (expNegHalfSquare(y) * (INV_SQRT_2PI - correction)) / y;
  }
  return z > 0 ? 1 - tail : tail;
}

// ------------------------------------------------------------------------------------------------
// 3-vectors
// ------------------------------------------------------------------------------------------------

/**
 * Dot product.
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {number}
 * @throws {RangeError} if a vector or component is missing / NaN
 */
export function dot3(a, b) {
  requireVec(a, 'dot3: a');
  requireVec(b, 'dot3: b');
  return requireDefined(a.x * b.x + a.y * b.y + a.z * b.z, 'dot3');
}

/**
 * Component-wise sum `a + b` (a new vector).
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 * @throws {RangeError} if a vector or component is missing / NaN
 */
export function add3(a, b) {
  requireVec(a, 'add3: a');
  requireVec(b, 'add3: b');
  return { x: requireDefined(a.x + b.x, 'add3'), y: requireDefined(a.y + b.y, 'add3'), z: requireDefined(a.z + b.z, 'add3') };
}

/**
 * Component-wise difference `a - b` (a new vector).
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 * @throws {RangeError} if a vector or component is missing / NaN
 */
export function sub3(a, b) {
  requireVec(a, 'sub3: a');
  requireVec(b, 'sub3: b');
  return { x: requireDefined(a.x - b.x, 'sub3'), y: requireDefined(a.y - b.y, 'sub3'), z: requireDefined(a.z - b.z, 'sub3') };
}

/**
 * Vector scaled by `k` (a new vector).
 * @param {Vec3} a
 * @param {number} k
 * @returns {Vec3}
 * @throws {RangeError} if the vector, a component or `k` is missing / NaN
 */
export function scale3(a, k) {
  requireVec(a, 'scale3: a');
  requireNumber(k, 'scale3: k');
  return { x: requireDefined(a.x * k, 'scale3'), y: requireDefined(a.y * k, 'scale3'), z: requireDefined(a.z * k, 'scale3') };
}

/**
 * Cross product `a × b` (a new vector, right-handed).
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 * @throws {RangeError} if a vector or component is missing / NaN
 */
export function cross3(a, b) {
  requireVec(a, 'cross3: a');
  requireVec(b, 'cross3: b');
  return {
    x: requireDefined(a.y * b.z - a.z * b.y, 'cross3'),
    y: requireDefined(a.z * b.x - a.x * b.z, 'cross3'),
    z: requireDefined(a.x * b.y - a.y * b.x, 'cross3'),
  };
}

/**
 * Euclidean length (overflow- and underflow-safe).
 * @param {Vec3} a
 * @returns {number}
 * @throws {RangeError} if the vector or a component is missing / NaN
 */
export function len3(a) {
  requireVec(a, 'len3: a');
  return requireDefined(Math.hypot(a.x, a.y, a.z), 'len3');
}

/**
 * Largest absolute component; NaN if any component is missing or NaN.
 * @param {Vec3} v
 * @returns {number}
 */
const maxAbs3 = (v) => Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));

/**
 * Angle between two vectors in degrees, in [0, 180]. Returns 0 if either vector has zero length (no
 * direction, hence no bend).
 *
 * Uses `atan2(|a × b|, a · b)` rather than `acos` of the normalised dot product: `acos` loses half of
 * the significant digits near 0° and 180° (it cannot resolve angles below about 1e-6°), which matters
 * for nearly straight finger joints, and it needs clamping against rounding outside [-1, 1]. Both
 * vectors are first divided by their largest component, so the result is exactly independent of the
 * vectors' scale and cannot overflow or underflow.
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {number}
 * @throws {RangeError} if a vector is missing or a component is missing / not finite
 */
export function angleDeg(a, b) {
  requireVec(a, 'angleDeg: a');
  requireVec(b, 'angleDeg: b');
  const sa = maxAbs3(a);
  const sb = maxAbs3(b);
  if (!(sa < Infinity) || !(sb < Infinity)) throw new RangeError('angleDeg: every component must be a finite number');
  // Zero vectors are answered here and never reach atan2: their dot product can be -0, and
  // atan2(0, -0) is π, which would report a fully folded joint.
  if (sa === 0 || sb === 0) return 0;
  const ax = a.x / sa;
  const ay = a.y / sa;
  const az = a.z / sa;
  const bx = b.x / sb;
  const by = b.y / sb;
  const bz = b.z / sb;
  const sine = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  const cosine = ax * bx + ay * by + az * bz;
  return Math.atan2(sine, cosine) * DEG_PER_RAD;
}

// ------------------------------------------------------------------------------------------------
// Binomial inference
// ------------------------------------------------------------------------------------------------

/**
 * Wilson score interval for a binomial proportion [Wilson1927]: the set of p whose normal-approximation
 * test at level `z` does not reject `k` successes in `n` trials. Unlike the Wald interval it stays
 * inside [0, 1] and keeps close to nominal coverage for small `n` and extreme proportions.
 *
 * With `n = 0` nothing has been observed and the interval is the whole range [0, 1]. For `k = 0` the
 * lower limit is exactly 0, for `k = n` the upper limit is exactly 1.
 * @param {number} k  number of successes, 0 <= k <= n
 * @param {number} n  number of trials, >= 0
 * @param {number} [z]  standard-normal quantile; the default gives a 95 % interval
 * @returns {{ lo: number, hi: number }}
 * @throws {RangeError} if an argument is not finite, `n < 0`, `k` is outside [0, n], or `z < 0`
 */
export function wilsonInterval(k, n, z = DEFAULTS.wilsonZ) {
  requireFinite(k, 'wilsonInterval: k');
  requireFinite(n, 'wilsonInterval: n');
  requireFinite(z, 'wilsonInterval: z');
  if (n < 0 || k < 0 || k > n) throw new RangeError(`wilsonInterval: need 0 <= k <= n, got k=${k}, n=${n}`);
  if (z < 0) throw new RangeError(`wilsonInterval: z must be >= 0, got ${z}`);
  if (n === 0) return { lo: 0, hi: 1 };
  const z2 = z * z;
  const centre = (k + z2 / 2) / (n + z2);
  const half = (z / (n + z2)) * Math.sqrt((k * (n - k)) / n + z2 / 4);
  // The limits at k = 0 and k = n are exact in the formula but not in floating point; everything else
  // is only guarded against a last-digit excursion outside [0, 1].
  return {
    lo: k === 0 ? 0 : Math.max(0, centre - half),
    hi: k === n ? 1 : Math.min(1, centre + half),
  };
}

/**
 * ln C(n, m), as a compensated sum of the logs of the min(m, n - m) factor ratios. No lgamma
 * approximation is involved, so the error stays near 1e-14 absolute for n in the thousands.
 * @param {number} n
 * @param {number} m  0 <= m <= n
 * @returns {number}
 */
function logChoose(n, m) {
  const r = Math.min(m, n - m);
  const terms = new Float64Array(r);
  for (let j = 1; j <= r; j++) terms[j - 1] = Math.log((n - r + j) / j);
  return sum(terms);
}

/**
 * Natural log of the exact binomial upper tail, `ln P(X >= k)` for X ~ Binomial(n, p).
 *
 * The tail is summed term by term relative to its largest term (the mode of the distribution if the
 * mode lies inside the tail, otherwise the first term), so no term can overflow, and only that anchor
 * term is evaluated through logarithms. The result therefore stays finite and accurate where the
 * probability itself underflows a double (e.g. 4900 successes out of 5000 at p = 1/3: ln P ≈ -4420).
 * Relative error of the probability below 1e-12 for n up to 5000 (checked against exact rational
 * arithmetic in the tests). Cost O(n).
 * @param {number} k  integer threshold (any sign)
 * @param {number} n  integer number of trials, >= 0
 * @param {number} p  success probability in [0, 1]
 * @returns {number} a value <= 0; exactly 0 when the event is certain (k <= 0), -Infinity when it is
 *                   impossible (k > n, or p = 0 with k >= 1)
 * @throws {RangeError} if `k` or `n` is not an integer, `n < 0`, or `p` is outside [0, 1]
 */
export function logBinomTailGE(k, n, p) {
  if (!Number.isInteger(k)) throw new RangeError(`logBinomTailGE: k must be an integer, got ${describe(k)}`);
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`logBinomTailGE: n must be an integer >= 0, got ${describe(n)}`);
  if (typeof p !== 'number' || !(p >= 0 && p <= 1)) throw new RangeError(`logBinomTailGE: p must lie in [0, 1], got ${describe(p)}`);
  if (k <= 0) return 0;
  if (k > n || p === 0) return -Infinity;
  if (p === 1) return 0;
  const odds = p / (1 - p);
  const anchor = Math.max(k, Math.min(n, Math.floor((n + 1) * p)));
  let relative = 1; // tail mass in units of pmf(anchor)
  let term = 1;
  for (let i = anchor; i < n && term > 0; i++) {
    term *= ((n - i) / (i + 1)) * odds; // pmf(i + 1) / pmf(i)
    relative += term;
  }
  term = 1;
  for (let i = anchor; i > k && term > 0; i--) {
    term *= i / ((n - i + 1) * odds); // pmf(i - 1) / pmf(i)
    relative += term;
  }
  const logAnchor = logChoose(n, anchor) + anchor * Math.log(p) + (n - anchor) * Math.log1p(-p);
  // A probability cannot exceed 1; rounding may leave the log a few ulp above 0 when the tail is ≈ 1.
  return Math.min(0, logAnchor + Math.log(relative));
}

/**
 * Exact binomial upper tail `P(X >= k)` for X ~ Binomial(n, p), evaluated in log space (see
 * {@link logBinomTailGE}). This is the one-sided p-value of "k or more successes in n trials" under a
 * success probability p. Returns 0 only when the event is impossible or the true value is below the
 * smallest double; use {@link logBinomTailGE} to report such tails.
 * @param {number} k
 * @param {number} n
 * @param {number} p
 * @returns {number} a probability in [0, 1]
 * @throws {RangeError} as {@link logBinomTailGE}
 */
export function binomTailGE(k, n, p) {
  return Math.exp(logBinomTailGE(k, n, p));
}

// ------------------------------------------------------------------------------------------------
// Minimum-jerk profile
// ------------------------------------------------------------------------------------------------

/**
 * Normalised position of a minimum-jerk point-to-point movement [FlashHogan1985]:
 * `10s³ - 15s⁴ + 6s⁵` for normalised time s in [0, 1]; exactly 0 for s <= 0 and exactly 1 for s >= 1
 * (also for ±Infinity). `minJerk(0.5) === 0.5` and `minJerk(1 - s) = 1 - minJerk(s)`.
 * @param {number} s
 * @returns {number} a value in [0, 1]
 * @throws {RangeError} if `s` is NaN / not a number
 */
export function minJerk(s) {
  requireNumber(s, 'minJerk: s');
  if (s <= 0) return 0;
  if (s >= 1) return 1;
  return s * s * s * (10 + s * (-15 + 6 * s));
}

/**
 * Normalised velocity of the minimum-jerk profile, d minJerk / ds = `30s² - 60s³ + 30s⁴ = 30·s²·(1-s)²`
 * [FlashHogan1985]; 0 outside (0, 1), peak 1.875 at s = 0.5. Multiply by amplitude / duration for a
 * physical velocity.
 * @param {number} s
 * @returns {number} a value in [0, 1.875]
 * @throws {RangeError} if `s` is NaN / not a number
 */
export function minJerkVel(s) {
  requireNumber(s, 'minJerkVel: s');
  if (s <= 0 || s >= 1) return 0;
  const r = s * (1 - s);
  return 30 * r * r;
}

// ------------------------------------------------------------------------------------------------
// Order statistics
// ------------------------------------------------------------------------------------------------

/**
 * Type-7 quantile of a non-empty sample; shared by {@link quantile} and {@link median}.
 * @param {ArrayLike<number>} arr
 * @param {number} q  in [0, 1]
 * @param {string} where  name of the public function, for error messages
 * @returns {number}
 */
function orderStatistic(arr, q, where) {
  const n = requireArrayLike(arr, `${where}: arr`);
  if (n === 0) throw new RangeError(`${where}: an empty sample has no order statistics`);
  const sorted = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = arr[i];
    if (typeof x !== 'number' || x !== x) throw badEntry(where, i, x);
    sorted[i] = x;
  }
  sorted.sort();
  const position = (n - 1) * q;
  const below = Math.floor(position);
  const weight = position - below;
  const a = sorted[below];
  if (weight === 0 || a === sorted[below + 1]) return a;
  const b = sorted[below + 1];
  // Convex form: unlike a + weight·(b - a) it cannot overflow for finite a and b.
  const value = (1 - weight) * a + weight * b;
  if (value !== value) throw new RangeError(`${where}: cannot interpolate between -Infinity and +Infinity`);
  if (value < a) return a;
  return value > b ? b : value;
}

/**
 * Sample quantile with linear interpolation between order statistics (Hyndman & Fan type 7, the
 * default of R and NumPy): position `(n - 1)·q` in the sorted sample. `q = 0` is the
 * minimum, `q = 1` the maximum. The input is not modified.
 * @param {ArrayLike<number>} arr
 * @param {number} q  in [0, 1]
 * @returns {number}
 * @throws {RangeError} if `arr` is empty or has a NaN / non-numeric entry, `q` is outside [0, 1], or the
 *                      interpolation falls between -Infinity and +Infinity
 */
export function quantile(arr, q) {
  if (typeof q !== 'number' || !(q >= 0 && q <= 1)) throw new RangeError(`quantile: q must lie in [0, 1], got ${describe(q)}`);
  return orderStatistic(arr, q, 'quantile');
}

/**
 * Sample median (the mean of the two central values for an even sample size). The input is not modified.
 * @param {ArrayLike<number>} arr
 * @returns {number}
 * @throws {RangeError} if `arr` is empty or has a NaN / non-numeric entry, or the two central values are
 *                      -Infinity and +Infinity
 */
export function median(arr) {
  return orderStatistic(arr, 0.5, 'median');
}
