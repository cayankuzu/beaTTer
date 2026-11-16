// @ts-check
// Application life-cycle regressions: engine rebuilds, the camera/demo hand-over, a finished series,
// numbers that must not survive their source, consent for the optional sync, storage failures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStore, initialState } from '../web/js/app/store.js';
import { createStorage, DEFAULT_SETTINGS, CONSENT_VERSION } from '../web/js/platform/storage.js';
import { createController } from '../web/js/app/controller.js';
import { createDemoSource } from '../web/js/app/sources.js';
import { createCloud, roundPayload } from '../web/js/platform/cloud.js';

function fakeStorage() {
  const m = new Map();
  return /** @type {any} */ ({ getItem: (/** @type {string} */ k) => (m.has(k) ? m.get(k) : null), setItem: (/** @type {string} */ k, /** @type {any} */ v) => m.set(k, String(v)), removeItem: (/** @type {string} */ k) => m.delete(k), _m: m });
}
const audioStub = () => {
  /** @type {any[]} */ const calls = [];
  const rec = (/** @type {string} */ name) => (/** @type {any[]} */ ...a) => { calls.push([name, ...a]); };
  return { calls, beat: rec('beat'), seal: rec('seal'), landing: rec('landing'), verdict: rec('verdict'), speakVerdict: rec('speakVerdict'), setMuted: rec('setMuted'), modeSwitch: rec('modeSwitch'), scheduleMetronome: rec('scheduleMetronome'), cancelMetronome: rec('cancelMetronome') };
};
const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (/** @type {() => any} */ fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(15); } return false; };

/** A camera-interface source fed by the synthetic player: counts how often the device is opened and closed. */
function fakeCamera(/** @type {any} */ store, { openDelayMs = 0, failOpen = /** @type {string|null} */ (null), speed = 40 } = {}) {
  /** @type {any} */ let demo = null;
  /** @type {((code:string) => void)|null} */ let lost = null;
  const c = { opened: 0, closed: 0, started: 0 };
  return {
    kind: 'camera', counts: c,
    get live() { return c.opened > c.closed; },
    async open() {
      c.opened += 1; // the device has been acquired here
      if (openDelayMs) await sleep(openDelayMs);
      if (failOpen) { const e = new Error('fail'); /** @type {any} */ (e).code = failOpen; throw e; }
    },
    close() { c.closed += 1; if (demo) demo.stop(); demo = null; },
    devices: async () => [],
    onLost(/** @type {(code:string) => void} */ fn) { lost = fn; },
    lose(/** @type {string} */ code) { if (lost) lost(code); },
    start(/** @type {(f:any, d:any) => void} */ onFrame) {
      c.started += 1;
      demo = createDemoSource({ seed: 11, speed, now: () => performance.now(), getContext: () => ({ phase: store.get().engine?.phase ?? 'IDLE', mode: store.get().mode, primeBeats: store.get().settings.primeBeats, metronome: store.get().settings.rhythm === 'metronome', beatTimes: null }) });
      demo.start((/** @type {any} */ f, /** @type {any} */ d) => onFrame(f, { image: d.image, demo: false, inferMs: 9, latencyMs: 55 }));
    },
    stop() { if (demo) demo.stop(); },
    onResult(/** @type {any} */ r) { if (demo) demo.onResult(r); },
    onIdle() { if (demo) demo.onIdle(); },
    clock: () => (demo ? demo.clock() : performance.now()),
  };
}

function boot(settingsPatch = {}, options = {}, extra = /** @type {any} */ ({})) {
  const backend = extra.backend ?? fakeStorage();
  const storage = createStorage(backend);
  storage.setSettings(settingsPatch);
  const store = createStore(initialState(storage.getSettings()));
  const audio = audioStub();
  /** @type {any[]} */ const uploads = [];
  /** @type {boolean[]} */ const cloudEnabled = [];
  const cloud = { status: () => 'online', setEnabled: (/** @type {boolean} */ v) => { cloudEnabled.push(v); }, pushRound: (/** @type {string} */ id, /** @type {any} */ r) => { uploads.push({ id, simulated: r.simulated }); } };
  /** @type {any} */ const cam = { current: null };
  const controller = createController({
    store, storage, audio, cloud, now: () => performance.now(),
    makeDemoSource: (o) => createDemoSource(o),
    makeCameraSource: async () => { cam.current = cam.current ?? fakeCamera(store, extra.camera ?? {}); return cam.current; },
    options: { autoAdvanceMs: 30, demo: { seed: 7, speed: 40 }, ...options },
  });
  const judged = () => store.get().metrics?.rounds.judged ?? 0;
  /** Wait until `n` rounds have been judged, pressing "next round" like a player would (the camera never auto-advances). */
  const play = async (/** @type {number} */ n, ms = 12000) => {
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < ms && judged() < n) {
      if (store.get().result) { last = store.get().result; controller.actions.primary(); }
      if (store.get().ui.panel === 'series') controller.actions.primary();
      await sleep(10);
    }
    return { ok: judged() >= n, last: store.get().result ?? last };
  };
  return { store, storage, audio, controller, backend, uploads, cloudEnabled, cam, judged, play };
}

/** Run a test body and always dispose the controllers it created (a leaked frame source keeps node alive). */
const withBoots = async (/** @type {(mk: typeof boot) => Promise<void>} */ body) => {
  /** @type {any[]} */ const made = [];
  const mk = /** @type {typeof boot} */ ((...a) => { const b = boot(...a); made.push(b); return b; });
  try { await body(mk); } finally { for (const b of made) { try { b.controller.dispose(); } catch { /* ignore */ } } }
};

test('the game goes on after every kind of engine rebuild (settings, mode, rhythm, memory reset)', async () => {
  const { store, controller, judged } = boot();
  const errors = [];
  const onErr = (/** @type {any} */ e) => errors.push(e);
  process.on('uncaughtException', onErr);
  try {
    controller.actions.startDemo();
    assert.ok(await waitFor(() => judged() >= 3), 'rounds before the first rebuild');
    for (const step of [
      () => controller.actions.setSetting('sensitivity', 4),
      () => { controller.actions.setMode('mindtwin'); controller.actions.setMode('rps'); },
      () => controller.actions.setSetting('primeBeats', 2),
      () => controller.actions.setSetting('rhythm', 'metronome'),
      () => controller.actions.setSetting('metronomeBpm', 110),
      () => controller.actions.setSetting('rhythm', 'free'),
      () => controller.actions.setSetting('seriesLength', 3),
    ]) {
      step();
      const before = judged();
      assert.ok(await waitFor(() => judged() >= before + 2, 8000), `rounds are judged after rebuild (stuck at ${judged()}, phase ${store.get().engine.phase})`);
    }
    controller.actions.resetMemory();
    assert.ok(await waitFor(() => judged() >= 2, 8000), 'rounds after a memory reset');
    const log = controller.actions.exportData().commitLog;
    const rounds = log.commits.map((/** @type {any} */ c) => c.round);
    assert.ok(rounds.every((/** @type {number} */ r, /** @type {number} */ i) => i === 0 || r >= rounds[i - 1]), 'round numbers never restart on the session log');
    assert.ok(new Set(rounds).size >= 16);
  } finally {
    controller.dispose();
    process.off('uncaughtException', onErr);
  }
  assert.deepEqual(errors, []);
});

test('camera -> demo releases the device; demo -> camera plays on; numbers measured on the camera do not leak into the demo', () => withBoots(async (boot) => {
  const { store, controller, cam, judged, play } = boot();
  assert.equal(await controller.actions.startCamera(), true);
  assert.equal(store.get().boot.source, 'camera');
  const played = await play(2);
  assert.ok(played.ok, 'rounds on the camera');
  assert.ok(await waitFor(() => store.get().perf.latencyMs !== null && store.get().perf.inferMs !== null));
  const res = played.last;
  assert.equal(res.simulated, false);
  assert.ok(Number.isFinite(res.timing.sealLatencyMs) && res.timing.sealLatencyMs >= 0, 'the wall-clock age of the evidence at the seal is measured');
  assert.ok(Math.abs(res.timing.wallLeadMs - (res.timing.leadToLandingMs - res.timing.sealLatencyMs)) < 0.2);
  assert.ok(res.commits.every((/** @type {any} */ c) => c.sealLatencyMs === null || c.sealLatencyMs >= 0));
  // the audit log carries wall-clock stamps
  const sealed = controller.actions.exportData().commitLog.commits;
  assert.ok(sealed.length > 0 && sealed.every((/** @type {any} */ c) => Number.isFinite(c.sealedAt)));

  controller.actions.startDemo();
  assert.equal(cam.current.counts.closed, 1, 'the device is released');
  assert.equal(cam.current.live, false);
  assert.equal(store.get().boot.source, 'demo');
  assert.equal(store.get().boot.camera, 'idle');
  assert.deepEqual([store.get().perf.inferMs, store.get().perf.latencyMs], [null, null], 'camera measurements are dropped');
  assert.ok(await waitFor(() => judged() >= 2), 'demo rounds');
  assert.ok(await waitFor(() => store.get().result));
  assert.equal(store.get().result.simulated, true);
  assert.equal(store.get().result.timing.sealLatencyMs, null, 'not measured in the demo');
  assert.equal(store.get().result.timing.wallLeadMs, null);
  assert.equal(store.get().perf.latencyMs, null);

  // and back: the camera works after the demo
  assert.equal(await controller.actions.startCamera(), true);
  assert.ok((await play(2)).ok, 'camera rounds after the demo');
  controller.actions.stopCamera();
  assert.equal(cam.current.live, false);
  assert.equal(store.get().boot.camera, 'idle');
}));

test('a demo started while the camera is still starting stays a demo: nothing is stored or uploaded as the real player', () => withBoots(async (boot) => {
  const { store, controller, cam, uploads, backend, storage, judged } = boot({ cloud: true }, {}, { camera: { openDelayMs: 300 } });
  const pending = controller.actions.startCamera(); // permission prompt / model download in progress
  await sleep(40);
  controller.actions.startDemo();                   // "kamerasız demo" meanwhile
  assert.equal(await pending, false, 'the overtaken camera start reports failure');
  assert.equal(cam.current.live, false, 'and gives the device back');
  assert.equal(store.get().boot.source, 'demo');
  assert.equal(store.get().player.tag, 'Sentetik oyuncu');
  assert.equal(controller.actions.exportData().simulated, true);
  assert.ok(await waitFor(() => judged() >= 4));
  storage.flushAll();
  assert.equal(uploads.length, 0, 'no synthetic round is uploaded');
  assert.ok(![...backend._m.keys()].some((k) => k.startsWith('beatter.v4.player.')), 'no synthetic round is persisted');
  controller.actions.stopDemo();
  assert.equal(store.get().boot.source, 'none');
  const n = judged();
  await sleep(250);
  assert.equal(judged(), n, 'the demo really stopped');
}));

test('a denied or failed camera start never leaves the device on, and never breaks a running demo', () => withBoots(async (boot) => {
  // tracker failure after the camera was acquired
  const a = boot({}, {}, { camera: { failOpen: 'TRACKER_FAILED' } });
  assert.equal(await a.controller.actions.startCamera(), false);
  assert.equal(a.store.get().boot.camera, 'error');
  assert.equal(a.store.get().boot.cameraError.code, 'TRACKER_FAILED');
  assert.equal(a.store.get().boot.tracker, 'error');
  assert.equal(a.cam.current.live, false, 'the device is released behind the error gate');
  // permission denied while a demo (started meanwhile) is running
  const b = boot({}, {}, { camera: { openDelayMs: 200, failOpen: 'CAMERA_DENIED' } });
  const pending = b.controller.actions.startCamera();
  await sleep(30);
  b.controller.actions.startDemo();
  assert.equal(await pending, false);
  assert.equal(b.store.get().boot.source, 'demo', 'the late error does not overwrite the demo state');
  assert.equal(b.store.get().boot.camera, 'idle');
  b.controller.actions.stopDemo();
  assert.equal(b.store.get().boot.source, 'none');
  // denied with nothing else going on: a clean error, tracker status not left at "loading"
  const c = boot({}, {}, { camera: { failOpen: 'CAMERA_DENIED' } });
  assert.equal(await c.controller.actions.startCamera(), false);
  assert.equal(c.store.get().boot.cameraError.code, 'CAMERA_DENIED');
  assert.notEqual(c.store.get().boot.tracker, 'loading');
}));

test('losing the camera mid-session is reported and stops the round', () => withBoots(async (boot) => {
  const { store, controller, cam, judged, play } = boot();
  assert.equal(await controller.actions.startCamera(), true);
  assert.ok((await play(1)).ok);
  cam.current.lose('CAMERA_LOST');
  assert.equal(store.get().boot.camera, 'error');
  assert.equal(store.get().boot.cameraError.code, 'CAMERA_LOST');
  assert.equal(store.get().boot.source, 'none');
  assert.equal(cam.current.live, false);
  const n = judged();
  await sleep(200);
  assert.equal(judged(), n);
}));

test('a finished series accepts no further round until a new series is started', () => withBoots(async (boot) => {
  const { store, controller } = boot({ seriesLength: 3 }, { autoAdvanceMs: null });
  controller.actions.startDemo();
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !store.get().series.done) { if (store.get().result) controller.actions.primary(); await sleep(10); }
  assert.equal(store.get().series.done, true);
  controller.actions.primary(); // closes the last report -> summary
  assert.equal(store.get().ui.panel, 'series');
  await sleep(700);             // at 40x this is half a minute of synthetic play
  assert.equal(store.get().series.rounds.length, 3, 'nothing was played behind the summary');
  assert.equal(store.get().result, null);
  assert.equal(store.get().engine.phase, 'RESOLVED');
  controller.actions.closePanel(); // dismissing the summary starts the next series
  assert.equal(store.get().ui.panel, null);
  assert.equal(store.get().series.rounds.length, 0);
  assert.ok(await waitFor(() => store.get().result !== null, 6000), 'play resumes in the new series');
}));

test('an aborted round clears the live strip; its seal is reported as opened and verified', () => withBoots(async (boot) => {
  const { store, controller } = boot({ primeBeats: 0 }, { autoAdvanceMs: null });
  controller.actions.startDemo();
  assert.ok(await waitFor(() => store.get().live.commits.length === 1 && ['ARMED', 'FLIGHT'].includes(store.get().engine.phase), 6000), 'a behavioural seal is on the strip');
  const round = store.get().live.round;
  controller.actions.abortRound();
  assert.equal(store.get().engine.phase, 'IDLE');
  assert.deepEqual(store.get().live.commits, []);
  assert.equal(store.get().live.t0, null);
  const toast = store.get().ui.toast;
  assert.equal(toast.code, 'ABORT_MANUAL');
  assert.deepEqual(toast.params, { seals: 1, sealOk: true });
  assert.ok(await waitFor(() => store.get().result !== null, 8000), 'the next round is judged');
  assert.ok(store.get().result.round > round);
  assert.ok(store.get().live.round === store.get().result.round && store.get().live.commits.every((/** @type {any} */ c) => store.get().result.commits.some((/** @type {any} */ k) => k.seq === c.seq)), 'the strip shows this round only');
}));

/** A controller whose demo runs on a manual clock and timer: deterministic, whatever the load of the machine. */
function manualDemo(/** @type {number} */ seed, settingsPatch = {}) {
  const storage = createStorage(fakeStorage());
  storage.setSettings(settingsPatch);
  const store = createStore(initialState(storage.getSettings()));
  let clock = 1000;
  /** @type {null|(() => void)} */ let pending = null;
  const controller = createController({
    store, storage, audio: audioStub(), now: () => clock,
    makeDemoSource: (o) => createDemoSource({ ...o, setTimer: (/** @type {() => void} */ fn) => { pending = fn; return 1; }, clearTimer: () => { pending = null; } }),
    options: { autoAdvanceMs: null, demo: { seed, speed: 40 } },
  });
  /** advance the wall clock by 6 ms and run the demo's pending tick (at most 8 frames) */
  const step = () => { clock += 6; const fn = pending; pending = null; if (fn) fn(); };
  /** tick until `fn()` holds, at most `n` ticks (3000 ticks are 12 minutes on the 40x frame clock) */
  const until = (/** @type {() => boolean} */ fn, n = 3000) => { for (let k = 0; k < n && !fn(); k++) step(); return fn(); };
  return { store, controller, step, until, lag: (/** @type {number} */ ms) => { clock += ms; } };
}

test('demo, single-stroke mode: the synthetic player never waits for an engine that is waiting for it', () => {
  // Found while chasing an intermittent failure of the test above on a loaded machine (it failed with the
  // previous engine as well). In single-stroke mode the engine arms by itself on a resting fist; the
  // synthetic player planned a throw only while the engine was IDLE, so an engine that had armed without
  // that throw and the player waited for each other for good. Two ways in, both deterministic here:
  // (1) the player is behind the clock when a round is aborted, and the frames it still owes hold enough
  // resting fist to arm on; (2) a dialog stays open long enough for the engine to arm behind it.
  for (const seed of [1, 2, 3, 4]) {
    const d = manualDemo(seed, { primeBeats: 0 });
    try {
      d.controller.actions.startDemo();
      assert.ok(d.until(() => d.store.get().live.commits.length === 1 && d.store.get().engine.phase === 'ARMED'), 'armed, behavioural seal on the strip');
      d.lag(15); // the machine stalls for 15 ms: 600 ms on the 40x frame clock that the player now owes
      d.controller.actions.abortRound();
      assert.ok(d.until(() => d.store.get().result !== null), `seed ${seed}: a round is judged after the abort (stuck in ${d.store.get().engine.phase})`);
      d.controller.actions.primary(); // next round
      d.controller.actions.openPanel('settings');
      for (let k = 0; k < 40; k++) d.step(); // about 10 s of play time behind the dialog
      assert.equal(d.store.get().engine.phase, 'ARMED', 'the engine armed on the resting fist behind the dialog');
      d.controller.actions.closePanel();
      assert.ok(d.until(() => d.store.get().result !== null), `seed ${seed}: a round is judged after the dialog (stuck in ${d.store.get().engine.phase})`);
    } finally {
      d.controller.dispose();
    }
  }
});

test('metronome demo: a settings change during the count-in neither stalls the game nor leaves the old count-in sounding', () => withBoots(async (boot) => {
  const { controller, audio, judged } = boot({ rhythm: 'metronome', metronomeBpm: 120 });
  controller.actions.startDemo();
  assert.ok(await waitFor(() => audio.calls.some((c) => c[0] === 'scheduleMetronome'), 4000));
  const cancelsBefore = audio.calls.filter((c) => c[0] === 'cancelMetronome').length;
  controller.actions.setSetting('metronomeBpm', 110);
  assert.ok(audio.calls.filter((c) => c[0] === 'cancelMetronome').length > cancelsBefore, 'the scheduled clicks are cancelled');
  assert.ok(await waitFor(() => judged() >= 3, 9000), `rounds continue after the change (judged ${judged()})`);
  // offsets handed to the audio clock are wall-clock times: the 40x demo compresses them
  const last = audio.calls.filter((c) => c[0] === 'scheduleMetronome').pop();
  assert.ok(last[1][last[1].length - 1] < 200, `count-in offsets ${last[1]}`);
}));

test('the optional sync is decided in one place: consent, a real player and an allowed host', () => withBoots(async (boot) => {
  // development host: the switch alone must not enable it
  const dev = boot({ cloud: false }, { cloudAllowed: false });
  dev.controller.actions.setSetting('cloud', true);
  assert.equal(await dev.controller.actions.startCamera(), true);
  assert.ok(dev.cloudEnabled.every((v) => v === false), 'never enabled on a development host');
  assert.equal(dev.store.get().cloud, 'off');
  assert.ok((await dev.play(2)).ok);
  assert.equal(dev.uploads.length, 0);
  // allowed host: consent given during the demo takes effect when the camera starts
  const ok = boot({ cloud: false });
  ok.controller.actions.startDemo();
  ok.controller.actions.setSetting('cloud', true);
  assert.equal(ok.cloudEnabled[ok.cloudEnabled.length - 1], false, 'not while the synthetic player is on');
  assert.equal(await ok.controller.actions.startCamera(), true);
  assert.equal(ok.cloudEnabled[ok.cloudEnabled.length - 1], true);
  assert.equal(ok.store.get().cloud, 'online');
  await ok.play(3);
  assert.ok(ok.uploads.length >= 1, 'valid camera rounds are uploaded');
  assert.ok(ok.uploads.every((u) => u.simulated === false));
  ok.controller.actions.setSetting('cloud', false);
  assert.equal(ok.cloudEnabled[ok.cloudEnabled.length - 1], false);
}));

test('cloud payload: unknown values are null, a prediction is reported only when one was made', async () => {
  const metrics = { rounds: { valid: 3 }, outcome: { player: 0, ai: 3, tie: 0 } };
  const base = {
    round: 4, valid: true, verdict: 'AI', playerMove: 0, aiMove: 1, judgedSeq: 7,
    commits: [{ seq: 7, reason: 'BEHAVIOUR', hash: 'h'.repeat(64) }],
    beliefAtFinalCommit: { post: [1 / 3, 1 / 3, 1 / 3] },
    timing: { leadToLandingMs: 512.4 }, kinematics: { vSpreadDeg: null, peakFlexionVelDegS: null, reanchored: false }, explanation: { code: 'HELD_BEHAVIOUR' },
  };
  const held = roundPayload(base, metrics);
  assert.equal(held.early_predicted_move, null, 'a behavioural hold is not a kinematic prediction');
  assert.equal(held.confidence, null);
  assert.equal(held.v_angle, null);
  assert.equal(held.tendon_velocity, null);
  assert.equal(held.anticipation_ms, 512);
  const kin = roundPayload({ ...base, commits: [{ seq: 7, reason: 'KINEMATIC', hash: 'h'.repeat(64) }], beliefAtFinalCommit: { post: [0.9, 0.05, 0.05] }, kinematics: { vSpreadDeg: 21.5, peakFlexionVelDegS: 900, reanchored: true } }, metrics);
  assert.equal(kin.early_predicted_move, 'ROCK');
  assert.equal(kin.confidence, 0.9);
  assert.equal(kin.v_angle, 21.5);
  assert.equal(roundPayload({ ...base, timing: { leadToLandingMs: null } }, metrics).anticipation_ms, null);
  assert.ok(!JSON.stringify(kin).match(/nonce|payload|landmark|image/), 'nothing but the listed fields leaves the page');
  // transport: one validating function, no table access; simulated rounds are refused at the last line too
  /** @type {any[]} */ const calls = [];
  const cloud = createCloud({ enabled: true, fetchImpl: /** @type {any} */ (async (/** @type {string} */ url, /** @type {any} */ init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true }; }) });
  await cloud.pushRound('player-1', { ...base, simulated: true }, metrics);
  assert.equal(calls.length, 0);
  await cloud.pushRound('player-1', base, metrics);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/rest/v1/rpc/beatter_push_round'));
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['p_player', 'p_round']);
  assert.equal(cloud.status(), 'online');
});

test('sharing is opt-in: only the two switches turn it on, and a stored "on" needs a consent under the current text', () => {
  assert.equal(DEFAULT_SETTINGS.cloud, false, 'sharing starts off');
  // (1) Nothing in the application sets the switch but the switch itself. v4.2.0-v4.2.2 had
  //     `if (!userToggledOptin) actions.setSetting('cloud', true)` on the welcome screen's camera button.
  /** @type {string[]} */ const files = [];
  const walk = (/** @type {URL} */ dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir); if (e.isDirectory()) walk(u); else if (e.name.endsWith('.js')) files.push(fileURLToPath(u)); } };
  walk(new URL('../web/js/', import.meta.url));
  /** @type {string[]} */ const values = [];
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/setSetting\(\s*['"]cloud['"]\s*,\s*([^)]*)\)/g)) values.push(m[1].trim());
  assert.ok(values.length >= 3, `call sites found: ${values.length}`);
  for (const v of values) assert.ok(v === 'v' || v === 'false', `setSetting('cloud', ${v}): only a switch's own value or false may be stored`);

  // (2) What v4.2.0-v4.2.2 stored when "Kamerayı aç" was pressed with the switch untouched - or what a
  //     player stored who agreed to the narrower text of v4.0 - is not a consent to what is sent today.
  const backend = fakeStorage();
  backend.setItem('beatter.v4.settings', JSON.stringify({ ...DEFAULT_SETTINGS, cloudConsent: undefined, cloud: true, onboarded: true, muted: true }));
  const st = createStorage(backend);
  assert.deepEqual([st.getSettings().cloud, st.getSettings().onboarded, st.getSettings().muted], [false, true, true], 'sharing reads as off; the other settings stay');
  assert.equal(st.takeConsentReset(), true, 'the player is to be told');
  assert.equal(st.takeConsentReset(), false, '... once');
  assert.equal(JSON.parse(backend.getItem('beatter.v4.settings')).cloud, false, 'the stored value is corrected');
  // (3) Switching it on records the consent with its version; another version does not count.
  assert.deepEqual([st.setSettings({ cloud: true }).cloud, st.getSettings().cloudConsent], [true, CONSENT_VERSION]);
  assert.equal(createStorage(backend).getSettings().cloud, true, 'kept across page loads');
  backend.setItem('beatter.v4.settings', JSON.stringify({ ...st.getSettings(), cloudConsent: CONSENT_VERSION - 1 }));
  assert.equal(createStorage(backend).getSettings().cloud, false, 'a consent to an older text is not a consent to this one');
  assert.deepEqual([st.setSettings({ cloud: false }).cloud, st.getSettings().cloudConsent], [false, 0]);
});

test('a browser that an earlier version opted in is not synced after the update; the player is told once', () => withBoots(async () => {
  const backend = fakeStorage();
  backend.setItem('beatter.v4.settings', JSON.stringify({ cloud: true, onboarded: true }));
  /** The application's own start-up order (main.js): the store is built from the stored settings, then the controller. */
  const start = () => {
    const storage = createStorage(backend);
    const store = createStore(initialState(storage.getSettings()));
    /** @type {any[]} */ const calls = [];
    const cloud = { status: () => 'online', setEnabled: (/** @type {boolean} */ v) => { calls.push(['enabled', v]); }, pushRound: () => { calls.push(['round']); }, pushDiagnostic: () => { calls.push(['diagnostic']); } };
    const controller = createController({ store, storage, audio: audioStub(), cloud, now: () => performance.now(), makeDemoSource: (o) => createDemoSource(o), makeCameraSource: async () => fakeCamera(store), options: { autoAdvanceMs: 30, cloudAllowed: true } });
    return { store, controller, calls };
  };
  const first = start();
  try {
    assert.equal(first.store.get().settings.cloud, false);
    assert.equal(first.store.get().cloud, 'off');
    assert.ok(first.calls.every((c) => c[0] === 'enabled' && c[1] === false), JSON.stringify(first.calls));
    assert.equal(first.store.get().ui.toast?.code, 'CONSENT_RESET');
  } finally { first.controller.dispose(); }
  const second = start();
  try { assert.equal(second.store.get().ui.toast ?? null, null, 'the notice is not repeated'); } finally { second.controller.dispose(); }
}));

test('another profile does not inherit the consent to share', () => withBoots(async (boot) => {
  const { store, controller, cloudEnabled } = boot({ cloud: true }, { cloudAllowed: true });
  assert.equal(cloudEnabled[cloudEnabled.length - 1], true, 'player A agreed');
  const a = store.get().player.id;
  controller.actions.createProfile('B');
  assert.notEqual(store.get().player.id, a);
  assert.deepEqual([store.get().settings.cloud, cloudEnabled[cloudEnabled.length - 1], store.get().cloud, store.get().ui.toast?.code], [false, false, 'off', 'SHARING_OFF_PROFILE']);
  controller.actions.selectProfile(a);
  assert.equal(store.get().settings.cloud, false, 'coming back does not switch it on again either');
  controller.actions.setSetting('cloud', true);
  controller.actions.selectProfile(a); // the same player: nothing changes
  assert.equal(store.get().settings.cloud, true);
}));

test('the database file opens two write-only calls to the public key, and the client makes no other', async () => {
  // v4.2.0 granted the public key a function that listed every player's diagnostics with their ids and
  // one that returned the stored model of any id; its client uploaded that model and loaded it back.
  const sql = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '');
  const norm = (/** @type {string} */ x) => x.replace(/\s+/g, ' ').trim().toLowerCase();
  const PUBLIC_ROLES = /\b(anon|authenticated|public)\b/i;
  // every GRANT that reaches the public key, whatever its spelling
  const grants = [...sql.matchAll(/\bGRANT\b([^;]*?)\bTO\b([^;]*);/gi)].filter((m) => PUBLIC_ROLES.test(m[2])).map((m) => norm(m[1]));
  assert.deepEqual(grants.sort(), ['execute on function public.beatter_push_diagnostic(text, jsonb, jsonb)', 'execute on function public.beatter_push_round(text, jsonb)']);
  assert.doesNotMatch(sql, /\bALTER\s+DEFAULT\s+PRIVILEGES\b/i);
  assert.doesNotMatch(sql, /\bCREATE\s+POLICY\b/i, 'row-level security with no policy: the public key reaches no row');
  // Supabase grants new functions and tables to anon and authenticated by default: each needs its REVOKE
  const functions = [...sql.matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.(\w+)\s*\(/gi)].map((m) => m[1]);
  assert.deepEqual([...functions].sort(), ['beatter_pull_recent_diagnostics', 'beatter_pull_state', 'beatter_push_diagnostic', 'beatter_push_round']);
  for (const fn of functions) {
    const revoke = new RegExp(`\\bREVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+public\\.${fn}\\([^)]*\\)\\s+FROM\\s+([^;]*);`, 'i').exec(sql);
    assert.ok(revoke && /\bPUBLIC\b/i.test(revoke[1]), `${fn}: REVOKE ... FROM PUBLIC`);
    if (!fn.startsWith('beatter_push_')) assert.ok(/\banon\b/i.test(revoke[1]) && /\bauthenticated\b/i.test(revoke[1]), `${fn}: an earlier grant to anon and authenticated is withdrawn when the file is run again`);
  }
  const tables = [...sql.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/gi)].map((m) => m[1]);
  assert.deepEqual([...tables].sort(), ['diagnostic_telemetry', 'match_telemetry', 'player_profiles']);
  for (const t of tables) {
    assert.match(sql, new RegExp(`\\bALTER\\s+TABLE\\s+public\\.${t}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\b`, 'i'), `${t}: row-level security`);
    assert.match(sql, new RegExp(`\\bREVOKE\\s+ALL\\s+ON\\s+TABLE\\s+public\\.${t}\\s+FROM\\s+anon\\s*,\\s*authenticated\\b`, 'i'), `${t}: table privileges withdrawn`);
  }
  assert.doesNotMatch(sql, /SET\s+model_state\s*=/i, 'no function stores a player model');

  // the client: two endpoints, no model in the body, nothing to read back
  /** @type {{rpc:string, keys:string[]}[]} */ const calls = [];
  const cloud = createCloud({ enabled: true, fetchImpl: /** @type {any} */ (async (/** @type {string} */ url, /** @type {any} */ init) => { calls.push({ rpc: url.replace(/^.*\/rest\/v1\/rpc\//, ''), keys: Object.keys(JSON.parse(init.body)).sort() }); return { ok: true }; }) });
  const round = { round: 1, valid: true, verdict: 'AI', playerMove: 0, aiMove: 1, judgedSeq: 1, commits: [{ seq: 1, reason: 'KINEMATIC', hash: 'h'.repeat(64) }], beliefAtFinalCommit: { post: [0.8, 0.1, 0.1] }, timing: { leadToLandingMs: 100 }, kinematics: {}, explanation: { code: 'RESOLVED_SCISSORS' }, trace: { uF: [0.1], uB: [0.1] } };
  await cloud.pushRound('player-1', round, { rounds: { valid: 1 }, outcome: { player: 0, ai: 1, tie: 0 } });
  await /** @type {any} */ (cloud).pushDiagnostic('player-1', round, { v: 4, sequence: 'not sent' });
  assert.deepEqual(calls, [{ rpc: 'beatter_push_round', keys: ['p_player', 'p_round'] }, { rpc: 'beatter_push_diagnostic', keys: ['p_diag', 'p_player'] }]);
  assert.deepEqual(Object.keys(cloud).sort(), ['pushDiagnostic', 'pushRound', 'setEnabled', 'status'], 'no call that reads');
  // ... and the controller neither sends the model nor asks for one (real controller, recording transport)
  const src = readFileSync(new URL('../web/js/app/controller.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /pullState|player\.load\(remote/);
});

test('storage: one failed write does not turn the current settings and profile into defaults', () => {
  const backend = fakeStorage();
  const st = createStorage(backend);
  st.setSettings({ muted: true, rules: 'serbest', seriesLength: 9 });
  const id = st.activeProfileId();
  const real = backend.setItem;
  backend.setItem = () => { throw new Error('QuotaExceededError'); };
  st.setSettings({ voice: false });
  assert.equal(st.available, false);
  const s = st.getSettings();
  assert.deepEqual([s.muted, s.rules, s.seriesLength, s.voice], [true, 'serbest', 9, false], 'earlier choices and the failed one are all still in effect');
  assert.equal(st.activeProfileId(), id, 'the profile is unchanged');
  backend.setItem = real;
  st.setSettings({ privacy: false });
  assert.equal(st.available, true, 'writes resume when the backend recovers');
  assert.equal(JSON.parse(backend.getItem('beatter.v4.settings')).voice, false);
  // deleting really deletes, also from the mirror
  const second = st.createProfile('x');
  st.savePlayer(second, { v: 4 }); st.flushAll();
  assert.deepEqual(st.loadPlayer(second), { v: 4 });
  st.clearPlayer(second);
  assert.equal(st.loadPlayer(second), null);
});
