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

/**
 * Camera, tracker and the privacy painter are loaded on demand: the page works without them (demo, lab,
 * settings). Privacy needs no detector: the whole picture is defocused and only the tracked hand is kept
 * sharp (platform/hand_focus.js), so nothing has to load before the picture may be shown.
 */
async function makeCameraSource() {
  if (cameraSource) return cameraSource;
  const [{ createCamera }, { createHandTracker }, { createHandFocus }] = await Promise.all([
    import('./platform/camera.js'), import('./platform/hand_tracker.js'), import('./platform/hand_focus.js'),
  ]);
  const camera = createCamera(video);
  const tracker = createHandTracker({ modelUrl: `./models/gesture_recognizer.task?v=${MODEL_VERSION}` });
  privacy = createHandFocus();
  privacy.setEnabled(store.get().settings.privacy);
  cameraSource = createCameraSource({ video, camera, tracker });
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

// On local/LAN development hosts, automatically save every real camera round to /.local_telemetry
// so playtest rounds can be inspected without manual file downloads.
if (isDevelopmentHost(location.hostname)) {
  let lastSavedRound = -1;
  let lastSavedToast = -1;
  store.subscribe((s) => s.result, (res) => {
    if (!res || res.simulated || res.round === lastSavedRound) return;
    lastSavedRound = res.round;
    fetch('/__local_telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: res, session: controller.actions.exportData() }),
    }).catch(() => {});
  });
  store.subscribe((s) => s.ui.toast, (t) => {
    if (!t || t.id === lastSavedToast || store.get().boot.source !== 'camera') return;
    lastSavedToast = t.id;
    if (typeof t.code === 'string' && t.code.startsWith('ABORT_')) {
      fetch('/__local_telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: { event: 'ABORT', code: t.code, params: t.params, at: new Date().toISOString() }, session: controller.actions.exportData() }),
      }).catch(() => {});
    }
  });
}

mountUI(/** @type {HTMLElement} */ (document.getElementById('app')), {
  store,
  actions: controller.actions,
  frame: controller.frame,
  /** privacy painter for the camera canvas (everything defocused but the hand), or null before the camera was first started */
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

// OTA (Over-The-Air) live version watcher: polls ./version.json and notifies active players when a new
// AI build or calibration update has been deployed so they can refresh with one tap.
{
  /** @type {string|null} */ let currentBuildId = null;
  /** @type {HTMLElement|null} */ let bannerEl = null;

  const showOtaBanner = (/** @type {string} */ ver, /** @type {string} */ note) => {
    if (bannerEl) return;
    bannerEl = document.createElement('div');
    bannerEl.className = 'ota-banner';
    bannerEl.setAttribute('role', 'status');
    const txt = document.createElement('span');
    txt.textContent = `⚡ Yeni sürüm hazır (${ver})${note ? ` · ${note}` : ''}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ota-banner__btn';
    btn.textContent = 'Şimdi Yenile';
    btn.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('v', String(Date.now()));
      location.replace(url.toString());
    });
    bannerEl.append(txt, btn);
    document.body.appendChild(bannerEl);
  };

  const checkVersion = async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || typeof data.buildId !== 'string') return;
      if (currentBuildId === null) {
        currentBuildId = data.buildId;
      } else if (data.buildId !== currentBuildId) {
        showOtaBanner(data.version || 'Yeni', data.note || '');
      }
    } catch { /* offline or transient error */ }
  };

  checkVersion();
  setInterval(checkVersion, 35000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
  Object.assign(window.__beatter, { showOtaBanner, checkVersion });
}
