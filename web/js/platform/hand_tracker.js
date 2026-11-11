// @ts-check
/**
 * beaTTer v4 — hand tracker adapter (MediaPipe Tasks Vision: GestureRecognizer = hand landmarks + a
 * canned gesture label) and the face detector used by the privacy blur.
 *
 * MediaPipe Hands gives 21 landmarks per hand: image coordinates normalised by width/height and "world"
 * coordinates in metres with the origin at the hand's centre [Zhang2020]. The engine receives them RAW —
 * no smoothing here: the opening detector needs independent per-frame noise.
 *
 * The library is loaded with a dynamic import, so the rest of the app (demo mode, lab, settings) works
 * even when the CDN is unreachable. CPU (XNNPACK) first, GPU as fallback, as in production before.
 */

const VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const LABELS = Object.freeze({ Closed_Fist: 'ROCK', Open_Palm: 'PAPER', Victory: 'SCISSORS' });
/** Low on purpose: keeps the hand tracked through motion blur on fast strokes. */
const MIN_CONFIDENCE = 0.28;

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
  let ready = false;
  let lastTs = 0;
  let failures = 0;
  let frames = 0, inferSum = 0;
  /** @type {Promise<void>|null} */ let initing = null;
  /** @type {(v?:any) => void} */ let resolveReady = () => {};
  const whenReady = new Promise((res) => { resolveReady = res; });
  /** @type {(() => void)|null} */ let onFail = null;

  const create = async (/** @type {'CPU'|'GPU'} */ delegate) => {
    const { lib, vision } = await loadVision();
    return lib.GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelUrl, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: MIN_CONFIDENCE,
      minHandPresenceConfidence: MIN_CONFIDENCE,
      minTrackingConfidence: MIN_CONFIDENCE,
    });
  };

  /** Load the model (idempotent). Rejects if both delegates fail. */
  const init = () => {
    if (ready) return Promise.resolve();
    if (!initing) {
      initing = (async () => {
        try {
          recognizer = await create('CPU');
        } catch (cpuErr) {
          console.warn('[beaTTer] hand tracker: CPU delegate failed, trying GPU', cpuErr);
          recognizer = await create('GPU');
        }
        ready = true; failures = 0;
        resolveReady();
      })();
      initing.catch(() => { initing = null; });
    }
    return initing;
  };

  /**
   * Track the hand in the current video frame.
   * @param {HTMLVideoElement} video @param {number} tMs capture time of the frame
   * @returns {{image:{x:number,y:number,z:number}[], world:{x:number,y:number,z:number}[], handedness:'Left'|'Right'|null,
   *            neural:{label:'ROCK'|'PAPER'|'SCISSORS'|'NONE', score:number}, inferenceMs:number} | null} null = no hand
   */
  const detect = (video, tMs) => {
    if (!ready || !recognizer || video.readyState < 2 || video.videoWidth === 0) return null;
    // MediaPipe requires strictly increasing integer-millisecond timestamps
    let ts = Math.round(tMs);
    if (ts <= lastTs) ts = lastTs + 1;
    lastTs = ts;
    const t0 = performance.now();
    let res;
    try {
      res = recognizer.recognizeForVideo(video, ts);
      failures = 0;
    } catch (err) {
      failures += 1;
      if (failures > 15) { // self-heal: rebuild the recogniser after repeated internal failures
        console.warn('[beaTTer] hand tracker: re-initialising after repeated failures', err);
        ready = false; initing = null; failures = 0;
        try { recognizer.close(); } catch { /* ignore */ }
        recognizer = null;
        // if the rebuild fails too, tracking is gone: tell the application instead of dropping frames forever
        init().catch(() => { if (onFail) onFail(); });
      }
      return null;
    }
    const inferenceMs = performance.now() - t0;
    frames += 1; inferSum += inferenceMs;
    if (!res || !res.landmarks || res.landmarks.length === 0 || !res.worldLandmarks || res.worldLandmarks.length === 0) return null;
    const image = res.landmarks[0], world = res.worldLandmarks[0];
    if (!image || image.length < 21 || !world || world.length < 21) return null;
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
    stats: () => ({ frames, meanInferenceMs: frames ? inferSum / frames : null }),
    dispose() { ready = false; try { if (recognizer) recognizer.close(); } catch { /* ignore */ } recognizer = null; },
  };
}

/**
 * BlazeFace short-range face detector [Bazarevsky2019] for the privacy blur.
 * @param {{modelUrl:string}} o
 * @returns {Promise<{detect:(video:HTMLVideoElement, tMs:number) => any[]}>}
 */
export async function createFaceDetector({ modelUrl }) {
  const { lib, vision } = await loadVision();
  const make = (/** @type {'CPU'|'GPU'} */ delegate) => lib.FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelUrl, delegate }, runningMode: 'VIDEO', minDetectionConfidence: 0.16,
  });
  let detector;
  try { detector = await make('CPU'); } catch { detector = await make('GPU'); }
  let lastTs = 0;
  return {
    detect(video, tMs) {
      let ts = Math.round(tMs);
      if (ts <= lastTs) ts = lastTs + 1;
      lastTs = ts;
      try {
        const r = detector.detectForVideo(video, ts);
        return r && r.detections ? r.detections : [];
      } catch { return []; }
    },
  };
}
