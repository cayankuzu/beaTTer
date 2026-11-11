// @ts-check
/**
 * Hash-chained commit–reveal log (spec §4.4; honesty invariants I2 "binding" and I3 "complete audit").
 *
 * The AI must fix its move before the human's hand lands, and must be able to prove afterwards that
 * it did. Each commitment is therefore sealed as SHA-256 of a canonical payload that contains the move
 * and a fresh 128-bit CSPRNG nonce. The hash is published at once; the payload stays inside the log
 * until the round is revealed. The nonce is what makes the hash hide a move drawn from only three
 * possibilities; the hash of the previous commitment inside every payload is what makes the log
 * append-only in a checkable way: no entry can be altered, dropped, inserted or reordered without
 * breaking every later link.
 *
 * What the log guarantees by construction:
 *  - entries are frozen and only ever appended (I3: nothing is overwritten, every revision is kept);
 *  - move, nonce, payload and the caller's annotations (`meta`) cannot be read before `reveal(round)`;
 *  - revealing a round closes it: a later `commit` into that round throws (the log-level half of I1);
 *  - `verify` accepts a revealed commit only if it re-hashes to the value this log published.
 *
 * The module is pure: time and randomness are injected, there is no DOM and no global state.
 */

import { MOVES, SCHEMA_VERSION } from './constants.js';
import { randomBytesHex as cryptoRandomBytesHex } from './rng.js';
import { sha256Hex } from './sha256.js';

/** @typedef {import('./constants.js').PublicCommit} PublicCommit */
/** @typedef {import('./constants.js').RevealedCommit} RevealedCommit */
/** @typedef {import('./constants.js').CommitReason} CommitReason */

/**
 * Protocol constants. They define the byte layout of what is hashed, so they are NOT overridable
 * per log: changing any of them changes every hash.
 */
export const DEFAULTS = Object.freeze({
  /** Domain-separation tag that starts every payload and the genesis string. */
  domain: 'beaTTer/v4',
  /** Nonce length in bytes. 128 bits: far beyond brute force, so the hash reveals nothing about a 3-valued move. */
  nonceBytes: 16,
  /** Decimals of the sealed capture time `t` (ms), i.e. a 0.1 ms grid. */
  timeDecimals: 1,
  /** Hex characters of the hash shown to the player as the seal code. */
  shortLength: 8,
});

/**
 * The reasons a commitment may carry, in the order they can occur within a round.
 * @type {readonly CommitReason[]}
 */
export const COMMIT_REASONS = Object.freeze(/** @type {CommitReason[]} */ (['BEHAVIOUR', 'KINEMATIC', 'REVISION', 'DEADLINE']));

const TIME_SCALE = 10 ** DEFAULTS.timeDecimals;
/** Largest |t|·TIME_SCALE for which scaling by ten and back is exact in binary floating point (2^52). */
const MAX_SCALED_TIME = 4503599627370496;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const NONCE_PATTERN = new RegExp(`^[0-9a-f]{${2 * DEFAULTS.nonceBytes}}$`);
/** Move names are written verbatim into the payload, so they must not be able to imitate its syntax. */
const MOVE_NAME_PATTERN = /^[A-Z0-9_]+$/;
/**
 * Session ids are written verbatim into the payload too: no field separator, no control characters,
 * and no unpaired surrogates (two different ids would otherwise hash to the same bytes).
 */
const SESSION_ID_PATTERN = /^[^|\p{Cc}\p{Cs}]+$/u;

/**
 * @typedef {Object} Verification
 * @property {boolean} ok              `hashOk && chainOk`.
 * @property {boolean} hashOk          The revealed fields rebuild the canonical payload, that payload
 *                                     hashes to the revealed hash and the seal code matches it. From
 *                                     `log.verify` additionally: the hash is the one this log published.
 * @property {boolean} chainOk         `prev` equals the hash of the preceding commit (or the genesis).
 * @property {string|null} recomputed  SHA-256 of the payload rebuilt from the revealed fields; `null`
 *                                     if the fields are malformed and no payload can be built.
 */

/**
 * @typedef {Object} ChainVerification
 * @property {boolean} ok
 * @property {number|null} brokenAt  Position (0-based) of the first commit that fails in the verified
 *                                   list - for the complete log that is its `seq`; `null` when `ok`.
 */

/**
 * One record of an exported log. Records of unrevealed rounds carry the public part only.
 * @typedef {PublicCommit & {
 *   revealed: boolean,
 *   sealedAt: number|null,
 *   revealedAt?: number|null,
 *   move?: number,
 *   nonce?: string,
 *   payload?: string,
 *   meta?: unknown,
 * }} ExportedCommit
 */

/**
 * @typedef {Object} ExportedLog
 * @property {number} schema           `SCHEMA_VERSION`.
 * @property {string} format           `'beaTTer/v4/commit-log'`.
 * @property {string} sessionId
 * @property {string} genesis
 * @property {string[]} alphabet       Move names by index (needed to rebuild payloads).
 * @property {string} head             Hash of the last commit (the genesis for an empty log).
 * @property {ExportedCommit[]} commits
 */

/**
 * @typedef {Object} CommitInput
 * @property {number} round          Round number, integer >= 0.
 * @property {number} move           The committed move: 0 | 1 | 2 (index into the log's alphabet).
 * @property {CommitReason} reason
 * @property {number} frame          Index of the frame whose information set the commitment uses, integer >= 0.
 * @property {number} [t]            Capture time of that frame in ms. Defaults to `now()`.
 * @property {unknown} [meta]        JSON-serialisable annotations kept with the commit (belief, progress ...).
 *                                   NOT covered by the hash. Withheld until the round is revealed.
 */

/**
 * @typedef {Object} CommitLog
 * @property {string} genesis
 *   `sha256Hex('beaTTer/v4/genesis|' + sessionId)`: what the first commit chains to.
 * @property {(input: CommitInput) => PublicCommit} commit
 *   Seal a move and append it. Returns the public part only. Throws `RangeError` for an invalid move
 *   (anything but an integer index of the alphabet), reason, round, frame or time, and `Error` if the
 *   round has already been revealed. A failed call appends nothing.
 * @property {(round: number) => RevealedCommit[]} reveal
 *   Open every commit of `round`, in `seq` order, and close the round. Idempotent; returns fresh copies.
 *   A round without commits returns `[]` and is not closed.
 * @property {(revealed: RevealedCommit, prevHash?: string) => Verification} verify
 *   Check one revealed commit: recompute its hash from its fields, compare with the hash this log
 *   published under that `seq`, and check the chain link against `prevHash` (default: the hash this log
 *   published for `seq - 1`, or the genesis). Never throws; malformed input fails verification.
 * @property {(commits?: RevealedCommit[]) => ChainVerification} verifyChain
 *   Without argument: re-verify the complete log from the genesis (every hash recomputed, every link
 *   checked). With a list of revealed commits: verify that the list is, in this order, a contiguous
 *   run of this log's chain (reordered, missing, foreign or altered commits break it).
 * @property {() => ExportedLog} export
 *   JSON-serialisable snapshot of the whole log. Commits of revealed rounds include move, nonce,
 *   payload and meta; commits of unrevealed rounds only their public part.
 * @property {(round: number) => unknown[]} metaOf
 *   The `meta` annotations of a revealed round, aligned with `reveal(round)` (`null` where none was
 *   given). Throws `Error` while the round is still sealed.
 * @property {() => string} head
 *   Hash the next commit will chain to: the last commit's hash, or the genesis.
 * @property {() => number} size
 *   Number of commits made so far (= the `seq` the next commit will get).
 * @property {(round: number) => boolean} isRevealed
 * @property {() => number[]} sealedRounds
 *   Rounds that hold commits which have not been opened yet, ascending. Empty when the audit is complete (I3).
 * @property {() => number} lastRound
 *   Highest round number ever sealed in this log (-1 while it is empty). A new engine on an existing
 *   log continues after it: a revealed round is closed for good.
 */

/**
 * @param {unknown} value
 * @returns {value is number} a non-negative safe integer
 */
const isIndex = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/**
 * @param {unknown} value
 * @returns {value is string}
 */
const isSessionId = (value) => typeof value === 'string' && SESSION_ID_PATTERN.test(value);

/**
 * @param {unknown} value
 * @returns {value is readonly string[]} non-empty list of distinct payload-safe move names
 */
function isAlphabet(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (new Set(value).size !== value.length) return false;
  return value.every((name) => typeof name === 'string' && MOVE_NAME_PATTERN.test(name));
}

/**
 * Put a time on the payload's 0.1 ms grid. The result survives another pass unchanged (for ten,
 * `(k / 10) * 10 === k` holds exactly below 2^52 [Goldberg1991, Theorem 7]), so the value stored in a
 * commit always formats to the same text that was hashed. `+ 0` folds -0 into +0, which would
 * otherwise print without and compare with a sign.
 * @param {number} t
 * @returns {number}
 */
const quantiseTime = (t) => Math.round(t * TIME_SCALE) / TIME_SCALE + 0;

/**
 * @param {unknown} t
 * @returns {t is number} a time that is already on the payload grid
 */
const isQuantisedTime = (t) => typeof t === 'number' && Number.isFinite(t) && Math.abs(t * TIME_SCALE) < MAX_SCALED_TIME && quantiseTime(t) === t;

/**
 * @param {string} hash
 * @returns {string} the seal code shown to the player
 */
const shortOf = (hash) => hash.slice(0, DEFAULTS.shortLength).toUpperCase();

/**
 * Hash that starts a session's chain.
 * @param {string} sessionId
 * @returns {string}
 * @throws {RangeError} if `sessionId` is not a valid session id
 */
export function genesisHash(sessionId) {
  if (!isSessionId(sessionId)) throw new RangeError('genesisHash: sessionId must be a non-empty string without "|", control characters or unpaired surrogates');
  return sha256Hex(`${DEFAULTS.domain}/genesis|${sessionId}`);
}

/**
 * The canonical payload - the exact string that is hashed:
 * `beaTTer/v4|sid=<sessionId>|seq=<n>|round=<r>|prev=<64 hex>|t=<ms, 1 decimal>|frame=<i>|move=<NAME>|reason=<code>|nonce=<32 hex>`.
 * Field order and formatting are fixed; every field is either strictly formatted or cannot contain
 * the separator, so two different commitments can never produce the same string.
 * @param {{ sessionId: string, seq: number, round: number, prev: string, t: number, frame: number,
 *           moveName: string, reason: string, nonce: string }} fields  already validated
 * @returns {string}
 */
export function buildPayload({ sessionId, seq, round, prev, t, frame, moveName, reason, nonce }) {
  return `${DEFAULTS.domain}|sid=${sessionId}|seq=${seq}|round=${round}|prev=${prev}|t=${quantiseTime(t).toFixed(DEFAULTS.timeDecimals)}`
    + `|frame=${frame}|move=${moveName}|reason=${reason}|nonce=${nonce}`;
}

/** @type {Verification} */
const VERIFICATION_FAILED = Object.freeze({ ok: false, hashOk: false, chainOk: false, recomputed: null });

/**
 * Stateless verification of one revealed commit: are its fields, its payload, its hash and its seal
 * code mutually consistent, and does it chain to `prevHash`? Needs nothing but the commit itself, so
 * it also works on an exported log. It cannot know which hash was published at commit time - a
 * verifier must compare `revealed.hash` with the published value itself (`log.verify` does).
 * Never throws: anything malformed fails.
 * @param {RevealedCommit} revealed
 * @param {string} prevHash     hash of the preceding commit, or the genesis hash for `seq` 0
 * @param {string} sessionId
 * @param {readonly string[]} [alphabet]  move names by index (default `MOVES`)
 * @returns {Verification}
 */
export function verifyRevealed(revealed, prevHash, sessionId, alphabet = MOVES) {
  if (revealed === null || typeof revealed !== 'object' || !isSessionId(sessionId) || !isAlphabet(alphabet)) return { ...VERIFICATION_FAILED };
  const { seq, round, hash, short, prev, t, frame, reason, move, nonce, payload } = revealed;
  const wellFormed = isIndex(seq) && isIndex(round) && isIndex(frame) && isQuantisedTime(t)
    && isIndex(move) && move < alphabet.length
    && COMMIT_REASONS.includes(reason)
    && typeof nonce === 'string' && NONCE_PATTERN.test(nonce)
    && typeof prev === 'string' && HASH_PATTERN.test(prev)
    && typeof hash === 'string' && HASH_PATTERN.test(hash);
  if (!wellFormed) return { ...VERIFICATION_FAILED };
  const canonical = buildPayload({ sessionId, seq, round, prev, t, frame, moveName: alphabet[move], reason, nonce });
  const recomputed = sha256Hex(canonical);
  const hashOk = recomputed === hash && payload === canonical && short === shortOf(hash);
  const chainOk = prev === prevHash;
  return { ok: hashOk && chainOk, hashOk, chainOk, recomputed };
}

/**
 * Stateless audit of an exported log (`log.export()`, possibly after a JSON round trip): the genesis
 * matches the session id, sequence numbers are gap-free, every commit chains to its predecessor, and
 * every opened commit re-hashes to its published hash. Commits of unrevealed rounds can only be checked
 * for linkage - `sealed` says how many of those there are, so that `ok` is never read as "everything
 * was opened".
 * @param {ExportedLog} doc
 * @returns {{ ok: boolean, brokenAt: number|null, opened: number, sealed: number }}
 *   `brokenAt`: index of the first failing commit, -1 if the document header itself is invalid, `null`
 *   when `ok`.
 */
export function verifyExport(doc) {
  const headerOk = doc !== null && typeof doc === 'object' && isSessionId(doc.sessionId) && isAlphabet(doc.alphabet)
    && Array.isArray(doc.commits) && doc.genesis === genesisHash(doc.sessionId);
  if (!headerOk) return { ok: false, brokenAt: -1, opened: 0, sealed: 0 };
  let prev = doc.genesis;
  let opened = 0;
  let sealed = 0;
  for (let i = 0; i < doc.commits.length; i++) {
    const entry = doc.commits[i];
    const linked = entry !== null && typeof entry === 'object' && entry.seq === i && entry.prev === prev
      && typeof entry.hash === 'string' && HASH_PATTERN.test(entry.hash) && entry.short === shortOf(entry.hash);
    const consistent = linked && (entry.revealed === true
      ? verifyRevealed(/** @type {RevealedCommit} */ (entry), prev, doc.sessionId, doc.alphabet).ok
      : entry.revealed === false);
    if (!consistent) return { ok: false, brokenAt: i, opened, sealed };
    if (entry.revealed) opened++;
    else sealed++;
    prev = entry.hash;
  }
  return { ok: doc.head === prev, brokenAt: doc.head === prev ? null : doc.commits.length, opened, sealed };
}

/**
 * JSON replacer that keeps numeric typed arrays as plain arrays (JSON would turn them into objects
 * keyed by index).
 * @param {string} _key
 * @param {unknown} value
 * @returns {unknown}
 */
const typedArraysAsArrays = (_key, value) => (ArrayBuffer.isView(value) && !(value instanceof DataView) ? Array.from(/** @type {any} */ (value)) : value);

/**
 * Detached, JSON-clean copy of the caller's annotations, taken at commit time so that later changes to
 * the caller's object cannot rewrite the audit record. `undefined` (nothing given) becomes `null`.
 * @param {unknown} meta
 * @returns {unknown}
 * @throws {TypeError} if `meta` cannot be serialised (cyclic structure, BigInt)
 */
function snapshotMeta(meta) {
  const text = JSON.stringify(meta, typedArraysAsArrays);
  return text === undefined ? null : JSON.parse(text);
}

/**
 * @typedef {Object} Entry
 * @property {Readonly<PublicCommit>} pub
 * @property {number} move
 * @property {string} nonce
 * @property {string} payload
 * @property {string} metaJson       the annotations as JSON text (immutable by nature)
 * @property {number|null} sealedAt  clock reading right after the seal existed; null without a clock
 */

/**
 * Create the commit log of one session.
 * @param {Object} options
 * @param {string} options.sessionId
 *   Identifies the session inside every payload. Non-empty, without "|", control characters or
 *   unpaired surrogates.
 * @param {(nBytes: number) => string} [options.randomBytesHex]
 *   Nonce source: must return `2·nBytes` lower-case hex characters. Defaults to the platform CSPRNG
 *   (`rng.js`); inject a deterministic one only in tests.
 * @param {() => number} [options.now]
 *   Clock in ms (the engine's monotonic clock). Supplies `t` when a commit does not pass one, and the
 *   `sealedAt` / `revealedAt` stamps of the export. Without it those stamps are `null`.
 * @param {readonly string[]} [options.alphabet]
 *   Move names by index; a move is always passed and returned as its index. Defaults to `MOVES`
 *   (so `move` is 0 | 1 | 2). Other games reuse the log by supplying their own alphabet (e.g. the 32
 *   five-finger patterns of §4.16). Names must match /^[A-Z0-9_]+$/ and be distinct.
 * @returns {Readonly<CommitLog>}
 * @throws {RangeError} if `sessionId` or `alphabet` is invalid
 * @throws {TypeError} if `randomBytesHex` or `now` is given but is not a function
 */
export function createCommitLog({ sessionId, randomBytesHex = cryptoRandomBytesHex, now, alphabet = MOVES }) {
  if (typeof randomBytesHex !== 'function') throw new TypeError('createCommitLog: randomBytesHex must be a function');
  if (now !== undefined && typeof now !== 'function') throw new TypeError('createCommitLog: now must be a function');
  if (!isAlphabet(alphabet)) throw new RangeError('createCommitLog: alphabet must be a non-empty list of distinct names matching /^[A-Z0-9_]+$/');
  const names = Object.freeze([...alphabet]);
  const genesis = genesisHash(sessionId);

  /** @type {Entry[]} append-only; every element is frozen */
  const entries = [];
  /** @type {Map<number, number[]>} round -> seqs of its commits, ascending */
  const seqsByRound = new Map();
  /** @type {Map<number, number|null>} revealed (closed) rounds -> clock reading at reveal */
  const revealedAt = new Map();
  /** Number of leading entries that `verifyChain()` has already re-verified; they are frozen, so the result stands. */
  let verifiedCount = 0;

  /** @returns {number|null} */
  const readClock = () => {
    if (now === undefined) return null;
    const reading = now();
    return typeof reading === 'number' && Number.isFinite(reading) ? reading : null;
  };

  const head = () => (entries.length === 0 ? genesis : entries[entries.length - 1].pub.hash);

  /**
   * @param {unknown} round
   * @param {string} where
   * @returns {number}
   */
  const requireRound = (round, where) => {
    if (!isIndex(round)) throw new RangeError(`${where}: round must be an integer >= 0, got ${String(round)}`);
    return round;
  };

  /**
   * @param {Entry} entry
   * @returns {RevealedCommit}
   */
  const opened = (entry) => ({ ...entry.pub, move: entry.move, nonce: entry.nonce, payload: entry.payload });

  /** @returns {string} */
  const drawNonce = () => {
    const nonce = randomBytesHex(DEFAULTS.nonceBytes);
    if (typeof nonce !== 'string' || !NONCE_PATTERN.test(nonce)) {
      throw new Error(`commit: the nonce source must return ${2 * DEFAULTS.nonceBytes} lower-case hex characters`);
    }
    return nonce;
  };

  /**
   * @param {CommitInput} input
   * @returns {PublicCommit}
   */
  const commit = ({ round, move, reason, frame, t, meta }) => {
    requireRound(round, 'commit');
    if (!isIndex(move) || move >= names.length) {
      throw new RangeError(`commit: move must be an integer index into [${names.join(', ')}], got ${typeof move === 'number' ? move : typeof move}`);
    }
    if (!COMMIT_REASONS.includes(reason)) throw new RangeError(`commit: reason must be one of ${COMMIT_REASONS.join(', ')}, got ${String(reason)}`);
    if (!isIndex(frame)) throw new RangeError(`commit: frame must be an integer >= 0, got ${String(frame)}`);
    const time = t === undefined ? readClock() : t;
    if (typeof time !== 'number' || !Number.isFinite(time) || Math.abs(time * TIME_SCALE) >= MAX_SCALED_TIME) {
      throw new RangeError(`commit: t must be a finite time in ms (or omit it and inject a clock), got ${String(time)}`);
    }
    if (revealedAt.has(round)) throw new Error(`commit: round ${round} has been revealed and is closed`);
    const metaJson = JSON.stringify(snapshotMeta(meta));
    const nonce = drawNonce();

    const seq = entries.length;
    const prev = head();
    const tSealed = quantiseTime(time);
    const payload = buildPayload({ sessionId, seq, round, prev, t: tSealed, frame, moveName: names[move], reason, nonce });
    const hash = sha256Hex(payload);
    /** @type {Readonly<PublicCommit>} */
    const pub = Object.freeze({ seq, round, hash, short: shortOf(hash), prev, t: tSealed, frame, reason });
    entries.push(Object.freeze({ pub, move, nonce, payload, metaJson, sealedAt: readClock() }));
    const seqs = seqsByRound.get(round);
    if (seqs) seqs.push(seq);
    else seqsByRound.set(round, [seq]);
    return { ...pub };
  };

  /**
   * @param {number} round
   * @returns {RevealedCommit[]}
   */
  const reveal = (round) => {
    requireRound(round, 'reveal');
    const seqs = seqsByRound.get(round);
    if (!seqs) return [];
    if (!revealedAt.has(round)) revealedAt.set(round, readClock());
    return seqs.map((seq) => opened(entries[seq]));
  };

  /**
   * @param {number} round
   * @returns {unknown[]}
   */
  const metaOf = (round) => {
    requireRound(round, 'metaOf');
    if (!revealedAt.has(round)) throw new Error(`metaOf: round ${round} has not been revealed`);
    return (seqsByRound.get(round) ?? []).map((seq) => JSON.parse(entries[seq].metaJson));
  };

  /**
   * @param {RevealedCommit} revealed
   * @param {string} [prevHash]
   * @returns {Verification}
   */
  const verify = (revealed, prevHash) => {
    const seq = revealed !== null && typeof revealed === 'object' ? revealed.seq : undefined;
    const published = isIndex(seq) ? entries[seq] : undefined;
    if (published === undefined) return { ...VERIFICATION_FAILED };
    const expectedPrev = prevHash !== undefined ? prevHash : published.pub.prev;
    const check = verifyRevealed(revealed, expectedPrev, sessionId, names);
    // Self-consistency is not binding: a forged move with a freshly computed hash is self-consistent
    // too. Only the hash that was handed out at commit time ties the reveal to the commitment.
    const hashOk = check.hashOk && revealed.hash === published.pub.hash;
    return { ok: hashOk && check.chainOk, hashOk, chainOk: check.chainOk, recomputed: check.recomputed };
  };

  /**
   * @param {RevealedCommit[]} [commits]
   * @returns {ChainVerification}
   */
  const verifyChain = (commits) => {
    if (commits === undefined) {
      for (let i = verifiedCount; i < entries.length; i++) {
        const expectedPrev = i === 0 ? genesis : entries[i - 1].pub.hash;
        const candidate = opened(entries[i]);
        if (candidate.seq !== i || !verify(candidate, expectedPrev).ok) return { ok: false, brokenAt: i };
        verifiedCount = i + 1;
      }
      return { ok: true, brokenAt: null };
    }
    if (!Array.isArray(commits)) return { ok: false, brokenAt: 0 };
    for (let i = 0; i < commits.length; i++) {
      const candidate = commits[i];
      const inSequence = i === 0 || (candidate !== null && typeof candidate === 'object' && candidate.seq === commits[i - 1].seq + 1);
      // The first commit is checked against this log's own record of its predecessor, the others
      // against the commit that precedes them in the list.
      if (!inSequence || !verify(candidate, i === 0 ? undefined : commits[i - 1].hash).ok) return { ok: false, brokenAt: i };
    }
    return { ok: true, brokenAt: null };
  };

  /** @returns {ExportedLog} */
  const exportLog = () => ({
    schema: SCHEMA_VERSION,
    format: `${DEFAULTS.domain}/commit-log`,
    sessionId,
    genesis,
    alphabet: [...names],
    head: head(),
    commits: entries.map((entry) => {
      if (!revealedAt.has(entry.pub.round)) return { ...entry.pub, revealed: false, sealedAt: entry.sealedAt };
      return {
        ...opened(entry),
        revealed: true,
        meta: JSON.parse(entry.metaJson),
        sealedAt: entry.sealedAt,
        revealedAt: revealedAt.get(entry.pub.round) ?? null,
      };
    }),
  });

  return Object.freeze({
    genesis,
    commit,
    reveal,
    verify,
    verifyChain,
    export: exportLog,
    metaOf,
    head,
    size: () => entries.length,
    isRevealed: (round) => revealedAt.has(round),
    sealedRounds: () => [...seqsByRound.keys()].filter((round) => !revealedAt.has(round)).sort((a, b) => a - b),
    lastRound: () => { let m = -1; for (const round of seqsByRound.keys()) if (round > m) m = round; return m; },
  });
}
