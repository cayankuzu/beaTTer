// @ts-check
/**
 * SHA-256 [FIPS180-4] (spec §4.3).
 *
 * `sha256Hex` is a synchronous pure-JS implementation, so a commitment can be sealed inside the frame
 * that produced it and on pages without a secure context (where `crypto.subtle` does not exist).
 * `sha256HexAsync` asks the platform's Web Crypto implementation instead; the two share no code, which
 * makes the second one an independent check at reveal time.
 *
 * Both hash the UTF-8 encoding of the string. An unpaired UTF-16 surrogate is encoded as U+FFFD, exactly
 * as `TextEncoder` and Node's `Buffer` do, so the two variants agree on every JavaScript string. (The v3
 * implementation encoded each half of a surrogate pair as its own 3-byte sequence, which is not UTF-8
 * and made hashes of non-BMP text disagree with every other SHA-256 implementation.)
 */

/** Round constants: the first 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const ROUND_CONSTANTS = new Int32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Initial hash value: the first 32 bits of the fractional parts of the square roots of the first 8 primes. */
const INITIAL_STATE = Object.freeze([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);

const BLOCK_BYTES = 64;
/** Offset inside a block from which the 8-byte message length is stored. */
const LENGTH_OFFSET = 56;
/** Replacement character substituted for an unpaired surrogate (WHATWG Encoding, "USVString"). */
const REPLACEMENT_CODE_POINT = 0xfffd;
/** 2^29: a byte count divided by it is the high word of the 64-bit BIT count. */
const BYTES_PER_HIGH_WORD = 0x20000000;

/**
 * UTF-8 encoding of a JavaScript (UTF-16) string. Surrogate pairs become one 4-byte sequence; an
 * unpaired surrogate becomes U+FFFD (EF BF BD).
 * @param {string} str
 * @returns {Uint8Array}
 * @throws {TypeError} if `str` is not a string
 */
export function utf8Bytes(str) {
  if (typeof str !== 'string') throw new TypeError(`utf8Bytes: expected a string, got ${typeof str}`);
  // A UTF-16 code unit never needs more than 3 bytes (a surrogate pair is 2 units -> 4 bytes).
  const out = new Uint8Array(str.length * 3);
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      } else {
        code = REPLACEMENT_CODE_POINT;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = REPLACEMENT_CODE_POINT;
    }
    if (code < 0x80) {
      out[n++] = code;
    } else if (code < 0x800) {
      out[n++] = 0xc0 | (code >> 6);
      out[n++] = 0x80 | (code & 0x3f);
    } else if (code < 0x10000) {
      out[n++] = 0xe0 | (code >> 12);
      out[n++] = 0x80 | ((code >> 6) & 0x3f);
      out[n++] = 0x80 | (code & 0x3f);
    } else {
      out[n++] = 0xf0 | (code >> 18);
      out[n++] = 0x80 | ((code >> 12) & 0x3f);
      out[n++] = 0x80 | ((code >> 6) & 0x3f);
      out[n++] = 0x80 | (code & 0x3f);
    }
  }
  return out.subarray(0, n);
}

/**
 * SHA-256 compression function: fold one 64-byte block into the state.
 * @param {Int32Array} state     8 working words, updated in place
 * @param {Uint8Array} bytes
 * @param {number} offset        start of the block inside `bytes`
 * @param {Int32Array} schedule  64-word scratch buffer (reused between blocks)
 */
function compress(state, bytes, offset, schedule) {
  for (let i = 0; i < 16; i++) {
    const at = offset + i * 4;
    schedule[i] = (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3];
  }
  for (let i = 16; i < 64; i++) {
    const x = schedule[i - 15];
    const y = schedule[i - 2];
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) | 0;
  }
  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];
  let e = state[4];
  let f = state[5];
  let g = state[6];
  let h = state[7];
  for (let i = 0; i < 64; i++) {
    const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const choose = (e & f) ^ (~e & g);
    const t1 = (h + sigma1 + choose + ROUND_CONSTANTS[i] + schedule[i]) | 0;
    const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (sigma0 + majority) | 0;
    h = g;
    g = f;
    f = e;
    e = (d + t1) | 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) | 0;
  }
  state[0] = (state[0] + a) | 0;
  state[1] = (state[1] + b) | 0;
  state[2] = (state[2] + c) | 0;
  state[3] = (state[3] + d) | 0;
  state[4] = (state[4] + e) | 0;
  state[5] = (state[5] + f) | 0;
  state[6] = (state[6] + g) | 0;
  state[7] = (state[7] + h) | 0;
}

/**
 * SHA-256 of a byte sequence, as 64 lower-case hex characters. Synchronous, pure JS.
 * @param {Uint8Array} bytes
 * @returns {string}
 * @throws {TypeError} if `bytes` is not a Uint8Array
 */
export function sha256HexOfBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('sha256HexOfBytes: expected a Uint8Array');
  const state = Int32Array.from(INITIAL_STATE);
  const schedule = new Int32Array(64);
  const length = bytes.length;
  const whole = length - (length % BLOCK_BYTES);
  for (let offset = 0; offset < whole; offset += BLOCK_BYTES) compress(state, bytes, offset, schedule);

  // Padding: the remaining bytes, a single 1 bit, zeros, then the message length in bits as a 64-bit
  // big-endian integer. It needs a second block when fewer than 9 bytes are free in the first.
  const rest = length - whole;
  const tail = new Uint8Array(rest < LENGTH_OFFSET ? BLOCK_BYTES : 2 * BLOCK_BYTES);
  tail.set(bytes.subarray(whole));
  tail[rest] = 0x80;
  const bitsHigh = Math.floor(length / BYTES_PER_HIGH_WORD);
  const bitsLow = (length << 3) >>> 0;
  const end = tail.length;
  tail[end - 8] = bitsHigh >>> 24;
  tail[end - 7] = bitsHigh >>> 16;
  tail[end - 6] = bitsHigh >>> 8;
  tail[end - 5] = bitsHigh;
  tail[end - 4] = bitsLow >>> 24;
  tail[end - 3] = bitsLow >>> 16;
  tail[end - 2] = bitsLow >>> 8;
  tail[end - 1] = bitsLow;
  for (let offset = 0; offset < end; offset += BLOCK_BYTES) compress(state, tail, offset, schedule);

  let hex = '';
  for (let i = 0; i < 8; i++) hex += (state[i] >>> 0).toString(16).padStart(8, '0');
  return hex;
}

/**
 * SHA-256 of the UTF-8 encoding of `str`, as 64 lower-case hex characters. Synchronous, pure JS.
 * @param {string} str
 * @returns {string}
 * @throws {TypeError} if `str` is not a string (hashing "undefined" would seal the wrong thing silently)
 */
export function sha256Hex(str) {
  if (typeof str !== 'string') throw new TypeError(`sha256Hex: expected a string, got ${typeof str}`);
  return sha256HexOfBytes(utf8Bytes(str));
}

/**
 * The same digest computed by the platform's Web Crypto implementation (`crypto.subtle.digest`): an
 * independent second implementation for reveal verification.
 * @param {string} str
 * @returns {Promise<string|null>} the digest, or `null` when Web Crypto is not usable here (no secure
 *                                 context, or the digest call fails) - "could not be checked", never
 *                                 a fabricated match
 * @throws {TypeError} (as a rejection) if `str` is not a string
 */
export async function sha256HexAsync(str) {
  if (typeof str !== 'string') throw new TypeError(`sha256HexAsync: expected a string, got ${typeof str}`);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function' || typeof TextEncoder !== 'function') return null;
  try {
    const digest = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(str)));
    let hex = '';
    for (let i = 0; i < digest.length; i++) hex += digest[i].toString(16).padStart(2, '0');
    return hex;
  } catch {
    return null;
  }
}
