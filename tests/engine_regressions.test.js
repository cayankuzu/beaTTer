// @ts-check
// Regression tests for the defects found by the independent review of v4 (docs/tez/05a, section "bağımsız
// inceleme"). Each test stages the situation that broke and asserts the property that must hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../web/js/core/rng.js';
import { createRoundEngine } from '../web/js/core/round_engine.js';
import { createCommitLog } from '../web/js/core/commit.js';
import { createStrokeTracker } from '../web/js/core/stroke.js';
import { createMetrics } from '../web/js/core/metrics.js';
import { learnFusionWeights, foulNow, legalMassFor, chooseAction } from '../web/js/core/decision.js';
import { frameFeatures, defaultCalibration } from '../web/js/core/kinematics.js';
import { createPlayerModel } from '../web/js/core/player_model.js';
import { simulateThrow } from '../web/js/sim/kinematic_player.js';
import { createSession, runSession } from '../web/js/sim/session.js';
import { ROCK, PAPER, SCISSORS, RULES, payoff } from '../web/js/core/constants.js';
import { minJerk } from '../web/js/core/math.js';
import { genFrames, strokePlan, fingerPlan, absent, freshEngine, feed, FIST } from './helpers/frames.js';
import { runFuzz, parseFuzzArgs } from '../experiments/fuzz_guarantee.mjs';

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
      assert.ok(!j.postLanding && j.frame < res.landingFrame && j.t <= res.timing.tLanding, `${fps} fps seed ${seed}: judged seal at ${j.t} (frame ${j.frame}), landing ${res.timing.tLanding} (frame ${res.landingFrame}, ${res.landingSource})`);
      assert.ok(res.timing.leadToLandingMs >= 0);
      for (const c of res.commits) assert.equal(c.postLanding, c.frame >= res.landingFrame, 'the post-landing flag is the frame order');
      if (res.landingSource === 'metronome') { retro += 1; assert.ok(res.commits.some((/** @type {any} */ c) => c.postLanding) || res.commits.length === 1); }
    }
    assert.ok(judged >= 20 && retro >= 5, `${fps} fps: judged ${judged}, retroactive landings ${retro}`);
  }
});

test('metronome mode: a frame a few hundredths of a millisecond before the scheduled landing keeps its seal', () => {
  // The seal time is rounded to 0.1 ms, the frame time is not. A frame 0.02 ms before a landing that is
  // dated at the scheduled throw has a sealed time that rounds UP past the landing time. Flagging by
  // time discarded that seal while the referee still read that very frame: 108 player wins in 800
  // staged rounds. "Before the landing" is now decided by frame order alone.
  let rounds = 0, sealsOnLast = 0;
  /** @type {Record<string, number>} */ const c = {};
  for (const fps of [30, 60]) for (let seed = 1; seed <= 200; seed++) {
    const { engine } = freshEngine(seed);
    engine.setMode({ primeBeats: 3, metronome: { periodMs: 520 } });
    const sched = /** @type {{beatTimes:number[]}} */ (engine.armMetronome(1000.08));
    const throwT = sched.beatTimes[3];
    const sim = simulateThrow({ move: seed % 3 === 0 ? SCISSORS : PAPER, rng: makeRng(500 + seed), t0: 1000.5, fps, beatTimes: sched.beatTimes, still: true, style: { leadMean: 20 + (seed % 40) * 2.5, leadSd: 1 }, cfg: { leadInMs: 300, timestampJitterMs: 0 } });
    const fr = sim.frames;
    let k = -1;
    for (let i = 0; i < fr.length; i++) if (fr[i].t < throwT) k = i;
    if (k < 1 || !(throwT - 0.02 > fr[k - 1].t)) continue;
    fr[k].t = throwT - 0.02; // the last in-air frame, 0.02 ms before the scheduled landing
    const res = resultOf(feed(engine, fr));
    if (!res) continue;
    rounds += 1; c[res.verdict] = (c[res.verdict] ?? 0) + 1;
    assert.equal(res.landingSource, 'metronome');
    assert.equal(res.landingFrame, fr[k].index + 1, 'the landing frame is the first frame at or after the scheduled time');
    const onLast = res.commits.filter((/** @type {any} */ x) => x.frame === fr[k].index);
    sealsOnLast += onLast.length;
    for (const x of onLast) assert.equal(x.postLanding, false, `seed ${seed}: a seal on the last in-air frame was discarded`);
    if (onLast.length) assert.equal(judgedOf(res).frame, fr[k].index, 'the judged seal is the one made on the last in-air frame');
    assert.notEqual(res.verdict, 'PLAYER', `${fps} fps seed ${seed}`);
    assert.ok(res.timing.leadToLandingMs >= 0);
  }
  console.log(`  seal 0.02 ms before a scheduled landing: ${rounds} rounds ${JSON.stringify(c)}, ${sealsOnLast} seals on the last in-air frame, none discarded`);
  assert.ok(rounds >= 300 && sealsOnLast >= 80 && (c.AI ?? 0) + (c.TIE ?? 0) >= 150);
});

test('the legal set never holds three throws under turnuva, not even at a heading of exactly one half', () => {
  const t = RULES.turnuva;
  for (const hF of [0, 0.25, 0.5 - Number.EPSILON, 0.5, 0.5 + Number.EPSILON, 0.75, 1, NaN]) for (const hB of [0, 0.15 - 1e-12, 0.15, 0.5, 0.85 - 1e-12, 0.85, 1, NaN]) {
    const foul = foulNow(hF, hB, t);
    const legal = foul.filter((f) => !f).length;
    assert.ok(legal <= 2, `hF ${hF}, hB ${hB}: ${legal} legal throws`);
    // so a safe move exists whenever anything is legal, and the policy takes it whatever the belief says
    if (legal > 0) {
      const lm = legalMassFor({ pLegal: [1e-300, 1e-300, 1e-300], pLate: 1, post: [1 / 3, 1 / 3, 1 / 3], kinLik: [1 / 3, 1 / 3, 1 / 3] }, hF, hB, t);
      const choice = chooseAction(lm.mass, t, lm.legal);
      assert.equal(choice.stats[choice.action].safe, true);
      for (let y = 0; y < 3; y++) if (!foul[y]) assert.ok(payoff(/** @type {0|1|2} */ (choice.action), /** @type {0|1|2} */ (y)) >= 0, `hF ${hF}, hB ${hB}: AI ${choice.action} loses to legal ${y}`);
    }
  }
  // exactly one half counts as "open": ROCK is a foul, PAPER and SCISSORS are judged on the back group
  assert.deepEqual(foulNow(0.5, 0.5, t), [true, false, false]);
  assert.deepEqual(foulNow(0.5 - Number.EPSILON, 0.5, t), [false, true, true]);
});

test('the scissors rule: the AI decides against every throw the referee could still accept', () => {
  // v4.2.1 lets the referee accept a hand that settles as a clear scissors whenever the front group was
  // open, whatever the back heading says (ring and little finger rise with the other two). In the air
  // the AI therefore counts scissors as acceptable whenever the front group is open.
  const t = RULES.turnuva;
  assert.deepEqual(foulNow(0.9, 0.95, t), [true, false, true], 'front and back open: only paper, by the headings alone');
  assert.deepEqual(foulNow(0.9, 0.95, t, { coupledScissors: true }), [true, false, false], 'with the scissors rule: paper or scissors');
  assert.deepEqual(foulNow(0.2, 0.95, t, { coupledScissors: true }), [true, true, true], 'front closed: the rule does not apply');
  for (const hF of [0, 0.25, 0.5 - Number.EPSILON, 0.5, 0.5 + Number.EPSILON, 0.75, 1, NaN]) for (const hB of [0, 0.15 - 1e-12, 0.15, 0.5, 0.85 - 1e-12, 0.85, 1, NaN]) {
    const plain = foulNow(hF, hB, t), sup = foulNow(hF, hB, t, { coupledScissors: true });
    for (let y = 0; y < 3; y++) assert.ok(!sup[y] || plain[y], 'the superset contains every throw the plain rule accepts');
    const legal = sup.filter((f) => !f).length;
    assert.ok(legal <= 2, `hF ${hF}, hB ${hB}: ${legal} acceptable throws`);
    if (legal > 0) {
      const lm = legalMassFor({ pLegal: [1e-300, 1e-300, 1e-300], pLate: 1, post: [1 / 3, 1 / 3, 1 / 3], kinLik: [1 / 3, 1 / 3, 1 / 3] }, hF, hB, t, { coupledScissors: true });
      const choice = chooseAction(lm.mass, t, lm.legal);
      for (let y = 0; y < 3; y++) if (!sup[y]) assert.ok(payoff(/** @type {0|1|2} */ (choice.action), /** @type {0|1|2} */ (y)) >= 0, `hF ${hF}, hB ${hB}: AI ${choice.action} loses to acceptable ${y}`);
    }
  }
});

/** Two-pass staging: find the engine's landing frame on clean frames, then alter single frames before it. */
function stageBeforeLanding(/** @type {number} */ seed, /** @type {number} */ fps, /** @type {(t:number) => number[]} */ ext, /** @type {(tAt:(back:number) => number|null) => ((t:number) => number[])} */ alter) {
  const plan = strokePlan({ t0: 1000, beats: 4 });
  const mk = (/** @type {(t:number) => number[]} */ e) => genFrames({ rng: makeRng(700 + seed), fps, t0: 1000, tEnd: plan.tLanding + 800, yPL: plan.yPL, ext: e });
  const fresh = () => { const pl = createPlayerModel(); pl.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 }); return freshEngine(seed, { rules: 'turnuva' }, pl).engine; };
  const clean = mk(ext);
  const res0 = resultOf(feed(fresh(), clean));
  if (!res0) return null;
  const tAt = (/** @type {number} */ back) => { const f = clean.find((x) => x.index === res0.landingFrame - back); return f && f.present ? f.t : null; };
  const res = resultOf(feed(fresh(), mk(alter(tAt))));
  if (!res) return null;
  // raw heading of the last in-air frame (the trace keeps the detector's own values)
  let k = -1;
  for (let i = 0; i < res.trace.t.length; i++) if (res.trace.t[i] < res.timing.tLanding) k = i;
  return { res, rawFront: k >= 0 ? res.trace.hF[k] : null };
}

test('turnuva: a scissors on time with one blurred frame right before the landing is neither fouled nor lost', () => {
  // The hole of v4.2.1, at the frame rate of the first real-camera sessions (20 fps): index and middle
  // finger are opening during the descent, the last in-air frame is blurred and reads almost closed, the
  // hand lands as a scissors. v4.0 called this a late throw (a false foul). v4.2.1 let the referee keep
  // the group open - but the AI had decided against the last frame alone, held PAPER, and LOST a valid
  // round (24 of 60 here, 7 of 16 911 valid rounds in the guarantee fuzz). Now both read the same
  // referee headings.
  const plan = strokePlan({ t0: 1000, beats: 4 });
  const L = plan.tLanding;
  const scissors = fingerPlan(FIST, [[], [{ t0: L - 240, dur: 260, to: 0.95 }], [{ t0: L - 240, dur: 260, to: 0.95 }], [], []]);
  let staged = 0, kept = 0;
  /** @type {Record<string, number>} */ const tally = {};
  for (let seed = 1; seed <= 60; seed++) {
    const out = stageBeforeLanding(seed, 20, scissors, (tAt) => { const tb = tAt(1); return (t) => (tb !== null && Math.abs(t - tb) < 1 ? [FIST[0], 0.05, 0.05, FIST[3], FIST[4]] : scissors(t)); });
    if (!out) continue;
    staged += 1;
    const { res, rawFront } = out;
    tally[res.verdict] = (tally[res.verdict] ?? 0) + 1;
    assert.notEqual(res.verdict, 'PLAYER', `seed ${seed}: the AI lost a valid round`);
    assert.notEqual(res.verdict, 'FOUL_LATE', `seed ${seed}: an on-time scissors was fouled for one blurred frame`);
    if (rawFront !== null && rawFront < 0.5 && res.kinematics.headingFront >= 0.5) {
      kept += 1; // the referee kept the front group open through the blurred frame
      assert.ok(res.valid, `seed ${seed}: an on-time scissors is not fouled or voided for one blurred frame (${res.verdict})`);
      assert.equal(res.playerMove, SCISSORS);
    }
  }
  console.log(`  blurred last frame: ${staged} rounds, the referee kept the group open in ${kept}; ${JSON.stringify(tally)}`);
  assert.ok(staged >= 50 && kept >= 15, `staged ${staged}, kept ${kept}`);
});

test('contradictory in-air frames void the round under a code of its own: never a foul, never a loss', () => {
  // A throw is fouled only when no look at the hand in the air supports it. Two stagings, both honest:
  // (a) a fist all the way; two frames before the landing index and middle finger read 0.45 on one noisy
  //     frame. Where the referee headings still hold the group for open and the last frame reads it
  //     closed, the looks disagree. v4.2.1 judged such a round on the last frame alone, which is how
  //     the AI could lose once it decided against the referee headings.
  // (b) a scissors on time whose last TWO in-air frames are blurred (30 fps). The detector sees the
  //     fingers go back and no heading holds them open; but frames before showed them opening and the
  //     hand lands open. v4.0 called that a late throw.
  // In both the round is void with the code VOID_CONFLICT: the hand was tracked on every frame.
  const fist = fingerPlan(FIST, []);
  const plan = strokePlan({ t0: 1000, beats: 4 });
  const L = plan.tLanding;
  const scissors = fingerPlan(FIST, [[], [{ t0: L - 240, dur: 260, to: 0.95 }], [{ t0: L - 240, dur: 260, to: 0.95 }], [], []]);
  const blurred = [FIST[0], 0.05, 0.05, FIST[3], FIST[4]];
  /** @type {[string, number, (t:number) => number[], (tAt:(back:number) => number|null) => ((t:number) => number[]), number][]} */
  const stagings = [
    ['a noisy frame on a fist', 20, fist, (tAt) => { const a = tAt(2); return (t) => (a !== null && Math.abs(t - a) < 1 ? [FIST[0], 0.45, 0.45, FIST[3], FIST[4]] : fist(t)); }, 20],
    ['two blurred frames on a scissors', 30, scissors, (tAt) => { const a = tAt(1), b2 = tAt(2); return (t) => ((a !== null && Math.abs(t - a) < 1) || (b2 !== null && Math.abs(t - b2) < 1) ? blurred : scissors(t)); }, 40],
  ];
  for (const [name, fps, ext, alter, atLeast] of stagings) {
    let staged = 0, conflicts = 0;
    /** @type {Record<string, number>} */ const tally = {};
    for (let seed = 1; seed <= 60; seed++) {
      const out = stageBeforeLanding(seed + 200, fps, ext, alter);
      if (!out) continue;
      staged += 1;
      const { res } = out;
      const key = res.valid ? res.verdict : res.explanation.code;
      tally[key] = (tally[key] ?? 0) + 1;
      assert.notEqual(res.verdict, 'PLAYER', `${name}, seed ${seed}: the AI lost a valid round`);
      assert.notEqual(res.verdict, 'FOUL_LATE', `${name}, seed ${seed}: an honest throw was fouled for bad frames`);
      if (!res.valid) {
        conflicts += 1;
        assert.deepEqual([res.verdict, res.explanation.code], ['VOID_NO_HAND', 'VOID_CONFLICT'], `${name}, seed ${seed}`);
        assert.equal(res.timing.trackedInFlight, 1, `${name}, seed ${seed}: the hand was tracked on every in-flight frame`);
      }
    }
    console.log(`  ${name} (${fps} fps): ${staged} rounds, ${JSON.stringify(tally)}`);
    assert.ok(staged >= 50 && conflicts >= atLeast, `${name}: staged ${staged}, conflicts ${conflicts}`);
  }
});

test('an on-time PAPER whose last in-air frame is blurred is not fouled for it', () => {
  // Index and middle finger open from 240 ms before the landing, ring and little finger from 225 ms; on the
  // last in-air frame all four read closed. v4.2.0 made the back-group detector re-anchor after a single
  // closed frame, so that one frame wiped out what had been seen: v4.2.0-v4.2.2 fouled this throw 59 or
  // 60 times out of 60 (20 and 30 fps), and so did the first v4.2.3 draft, whose protection switched
  // itself off on the very frame that needed it. v4.0: 0 of 60 at 30 fps, 30 of 60 at 20 fps.
  const plan = strokePlan({ t0: 1000, beats: 4 });
  const L = plan.tLanding;
  const front = { t0: L - 240, dur: 260, to: 0.95 }, back = { t0: L - 225, dur: 260, to: 0.95 };
  const paper = fingerPlan(FIST, [[], [front], [front], [back], [back]]);
  for (const [fps, minValid] of /** @type {const} */ ([[30, 55], [20, 25]])) {
    let staged = 0, valid = 0;
    /** @type {Record<string, number>} */ const tally = {};
    for (let seed = 1; seed <= 60; seed++) {
      const out = stageBeforeLanding(seed, fps, paper, (tAt) => { const tb = tAt(1); return (t) => (tb !== null && Math.abs(t - tb) < 1 ? [FIST[0], 0.05, 0.05, 0.05, 0.05] : paper(t)); });
      if (!out) continue;
      staged += 1;
      const { res } = out;
      const key = res.valid ? res.verdict : res.explanation.code;
      tally[key] = (tally[key] ?? 0) + 1;
      assert.notEqual(res.verdict, 'PLAYER', `${fps} fps seed ${seed}: the AI lost a valid round`);
      assert.notEqual(res.verdict, 'FOUL_LATE', `${fps} fps seed ${seed}: an on-time paper was fouled for one blurred frame`);
      if (res.valid) { valid += 1; assert.equal(res.playerMove, PAPER); }
    }
    console.log(`  paper, blurred last frame, ${fps} fps: ${staged} rounds, ${JSON.stringify(tally)}`);
    assert.ok(staged >= 50 && valid >= minValid, `${fps} fps: staged ${staged}, valid ${valid}`);
  }
});

test('the report shows the referee headings as they were measured; the clear-scissors rule is a flag', () => {
  // A scissors whose ring and little finger rise with the other two (to 0.6) and settle back after the
  // landing. The back heading of the last in-air frame is open, the AI covers PAPER and SCISSORS with
  // SCISSORS, the referee accepts the clear scissors: a tie. v4.2.1 and the first v4.2.3 draft then
  // reported the back heading as 0.05 - a number nobody had measured (I4) - which made the correct
  // SCISSORS look like a mistake (with the back group closed, ROCK would have won).
  let ties = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const plan = strokePlan({ t0: 1000, beats: 4 });
    const L = plan.tLanding;
    const front = { t0: L - 240, dur: 260, to: 0.95 };
    const back = [{ t0: L - 225, dur: 200, to: 0.6 }, { t0: L + 30, dur: 120, to: 0.25 }];
    const frames = genFrames({ rng: makeRng(700 + seed), fps: 30, t0: 1000, tEnd: L + 800, yPL: plan.yPL, ext: fingerPlan(FIST, [[], [front], [front], back, back]) });
    const pl = createPlayerModel(); pl.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 });
    const res = resultOf(feed(freshEngine(seed, { rules: 'turnuva' }, pl).engine, frames));
    assert.ok(res, `seed ${seed}: a round is judged`);
    assert.notEqual(res.verdict, 'PLAYER');
    if (res.verdict !== 'TIE') continue;
    ties += 1;
    assert.deepEqual([res.playerMove, res.aiMove], [SCISSORS, SCISSORS]);
    let k = -1;
    for (let i = 0; i < res.trace.t.length; i++) if (res.trace.t[i] < res.timing.tLanding) k = i;
    assert.ok(res.kinematics.headingBack >= 1 - RULES.turnuva.epsB, `seed ${seed}: reported back heading ${res.kinematics.headingBack}`);
    assert.ok(res.kinematics.headingBack >= res.trace.hB[k] - 1e-9, 'never below the heading of the last in-air frame');
    assert.equal(res.kinematics.coupledScissors, true, 'the rule that accepted the throw is reported');
  }
  assert.ok(ties >= 8, `ties ${ties}`);
});

test('an honest PAPER whose ring and little finger lag behind the other two is not fouled for it', () => {
  // Index and middle finger open 260 ms before the landing (done 60 ms before it), ring and little finger
  // start 170 ms before it. v4.2.0-v4.2.2 subtracted an assumed extensor coupling from the back group
  // whenever the front group led it, so the back group read "still closed" and the referee fouled this
  // throw. Out of 60, under Turnuva at 30 / 20 fps and under Serbest at 30 fps: v4.2.0 fouled 1 / 16 and
  // lost 4 under Serbest; v4.2.1 and v4.2.2 (a larger subtraction) fouled 58 / 26, and 57 with one loss
  // under Serbest. v4.0 and v4.2.3 read the groups as measured: 60 of 60 valid in each of these settings.
  for (const [fps, rules] of /** @type {const} */ ([[30, 'turnuva'], [20, 'turnuva'], [30, 'serbest']])) {
    /** @type {Record<string, number>} */ const tallyLag = {};
    let valid = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const plan = strokePlan({ t0: 1000, beats: 4 });
      const L = plan.tLanding;
      const front = { t0: L - 260, dur: 200, to: 0.95 }, back = { t0: L - 170, dur: 260, to: 0.95 };
      const paper = fingerPlan(FIST, [[], [front], [front], [back], [back]]);
      const frames = genFrames({ rng: makeRng(500 + seed), fps, t0: 1000, tEnd: L + 800, yPL: plan.yPL, ext: paper });
      const pl = createPlayerModel(); pl.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 });
      const res = resultOf(feed(freshEngine(seed, { rules }, pl).engine, frames));
      assert.ok(res, `${rules} ${fps} fps seed ${seed}: a round is judged`);
      tallyLag[res.verdict] = (tallyLag[res.verdict] ?? 0) + 1;
      assert.notEqual(res.verdict, 'PLAYER', `${rules} ${fps} fps seed ${seed}: the AI lost to an honest paper it could read`);
      if (res.valid) { valid += 1; assert.equal(res.playerMove, PAPER); }
    }
    console.log(`  lagging ring and little finger, ${rules} ${fps} fps: ${JSON.stringify(tallyLag)}`);
    assert.ok(valid >= 55, `${rules} ${fps} fps: only ${valid} of 60 honest papers valid`);
  }
});

test('the guarantee fuzz finds nothing: the seven sessions that broke v4.2.1, and the first 150 sessions', () => {
  // experiments/fuzz_guarantee.mjs is part of the release check (npm run fuzz); v4.2.1 was released
  // without it and lost 7 valid rounds in these sessions. They are replayed here on every test run.
  const broke = runFuzz({ seeds: [151, 3629, 4391, 5774, 6735, 7979, 9438] });
  assert.deepEqual([broke.losses, broke.exceptions, broke.orderViolations], [0, 0, 0], JSON.stringify(broke.examples));
  // (not vacuous: the seven sessions hold 15 judged rounds; in v4.2.2 seven of them were lost)
  assert.ok(broke.judgedRounds >= 12 && broke.validRounds >= 5, `judged ${broke.judgedRounds}, valid ${broke.validRounds}`);
  const smoke = runFuzz({ sessions: 150 });
  assert.deepEqual([smoke.losses, smoke.exceptions, smoke.orderViolations], [0, 0, 0], JSON.stringify(smoke.examples));
  assert.ok(smoke.validRounds >= 100, `valid rounds ${smoke.validRounds}`);
});

test('the release check cannot pass by running nothing: unreadable fuzz arguments are an error', () => {
  // `--seeds=abc`, `--seeds=151;3629` and `--seeds 151` used to run zero sessions (or 151 of them) and exit 0
  assert.deepEqual(parseFuzzArgs([]), { sessions: 2500, seeds: null, save: false });
  assert.deepEqual(parseFuzzArgs(['15000', '--save']), { sessions: 15000, seeds: null, save: true });
  assert.deepEqual(parseFuzzArgs(['--seeds=151,3629']), { sessions: 2500, seeds: [151, 3629], save: false });
  for (const bad of [['--seeds=abc'], ['--seeds=151;3629'], ['--seeds='], ['--seeds', '151'], ['--seeds=1,,2'], ['--seeds=0'], ['0'], ['12.5'], ['3', '4'], ['3', '--seeds=1'], ['--bogus']]) {
    assert.ok('error' in parseFuzzArgs(bad), `accepted: ${bad.join(' ')}`);
  }
  assert.equal(runFuzz({ seeds: [] }).sessions, 0, '(an empty list really runs nothing, which is why the command line refuses it)');
});

test('frames must advance in index as well as in time (frame order is what I1 rests on)', () => {
  const { engine } = freshEngine(3);
  const sim = simulateThrow({ move: PAPER, rng: makeRng(4), t0: 1000 });
  // every frame is followed by a "replay" with a later time stamp but an older index: all are dropped
  const ev = [];
  for (const f of sim.frames) { ev.push(...engine.pushFrame(f)); ev.push(...engine.pushFrame({ ...f, t: f.t + 0.3, index: Math.max(0, f.index - 2) })); }
  const res = resultOf(ev);
  const clean = resultOf(feed(freshEngine(3).engine, simulateThrow({ move: PAPER, rng: makeRng(4), t0: 1000 }).frames));
  assert.ok(res && clean);
  assert.deepEqual([res.verdict, res.aiMove, res.timing.tLanding, res.landingFrame, res.commits.map((/** @type {any} */ x) => x.frame)], [clean.verdict, clean.aiMove, clean.timing.tLanding, clean.landingFrame, clean.commits.map((/** @type {any} */ x) => x.frame)]);
});

test('a seal that cannot be made aborts the round; the round is never judged on an older seal', () => {
  // Found by the final verification: the in-air frame used to be marked "revision step reached" BEFORE
  // the revision seal was made. If the commit log refused that seal (here: the nonce source fails after
  // the behavioural seal) and the caller kept feeding frames, the round was judged on the unrevised
  // behavioural seal - a coin flip against a legal ROCK. Now the round is aborted, its seal opened.
  let aborted = 0, judged = 0, losses = 0, escaped = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const nonce = makeRng(seed + 1000);
    let calls = 0;
    const hex = (/** @type {number} */ n) => {
      calls += 1;
      if (calls > 1) throw new Error('nonce source failed');
      let out = '';
      for (let i = 0; i < n; i++) out += Math.floor(nonce.next() * 256).toString(16).padStart(2, '0');
      return out;
    };
    const commitLog = createCommitLog({ sessionId: `seal-fail-${seed}`, randomBytesHex: hex });
    const player = createPlayerModel();
    player.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 }); // random behavioural move
    const engine = createRoundEngine({ player, commitLog, rng: makeRng(seed), cfg: { rules: 'turnuva' } });
    const sim = simulateThrow({ move: ROCK, rng: makeRng(600 + seed), t0: 1000 });
    /** @type {any[]} */ let events = [];
    try { events = feed(engine, sim.frames); } catch { escaped += 1; continue; }
    const res = resultOf(events);
    const ab = events.find((e) => e.type === 'aborted' && e.reason === 'ENGINE_ERROR');
    if (res) {
      judged += 1;
      if (res.verdict === 'PLAYER') losses += 1;
      assert.equal(res.commits.length, 1, 'a judged round here needed no revision');
    }
    if (ab) {
      aborted += 1;
      assert.ok(typeof ab.detail === 'string' && ab.detail.includes('nonce'));
      assert.equal(ab.commits.length, 1);
      assert.equal(ab.commits[0].reason, 'BEHAVIOUR');
      assert.ok(ab.sealOk && ab.chainOk && ab.commits[0].verified, 'the seal that was shown is opened and verified');
      assert.ok(!res, 'an aborted round is not judged');
    }
    assert.deepEqual(commitLog.sealedRounds(), []);
  }
  console.log(`  failing seal: ${aborted} rounds aborted, ${judged} judged (no revision needed), ${losses} player wins`);
  assert.equal(escaped, 0, 'no exception escapes pushFrame');
  assert.equal(losses, 0);
  assert.ok(aborted >= 15 && judged >= 5, `aborted ${aborted}, judged ${judged}`);
});

test('frames the commit log could not seal are ignored (index beyond 2^53 - 1, time beyond 2^52 / 10 ms)', () => {
  const sim = simulateThrow({ move: PAPER, rng: makeRng(8), t0: 1000 });
  const { engine } = freshEngine(7);
  let k = 0;
  for (; k < sim.frames.length; k++) if (engine.pushFrame(sim.frames[k]).some((e) => e.type === 'flightStart')) break;
  assert.ok(k < sim.frames.length - 1, 'the flight started');
  const next = sim.frames[k + 1];
  for (const bad of [
    { ...next, index: Number.MAX_SAFE_INTEGER + 1 },
    { ...next, index: 2 ** 60 },
    { ...next, t: 2 ** 52 / 10 + 1 },
    { ...next, t: Number.MAX_VALUE },
  ]) assert.deepEqual(engine.pushFrame(/** @type {any} */ (bad)), []);
  // the stream goes on exactly as if those frames had never arrived
  const rest = resultOf(feed(engine, sim.frames.slice(k + 1)));
  const clean = resultOf(feed(freshEngine(7).engine, sim.frames));
  assert.ok(rest && clean);
  assert.deepEqual(
    [rest.verdict, rest.aiMove, rest.playerMove, rest.landingFrame, rest.commits.map((/** @type {any} */ c) => c.frame)],
    [clean.verdict, clean.aiMove, clean.playerMove, clean.landingFrame, clean.commits.map((/** @type {any} */ c) => c.frame)]);
});

test('only the three named presets are accepted (no inherited object keys)', () => {
  for (const name of ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__']) {
    const { engine } = freshEngine(1, { rules: name });
    assert.equal(engine.snapshot().rules, 'turnuva', `cfg.rules = ${name} falls back to the default`);
    assert.throws(() => engine.setRules(name), RangeError);
  }
  const { engine } = freshEngine(1);
  for (const name of ['serbest', 'standart', 'turnuva']) { engine.setRules(name); assert.equal(engine.snapshot().rules, name); }
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
