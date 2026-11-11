// @ts-check
/**
 * Shared conventions of beaTTer v4 (spec §3 and the rule presets of §4.12).
 *
 * This file holds ONLY what several modules must agree on: the move encoding and payoff, the MediaPipe
 * landmark layout, the referee rule presets and the persisted schema version. Every tunable number of a
 * module lives in that module's own frozen `DEFAULTS`, so parallel work never meets in this file.
 *
 * The typedefs below are the shared vocabulary; other modules import them through JSDoc, e.g.
 * `@typedef {import('./constants.js').HandFrame} HandFrame`.
 */

/** Version stamp of every document v4 persists or exports (player model, commit log, results). */
export const SCHEMA_VERSION = 4;

// ------------------------------------------------------------------------------------------------
// Moves and payoff
// ------------------------------------------------------------------------------------------------

/**
 * A throw, encoded so that `(m + 1) % 3` is the throw that beats `m`.
 * @typedef {0|1|2} Move
 */

/** @typedef {'ROCK'|'PAPER'|'SCISSORS'} MoveName */

export const ROCK = 0;
export const PAPER = 1;
export const SCISSORS = 2;

/**
 * Move names indexed by {@link Move}; these exact strings are also what the sealed commit payload contains.
 * @type {readonly MoveName[]}
 */
export const MOVES = Object.freeze(/** @type {MoveName[]} */ (['ROCK', 'PAPER', 'SCISSORS']));

/**
 * True for the three legal move codes only (rejects 3, -1, 1.5, '0', null, NaN ...).
 * @param {unknown} m
 * @returns {m is Move}
 */
export const isMove = (m) => m === ROCK || m === PAPER || m === SCISSORS;

/**
 * Guard shared by the payoff helpers: an out-of-range move would otherwise wrap around silently
 * (`beats(3) === 1`) or turn into NaN, and a wrong verdict is worse than a loud failure.
 * @param {unknown} m
 * @param {string} where
 * @returns {Move}
 */
function assertMove(m, where) {
  if (!isMove(m)) throw new RangeError(`${where}: expected a move (0, 1 or 2), got ${String(m)}`);
  return m;
}

/**
 * The move that beats `m` (ROCK -> PAPER -> SCISSORS -> ROCK).
 * @param {Move} m
 * @returns {Move}
 * @throws {RangeError} if `m` is not a move
 */
export const beats = (m) => /** @type {Move} */ ((assertMove(m, 'beats') + 1) % 3);

/**
 * The move that `m` beats.
 * @param {Move} m
 * @returns {Move}
 * @throws {RangeError} if `m` is not a move
 */
export const losesTo = (m) => /** @type {Move} */ ((assertMove(m, 'losesTo') + 2) % 3);

/**
 * Round payoff from the AI's point of view: +1 the AI wins, 0 tie, -1 the AI loses.
 * @param {Move} ai
 * @param {Move} pl
 * @returns {-1|0|1}
 * @throws {RangeError} if either argument is not a move
 */
export const payoff = (ai, pl) => {
  assertMove(ai, 'payoff(ai)');
  if (ai === assertMove(pl, 'payoff(pl)')) return 0;
  return ai === beats(pl) ? 1 : -1;
};

// ------------------------------------------------------------------------------------------------
// Hand landmarks (MediaPipe Hands layout)
// ------------------------------------------------------------------------------------------------

/** Number of landmarks in one hand. */
export const LANDMARK_COUNT = 21;

/** Index of the wrist landmark. */
export const WRIST = 0;

/**
 * Landmark indices by anatomical name. The thumb chain is CMC, MCP, IP, TIP; every other finger is
 * MCP, PIP, DIP, TIP.
 */
export const LANDMARK = Object.freeze({
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
});

/** @typedef {'thumb'|'index'|'middle'|'ring'|'pinky'} FingerName */

/**
 * Canonical finger order of every per-finger array in the code base (`e[5]`, `theta[5]`,
 * `thetaFist[5]` ...): position `i` of such an array belongs to `FINGER_NAMES[i]`.
 * @type {readonly FingerName[]}
 */
export const FINGER_NAMES = Object.freeze(/** @type {FingerName[]} */ (['thumb', 'index', 'middle', 'ring', 'pinky']));

/**
 * The four landmarks of each finger, proximal to distal (the joint chain used for flexion angles).
 * @type {Readonly<Record<FingerName, readonly number[]>>}
 */
export const FINGERS = Object.freeze({
  thumb: Object.freeze([1, 2, 3, 4]),
  index: Object.freeze([5, 6, 7, 8]),
  middle: Object.freeze([9, 10, 11, 12]),
  ring: Object.freeze([13, 14, 15, 16]),
  pinky: Object.freeze([17, 18, 19, 20]),
});

/**
 * Finger groups of the opening detectors as positions in {@link FINGER_NAMES} order:
 * `front` = index + middle (they open for PAPER and SCISSORS), `back` = ring + pinky (PAPER only).
 */
export const FINGER_GROUPS = Object.freeze({
  front: Object.freeze([1, 2]),
  back: Object.freeze([3, 4]),
});

/** Landmarks whose mean is the palm centre (wrist and the four finger MCP joints, spec §4.6). */
export const PALM_LANDMARKS = Object.freeze([0, 5, 9, 13, 17]);

// ------------------------------------------------------------------------------------------------
// Referee rule presets (spec §4.12)
// ------------------------------------------------------------------------------------------------

/**
 * One referee preset.
 * @typedef {Object} RulePreset
 * @property {number} epsF          Decisiveness threshold on the front (index/middle) in-air heading, a
 *                                  probability in (0, 0.5]: the group counts as closed below `epsF` and as
 *                                  open from `1 - epsF` on. 0.5 leaves no ambiguous zone: every heading is
 *                                  one or the other.
 * @property {number} epsB          Same threshold for the back (ring/pinky) heading.
 * @property {number} lossAversion  Weight mu of a loss in the risk-sensitive utility (+1 win, 0 tie, -mu loss).
 * @property {boolean} noLoss       true: no-loss policy - play a move that cannot lose to any throw the
 *                                  referee would still accept (decided on the referee's legal set, not on
 *                                  the AI's belief); among such moves maximise P(win). See decision.js.
 */

/** @typedef {'serbest'|'standart'|'turnuva'} RuleName */

/**
 * Rule presets, keyed by the names the UI shows ("Hakem"). In `turnuva` the front heading is always
 * decisive (epsF = 0.5), so at most two throws are ever legal and a move that cannot lose always exists;
 * together with `noLoss` this makes the AI unbeatable on every VALID round by rule (thesis, Theorem 1).
 * The price is paid elsewhere: a throw the in-air frames do not support is a foul or a void, not a
 * round. `serbest` and `standart` keep an ambiguous zone in which the human can legitimately win.
 * @type {Readonly<Record<RuleName, Readonly<RulePreset>>>}
 */
export const RULES = Object.freeze({
  serbest: Object.freeze({ epsF: 0.03, epsB: 0.03, lossAversion: 2, noLoss: false }),
  standart: Object.freeze({ epsF: 0.15, epsB: 0.10, lossAversion: 3, noLoss: false }),
  turnuva: Object.freeze({ epsF: 0.50, epsB: 0.15, lossAversion: 3, noLoss: true }),
});

/** Preset names in display order (most permissive first). */
export const RULE_NAMES = Object.freeze(/** @type {RuleName[]} */ (['serbest', 'standart', 'turnuva']));

/**
 * Preset active on first start.
 * @type {RuleName}
 */
export const DEFAULT_RULE = 'turnuva';

// ------------------------------------------------------------------------------------------------
// Shared data shapes (types only)
// ------------------------------------------------------------------------------------------------

/**
 * @typedef {Object} Vec3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * MediaPipe's canned gesture mapped onto the game alphabet.
 * @typedef {Object} NeuralGesture
 * @property {MoveName|'NONE'} label
 * @property {number} score   Classifier score in [0, 1].
 */

/**
 * One processed camera frame. When `present` is false there is no hand and `image`/`world` are null.
 * @typedef {Object} HandFrame
 * @property {number} t                        Capture time, ms, on the single monotonic clock.
 * @property {number} index                    0, 1, 2 ... strictly increasing, one per processed frame.
 * @property {boolean} present                 false => no hand in this frame.
 * @property {Vec3[]|null} image               21 landmarks; x and y normalised to [0, 1] by image width
 *                                             and height (y grows downward).
 * @property {Vec3[]|null} world               21 landmarks in metres, hand-centred (worldLandmarks).
 * @property {number} aspect                   Image width / height.
 * @property {'Left'|'Right'|null} handedness
 * @property {NeuralGesture|null} neural
 */

/**
 * Why a commitment was made: the pre-movement behavioural commit, the first kinematic revision of a
 * round, any later revision, or a forced commit at a decision deadline.
 * @typedef {'BEHAVIOUR'|'KINEMATIC'|'REVISION'|'DEADLINE'} CommitReason
 */

/**
 * The part of a commitment that is published the moment it is made (honesty invariant I2). It contains
 * neither the move nor the nonce.
 * @typedef {Object} PublicCommit
 * @property {number} seq           Global position in the session's hash chain: 0, 1, 2 ...
 * @property {number} round         Round the commitment belongs to.
 * @property {string} hash          SHA-256 of the sealed payload, 64 lower-case hex characters.
 * @property {string} short         `hash.slice(0, 8).toUpperCase()`, the seal code shown to the player.
 * @property {string} prev          Hash of commit `seq - 1`, or the log's genesis hash for `seq` 0.
 * @property {number} t             Capture time (ms) of the frame the commitment was computed from,
 *                                  rounded to 0.1 ms exactly as it is written into the payload.
 * @property {number} frame         Index of that frame.
 * @property {CommitReason} reason
 */

/**
 * A commitment after reveal: the public part plus everything needed to recompute the hash.
 * @typedef {PublicCommit & { move: number, nonce: string, payload: string }} RevealedCommit
 * `move` is the committed {@link Move} (generally: the index into the log's move alphabet), `nonce` is
 * 16 CSPRNG bytes as 32 lower-case hex characters, `payload` is the exact string that was hashed.
 */
