// @ts-check
/**
 * beaTTer v4 — frame sources.
 *
 *  - createDemoSource : a synthetic player (sim/) whose frames are released in real time; they go through
 *                       exactly the same engine as camera frames. Clearly labelled as simulation in the UI.
 *  - createCameraSource: camera frames -> hand tracker -> HandFrame.
 *
 * A source calls `onFrame(frame, display)` once per frame: `frame` is the HandFrame for the engine,
 * `display` carries what the renderers need (image landmarks for the skeleton).
 */

import { makeRng } from '../core/rng.js';
import { minJerk } from '../core/math.js';
import { simulateThrow } from '../sim/kinematic_player.js';
import { handLandmarks, rotationFromEuler } from '../sim/hand_model.js';
import { makePlayer } from '../sim/behaviour_players.js';
import { OneEuroFilter } from '../core/filters.js';

/** @typedef {import('../core/constants.js').HandFrame} HandFrame */

/**
 * @param {Object} o
 * @param {number} [o.seed]
 * @param {number} [o.speed]            time-lapse factor (1 = real time)
 * @param {number} [o.fps]
 * @param {string} [o.behaviour]        behaviour player kind
 * @param {string} [o.style]            opener style
 * @param {() => number} o.now          wall clock in ms (performance.now)
 * @param {(fn: () => void, ms: number) => any} [o.setTimer]
 * @param {(id: any) => void} [o.clearTimer]
 * @param {() => {phase:string, mode:'rps'|'mindtwin', primeBeats:number, metronome:boolean, beatTimes:number[]|null, hold?:boolean}} o.getContext   what the engine expects next
 */
export function createDemoSource(o) {
  // Default seed: chosen so that the first rounds of the showcase are valid rounds with all three throws
  // (seeds 20261111..20261510 were scanned, 153 qualified, this is the first of the most varied ones).
  // Only the opening is hand-picked: the long-run foul and win rates of the demo are those of the
  // simulator (docs/tez/06-deneyler.md), and ?seed=N plays any other sequence.
  const seed = o.seed ?? 20261112;
  const speed = o.speed && o.speed > 0 ? o.speed : 1;
  const fps = o.fps ?? 30;
  // separate streams: the throws of a seed are the same whatever the real-time pacing of the idle frames
  const kin = makeRng(seed), beh = makeRng(seed + 17), idle = makeRng(seed + 31);
  const player = makePlayer(o.behaviour ?? 'humanLike', beh);
  const hist = { P: /** @type {number[]} */ ([]), A: /** @type {number[]} */ ([]), O: /** @type {number[]} */ ([]) };
  const setTimer = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = o.clearTimer ?? ((id) => clearTimeout(id));
  /** @type {HandFrame[]} */ let queue = [];
  /** @type {any} */ let timer = null;
  let running = false;
  let index = 0;
  let wall0 = 0, sim0 = 0;
  let lastSimT = 0;
  let roundQueued = false;
  /** @type {(frame:HandFrame, display:{image:any, demo:true}) => void} */ let sink = () => {};
  const simNow = () => sim0 + (o.now() - wall0) * speed;
  const dt = 1000 / fps;
  const pose = rotationFromEuler(160, 25, 8);

  /** Idle frames: a resting fist (or a slowly moving hand in MindTwin mode). */
  const idleFrames = (/** @type {number} */ from, /** @type {number} */ ms, /** @type {'rps'|'mindtwin'} */ mode) => {
    const out = [];
    for (let t = from; t < from + ms; t += dt) {
      let e = [0.14, 0.03, 0.03, 0.03, 0.03];
      if (mode === 'mindtwin') {
        // fingers open and close one after another: something for the twin to forecast
        e = [0, 1, 2, 3, 4].map((f) => {
          const ph = (((t / 1000) * 0.55 + f * 0.13) % 1 + 1) % 1;
          return ph < 0.2 ? minJerk(ph / 0.2) : ph < 0.5 ? 1 : ph < 0.7 ? 1 - minJerk((ph - 0.5) / 0.2) : 0;
        });
      }
      const lm = handLandmarks({ e, R: pose, palmAt: { x: 0.66, y: mode === 'mindtwin' ? 0.5 : 0.36 }, unitsPerMetre: 2.4, noise: { worldSd: 0.0015, imageSd: 0.002 }, rng: idle });
      out.push({ t, index: 0, present: true, image: lm.image, world: lm.world, aspect: 4 / 3, handedness: /** @type {'Right'} */ ('Right'), neural: null });
    }
    return out;
  };

  const plan = () => {
    const ctx = o.getContext();
    const from = Math.max(simNow(), lastSimT + dt);
    if (ctx.mode === 'mindtwin') { queue.push(...idleFrames(from, 600, 'mindtwin')); return; }
    const led = !!(ctx.beatTimes && ctx.beatTimes.length === ctx.primeBeats + 1);
    // Without a metronome the engine waits for a throw while IDLE, and in single-stroke mode also while
    // ARMED: it arms by itself on a resting fist - on the waiting frames behind a dialog, or on frames still
    // owed from an aborted round when this player has fallen behind the clock. The queue is empty here, so
    // a planned throw has been played out in full; if the engine is still waiting, it did not take that
    // throw up, and the player throws (again) instead of both sides waiting for each other for good.
    const waiting = !ctx.metronome && (ctx.phase === 'IDLE' || (ctx.phase === 'ARMED' && ctx.primeBeats === 0));
    if (!ctx.hold && ((led && !roundQueued) || waiting)) {
      const move = /** @type {0|1|2} */ (player.next(hist));
      // metronome-led rounds follow the scheduled beats (with human-like asynchrony); self-paced rounds rest briefly first
      const beatTimes = led ? /** @type {number[]} */ (ctx.beatTimes).map((b) => b + kin.normal(0, 12)) : undefined;
      const t0 = led ? from : from + 500;
      if (!led) queue.push(...idleFrames(from, 500, 'rps'));
      const sim = simulateThrow({ move, rng: kin, fps, style: /** @type {any} */ (o.style ?? 'normal'), primeBeats: ctx.primeBeats, t0, beatTimes, cfg: { settleMs: 900, leadInMs: led ? 250 : 450 } });
      queue.push(...sim.frames);
      roundQueued = true;
    } else {
      queue.push(...idleFrames(from, 300, 'rps')); // waiting (result on screen, count-in not started, ...)
    }
  };

  const tick = () => {
    if (!running) return;
    const now = simNow();
    if (queue.length === 0) plan();
    let sent = 0;
    while (queue.length && queue[0].t <= now && sent < 8) {
      const f = /** @type {HandFrame} */ (queue.shift());
      if (f.t <= lastSimT) continue;
      lastSimT = f.t;
      f.index = index++;
      // one failing frame must not kill the loop: the timer below is the only thing that keeps it alive
      try { sink(f, { image: f.image, demo: true }); } catch (e) { console.error('[beaTTer] demo frame failed', e); }
      sent += 1;
    }
    timer = setTimer(tick, 6);
  };

  return {
    kind: /** @type {'demo'} */ ('demo'),
    /** Time-lapse factor: the frame clock runs this many times faster than the wall clock. */
    speed,
    /** @param {(frame:HandFrame, display:any) => void} onFrame */
    start(onFrame) {
      sink = onFrame; running = true; queue = [];
      wall0 = o.now(); sim0 = wall0; lastSimT = sim0 - dt;
      tick();
    },
    stop() { running = false; if (timer !== null) clearTimer(timer); timer = null; queue = []; },
    /** The controller reports each judged round so the synthetic player can react like a human would. @param {any} result */
    onResult(result) {
      if (result && result.valid) { hist.P.push(result.playerMove); hist.A.push(result.aiMove); hist.O.push(result.verdict === 'PLAYER' ? 1 : result.verdict === 'AI' ? -1 : 0); }
    },
    /** Call when the engine is back in IDLE (acknowledged / aborted): the next round may be planned. */
    onIdle() { roundQueued = false; queue = queue.filter((f) => f.t <= simNow() + 80); },
    /** Current time on the frame clock (for scheduling the metronome). */
    clock: () => simNow(),
  };
}

/**
 * Camera + hand tracker as a frame source.
 * @param {Object} o
 * @param {HTMLVideoElement} o.video
 * @param {ReturnType<typeof import('../platform/camera.js').createCamera>} o.camera
 * @param {ReturnType<typeof import('../platform/hand_tracker.js').createHandTracker>} o.tracker
 * @param {((meta:{t:number, now:number}) => void)|null} [o.afterFrame]  runs AFTER the engine has seen the
 *        frame (the face blur lives here: it must never delay a decision)
 * @param {(() => Promise<any>)|null} [o.beforeShow]  awaited before the source reports itself ready (the
 *        picture is not shown before the face detector has loaded or has definitely failed)
 */
export function createCameraSource({ video, camera, tracker, afterFrame = null, beforeShow = null }) {
  let index = 0;
  let running = false;
  /** @type {(frame:HandFrame, display:any) => void} */ let sink = () => {};
  /** @type {((code:string) => void)|null} */ let lost = null;
  // display-only smoothing of the skeleton (the engine always gets raw landmarks); tuned for normalised
  // image coordinates: speeds are ~0.5-3 units/s, so beta must be large for the cutoff to open up
  const filters = Array.from({ length: 42 }, () => new OneEuroFilter({ minCutoff: 2.0, beta: 12, dCutoff: 1.0 }));

  /** @param {{t:number, now:number}} meta */
  const onVideoFrame = (meta) => {
    if (running && tracker.ready) track(meta);
    if (afterFrame) { try { afterFrame(meta); } catch (e) { console.error('[beaTTer] frame hook failed', e); } }
  };

  /** @param {{t:number, now:number}} meta */
  const track = (meta) => {
    const out = tracker.detect(video, meta.t);
    const aspect = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 4 / 3;
    /** @type {HandFrame} */
    const frame = out
      ? { t: meta.t, index: index++, present: true, image: out.image, world: out.world, aspect, handedness: out.handedness, neural: out.neural }
      : { t: meta.t, index: index++, present: false, image: null, world: null, aspect, handedness: null, neural: null };
    let smooth = null;
    if (out) {
      smooth = out.image.map((p, i) => ({ x: filters[2 * i].filter(p.x, meta.t), y: filters[2 * i + 1].filter(p.y, meta.t), z: p.z }));
    } else {
      for (const f of filters) f.reset();
    }
    sink(frame, { image: smooth, demo: false, inferMs: out ? out.inferenceMs : null, latencyMs: Math.max(0, performance.now() - meta.t) });
  };

  return {
    kind: /** @type {'camera'} */ ('camera'),
    video,
    /**
     * Open the camera and make sure the tracker is loaded. Rejects with an Error carrying `.code`
     * (CAMERA_* from platform/camera.js, or TRACKER_FAILED).
     * @param {string|undefined} deviceId @param {(patch:any) => void} report boot-status patches for the UI
     */
    async open(deviceId, report) {
      const loading = tracker.ready ? Promise.resolve() : tracker.init();
      loading.catch(() => {}); // reported below; no unhandled rejection if the camera fails first
      report({ tracker: tracker.ready ? 'ready' : 'loading' });
      await camera.start(deviceId);
      camera.onFrame(onVideoFrame);
      report({ camera: 'on' });
      try { await loading; } catch (e) {
        // never keep the device open behind an error message
        camera.offFrame(onVideoFrame); camera.stop();
        const err = new Error(/** @type {any} */ (e)?.message ?? 'tracker'); /** @type {any} */ (err).code = 'TRACKER_FAILED'; throw err;
      }
      if (beforeShow) { try { await beforeShow(); } catch { /* the blur has its own fallbacks */ } }
      report({ tracker: 'ready' });
    },
    close() { running = false; lost = null; camera.offFrame(onVideoFrame); camera.stop(); },
    devices: () => camera.listDevices(),
    /** The device or the tracker stopped working after a successful start. @param {(code:string) => void} fn */
    onLost(fn) {
      lost = fn;
      camera.onLost((/** @type {string} */ code) => { if (lost) lost(code); });
      tracker.onFailure(() => { if (lost) lost('TRACKER_FAILED'); });
    },
    /** @param {(frame:HandFrame, display:any) => void} onFrame */
    start(onFrame) { sink = onFrame; running = true; },
    stop() { running = false; },
    onResult() {},
    onIdle() {},
    clock: () => performance.now(),
  };
}
