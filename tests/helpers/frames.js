// @ts-check
// Test helper: hand-made HandFrames. Unlike sim/kinematic_player.js nothing here follows the detector's
// own generative assumptions - the palm height, the finger extensions and the tracking gaps are given
// as plain functions of time, so a test can stage exactly the situation it is about.

import { minJerk } from '../../web/js/core/math.js';
import { palmSize } from '../../web/js/core/kinematics.js';
import { handLandmarks, rotationFromEuler } from '../../web/js/sim/hand_model.js';
import { makeRng } from '../../web/js/core/rng.js';
import { createCommitLog } from '../../web/js/core/commit.js';
import { createPlayerModel } from '../../web/js/core/player_model.js';
import { createRoundEngine } from '../../web/js/core/round_engine.js';

const ASPECT = 4 / 3, PALM = 0.19;
const POSE = rotationFromEuler(160, 25, 8);
const probe = handLandmarks({ e: [0.1, 0, 0, 0, 0], R: POSE, unitsPerMetre: 1, aspect: ASPECT });
const UPM = PALM / palmSize(probe.image, ASPECT);

/** A resting fist (thumb, index, middle, ring, pinky). */
export const FIST = Object.freeze([0.14, 0.03, 0.03, 0.03, 0.03]);

/**
 * @param {Object} o
 * @param {{next():number, normal(m?:number,s?:number):number}} o.rng
 * @param {number} [o.fps] @param {number} [o.t0] @param {number} o.tEnd
 * @param {(t:number) => number} o.yPL        palm height below the top position (palm lengths)
 * @param {(t:number) => number[]} o.ext      five finger extensions
 * @param {(t:number) => boolean} [o.lost]    true = the tracker reports no hand on this frame
 * @param {number} [o.imageSd] @param {number} [o.worldSd] @param {number} [o.frameIndex] @param {number} [o.jitter]
 * @returns {import('../../web/js/core/constants.js').HandFrame[]}
 */
export function genFrames({ rng, fps = 30, t0 = 1000, tEnd, yPL, ext, lost = () => false, imageSd = 0.003, worldSd = 0.002, frameIndex = 0, jitter = 2 }) {
  /** @type {any[]} */ const frames = [];
  const dt = 1000 / fps;
  let index = frameIndex, lastT = -Infinity;
  for (let k = 0, t = t0; t <= tEnd; k++, t = t0 + k * dt) {
    let tc = t + (rng.next() * 2 - 1) * jitter;
    if (tc <= lastT) tc = lastT + 0.5;
    lastT = tc;
    if (lost(tc)) { frames.push({ t: tc, index: index++, present: false, image: null, world: null, aspect: ASPECT, handedness: null, neural: null }); continue; }
    const e = ext(tc);
    const lm = handLandmarks({ e, R: POSE, palmAt: { x: 0.66, y: 0.36 + yPL(tc) * PALM }, unitsPerMetre: UPM, aspect: ASPECT, noise: { worldSd, imageSd }, rng });
    const front = (e[1] + e[2]) / 2, back = (e[3] + e[4]) / 2;
    let label = 'NONE';
    if (front > 0.8 && back > 0.8) label = 'PAPER'; else if (front > 0.8 && back < 0.3) label = 'SCISSORS'; else if (front < 0.2 && back < 0.2) label = 'ROCK';
    frames.push({ t: tc, index: index++, present: true, image: lm.image, world: lm.world, aspect: ASPECT, handedness: 'Right', neural: { label, score: label === 'NONE' ? 0 : 0.8 } });
  }
  return frames;
}

/**
 * Vertical plan: `beats` minimum-jerk down-strokes (the last one is the throw) joined by up-swings.
 * @param {{t0?:number, leadIn?:number, beats?:number, period?:number, descent?:number, amp?:number, throwAmp?:number|null}} [o]
 */
export function strokePlan({ t0 = 1000, leadIn = 450, beats = 4, period = 520, descent = 198, amp = 1.6, throwAmp = null } = {}) {
  /** @type {number[][]} */ const segs = [];
  /** @type {number[]} */ const bottoms = [];
  let t = t0 + leadIn;
  for (let k = 0; k < beats; k++) {
    const a = k === beats - 1 && throwAmp !== null ? throwAmp : amp;
    segs.push([t, t + descent, 0, a]); t += descent; bottoms.push(t);
    if (k < beats - 1) { segs.push([t, t + (period - descent), a, 0]); t += period - descent; }
  }
  const yPL = (/** @type {number} */ tt) => {
    let v = 0;
    for (const [a, b, y0, y1] of segs) { if (tt >= b) v = y1; else if (tt >= a) { v = y0 + (y1 - y0) * minJerk((tt - a) / (b - a)); break; } else break; }
    return v;
  };
  return { yPL, bottoms, tLanding: bottoms[beats - 1], tThrowStart: bottoms[beats - 1] - descent };
}

/**
 * Finger plan: chained minimum-jerk segments per finger, segs[f] = [{t0, dur, to}].
 * @param {readonly number[]} base @param {{t0:number, dur:number, to:number}[][]} segs
 */
export function fingerPlan(base, segs) {
  return (/** @type {number} */ t) => base.map((b, f) => { let v = b; for (const s of segs[f] ?? []) { if (t < s.t0) break; v = v + (s.to - v) * minJerk((t - s.t0) / s.dur); } return v; });
}

/** A frame without a hand. @param {number} t @param {number} index */
export const absent = (t, index) => /** @type {any} */ ({ t, index, present: false, image: null, world: null, aspect: ASPECT, handedness: null, neural: null });

/**
 * An engine on a fresh commit log with deterministic nonces.
 * @param {number} seed @param {object} [cfg] @param {ReturnType<typeof createPlayerModel>} [player]
 */
export function freshEngine(seed, cfg = {}, player = createPlayerModel()) {
  const nonce = makeRng(seed + 1000);
  const hex = (/** @type {number} */ n) => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(nonce.next() * 256).toString(16).padStart(2, '0'); return s; };
  const commitLog = createCommitLog({ sessionId: `t-${seed}`, randomBytesHex: hex });
  const engine = createRoundEngine({ player, commitLog, rng: makeRng(seed), cfg });
  return { engine, player, commitLog };
}

/** Feed frames; returns all events. @param {any} engine @param {any[]} frames */
export function feed(engine, frames) {
  /** @type {any[]} */ const events = [];
  for (const f of frames) for (const e of engine.pushFrame(f)) events.push(e);
  return events;
}
