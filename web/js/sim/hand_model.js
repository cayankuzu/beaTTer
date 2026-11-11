// @ts-check
/**
 * beaTTer v4 — synthetic hand: forward kinematics from finger extensions to 21 landmarks (pure).
 *
 * This is the exact inverse of core/kinematics.js: a finger with extension e gets the total flexion
 * thetaOpen + (1 - e) * (thetaFist - thetaOpen), split over its joints, and every joint bends in the
 * plane spanned by the metacarpal direction and the palm normal — so `fingerFlexion()` recovers the same
 * angles for any rigid pose, scale and handedness. Segment lengths are approximate adult proportions;
 * they do not influence the angle-based features.
 *
 * Used by tests, by the simulation experiments and by the in-browser demo mode. It is a MODEL of a hand,
 * not a recording of one.
 */

import { defaultCalibration } from '../core/kinematics.js';
import { PALM_LANDMARKS } from '../core/constants.js';

/** @typedef {import('../core/constants.js').Vec3} Vec3 */

/** Hand-local frame: x towards the thumb side, y distal (towards the fingertips), z out of the palm. Metres. */
export const ANTHROPOMETRY = Object.freeze({
  /** MCP joint positions relative to the wrist (index, middle, ring, pinky). */
  mcp: Object.freeze([[0.022, 0.092, 0], [0.0, 0.095, 0], [-0.020, 0.090, 0], [-0.038, 0.080, 0]]),
  /** Proximal, middle, distal phalanx lengths per long finger. */
  phalanges: Object.freeze([[0.040, 0.025, 0.019], [0.045, 0.028, 0.020], [0.041, 0.027, 0.019], [0.033, 0.019, 0.017]]),
  /** Thumb: CMC position, base direction and segment lengths (CMC-MCP, MCP-IP, IP-TIP). */
  thumbCmc: Object.freeze([0.022, 0.025, 0.008]),
  thumbDir: Object.freeze([0.75, 0.60, 0.28]),
  thumbFlexDir: Object.freeze([-0.75, 0.10, 0.65]),
  thumbSegments: Object.freeze([0.045, 0.032, 0.026]),
  /** Share of the total flexion taken by MCP, PIP, DIP (long fingers) and by MCP, IP (thumb). */
  flexionSplit: Object.freeze([0.36, 0.40, 0.24]),
  thumbSplit: Object.freeze([0.45, 0.55]),
});

const RAD = Math.PI / 180;

/** @param {readonly number[]} v */
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** @param {number[]} a @param {number[]} b @param {number} ca @param {number} cb */
const comb = (a, b, ca, cb) => [ca * a[0] + cb * b[0], ca * a[1] + cb * b[1], ca * a[2] + cb * b[2]];
/** @param {number[]} p @param {number[]} d @param {number} l */
const step = (p, d, l) => [p[0] + l * d[0], p[1] + l * d[1], p[2] + l * d[2]];

/** Row-major 3x3 rotation from intrinsic Euler angles (degrees): R = Rz(rz) * Ry(ry) * Rx(rx). */
export function rotationFromEuler(rxDeg = 0, ryDeg = 0, rzDeg = 0) {
  const cx = Math.cos(rxDeg * RAD), sx = Math.sin(rxDeg * RAD);
  const cy = Math.cos(ryDeg * RAD), sy = Math.sin(ryDeg * RAD);
  const cz = Math.cos(rzDeg * RAD), sz = Math.sin(rzDeg * RAD);
  return [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
}

/** Uniformly random rotation (row-major 3x3) from a unit quaternion. @param {{next():number}} rng */
export function randomRotation(rng) {
  const u1 = rng.next(), u2 = rng.next() * 2 * Math.PI, u3 = rng.next() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
  const qx = a * Math.sin(u2), qy = a * Math.cos(u2), qz = b * Math.sin(u3), qw = b * Math.cos(u3);
  return [
    1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw),
    2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw),
    2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy),
  ];
}

/** Default pose: fingers pointing up in the image, tilted 20 degrees towards the camera, palm half-turned. */
export const DEFAULT_ROTATION = Object.freeze(rotationFromEuler(160, 25, 8));

/**
 * 21 landmarks in the hand-local frame (metres), wrist at the origin.
 * @param {number[]} e extension per finger (thumb..pinky), 0 = fist, 1 = open
 * @param {{thetaFist:number[], thetaOpen:number[]}} calib
 * @returns {number[][]}
 */
export function localLandmarks(e, calib) {
  const A = ANTHROPOMETRY;
  /** @type {number[][]} */
  const pts = new Array(21);
  pts[0] = [0, 0, 0];
  const total = (/** @type {number} */ i) => (calib.thetaOpen[i] + (1 - e[i]) * (calib.thetaFist[i] - calib.thetaOpen[i])) * RAD;
  const z = [0, 0, 1];
  for (let f = 0; f < 4; f++) {
    const mcp = [...A.mcp[f]];
    const m = unit(mcp); // metacarpal direction = direction of an unflexed proximal phalanx
    const th = total(f + 1);
    const a1 = th * A.flexionSplit[0], a2 = a1 + th * A.flexionSplit[1], a3 = a2 + th * A.flexionSplit[2];
    const d1 = comb(m, z, Math.cos(a1), Math.sin(a1));
    const d2 = comb(m, z, Math.cos(a2), Math.sin(a2));
    const d3 = comb(m, z, Math.cos(a3), Math.sin(a3));
    const L = A.phalanges[f];
    const base = 5 + 4 * f;
    pts[base] = mcp;
    pts[base + 1] = step(mcp, d1, L[0]);
    pts[base + 2] = step(pts[base + 1], d2, L[1]);
    pts[base + 3] = step(pts[base + 2], d3, L[2]);
  }
  // thumb: bends in the plane spanned by its base direction and a flexion direction orthogonal to it
  const t = unit(A.thumbDir);
  const rawN = A.thumbFlexDir;
  const dot = rawN[0] * t[0] + rawN[1] * t[1] + rawN[2] * t[2];
  const n = unit([rawN[0] - dot * t[0], rawN[1] - dot * t[1], rawN[2] - dot * t[2]]);
  const th = total(0);
  const b1 = th * A.thumbSplit[0], b2 = b1 + th * A.thumbSplit[1];
  pts[1] = [...A.thumbCmc];
  pts[2] = step(pts[1], t, A.thumbSegments[0]);
  pts[3] = step(pts[2], comb(t, n, Math.cos(b1), Math.sin(b1)), A.thumbSegments[1]);
  pts[4] = step(pts[3], comb(t, n, Math.cos(b2), Math.sin(b2)), A.thumbSegments[2]);
  return pts;
}

/**
 * World and image landmarks of a posed hand.
 * @param {Object} o
 * @param {number[]} o.e                       extension per finger (thumb..pinky)
 * @param {readonly number[]} [o.R]            row-major 3x3 rotation hand -> camera (x right, y down, z away)
 * @param {number} [o.scale]                   uniform hand scale (1 = adult)
 * @param {'Left'|'Right'} [o.handed]          'Left' mirrors the hand
 * @param {{thetaFist:number[], thetaOpen:number[]}} [o.calib]
 * @param {{x:number, y:number}} [o.palmAt]    palm-centre position in image-height units (x already times aspect)
 * @param {number} [o.unitsPerMetre]           image heights per metre (camera distance)
 * @param {number} [o.aspect]                  image width / height
 * @param {{worldSd?:number, imageSd?:number}} [o.noise] Gaussian landmark noise (metres / image heights)
 * @param {{normal(m?:number, s?:number):number}} [o.rng] required when noise is given
 * @returns {{world: Vec3[], image: Vec3[]}}
 */
export function handLandmarks({ e, R = DEFAULT_ROTATION, scale = 1, handed = 'Right', calib = defaultCalibration(), palmAt = { x: 0.66, y: 0.5 }, unitsPerMetre = 2.0, aspect = 4 / 3, noise, rng }) {
  const local = localLandmarks(e, calib);
  const sign = handed === 'Left' ? -1 : 1;
  /** @type {number[][]} */
  const cam = local.map((p) => {
    const x = sign * p[0] * scale, y = p[1] * scale, z = p[2] * scale;
    return [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
  });
  // MediaPipe world landmarks are hand-centred: subtract the centroid
  const c = [0, 0, 0];
  for (const p of cam) { c[0] += p[0] / 21; c[1] += p[1] / 21; c[2] += p[2] / 21; }
  const wSd = noise?.worldSd ?? 0, iSd = noise?.imageSd ?? 0;
  const g = (/** @type {number} */ sd) => (sd > 0 && rng ? rng.normal(0, sd) : 0);
  /** @type {Vec3[]} */
  const world = cam.map((p) => ({ x: p[0] - c[0] + g(wSd), y: p[1] - c[1] + g(wSd), z: p[2] - c[2] + g(wSd) }));
  // orthographic projection; translate so that the palm centre lands at palmAt
  let px = 0, py = 0;
  for (const k of PALM_LANDMARKS) { px += cam[k][0] / PALM_LANDMARKS.length; py += cam[k][1] / PALM_LANDMARKS.length; }
  /** @type {Vec3[]} */
  const image = cam.map((p) => ({
    x: (palmAt.x + (p[0] - px) * unitsPerMetre + g(iSd)) / aspect,
    y: palmAt.y + (p[1] - py) * unitsPerMetre + g(iSd),
    z: (p[2] - cam[0][2]) * unitsPerMetre,
  }));
  return { world, image };
}
