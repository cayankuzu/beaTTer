// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../web/js/core/rng.js';
import { createCommitLog } from '../web/js/core/commit.js';
import { createPlayerModel } from '../web/js/core/player_model.js';
import { createRoundEngine } from '../web/js/core/round_engine.js';
import { simulateThrow } from '../web/js/sim/kinematic_player.js';
import { createSession, runSession, runRoundFrames } from '../web/js/sim/session.js';
import { ROCK, PAPER, SCISSORS } from '../web/js/core/constants.js';

const VALID = new Set(['AI', 'PLAYER', 'TIE']);
const count = (results, verdict) => results.filter((r) => r.verdict === verdict).length;

function freshEngine(seed, cfg = {}) {
  const nonce = makeRng(seed + 1000);
  const hex = (n) => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(nonce.next() * 256).toString(16).padStart(2, '0'); return s; };
  const commitLog = createCommitLog({ sessionId: `t-${seed}`, randomBytesHex: hex });
  const player = createPlayerModel();
  const engine = createRoundEngine({ player, commitLog, rng: makeRng(seed), cfg });
  return { engine, player, commitLog };
}

/** Honesty invariants that must hold for every judged round. */
function assertInvariants(res, events) {
  const landing = events.findIndex((e) => e.type === 'landing');
  const result = events.findIndex((e) => e.type === 'result');
  assert.ok(landing >= 0 && result > landing, 'landing precedes result');
  // I1: the judged commitment was made before the landing; nothing is committed once the engine has landed
  assert.ok(!events.slice(landing).some((e) => e.type === 'commit'), 'I1: no commit event after the landing event');
  const judged = res.commits.find((c) => c.seq === res.judgedSeq);
  assert.ok(judged && !judged.postLanding, 'I1: judged commit exists and is pre-landing');
  // I1 is a statement about frame order (exact); the time stamps are rounded to 0.1 ms and follow it
  assert.ok(judged.frame < res.landingFrame, `I1: judged commit on frame ${judged.frame}, landing frame ${res.landingFrame}`);
  for (const c of res.commits) assert.equal(c.postLanding, c.frame >= res.landingFrame, 'I1: the post-landing flag is the frame order');
  assert.ok(judged.t <= res.timing.tLanding, `I1: judged commit ${judged.t} not after landing ${res.timing.tLanding}`);
  assert.ok(res.timing.leadToLandingMs >= 0, 'I1: lead to landing is not negative');
  for (const c of res.commits) if (!c.postLanding) assert.ok(c.t <= res.timing.tLanding);
  assert.equal(res.aiMove, judged.move, 'the judged move is the AI move');
  // I2 / I3: every commitment is opened, verifies, and the chain is intact; commits are in sequence order
  assert.ok(res.sealOk && res.chainOk, 'I2: seals verify');
  const sealed = events.filter((e) => e.type === 'commit');
  assert.equal(sealed.length, res.commits.length, 'I3: every commitment is in the result');
  for (let i = 0; i < sealed.length; i++) {
    assert.equal(sealed[i].commit.hash, res.commits[i].hash);
    assert.ok(res.commits[i].verified && typeof res.commits[i].payload === 'string' && res.commits[i].payload.includes(`|move=`));
    assert.equal(res.commits[i].nonce.length, 32);
    if (i > 0) assert.ok(res.commits[i].seq > res.commits[i - 1].seq);
    // secrecy before reveal: the published part carries neither move nor nonce
    assert.ok(!('move' in sealed[i].commit) && !('nonce' in sealed[i].commit) && !('payload' in sealed[i].commit));
  }
  assert.equal(res.commits[0].reason, 'BEHAVIOUR');
  // I4: numbers are finite or null
  for (const [k, v] of Object.entries(res.timing)) assert.ok(v === null || Number.isFinite(v), `timing.${k}`);
  assert.equal(res.valid, VALID.has(res.verdict));
}

test('a clean round: beats, behavioural seal before any finger moves, kinematic revision, landing, verified reveal', () => {
  const { engine, player } = freshEngine(1);
  const sim = simulateThrow({ move: PAPER, rng: makeRng(2), t0: 1000 });
  const events = runRoundFrames(engine, sim.frames);
  const types = events.map((e) => e.type + (e.n ?? ''));
  assert.deepEqual(types.slice(0, 5), ['handSeen', 'beat1', 'beat2', 'beat3', 'flightStart']);
  const res = events.find((e) => e.type === 'result').result;
  assertInvariants(res, events);
  assert.equal(res.verdict, 'AI');
  assert.equal(res.playerMove, PAPER);
  assert.equal(res.aiMove, SCISSORS);
  const behaviour = events.find((e) => e.type === 'commit');
  assert.ok(behaviour.t < sim.truth.onsetFrontT, 'the first seal exists before the fingers start to open');
  assert.ok(Math.abs(res.timing.tLanding - sim.truth.tLanding) < 45, `landing error ${res.timing.tLanding - sim.truth.tLanding}`);
  assert.ok(res.kinematics.onsetLeadFrontMs !== null && Math.abs(res.kinematics.onsetLeadFrontMs - sim.truth.leadMs) < 60);
  assert.ok(res.progressAtCommit !== null && res.progressAtCommit < 1, `progress at commit ${res.progressAtCommit}`);
  assert.equal(engine.phase, 'RESOLVED');
  assert.equal(player.sequence.length, 1);
  assert.equal(engine.acknowledge(), true);
  assert.equal(engine.phase, 'IDLE');
});

test('secrecy: nothing the UI can read before the reveal contains the AI move', () => {
  const { engine } = freshEngine(3);
  const sim = simulateThrow({ move: SCISSORS, rng: makeRng(4), t0: 1000 });
  for (const f of sim.frames) {
    const events = engine.pushFrame(f);
    if (events.some((e) => e.type === 'result')) break;
    const snap = engine.snapshot();
    assert.ok(snap.standing === null || !('move' in snap.standing));
    const text = JSON.stringify(snap);
    assert.ok(!/"aiMove"|"action"|"nonce"|"payload"/.test(text), 'snapshot leaks');
  }
  assert.equal(engine.lastResult().aiMove, ROCK);
});

test('honesty invariants hold on thousands of mixed rounds; "turnuva" never loses a valid round', () => {
  const cells = [
    { seed: 21, style: 'normal', fps: 30, rounds: 320 },
    { seed: 22, style: 'early', fps: 30, rounds: 200 },
    { seed: 23, style: 'late', fps: 30, rounds: 260 },
    { seed: 24, style: 'normal', fps: 60, rounds: 260 },
    { seed: 25, style: 'normal', fps: 30, rounds: 200, throwOptions: (i, rng) => (i % 2 ? { feint: { from: (i % 3), switchLeadMs: 110 + 60 * rng.next(), morphMs: 100 } } : {}) },
    { seed: 26, style: 'normal', fps: 30, rounds: 160, throwOptions: (i) => (i % 3 === 0 ? { late: { afterLandingMs: 60 + (i % 5) * 30 } } : i % 3 === 1 ? { dropout: 0.08 } : {}) },
    { seed: 27, style: 'normal', fps: 30, rounds: 120, primeBeats: 2 },
    { seed: 28, style: 'normal', fps: 30, rounds: 120, primeBeats: 0 },
    { seed: 29, style: 'normal', fps: 30, rounds: 120, throwOptions: () => ({ handed: 'Left' }) },
  ];
  let judged = 0, valid = 0, losses = 0, ties = 0, fouls = 0;
  const normal = { n: 0, foul: 0 };
  for (const cell of cells) {
    const s = createSession({ behaviour: 'humanLike', rules: 'turnuva', ...cell });
    for (let i = 0; i < cell.rounds; i++) {
      const before = { seq: s.player.sequence.length, rounds: s.player.rounds, valid: s.player.metrics.summary().rounds.valid };
      const r = s.playRound();
      if (!r.result) continue;
      judged += 1;
      assertInvariants(r.result, r.events);
      if (r.result.valid) {
        valid += 1;
        if (r.result.verdict === 'PLAYER') losses += 1;
        if (r.result.verdict === 'TIE') ties += 1;
        assert.equal(s.player.sequence.length, before.seq + 1);
      } else {
        if (r.result.verdict === 'FOUL_LATE') fouls += 1;
        // I6: fouls and voids teach nothing
        assert.equal(s.player.sequence.length, before.seq);
        assert.equal(s.player.rounds, before.rounds);
        assert.equal(s.player.metrics.summary().rounds.valid, before.valid);
      }
      if (cell.seed === 21) { normal.n += 1; if (r.result.verdict === 'FOUL_LATE') normal.foul += 1; }
    }
    assert.ok(s.commitLog.verifyChain().ok);
  }
  console.log(`  judged ${judged}, valid ${valid}, losses ${losses}, ties ${ties}, fouls ${fouls}; normal-opener foul rate ${(100 * normal.foul / normal.n).toFixed(1)} %`);
  assert.ok(valid >= 1200, `valid rounds ${valid}`);
  assert.equal(losses, 0, 'turnuva: the AI must not lose a valid round');
  assert.ok(normal.foul / normal.n < 0.12, `foul rate for normal honest openers ${normal.foul / normal.n}`);
});

test('"serbest" keeps losses rare for honest openers', () => {
  const r = runSession({ seed: 31, rounds: 400, rules: 'serbest', behaviour: 'humanLike' });
  const v = r.results.filter((x) => x.valid);
  const loss = count(r.results, 'PLAYER') / v.length;
  console.log(`  serbest: valid ${v.length}, loss rate ${(100 * loss).toFixed(2)} %, fouls ${count(r.results, 'FOUL_LATE')}`);
  assert.ok(loss < 0.03, `loss rate ${loss}`);
});

test('referee: late throws are fouls, odd shapes and missing fists are voids, a lost hand aborts', () => {
  const late = createSession({ seed: 41, behaviour: 'biased', behaviourParams: { p: [0, 0.5, 0.5] }, throwOptions: () => ({ late: { afterLandingMs: 100 } }) });
  for (let i = 0; i < 30; i++) late.playRound();
  assert.ok(count(late.results, 'FOUL_LATE') >= 27, `late throws judged as ${late.results.map((r) => r.verdict).join(',')}`);
  assert.equal(late.player.sequence.length, late.results.filter((r) => r.valid).length);
  const odd = createSession({ seed: 42, throwOptions: () => ({ nonRps: [0, 1, 0, 0, 0] }) });
  for (let i = 0; i < 12; i++) odd.playRound();
  assert.ok(count(odd.results, 'VOID_UNKNOWN') + count(odd.results, 'FOUL_LATE') === odd.results.length && count(odd.results, 'VOID_UNKNOWN') >= 8, odd.results.map((r) => r.verdict).join(','));
  const shown = createSession({ seed: 43, behaviour: 'biased', behaviourParams: { p: [0, 0.5, 0.5] }, throwOptions: () => ({ noFist: true }) });
  let aborts = 0;
  for (let i = 0; i < 12; i++) if (!shown.playRound().result) aborts += 1;
  assert.ok(shown.results.every((r) => r.verdict === 'VOID_NO_FIST') && shown.results.length + aborts === 12, shown.results.map((r) => r.verdict).join(','));
  // hand disappears during the priming beats
  const { engine } = freshEngine(44);
  const sim = simulateThrow({ move: ROCK, rng: makeRng(45), t0: 1000 });
  const cut = sim.frames.map((f) => (f.t > sim.truth.tBeats[1] + 30 ? { ...f, present: false, image: null, world: null } : f));
  const ev = runRoundFrames(engine, cut);
  assert.ok(ev.some((e) => e.type === 'aborted' && e.reason === 'HAND_LOST'));
  assert.equal(engine.phase, 'IDLE');
});

test('I5: the verdict class does not depend on what the AI committed', () => {
  let checked = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const opts = seed % 4 === 0 ? { late: { afterLandingMs: 90 } } : seed % 4 === 1 ? { feint: { from: PAPER, switchLeadMs: 150, morphMs: 100 } } : {};
    const sim = simulateThrow({ move: /** @type {0|1|2} */ (seed % 3), rng: makeRng(500 + seed), t0: 1000, style: seed % 2 ? 'normal' : 'late', ...opts });
    const outs = [1, 2, 3].map((k) => {
      const { engine } = freshEngine(seed * 10 + k);
      const ev = runRoundFrames(engine, sim.frames);
      const res = ev.find((e) => e.type === 'result');
      return res ? res.result : null;
    });
    if (!outs[0]) { assert.ok(outs.every((o) => o === null)); continue; }
    const cls = (r) => (VALID.has(r.verdict) ? 'VALID' : r.verdict);
    assert.equal(cls(outs[0]), cls(outs[1])); assert.equal(cls(outs[0]), cls(outs[2]));
    assert.equal(outs[0].playerMove, outs[1].playerMove);
    assert.equal(outs[0].timing.tLanding, outs[2].timing.tLanding);
    checked += 1;
  }
  assert.ok(checked > 50);
});

test('tampering with a revealed commitment or reordering the chain is detected', () => {
  const s = createSession({ seed: 51 });
  const r = s.playRound().result;
  const c = r.commits[0];
  const prev = c.prev;
  assert.equal(s.commitLog.verify(c, prev).ok, true);
  assert.equal(s.commitLog.verify({ ...c, move: (c.move + 1) % 3 }, prev).ok, false);
  assert.equal(s.commitLog.verify({ ...c, nonce: c.nonce.replace(/.$/, c.nonce.endsWith('0') ? '1' : '0') }, prev).ok, false);
  assert.equal(s.commitLog.verify(c, 'f'.repeat(64)).chainOk, false);
  const exported = s.commitLog.export();
  assert.ok(JSON.stringify(exported).includes(c.hash));
});

test('modes: two priming beats, single stroke, metronome with a stroke and with a still hand', () => {
  for (const primeBeats of [2, 0]) {
    const r = runSession({ seed: 60 + primeBeats, rounds: 40, primeBeats });
    assert.ok(r.results.length >= 34, `primeBeats ${primeBeats}: ${r.results.length} judged of 40`);
    assert.equal(count(r.results, 'PLAYER'), 0);
  }
  for (const still of [false, true]) {
    const { engine } = freshEngine(70 + (still ? 1 : 0));
    assert.equal(engine.setMode({ primeBeats: 3, metronome: { periodMs: 520 } }), true);
    let t = 1000, idx = 0, judged = 0, valid = 0;
    const rng = makeRng(71);
    for (let i = 0; i < 12; i++) {
      // a little idle time, then arm
      const idle = simulateThrow({ move: ROCK, rng, t0: t, frameIndex: idx, primeBeats: 0, still: true, cfg: { settleMs: 0, leadInMs: 100 } });
      void idle;
      const sched = engine.armMetronome(t);
      assert.ok(sched && sched.beatTimes.length === 4);
      const sim = simulateThrow({ move: /** @type {0|1|2} */ (i % 3), rng, t0: t, frameIndex: idx, beatTimes: sched.beatTimes.map((b) => b + rng.normal(0, 15)), still, cfg: { leadInMs: 300 } });
      const ev = runRoundFrames(engine, sim.frames);
      const res = ev.find((e) => e.type === 'result');
      assert.ok(res, `metronome round ${i} (still=${still}) produced ${ev.map((e) => e.type).join(' ')}`);
      assertInvariants(res.result, ev);
      assert.equal(res.result.landingSource, still ? 'metronome' : 'stroke');
      assert.equal(ev.filter((e) => e.type === 'beat' && e.scheduled).length, 3);
      judged += 1; if (res.result.valid) { valid += 1; assert.notEqual(res.result.verdict, 'PLAYER'); }
      engine.acknowledge();
      t = sim.truth.tEnd + 600; idx = sim.truth.nextFrameIndex;
    }
    assert.ok(valid >= 8, `metronome (still=${still}): ${valid} valid of ${judged}`);
  }
});

test('a weak throw stroke lands softly and is still judged on pre-landing commitments only', () => {
  let soft = 0, judged = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const { engine } = freshEngine(80 + seed);
    const sim = simulateThrow({ move: /** @type {0|1|2} */ (seed % 3), rng: makeRng(900 + seed), t0: 1000, throwAmplitudeScale: 0.22 });
    const ev = runRoundFrames(engine, sim.frames);
    const res = ev.find((e) => e.type === 'result');
    if (!res) continue;
    judged += 1;
    if (res.result.landingSource === 'soft') soft += 1;
    assertInvariants(res.result, ev);
    assert.notEqual(res.result.verdict, 'PLAYER');
  }
  console.log(`  weak throws: ${judged} judged, ${soft} soft landings`);
  assert.ok(soft >= 10 && judged >= 20);
});

test('learning: onset timing adapts to the player, behaviour is exploited, the model survives a round trip', () => {
  const early = runSession({ seed: 91, rounds: 90, style: 'early', behaviour: 'humanLike' });
  const pe = early.player.profile();
  console.log(`  early opener: learned onset lead ${pe.onsetLeadFrontMs.mean.toFixed(0)} ms (truth 260, prior 170, n=${pe.onsetLeadFrontMs.n})`);
  assert.ok(Math.abs(pe.onsetLeadFrontMs.mean - 260) < 45, `learned lead ${pe.onsetLeadFrontMs.mean}`);
  const leads = early.results.filter((r) => r.valid).map((r) => r.timing.leadToLandingMs);
  const first = leads.slice(0, 20).reduce((a, b) => a + b, 0) / 20, lastL = leads.slice(-20).reduce((a, b) => a + b, 0) / 20;
  console.log(`  mean decision lead: first 20 rounds ${first.toFixed(0)} ms, last 20 rounds ${lastL.toFixed(0)} ms`);

  const wsls = runSession({ seed: 92, rounds: 320, behaviour: 'wslsStrong' });
  const b = wsls.summary.behaviourOnly;
  console.log(`  behaviour-only counterfactual vs strong WSLS: W ${b.ai} T ${b.tie} L ${b.player}`);
  assert.ok(b.ai / b.n > 0.40 && b.player / b.n < 0.25);

  const json = JSON.parse(JSON.stringify(wsls.player.toJSON()));
  assert.ok(JSON.stringify(json).length < 400000);
  const copy = createPlayerModel();
  assert.equal(copy.load(json), true);
  assert.deepEqual(copy.sequence.predict().p, wsls.player.sequence.predict().p);
  assert.deepEqual(JSON.parse(JSON.stringify(copy.toJSON())), json);
  const blank = createPlayerModel();
  assert.equal(blank.load({ v: 3 }), false);
  assert.equal(blank.load({ v: 4, calibration: { thetaFist: [1e9, NaN], thetaOpen: 'x' }, leadFront: { mu: 'bad' } }), true);
  assert.ok(blank.calibration.thetaFist.every((v) => v > 30 && v < 300));
});

test('robustness and speed: garbage frames are ignored and a frame costs well under 1.5 ms', () => {
  const { engine } = freshEngine(99);
  for (const junk of [null, undefined, {}, { t: NaN, index: 0 }, { t: 5, index: -1 }, { t: 6, index: 1.5 }, { t: 7, index: 1, present: true, image: [], world: null }]) {
    assert.doesNotThrow(() => engine.pushFrame(/** @type {any} */ (junk)));
  }
  const sim = simulateThrow({ move: PAPER, rng: makeRng(7), t0: 1000, frameIndex: 10 });
  const doubled = sim.frames.flatMap((f) => [f, f]); // duplicate timestamps are dropped
  const ev = runRoundFrames(engine, doubled);
  assert.ok(ev.some((e) => e.type === 'result'));
  const s = createSession({ seed: 100, fps: 60 });
  let frames = 0;
  const t0 = performance.now();
  for (let i = 0; i < 40; i++) { const r = s.playRound(); frames += r.truth.nextFrameIndex; }
  const all = s.playRound().truth.nextFrameIndex;
  const per = (performance.now() - t0) / all;
  console.log(`  engine + simulator: ${per.toFixed(3)} ms per frame at 60 fps`);
  assert.ok(per < 1.5);
  void frames;
});
