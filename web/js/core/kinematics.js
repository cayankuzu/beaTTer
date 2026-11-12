// @ts-check
/**
 * beaTTer v4 — hand kinematics (pure).
 *
 * Turns 21 hand landmarks into features that are invariant to rigid rotation, translation, uniform scale
 * and mirroring (left/right hand): every finger feature is built from bone-to-bone angles, which are
 * intrinsic to the hand. Only the palm centre / palm size (used for the rhythm) live in image space.
 *
 * Landmark convention: MediaPipe Hands [Zhang2020] — 0 wrist; per finger MCP, PIP, DIP, TIP
 * (thumb: CMC, MCP, IP, TIP).
 */

import { FINGER_NAMES, FINGERS, PALM_LANDMARKS, WRIST } from './constants.js';

/** @typedef {import('./constants.js').Vec3} Vec3 */
/** @typedef {import('./constants.js').HandFrame} HandFrame */

/**
 * @typedef {Object} Calibration
 * @property {number[]} thetaFist  total flexion (deg) of a fist, per finger (thumb..pinky)
 * @property {number[]} thetaOpen  total flexion (deg) of a fully extended finger, per finger
 */

/**
 * @typedef {Object} KinSample
 * @property {number} t        capture time (ms)
 * @property {number} index    frame index
 * @property {number[]} e      extension per finger, 0 = fist, 1 = fully open (thumb..pinky)
 * @property {number[]} theta  total flexion per finger in degrees
 * @property {number} front    mean extension of index + middle
 * @property {number} back     mean extension of ring + pinky
 * @property {number} vSpread  angle between index and middle fingers (deg)
 * @property {number} cx       palm centre x in image-height units (x * aspect)
 * @property {number} cy       palm centre y in image-height units (grows downward)
 * @property {number} palm     palm size (wrist to middle MCP) in image-height units
 * @property {import('./constants.js').NeuralGesture|null} neural
 */

export const DEFAULTS = Object.freeze({
  /**
   * Default total flexion (deg) of a fist per finger (thumb..pinky). Anatomical active ranges are about
   * 86 (MCP) + 96 (PIP) + 83 (DIP) = 265 deg for the long fingers [BK2024]; a relaxed game fist as seen
   * by a landmark model is less curled, hence ~215. Real hands are re-referenced every round by the fist
   * baseline and adapted per player, so these are starting points, not measurements.
   */
  thetaFist: Object.freeze([95, 215, 220, 215, 205]),
  /** Default total flexion (deg) of an extended finger (residual curvature of a relaxed open hand). */
  thetaOpen: Object.freeze([20, 25, 22, 25, 28]),
  /** Extension is clamped softly so Gaussian models still see overshoot (dimensionless). */
  extensionMin: -0.25,
  extensionMax: 1.25,
  /** Smallest allowed denominator when re-referencing to the fist baseline (dimensionless). */
  minBaselineSpan: 0.25,
});

const DEG = 180 / Math.PI;

/** @param {any} p */
const isPoint = (p) => p != null && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

/** @param {any} pts @returns {pts is Vec3[]} */
export function isLandmarkSet(pts) {
  if (!Array.isArray(pts) || pts.length < 21) return false;
  for (let i = 0; i < 21; i++) if (!isPoint(pts[i])) return false;
  return true;
}

/**
 * Angle (deg, 0..180) between the bones a->b and b->c, i.e. the flexion at joint b; 0 = straight.
 * atan2 form: accurate near 0 and scale-free.
 * @param {Vec3} a @param {Vec3} b @param {Vec3} c
 */
function bend(a, b, c) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - b.x, vy = c.y - b.y, vz = c.z - b.z;
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  const sine = Math.hypot(cx, cy, cz);
  const cosine = ux * vx + uy * vy + uz * vz;
  if (sine === 0 && cosine === 0) return 0;
  return Math.atan2(sine, cosine) * DEG;
}

/**
 * Joint flexion angles of all five fingers.
 * Long fingers: mcp = angle(wrist->MCP, MCP->PIP), pip, dip; thumb: mcp = angle at landmark 2, ip at 3.
 * @param {Vec3[]} world 21 landmarks (any consistent 3-D frame)
 * @returns {{thumb:{mcp:number,ip:number,total:number}, index:{mcp:number,pip:number,dip:number,total:number},
 *            middle:{mcp:number,pip:number,dip:number,total:number}, ring:{mcp:number,pip:number,dip:number,total:number},
 *            pinky:{mcp:number,pip:number,dip:number,total:number}} | null} null for malformed input
 */
export function fingerFlexion(world) {
  if (!isLandmarkSet(world)) return null;
  const w = world[WRIST];
  /** @param {readonly number[]} j */
  const long = (j) => {
    const mcp = bend(w, world[j[0]], world[j[1]]);
    const pip = bend(world[j[0]], world[j[1]], world[j[2]]);
    const dip = bend(world[j[1]], world[j[2]], world[j[3]]);
    return { mcp, pip, dip, total: mcp + pip + dip };
  };
  const t = FINGERS.thumb;
  const tMcp = bend(world[t[0]], world[t[1]], world[t[2]]);
  const tIp = bend(world[t[1]], world[t[2]], world[t[3]]);
  return {
    thumb: { mcp: tMcp, ip: tIp, total: tMcp + tIp },
    index: long(FINGERS.index),
    middle: long(FINGERS.middle),
    ring: long(FINGERS.ring),
    pinky: long(FINGERS.pinky),
  };
}

/** @returns {Calibration} a fresh copy of the default calibration */
export function defaultCalibration() {
  return { thetaFist: [...DEFAULTS.thetaFist], thetaOpen: [...DEFAULTS.thetaOpen] };
}

/**
 * Extension per finger: e = (thetaFist - total) / (thetaFist - thetaOpen), soft-clamped.
 * @param {NonNullable<ReturnType<typeof fingerFlexion>>} flexion
 * @param {Calibration} calib
 * @returns {number[]} thumb..pinky
 */
export function extension(flexion, calib) {
  const out = new Array(5);
  for (let i = 0; i < 5; i++) {
    const total = flexion[FINGER_NAMES[i]].total;
    const span = calib.thetaFist[i] - calib.thetaOpen[i];
    const e = span > 1 ? (calib.thetaFist[i] - total) / span : 0;
    out[i] = Math.min(DEFAULTS.extensionMax, Math.max(DEFAULTS.extensionMin, e));
  }
  return out;
}

/**
 * Angle between the index and the middle finger (MCP->TIP directions), degrees.
 * @param {Vec3[]} world
 * @returns {number} 0 for malformed input
 */
export function vSpreadDeg(world) {
  if (!isLandmarkSet(world)) return 0;
  const i = FINGERS.index, m = FINGERS.middle;
  const a = world[i[0]], b = world[i[3]], c = world[m[0]], d = world[m[3]];
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = d.x - c.x, vy = d.y - c.y, vz = d.z - c.z;
  const sine = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  const cosine = ux * vx + uy * vy + uz * vz;
  if (sine === 0 && cosine === 0) return 0;
  return Math.atan2(sine, cosine) * DEG;
}

/**
 * Palm centre in aspect-corrected image coordinates (units of image height).
 * @param {Vec3[]} image @param {number} aspect width / height
 * @returns {{x:number, y:number}}
 */
export function palmCenter(image, aspect) {
  let x = 0, y = 0;
  for (const k of PALM_LANDMARKS) { x += image[k].x; y += image[k].y; }
  return { x: (x / PALM_LANDMARKS.length) * aspect, y: y / PALM_LANDMARKS.length };
}

/**
 * Palm size: the larger of wrist-to-middle-MCP and 1.45 x index-to-pinky-MCP in aspect-corrected image
 * coordinates (units of image height). Because the longitudinal palm axis (0->9) and the transverse
 * knuckle bridge (5->17) are orthogonal in 3-D, they cannot both foreshorten at the same time from any
 * camera viewing angle.
 * @param {Vec3[]} image @param {number} aspect
 */
export function palmSize(image, aspect) {
  const w = image[WRIST], m = image[FINGERS.middle[0]];
  const len = Math.hypot((m.x - w.x) * aspect, m.y - w.y);
  const i = image[FINGERS.index[0]], p = image[FINGERS.pinky[0]];
  const span = Math.hypot((p.x - i.x) * aspect, p.y - i.y);
  return Math.max(len, 1.45 * span);
}

/**
 * Opening relative to the fist baseline of the current round: u = (e - base) / (1 - base).
 * @param {number[]} e @param {number[]} base
 * @returns {number[]}
 */
export function openingFromBaseline(e, base) {
  const u = new Array(e.length);
  for (let i = 0; i < e.length; i++) {
    const span = Math.max(DEFAULTS.minBaselineSpan, 1 - base[i]);
    u[i] = (e[i] - base[i]) / span;
  }
  return u;
}

/**
 * All per-frame features, or null when there is no usable hand in the frame.
 * @param {HandFrame} frame
 * @param {Calibration} calib
 * @returns {KinSample|null}
 */
export function frameFeatures(frame, calib) {
  if (!frame || frame.present !== true || !isLandmarkSet(frame.world) || !isLandmarkSet(frame.image)) return null;
  if (!Number.isFinite(frame.t)) return null;
  const aspect = Number.isFinite(frame.aspect) && frame.aspect > 0 ? frame.aspect : 4 / 3;
  const flex = fingerFlexion(/** @type {Vec3[]} */ (frame.world));
  if (!flex) return null;
  const e = extension(flex, calib);
  const c = palmCenter(/** @type {Vec3[]} */ (frame.image), aspect);
  const palm = palmSize(/** @type {Vec3[]} */ (frame.image), aspect);
  if (!(palm > 0) || !Number.isFinite(c.x) || !Number.isFinite(c.y)) return null;
  return {
    t: frame.t,
    index: frame.index,
    e,
    theta: FINGER_NAMES.map((n) => flex[n].total),
    front: (e[1] + e[2]) / 2,
    back: (e[3] + e[4]) / 2,
    vSpread: vSpreadDeg(/** @type {Vec3[]} */ (frame.world)),
    cx: c.x,
    cy: c.y,
    palm,
    neural: frame.neural ?? null,
  };
}
