// @ts-check
// Regression tests for the defects found by the independent review of v4 (docs/tez/05a, section "bağımsız
// inceleme"). Each test stages the situation that broke and asserts the property that must hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../web/js/core/rng.js';
import { createRoundEngine } from '../web/js/core/round_engine.js';
import { createStrokeTracker } from '../web/js/core/stroke.js';
import { createMetrics } from '../web/js/core/metrics.js';
import { learnFusionWeights } from '../web/js/core/decision.js';
import { frameFeatures, defaultCalibration } from '../web/js/core/kinematics.js';
import { createPlayerModel } from '../web/js/core/player_model.js';
import { simulateThrow } from '../web/js/sim/kinematic_player.js';
import { createSession, runSession } from '../web/js/sim/session.js';
import { ROCK, PAPER, SCISSORS } from '../web/js/core/constants.js';
import { minJerk } from '../web/js/core/math.js';
import { genFrames, strokePlan, fingerPlan, absent, freshEngine, feed, FIST } from './helpers/frames.js';

const VALID = new Set(['AI', 'PLAYER', 'TIE']);
const resultOf = (/** @type {any[]} */ events) => { const e = events.find((x) => x.type === 'result'); return e ? e.result : null; };
const judgedOf = (/** @type {any} */ res) => res.commits.find((/** @type {any} */ c) => c.seq === res.judgedSeq);
const tally = (/** @type {any[]} */ results) => { /** @type {Record<string, number>} */ const c = {}; for (const r of results) c[r.verdict] = (c[r.verdict] ?? 0) + 1; return c; };

test('a rebuilt engine on the same commit log continues the round numbering (the game used to die here)', () => {
  const { engine: a, player, commitLog } = freshEngine(1);
  const simA = simulateThrow({ move: PAPER, rng: makeRng(2), t0: 1000 });
  const resA = resultOf(feed(a, simA.frames));
  assert.equal(resA.round, 1);
  a.acknowledge();
  // settings change, mode switch, new profile ...: a new engine, the same session log
  const b = createRoundEngine({ player, commitLog, rng: makeRng(3), cfg: { sensitivity: 1.25 } });
  const simB = simulateThrow({ move: ROCK, rng: makeRng(4), t0: simA.truth.tEnd + 500, frameIndex: simA.truth.nextFrameIndex });
  const resB = resultOf(feed(b, simB.frames));
  assert.ok(resB, 'the second engine judges a round');
  assert.equal(resB.round, 2);
  assert.ok(resB.sealOk && resB.chainOk);
  // ... also when the first engine was rebuilt in the middle of a round
  b.acknowledge();
  const simC = simulateThrow({ move: SCISSORS, rng: makeRng(5), t0: simB.truth.tEnd + 500, frameIndex: simB.truth.nextFrameIndex });
  const cut = simC.frames.filter((f) => f.t < simC.truth.tLanding - 60);
  feed(b, cut);
  assert.equal(b.phase, 'FLIGHT');
  const aborted = b.abortRound('MANUAL');
  assert.equal(aborted[0].type, 'aborted');
  const c = createRoundEngine({ player, commitLog, rng: makeRng(6) });
  const simD = simulateThrow({ move: PAPER, rng: makeRng(7), t0: simC.truth.tEnd + 500, frameIndex: simC.truth.nextFrameIndex });
  const resD = resultOf(feed(c, simD.frames));
  assert.equal(resD.round, 4);
  assert.ok(commitLog.verifyChain().ok);
  assert.deepEqual(commitLog.sealedRounds(), [], 'every seal of every round, judged or aborted, has been opened');
});

test('turnuva cannot be beaten by opening ring and pinky at the last moment', () => {
  // index + middle open early (looks like scissors), ring + pinky follow just before landing: the referee
  // accepts PAPER as soon as the back group has measurably opened, however unlikely the AI thought it was
  let judged = 0, valid = 0, losses = 0;
  for (const fps of [30, 60]) for (const fromLeadMs of [250, 320]) for (const switchLeadMs of [20, 50, 80, 110]) for (const morphMs of [80, 180]) {
    for (let seed = 1; seed <= 12; seed++) {
      const { engine } = freshEngine(seed, { rules: 'turnuva' });
      const sim = simulateThrow({ move: PAPER, rng: makeRng(7000 + seed), t0: 1000, fps, feint: { from: SCISSORS, switchLeadMs, morphMs, fromLeadMs } });
      const res = resultOf(feed(engine, sim.frames));
      if (!res) continue;
      judged += 1;
      if (res.valid) valid += 1;
      if (res.verdict === 'PLAYER') losses += 1;
    }
  }
  console.log(`  late ring/pinky: judged ${judged}, valid ${valid}, player wins ${losses}`);
  assert.ok(judged >= 350 && valid >= 60, `judged ${judged}, valid ${valid}`);
  assert.equal(losses, 0);
});

test('turnuva cannot be beaten by training the AI on early openings and then opening late', () => {
  const train = createSession({ seed: 5, rules: 'turnuva', behaviour: 'biased', behaviourParams: { p: [0.1, 0.45, 0.45] }, style: { leadMean: 330, leadSd: 8 } });
  for (let i = 0; i < 150; i++) train.playRound();
  const json = JSON.parse(JSON.stringify(train.player.toJSON()));
  const learned = train.player.profile().onsetLeadFrontMs, prior = /** @type {any} */ (train.player.onsetPrior('front'));
  assert.ok(learned.mean > 280 && learned.sd < 40, `the player really is this consistent: ${learned.mean} +- ${learned.sd}`);
  assert.ok(prior.leadSdMs >= 40, `the prior the AI uses keeps a floor on its sd: ${prior.leadSdMs}`);
  let n = 0, valid = 0, losses = 0;
  for (const lead of [55, 70, 85, 100]) for (let seed = 1; seed <= 40; seed++) {
    const s = createSession({ seed: 1000 + seed, rules: 'turnuva', behaviour: 'biased', behaviourParams: { p: [0, 0.5, 0.5] }, style: { leadMean: lead, leadSd: 4 }, playerJson: json });
    const r = s.playRound().result;
    if (!r) continue;
    n += 1; if (r.valid) valid += 1; if (r.verdict === 'PLAYER') losses += 1;
  }
  console.log(`  train early / deviate late: judged ${n}, valid ${valid}, player wins ${losses}`);
  assert.ok(n >= 150 && valid >= 30);
  assert.equal(losses, 0);
});

test('a hand that only jitters starts neither strokes nor rounds, at any frame rate', () => {
  for (const fps of [30, 60, 120]) for (const noise of [1, 2]) {
    const sim = simulateThrow({ move: ROCK, rng: makeRng(11), fps, primeBeats: 0, still: true, t0: 1000, cfg: { leadInMs: 15000, settleMs: 0, imageNoiseSd: 0.003 * noise, worldNoiseSd: 0.002 * noise } });
    const tracker = createStrokeTracker();
    let starts = 0, still = 0, n = 0;
    for (const f of sim.frames) {
      const k = /** @type {any} */ (frameFeatures(f, defaultCalibration()));
      starts += tracker.push(k.t, k.cy, k.palm).filter((e) => e.type === 'descentStart').length;
      n += 1; if (tracker.state().stillSinceT !== null) still += 1;
    }
    assert.equal(starts, 0, `${fps} fps, noise x${noise}: spurious descents`);
    assert.ok(still / n > 0.97, `${fps} fps, noise x${noise}: still on ${(100 * still / n).toFixed(1)} % of frames`);
    // single-stroke mode: the round is armed quickly and then simply waits; nothing is judged or learned
    const { engine, player } = freshEngine(1, { primeBeats: 0 });
    const events = feed(engine, sim.frames);
    const armedAt = events.find((e) => e.type === 'flightStart');
    assert.ok(armedAt && armedAt.t - sim.frames[0].t < 1500, `${fps} fps, noise x${noise}: armed after ${armedAt ? armedAt.t - sim.frames[0].t : 'never'} ms`);
    assert.equal(events.filter((e) => e.type === 'result').length, 0, `${fps} fps, noise x${noise}: phantom rounds`);
    assert.equal(events.filter((e) => e.type === 'commit').length, 1, 'only the behavioural seal exists');
    assert.equal(player.sequence.length, 0);
    assert.equal(engine.phase, 'ARMED');
  }
});

test('stroke tracker: every descent ends as exactly one of bottom / weakBottom / falseStart', () => {
  const run = (/** @type {number} */ amp) => {
    const plan = strokePlan({ beats: 1, amp, leadIn: 600 });
    const frames = genFrames({ rng: makeRng(21), fps: 60, tEnd: plan.tLanding + 400, yPL: plan.yPL, ext: () => [...FIST] });
    const tracker = createStrokeTracker();
    /** @type {string[]} */ const types = [];
    for (const f of frames) { const k = /** @type {any} */ (frameFeatures(f, defaultCalibration())); for (const e of tracker.push(k.t, k.cy, k.palm)) types.push(e.type); }
    return types;
  };
  assert.deepEqual(run(1.6), ['descentStart', 'bottom']);
  assert.deepEqual(run(0.3), ['descentStart', 'weakBottom']);
  assert.ok(!run(0.05).includes('bottom') && !run(0.05).includes('weakBottom'), 'a 0.05 PL twitch is not a stroke');
});

test('single-stroke mode: the fist baseline comes from the hold that armed the round (low frame rates)', () => {
  for (const fps of [15, 20, 25]) {
    const r = runSession({ seed: 60 + fps, rounds: 60, primeBeats: 0, fps });
    const c = tally(r.results);
    assert.equal(c.VOID_NO_FIST ?? 0, 0, `${fps} fps: ${JSON.stringify(c)}`);
    assert.ok((c.VOID_UNKNOWN ?? 0) <= 2, `${fps} fps: ${JSON.stringify(c)}`);
    assert.ok(r.results.length >= 56, `${fps} fps: ${r.results.length} judged of 60`);
    assert.equal(c.PLAYER ?? 0, 0);
  }
});

test('single-stroke mode: waiting long before the throw does not blunt the referee; early openers are not aborted', () => {
  const foulRate = (/** @type {number} */ leadInMs) => {
    const r = runSession({ seed: 71, rounds: 120, primeBeats: 0, throwOptions: () => ({ cfg: { leadInMs } }) });
    assert.equal(r.aborted, 0, `rest ${leadInMs} ms: aborted ${r.aborted}`);
    return (tally(r.results).FOUL_LATE ?? 0) / r.results.length;
  };
  const short = foulRate(1000), long = foulRate(3500);
  console.log(`  single stroke: fouls ${(100 * short).toFixed(1)} % after a 1.0 s rest, ${(100 * long).toFixed(1)} % after 3.5 s`);
  assert.ok(long < 0.15 && long < short + 0.08, `fouls after a long wait ${long} vs ${short}`);
  const early = runSession({ seed: 72, rounds: 120, primeBeats: 0, style: 'early' });
  assert.ok(early.aborted <= 1, `early openers aborted: ${early.aborted}`);
  assert.ok((tally(early.results).FOUL_LATE ?? 0) / early.results.length < 0.08);
});

test('metronome mode at 120 and 144 fps: a late stroke never gets a post-landing commitment judged', () => {
  for (const fps of [120, 144]) {
    let judged = 0, retro = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const { engine } = freshEngine(seed);
      engine.setMode({ primeBeats: 3, metronome: { periodMs: 520 } });
      const sched = /** @type {{beatTimes:number[]}} */ (engine.armMetronome(1000));
      const late = 285 + (seed % 3) * 5; // the throw stroke bottoms this long after the scheduled throw
      const bt = sched.beatTimes.slice(); bt[3] += late;
      const sim = simulateThrow({ move: seed % 2 ? PAPER : SCISSORS, rng: makeRng(100 + seed), t0: 1000, fps, beatTimes: bt, style: { leadMean: late - 10 - (seed % 7) * 12, leadSd: 5 }, cfg: { leadInMs: 300, descentFrac: 0.63 } });
      const res = resultOf(feed(engine, sim.frames));
      if (!res) continue;
      judged += 1;
      const j = judgedOf(res);
      assert.ok(!j.postLanding && j.t < res.timing.tLanding, `${fps} fps seed ${seed}: judged seal at ${j.t}, landing ${res.timing.tLanding} (${res.landingSource})`);
      assert.ok(res.timing.leadToLandingMs > 0);
      for (const c of res.commits) assert.equal(c.postLanding, c.t >= res.timing.tLanding, 'post-landing flag follows the time stamp');
      if (res.landingSource === 'metronome') { retro += 1; assert.ok(res.commits.some((/** @type {any} */ c) => c.postLanding) || res.commits.length === 1); }
    }
    assert.ok(judged >= 20 && retro >= 5, `${fps} fps: judged ${judged}, retroactive landings ${retro}`);
  }
});

test('a tracking gap over the fast part of the stroke voids the round instead of judging stale or late evidence', () => {
  for (const fps of [30, 60]) {
    let voids = 0, late = 0, n = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const plan = strokePlan({});
      const L = plan.tLanding, move = 1 + (seed % 2);
      /** @type {{t0:number, dur:number, to:number}[][]} */ const segs = [[], [], [], [], []];
      for (const f of move === PAPER ? [1, 2, 3, 4] : [1, 2]) segs[f].push({ t0: L - 40, dur: 90, to: 1 });
      // untracked from 120 ms to 5 ms before the true landing; found again when the hand has stopped
      const frames = genFrames({ rng: makeRng(700 + seed), fps, tEnd: L + 800, yPL: plan.yPL, ext: fingerPlan(FIST, segs), lost: (t) => t >= L - 120 && t <= L - 5 });
      const res = resultOf(feed(freshEngine(seed).engine, frames));
      if (!res) continue;
      n += 1;
      if (res.verdict === 'VOID_NO_HAND') voids += 1;
      if (res.valid && res.timing.tFinalCommit > L) late += 1;
      assert.notEqual(res.verdict, 'FOUL_LATE', 'without fresh in-air evidence the player is not blamed');
    }
    assert.equal(late, 0, `${fps} fps: valid rounds whose judged seal was made after the true landing`);
    assert.ok(n >= 28 && voids >= n - 1, `${fps} fps: ${voids} voids of ${n}`);
  }
  // one missing frame right before landing is tolerated: the round is still judged
  let judged = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const plan = strokePlan({});
    const L = plan.tLanding;
    const frames = genFrames({ rng: makeRng(900 + seed), fps: 30, tEnd: L + 800, yPL: plan.yPL, ext: fingerPlan(FIST, [[], [{ t0: L - 220, dur: 110, to: 1 }], [{ t0: L - 220, dur: 110, to: 1 }], [], []]), lost: (t) => t >= L - 80 && t <= L - 50 });
    const res = resultOf(feed(freshEngine(seed).engine, frames));
    if (res && res.valid) { judged += 1; assert.equal(res.playerMove, SCISSORS); assert.notEqual(res.verdict, 'PLAYER'); }
  }
  assert.ok(judged >= 15, `one dropped frame: ${judged} of 20 still judged`);
});

test('single-stroke mode: a stroke hidden by a dropped frame is void, not a judged behavioural guess', () => {
  // The whole (very fast) stroke lies between two tracked frames with one dropped frame in between, so the
  // last in-air frame is one of the armed wait, on which the AI may not revise. Judging such a round would
  // pit the unrevised behavioural seal against a legal ROCK - and lose a third of the time.
  for (const fps of [15, 20, 30]) {
    /** @type {Record<string, number>} */ const c = {};
    for (let seed = 1; seed <= 30; seed++) {
      const dt = 1000 / fps;
      const player = createPlayerModel();
      player.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 }); // random behavioural move
      const { engine } = freshEngine(seed, { primeBeats: 0, rules: 'turnuva' }, player);
      const t0 = 1000, K = Math.round(1400 / dt);
      const tStart = t0 + K * dt + 5, dur = 2 * dt - 15;
      const frames = genFrames({ rng: makeRng(300 + seed), fps, t0, tEnd: t0 + (K + 2) * dt + 900, jitter: 0,
        yPL: (t) => 1.6 * minJerk((t - tStart) / dur), ext: () => [...FIST], lost: (t) => Math.abs(t - (t0 + (K + 1) * dt)) < 1 });
      const res = resultOf(feed(engine, frames));
      const key = res ? res.verdict : 'none';
      c[key] = (c[key] ?? 0) + 1;
      assert.ok(!res || !res.valid, `${fps} fps seed ${seed}: judged ${res ? res.verdict : ''}`);
    }
    assert.ok((c.VOID_NO_HAND ?? 0) >= 28, `${fps} fps: ${JSON.stringify(c)}`);
  }
});

test('metronome mode: a stall past the scheduled throw aborts the count-in; arming with the hand away does not', () => {
  const mk = () => { const e = freshEngine(1).engine; e.setMode({ primeBeats: 3, metronome: { periodMs: 520 } }); return e; };
  // (a) no frames for 3 s during the count-in (hidden tab): no flight, no negative lead, just an abort
  let e = mk();
  const sim = simulateThrow({ move: ROCK, rng: makeRng(3), t0: 1000, primeBeats: 0, still: true, cfg: { leadInMs: 300, settleMs: 0 } });
  feed(e, sim.frames);
  let t = sim.frames[sim.frames.length - 1].t, i = sim.truth.nextFrameIndex;
  assert.ok(e.armMetronome(t));
  const after = simulateThrow({ move: ROCK, rng: makeRng(4), t0: t + 3000, frameIndex: i, primeBeats: 0, still: true, cfg: { leadInMs: 300, settleMs: 0 } });
  const ev = feed(e, after.frames.slice(0, 5));
  assert.ok(ev.some((x) => x.type === 'aborted'), ev.map((x) => x.type).join(' '));
  assert.ok(!ev.some((x) => x.type === 'result' || x.type === 'flightStart'));
  assert.equal(e.phase, 'IDLE');
  // (b) the hand was seen, then left the picture for a second (to press the button), then the count-in starts
  e = mk();
  feed(e, sim.frames);
  t = sim.frames[sim.frames.length - 1].t; i = sim.truth.nextFrameIndex;
  for (let k = 0; k < 30; k++) e.pushFrame(absent(t += 33, i++));
  assert.ok(e.armMetronome(t));
  assert.deepEqual(e.pushFrame(absent(t += 33, i++)), []);
  assert.equal(e.phase, 'PRIMING');
});

test('the decision freeze cannot void the turnuva guarantee (it is ignored there) but acts under serbest', () => {
  const run = (/** @type {string} */ rules) => runSession({ seed: 81, rounds: 220, rules, engineCfg: { freezeLeadMs: 200 } }).results;
  const tur = run('turnuva'), ser = run('serbest');
  assert.equal(tally(tur).PLAYER ?? 0, 0, 'turnuva with freezeLeadMs = 200');
  assert.ok((tally(ser).PLAYER ?? 0) > 5, `serbest with freezeLeadMs = 200 leaves the human real wins: ${JSON.stringify(tally(ser))}`);
});

test('I5: with commitments that really differ, the referee decides the same', () => {
  // random behavioural moves (no exploitation budget) and, in the second half, a long freeze so that the
  // JUDGED moves differ too; the verdict class, the throw, the landing and the headings must not move
  const randomPlayer = () => { const p = createPlayerModel(); p.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 }); return p; };
  let checked = 0, differingFirst = 0, differingJudged = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const frozen = seed > 30;
    const opts = seed % 4 === 0 ? { late: { afterLandingMs: 90 } } : seed % 4 === 1 ? { feint: { from: PAPER, switchLeadMs: 150, morphMs: 100 } } : {};
    const sim = simulateThrow({ move: /** @type {0|1|2} */ (seed % 3), rng: makeRng(500 + seed), t0: 1000, style: seed % 2 ? 'normal' : 'late', ...opts });
    const outs = [1, 2, 3].map((k) => resultOf(feed(freshEngine(seed * 10 + k, { rules: frozen ? 'serbest' : 'standart', freezeLeadMs: frozen ? 5000 : 0 }, randomPlayer()).engine, sim.frames)));
    if (!outs[0]) { assert.ok(outs.every((o) => o === null)); continue; }
    checked += 1;
    if (new Set(outs.map((o) => o.commits[0].move)).size > 1) differingFirst += 1;
    if (new Set(outs.map((o) => o.aiMove)).size > 1) differingJudged += 1;
    const cls = (/** @type {any} */ r) => (VALID.has(r.verdict) ? 'VALID' : r.verdict);
    for (const o of outs.slice(1)) {
      assert.equal(cls(o), cls(outs[0]), `seed ${seed}`);
      assert.equal(o.playerMove, outs[0].playerMove);
      assert.equal(o.timing.tLanding, outs[0].timing.tLanding);
      assert.equal(o.landingSource, outs[0].landingSource);
      assert.equal(o.kinematics.headingFront, outs[0].kinematics.headingFront);
      assert.equal(o.kinematics.headingBack, outs[0].kinematics.headingBack);
      assert.equal(o.timing.tComplete, outs[0].timing.tComplete);
    }
  }
  console.log(`  I5: ${checked} traces, behavioural seals differ in ${differingFirst}, judged moves differ in ${differingJudged}`);
  assert.ok(checked > 50 && differingFirst > 30 && differingJudged > 12, 'the test must compare runs that actually differ');
});

test('I4: flight statistics count what was measured; undefined quantities are null', () => {
  const r = runSession({ seed: 91, rounds: 60, fps: 30 });
  let rock = 0, held = 0;
  for (const res of r.results) {
    assert.equal(res.timing.trackedInFlight, 1, 'every frame before the landing was tracked');
    assert.ok(Math.abs(res.timing.fpsInFlight - 30) < 1.5, `fps in flight ${res.timing.fpsInFlight}`);
    assert.ok(res.timing.lastInAirAgeMs > 0 && res.timing.lastInAirAgeMs < 45);
    if (res.valid && res.playerMove === ROCK) { rock += 1; assert.equal(res.timing.leadToCompletionMs, null, 'a fist has no completion time'); assert.equal(res.progressAtCommit, null); }
    const j = judgedOf(res);
    if (res.valid && j.reason === 'BEHAVIOUR' && res.playerMove !== ROCK) { held += 1; assert.ok(res.progressAtCommit !== null && Math.abs(res.progressAtCommit) < 0.2, `measured, not hard-coded: ${res.progressAtCommit}`); }
  }
  assert.ok(rock >= 8);
  void held;
  // weak throws are dated at the end of the weak stroke: the reported frame rate is the camera's
  const soft = runSession({ seed: 92, rounds: 30, fps: 30, throwOptions: () => ({ throwAmplitudeScale: 0.22 }) }).results.filter((x) => x.landingSource === 'soft');
  assert.ok(soft.length >= 20);
  for (const res of soft) assert.ok(Math.abs(res.timing.fpsInFlight - 30) < 1.5, `soft landing fps ${res.timing.fpsInFlight}`);
});

test('I3: an aborted round opens and verifies the seals it had shown', () => {
  const { engine, commitLog, player } = freshEngine(5, { primeBeats: 0 });
  const sim = simulateThrow({ move: ROCK, rng: makeRng(6), t0: 1000, primeBeats: 0, still: true, cfg: { leadInMs: 900, settleMs: 0 } });
  const armed = feed(engine, sim.frames);
  const seal = armed.find((e) => e.type === 'commit');
  assert.ok(seal && engine.phase === 'ARMED');
  assert.deepEqual(commitLog.sealedRounds(), [1]);
  let t = sim.frames[sim.frames.length - 1].t, i = sim.truth.nextFrameIndex;
  /** @type {any[]} */ const ev = [];
  for (let k = 0; k < 20; k++) ev.push(...engine.pushFrame(absent(t += 33, i++)));
  const ab = ev.find((e) => e.type === 'aborted');
  assert.ok(ab && ab.reason === 'HAND_LOST' && ab.round === 1);
  assert.equal(ab.commits.length, 1);
  assert.equal(ab.commits[0].hash, seal.commit.hash);
  assert.ok(ab.commits[0].verified && typeof ab.commits[0].payload === 'string' && ab.sealOk && ab.chainOk);
  assert.deepEqual(commitLog.sealedRounds(), []);
  assert.equal(player.rounds, 0, 'an aborted round teaches nothing');
});

test('a relaxed open hand is readable, and the sensor calibration adapts even when the first rounds are void', () => {
  const play = (/** @type {number} */ open, /** @type {number} */ rounds) => {
    const s = createSession({ seed: 33, behaviour: 'biased', behaviourParams: { p: [0, 1, 0] }, throwOptions: () => ({ nonRps: [0.9, open, open, open, open] }) });
    /** @type {string[]} */ const out = [];
    for (let i = 0; i < rounds; i++) { const r = s.playRound().result; out.push(r ? (r.valid ? `P${r.playerMove}` : r.verdict) : 'none'); }
    return { out, player: s.player };
  };
  // fingers at 75 % of the default open reading: readable as paper (at most the very first rounds are void)
  const mild = play(0.75, 20);
  assert.ok(mild.out.filter((v) => v === 'VOID_UNKNOWN').length <= 2, mild.out.join(' '));
  assert.ok(mild.out.filter((v) => v === 'P1').length >= 12, mild.out.join(' '));
  assert.ok(!mild.out.some((v) => v === 'P0' || v === 'P2'), 'never misread as another throw');
  // fingers at 62 %: unreadable at first, but the calibration learns the open posture from the stable
  // void shapes (no game outcome involved) and paper becomes playable within a few attempts
  const hard = play(0.62, 36);
  const first = hard.out.slice(0, 6), last = hard.out.slice(-16);
  console.log(`  relaxed paper (62 %): first 6 ${first.join(' ')} | last 16: ${last.filter((v) => v === 'P1').length} paper, ${last.filter((v) => v === 'VOID_UNKNOWN').length} unreadable`);
  assert.ok(first.includes('VOID_UNKNOWN'), 'the hard case really starts unreadable');
  assert.ok(last.filter((v) => v === 'VOID_UNKNOWN').length <= 1 && last.filter((v) => v === 'P1').length >= 9, last.join(' '));
  assert.ok(hard.player.calibration.thetaOpen[1] > defaultCalibration().thetaOpen[1] + 15, 'the open-finger angle was learned');
  assert.equal(hard.player.sequence.length, hard.out.filter((v) => v.startsWith('P')).length, 'void rounds taught nothing about the game');
});

test('a fist that the default calibration reads as half-open is not locked out: void first, then learned', () => {
  // this hand's fist has 120 deg of total finger flexion (default model: 215), i.e. it reads as 50 % open
  const handCalibration = { thetaFist: [70, 120, 122, 120, 116], thetaOpen: defaultCalibration().thetaOpen };
  const s = createSession({ seed: 44, throwOptions: () => ({ perturb: { handCalibration } }) });
  /** @type {string[]} */ const out = [];
  for (let i = 0; i < 24; i++) { const r = s.playRound().result; out.push(r ? r.verdict : 'none'); }
  const first = out.slice(0, 4), last = out.slice(-12);
  console.log(`  loose fist: first 4 ${first.join(' ')} | last 12: ${last.filter((v) => VALID.has(v)).length} valid, ${last.filter((v) => v === 'VOID_NO_FIST').length} no-fist`);
  assert.ok(first.includes('VOID_NO_FIST'), `the round starts and is voided, instead of nothing happening: ${first.join(' ')}`);
  assert.equal(last.filter((v) => v === 'VOID_NO_FIST' || v === 'none').length, 0, last.join(' '));
  assert.ok(last.filter((v) => VALID.has(v)).length >= 9, last.join(' '));
  assert.ok(s.player.calibration.thetaFist[1] < 190, `the fist angle was learned: ${s.player.calibration.thetaFist[1]}`);
  assert.equal(out.filter((v) => v === 'PLAYER').length, 0);
  // a clearly open hand pumped up and down still does not start a round
  const open = createSession({ seed: 45, behaviour: 'biased', behaviourParams: { p: [0, 1, 0] }, throwOptions: () => ({ noFist: true }) });
  for (let i = 0; i < 6; i++) open.playRound();
  assert.equal(open.results.length, 0);
});

test('fusion weights: one confident miss cannot outweigh many confident hits', () => {
  const u = [1 / 3, 1 / 3, 1 / 3];
  const miss = learnFusionWeights({ wPrior: 1, wKin: 1 }, { prior: u, kinLik: [1e-9, 1e-9, 1 - 2e-9], yTrue: ROCK });
  assert.ok(miss.wKin >= 0.9 - 1e-9 && miss.wKin < 1, `one miss moves wKin to ${miss.wKin}`);
  let w = miss;
  for (let i = 0; i < 60; i++) w = learnFusionWeights(w, { prior: u, kinLik: [0.7, 0.2, 0.1], yTrue: ROCK });
  assert.ok(w.wKin > 1, `sixty moderately confident hits recover it: ${w.wKin}`);
});

test('metrics: unconditional rates count every judged attempt; inconsistent documents are rejected', () => {
  const m = createMetrics();
  const round = (/** @type {string} */ verdict, /** @type {number|null} */ playerMove, reason = 'KINEMATIC') => ({
    verdict, valid: VALID.has(verdict), playerMove, aiMove: 1, judgedSeq: 1,
    commits: [{ seq: 0, reason: 'BEHAVIOUR', postLanding: false }, { seq: 1, reason, postLanding: false }],
    beliefAtFinalCommit: { post: [0.8, 0.1, 0.1] }, behaviour: { wouldBe: 'TIE' }, timing: { leadToLandingMs: 120, leadToCompletionMs: 60 }, progressAtCommit: 0.3,
  });
  for (let i = 0; i < 6; i++) m.record(round('AI', 0));
  m.record(round('FOUL_LATE', 1)); m.record(round('FOUL_LATE', 2)); m.record(round('VOID_UNKNOWN', null)); m.record(round('VOID_NO_HAND', null));
  const s = m.summary();
  assert.equal(s.rounds.judged, 10);
  assert.equal(s.unbeaten.p, 1, 'conditional on validity nothing was lost ...');
  assert.equal(s.attemptWinRate.p, 0.6, '... but only 6 of 10 attempts were won');
  assert.equal(s.noResultRate.p, 0.4);
  assert.equal(s.voidRate.k, 2);
  assert.equal(s.kinematicLeadMs.n, 6);
  // round trip
  const copy = createMetrics();
  assert.equal(copy.load(JSON.parse(JSON.stringify(m.toJSON()))), true);
  assert.deepEqual(copy.summary(), s);
  // documents that would make summary() throw are refused and leave the metrics fresh
  const base = m.toJSON();
  for (const bad of [{ ...base, ai: 'x' }, { ...base, valid: 3 }, { ...base, ai: 7, valid: 6 }, { ...base, top1: 99 }, { ...base, bins: base.bins.slice(1) }, { ...base, voids: { VOID_NO_HAND: -1 } }, { ...base, v: 3 }, null, 'x']) {
    const f = createMetrics();
    assert.equal(f.load(/** @type {any} */ (bad)), false);
    assert.doesNotThrow(() => f.summary());
    assert.equal(f.summary().rounds.judged, 0);
  }
});
