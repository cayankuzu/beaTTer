// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, initialState } from '../web/js/app/store.js';
import { createStorage, sanitiseSettings, DEFAULT_SETTINGS } from '../web/js/platform/storage.js';
import { createController } from '../web/js/app/controller.js';
import { createDemoSource } from '../web/js/app/sources.js';

/** In-memory Storage stand-in. */
function fakeStorage() {
  const m = new Map();
  return /** @type {any} */ ({ getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m });
}
const audioStub = () => {
  const calls = [];
  const rec = (name) => (...a) => calls.push([name, ...a]);
  return { calls, beat: rec('beat'), seal: rec('seal'), landing: rec('landing'), verdict: rec('verdict'), speakVerdict: rec('speakVerdict'), setMuted: rec('setMuted'), modeSwitch: rec('modeSwitch'), scheduleMetronome: rec('scheduleMetronome') };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function boot(settingsPatch = {}, options = {}) {
  const backend = fakeStorage();
  const storage = createStorage(backend);
  storage.setSettings(settingsPatch);
  const store = createStore(initialState(storage.getSettings()));
  const audio = audioStub();
  const controller = createController({
    store, storage, audio, now: () => performance.now(),
    makeDemoSource: (o) => createDemoSource(o),
    options: { autoAdvanceMs: 30, demo: { seed: 7, speed: 40 }, ...options },
  });
  return { store, storage, audio, controller, backend };
}

test('settings are validated field by field', () => {
  const s = sanitiseSettings({ rules: 'hile', primeBeats: 7, metronomeBpm: 9999, sensitivity: 'x', privacy: 'yes', seriesLength: 5, muted: true });
  assert.equal(s.rules, DEFAULT_SETTINGS.rules); assert.equal(s.primeBeats, 3); assert.equal(s.metronomeBpm, 160);
  assert.equal(s.sensitivity, 3); assert.equal(s.privacy, true); assert.equal(s.muted, true);
  assert.deepEqual(sanitiseSettings(null), { ...DEFAULT_SETTINGS });
});

test('storage: profiles, debounced saves, broken backend falls back to memory', async () => {
  const st = createStorage(fakeStorage());
  const first = st.activeProfileId();
  assert.match(st.listProfiles()[0].tag, /^Oyuncu #[0-9A-Z]{4}$/);
  const second = st.createProfile('Deney-2');
  assert.equal(st.activeProfileId(), second);
  st.savePlayer(second, { v: 4, x: 1 });
  assert.equal(st.loadPlayer(second), null, 'save is debounced');
  st.flushAll();
  assert.deepEqual(st.loadPlayer(second), { v: 4, x: 1 });
  assert.equal(st.deleteProfile(second), true);
  assert.equal(st.activeProfileId(), first);
  assert.equal(st.deleteProfile(first), false, 'the last profile cannot be deleted');
  const broken = createStorage(/** @type {any} */ ({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} }));
  assert.equal(broken.available, false);
  broken.setSettings({ muted: true });
  assert.equal(broken.getSettings().muted, true, 'keeps working in memory');
});

test('store notifies only when the selected slice changes', () => {
  const store = createStore({ a: 1, b: { x: 1 } });
  let calls = 0;
  const off = store.subscribe((s) => s.a, () => { calls += 1; });
  assert.equal(calls, 1);
  store.set({ b: { x: 2 } }); assert.equal(calls, 1);
  store.set({ a: 2 }); assert.equal(calls, 2);
  off(); store.set({ a: 3 }); assert.equal(calls, 2);
});

test('demo mode drives the real engine end to end: rounds, series, metrics, no persistence', async () => {
  const { store, controller, audio, backend } = boot();
  controller.actions.startDemo();
  assert.equal(store.get().boot.source, 'demo');
  const t0 = Date.now();
  while (Date.now() - t0 < 12000 && (store.get().metrics?.rounds.valid ?? 0) < 12) await sleep(20);
  controller.dispose();
  const s = store.get();
  assert.ok(s.metrics.rounds.valid >= 12, `valid rounds ${s.metrics.rounds.valid}`);
  assert.equal(s.metrics.outcome.player, 0, 'turnuva: the synthetic player never wins a valid round');
  assert.ok(s.engine && typeof s.engine.phase === 'string');
  assert.ok(audio.calls.some((c) => c[0] === 'beat') && audio.calls.some((c) => c[0] === 'seal') && audio.calls.some((c) => c[0] === 'verdict'));
  assert.ok(s.profile.rounds >= 12);
  assert.equal(s.player.tag, 'Sentetik oyuncu');
  assert.ok(![...backend._m.keys()].some((k) => k.startsWith('beatter.v4.player.')), 'demo rounds are never persisted');
});

test('report flow: a result opens the report, the primary action continues, a full series opens the summary', async () => {
  const { store, controller } = boot({ seriesLength: 3 }, { autoAdvanceMs: null });
  controller.actions.startDemo();
  let closed = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !store.get().series.done) {
    const s = store.get();
    if (s.result) {
      const r = s.result;
      assert.ok(r.commits.length >= 1 && r.sealOk);
      const check = await controller.actions.verifySeal(r.commits[0]);
      assert.equal(check.ok, true);
      assert.equal(check.own, r.commits[0].hash);
      if (!store.get().series.done) { controller.actions.primary(); closed += 1; assert.equal(store.get().result, null); }
    }
    await sleep(15);
  }
  const s = store.get();
  assert.equal(s.series.done, true);
  assert.equal(s.series.rounds.length, 3);
  assert.equal(s.series.ai + s.series.player + s.series.ties, 3);
  controller.actions.primary(); // closes the last report -> series summary
  assert.equal(store.get().ui.panel, 'series');
  controller.actions.primary(); // new series
  assert.equal(store.get().series.rounds.length, 0);
  assert.equal(store.get().ui.panel, null);
  const exported = controller.actions.exportData();
  assert.equal(exported.simulated, true);
  assert.ok(exported.commitLog && exported.player.model.v === 4);
  // the export carries every judged round of the session, without sample traces or seal payloads
  assert.equal(exported.rounds.length, exported.metrics.rounds.judged);
  for (const r of exported.rounds) {
    assert.equal(r.simulated, true);
    assert.ok(typeof r.verdict === 'string' && r.timing && Number.isInteger(r.landingFrame) && !('trace' in r));
    assert.ok(r.commits.length >= 1 && r.commits.every((c) => !('payload' in c) && !('nonce' in c) && exported.commitLog.commits.some((k) => k.seq === c.seq)));
  }
  assert.ok(JSON.stringify(exported.rounds).length / exported.rounds.length < 4000, 'a round costs a few kB in the export');
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(exported)));
  controller.dispose();
  assert.ok(closed >= 2);
});

test('metronome mode and MindTwin mode work through the controller', async () => {
  const { store, controller, audio } = boot({ rhythm: 'metronome', metronomeBpm: 120 });
  controller.actions.startDemo();
  const t0 = Date.now();
  while (Date.now() - t0 < 12000 && (store.get().metrics?.rounds.judged ?? 0) < 4) await sleep(20);
  assert.ok(store.get().metrics.rounds.judged >= 4, 'metronome-led rounds are judged');
  assert.ok(audio.calls.some((c) => c[0] === 'scheduleMetronome'));
  assert.equal(store.get().metrics.outcome.player, 0);
  controller.actions.setMode('mindtwin');
  const t1 = Date.now();
  while (Date.now() - t1 < 6000 && !(store.get().twin && store.get().twin.skill.n > 40)) await sleep(20);
  const twin = store.get().twin;
  assert.ok(twin && twin.skill.n > 40 && twin.ahead.length === 5);
  assert.ok(twin.skill.skill > 0, `forecast skill ${twin.skill.skill}`);
  controller.actions.setMode('rps');
  controller.actions.setSetting('rules', 'serbest');
  assert.equal(store.get().settings.rules, 'serbest');
  assert.equal(store.get().engine.rules, 'serbest');
  controller.actions.resetMemory();
  assert.equal(store.get().metrics.rounds.valid, 0);
  assert.equal(store.get().ui.toast.code, 'MEMORY_RESET');
  controller.dispose();
});
