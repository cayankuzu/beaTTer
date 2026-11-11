// beaTTer — local check (not deployed) of the privacy painter (docs/tez/05-mimari.md, 5.8): a detailed
// frame (hard 2-px stripes everywhere, text, a face-like disc with "eyes") stands in for a tracked camera
// frame; synthetic hand landmarks mark where the hand is. Measures sharpness as the mean absolute
// horizontal luminance gradient inside the hand's capsules, far from them, over the face-like disc, and
// over the whole picture when there is no hand; times the painter's JavaScript.
import { createHandFocus, coverFit, handMaskGeometry, BONES } from '../js/platform/hand_focus.js';
import { handLandmarks, rotationFromEuler } from '../js/sim/hand_model.js';

const log = (/** @type {string} */ s) => { /** @type {HTMLElement} */ (document.getElementById('out')).textContent += '\n' + s; };
const frame = /** @type {HTMLCanvasElement} */ (document.getElementById('frame'));
const fx = /** @type {CanvasRenderingContext2D} */ (frame.getContext('2d'));
for (let x = 0; x < 640; x += 4) { fx.fillStyle = (x / 4) % 2 ? '#e8e8e8' : '#202020'; fx.fillRect(x, 0, 2, 480); }
fx.fillStyle = '#c8a080'; fx.beginPath(); fx.arc(200, 150, 70, 0, 6.3); fx.fill();
fx.fillStyle = '#111'; fx.fillRect(170, 130, 14, 8); fx.fillRect(216, 130, 14, 8); fx.fillRect(185, 185, 30, 6);
fx.fillStyle = '#ff0'; fx.font = 'bold 28px monospace'; fx.fillText('PRIVATE TEXT', 330, 420);

const out = /** @type {HTMLCanvasElement} */ (document.getElementById('out-canvas'));
const ox = /** @type {CanvasRenderingContext2D} */ (out.getContext('2d', { willReadFrequently: true }));
const lm = handLandmarks({ e: [0.95, 0.97, 0.98, 0.96, 0.94], R: rotationFromEuler(160, 25, 8), palmAt: { x: 0.62, y: 0.55 }, unitsPerMetre: 2.4 }).image;
const p = createHandFocus();
const ok = p.draw(ox, frame, out, lm);
const N = 60, t1 = performance.now();
for (let i = 0; i < N; i++) p.draw(ox, frame, out, lm);
const per = (performance.now() - t1) / N;
log(`draw=${ok}; JavaScript per paint ${per.toFixed(2)} ms (800x600 canvas; GPU time not measured)`);

const fit = coverFit(out.width, out.height, 640, 480);
const g = /** @type {NonNullable<ReturnType<typeof handMaskGeometry>>} */ (handMaskGeometry(lm, fit));
const segDist = (/** @type {{x:number,y:number}} */ pt, /** @type {{x:number,y:number}} */ a, /** @type {{x:number,y:number}} */ b) => {
  const vx = b.x - a.x, vy = b.y - a.y, wx = pt.x - a.x, wy = pt.y - a.y;
  const L = vx * vx + vy * vy;
  const u = L > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / L)) : 0;
  return Math.hypot(wx - u * vx, wy - u * vy);
};
const sharpness = (/** @type {Uint8ClampedArray} */ img, /** @type {(x:number, y:number) => boolean} */ where, step = 2) => {
  const lum = (/** @type {number} */ x, /** @type {number} */ y) => { const i = (y * out.width + x) * 4; return 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]; };
  let s = 0, n = 0;
  for (let y = 2; y < out.height - 2; y += step) for (let x = 2; x < out.width - 2; x += step) if (where(x, y)) { s += Math.abs(lum(x + 1, y) - lum(x - 1, y)); n += 1; }
  return { mean: s / n, n };
};
const img = ox.getImageData(0, 0, out.width, out.height).data;
const dist = (/** @type {number} */ x, /** @type {number} */ y) => Math.min(...BONES.map(([a, b]) => segDist({ x, y }, g.pts[a], g.pts[b])));
const inside = sharpness(img, (x, y) => dist(x, y) < 0.5 * g.radius);
const far = sharpness(img, (x, y) => dist(x, y) > g.radius + 4 * g.feather);
const fcx = fit.x(200 / 640), fcy = fit.y(150 / 480), fr = 70 * fit.scale * 0.85;
const face = sharpness(img, (x, y) => Math.hypot(x - fcx, y - fcy) < fr && dist(x, y) > g.radius + 4 * g.feather);
// the same frame with no hand: everything defocused
p.draw(ox, frame, out, null);
const none = sharpness(ox.getImageData(0, 0, out.width, out.height).data, () => true, 3);
const src = (() => { const d = fx.getImageData(0, 0, 640, 480).data; let s = 0, n = 0; for (let y = 2; y < 478; y += 2) for (let x = 2; x < 638; x += 2) { const l = (/** @type {number} */ k) => 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; s += Math.abs(l((y * 640 + x + 1) * 4) - l((y * 640 + x - 1) * 4)); n += 1; } return s / n; })();
log(`sharpness (mean |dL/dx|): source frame ${src.toFixed(1)}; inside the hand ${inside.mean.toFixed(1)} (n=${inside.n}); far from the hand ${far.mean.toFixed(2)} (n=${far.n}); face-like disc ${face.mean.toFixed(2)} (n=${face.n}); no hand, whole picture ${none.mean.toFixed(2)}`);
p.draw(ox, frame, out, lm); // leave the hand picture on screen
/** @type {any} */ (window).__focus = { per, inside: inside.mean, far: far.mean, face: face.mean, none: none.mean, src };
log('BİTTİ');
