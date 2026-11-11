// @ts-check
/**
 * beaTTer v4 — camera adapter.
 *
 *  - acquisition with a constraint ladder (asks for 60 fps: it halves the worst-case sampling delay of the
 *    finger-opening onset) and precise error codes for the UI;
 *  - exactly one callback per camera frame, with the best available capture timestamp:
 *    requestVideoFrameCallback metadata (captureTime when the browser provides it for local cameras,
 *    otherwise presentationTime), falling back to requestAnimationFrame + currentTime change detection;
 *  - the device is released on pagehide and on stop();
 *  - starts are serialised: a start that was overtaken (by stop() or by a newer start) stops the stream
 *    it obtained instead of leaking it;
 *  - a device that ends (unplugged, taken by another application) or stops delivering frames while the
 *    page is visible is reported through onLost().
 *
 * Frames never leave the page: there is no upload or snapshot path anywhere in this module.
 */

/** @typedef {{t:number, now:number, mediaTime:number|null, presentedFrames:number|null}} FrameMeta */

/** @param {any} err @returns {{code:string, message:string}} */
function describe(err) {
  const name = err && err.name ? String(err.name) : '';
  const message = err && err.message ? String(err.message) : name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return { code: 'CAMERA_DENIED', message };
  if (name === 'NotReadableError' || name === 'TrackStartError' || /in use/i.test(message)) return { code: 'CAMERA_BUSY', message };
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return { code: 'CAMERA_MISSING', message };
  return { code: 'CAMERA_ERROR', message };
}

/**
 * @param {HTMLVideoElement} video
 */
export function createCamera(video) {
  /** @type {MediaStream|null} */ let stream = null;
  /** @type {Set<(meta: FrameMeta) => void>} */ const listeners = new Set();
  /** @type {Set<(code: string) => void>} */ const lostListeners = new Set();
  let loopId = 0;          // increments on every (re)start: stale callbacks see a different id and stop
  let startId = 0;         // increments on every start() and stop(): an overtaken start discards its stream
  let lastT = -Infinity;
  let lastMediaTime = -1;
  let lastFrameWall = 0;
  /** @type {any} */ let watchdog = null;
  const STALL_MS = 4000;

  const emit = (/** @type {number} */ t, /** @type {number} */ now, /** @type {number|null} */ mediaTime, /** @type {number|null} */ presented) => {
    if (!(t > lastT)) t = lastT + 0.01; // the engine needs strictly increasing times
    lastT = t;
    lastFrameWall = now;
    const meta = { t, now, mediaTime, presentedFrames: presented };
    for (const fn of listeners) { try { fn(meta); } catch (e) { console.error('[beaTTer] frame listener failed', e); } }
  };

  const startLoop = () => {
    const id = ++loopId;
    const v = /** @type {any} */ (video);
    if (typeof v.requestVideoFrameCallback === 'function') {
      const onFrame = (/** @type {number} */ now, /** @type {any} */ md) => {
        if (id !== loopId) return;
        // captureTime is on the performance.now() timebase; distrust it if it is absurdly far from "now"
        let t = md && Number.isFinite(md.captureTime) && Math.abs(now - md.captureTime) < 1000 ? md.captureTime : md && Number.isFinite(md.presentationTime) ? md.presentationTime : now;
        if (t > now + 5) t = now;
        emit(t, performance.now(), md && Number.isFinite(md.mediaTime) ? md.mediaTime : null, md && Number.isFinite(md.presentedFrames) ? md.presentedFrames : null);
        v.requestVideoFrameCallback(onFrame);
      };
      v.requestVideoFrameCallback(onFrame);
    } else {
      const tick = () => {
        if (id !== loopId) return;
        if (video.readyState >= 2 && !video.paused && video.currentTime !== lastMediaTime) {
          lastMediaTime = video.currentTime;
          const now = performance.now();
          emit(now, now, video.currentTime, null);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  const stopTracks = (/** @type {MediaStream|null} */ s) => { if (s) { for (const t of s.getTracks()) { try { t.stop(); } catch { /* ignore */ } } } };

  const stop = () => {
    loopId += 1; startId += 1;
    if (watchdog !== null) { clearInterval(watchdog); watchdog = null; }
    stopTracks(stream);
    stream = null;
    try { video.srcObject = null; } catch { /* ignore */ }
  };

  const reportLost = (/** @type {string} */ code) => {
    stop();
    for (const fn of lostListeners) { try { fn(code); } catch (e) { console.error('[beaTTer] camera listener failed', e); } }
  };

  /**
   * Acquire the camera and start delivering frames. Rejects with an Error carrying `.code`
   * (CAMERA_DENIED | CAMERA_BUSY | CAMERA_MISSING | CAMERA_UNSUPPORTED | CAMERA_ERROR).
   * @param {string} [deviceId]
   */
  const start = async (deviceId) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e = new Error('getUserMedia is not available (insecure context or unsupported browser)');
      /** @type {any} */ (e).code = 'CAMERA_UNSUPPORTED';
      throw e;
    }
    stop();
    const my = ++startId;
    const overtaken = () => { const e = new Error('camera start was overtaken'); /** @type {any} */ (e).code = 'CAMERA_SUPERSEDED'; return e; };
    const size = { width: { ideal: 640 }, height: { ideal: 480 } };
    /** @type {MediaStreamConstraints[]} */
    const ladder = [];
    if (deviceId) {
      ladder.push({ video: { deviceId: { exact: deviceId }, ...size, frameRate: { ideal: 60 } }, audio: false });
      ladder.push({ video: { deviceId: { exact: deviceId } }, audio: false });
    }
    ladder.push({ video: { facingMode: 'user', ...size, frameRate: { ideal: 60 } }, audio: false });
    ladder.push({ video: { facingMode: 'user', ...size }, audio: false });
    ladder.push({ video: true, audio: false });

    let lastErr = null;
    /** @type {MediaStream|null} */ let got = null;
    for (const constraints of ladder) {
      try {
        got = await navigator.mediaDevices.getUserMedia(constraints);
        if (my !== startId) { stopTracks(got); throw overtaken(); }
        break;
      } catch (err) {
        if (/** @type {any} */ (err) && /** @type {any} */ (err).code === 'CAMERA_SUPERSEDED') throw err;
        if (my !== startId) throw overtaken();
        lastErr = err;
        const d = describe(err);
        if (d.code === 'CAMERA_BUSY' || d.code === 'CAMERA_DENIED') break; // retrying other constraints cannot help
      }
    }
    if (!got) {
      const d = describe(lastErr);
      const e = new Error(d.message);
      /** @type {any} */ (e).code = d.code;
      throw e;
    }
    const mine = got;
    stream = mine;
    for (const track of mine.getVideoTracks()) track.addEventListener('ended', () => { if (stream === mine) reportLost('CAMERA_LOST'); });
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.srcObject = stream;
    await new Promise((resolve) => {
      if (video.readyState >= 2) { resolve(null); return; }
      const done = () => { video.removeEventListener('loadeddata', done); resolve(null); };
      video.addEventListener('loadeddata', done);
      setTimeout(done, 2000);
    });
    try { await video.play(); } catch { /* autoplay may need a gesture; the UI's start button is one */ }
    if (my !== startId || stream !== mine) { stopTracks(mine); throw overtaken(); }
    lastT = -Infinity; lastMediaTime = -1;
    lastFrameWall = performance.now();
    startLoop();
    // frames stop without an 'ended' event when the OS suspends capture: notice it while the page is visible
    watchdog = setInterval(() => {
      if (stream !== mine) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') { lastFrameWall = performance.now(); return; }
      if (performance.now() - lastFrameWall > STALL_MS) reportLost('CAMERA_LOST');
    }, 1000);
  };

  /** @returns {Promise<{id:string, label:string}[]>} */
  const listDevices = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Kamera ${i + 1}` }));
    } catch { return []; }
  };

  /** Actual track settings (the configured frame rate is not necessarily the delivered one). */
  const settings = () => {
    const track = stream ? stream.getVideoTracks()[0] : null;
    if (!track) return null;
    const s = track.getSettings();
    return { width: s.width ?? null, height: s.height ?? null, frameRate: s.frameRate ?? null, deviceId: s.deviceId ?? null, label: track.label };
  };

  if (typeof window !== 'undefined') window.addEventListener('pagehide', stop);

  return {
    start, stop, listDevices, settings,
    /** @param {(meta: FrameMeta) => void} fn */
    onFrame(fn) { listeners.add(fn); },
    /** @param {(meta: FrameMeta) => void} fn */
    offFrame(fn) { listeners.delete(fn); },
    /** The device ended or stalled after a successful start (the stream is already stopped). @param {(code: string) => void} fn */
    onLost(fn) { lostListeners.clear(); lostListeners.add(fn); },
    get active() { return !!stream; },
  };
}
