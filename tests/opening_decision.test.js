// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../web/js/core/rng.js';
import { RULES, ROCK, PAPER, SCISSORS } from '../web/js/core/constants.js';
import { minJerk } from '../web/js/core/math.js';
import { createOpeningDetector, measureOpening } from '../web/js/core/opening.js';
import { fuse, legalMassFor, chooseAction, shouldRevise, bestResponse, learnFusionWeights, foulNow } from '../web/js/core/decision.js';
import { throwTrace, playFlight, isFoul } from './helpers/synthetic_throw.js';

const NOISE = 0.05;
const NV = NOISE * NOISE;
const PRIOR = /** @type {const} */ ({ kind: 'lead', leadMeanMs: 170, leadSdMs: 85, durLogMean: Math.log(130), durLogSd: 0.5 });

/** Feed a scalar signal sampled at fps to a detector; returns headings per frame. */
function feed(det, fn, { fps = 30, from = -520, to = 0, rng, noise = NOISE }) {
  const rows = [];
  det.reset(from - 1);
  for (let t = from; t < to; t += 1000 / fps) {
    det.observe(t, fn(t) + rng.normal(0, noise), Math.max(noise, 0.035) ** 2);
    rows.push({ t, h: det.headingNow() });
  }
  return rows;
}

test('opening: a fist keeps the heading near zero and makes "stay" dominate as landing approaches', () => {
  const rng = makeRng(1);
  const det = createOpeningDetector();
  const rows = feed(det, () => 0, { rng });
  assert.ok(rows.every((r) => r.h < 0.05), `max heading ${Math.max(...rows.map((r) => r.h))}`);
  const e = det.evidence(0, PRIOR);
  const pStay = 1 / (1 + Math.exp(e.logOpenLegal - e.logStay) + Math.exp(e.logOpenLate - e.logStay));
  assert.ok(pStay > 0.5, `P(stay) at landing = ${pStay}`);
  assert.ok(e.logOpenLegal < e.logStay - 2, 'in-time opening should be strongly disfavoured at landing');
});

test('opening: onset 180 ms before landing is detected at least 80 ms before landing (30 fps)', () => {
  let leads = [];
  for (let seed = 1; seed <= 40; seed++) {
    const rng = makeRng(seed);
    const det = createOpeningDetector();
    const rows = feed(det, (t) => minJerk((t + 180) / 130), { rng, from: -520 + rng.next() * 33 });
    const first = rows.find((r) => r.h > 0.95);
    assert.ok(first, `seed ${seed}: never detected`);
    leads.push(-first.t);
  }
  leads.sort((a, b) => a - b);
  assert.ok(leads[Math.floor(leads.length * 0.1)] >= 80, `10th percentile lead ${leads[Math.floor(leads.length * 0.1)]} ms`);
});

test('opening: open-then-close re-anchors the bank', () => {
  const rng = makeRng(7);
  const det = createOpeningDetector();
  // opens fully by -250 ms, closes again between -220 and -120 ms, fist afterwards
  const fn = (t) => (t < -220 ? minJerk((t + 400) / 130) : 1 - minJerk((t + 220) / 100));
  const rows = feed(det, fn, { rng });
  assert.ok(rows.some((r) => r.h > 0.95), 'the opening itself must be seen');
  assert.ok(det.reanchors >= 1, 'bank must restart after the hand is a fist again');
  assert.ok(rows[rows.length - 1].h < 0.2, `final heading ${rows[rows.length - 1].h}`);
});

test('opening: an onset 20 ms before landing is assigned to "late", not "legal"', () => {
  const rng = makeRng(3);
  const det = createOpeningDetector();
  det.reset(-521);
  for (let t = -520; t < 0; t += 1000 / 60) det.observe(t, minJerk((t + 20) / 130) + rng.normal(0, 0.02), 0.035 ** 2);
  const e = det.evidence(0, PRIOR);
  assert.ok(e.logOpenLate > e.logOpenLegal, `late ${e.logOpenLate} vs legal ${e.logOpenLegal}`);
});

test('opening: heading is independent of evidence() calls and landing estimates (referee independence)', () => {
  const a = createOpeningDetector(), b = createOpeningDetector();
  const rng = makeRng(11);
  a.reset(-500); b.reset(-500);
  for (let t = -499; t < 0; t += 33.3) {
    const u = minJerk((t + 200) / 140) + rng.normal(0, NOISE);
    a.observe(t, u, NV); b.observe(t, u, NV);
    b.evidence(t + 300 * rng.next(), PRIOR);
    b.evidence(t - 50, { kind: 'absolute', onsetMeanT: t, onsetSdMs: 40, durLogMean: 4.8, durLogSd: 0.4 });
    assert.equal(a.headingNow(), b.headingNow());
  }
});

test('opening: robust to dt = 0, out-of-order samples, non-finite input and huge noise', () => {
  const det = createOpeningDetector();
  det.reset(0);
  det.observe(10, 0.1, NV); det.observe(10, 0.2, NV); det.observe(5, 0.9, NV);
  det.observe(NaN, 0.5, NV); det.observe(20, NaN, NV); det.observe(30, 0.5, -1); det.observe(40, 0.4, 1e9);
  const h = det.headingNow();
  const e = det.evidence(100, PRIOR);
  assert.ok(Number.isFinite(h) && h >= 0 && h <= 1);
  for (const k of ['logStay', 'logOpenLegal', 'logOpenLate']) assert.ok(!Number.isNaN(e[k]), k);
});

test('opening: clone() is an independent deep copy', () => {
  const det = createOpeningDetector();
  det.reset(0);
  for (let t = 1; t < 200; t += 33) det.observe(t, minJerk((t - 60) / 120), NV);
  const c = det.clone();
  assert.equal(c.headingNow(), det.headingNow());
  det.observe(233, 0, NV); det.observe(266, 0, NV);
  assert.notEqual(c.headingNow(), det.headingNow());
});

test('measureOpening recovers onset and duration of a minimum-jerk opening', () => {
  const t = [], u = [];
  for (let x = -500; x <= 200; x += 1000 / 60) { t.push(x); u.push(minJerk((x + 170) / 140)); }
  const m = measureOpening({ t, u }, 0, 0.02);
  assert.ok(m && m.opened);
  assert.ok(Math.abs(/** @type {number} */ (m.durationMs) - 140) < 15, `duration ${m.durationMs}`);
  assert.ok(Math.abs(/** @type {number} */ (m.onsetT) + 170) < 20, `onset ${m.onsetT}`);
  assert.ok(/** @type {number} */ (m.progressAtLanding) > 0.95);
  const flat = measureOpening({ t, u: t.map(() => 0.01) }, 0, 0.02);
  assert.ok(flat && flat.opened === false);
});

test('decision: fuse() without kinematic evidence returns the prior', () => {
  const b = fuse({ prior: [0.5, 0.3, 0.2], F: null, Bstay: null, Bopen: null });
  assert.deepEqual(b.post.map((x) => +x.toFixed(6)), [0.5, 0.3, 0.2]);
  assert.equal(b.pLate, 0);
});

test('decision: structural no-loss fact — two live classes always leave a move that cannot lose', () => {
  const noLoss = { lossAversion: 3, noLoss: true };
  for (const [a, b, safe] of [[PAPER, SCISSORS, SCISSORS], [ROCK, PAPER, PAPER], [ROCK, SCISSORS, ROCK]]) {
    for (const split of [0.01, 0.3, 0.5, 0.7, 0.99]) {
      const mass = [0, 0, 0]; mass[a] = split; mass[b] = 1 - split;
      const c = chooseAction(mass, noLoss);
      assert.equal(c.pLoss, 0);
      assert.equal(c.action, safe);
    }
  }
  // one live class: the move that beats it
  assert.equal(chooseAction([1, 0, 0], noLoss).action, PAPER);
  assert.equal(chooseAction([0, 1, 0], noLoss).action, SCISSORS);
  assert.equal(chooseAction([0, 0, 1], noLoss).action, ROCK);
});

test('decision: safety follows the legal set of the referee, not the size of the belief', () => {
  const lex = { lossAversion: 3, noLoss: true };
  // front open, back ambiguous: PAPER and SCISSORS are both legal. Even if the AI is "sure" it is scissors,
  // ROCK could lose to a legal paper, so the safe move is SCISSORS.
  for (const pPaper of [0, 1e-9, 1e-4, 0.2]) {
    const c = chooseAction([0, pPaper, 1 - pPaper], lex, [false, true, true]);
    assert.equal(c.action, SCISSORS, `P(paper) = ${pPaper}`);
    assert.equal(c.stats[c.action].safe, true);
    assert.equal(shouldRevise(ROCK, c, lex), true, 'an unsafe standing commit is always replaced');
  }
  // back decisively closed: only SCISSORS is legal -> ROCK is safe and wins
  assert.equal(chooseAction([0, 0, 1], lex, [false, false, true]).action, ROCK);
  // front closed: only ROCK legal -> PAPER, whatever the belief says
  assert.equal(chooseAction([1e-15, 0, 0], lex, [true, false, false]).action, PAPER);
  assert.equal(chooseAction([0, 0, 0], lex, [true, false, false]).action, PAPER);
  // all three legal: no safe move exists
  assert.equal(chooseAction([0.1, 0.2, 0.7], lex, [true, true, true]).stats.some((x) => x.safe), false);
  // every throw would be a foul: nothing can be lost, the belief alone decides
  const lm = legalMassFor({ pLegal: [0.2, 0.3, 0.5], pLate: 0, post: [0.2, 0.3, 0.5], kinLik: [1 / 3, 1 / 3, 1 / 3] }, 0.1, 0.95, RULES.turnuva);
  assert.deepEqual(lm.legal, [true, true, true]);
  // both safe: revise for a clear gain (SCISSORS ties, ROCK wins)
  const both = chooseAction([0, 0, 1], lex, [false, false, true]);
  assert.equal(shouldRevise(SCISSORS, both, lex), true);
});

test('decision: risk-sensitive choice, tie-break order and revision rules', () => {
  const pol = { lossAversion: 2, noLoss: false };
  // P(S)=0.8, P(P)=0.2: ROCK has EU 0.8 - 2*0.2 = 0.4, SCISSORS 0.2 -> ROCK
  assert.equal(chooseAction([0, 0.2, 0.8], pol).action, ROCK);
  // P(S)=0.6, P(P)=0.4: ROCK 0.6-0.8 = -0.2 ; SCISSORS 0.4 -> SCISSORS (safe)
  assert.equal(chooseAction([0, 0.4, 0.6], pol).action, SCISSORS);
  // uniform: all EUs equal -> first in the fixed order
  assert.equal(chooseAction([1 / 3, 1 / 3, 1 / 3], pol).action, PAPER);
  const c = chooseAction([0, 0.2, 0.8], pol);
  assert.equal(shouldRevise(ROCK, c, pol), false);
  assert.equal(shouldRevise(PAPER, c, pol), true); // PAPER loses to scissors with p 0.8
  const lex = { lossAversion: 3, noLoss: true };
  const c2 = chooseAction([0, 0.2, 0.8], lex); // SCISSORS never loses here
  assert.equal(c2.action, SCISSORS);
  assert.equal(shouldRevise(ROCK, c2, lex), true);
  assert.equal(bestResponse([0.6, 0.2, 0.2]), PAPER);
});

test('decision: legal mass follows the referee rule and falls back when everything is foul', () => {
  const belief = { pLegal: [0.2, 0.3, 0.5], pLate: 0, post: [0.2, 0.3, 0.5], kinLik: [1 / 3, 1 / 3, 1 / 3] };
  const t = RULES.turnuva;
  assert.deepEqual(foulNow(0.9, 0.05, t), [true, true, false]);   // front open, back closed -> only scissors legal
  assert.deepEqual(foulNow(0.1, 0.05, t), [false, true, true]);   // front closed -> only rock
  assert.deepEqual(foulNow(0.9, 0.95, t), [true, false, true]);   // both open -> only paper
  assert.deepEqual(foulNow(0.9, 0.5, t), [true, false, false]);   // back ambiguous -> paper or scissors
  assert.deepEqual(legalMassFor(belief, 0.9, 0.05, t).mass, [0, 0, 0.5]);
  const all = legalMassFor(belief, 0.1, 0.95, t); // front closed + back open: no legal RPS throw
  assert.equal(all.restricted, false);
  assert.deepEqual(all.mass, belief.pLegal);
});

test('decision: fusion weights move towards the channel that was right and stay bounded', () => {
  let w = { wPrior: 1, wKin: 1 };
  for (let i = 0; i < 200; i++) w = learnFusionWeights(w, { prior: [0.6, 0.2, 0.2], kinLik: [0.05, 0.05, 0.9], yTrue: SCISSORS });
  assert.ok(w.wKin > 1 && w.wPrior < 1, JSON.stringify(w));
  assert.ok(w.wKin <= 2.5 && w.wPrior >= 0.25);
});

/** One study cell: returns outcome counts over n flights. */
function study(rules, n, seed, gen) {
  const rng = makeRng(seed);
  let win = 0, tie = 0, loss = 0, foul = 0;
  const leads = [];
  for (let i = 0; i < n; i++) {
    const o = gen(i, rng);
    const res = playFlight(throwTrace({ ...o, rng }), rules, { noise: o.noise, behaviourMove: rng.int(3), fps: o.fps });
    if (isFoul(o.move, res.hF, res.hB, rules)) { foul += 1; continue; }
    if (res.action === o.move) tie += 1; else if (res.action === (o.move + 1) % 3) win += 1; else loss += 1;
    leads.push(res.leadMs);
  }
  leads.sort((a, b) => a - b);
  const valid = win + tie + loss;
  return { win, tie, loss, foul, valid, n, medianLead: leads[Math.floor(leads.length / 2)] };
}
const normal = (i, rng, extra = {}) => ({
  move: i % 3, fps: 30, noise: NOISE,
  lead: Math.max(30, rng.normal(170, 60)), dur: Math.exp(rng.normal(Math.log(130), 0.35)),
  backDelay: rng.normal(15, 20), enslave: Math.max(0, rng.normal(0.08, 0.04)), ...extra,
});

test('statistical regression: "turnuva" never loses a valid round; fouls stay moderate; decisions are early', () => {
  const r = study(RULES.turnuva, 900, 42, (i, rng) => normal(i, rng));
  console.log('  turnuva/normal/30fps', JSON.stringify(r));
  assert.equal(r.loss, 0);
  assert.ok(r.foul / r.n < 0.08, `foul rate ${r.foul / r.n}`);
  assert.ok(r.win / r.valid > 0.96, `win rate ${r.win / r.valid}`);
  assert.ok(r.medianLead > 100, `median lead ${r.medianLead}`);
  const r60 = study(RULES.turnuva, 600, 43, (i, rng) => normal(i, rng, { fps: 60 }));
  console.log('  turnuva/normal/60fps', JSON.stringify(r60));
  assert.equal(r60.loss, 0);
  const noisy = study(RULES.turnuva, 600, 44, (i, rng) => normal(i, rng, { noise: 0.1 }));
  console.log('  turnuva/normal/noise .10', JSON.stringify(noisy));
  assert.equal(noisy.loss, 0);
});

test('statistical regression: feints are handled without a loss under "turnuva"', () => {
  const f1 = study(RULES.turnuva, 300, 5, (i, rng) => normal(i, rng, { move: ROCK, feint: { from: PAPER, fromLead: 300, switchLead: 150, morphDur: 100 } }));
  const f2 = study(RULES.turnuva, 300, 6, (i, rng) => normal(i, rng, { move: PAPER, feint: { from: SCISSORS, fromLead: 260, switchLead: 110, morphDur: 100 } }));
  const late = study(RULES.turnuva, 300, 7, (i, rng) => normal(i, rng, { lead: Math.max(5, rng.normal(80, 35)) }));
  console.log('  feint paper->rock', JSON.stringify(f1), '\n  feint scissors->paper', JSON.stringify(f2), '\n  late openers', JSON.stringify(late));
  assert.equal(f1.loss + f2.loss + late.loss, 0);
  assert.ok(f1.valid > 250 && f2.valid > 250, 'in-air feints that finish before landing are legal throws');
});

test('statistical regression: "serbest" leaves the human a small legitimate chance', () => {
  const r = study(RULES.serbest, 900, 42, (i, rng) => normal(i, rng));
  console.log('  serbest/normal/30fps', JSON.stringify(r));
  assert.ok(r.loss / r.valid < 0.015, `loss rate ${r.loss / r.valid}`);
  assert.ok(r.foul / r.n < 0.08);
});

test('performance: observe + heading + evidence stays well under a millisecond per frame', () => {
  const det = createOpeningDetector();
  const rng = makeRng(9);
  det.reset(-601);
  const t0 = performance.now();
  let frames = 0;
  for (let rep = 0; rep < 20; rep++) {
    det.reset(-601);
    for (let t = -600; t < 0; t += 1000 / 60) {
      det.observe(t, minJerk((t + 170) / 130) + rng.normal(0, NOISE), NV);
      det.headingNow(); det.evidence(10, PRIOR);
      frames += 1;
    }
  }
  const perFrame = (performance.now() - t0) / frames;
  console.log(`  opening detector: ${perFrame.toFixed(4)} ms per frame`);
  assert.ok(perFrame < 0.5, `per-frame cost ${perFrame} ms`);
});
