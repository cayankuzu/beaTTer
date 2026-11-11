// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as M from '../web/js/core/math.js';
import { makeRng, cryptoRng, randomBytesHex } from '../web/js/core/rng.js';
import { sha256Hex, sha256HexAsync } from '../web/js/core/sha256.js';
import { createCommitLog, verifyRevealed } from '../web/js/core/commit.js';
import { MOVES, beats, losesTo, payoff, RULES, DEFAULT_RULE, ROCK, PAPER, SCISSORS } from '../web/js/core/constants.js';
import { createMetrics } from '../web/js/core/metrics.js';
import { createTwinPredictor } from '../web/js/core/mindtwin.js';
import { createPoseClassifier, decideFinal, completionTime, OTHER } from '../web/js/core/pose.js';

const node256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

test('constants: the game is rock-paper-scissors', () => {
  assert.deepEqual([...MOVES], ['ROCK', 'PAPER', 'SCISSORS']);
  assert.equal(beats(ROCK), PAPER); assert.equal(beats(PAPER), SCISSORS); assert.equal(beats(SCISSORS), ROCK);
  assert.equal(losesTo(PAPER), ROCK);
  for (const a of [0, 1, 2]) for (const p of [0, 1, 2]) assert.equal(payoff(a, p), a === p ? 0 : a === beats(p) ? 1 : -1);
  assert.ok(RULES[DEFAULT_RULE] && RULES.turnuva.epsF === 0.5 && RULES.turnuva.noLoss === true);
});

test('SHA-256: NIST vectors, long input, non-BMP text, async agreement', async () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  assert.equal(sha256Hex('a'.repeat(1000000)), 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  for (const s of ['Taş-Kâğıt-Makas ✊✋✌️', '𝔟𝔢𝔞𝔗𝔗𝔢𝔯 🤖', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(119)]) assert.equal(sha256Hex(s), node256(s), s.slice(0, 12));
  const viaSubtle = await sha256HexAsync('beaTTer/v4');
  assert.ok(viaSubtle === null || viaSubtle === sha256Hex('beaTTer/v4'));
});

test('math: numerically careful helpers', () => {
  assert.equal(M.minJerk(0), 0); assert.equal(M.minJerk(1), 1); assert.ok(Math.abs(M.minJerk(0.5) - 0.5) < 1e-12);
  for (const s of [0.1, 0.25, 0.4]) assert.ok(Math.abs(M.minJerk(s) + M.minJerk(1 - s) - 1) < 1e-12);
  assert.ok(Math.abs(M.minJerkVel(0.5) - 1.875) < 1e-12);
  assert.ok(Math.abs(M.logSumExp([-Infinity, 0, 0]) - Math.log(2)) < 1e-12);
  assert.equal(M.logSumExp([-Infinity, -Infinity]), -Infinity);
  const w = M.wilsonInterval(8, 10);
  assert.ok(Math.abs(w.lo - 0.4902) < 5e-4 && Math.abs(w.hi - 0.9433) < 5e-4);
  assert.deepEqual(M.wilsonInterval(0, 0), { lo: 0, hi: 1 });
  assert.ok(Math.abs(M.binomTailGE(2, 3, 0.5) - 0.5) < 1e-12);
  assert.ok(Math.abs(M.binomTailGE(0, 10, 0.3) - 1) < 1e-12);
  assert.ok(M.binomTailGE(700, 1000, 1 / 3) < 1e-100);
  assert.ok(Math.abs(M.entropyBits([1 / 3, 1 / 3, 1 / 3]) - Math.log2(3)) < 1e-12);
  assert.ok(Math.abs(M.gaussCdf(1.959964) - 0.975) < 1e-6);
  assert.ok(Math.abs(M.angleDeg({ x: 1, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }) - 90) < 1e-9);
  assert.equal(M.angleDeg({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), 0);
  assert.equal(M.median([3, 1, 2]), 2);
  assert.ok(Math.abs(M.quantile([1, 2, 3, 4], 0.25) - 1.75) < 1e-12);
  assert.deepEqual([...M.normalize([0, 0, 0])].map((v) => +v.toFixed(6)), [0.333333, 0.333333, 0.333333]);
});

test('rng: deterministic, roughly uniform and normal; crypto source has the same interface', () => {
  const a = makeRng(42), b = makeRng(42), c = makeRng(43);
  const xs = Array.from({ length: 5 }, () => a.next());
  assert.deepEqual(xs, Array.from({ length: 5 }, () => b.next()));
  assert.notDeepEqual(xs, Array.from({ length: 5 }, () => c.next()));
  const r = makeRng(7);
  const bins = new Array(10).fill(0);
  let s = 0, s2 = 0;
  for (let i = 0; i < 50000; i++) { bins[Math.floor(r.next() * 10)] += 1; const z = r.normal(); s += z; s2 += z * z; }
  for (const k of bins) assert.ok(Math.abs(k - 5000) < 300, `bin ${k}`);
  assert.ok(Math.abs(s / 50000) < 0.02 && Math.abs(s2 / 50000 - 1) < 0.03);
  for (let i = 0; i < 100; i++) { const k = r.int(3); assert.ok(k === 0 || k === 1 || k === 2); }
  const cr = cryptoRng();
  const u = cr.next();
  assert.ok(u >= 0 && u < 1);
  assert.match(randomBytesHex(16), /^[0-9a-f]{32}$/);
  assert.notEqual(randomBytesHex(16), randomBytesHex(16));
});

test('commit log: binding, hiding until reveal, hash chain, tamper evidence', () => {
  const log = createCommitLog({ sessionId: 'unit' });
  const a = log.commit({ round: 1, move: PAPER, reason: 'BEHAVIOUR', frame: 10, t: 1000.04 });
  const b = log.commit({ round: 1, move: PAPER, reason: 'KINEMATIC', frame: 14, t: 1133.3 });
  const c = log.commit({ round: 2, move: ROCK, reason: 'BEHAVIOUR', frame: 90, t: 4000 });
  assert.ok(!('move' in a) && !('nonce' in a));
  assert.notEqual(a.hash, b.hash, 'same move, different nonce -> different hash');
  assert.equal(b.prev, a.hash); assert.equal(c.prev, b.hash); assert.equal(a.prev, log.genesis);
  assert.equal(a.short, a.hash.slice(0, 8).toUpperCase());
  const dump = JSON.stringify(log.export());
  assert.ok(!dump.includes('nonce=') && !/"move"\s*:/.test(dump), 'nothing is leaked before the reveal');
  const opened = log.reveal(1);
  assert.deepEqual(opened.map((x) => x.seq), [0, 1]);
  assert.equal(opened[0].payload, `beaTTer/v4|sid=unit|seq=0|round=1|prev=${log.genesis}|t=1000.0|frame=10|move=PAPER|reason=BEHAVIOUR|nonce=${opened[0].nonce}`);
  assert.equal(sha256Hex(opened[0].payload), a.hash);
  assert.equal(node256(opened[0].payload), a.hash, 'an independent SHA-256 implementation agrees');
  assert.equal(opened[0].nonce.length, 32);
  assert.equal(log.verify(opened[1], a.hash).ok, true);
  assert.equal(verifyRevealed({ ...opened[1], move: SCISSORS }, a.hash, 'unit').ok, false);
  assert.equal(verifyRevealed({ ...opened[1], t: opened[1].t + 0.1 }, a.hash, 'unit').ok, false);
  assert.equal(log.verify(opened[1], log.genesis).chainOk, false);
  assert.equal(log.verifyChain().ok, true);
  assert.throws(() => log.commit({ round: 1, move: ROCK, reason: 'REVISION', frame: 20, t: 1200 }), /revealed/);
  assert.throws(() => log.commit({ round: 3, move: 7, reason: 'BEHAVIOUR', frame: 1, t: 1 }), RangeError);
  assert.throws(() => log.commit({ round: 3, move: ROCK, reason: /** @type {any} */ ('WHIM'), frame: 1, t: 1 }), RangeError);
  assert.deepEqual(log.sealedRounds(), [2]);
});

test('metrics: every number is what the rounds say', () => {
  const m = createMetrics();
  const round = (verdict, playerMove, post, lead, extra = {}) => ({
    verdict, valid: ['AI', 'PLAYER', 'TIE'].includes(verdict), playerMove, aiMove: 0,
    commits: [{ reason: 'BEHAVIOUR' }, ...(extra.kin ? [{ reason: 'KINEMATIC' }] : [])],
    beliefAtFinalCommit: { post }, timing: { leadToLandingMs: lead, leadToCompletionMs: lead - 100 }, progressAtCommit: extra.progress ?? null,
    behaviour: { wouldBe: extra.wouldBe ?? 'TIE' },
  });
  assert.equal(m.summary().winRate.p, null);
  assert.equal(m.summary().prediction.brier, null);
  m.record(round('AI', 1, [0.1, 0.8, 0.1], 150, { kin: true, progress: 0.4, wouldBe: 'AI' }));
  m.record(round('AI', 2, [0.2, 0.2, 0.6], 100, { kin: true }));
  m.record(round('TIE', 0, [0.5, 0.25, 0.25], 500));
  m.record(round('PLAYER', 0, [0.1, 0.1, 0.8], 50, { kin: true, wouldBe: 'PLAYER' }));
  m.record(round('FOUL_LATE', null, [0.3, 0.3, 0.4], 10));
  m.record(round('VOID_UNKNOWN', null, [0.3, 0.3, 0.4], 10));
  const s = m.summary();
  assert.deepEqual(s.rounds, { judged: 6, valid: 4, fouls: 1, voids: { VOID_NO_HAND: 0, VOID_UNKNOWN: 1, VOID_NO_FIST: 0 } });
  assert.deepEqual(s.outcome, { ai: 2, tie: 1, player: 1 });
  assert.equal(s.winRate.p, 0.5); assert.equal(s.unbeaten.p, 0.75);
  assert.ok(Math.abs(s.winRate.lo - M.wilsonInterval(2, 4).lo) < 1e-12);
  assert.ok(Math.abs(/** @type {number} */ (s.pValueVsChance) - M.binomTailGE(2, 4, 1 / 3)) < 1e-12);
  assert.equal(s.prediction.accuracy.p, 0.75);
  const brier = ((0.01 + 0.04 + 0.01) + (0.04 + 0.04 + 0.16) + (0.25 + 0.0625 + 0.0625) + (0.81 + 0.01 + 0.64)) / 4;
  assert.ok(Math.abs(/** @type {number} */ (s.prediction.brier) - brier) < 1e-12);
  const ll = -(Math.log2(0.8) + Math.log2(0.6) + Math.log2(0.5) + Math.log2(0.1)) / 4;
  assert.ok(Math.abs(/** @type {number} */ (s.prediction.loglossBits) - ll) < 1e-12);
  assert.ok(Math.abs(/** @type {number} */ (s.prediction.infoGainBits) - (Math.log2(3) - ll)) < 1e-12);
  assert.equal(s.leadToLandingMs.median, 125);
  assert.equal(s.heldBehaviourShare.k, 1);
  assert.deepEqual({ ai: s.behaviourOnly.ai, tie: s.behaviourOnly.tie, player: s.behaviourOnly.player }, { ai: 1, tie: 2, player: 1 });
  assert.equal(s.foulRate.k, 1); assert.equal(s.foulRate.n, 5);
  const copy = createMetrics();
  assert.equal(copy.load(JSON.parse(JSON.stringify(m.toJSON()))), true);
  assert.deepEqual(copy.summary(), s);
  assert.equal(createMetrics().load({ v: 3 }), false);
});

test('metrics: calibration error is ~0 for a calibrated stream and large for an over-confident one', () => {
  const rng = makeRng(5);
  const run = (trueP, claimed) => {
    const m = createMetrics();
    for (let i = 0; i < 4000; i++) {
      const hit = rng.next() < trueP;
      m.record({ verdict: 'AI', valid: true, playerMove: hit ? 0 : 1, commits: [], beliefAtFinalCommit: { post: [claimed, (1 - claimed) / 2, (1 - claimed) / 2] }, timing: { leadToLandingMs: 1 }, behaviour: {} });
    }
    return /** @type {number} */ (m.summary().prediction.ece);
  };
  assert.ok(run(0.7, 0.7) < 0.03);
  assert.ok(run(0.6, 0.95) > 0.3);
});

test('pose: clean and noisy shapes, odd shapes, stability rule, completion time', () => {
  const clf = createPoseClassifier();
  const arg = (p) => p.indexOf(Math.max(...p));
  assert.equal(arg(clf.posterior([0.02, 0.03, 0.0, 0.01])), ROCK);
  assert.equal(arg(clf.posterior([0.95, 1.0, 0.9, 0.97])), PAPER);
  assert.equal(arg(clf.posterior([0.9, 0.95, 0.1, 0.05])), SCISSORS);
  assert.equal(arg(clf.posterior([0.8, 0.85, 0.3, 0.2])), SCISSORS);
  assert.equal(arg(clf.posterior([1, 0.05, 0.02, 0.0])), OTHER, 'index only is not a throw');
  assert.equal(arg(clf.posterior([1, 1, 1, 0.05])), OTHER, 'three fingers is not a throw');
  assert.ok(clf.posterior([0.5, 0.5, 0.5, 0.5], { label: 'PAPER', score: 0.9 })[PAPER] > clf.posterior([0.5, 0.5, 0.5, 0.5])[PAPER]);
  const mk = (t, u4) => ({ t, u4, neural: null });
  const opening = [0, 33, 66, 100, 133, 166, 200].map((t, i) => mk(t, [i / 4, i / 4, i / 4, i / 4].map((v) => Math.min(1, v))));
  const d = decideFinal(opening, clf);
  assert.equal(d.move, PAPER);
  assert.ok(d.tStable !== null && d.tStable >= 100);
  assert.equal(completionTime(opening, PAPER, /** @type {number} */ (d.tStable), clf), d.tStable);
  assert.equal(decideFinal([], clf).reason, 'NO_HAND');
  assert.equal(decideFinal([mk(0, [1, 0, 0, 0]), mk(33, [1, 0, 0, 0]), mk(66, [1, 0, 0, 0]), mk(100, [1, 0, 0, 0])], clf).reason, 'OTHER');
  assert.equal(decideFinal([mk(0, [0, 0, 0, 0]), mk(33, [1, 1, 1, 1]), mk(66, [0, 0, 0, 0]), mk(100, [1, 1, 0, 0])], clf).reason, 'UNSTABLE');
});

test('MindTwin: the forecast beats persistence on a moving hand and claims nothing on a still one', () => {
  const rng = makeRng(3);
  const twin = createTwinPredictor({ horizonMs: 120 });
  // repeated minimum-jerk openings and closings, 30 fps, noise sd 0.03
  for (let t = 0; t < 20000; t += 1000 / 30) {
    const phase = (t % 1600) / 1600;
    const u = phase < 0.25 ? M.minJerk(phase / 0.25) : phase < 0.5 ? 1 : phase < 0.75 ? 1 - M.minJerk((phase - 0.5) / 0.25) : 0;
    const out = twin.push(t, [0.2, u, u, u, u].map((v) => v + rng.normal(0, 0.03)));
    assert.ok(out && out.ahead.every(Number.isFinite) && out.aheadSd.every((s) => s > 0));
  }
  const s = twin.skill();
  console.log(`  twin forecast (120 ms ahead): MAE ${s.maeForecast?.toFixed(3)} vs persistence ${s.maePersistence?.toFixed(3)}, skill ${s.skill?.toFixed(2)}, open/closed agreement ${s.agreement?.toFixed(3)}`);
  assert.ok(s.n > 300 && /** @type {number} */ (s.skill) > 0.2);
  const still = createTwinPredictor();
  for (let t = 0; t < 8000; t += 33.3) still.push(t, [0.2, 0.5, 0.5, 0.5, 0.5].map((v) => v + rng.normal(0, 0.03)));
  console.log(`  twin forecast on a still hand: skill ${still.skill().skill?.toFixed(2)}`);
  assert.ok(Math.abs(/** @type {number} */ (still.skill().skill)) < 0.15, `skill on a still hand ${still.skill().skill}`);
  assert.equal(still.push(NaN, [0, 0, 0, 0, 0]), null);
  assert.equal(createTwinPredictor().skill().skill, null);
});
