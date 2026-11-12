// @ts-check
// Camera path without a camera: the geometry of the private picture (everything defocused but the tracked
// hand) and the camera source's hand-over to the engine and to the painter. The painter itself and the
// MediaPipe tracker need a browser; they were checked there (docs/tez/05-mimari.md, 5.8 and 5.9).
import test from 'node:test';
import assert from 'node:assert/strict';
import { handMaskGeometry, coverFit, blurRGBA, frameSize, BONES, PALM, SHAPE } from '../web/js/platform/hand_focus.js';
import { createCameraSource } from '../web/js/app/sources.js';
import { handLandmarks, rotationFromEuler } from '../web/js/sim/hand_model.js';
import { makeRng } from '../web/js/core/rng.js';
import { createStore, initialState } from '../web/js/app/store.js';
import { createStorage } from '../web/js/platform/storage.js';
import { createController } from '../web/js/app/controller.js';
import { M } from '../web/js/ui/strings_tr.js';

const OPEN = [0.95, 0.97, 0.98, 0.96, 0.94];
const FIST = [0.14, 0.03, 0.03, 0.03, 0.03];

/** distance from point p to segment ab */
const segDist = (/** @type {{x:number,y:number}} */ p, /** @type {{x:number,y:number}} */ a, /** @type {{x:number,y:number}} */ b) => {
  const vx = b.x - a.x, vy = b.y - a.y, wx = p.x - a.x, wy = p.y - a.y;
  const L = vx * vx + vy * vy;
  const u = L > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / L)) : 0;
  return Math.hypot(wx - u * vx, wy - u * vy);
};

test('cover mapping: the frame fills the canvas, centred, aspect kept', () => {
  for (const [cw, ch, vw, vh] of [[1200, 600, 640, 480], [600, 900, 640, 480], [800, 600, 640, 480], [1280, 720, 1280, 720]]) {
    const f = coverFit(cw, ch, vw, vh);
    assert.ok(f.x(0) <= 1e-9 && f.x(1) >= cw - 1e-9, `${cw}x${ch}: width covered`);
    assert.ok(f.y(0) <= 1e-9 && f.y(1) >= ch - 1e-9, `${cw}x${ch}: height covered`);
    assert.ok(Math.abs(f.x(0.5) - cw / 2) < 1e-9 && Math.abs(f.y(0.5) - ch / 2) < 1e-9, 'centred');
    assert.ok(Math.abs((f.x(1) - f.x(0)) / (f.y(1) - f.y(0)) - vw / vh) < 1e-9, 'aspect kept');
  }
});

test('sharp region: every landmark and every bone lies inside it, with margin, for open hands and fists in any pose', () => {
  const rng = makeRng(5);
  let cases = 0;
  for (const e of [OPEN, FIST, [0.2, 0.95, 0.95, 0.05, 0.05]]) {
    for (const [rx, ry, rz] of [[160, 25, 8], [180, 0, 0], [120, 60, -30], [200, -40, 45], [90, 0, 0]]) {
      for (const at of [{ x: 0.5, y: 0.5 }, { x: 0.2, y: 0.7 }, { x: 0.8, y: 0.3 }]) {
        const lm = handLandmarks({ e, R: rotationFromEuler(rx, ry, rz), palmAt: at, unitsPerMetre: 2.4, noise: { worldSd: 0.002, imageSd: 0.002 }, rng });
        const fit = coverFit(1000, 750, 640, 480);
        const g = handMaskGeometry(lm.image, fit);
        assert.ok(g, 'geometry exists');
        cases += 1;
        for (const p of g.pts) {
          assert.ok(p.x - g.radius >= g.box.x0 && p.x + g.radius <= g.box.x1, 'x inside the box with the capsule radius');
          assert.ok(p.y - g.radius >= g.box.y0 && p.y + g.radius <= g.box.y1, 'y inside the box with the capsule radius');
        }
        // each landmark is covered by a capsule (distance to some bone <= radius), the wrist by its disc
        for (let i = 0; i < 21; i++) {
          const d = Math.min(...BONES.map(([a, b]) => segDist(g.pts[i], g.pts[a], g.pts[b])));
          assert.ok(d <= g.radius + 1e-9, `landmark ${i} covered`);
        }
        // the capsule is never thinner than a finger: radius = SHAPE.capsule x reference, reference >= palm length
        const palm = Math.hypot(g.pts[9].x - g.pts[0].x, g.pts[9].y - g.pts[0].y);
        assert.ok(g.ref >= palm - 1e-9 && g.radius >= SHAPE.capsule * palm - 1e-9);
        assert.ok(g.feather > 0 && g.wristRadius > g.radius);
      }
    }
  }
  assert.equal(cases, 45);
  assert.deepEqual([...PALM], [0, 1, 2, 5, 9, 13, 17]);
});

test('a fist seen knuckles-first (foreshortened palm) still gets a capsule as wide as its fingers', () => {
  const lm = handLandmarks({ e: FIST, R: rotationFromEuler(90, 0, 0), palmAt: { x: 0.5, y: 0.5 }, unitsPerMetre: 2.4 });
  const fit = coverFit(1000, 750, 640, 480);
  const g = handMaskGeometry(lm.image, fit);
  assert.ok(g);
  const palm = Math.hypot(g.pts[9].x - g.pts[0].x, g.pts[9].y - g.pts[0].y);
  const xs = g.pts.map((p) => p.x), ys = g.pts.map((p) => p.y);
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  assert.ok(g.ref >= 0.45 * extent - 1e-9, 'reference from the hand extent');
  assert.ok(g.ref >= palm - 1e-9);
});

test('malformed landmarks give no sharp region (the whole picture stays defocused)', () => {
  const fit = coverFit(800, 600, 640, 480);
  const good = handLandmarks({ e: OPEN }).image;
  assert.equal(handMaskGeometry(null, fit), null);
  assert.equal(handMaskGeometry(good.slice(0, 20), fit), null);
  for (const bad of [NaN, Infinity, undefined]) {
    const lm = good.map((p) => ({ ...p }));
    lm[7] = { x: /** @type {any} */ (bad), y: 0.5, z: 0 };
    assert.equal(handMaskGeometry(lm, fit), null);
  }
});

test('camera source: opens without waiting for any face detector, reports the delegate, hands raw landmarks to the painter', async () => {
  const lm = handLandmarks({ e: OPEN, palmAt: { x: 0.4, y: 0.6 } });
  /** @type {((meta:{t:number, now:number}) => void)|null} */ let frameFn = null;
  const camera = {
    start: async () => {}, stop: () => {}, listDevices: async () => [],
    onFrame: (/** @type {any} */ fn) => { frameFn = fn; }, offFrame: () => { frameFn = null; },
    onLost: () => {},
  };
  let detectCalls = 0;
  const tracker = {
    ready: false, delegate: /** @type {'GPU'|'CPU'|null} */ (null),
    async init() { this.ready = true; this.delegate = 'GPU'; },
    detect: () => { detectCalls += 1; return { image: lm.image, world: lm.world, handedness: 'Right', neural: { label: 'PAPER', score: 0.9 }, inferenceMs: 16 }; },
    onFailure: () => {},
  };
  const video = /** @type {any} */ ({ videoWidth: 640, videoHeight: 480 });
  const src = createCameraSource({ video, camera: /** @type {any} */ (camera), tracker: /** @type {any} */ (tracker) });
  /** @type {any[]} */ const patches = [];
  const t0 = Date.now();
  await src.open(undefined, (/** @type {any} */ p) => patches.push(p));
  assert.ok(Date.now() - t0 < 1000, 'no grace period: nothing but the tracker is awaited');
  assert.deepEqual(patches[patches.length - 1], { tracker: 'ready', delegate: 'GPU' });
  /** @type {any[]} */ const got = [];
  src.start((/** @type {any} */ frame, /** @type {any} */ disp) => got.push({ frame, disp }));
  assert.ok(frameFn, 'listening to camera frames');
  for (let i = 0; i < 3; i++) /** @type {any} */ (frameFn)({ t: 1000 + 33 * i, now: 1000 + 33 * i + 5 });
  assert.equal(detectCalls, 3);
  assert.equal(got.length, 3);
  for (const g of got) {
    assert.equal(g.frame.present, true);
    assert.equal(g.frame.image, lm.image, 'the engine gets the raw landmarks');
    assert.equal(g.disp.raw, lm.image, 'the painter gets the raw landmarks of the same frame');
    assert.ok(Array.isArray(g.disp.image) && g.disp.image.length === 21, 'the skeleton gets smoothed ones');
    assert.equal(g.disp.inferMs, 16);
    assert.equal(g.disp.delegate, 'GPU', 'every frame says where the tracker runs');
    assert.equal(g.disp.picture, null, 'no DOM here: no frame copy, the tracker reads the element itself');
  }
  assert.deepEqual(got.map((g) => g.frame.index), [0, 1, 2]);
  // the tracker is rebuilt on the other processor mid-stream: the next frame says so
  tracker.delegate = 'CPU';
  /** @type {any} */ (frameFn)({ t: 1200, now: 1205 });
  assert.equal(got[got.length - 1].disp.delegate, 'CPU');
  // a brief 1-frame tracker dropout (< 110 ms) reports present:false to the engine but holds display landmarks so the UI does not flicker
  const origDetect = tracker.detect;
  tracker.detect = () => null;
  /** @type {any} */ (frameFn)({ t: 1233, now: 1238 });
  const briefDrop = got[got.length - 1];
  assert.equal(briefDrop.frame.present, false, 'engine always sees true frame presence');
  assert.ok(briefDrop.disp.image && briefDrop.disp.raw, 'display grace keeps skeleton and focus mask steady across a single dropped frame');
  // after the grace window (> 110 ms), display landmarks clear as well
  /** @type {any} */ (frameFn)({ t: 1400, now: 1405 });
  const longDrop = got[got.length - 1];
  assert.equal(longDrop.frame.present, false);
  assert.equal(longDrop.disp.image, null);
  assert.equal(longDrop.disp.raw, null);
  tracker.detect = origDetect;
});

test('the controller follows a tracker that moved to the other processor (status chip)', async () => {
  const m = new Map();
  const storage = createStorage(/** @type {any} */ ({ getItem: (/** @type {string} */ k) => (m.has(k) ? m.get(k) : null), setItem: (/** @type {string} */ k, /** @type {any} */ v) => m.set(k, String(v)), removeItem: (/** @type {string} */ k) => m.delete(k) }));
  const store = createStore(initialState(storage.getSettings()));
  /** @type {any} */ let sink = null;
  const cam = {
    kind: 'camera', video: { videoWidth: 640, videoHeight: 480 },
    open: async (/** @type {any} */ _id, /** @type {(p:any) => void} */ report) => { report({ tracker: 'ready', delegate: 'GPU' }); },
    close() {}, stop() {}, devices: async () => [], onLost() {}, onResult() {}, onIdle() {}, clock: () => 0,
    start(/** @type {any} */ fn) { sink = fn; },
  };
  const audio = new Proxy({}, { get: () => () => {} });
  const controller = createController({ store, storage, audio: /** @type {any} */ (audio), now: () => 0, makeCameraSource: async () => cam, options: { autoAdvanceMs: null } });
  try {
    assert.equal(await controller.actions.startCamera(), true);
    assert.equal(store.get().boot.delegate, 'GPU');
    const empty = (/** @type {number} */ i) => ({ t: 1000 + 33 * i, index: i, present: false, image: null, world: null, aspect: 4 / 3, handedness: null, neural: null });
    sink(empty(0), { image: null, raw: null, picture: null, delegate: 'GPU', demo: false, inferMs: 16, latencyMs: 20 });
    assert.equal(store.get().boot.delegate, 'GPU');
    sink(empty(1), { image: null, raw: null, picture: null, delegate: 'CPU', demo: false, inferMs: 47, latencyMs: 60 });
    assert.equal(store.get().boot.delegate, 'CPU', 'the status follows the rebuilt tracker');
    assert.equal(M.trackerTitle('CPU', 47), 'El izleyici: işlemci (CPU) · kare başına 47 ms');
    assert.equal(M.trackerTitle('GPU', null), 'El izleyici: ekran kartı (GPU)');
    assert.equal(controller.frame().picture, null);
  } finally {
    controller.dispose();
  }
});

test('fallback blur (browsers without canvas filters): Gaussian of the requested width, energy kept, edges clamped', () => {
  const w = 41, h = 41, sigma = 1.6;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[4 * i] = 0; data[4 * i + 1] = 0; data[4 * i + 2] = 0; data[4 * i + 3] = 255; }
  const c = 20;
  data[(c * w + c) * 4] = 255; // one bright red pixel in the middle
  blurRGBA(data, w, h, sigma);
  let sum = 0, mx = 0, my = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = data[(y * w + x) * 4]; sum += v; mx += v * x; my += v * y; }
  mx /= sum; my /= sum;
  let vx = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) vx += data[(y * w + x) * 4] * (x - mx) ** 2;
  vx /= sum;
  assert.ok(Math.abs(sum - 255) <= 12, `energy kept up to rounding (${sum})`);
  assert.ok(Math.abs(mx - c) < 0.05 && Math.abs(my - c) < 0.05, 'centred');
  assert.ok(Math.abs(Math.sqrt(vx) - sigma) < 0.25, `spread ${Math.sqrt(vx).toFixed(2)} ~ sigma ${sigma}`);
  for (let i = 0; i < w * h; i++) assert.equal(data[4 * i + 3], 255, 'opaque stays opaque');
  // a uniform image is unchanged, edges included (clamped, no darkening)
  const flat = new Uint8ClampedArray(6 * 5 * 4).fill(200);
  blurRGBA(flat, 6, 5, sigma);
  assert.ok(flat.every((v) => v === 200));
  // sigma 0 is a no-op
  const one = new Uint8ClampedArray([1, 2, 3, 4]);
  blurRGBA(one, 1, 1, 0);
  assert.deepEqual([...one], [1, 2, 3, 4]);
});

test('frame size: a video counts only once it has a frame; a canvas copy by its size', () => {
  assert.equal(frameSize(null), null);
  assert.equal(frameSize({ videoWidth: 640, videoHeight: 480, readyState: 1 }), null, 'video without a frame yet');
  assert.deepEqual(frameSize({ videoWidth: 640, videoHeight: 480, readyState: 4 }), { w: 640, h: 480 });
  assert.equal(frameSize({ videoWidth: 0, videoHeight: 0, readyState: 4 }), null);
  assert.deepEqual(frameSize({ width: 1280, height: 720 }), { w: 1280, h: 720 }, 'canvas copy');
  assert.equal(frameSize({ width: 0, height: 720 }), null);
});
