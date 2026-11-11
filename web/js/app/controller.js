// @ts-check
/**
 * beaTTer v4 — application controller: owns the engine, the player model, the frame source and the game
 * flow, and publishes everything the views render into the store. It contains no science and no DOM.
 *
 * Frame pipeline (one call per camera frame, never per display frame):
 *     source -> HandFrame -> engine.pushFrame -> events -> store
 *
 * Life-cycle rules that keep the honesty invariants intact outside the engine:
 *  - one commit log per page session; every engine built on it continues the round numbering;
 *  - exactly one frame source at a time. Every start/stop bumps a generation counter, and an
 *    asynchronous camera start that finds a newer generation releases the device and does nothing else
 *    (so a demo started meanwhile can never be judged, stored or uploaded as the real player);
 *  - numbers that were measured on the camera (inference time, latency) are dropped with the camera.
 */

import { createCommitLog } from '../core/commit.js';
import { createPlayerModel } from '../core/player_model.js';
import { createRoundEngine } from '../core/round_engine.js';
import { createTwinPredictor } from '../core/mindtwin.js';
import { frameFeatures } from '../core/kinematics.js';
import { cryptoRng, randomBytesHex } from '../core/rng.js';
import { sha256Hex, sha256HexAsync } from '../core/sha256.js';
import { MOVES } from '../core/constants.js';
import { emptyLive, emptySeries } from './store.js';

const SENSITIVITY = [0.6, 0.8, 1, 1.25, 1.5];
const SNAPSHOT_MS = 50;      // store updates of the live snapshot are throttled to 20 Hz
const LIVE_CAP = 240;        // samples kept for the live timeline
const ENGINE_KEYS = ['primeBeats', 'rhythm', 'metronomeBpm', 'sensitivity', 'freezeLeadMs', 'seriesLength'];
const ROUND_LOG_CAP = 2000;  // judged rounds of this page session kept for the export

/** A judged round without its sample traces and seal payloads (those are in the commit log). */
const compactRound = (/** @type {any} */ r) => {
  const { trace, commits, ...rest } = r;
  void trace;
  return {
    ...rest,
    commits: commits.map((/** @type {any} */ c) => ({ seq: c.seq, reason: c.reason, frame: c.frame, t: c.t, move: c.move, postLanding: c.postLanding, verified: c.verified, leadMs: c.leadMs, sealLatencyMs: c.sealLatencyMs })),
  };
};

const freshPerf = () => ({ fps: /** @type {number|null} */ (null), inferMs: /** @type {number|null} */ (null), engineMs: /** @type {number|null} */ (null), latencyMs: /** @type {number|null} */ (null) });
const ema = (/** @type {number|null} */ old, /** @type {number} */ x) => (old === null ? x : old + 0.1 * (x - old));

/**
 * @param {Object} deps
 * @param {ReturnType<typeof import('./store.js').createStore>} deps.store
 * @param {ReturnType<typeof import('../platform/storage.js').createStorage>} deps.storage
 * @param {any} deps.audio                       platform/audio.js (or a stub)
 * @param {any} [deps.cloud]                     platform/cloud.js (or undefined)
 * @param {() => number} deps.now                performance.now
 * @param {(opts:any) => any} deps.makeDemoSource
 * @param {(() => Promise<any>)|null} [deps.makeCameraSource]  resolves to a camera source (browser only)
 * @param {{autoAdvanceMs?: number|null, cloudAllowed?: boolean, demo?: {seed?:number, speed?:number, behaviour?:string, style?:string}}} [deps.options]
 *        cloudAllowed: false keeps the optional sync off whatever the setting says (development hosts)
 */
export function createController({ store, storage, audio, cloud, now, makeDemoSource, makeCameraSource = null, options = {} }) {
  const sessionId = randomBytesHex(8);
  // the injected clock stamps every seal with the wall time at which its hash came into existence
  const commitLog = createCommitLog({ sessionId, now });
  const rng = cryptoRng();
  const cloudAllowed = options.cloudAllowed !== false;
  const auto = () => !!options.autoAdvanceMs && isDemo;

  /** @type {ReturnType<typeof createPlayerModel>} */ let player = createPlayerModel();
  /** @type {ReturnType<typeof createRoundEngine>} */ let engine;
  let twin = createTwinPredictor();
  /** @type {any} */ let source = null;
  /** @type {any} */ let display = { image: null, demo: false };
  let lastSnapshotAt = -Infinity;
  /** @type {number[]} */ let frameTimes = [];
  let perf = freshPerf();
  /** @type {any} */ let autoTimer = null;
  /** @type {number[]|null} */ let beatTimes = null;
  /** seq -> ms between the capture of the frame a seal is based on and the moment its hash existed (camera only) */
  /** @type {Map<number, number>} */ const sealLatency = new Map();
  /** Every round judged in this page session (camera and demo, each marked), for the export. Never persisted. */
  /** @type {any[]} */ const roundLog = [];
  let toastId = 0;
  let isDemo = false;
  let gen = 0;        // generation of the frame source
  let camGen = 0;     // generation of camera starts (a newer start owns the device)
  let cloudOn = false; // the one place that says whether rounds are uploaded (see syncCloud)

  const S = () => store.get();
  const settings = () => S().settings;

  const clearAuto = () => { if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; } };
  const later = (/** @type {() => void} */ fn, /** @type {number} */ ms) => { clearAuto(); autoTimer = setTimeout(() => { autoTimer = null; fn(); }, ms); };
  /** Demo with auto-advance in metronome mode: nobody presses the button, so the count-in starts itself. */
  const autoCountIn = (/** @type {number} */ ms) => {
    if (auto() && settings().rhythm === 'metronome' && S().mode === 'rps') later(() => { if (!S().result && S().ui.panel === null) actions.primary(); }, ms);
  };

  // ------------------------------------------------------------------------------------- engine set-up
  const buildEngine = () => {
    const st = settings();
    engine = createRoundEngine({
      player, commitLog, rng,
      cfg: { rules: st.rules, primeBeats: st.primeBeats, sensitivity: SENSITIVITY[st.sensitivity - 1] ?? 1, freezeLeadMs: st.freezeLeadMs },
    });
    engine.setMode({ primeBeats: st.primeBeats, metronome: st.rhythm === 'metronome' ? { periodMs: 60000 / st.metronomeBpm } : null });
    beatTimes = null;
  };

  const loadPlayer = () => {
    player = createPlayerModel();
    const id = storage.activeProfileId();
    if (!isDemo) player.load(storage.loadPlayer(id));
    const list = storage.listProfiles();
    const me = list.find((p) => p.id === id);
    store.set({
      player: { id, tag: isDemo ? 'Sentetik oyuncu' : me ? me.tag : storage.tagOf(id), rounds: player.rounds },
      metrics: player.metrics.summary(), profile: player.profile(),
      boot: { ...S().boot, storage: storage.available },
    });
  };

  /** The optional statistics sync is on only for the real player, with consent, on an allowed host. */
  const syncCloud = () => {
    cloudOn = !!cloud && settings().cloud && cloudAllowed && !isDemo;
    if (cloud) cloud.setEnabled(cloudOn);
    store.set({ cloud: cloudOn && cloud ? cloud.status() : 'off' });
  };

  const toast = (/** @type {string} */ code, /** @type {any} */ params = {}) => store.set({ ui: { ...S().ui, toast: { id: ++toastId, code, params } } });

  // -------------------------------------------------------------------------------------------- frames
  const fpsNow = () => (frameTimes.length > 1 ? (1000 * (frameTimes.length - 1)) / (frameTimes[frameTimes.length - 1] - frameTimes[0]) : null);

  const publishSnapshot = (/** @type {boolean} */ force) => {
    const t = now();
    if (!force && t - lastSnapshotAt < SNAPSHOT_MS) return;
    lastSnapshotAt = t;
    store.set({ engine: engine.snapshot(), perf: { ...perf, fps: fpsNow() } });
  };

  const appendLive = (/** @type {any} */ frame) => {
    const snap = engine.snapshot();
    if (!snap.hand || (snap.phase !== 'PRIMING' && snap.phase !== 'FLIGHT' && snap.phase !== 'ARMED' && snap.phase !== 'SETTLING')) return;
    const live = S().live;
    live.t.push(frame.t); live.cy.push(snap.hand.strokeY); live.uF.push(snap.hand.uF ?? 0); live.uB.push(snap.hand.uB ?? 0);
    if (live.t.length > LIVE_CAP) { live.t.shift(); live.cy.shift(); live.uF.shift(); live.uB.shift(); }
    live.tLandHat = snap.tLandHat; live.now = frame.t;
  };

  const handleEvents = (/** @type {any[]} */ events) => {
    for (const e of events) {
      switch (e.type) {
        case 'beat': {
          if (e.n === 1 && !e.scheduled) store.set({ live: { ...emptyLive(), round: engine.snapshot().round, t0: e.t } });
          S().live.beats.push({ n: e.n, t: e.t });
          if (!e.scheduled) audio.beat(e.n); // scheduled beats were already scheduled on the audio clock
          break;
        }
        case 'flightStart':
          if (S().live.round !== e.round || S().live.t0 === null) store.set({ live: { ...emptyLive(), round: e.round, t0: e.t } });
          S().live.flightT = e.t;
          break;
        case 'commit':
          // wall-clock age of the evidence at the moment the hash existed (camera frames carry capture times)
          if (!isDemo) sealLatency.set(e.commit.seq, Math.max(0, now() - e.commit.t));
          S().live.commits.push({ seq: e.commit.seq, t: e.commit.t, reason: e.reason, short: e.commit.short });
          audio.seal(e.reason !== 'BEHAVIOUR');
          break;
        case 'landing':
          S().live.landingT = e.t;
          audio.landing();
          break;
        case 'result':
          onResult(e.result);
          break;
        case 'aborted':
          beatTimes = null;
          if (audio.cancelMetronome) audio.cancelMetronome();
          store.set({ live: emptyLive() });
          // the seals of an aborted round were opened and verified by the engine (I3): say so
          if (e.reason === 'ENGINE_ERROR') console.error('[beaTTer] a seal could not be made; the round was aborted', e.detail ?? '');
          toast(e.reason === 'HAND_LOST' ? 'ABORT_HAND_LOST' : e.reason === 'RHYTHM_TIMEOUT' ? 'ABORT_RHYTHM' : e.reason === 'ENGINE_ERROR' ? 'ENGINE_ERROR' : 'ABORT_MANUAL',
            { seals: Array.isArray(e.commits) ? e.commits.length : 0, sealOk: e.sealOk !== false && e.chainOk !== false });
          if (source) source.onIdle();
          autoCountIn(900);
          break;
        default:
          break;
      }
    }
  };

  const onResult = (/** @type {any} */ raw) => {
    beatTimes = null;
    // wall-clock view of the lead (camera only): how long before the landing the judged hash existed
    const judgedLatency = sealLatency.has(raw.judgedSeq) ? /** @type {number} */ (sealLatency.get(raw.judgedSeq)) : null;
    const lead = raw.timing.leadToLandingMs;
    const result = {
      ...raw,
      simulated: isDemo,
      commits: raw.commits.map((/** @type {any} */ c) => ({ ...c, sealLatencyMs: sealLatency.has(c.seq) ? Math.round(/** @type {number} */ (sealLatency.get(c.seq)) * 10) / 10 : null })),
      timing: {
        ...raw.timing,
        sealLatencyMs: judgedLatency === null ? null : Math.round(judgedLatency * 10) / 10,
        wallLeadMs: judgedLatency === null || !Number.isFinite(lead) ? null : Math.round((lead - judgedLatency) * 10) / 10,
      },
    };
    sealLatency.clear();
    roundLog.push(compactRound(result));
    if (roundLog.length > ROUND_LOG_CAP) roundLog.shift();
    const series = { ...S().series, rounds: S().series.rounds.slice() };
    if (result.valid) {
      if (result.verdict === 'AI') series.ai += 1; else if (result.verdict === 'PLAYER') series.player += 1; else series.ties += 1;
      series.rounds.push({ verdict: result.verdict, playerMove: result.playerMove, aiMove: result.aiMove, leadMs: result.timing.leadToLandingMs, progress: result.progressAtCommit, sealOk: result.sealOk && result.chainOk, short: result.commits.length ? result.commits[result.commits.length - 1].short : '' });
      if (series.rounds.length >= series.length) series.done = true;
    } else if (result.verdict === 'FOUL_LATE') {
      series.fouls += 1;
    }
    store.set({
      result, series,
      metrics: player.metrics.summary(), profile: player.profile(),
      player: { ...S().player, rounds: player.rounds },
      engine: engine.snapshot(),
    });
    audio.verdict(result.verdict);
    if (settings().voice) audio.speakVerdict(result);
    if (!isDemo) {
      storage.savePlayer(S().player.id, player.toJSON());
      if (!storage.available && S().boot.storage) store.set({ boot: { ...S().boot, storage: false } });
      if (cloudOn && cloud && result.valid) cloud.pushRound(S().player.id, result, player.metrics.summary());
    }
    if (source) source.onResult(result);
    if (auto()) later(() => actions.nextRound(), /** @type {number} */ (options.autoAdvanceMs));
  };

  /** An engine exception must never freeze the game: drop the round, rebuild the engine, tell the player. */
  const recover = (/** @type {unknown} */ err) => {
    console.error('[beaTTer] engine error', err);
    try { engine.abortRound('MANUAL'); } catch { /* the engine is being replaced anyway */ }
    buildEngine();
    store.set({ result: null, live: emptyLive(), engine: engine.snapshot() });
    toast('ENGINE_ERROR');
    if (source) source.onIdle();
  };

  /** @param {import('../core/constants.js').HandFrame} frame @param {any} disp */
  const onFrame = (frame, disp) => {
    display = disp;
    frameTimes.push(frame.t);
    if (frameTimes.length > 45) frameTimes.shift();
    const t0 = now();
    if (disp.inferMs != null) perf.inferMs = ema(perf.inferMs, disp.inferMs);
    if (disp.latencyMs != null) perf.latencyMs = ema(perf.latencyMs, disp.latencyMs);
    // the tracker may have been rebuilt on the other processor (GPU <-> CPU): the status follows it
    if (disp.delegate && disp.delegate !== S().boot.delegate) store.set({ boot: { ...S().boot, delegate: disp.delegate } });
    if (S().mode === 'mindtwin') {
      const s = frameFeatures(frame, player.calibration);
      const out = s ? twin.push(s.t, s.e) : null;
      if (now() - lastSnapshotAt >= SNAPSHOT_MS) {
        lastSnapshotAt = now();
        store.set({ twin: out ? { now: out.now, ahead: out.ahead, aheadSd: out.aheadSd, skill: twin.skill(), present: true } : { now: null, ahead: null, aheadSd: null, skill: twin.skill(), present: false }, perf: { ...perf, fps: fpsNow() } });
      }
      return;
    }
    /** @type {any[]} */ let events;
    try { events = engine.pushFrame(frame); } catch (err) { recover(err); return; }
    appendLive(frame);
    if (events.length) handleEvents(events);
    perf.engineMs = ema(perf.engineMs, now() - t0);
    publishSnapshot(events.length > 0);
  };

  // ------------------------------------------------------------------------------------------- sources
  /** Stop whatever delivers frames. A camera source also releases its device. */
  const stopSource = () => {
    gen += 1;
    clearAuto();
    if (audio.cancelMetronome) audio.cancelMetronome();
    const src = source;
    source = null; display = { image: null, demo: false }; frameTimes = []; perf = freshPerf(); sealLatency.clear();
    if (src) {
      try { src.stop(); } catch { /* ignore */ }
      if (src.kind === 'camera' && src.close) { try { src.close(); } catch { /* ignore */ } }
    }
    store.set({ perf: { ...perf } });
  };

  const resetRoundState = () => {
    clearAuto();
    if (audio.cancelMetronome) audio.cancelMetronome();
    if (engine) { try { engine.abortRound('MANUAL'); } catch { /* replaced below */ } }
    buildEngine();
    sealLatency.clear();
    store.set({
      result: null, live: emptyLive(), series: emptySeries(settings().seriesLength), engine: engine.snapshot(), twin: null,
      ui: { ...S().ui, panel: S().ui.panel === 'series' ? null : S().ui.panel },
    });
  };

  /** The camera stopped delivering (unplugged, taken by another app, tracker died): show the error gate. */
  const onCameraLost = (/** @type {string} */ code) => {
    if (!source || source.kind !== 'camera') return;
    stopSource();
    resetRoundState();
    store.set({ boot: { ...S().boot, camera: 'error', source: 'none', cameraError: { code: code || 'CAMERA_LOST', detail: '' }, tracker: code === 'TRACKER_FAILED' ? 'error' : S().boot.tracker } });
  };

  // ------------------------------------------------------------------------------------------- actions
  const actions = {
    /** Start the synthetic player ("Kamerasız demo"). Uses its own in-memory player model. */
    startDemo(/** @type {any} */ opts = {}) {
      stopSource();                       // releases the camera if it was on; cancels a pending camera start
      storage.flushAll();
      isDemo = true;
      loadPlayer();
      twin = createTwinPredictor();
      resetRoundState();
      const src = makeDemoSource({
        ...(options.demo ?? {}), ...opts, now,
        // hold: the synthetic player waits while a panel covers the arena (nothing is played behind a dialog)
        getContext: () => ({ phase: engine.phase, mode: S().mode, primeBeats: settings().primeBeats, metronome: settings().rhythm === 'metronome', beatTimes, hold: S().ui.panel !== null }),
      });
      source = src;
      store.set({ boot: { ...S().boot, source: 'demo', camera: 'idle', cameraError: null } });
      syncCloud();
      src.start(onFrame);
      autoCountIn(600);
    },
    stopDemo() {
      if (!source || source.kind !== 'demo') return;
      stopSource();
      isDemo = false;
      loadPlayer();
      resetRoundState();
      store.set({ boot: { ...S().boot, source: 'none' } });
      syncCloud();
    },
    /** Ask for the camera and start tracking. @param {string} [deviceId] */
    async startCamera(deviceId) {
      if (!makeCameraSource) { store.set({ boot: { ...S().boot, camera: 'error', cameraError: { code: 'CAMERA_UNSUPPORTED', detail: '' } } }); return false; }
      const wasDemo = isDemo;
      stopSource();
      if (wasDemo) { isDemo = false; loadPlayer(); resetRoundState(); }
      const my = gen, cam = ++camGen;
      const current = () => my === gen;
      store.set({ boot: { ...S().boot, source: 'none', camera: 'starting', cameraError: null, tracker: S().boot.tracker === 'ready' ? 'ready' : 'loading' } });
      /** @type {any} */ let src = null;
      try {
        src = await makeCameraSource();
        if (!current()) return false;
        await src.open(deviceId, (/** @type {any} */ patch) => { if (current()) store.set({ boot: { ...S().boot, ...patch } }); });
        if (!current()) {
          // superseded while the permission prompt or the model download was pending: unless a newer
          // camera start owns the device now, give it back
          if (cam === camGen) src.close();
          return false;
        }
        isDemo = false;
        loadPlayer();
        resetRoundState();
        const devices = src.devices ? await src.devices() : [];
        if (!current()) { if (cam === camGen) src.close(); return false; }
        source = src;
        if (src.onLost) src.onLost(onCameraLost);
        store.set({ boot: { ...S().boot, camera: 'on', cameraError: null, tracker: 'ready', source: 'camera', devices } });
        syncCloud();
        src.start(onFrame);
        return true;
      } catch (err) {
        const e = /** @type {any} */ (err);
        // never leave the device on behind an error message
        if (src && cam === camGen) { try { src.close(); } catch { /* ignore */ } }
        if (!current()) return false;
        const tracker = e && e.code === 'TRACKER_FAILED' ? 'error' : S().boot.tracker === 'loading' ? 'idle' : S().boot.tracker;
        store.set({ boot: { ...S().boot, camera: 'error', source: 'none', cameraError: { code: e && e.code ? e.code : 'CAMERA_ERROR', detail: e && e.message ? String(e.message) : '' }, tracker } });
        return false;
      }
    },
    stopCamera() {
      const wasCamera = !!source && source.kind === 'camera';
      const pending = S().boot.camera === 'starting';
      if (!wasCamera && !pending) return;
      stopSource();                       // also invalidates a start that is still waiting
      if (wasCamera) resetRoundState();
      store.set({ boot: { ...S().boot, camera: 'idle', source: 'none', cameraError: null } });
    },
    /** @param {'rps'|'mindtwin'} mode */
    setMode(mode) {
      if (mode !== 'rps' && mode !== 'mindtwin') return;
      twin = createTwinPredictor();
      store.set({ mode });
      resetRoundState();
      if (source) source.onIdle();
      audio.modeSwitch();
      autoCountIn(600);
    },
    /** @param {string} key @param {any} value */
    setSetting(key, value) {
      const next = storage.setSettings({ [key]: value });
      store.set({ settings: next, boot: { ...S().boot, storage: storage.available } });
      if (key === 'muted') audio.setMuted(next.muted);
      if (key === 'rules') { engine.setRules(next.rules); store.set({ engine: engine.snapshot() }); }
      if (ENGINE_KEYS.includes(key)) { resetRoundState(); if (source) source.onIdle(); autoCountIn(600); }
      if (key === 'cloud') syncCloud();
    },
    /** The one big button / Space: next round when a result is shown, otherwise start the count-in. */
    primary() {
      if (S().result) { actions.nextRound(); return; }
      if (S().ui.panel === 'series') { actions.newSeries(); return; }
      if (S().mode !== 'rps' || !source) return;
      if (settings().rhythm === 'metronome' && engine.phase === 'IDLE') {
        const clock = source.clock();
        const sched = engine.armMetronome(clock);
        if (sched) {
          beatTimes = sched.beatTimes;
          store.set({ live: { ...emptyLive(), round: engine.snapshot().round, t0: clock }, engine: engine.snapshot() });
          // the frame clock of a time-lapse demo runs `speed` times faster than the audio clock
          const speed = source.speed && source.speed > 0 ? source.speed : 1;
          audio.scheduleMetronome(sched.beatTimes.map((/** @type {number} */ b) => (b - clock) / speed), settings().voice);
        }
      }
    },
    /** Close the report and continue (or show the series summary). */
    nextRound() {
      clearAuto();
      if (!S().result) return;
      if (S().series.done) {
        // A finished series takes no further round: the engine stays in RESOLVED behind the summary
        // until a new series is started (button, Space, or closing the summary).
        store.set({ result: null, live: emptyLive(), ui: { ...S().ui, panel: 'series' } });
        if (auto()) later(() => actions.newSeries(), /** @type {number} */ (options.autoAdvanceMs));
        return;
      }
      engine.acknowledge();
      store.set({ result: null, live: emptyLive(), engine: engine.snapshot() });
      if (source) source.onIdle();
      autoCountIn(500);
    },
    newSeries() {
      clearAuto();
      engine.acknowledge();
      store.set({ result: null, live: emptyLive(), series: emptySeries(settings().seriesLength), engine: engine.snapshot(), ui: { ...S().ui, panel: S().ui.panel === 'series' ? null : S().ui.panel } });
      if (source) source.onIdle();
      autoCountIn(500);
    },
    /** @param {null|'lab'|'settings'|'onboarding'|'series'|'rules'} panel */
    openPanel(panel) {
      if (S().ui.panel === 'series' && panel !== 'series') actions.newSeries(); // leaving the summary starts the next series
      store.set({ ui: { ...S().ui, panel } });
    },
    closePanel() {
      if (S().ui.panel === 'series') { actions.newSeries(); return; }
      store.set({ ui: { ...S().ui, panel: null } });
      if (engine.phase === 'IDLE') autoCountIn(500);
    },
    /** Stop the round in progress (its seals are opened and verified, nothing is learned). */
    abortRound() {
      if (engine.phase === 'IDLE' || engine.phase === 'RESOLVED') return;
      handleEvents(engine.abortRound('MANUAL'));
      store.set({ engine: engine.snapshot() });
    },
    dismissToast() { store.set({ ui: { ...S().ui, toast: null } }); },
    finishOnboarding() { actions.setSetting('onboarded', true); actions.closePanel(); },
    /** Forget everything learned about the active player. */
    resetMemory() {
      if (!isDemo) storage.clearPlayer(S().player.id);
      player = createPlayerModel();
      resetRoundState();
      store.set({ metrics: player.metrics.summary(), profile: player.profile(), player: { ...S().player, rounds: 0 } });
      if (source) source.onIdle();
      toast('MEMORY_RESET');
      autoCountIn(600);
    },
    /**
     * Everything stored about the player, this session's audit log and every round judged in this page
     * session (verdict, moves, timings, measurements, belief at the judged seal - no camera data, no
     * sample traces), as one JSON-serialisable object. Each round says whether it was simulated.
     */
    exportData() {
      return {
        format: 'beaTTer/v4/export', exportedAt: new Date().toISOString(), simulated: isDemo,
        settings: settings(), player: { tag: S().player.tag, model: player.toJSON(), profile: player.profile() },
        metrics: player.metrics.summary(), rounds: roundLog.slice(), commitLog: commitLog.export(),
      };
    },
    /**
     * Recompute a revealed seal with two independent implementations.
     * @param {{payload:string, hash:string}} commit
     * @returns {Promise<{expected:string, own:string, webCrypto:string|null, ok:boolean}>}
     */
    async verifySeal(commit) {
      const own = sha256Hex(commit.payload);
      const webCrypto = await sha256HexAsync(commit.payload);
      return { expected: commit.hash, own, webCrypto, ok: own === commit.hash && (webCrypto === null || webCrypto === commit.hash) };
    },
    /** @param {string} id */
    selectProfile(id) { if (isDemo) return; storage.flushAll(); if (storage.setActiveProfile(id)) { loadPlayer(); resetRoundState(); if (source) source.onIdle(); } },
    /** @param {string} [tag] */
    createProfile(tag) { if (isDemo) return; storage.flushAll(); storage.createProfile(tag); loadPlayer(); resetRoundState(); if (source) source.onIdle(); },
    /** @param {string} id */
    deleteProfile(id) { if (isDemo) return; if (storage.deleteProfile(id)) { loadPlayer(); resetRoundState(); if (source) source.onIdle(); } },
    listProfiles: () => storage.listProfiles(),
  };

  // ---------------------------------------------------------------------------------------------- boot
  loadPlayer();
  buildEngine();
  store.set({ engine: engine.snapshot(), boot: { ...S().boot, storage: storage.available } });
  audio.setMuted(settings().muted);
  syncCloud();

  return {
    actions,
    /** Drawing data for the canvases (read on requestAnimationFrame, not through the store). */
    // `picture`: the latest tracked camera frame (a canvas copy); `raw`: its unsmoothed landmarks, the sharp
    // region of the private picture
    frame: () => ({ image: display.image, raw: display.raw ?? null, picture: display.picture ?? null, demo: !!display.demo, video: source && source.video ? source.video : null, source: S().boot.source }),
    moves: MOVES,
    get sessionId() { return sessionId; },
    dispose() { stopSource(); storage.flushAll(); },
  };
}
