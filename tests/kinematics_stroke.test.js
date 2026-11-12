// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../web/js/core/rng.js';
import { fingerFlexion, extension, defaultCalibration, frameFeatures, vSpreadDeg, palmSize, palmCenter, openingFromBaseline } from '../web/js/core/kinematics.js';
import { handLandmarks, randomRotation, rotationFromEuler, localLandmarks } from '../web/js/sim/hand_model.js';
import { createStrokeTracker, predictLanding } from '../web/js/core/stroke.js';
import { simulateThrow, strokeProfile } from '../web/js/sim/kinematic_player.js';
import { OneEuroFilter, Kalman1D, RunningStats, EwStats } from '../web/js/core/filters.js';

const calib = defaultCalibration();
const frameOf = (lm, t = 0, index = 0) => ({ t, index, present: true, image: lm.image, world: lm.world, aspect: 4 / 3, handedness: 'Right', neural: null });

test('filters: Kalman tracks a ramp, extrapolation variance grows, 1-euro and stats behave', () => {
  const kf = new Kalman1D({ q: 50, r: 1e-4 });
  for (let i = 0; i <= 120; i++) kf.step(2 * (i / 60), 1 / 60); // x = 2 t
  assert.ok(Math.abs(kf.x - 4) < 0.01 && Math.abs(kf.v - 2) < 0.05, `x=${kf.x} v=${kf.v}`);
  const a1 = kf.ahead(0.05), a2 = kf.ahead(0.2);
  assert.ok(Math.abs(a1.x - 4.1) < 0.02 && a2.variance > a1.variance && a1.variance > kf.p00);
  const f = new OneEuroFilter({ minCutoff: 1, beta: 0.5 });
  for (let i = 0; i < 30; i++) assert.equal(f.filter(3, i * 16), 3);
  let prev = 3;
  for (let i = 30; i < 90; i++) { const y = f.filter(5, i * 16); assert.ok(y >= prev - 1e-12 && y <= 5 + 1e-12); prev = y; }
  assert.ok(prev > 4.9, `step response reached ${prev}`);
  assert.equal(f.filter(NaN, 2000), prev);
  const rs = new RunningStats();
  for (const x of [2, 4, 4, 4, 5, 5, 7, 9]) rs.push(x);
  assert.equal(rs.mean, 5); assert.ok(Math.abs(/** @type {number} */ (rs.variance) - 32 / 7) < 1e-12);
  const copy = RunningStats.fromJSON(JSON.parse(JSON.stringify(rs)));
  assert.equal(copy.mean, 5);
  const ew = new EwStats(10);
  for (let i = 0; i < 200; i++) ew.push(i < 100 ? 0 : 1);
  assert.ok(/** @type {number} */ (ew.mean) > 0.99);
});

test('kinematics: finger angles are invariant to rotation, scale, translation and mirroring', () => {
  const rng = makeRng(1);
  for (let i = 0; i < 200; i++) {
    const e = [rng.next(), rng.next(), rng.next(), rng.next(), rng.next()];
    const ref = fingerFlexion(handLandmarks({ e }).world);
    const lm = handLandmarks({ e, R: randomRotation(rng), scale: 0.6 + rng.next(), handed: rng.next() < 0.5 ? 'Left' : 'Right', palmAt: { x: rng.next(), y: rng.next() }, unitsPerMetre: 1 + 2 * rng.next() });
    const got = fingerFlexion(lm.world);
    assert.ok(ref && got);
    for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) assert.ok(Math.abs(ref[f].total - got[f].total) < 1e-6, `${f}: ${ref[f].total} vs ${got[f].total}`);
    assert.ok(Math.abs(vSpreadDeg(handLandmarks({ e }).world) - vSpreadDeg(lm.world)) < 1e-6);
  }
});

test('hand model is the exact inverse of the kinematics: extension round-trips for any pose', () => {
  const rng = makeRng(2);
  for (let i = 0; i < 100; i++) {
    const e = [rng.next(), rng.next(), rng.next(), rng.next(), rng.next()];
    const back = extension(/** @type {any} */ (fingerFlexion(handLandmarks({ e, R: randomRotation(rng) }).world)), calib);
    for (let f = 0; f < 5; f++) assert.ok(Math.abs(back[f] - e[f]) < 1e-6, `finger ${f}: ${back[f]} vs ${e[f]}`);
  }
  // monotone: more extension -> less flexion
  const a = fingerFlexion(localLandmarks([0, 0.2, 0.2, 0.2, 0.2], calib).map(([x, y, z]) => ({ x, y, z })));
  const b = fingerFlexion(localLandmarks([0, 0.8, 0.8, 0.8, 0.8], calib).map(([x, y, z]) => ({ x, y, z })));
  assert.ok(a && b && a.index.total > b.index.total);
});

test('kinematics: noise robustness, V-spread, palm measures, malformed input', () => {
  const rng = makeRng(3);
  let sq = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    const e = [0.2, rng.next(), rng.next(), rng.next(), rng.next()];
    const lm = handLandmarks({ e, R: randomRotation(rng), noise: { worldSd: 0.002 }, rng });
    const got = extension(/** @type {any} */ (fingerFlexion(lm.world)), calib);
    for (let f = 1; f < 5; f++) { sq += (got[f] - e[f]) ** 2; n += 1; }
  }
  const sd = Math.sqrt(sq / n);
  console.log(`  extension error sd with 2 mm landmark noise: ${sd.toFixed(3)}`);
  assert.ok(sd < 0.08, `sd ${sd}`);
  const open = handLandmarks({ e: [0.2, 1, 1, 0.05, 0.05] });
  assert.ok(vSpreadDeg(open.world) > 3, `scissors spread ${vSpreadDeg(open.world)}`);
  const p43 = handLandmarks({ e: [0, 0, 0, 0, 0], aspect: 4 / 3 }), p169 = handLandmarks({ e: [0, 0, 0, 0, 0], aspect: 16 / 9 });
  assert.ok(Math.abs(palmSize(p43.image, 4 / 3) - palmSize(p169.image, 16 / 9)) < 1e-9, 'palm size is aspect-independent');
  assert.ok(Math.abs(palmCenter(p43.image, 4 / 3).y - 0.5) < 1e-9);
  assert.equal(frameFeatures(/** @type {any} */ ({ present: false }), calib), null);
  assert.equal(frameFeatures(/** @type {any} */ ({ present: true, t: 0, index: 0, image: [], world: [] }), calib), null);
  const bad = handLandmarks({ e: [0, 0, 0, 0, 0] }); bad.world[7].x = NaN;
  assert.equal(frameFeatures(frameOf(bad), calib), null);
  const s = frameFeatures(frameOf(handLandmarks({ e: [0.3, 1, 1, 0, 0] })), calib);
  assert.ok(s && Math.abs(s.front - 1) < 1e-6 && Math.abs(s.back) < 1e-6);
  assert.deepEqual(openingFromBaseline([0.1, 0.55], [0.1, 0.1]).map((v) => +v.toFixed(3)), [0, 0.5]);
});

/** Run a simulated round through the stroke tracker. */
function track(sim, cfg) {
  const st = createStrokeTracker(cfg);
  const events = [];
  for (const fr of sim.frames) {
    const s = frameFeatures(fr, calib);
    if (!s) continue;
    for (const ev of st.push(s.t, s.cy, s.palm)) events.push(ev);
  }
  return { events, st };
}

test('stroke tracker: counts the priming beats and dates the landing at the true bottom', () => {
  for (const fps of [30, 60]) {
    const errs = [];
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed);
      const sim = simulateThrow({ move: /** @type {0|1|2} */ (seed % 3), rng, fps });
      const { events } = track(sim);
      const bottoms = events.filter((e) => e.type === 'bottom');
      assert.equal(bottoms.length, 4, `seed ${seed} fps ${fps}: ${bottoms.length} bottoms`);
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(bottoms[k].t - sim.truth.tBeats[k]) < 70, `beat ${k} off by ${bottoms[k].t - sim.truth.tBeats[k]}`);
      errs.push(bottoms[3].t - sim.truth.tLanding);
    }
    const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
    const worst = Math.max(...errs.map(Math.abs));
    console.log(`  landing detection error at ${fps} fps: mean ${mean.toFixed(1)} ms, worst ${worst.toFixed(1)} ms`);
    assert.ok(Math.abs(mean) < 1000 / fps, `mean landing error ${mean}`);
    assert.ok(worst < 2.5 * (1000 / fps), `worst landing error ${worst}`);
  }
});

test('stroke tracker: independent of camera distance; ignores tremor; resets on timeout and lost hand', () => {
  for (const size of [0.1, 0.19, 0.3]) {
    const sim = simulateThrow({ move: 1, rng: makeRng(5), cfg: { palmSize: size } });
    assert.equal(track(sim).events.filter((e) => e.type === 'bottom').length, 4, `palm size ${size}`);
  }
  const still = createStrokeTracker();
  const rng = makeRng(6);
  let beats = 0;
  for (let t = 0; t < 4000; t += 33) beats += still.push(t, 0.5 + 0.03 * Math.sin(t / 60) + rng.normal(0, 0.002), 0.19).filter((e) => e.type === 'bottom').length;
  assert.equal(beats, 0, 'tremor of 0.16 palm lengths must not count as beats');
  // timeout: two beats then stillness
  const sim = simulateThrow({ move: 0, rng: makeRng(7), cfg: { settleMs: 2500 } });
  const { events, st } = track(sim);
  assert.ok(events.some((e) => e.type === 'rhythmReset' && e.reason === 'timeout'));
  assert.equal(st.state().beatCount, 0);
  // lost hand: a gap longer than lostMs resets the rhythm
  const tr = createStrokeTracker();
  const sim2 = simulateThrow({ move: 0, rng: makeRng(8) });
  let reset = false;
  for (const fr of sim2.frames) {
    const s = frameFeatures(fr, calib); if (!s) continue;
    if (s.t > sim2.truth.tBeats[1] + 20 && s.t < sim2.truth.tBeats[1] + 500) continue; // hand disappears
    if (tr.push(s.t, s.cy, s.palm).some((e) => e.type === 'rhythmReset' && e.reason === 'lost')) reset = true;
  }
  assert.ok(reset);
  // garbage in: no throw, no events
  assert.deepEqual(tr.push(NaN, 0.5, 0.2), []);
  assert.deepEqual(tr.push(1e9, 0.5, 0), []);
});

test('stroke tracker: period estimate and landing prediction are accurate enough to anchor priors', () => {
  const errTempo = [], errDescent = [], perErr = [];
  for (let seed = 1; seed <= 80; seed++) {
    const sim = simulateThrow({ move: 2, rng: makeRng(100 + seed) });
    const st = createStrokeTracker();
    let tempoPred = null, descentPred = null;
    for (const fr of sim.frames) {
      const s = frameFeatures(fr, calib); if (!s) continue;
      const evs = st.push(s.t, s.cy, s.palm);
      const state = st.state();
      if (evs.some((e) => e.type === 'bottom' && e.index === 3)) {
        tempoPred = predictLanding(state, s.t).tHat;
        perErr.push(Math.abs(/** @type {number} */ (state.periodMs) - (sim.truth.tBeats[2] - sim.truth.tBeats[0]) / 2));
      }
      if (state.beatCount === 3 && evs.some((e) => e.type === 'descentStart')) {
        const p = predictLanding(state, s.t);
        assert.equal(p.source, 'descent');
        descentPred = p.tHat;
      }
    }
    assert.ok(tempoPred !== null && descentPred !== null, `seed ${seed}`);
    errTempo.push(Math.abs(tempoPred - sim.truth.tLanding));
    errDescent.push(Math.abs(descentPred - sim.truth.tLanding));
  }
  const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`  landing prediction MAE: tempo ${m(errTempo).toFixed(1)} ms, descent ${m(errDescent).toFixed(1)} ms; period MAE ${m(perErr).toFixed(1)} ms`);
  assert.ok(m(errTempo) < 60 && m(errDescent) < 45 && m(perErr) < 30);
});

test('kinematic player: deterministic, monotone timestamps, fist during priming, options behave', () => {
  const a = simulateThrow({ move: 1, rng: makeRng(9) }), b = simulateThrow({ move: 1, rng: makeRng(9) });
  assert.deepEqual(a.frames.map((f) => f.t), b.frames.map((f) => f.t));
  for (let i = 1; i < a.frames.length; i++) assert.ok(a.frames[i].t > a.frames[i - 1].t && a.frames[i].index === a.frames[i - 1].index + 1);
  const fps = (a.frames.length - 1) / ((a.frames[a.frames.length - 1].t - a.frames[0].t) / 1000);
  assert.ok(Math.abs(fps - 30) < 1);
  for (const fr of a.frames) {
    const s = frameFeatures(fr, calib); assert.ok(s);
    if (fr.t < a.truth.tBeats[2]) assert.ok(s.front < 0.2 && s.back < 0.2, `fist during priming (front ${s.front})`);
  }
  const last = /** @type {any} */ (frameFeatures(a.frames[a.frames.length - 1], calib));
  assert.ok(last.front > 0.75 && last.back > 0.75, `paper at the end (front ${last.front}, back ${last.back})`);
  // bottom of the throw stroke is the lowest palm position
  const plan = { bottoms: [1000], descents: [200], amplitudes: [1.5] };
  assert.ok(Math.abs(strokeProfile(plan, 1000).y - 1.5) < 1e-9 && strokeProfile(plan, 900).speed > 5);
  const late = simulateThrow({ move: 2, rng: makeRng(10), late: { afterLandingMs: 120 } });
  const atLanding = late.frames.filter((f) => f.t <= late.truth.tLanding).pop();
  assert.ok(/** @type {any} */ (frameFeatures(/** @type {any} */ (atLanding), calib)).front < 0.2, 'late throw: still a fist at landing');
  const drop = simulateThrow({ move: 0, rng: makeRng(11), dropout: 0.2 });
  assert.ok(drop.frames.some((f) => !f.present) && drop.frames.some((f) => f.present));
  const odd = simulateThrow({ move: 0, rng: makeRng(12), nonRps: [0, 1, 0, 0, 0] });
  assert.equal(odd.truth.move, null);
  const shown = simulateThrow({ move: 2, rng: makeRng(13), noFist: true });
  assert.ok(/** @type {any} */ (frameFeatures(shown.frames[3], calib)).front > 0.8);
  const feint = simulateThrow({ move: 0, rng: makeRng(14), feint: { from: 1, switchLeadMs: 150, morphMs: 100 } });
  const mid = feint.frames.filter((f) => f.t <= feint.truth.tLanding - 150).pop();
  assert.ok(/** @type {any} */ (frameFeatures(/** @type {any} */ (mid), calib)).front > 0.5, 'feint shows paper in the air');
  assert.ok(/** @type {any} */ (frameFeatures(feint.frames[feint.frames.length - 1], calib)).front < 0.15, 'and ends as rock');
});


test('palmSize stays stable when the hand is pointed knuckles-first or sideways at the camera', () => {
  const pFront = palmSize(handLandmarks({ e: [0, 0, 0, 0, 0], aspect: 4 / 3 }).image, 4 / 3);
  for (const [rx, ry, rz] of [[90, 0, 0], [110, 35, -20], [180, 82, 0], [150, -65, 30]]) {
    const angled = handLandmarks({ e: [0, 0, 0, 0, 0], R: rotationFromEuler(rx, ry, rz), aspect: 4 / 3 });
    const ps = palmSize(angled.image, 4 / 3);
    assert.ok(ps >= 0.7 * pFront && ps <= 1.35 * pFront, `angle (${rx},${ry},${rz}) palmSize ${ps.toFixed(3)} vs ${pFront.toFixed(3)}`);
  }
});
