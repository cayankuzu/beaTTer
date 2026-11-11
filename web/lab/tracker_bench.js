// beaTTer — local measurement (not deployed): per-frame cost of the hand tracker on this machine, GPU vs
// CPU delegate (docs/tez/05-mimari.md, 5.9). Frames are drawn on a 640x480 canvas and passed directly to
// the tracker; there is no hand in them, so the palm detector runs on every frame - the case while the
// app searches for a hand (the cost while a hand is tracked is not measured here). 10 warm-up frames, then
// 80 measured frames per delegate.
//
// The thesis also quotes the cost of the BlazeFace face detector that earlier versions used. Its model
// was removed from web/models; to repeat that measurement, restore it first:
//   git restore --source=4def20f -- web/models/blaze_face_short_range.tflite
// (the page measures it only when the file is present; do not commit it again).
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const out = /** @type {HTMLElement} */ (document.getElementById('out'));
const log = (/** @type {string} */ s) => { out.textContent += '\n' + s; };
const src = /** @type {HTMLCanvasElement} */ (document.getElementById('src'));
const sx = /** @type {CanvasRenderingContext2D} */ (src.getContext('2d'));
let tick = 0;
const draw = () => {
  tick += 1;
  const g = sx.createLinearGradient(0, 0, 640, 480);
  g.addColorStop(0, `hsl(${(tick * 2) % 360},40%,40%)`); g.addColorStop(1, '#223');
  sx.fillStyle = g; sx.fillRect(0, 0, 640, 480);
  sx.fillStyle = '#c96'; sx.beginPath(); sx.arc(320 + 120 * Math.sin(tick / 15), 240, 60, 0, 6.3); sx.fill();
};
const yieldNow = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(undefined); ch.port2.postMessage(0); });
const stats = (/** @type {number[]} */ a) => {
  const s = [...a].sort((x, y) => x - y);
  const q = (/** @type {number} */ p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return `ortanca ${q(0.5).toFixed(1)} ms, p90 ${q(0.9).toFixed(1)} ms, en çok ${s[s.length - 1].toFixed(1)} ms (n=${s.length})`;
};

const lib = await import(`${CDN}/vision_bundle.mjs`);
const vision = await lib.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
log(`mantıksal işlemci: ${navigator.hardwareConcurrency}; görünürlük: ${document.visibilityState}`);
/** @type {Record<string, any>} */ const results = {};
const bench = async (/** @type {string} */ name, /** @type {() => Promise<any>} */ make, /** @type {(t:any, ts:number) => void} */ run, n = 80) => {
  let task;
  const t0 = performance.now();
  try { task = await make(); } catch (e) { log(`${name}: oluşturulamadı: ${/** @type {any} */ (e)?.message}`); results[name] = { error: String(/** @type {any} */ (e)?.message) }; return; }
  const createMs = performance.now() - t0;
  /** @type {number[]} */ const times = [];
  let ts = 1000;
  for (let i = 0; i < n + 10; i++) {
    draw();
    ts += 33;
    const a = performance.now();
    try { run(task, ts); } catch (e) { log(`${name}: çalıştırılamadı: ${/** @type {any} */ (e)?.message}`); break; }
    if (i >= 10) times.push(performance.now() - a);
    await yieldNow();
  }
  log(`${name}: oluşturma ${createMs.toFixed(0)} ms; kare başına ${stats(times)}`);
  results[name] = { createMs, times };
  try { task.close(); } catch { /* ignore */ }
};
const handOpts = (/** @type {'GPU'|'CPU'} */ delegate) => ({ baseOptions: { modelAssetPath: '../models/gesture_recognizer.task?v=4.0.0', delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.28, minHandPresenceConfidence: 0.28, minTrackingConfidence: 0.28 });
await bench('GestureRecognizer GPU', () => lib.GestureRecognizer.createFromOptions(vision, handOpts('GPU')), (t, ts) => t.recognizeForVideo(src, ts));
await bench('GestureRecognizer CPU', () => lib.GestureRecognizer.createFromOptions(vision, handOpts('CPU')), (t, ts) => t.recognizeForVideo(src, ts));
const face = '../models/blaze_face_short_range.tflite';
if ((await fetch(face, { method: 'HEAD' }).catch(() => null))?.ok) {
  const faceOpts = (/** @type {'GPU'|'CPU'} */ delegate) => ({ baseOptions: { modelAssetPath: face, delegate }, runningMode: 'VIDEO', minDetectionConfidence: 0.16 });
  await bench('FaceDetector (önceki sürüm) CPU', () => lib.FaceDetector.createFromOptions(vision, faceOpts('CPU')), (t, ts) => t.detectForVideo(src, ts));
  await bench('FaceDetector (önceki sürüm) GPU', () => lib.FaceDetector.createFromOptions(vision, faceOpts('GPU')), (t, ts) => t.detectForVideo(src, ts));
} else {
  log('Yüz dedektörü modeli yok (kaldırıldı): o ölçüm atlandı; dosyanın başındaki açıklamaya bakın.');
}
log('BİTTİ');
/** @type {any} */ (window).__bench = results;
