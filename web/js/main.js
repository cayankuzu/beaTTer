// @ts-check
/**
 * beaTTer v4 — boot and dependency wiring. No logic lives here.
 *
 * URL parameters:
 *   ?demo=1            start with the synthetic player ("kamerasız demo")
 *   &seed=N&speed=K    deterministic / time-lapse demo
 *   &auto=0            demo: do not advance rounds automatically (default: advance after 2.6 s)
 *   &cloud=1           allow the optional statistics sync on a development host (off there otherwise)
 */

import { createStore, initialState } from './app/store.js';
import { createStorage } from './platform/storage.js';
import { createController } from './app/controller.js';
import { createDemoSource, createCameraSource } from './app/sources.js';
import { createAudio } from './platform/audio.js';
import { createCloud } from './platform/cloud.js';
import { mountUI } from './ui/index.js';

/** Model files are cached for a long time; the version in the URL is what invalidates them. */
const MODEL_VERSION = '4.0.0';
const FACE_WAIT_MS = 6000;

const params = new URLSearchParams(location.search);
const num = (/** @type {string} */ k) => { const v = Number(params.get(k)); return params.has(k) && Number.isFinite(v) ? v : undefined; };

/** Development hosts: loopback, *.local and private address ranges (the LAN address of serve_web.py). */
function isDevelopmentHost(/** @type {string} */ host) {
  if (host === 'localhost' || host === '[::1]' || host.endsWith('.local') || host.endsWith('.localhost')) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

const storage = createStorage();
const store = createStore(initialState(storage.getSettings()));
const audio = createAudio();
// whether rounds are synced is decided in one place (controller.syncCloud); here only the transport is built
const cloud = createCloud({ enabled: false, onStatus: (/** @type {any} */ s) => { if (store.get().boot.source === 'camera') store.set({ cloud: s }); } });
const cloudAllowed = !isDevelopmentHost(location.hostname) || params.get('cloud') === '1';

const video = /** @type {HTMLVideoElement} */ (document.getElementById('camera-video'));
/** @type {any} */ let cameraSource = null;
/** @type {any} */ let privacy = null;

const setFace = (/** @type {'loading'|'ready'|'approx'} */ face) => store.set({ boot: { ...store.get().boot, face } });

/** Camera, tracker and face privacy are loaded on demand: the page works without them (demo, lab, settings). */
async function makeCameraSource() {
  if (cameraSource) return cameraSource;
  const [{ createCamera }, { createHandTracker, createFaceDetector }, { createFacePrivacy }] = await Promise.all([
    import('./platform/camera.js'), import('./platform/hand_tracker.js'), import('./platform/face_privacy.js'),
  ]);
  const camera = createCamera(video);
  const tracker = createHandTracker({ modelUrl: `./models/gesture_recognizer.task?v=${MODEL_VERSION}` });
  privacy = createFacePrivacy();
  privacy.setEnabled(store.get().settings.privacy);
  // The face detector loads in parallel with the hand tracker and is independent of it. Until it is
  // there - and for good if it fails - the blur works from its fallback zones, and the UI says
  // "approximate" instead of claiming a detected face.
  setFace('loading');
  const face = createFaceDetector({ modelUrl: `./models/blaze_face_short_range.tflite?v=${MODEL_VERSION}` })
    .then((fd) => { privacy.setDetector(fd); setFace('ready'); }, () => { privacy.setDetector(null); setFace('approx'); });
  cameraSource = createCameraSource({
    video, camera, tracker,
    // after the engine has seen the frame: the blur never delays a decision
    afterFrame: (meta) => privacy.update(video, meta.t),
    // the picture is uncovered only when the detector is ready or has definitely failed (or after a grace period)
    beforeShow: () => Promise.race([face, new Promise((resolve) => setTimeout(resolve, FACE_WAIT_MS))]).then(() => { if (!privacy.hasDetector) setFace('approx'); }),
  });
  return cameraSource;
}

const demoRequested = params.has('demo') && params.get('demo') !== '0';
const controller = createController({
  store, storage, audio, cloud,
  now: () => performance.now(),
  makeDemoSource: (o) => createDemoSource(o),
  makeCameraSource,
  options: {
    autoAdvanceMs: params.get('auto') === '0' ? null : 2600,
    cloudAllowed,
    demo: { seed: num('seed'), speed: num('speed') },
  },
});

store.subscribe((s) => s.settings.privacy, (on) => { if (privacy) privacy.setEnabled(on); });

mountUI(/** @type {HTMLElement} */ (document.getElementById('app')), {
  store,
  actions: controller.actions,
  frame: controller.frame,
  /** face-privacy painter for the camera canvas, or null while the camera has never been started */
  privacy: () => privacy,
  unlockAudio: () => audio.unlock(),
});

window.addEventListener('pagehide', () => controller.dispose());
// a page restored from the back/forward cache has a disposed controller and a stopped camera: start clean
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
if (demoRequested) controller.actions.startDemo();
else if (!store.get().settings.onboarded) controller.actions.openPanel('onboarding');

// handy for manual inspection and for the automated browser checks
Object.assign(window, { __beatter: { store, controller } });
