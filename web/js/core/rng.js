// @ts-check
/**
 * Random number sources (spec §4.2).
 *
 * Two generators with one interface ({@link Rng}):
 *  - `makeRng(seed)` - deterministic xoshiro128** (Blackman and Vigna). Everything that must be
 *    reproducible (simulations, experiments, tests) draws from it; the core never calls `Math.random()`.
 *  - `cryptoRng()`   - backed by the platform CSPRNG (`crypto.getRandomValues`). Used where
 *    unpredictability is the point: the AI's mixed strategy must not be guessable by the opponent.
 *
 * `randomBytesHex(n)` supplies the commitment nonces (honesty invariant I2). There is deliberately no
 * fallback to a non-cryptographic source: if the runtime has no CSPRNG these functions throw.
 */

const TWO_POW_32 = 4294967296;
const TWO_POW_26 = 67108864;
const TWO_POW_53 = 9007199254740992;
/** Words buffered per CSPRNG call by `cryptoRng()`. */
const CRYPTO_POOL_WORDS = 64;
/** `crypto.getRandomValues` refuses requests above this many bytes (Web Crypto API quota). */
const MAX_CRYPTO_BYTES = 65536;
/** Weyl increment of splitmix32: 2^32 / golden ratio, odd. */
const SPLITMIX_INCREMENT = 0x9e3779b9;

/** Two lower-case hex digits for every byte value. */
const HEX_BYTE = Object.freeze(Array.from({ length: 256 }, (_, b) => b.toString(16).padStart(2, '0')));

/**
 * @typedef {Object} Rng
 * @property {() => number} next
 *   Uniform real in [0, 1) with 53 random bits (every value is a multiple of 2^-53).
 * @property {() => number} uint32
 *   Uniform integer in [0, 2^32): the generator's raw output word.
 * @property {(n: number) => number} int
 *   Uniform integer in [0, n) for an integer 1 <= n <= 2^32. Exactly uniform (rejection sampling, no
 *   modulo bias). Throws RangeError for any other `n`.
 * @property {(mean?: number, sd?: number) => number} normal
 *   Normal variate N(mean, sd²); defaults 0 and 1. `sd = 0` returns `mean`. Consumes two `next()` draws.
 *   Throws RangeError if `mean` is not finite or `sd` is not finite and >= 0.
 * @property {<T>(arr: ArrayLike<T>) => T} pick
 *   Uniformly chosen element. Throws RangeError for an empty list.
 * @property {(w: ArrayLike<number>) => number} choiceWeighted
 *   Index i drawn with probability w[i] / Σw. Weights must be finite and >= 0 with a positive total
 *   (RangeError otherwise - an all-zero weight vector is a bug upstream, not a uniform draw). An index
 *   whose weight is 0 is never returned.
 * @property {() => Rng} fork
 *   A new generator of the same kind whose stream is independent of this one's future output (seeded
 *   from four words drawn here). Lets a simulation give each concern its own stream, so that changing
 *   how many numbers one part consumes does not shift the randomness of another.
 */

/**
 * Build the distribution layer on top of a source of uniform 32-bit words.
 * @param {() => number} uint32  returns integers in [0, 2^32)
 * @param {() => Rng} fork
 * @returns {Rng}
 */
function buildRng(uint32, fork) {
  // 27 + 26 bits, as in the reference `genrand_res53` of MT19937: uniform on the 2^53 multiples of 2^-53.
  const next = () => ((uint32() >>> 5) * TWO_POW_26 + (uint32() >>> 6)) / TWO_POW_53;

  /** @param {number} n */
  const int = (n) => {
    if (!Number.isInteger(n) || n < 1 || n > TWO_POW_32) throw new RangeError(`rng.int: n must be an integer in [1, 2^32], got ${String(n)}`);
    // Words at or above the largest multiple of n would over-represent the low residues; redraw them.
    const limit = TWO_POW_32 - (TWO_POW_32 % n);
    let word = uint32();
    while (word >= limit) word = uint32();
    return word % n;
  };

  const normal = (mean = 0, sd = 1) => {
    if (typeof mean !== 'number' || !Number.isFinite(mean)) throw new RangeError(`rng.normal: mean must be finite, got ${String(mean)}`);
    if (typeof sd !== 'number' || !(sd >= 0) || sd === Infinity) throw new RangeError(`rng.normal: sd must be finite and >= 0, got ${String(sd)}`);
    // Box–Muller transform. 1 - next() lies in (0, 1], so the logarithm is always finite.
    const radius = Math.sqrt(-2 * Math.log(1 - next()));
    return mean + sd * radius * Math.cos(2 * Math.PI * next());
  };

  /**
   * @template T
   * @param {ArrayLike<T>} arr
   * @returns {T}
   */
  const pick = (arr) => {
    if (arr == null || !(arr.length > 0)) throw new RangeError('rng.pick: cannot pick from an empty list');
    return arr[int(arr.length)];
  };

  /** @param {ArrayLike<number>} w */
  const choiceWeighted = (w) => {
    if (w == null || typeof w.length !== 'number') throw new RangeError('rng.choiceWeighted: weights must be an array of numbers');
    let total = 0;
    for (let i = 0; i < w.length; i++) {
      const x = w[i];
      if (typeof x !== 'number' || !(x >= 0) || x === Infinity) throw new RangeError(`rng.choiceWeighted: weight ${i} must be finite and >= 0, got ${String(x)}`);
      total += x;
    }
    if (!(total > 0) || total === Infinity) throw new RangeError(`rng.choiceWeighted: weights must have a finite positive total, got ${total}`);
    let remaining = next() * total;
    let last = -1;
    for (let i = 0; i < w.length; i++) {
      if (w[i] > 0) {
        last = i;
        if (remaining < w[i]) return i;
        remaining -= w[i];
      }
    }
    // Reached only when rounding in the running subtraction pushes `remaining` past the last weight.
    return last;
  };

  return Object.freeze({ next, uint32, int, normal, pick, choiceWeighted, fork });
}

/**
 * splitmix32: a counter passed through the MurmurHash3 finaliser. Used only to expand a 32-bit seed
 * into generator state; consecutive outputs are distinct and well mixed even for seeds 0, 1, 2 ...
 * @param {number} seed  any 32-bit integer
 * @returns {() => number} successive outputs in [0, 2^32)
 */
function splitmix32(seed) {
  let state = seed | 0;
  return () => {
    state = (state + SPLITMIX_INCREMENT) | 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/**
 * The xoshiro128** 1.1 generator of Blackman & Vigna on a raw 128-bit state:
 * period 2^128 - 1, passes BigCrush, 32-bit arithmetic only. Exported so that the implementation can be
 * checked against the published reference output; use {@link makeRng} for everything else.
 * @param {number} a  state word 0 (any integer; reduced modulo 2^32)
 * @param {number} b  state word 1
 * @param {number} c  state word 2
 * @param {number} d  state word 3
 * @returns {() => number} successive outputs in [0, 2^32)
 * @throws {RangeError} if a word is not an integer, or all four are zero (the one state the generator
 *                      never leaves)
 */
export function xoshiro128ss(a, b, c, d) {
  for (const word of [a, b, c, d]) {
    if (!Number.isInteger(word)) throw new RangeError(`xoshiro128ss: state words must be integers, got ${String(word)}`);
  }
  let s0 = a | 0;
  let s1 = b | 0;
  let s2 = c | 0;
  let s3 = d | 0;
  if ((s0 | s1 | s2 | s3) === 0) throw new RangeError('xoshiro128ss: the all-zero state is not allowed');
  return () => {
    const scrambled = Math.imul(s1, 5);
    const result = Math.imul((scrambled << 7) | (scrambled >>> 25), 9) >>> 0;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    return result;
  };
}

/**
 * xoshiro128** generator whose 128-bit state is the next four words of `words`. `fork` seeds the child
 * from four outputs of the parent: the child then sits at an unrelated point of the same 2^128 - 1
 * cycle, about 2^127 steps away on average, so the two streams do not overlap in practice.
 * @param {() => number} words  source of 32-bit state words
 * @returns {Rng}
 */
function seededRng(words) {
  const w0 = words();
  const w1 = words();
  const w2 = words();
  const w3 = words();
  // The all-zero state is a fixed point. splitmix32 cannot produce it (its four outputs are distinct);
  // four outputs of a parent generator can, with probability 2^-128.
  const uint32 = xoshiro128ss(w0, w1, w2, (w0 | w1 | w2 | w3) === 0 ? SPLITMIX_INCREMENT : w3);
  return buildRng(uint32, () => seededRng(uint32));
}

/**
 * Deterministic generator: the same seed always produces the same stream, on every platform.
 * @param {number} seed  any finite number; it is truncated to an integer and reduced modulo 2^32, so
 *                       seeds that differ by a multiple of 2^32 (or only in their fraction) coincide
 * @returns {Rng}
 * @throws {RangeError} if `seed` is not a finite number (a NaN seed would silently become seed 0)
 */
export function makeRng(seed) {
  if (typeof seed !== 'number' || !Number.isFinite(seed)) throw new RangeError(`makeRng: seed must be a finite number, got ${String(seed)}`);
  return seededRng(splitmix32(seed >>> 0));
}

/**
 * @returns {Crypto} the platform CSPRNG
 * @throws {Error} if the runtime has none
 */
function requireCrypto() {
  const source = globalThis.crypto;
  if (!source || typeof source.getRandomValues !== 'function') {
    throw new Error('rng: this runtime has no cryptographically secure random source (crypto.getRandomValues)');
  }
  return source;
}

/**
 * Generator with the {@link Rng} interface backed by `crypto.getRandomValues` (browsers and Node >= 20).
 * Not reproducible by design.
 * @returns {Rng}
 * @throws {Error} if the runtime has no CSPRNG
 */
export function cryptoRng() {
  const source = requireCrypto();
  const pool = new Uint32Array(CRYPTO_POOL_WORDS);
  let used = pool.length;
  const uint32 = () => {
    if (used === pool.length) {
      source.getRandomValues(pool);
      used = 0;
    }
    return pool[used++];
  };
  return buildRng(uint32, cryptoRng);
}

/**
 * `nBytes` bytes from the platform CSPRNG as lower-case hex (2·nBytes characters).
 * @param {number} nBytes  integer in [1, 65536]
 * @returns {string}
 * @throws {RangeError} if `nBytes` is not an integer in that range
 * @throws {Error} if the runtime has no CSPRNG
 */
export function randomBytesHex(nBytes) {
  if (!Number.isInteger(nBytes) || nBytes < 1 || nBytes > MAX_CRYPTO_BYTES) {
    throw new RangeError(`randomBytesHex: nBytes must be an integer in [1, ${MAX_CRYPTO_BYTES}], got ${String(nBytes)}`);
  }
  const bytes = requireCrypto().getRandomValues(new Uint8Array(nBytes));
  let hex = '';
  for (let i = 0; i < nBytes; i++) hex += HEX_BYTE[bytes[i]];
  return hex;
}
