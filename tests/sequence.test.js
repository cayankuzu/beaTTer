// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../web/js/core/rng.js';
import { payoff } from '../web/js/core/constants.js';
import { bestResponse } from '../web/js/core/decision.js';
import { createCTW } from '../web/js/core/sequence/ctw.js';
import { createPPM } from '../web/js/core/sequence/ppm.js';
import { createMixture } from '../web/js/core/sequence/mixture.js';
import { buildExperts } from '../web/js/core/sequence/experts.js';
import { populationPrior, OPENING, SHIFT_AFTER } from '../web/js/core/sequence/population.js';
import { createSequenceModel } from '../web/js/core/sequence/index.js';
import { createSafeExploiter } from '../web/js/core/safety.js';
import { makePlayer, KINDS } from '../web/js/sim/behaviour_players.js';

const LOG2_3 = Math.log2(3);

/** Play `rounds` rounds of pure behavioural best response against a player; returns rates and log-loss. */
function duel(kind, rounds, seed, params, { from = 0 } = {}) {
  const rng = makeRng(seed);
  const player = makePlayer(kind, rng, params);
  const model = createSequenceModel();
  const h = { P: [], A: [], O: [] };
  let win = 0, loss = 0, tie = 0, logloss = 0, hits = 0, n = 0;
  for (let r = 0; r < rounds; r++) {
    const { p } = model.predict();
    const a = bestResponse(p);
    const y = player.next(h);
    const res = payoff(a, y);
    if (r >= from) {
      n += 1;
      if (res > 0) win += 1; else if (res < 0) loss += 1; else tie += 1;
      logloss -= Math.log2(Math.max(p[y], 1e-9));
      if (p[y] >= Math.max(p[0], p[1], p[2])) hits += 1;
    }
    model.update(y, a);
    h.P.push(y); h.A.push(a); h.O.push(-res);
  }
  return { win: win / n, loss: loss / n, tie: tie / n, logloss: logloss / n, top1: hits / n, model };
}

test('CTW: predictions are exact probabilities (sum to 1) and match a brute-force mixture at depth 1', () => {
  const rng = makeRng(5);
  const ctw = createCTW({ depth: 4 });
  const seq = [];
  for (let i = 0; i < 300; i++) {
    const ctx = []; for (let d = 0; d < 4 && d < seq.length; d++) ctx.push(seq[seq.length - 1 - d]);
    const p = ctw.predict(ctx);
    // the un-normalised recursion itself must be a probability model (predict() only guards rounding)
    assert.ok(Math.abs(ctw.rawMass(ctx) - 1) < 1e-9, `raw predictive mass ${ctw.rawMass(ctx)}`);
    assert.ok(Math.abs(p[0] + p[1] + p[2] - 1) < 1e-9);
    assert.ok(p.every((v) => v > 0));
    const y = rng.int(3);
    ctw.update(ctx, y); seq.push(y);
  }
  // depth 1: Pw(root) = 1/2 Pe(all) + 1/2 prod_c Pe(symbols following context c); contexts padded with 0
  const kt = (symbols) => { const c = [0, 0, 0]; let lp = 0; for (const s of symbols) { lp += Math.log((c[s] + 0.5) / (c[0] + c[1] + c[2] + 1.5)); c[s] += 1; } return lp; };
  const brute = (s) => {
    const byCtx = [[], [], []];
    for (let i = 0; i < s.length; i++) byCtx[i === 0 ? 0 : s[i - 1]].push(s[i]);
    return Math.log(0.5 * Math.exp(kt(s)) + 0.5 * Math.exp(kt(byCtx[0]) + kt(byCtx[1]) + kt(byCtx[2])));
  };
  const short = [0, 1, 1, 2, 0, 1, 2, 2, 1];
  const c1 = createCTW({ depth: 1 });
  for (let i = 0; i < short.length; i++) {
    const ctx = i === 0 ? [] : [short[i - 1]];
    const p = c1.predict(ctx);
    for (let x = 0; x < 3; x++) {
      const expected = Math.exp(brute([...short.slice(0, i), x]) - brute(short.slice(0, i)));
      assert.ok(Math.abs(p[x] - expected) < 1e-9, `i=${i} x=${x}: ${p[x]} vs ${expected}`);
    }
    c1.update(ctx, short[i]);
  }
});

test('CTW learns a second-order deterministic source', () => {
  const ctw = createCTW({ depth: 5 });
  const seq = [0, 1];
  let correct = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    const ctx = []; for (let d = 0; d < 5 && d < seq.length; d++) ctx.push(seq[seq.length - 1 - d]);
    const y = (seq[seq.length - 1] + 2 * seq[seq.length - 2] + 1) % 3;
    const p = ctw.predict(ctx);
    if (i >= 100) { n += 1; if (p[y] > 0.8) correct += 1; }
    ctw.update(ctx, y); seq.push(y);
  }
  assert.ok(correct / n > 0.95, `accuracy ${correct / n}`);
});

test('PPM-C returns a proper distribution and learns a repeating pattern', () => {
  const ppm = createPPM({ maxOrder: 5 });
  const pat = [0, 0, 1, 2, 1];
  const seq = [];
  let good = 0;
  for (let i = 0; i < 200; i++) {
    const p = ppm.predict(seq);
    assert.ok(Math.abs(p[0] + p[1] + p[2] - 1) < 1e-12);
    const y = pat[i % pat.length];
    if (i >= 50 && p[y] > 0.6) good += 1;
    ppm.update(seq, y); seq.push(y);
  }
  assert.ok(good / 150 > 0.95);
});

test('population prior uses the published tables and rotates the shift by the last move', () => {
  const p0 = populationPrior({ P: [], O: [] });
  assert.ok(Math.abs(p0[0] - OPENING[0] / (OPENING[0] + OPENING[1] + OPENING[2])) < 1e-12);
  const afterLossWithRock = populationPrior({ P: [0], O: [-1] }); // lost with ROCK: stay=ROCK, up=PAPER, down=SCISSORS
  assert.ok(Math.abs(afterLossWithRock[0] - SHIFT_AFTER.loss[0]) < 1e-3);
  assert.ok(Math.abs(afterLossWithRock[1] - SHIFT_AFTER.loss[1]) < 1e-3);
  const afterWinWithPaper = populationPrior({ P: [1], O: [1] });
  assert.ok(afterWinWithPaper[1] > afterWinWithPaper[0] && afterWinWithPaper[1] > afterWinWithPaper[2], 'win-stay');
});

test('there are 26 base experts with unique names; all predictions are proper or null', () => {
  const ex = buildExperts();
  assert.equal(ex.length, 26);
  assert.equal(new Set(ex.map((e) => e.name)).size, 26);
  const rng = makeRng(2);
  const ctx = { P: [], A: [], O: [] };
  for (let i = 0; i < 120; i++) {
    for (const e of ex) {
      const q = e.predict(ctx);
      if (q) assert.ok(Math.abs(q[0] + q[1] + q[2] - 1) < 1e-9 && q.every((v) => v >= 0), `${e.name} at ${i}`);
    }
    const y = rng.int(3), a = rng.int(3);
    for (const e of ex) e.update(ctx, y, a);
    ctx.P.push(y); ctx.A.push(a); ctx.O.push(-payoff(a, y));
  }
});

test('mixture: weights stay normalised and finite; sleeping experts keep their relative weight', () => {
  const mix = createMixture({ nExperts: 4 });
  const rng = makeRng(8);
  for (let i = 0; i < 10000; i++) {
    const preds = [0, 1, 2, 3].map((k) => (rng.next() < 0.3 ? null : Float64Array.of(0.2 + 0.6 * rng.next(), 0.1, 0.1).map((v, _, a) => v / (a[0] + a[1] + a[2]))));
    const { p } = mix.combine(preds);
    assert.ok(Math.abs(p[0] + p[1] + p[2] - 1) < 1e-9 && p.every((v) => v > 1e-6 && Number.isFinite(v)));
    mix.update(preds, rng.int(3));
  }
  const w = mix.weights();
  assert.ok(Math.abs(w.reduce((s, v) => s + v, 0) - 1) < 1e-9);
  // one expert always asleep, others awake with identical predictions: its share must not collapse
  const m2 = createMixture({ nExperts: 2, share: 0, gamma: 1 });
  for (let i = 0; i < 50; i++) m2.update([Float64Array.of(0.8, 0.1, 0.1), null], 0);
  const w2 = m2.weights();
  const asleep = w2[3] + w2[4] + w2[5];
  assert.ok(asleep > 0.2, `sleeping expert kept ${asleep} of the mass`);
});

test('sequence model converges on an i.i.d. biased source', () => {
  const r = duel('biased', 300, 3, { p: [0.6, 0.2, 0.2] });
  const { p } = r.model.predict();
  assert.ok(Math.abs(p[0] - 0.6) < 0.1 && Math.abs(p[1] - 0.2) < 0.1, `prediction ${p}`);
  assert.ok(r.win > 0.5, `win rate ${r.win}`);
});

test('sequence model masters deterministic structure (cycle, period-5 pattern)', () => {
  const cyc = duel('cycle', 200, 4, {}, { from: 20 });
  assert.ok(cyc.top1 > 0.95 && cyc.win > 0.95, JSON.stringify({ top1: cyc.top1, win: cyc.win }));
  const pat = duel('pattern', 200, 4, { pattern: [0, 0, 1, 2, 1] }, { from: 40 });
  assert.ok(pat.top1 > 0.9, `pattern top1 ${pat.top1}`);
});

test('sequence model exploits outcome-conditioned play and reports honest numbers', () => {
  const strong = duel('wslsStrong', 300, 6, {}, { from: 50 });
  assert.ok(strong.win > 0.5, `win vs strong WSLS ${strong.win}`);
  // group-level human table [ForderDyson2016]: the edge is real but modest
  let net = 0;
  for (let seed = 1; seed <= 20; seed++) { const r = duel('wsls', 300, seed, {}, { from: 30 }); net += r.win - r.loss; }
  net /= 20;
  console.log(`  mean net payoff/round vs published conditional-response table: ${net.toFixed(3)}`);
  assert.ok(net > 0.05, `net ${net}`);
});

test('Iocaine rotations: a second-guessing player is out-guessed', () => {
  const r = duel('antiPredictor', 300, 9, {}, { from: 50 });
  console.log(`  vs second-guesser: win ${r.win.toFixed(3)} loss ${r.loss.toFixed(3)}`);
  assert.ok(r.win > 0.5, `win rate ${r.win}`);
});

test('no overfitting on a uniform random player: log-loss stays at chance', () => {
  let ll = 0;
  for (let seed = 1; seed <= 12; seed++) ll += duel('uniform', 600, seed).logloss;
  ll /= 12;
  console.log(`  mean log-loss vs uniform: ${ll.toFixed(4)} bits (chance ${LOG2_3.toFixed(4)})`);
  assert.ok(ll < LOG2_3 + 0.03, `log-loss ${ll}`);
});

test('follows a player who changes style (fixed-share + forgetting)', () => {
  const r = duel('switcher', 480, 12, { kinds: ['cycle', 'biased', 'pattern'], every: 80 }, { from: 20 });
  assert.ok(r.win - r.loss > 0.25, `net ${r.win - r.loss}`);
});

test('serialisation: replaying the stored history rebuilds an identical model; bad input is rejected', () => {
  const a = duel('humanLike', 400, 21).model;
  const json = JSON.parse(JSON.stringify(a.toJSON()));
  assert.ok(JSON.stringify(json).length < 10000);
  const b = createSequenceModel();
  assert.equal(b.load(json), true);
  assert.deepEqual(b.predict().p, a.predict().p);
  a.update(1, 2); b.update(1, 2);
  assert.deepEqual(b.predict().p, a.predict().p);
  const c = createSequenceModel();
  assert.equal(c.load({ v: 4, P: '0123', A: '0000' }), false);
  assert.equal(c.load({ v: 3, P: '01', A: '00' }), false);
  assert.equal(c.load(null), false);
  assert.equal(c.length, 0);
  const s = a.stats();
  assert.equal(s.freq.reduce((x, y) => x + y, 0), s.n);
});

test('every behaviour player kind produces legal moves', () => {
  for (const kind of KINDS) {
    const rng = makeRng(1);
    const pl = makePlayer(kind, rng);
    const h = { P: [], A: [], O: [] };
    for (let i = 0; i < 60; i++) {
      const y = pl.next(h);
      assert.ok(y === 0 || y === 1 || y === 2, `${kind} -> ${y}`);
      const a = rng.int(3);
      h.P.push(y); h.A.push(a); h.O.push(-payoff(a, y));
    }
  }
});

test('safe exploitation: budget arithmetic and the worst-case bound against an oracle', () => {
  const rng = makeRng(4);
  const safe = createSafeExploiter({ initialBudget: 1, epsilonPerRound: 0.02 });
  assert.equal(safe.lambda(), 1);
  const T = 2000;
  let realised = 0;
  for (let t = 0; t < T; t++) {
    const d = safe.decide([0.5, 0.3, 0.2], rng);
    const y = (d.best + 1) % 3; // oracle: always beats the best response
    realised += payoff(d.move, y);
    safe.account(d.best, d.lambda, y);
    assert.ok(safe.budget >= 0);
  }
  assert.ok(safe.expectedPayoff >= -(1 + 0.02 * T) - 1e-9, `expected payoff ${safe.expectedPayoff}`);
  console.log(`  oracle opponent over ${T} rounds: expected payoff ${safe.expectedPayoff.toFixed(2)} (bound ${-(1 + 0.02 * T)}), realised ${realised}`);
  // a naive (non-safe) best responder loses every round against the same oracle
  assert.ok(safe.expectedPayoff > -0.05 * T);
  // winnings are banked and raise lambda again
  const s2 = createSafeExploiter({ initialBudget: 0 });
  assert.equal(s2.lambda(), 0);
  s2.account(1, 0, 0);
  assert.ok(Math.abs(s2.budget - 0.02) < 1e-12);
  const copy = createSafeExploiter();
  assert.equal(copy.load(JSON.parse(JSON.stringify(safe.toJSON()))), true);
  assert.equal(copy.budget, safe.budget);
});

test('the anti-predictor really beats a naive best responder (so the safety test is meaningful)', () => {
  const rng = makeRng(31);
  const player = makePlayer('antiPredictor', rng);
  const h = { P: [], A: [], O: [] };
  let net = 0;
  const kt = (seq) => { if (seq.length < 2) return [1 / 3, 1 / 3, 1 / 3]; const last = seq[seq.length - 1]; const c = [0.5, 0.5, 0.5]; for (let i = 1; i < seq.length; i++) if (seq[i - 1] === last) c[seq[i]] += 1; const n = c[0] + c[1] + c[2]; return c.map((v) => v / n); };
  for (let r = 0; r < 300; r++) {
    const a = bestResponse(kt(h.P));
    const y = player.next(h);
    const res = payoff(a, y);
    if (r >= 10) net += res;
    h.P.push(y); h.A.push(a); h.O.push(-res);
  }
  assert.ok(net < -200, `naive Markov-1 best responder net ${net}`);
});
