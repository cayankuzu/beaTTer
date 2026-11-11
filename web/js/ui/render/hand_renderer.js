// @ts-check
/**
 * beaTTer v4 — the AI's mechanical hand, drawn as a technical illustration on a canvas.
 *
 * The pose comes from the same forward-kinematics model the simulation uses (sim/hand_model.js): five
 * finger extensions -> 21 landmarks. Extensions are animated towards their targets with a critically
 * damped spring (no overshoot); a second spring carries the "bob" that follows the detected beats.
 * The same renderer draws the MindTwin twin (posed with the forecast) plus a dashed outline of "now".
 *
 * The renderer knows nothing about the game: what it shows is decided by the AI-stage view, which never
 * hands it the AI's move before the result exists.
 */

import { handLandmarks, DEFAULT_ROTATION } from '../../sim/hand_model.js';
import { CHAINS } from './skeleton.js';
import { alpha } from './theme.js';

export const POSE_FIST = Object.freeze([0.15, 0, 0, 0, 0]);
/** Final poses per move (ROCK, PAPER, SCISSORS). */
export const POSE_MOVES = Object.freeze([
  Object.freeze([0.15, 0, 0, 0, 0]),
  Object.freeze([0.9, 1, 1, 1, 1]),
  Object.freeze([0.2, 1, 1, 0.06, 0.05]),
]);

const OMEGA = 20;        // rad/s: settles in roughly 0.3 s (between --dur-2 and --dur-3)
const OMEGA_FAST = 60;   // MindTwin: the forecast is already smooth, follow it closely
const OMEGA_BOB = 16;
const FOREARM = 0.05;    // metres drawn below the wrist

/** @param {readonly number[]} e @returns {{x:number, y:number, z:number}[]} landmarks in metres around the palm centre */
function pose(e) {
  return handLandmarks({ e: /** @type {number[]} */ (e), R: DEFAULT_ROTATION, palmAt: { x: 0, y: 0 }, unitsPerMetre: 1, aspect: 1 }).image;
}

/** Bounding box (metres) that contains every pose, so the hand never rescales while it moves. */
const BOUNDS = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of [POSE_FIST, ...POSE_MOVES, [1, 1, 1, 1, 1]]) {
    for (const p of pose(e)) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  }
  return { x0: x0 - 0.016, x1: x1 + 0.016, y0: y0 - 0.014, y1: y1 + FOREARM + 0.012 };
})();

/** Rounded rectangle path; plain rectangle where CanvasRenderingContext2D.roundRect is missing. */
function roundRect(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h, /** @type {number} */ r) {
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

const SEG_W = [0.0185, 0.0165, 0.0148];      // long-finger segment widths (m)
const THUMB_W = [0.0215, 0.019, 0.017];

export function createHandRenderer() {
  const e = POSE_FIST.slice(), v = [0, 0, 0, 0, 0];
  let target = POSE_FIST.slice();
  let fast = false;
  let bob = 0, bobV = 0;
  /** @type {'none'|'idle'|'sealed'|'revealed'|'failed'} */ let port = 'idle';
  /** @type {number[]|null} */ let ghost = null;
  let moving = true;

  return {
    /** @param {readonly number[]} t five extensions @param {{snap?: boolean, fast?: boolean}} [o] */
    setTarget(t, o = {}) {
      target = [0, 1, 2, 3, 4].map((i) => (Number.isFinite(t[i]) ? Math.min(1.05, Math.max(-0.05, t[i])) : 0));
      fast = !!o.fast;
      if (o.snap) { for (let i = 0; i < 5; i++) { e[i] = target[i]; v[i] = 0; } }
      moving = true;
    },
    /** One beat: a short downward pump. @param {number} [strength] 1 = normal */
    kick(strength = 1) { bobV += 1.9 * strength; moving = true; },
    /** @param {'none'|'idle'|'sealed'|'revealed'|'failed'} p */
    setPort(p) { if (p !== port) { port = p; moving = true; } },
    /** Dashed outline of another pose (MindTwin "now"). @param {number[]|null} g */
    setGhost(g) { ghost = g ? g.slice(0, 5) : null; moving = true; },
    /**
     * Advance the springs. @param {number} dtMs @param {boolean} reduced no motion: snap
     * @returns {boolean} true when the picture changed and must be redrawn
     */
    step(dtMs, reduced) {
      if (reduced) {
        let diff = bob !== 0 || bobV !== 0;
        for (let i = 0; i < 5; i++) { if (e[i] !== target[i]) diff = true; e[i] = target[i]; v[i] = 0; }
        bob = 0; bobV = 0;
        const was = moving; moving = false;
        return diff || was;
      }
      const w = fast ? OMEGA_FAST : OMEGA;
      let left = Math.min(0.1, Math.max(0, dtMs / 1000));
      let active = false;
      while (left > 1e-6) {
        const dt = Math.min(left, 1 / 120); left -= dt;
        for (let i = 0; i < 5; i++) {
          const a = w * w * (target[i] - e[i]) - 2 * w * v[i];
          v[i] += a * dt; e[i] += v[i] * dt;
        }
        const ab = -OMEGA_BOB * OMEGA_BOB * bob - 2 * OMEGA_BOB * bobV;
        bobV += ab * dt; bob += bobV * dt;
      }
      for (let i = 0; i < 5; i++) if (Math.abs(target[i] - e[i]) > 0.002 || Math.abs(v[i]) > 0.02) active = true;
      if (Math.abs(bob) > 0.0015 || Math.abs(bobV) > 0.02) active = true;
      if (!active) { for (let i = 0; i < 5; i++) { e[i] = target[i]; v[i] = 0; } bob = 0; bobV = 0; }
      const was = moving;
      moving = active;
      return active || was || port === 'sealed';
    },
    /**
     * @param {CanvasRenderingContext2D} ctx context in CSS pixels
     * @param {number} w @param {number} h canvas size in CSS pixels
     * @param {import('./theme.js').Theme} t
     * @param {{timeMs: number, reduced: boolean, dim?: boolean}} o
     */
    draw(ctx, w, h, t, o) {
      if (w < 8 || h < 8) return;
      const bw = BOUNDS.x1 - BOUNDS.x0, bh = BOUNDS.y1 - BOUNDS.y0;
      const k = Math.min(w / bw, h / bh) * 0.94;
      const ox = w / 2 - ((BOUNDS.x0 + BOUNDS.x1) / 2) * k;
      const oy = h / 2 - ((BOUNDS.y0 + BOUNDS.y1) / 2) * k + bob * 0.11 * bh * k;
      const lm = pose(e);
      const X = (/** @type {number} */ i) => ox + lm[i].x * k, Y = (/** @type {number} */ i) => oy + lm[i].y * k;
      const line = Math.max(1, Math.min(1.5, k * 0.0001 + 1));

      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (o.dim) ctx.globalAlpha = 0.55;

      // construction lines (only when there is room for them)
      if (w >= 150) {
        ctx.strokeStyle = alpha(t.line3, 0.55); ctx.lineWidth = 1;
        ctx.setLineDash([9, 3, 2, 3]);
        ctx.beginPath(); ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2, h - 4); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        const gx0 = w / 2 - (bw * k) / 2, gx1 = w / 2 + (bw * k) / 2, gy = h / 2 - (bh * k) / 2 + 6;
        ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy);
        ctx.moveTo(gx0 + 6, gy - 5); ctx.lineTo(gx0 + 6, gy + 5); ctx.moveTo(gx1 - 6, gy - 5); ctx.lineTo(gx1 - 6, gy + 5);
        ctx.stroke();
      }

      // forearm stub and wrist cuff, along the wrist -> middle-knuckle axis
      const ax = X(0) - X(9), ay = Y(0) - Y(9), al = Math.hypot(ax, ay) || 1;
      const ux = ax / al, uy = ay / al, nx = -uy, ny = ux;
      const cuffW = 0.066 * k, cuffL = 0.026 * k, armW = 0.044 * k, armL = FOREARM * k;
      ctx.strokeStyle = t.text3; ctx.lineWidth = line;
      ctx.beginPath();
      for (const sgn of [-1, 1]) {
        const bx = X(0) + ux * (cuffL * 0.9) + nx * sgn * armW / 2, by = Y(0) + uy * (cuffL * 0.9) + ny * sgn * armW / 2;
        ctx.moveTo(bx, by); ctx.lineTo(bx + ux * (armL - cuffL), by + uy * (armL - cuffL));
      }
      ctx.stroke();
      ctx.save();
      ctx.translate(X(0) + ux * cuffL * 0.45, Y(0) + uy * cuffL * 0.45);
      ctx.rotate(Math.atan2(uy, ux));
      ctx.fillStyle = t.surface2;
      ctx.beginPath(); roundRect(ctx, -cuffL / 2, -cuffW / 2, cuffL, cuffW, Math.min(6, cuffL / 3)); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = alpha(t.line3, 0.7);
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) { if (i === 0) continue; ctx.moveTo(-cuffL * 0.28, i * cuffW * 0.11); ctx.lineTo(cuffL * 0.28, i * cuffW * 0.11); }
      ctx.stroke();
      ctx.restore();

      // palm chassis: rounded plate through wrist, thumb base and the four knuckles
      const palm = [0, 1, 5, 9, 13, 17];
      const r = 0.011 * k;
      const palmPath = () => { ctx.beginPath(); ctx.moveTo(X(palm[0]), Y(palm[0])); for (let i = 1; i < palm.length; i++) ctx.lineTo(X(palm[i]), Y(palm[i])); ctx.closePath(); };
      palmPath(); ctx.strokeStyle = t.text3; ctx.lineWidth = 2 * r + 2 * line; ctx.stroke();
      palmPath(); ctx.strokeStyle = t.surface2; ctx.lineWidth = 2 * r; ctx.stroke(); ctx.fillStyle = t.surface2; ctx.fill();

      // finger segments as capsule plates, far to near
      /** @type {{a:number, b:number, wd:number, z:number, near:boolean}[]} */
      const segs = [];
      for (let f = 0; f < 4; f++) {
        const b = 5 + 4 * f;
        for (let j = 0; j < 3; j++) segs.push({ a: b + j, b: b + j + 1, wd: SEG_W[j] * (f === 3 ? 0.88 : 1) * k, z: (lm[b + j].z + lm[b + j + 1].z) / 2, near: j < 2 });
      }
      for (let j = 0; j < 3; j++) segs.push({ a: 1 + j, b: 2 + j, wd: THUMB_W[j] * k, z: (lm[1 + j].z + lm[2 + j].z) / 2 - 0.004, near: j > 0 });
      segs.sort((p, q) => q.z - p.z);
      for (const sg of segs) {
        ctx.beginPath(); ctx.moveTo(X(sg.a), Y(sg.a)); ctx.lineTo(X(sg.b), Y(sg.b));
        ctx.strokeStyle = t.text3; ctx.lineWidth = sg.wd + 2 * line; ctx.stroke();
        ctx.strokeStyle = sg.near ? t.surface3 : t.surface2; ctx.lineWidth = sg.wd; ctx.stroke();
        // joint at the proximal end: ring + pin
        const jr = Math.max(2.2, sg.wd * 0.3);
        ctx.beginPath(); ctx.arc(X(sg.a), Y(sg.a), jr, 0, Math.PI * 2);
        ctx.fillStyle = t.surface1; ctx.fill(); ctx.strokeStyle = t.ai; ctx.lineWidth = line; ctx.stroke();
        ctx.beginPath(); ctx.arc(X(sg.a), Y(sg.a), Math.max(0.9, jr * 0.3), 0, Math.PI * 2); ctx.fillStyle = t.ai; ctx.fill();
      }

      // seal port in the heel of the palm
      if (port !== 'none') {
        const mx = (X(5) + X(9) + X(13) + X(17)) / 4, my = (Y(5) + Y(9) + Y(13) + Y(17)) / 4;
        const px = X(0) + (mx - X(0)) * 0.3 + (X(17) - X(5)) * 0.1, py = Y(0) + (my - Y(0)) * 0.3 + (Y(17) - Y(5)) * 0.1;
        const pr = Math.max(5, 0.0125 * k);
        if (port === 'sealed' && !o.reduced) {
          const ph = (o.timeMs % 1600) / 1600;
          ctx.beginPath(); ctx.arc(px, py, pr * (1 + 0.9 * ph), 0, Math.PI * 2);
          ctx.strokeStyle = alpha(t.sealInk, 0.9 * (1 - ph)); ctx.lineWidth = 1.25; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = port === 'sealed' ? t.sealTint : t.bg; ctx.fill();
        ctx.strokeStyle = port === 'sealed' ? t.sealInk : port === 'revealed' ? t.ai : port === 'failed' ? t.warnInk : t.text3;
        ctx.lineWidth = port === 'idle' ? line : 1.5; ctx.stroke();
        if (port === 'sealed') {
          // closed padlock
          const s = pr * 0.46;
          ctx.fillStyle = t.sealInk;
          ctx.beginPath(); roundRect(ctx, px - s, py - s * 0.15, 2 * s, s * 1.35, s * 0.3); ctx.fill();
          ctx.beginPath(); ctx.arc(px, py - s * 0.15, s * 0.58, Math.PI, 0); ctx.lineWidth = Math.max(1.2, s * 0.3); ctx.stroke();
        } else if (port === 'revealed') {
          const s = pr * 0.42;
          ctx.fillStyle = t.ai;
          ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px + s, py); ctx.lineTo(px, py + s); ctx.lineTo(px - s, py); ctx.closePath(); ctx.fill();
        } else if (port === 'failed') {
          const s = pr * 0.4;
          ctx.beginPath(); ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s); ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s); ctx.stroke();
        } else {
          ctx.strokeStyle = alpha(t.line3, 0.7); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px, py - pr * 0.6); ctx.lineTo(px, py + pr * 0.6); ctx.moveTo(px - pr * 0.6, py); ctx.lineTo(px + pr * 0.6, py); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // outline of another pose (MindTwin: where the hand is now)
      if (ghost) {
        const g = pose(ghost);
        ctx.strokeStyle = t.player; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.beginPath();
        for (const chain of CHAINS) {
          ctx.moveTo(ox + g[chain[0]].x * k, oy + g[chain[0]].y * k);
          for (let i = 1; i < chain.length; i++) ctx.lineTo(ox + g[chain[i]].x * k, oy + g[chain[i]].y * k);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    },
  };
}
