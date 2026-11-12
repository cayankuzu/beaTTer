// @ts-check
/**
 * beaTTer v4 — the player's hand skeleton (21 landmarks) on the camera overlay. Pure drawing.
 */

/** Bone chains: thumb, index, middle (from the index knuckle), ring, pinky, palm edge. */
export const CHAINS = Object.freeze([
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [0, 17],
]);
const TIPS = new Set([4, 8, 12, 16, 20]);

/**
 * Projection of normalised frame coordinates into the stage, CSS pixels.
 * @param {number} cw stage width @param {number} ch stage height
 * @param {number} vw frame width @param {number} vh frame height
 * @param {'cover'|'contain'} fit
 */
export function projection(cw, ch, vw, vh, fit) {
  const scale = fit === 'cover' ? Math.max(cw / vw, ch / vh) : Math.min(cw / vw, ch / vh);
  const dx = (cw - vw * scale) / 2, dy = (ch - vh * scale) / 2;
  return { scale, dx, dy, x: (/** @type {number} */ nx) => dx + nx * vw * scale, y: (/** @type {number} */ ny) => dy + ny * vh * scale };
}

/**
 * @param {CanvasRenderingContext2D} ctx context in CSS pixels
 * @param {{x:number, y:number}[]} lm 21 normalised landmarks
 * @param {ReturnType<typeof projection>} pr
 * @param {import('./theme.js').Theme} t
 * @param {{glow?: boolean, box?: boolean}} [o]
 */
export function drawSkeleton(ctx, lm, pr, t, o = {}) {
  if (!lm || lm.length < 21) return;
  /** @type {number[]} */ const xs = new Array(21), ys = new Array(21);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 21; i++) {
    xs[i] = pr.x(lm[i].x); ys[i] = pr.y(lm[i].y);
    if (xs[i] < x0) x0 = xs[i]; if (xs[i] > x1) x1 = xs[i];
    if (ys[i] < y0) y0 = ys[i]; if (ys[i] > y1) y1 = ys[i];
  }
  const span = Math.max(x1 - x0, y1 - y0, 1);
  const k = Math.min(1.6, Math.max(0.7, span / 150)); // marker size follows the hand's size on screen

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // bones
  ctx.strokeStyle = t.player; ctx.lineWidth = 2 * k;
  if (o.glow !== false) { ctx.shadowColor = t.player; ctx.shadowBlur = 8; }
  ctx.beginPath();
  for (const chain of CHAINS) {
    ctx.moveTo(xs[chain[0]], ys[chain[0]]);
    for (let i = 1; i < chain.length; i++) ctx.lineTo(xs[chain[i]], ys[chain[i]]);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  // joints: hollow dots batched into two paths (regular joints + fingertips) to minimise draw calls
  ctx.fillStyle = t.bg; ctx.lineWidth = 1.5 * k;
  const rJoint = 3.8 * k, rTip = 4.6 * k;
  ctx.beginPath();
  for (let i = 0; i < 21; i++) {
    if (TIPS.has(i)) continue;
    ctx.moveTo(xs[i] + rJoint, ys[i]);
    ctx.arc(xs[i], ys[i], rJoint, 0, Math.PI * 2);
  }
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  for (const i of TIPS) {
    ctx.moveTo(xs[i] + rTip, ys[i]);
    ctx.arc(xs[i], ys[i], rTip, 0, Math.PI * 2);
  }
  ctx.fill(); ctx.stroke();
  // tracking box: corner brackets
  if (o.box !== false) {
    const pad = 14 * k, a = 14 * k;
    const bx0 = x0 - pad, by0 = y0 - pad, bx1 = x1 + pad, by1 = y1 + pad;
    ctx.lineWidth = 1.25; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(bx0, by0 + a); ctx.lineTo(bx0, by0); ctx.lineTo(bx0 + a, by0);
    ctx.moveTo(bx1 - a, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 + a);
    ctx.moveTo(bx1, by1 - a); ctx.lineTo(bx1, by1); ctx.lineTo(bx1 - a, by1);
    ctx.moveTo(bx0 + a, by1); ctx.lineTo(bx0, by1); ctx.lineTo(bx0, by1 - a);
    ctx.stroke();
  }
  ctx.restore();
}
