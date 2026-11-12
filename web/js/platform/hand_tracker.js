// @ts-check
/**
 * beaTTer v4 — hand tracker adapter (MediaPipe Tasks Vision: GestureRecognizer = hand landmarks + a
 * canned gesture label).
 *
 * MediaPipe Hands gives 21 landmarks per hand: image coordinates normalised by width/height and "world"
 * coordinates in metres with the origin at the hand's centre [Zhang2020]. The engine receives them RAW —
 * no smoothing here: the opening detector needs independent per-frame noise.
 *
 * Delegate: GPU (WebGL2) first, CPU (XNNPACK) as the fallback. Measured on the machine this was written on
 * (synthetic 640x480 frames without a hand, i.e. the palm detector runs on every frame, the costliest
 * case): median 16.4 ms per frame on the GPU against 47.4 ms on the CPU. The earlier CPU-first order
 * capped tracking at about 20 frames per second on the main thread; a fast stroke then moved the hand
 * further between two processed frames than the tracker's region of interest could follow, and the hand
 * was lost. The model is warmed up once after loading (the first GPU inference compiles its shaders).
 * When one delegate keeps failing at run time, the tracker is rebuilt on the other one.
 *
 * The library is loaded with a dynamic import, so the rest of the app (demo mode, lab, settings) works
 * even when the CDN is unreachable.
 */

const VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const LABELS = Object.freeze({ Closed_Fist: 'ROCK', Open_Palm: 'PAPER', Victory: 'SCISSORS' });
/** Low on purpose: keeps the hand tracked through motion blur, backlight glare and steep viewing angles on fast strokes. */
const MIN_DETECTION_CONFIDENCE = 0.12;
const MIN_PRESENCE_CONFIDENCE = 0.06;
const MIN_TRACKING_CONFIDENCE = 0.06;
/** Consecutive run-time failures after which the tracker is rebuilt (on the other delegate). */
const MAX_FAILURES = 15;

/** @type {Promise<{lib:any, vision:any}>|null} */
let shared = null;
function loadVision() {
  if (!shared) {
    shared = (async () => {
      // the explicit file (not the package's default entry): the Content-Security-Policy allows exactly
      // this package version's directory, nothing else on the CDN
      const lib = await import(/* webpackIgnore: true */ `${CDN}/vision_bundle.mjs`);
      const vision = await lib.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      return { lib, vision };
    })();
    shared.catch(() => { shared = null; }); // allow a retry after a network failure
  }
  return shared;
}

/**
 * @param {{modelUrl:string}} o
 */
export function createHandTracker({ modelUrl }) {
  /** @type {any} */ let recognizer = null;
  /** @type {'GPU'|'CPU'|null} */ let delegate = null;
  /** @type {'GPU'|'CPU'|null} */ let avoid = null; // a delegate that kept failing at run time
  let ready = false;
  let lastTs = 0;
  let hadHand = false;
  let failures = 0;
  let frames = 0, inferSum = 0;
  /** @type {Promise<void>|null} */ let initing = null;
  /** @type {(v?:any) => void} */ let resolveReady = () => {};
  const whenReady = new Promise((res) => { resolveReady = res; });
  /** @type {(() => void)|null} */ let onFail = null;

  const create = async (/** @type {'CPU'|'GPU'} */ d) => {
    const { lib, vision } = await loadVision();
    return lib.GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelUrl, delegate: d },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      minHandPresenceConfidence: MIN_PRESENCE_CONFIDENCE,
      minTrackingConfidence: MIN_TRACKING_CONFIDENCE,
    });
  };

  /** A few inferences on a blank frame: shader compilation and buffer set-up happen here, not on the first camera frames. */
  const warmUp = (/** @type {any} */ r) => {
    if (typeof document === 'undefined') return;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    if (x) { x.fillStyle = '#777'; x.fillRect(0, 0, 64, 64); }
    for (let i = 0; i < 3; i++) { lastTs += 1; r.recognizeForVideo(c, lastTs); }
  };

  /** Load the model (idempotent). Rejects if both delegates fail. */
  const init = () => {
    if (ready) return Promise.resolve();
    if (!initing) {
      initing = (async () => {
        const order = /** @type {('GPU'|'CPU')[]} */ (avoid === 'GPU' ? ['CPU', 'GPU'] : ['GPU', 'CPU']);
        /** @type {unknown} */ let lastErr = null;
        for (const d of order) {
          try {
            const r = await create(d);
            try { warmUp(r); } catch (err) { try { r.close(); } catch { /* ignore */ } throw err; }
            recognizer = r; delegate = d;
            break;
          } catch (err) {
            lastErr = err;
            console.warn(`[beaTTer] hand tracker: the ${d} delegate failed`, err);
          }
        }
        if (!recognizer) throw lastErr instanceof Error ? lastErr : new Error('hand tracker could not be created');
        ready = true; failures = 0; frames = 0; inferSum = 0;
        resolveReady();
      })();
      initing.catch(() => { initing = null; });
    }
    return initing;
  };

  /**
   * Track the hand in a frame: the <video> element, or a canvas copy of its current frame (the camera
   * source tracks the copy it also paints, so landmarks and pixels belong to the same frame).
   * @param {HTMLVideoElement|HTMLCanvasElement} source @param {number} tMs capture time of the frame
   * @returns {{image:{x:number,y:number,z:number}[], world:{x:number,y:number,z:number}[], handedness:'Left'|'Right'|null,
   *            neural:{label:'ROCK'|'PAPER'|'SCISSORS'|'NONE', score:number}, inferenceMs:number} | null} null = no hand
   */
  const detect = (source, tMs) => {
    const isVideo = typeof /** @type {any} */ (source).videoWidth === 'number';
    const width = isVideo ? /** @type {HTMLVideoElement} */ (source).videoWidth : /** @type {HTMLCanvasElement} */ (source).width;
    if (!ready || !recognizer || !(width > 0) || (isVideo && /** @type {HTMLVideoElement} */ (source).readyState < 2)) return null;
    // MediaPipe requires strictly increasing integer-millisecond timestamps
    let ts = Math.round(tMs);
    if (ts <= lastTs) ts = lastTs + 1;
    lastTs = ts;
    const t0 = performance.now();
    let res;
    try {
      res = recognizer.recognizeForVideo(source, ts);
      failures = 0;
    } catch (err) {
      hadHand = false;
      failures += 1;
      if (failures > MAX_FAILURES) { // self-heal: rebuild the recogniser, on the other delegate
        console.warn(`[beaTTer] hand tracker: re-initialising after repeated failures on the ${delegate} delegate`, err);
        avoid = delegate;
        ready = false; initing = null; failures = 0;
        try { recognizer.close(); } catch { /* ignore */ }
        recognizer = null; delegate = null;
        // if the rebuild fails too, tracking is gone: tell the application instead of dropping frames forever
        init().catch(() => { if (onFail) onFail(); });
      }
      return null;
    }
    const inferenceMs = performance.now() - t0;
    frames += 1; inferSum += inferenceMs;
    if (!res || !res.landmarks || !res.landmarks.length || !res.worldLandmarks || !res.worldLandmarks.length) {
      hadHand = false;
      return null;
    }
    const image = res.landmarks[0], world = res.worldLandmarks[0];
    if (!image || image.length < 21 || !world || world.length < 21) {
      hadHand = false;
      return null;
    }
    hadHand = true;
    const hd = res.handednesses && res.handednesses[0] && res.handednesses[0][0] ? res.handednesses[0][0].categoryName : null;
    const g = res.gestures && res.gestures[0] && res.gestures[0][0] ? res.gestures[0][0] : null;
    const label = g && /** @type {any} */ (LABELS)[g.categoryName] ? /** @type {any} */ (LABELS)[g.categoryName] : 'NONE';
    return {
      image: image.map((/** @type {any} */ p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
      world: world.map((/** @type {any} */ p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
      handedness: hd === 'Left' || hd === 'Right' ? hd : null,
      neural: { label, score: label === 'NONE' || !g ? 0 : g.score },
      inferenceMs,
    };
  };

  return {
    init, detect, whenReady,
    /** Tracking failed for good after it had been working. @param {() => void} fn */
    onFailure(fn) { onFail = fn; },
    get ready() { return ready; },
    /** The delegate in use ('GPU' | 'CPU'), null before the model has loaded. */
    get delegate() { return delegate; },
    stats: () => ({ frames, meanInferenceMs: frames ? inferSum / frames : null, delegate }),
    dispose() { ready = false; try { if (recognizer) recognizer.close(); } catch { /* ignore */ } recognizer = null; delegate = null; },
  };
}
