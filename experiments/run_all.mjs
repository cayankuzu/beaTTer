// @ts-check
/**
 * beaTTer v4 — reproducible SIMULATION experiments (seeded). Usage:  node experiments/run_all.mjs [--quick]
 *
 * Every number produced here comes from synthetic players (web/js/sim): minimum-jerk finger openings,
 * Gaussian landmark noise and behaviour models built from published group-level statistics. They show
 * how the system behaves under stated assumptions; they are NOT measurements of real people.
 *
 * How to read the tables. W / T / L are shares of VALID rounds. Under the `turnuva` preset a round is
 * valid only if the referee accepted the throw from the same in-air frames the AI read, so L = 0 there
 * is a property of the rule, not evidence of good prediction. The quantity that carries the detector's
 * errors is what did NOT become a valid round: fouls on honest throws, voids and aborts. Every row
 * therefore also reports the unconditional numbers over ALL attempts (attemptWinPct, noResultPct).
 * E1-E7 use a synthetic player that is matched to the detector's own assumptions; E8 breaks them.
 *
 * Output: docs/results/<id>.json (raw numbers) and docs/figures/<id>.svg.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from '../web/js/core/rng.js';
import { payoff } from '../web/js/core/constants.js';
import { wilsonInterval, quantile } from '../web/js/core/math.js';
import { bestResponse } from '../web/js/core/decision.js';
import { createSequenceModel } from '../web/js/core/sequence/index.js';
import { createSafeExploiter } from '../web/js/core/safety.js';
import { makePlayer } from '../web/js/sim/behaviour_players.js';
import { createSession } from '../web/js/sim/session.js';
import { lineChart, barChart } from './svg_charts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.argv.includes('--quick');
const K = QUICK ? 0.25 : 1;
const out = (/** @type {string} */ id, /** @type {any} */ data) => { mkdirSync(join(ROOT, 'docs/results'), { recursive: true }); writeFileSync(join(ROOT, 'docs/results', `${id}.json`), JSON.stringify({ id, simulated: true, generatedBy: 'experiments/run_all.mjs', quick: QUICK, ...data }, null, 1)); };
const fig = (/** @type {string} */ id, /** @type {string} */ svg) => { mkdirSync(join(ROOT, 'docs/figures'), { recursive: true }); writeFileSync(join(ROOT, 'docs/figures', `${id}.svg`), svg); };
const pct = (/** @type {number} */ k, /** @type {number} */ n) => (n ? +(100 * k / n).toFixed(2) : null);
const ci = (/** @type {number} */ k, /** @type {number} */ n) => { if (!n) return [null, null]; const w = wilsonInterval(k, n); return [+(100 * w.lo).toFixed(2), +(100 * w.hi).toFixed(2)]; };

/** An opening that started at least this long before landing is called "clear" (ROCK always is). */
const CLEAR_LEAD_MS = 110;

/** Run sessions and pool the judged rounds. */
function pool(/** @type {any} */ o, /** @type {number} */ rounds, /** @type {number[]} */ seeds) {
  const all = []; let aborted = 0, attempts = 0;
  const byMove = [0, 1, 2].map(() => ({ n: 0, foul: 0 }));
  const clear = { n: 0, foul: 0 };
  for (const seed of seeds) {
    const s = createSession({ behaviour: 'humanLike', ...o, seed });
    for (let i = 0; i < rounds; i++) {
      const x = s.playRound(); attempts += 1;
      const honest = x.truth && x.truth.move !== null && !x.truth.feint && !x.truth.late && !x.truth.noFist;
      if (!honest) continue;
      const foul = !!x.result && x.result.verdict === 'FOUL_LATE';
      byMove[x.intended].n += 1; if (foul) byMove[x.intended].foul += 1;
      if (x.intended === 0 || x.truth.leadMs >= CLEAR_LEAD_MS) { clear.n += 1; if (foul) clear.foul += 1; }
    }
    all.push(...s.results); aborted += s.aborted;
  }
  const v = all.filter((r) => r.valid);
  const c = (/** @type {string} */ k) => all.filter((r) => r.verdict === k).length;
  const leads = v.map((r) => r.timing.leadToLandingMs), leadC = v.map((r) => r.timing.leadToCompletionMs).filter((x) => x !== null), prog = v.map((r) => r.progressAtCommit).filter((x) => x !== null);
  const kinLeads = v.filter((r) => r.commits.some((/** @type {any} */ k) => k.seq === r.judgedSeq && k.reason !== 'BEHAVIOUR')).map((r) => r.timing.leadToLandingMs);
  const W = c('AI'), T = c('TIE'), L = c('PLAYER'), F = c('FOUL_LATE');
  const voids = c('VOID_NO_HAND') + c('VOID_UNKNOWN') + c('VOID_NO_FIST');
  return {
    attempts, aborted, judged: all.length, valid: v.length, W, T, L, fouls: F, voids,
    voidsByKind: { noHand: c('VOID_NO_HAND'), unknown: c('VOID_UNKNOWN'), noFist: c('VOID_NO_FIST') },
    // conditional on valid rounds
    winPct: pct(W, v.length), winCI: ci(W, v.length), tiePct: pct(T, v.length), lossPct: pct(L, v.length), lossCI: ci(L, v.length),
    // unconditional: over every attempt
    attemptWinPct: pct(W, attempts), attemptWinCI: ci(W, attempts),
    noResultPct: pct(F + voids + aborted, attempts), noResultCI: ci(F + voids + aborted, attempts),
    foulOfAttemptsPct: pct(F, attempts), voidOfAttemptsPct: pct(voids, attempts), abortedPct: pct(aborted, attempts),
    foulByMovePct: byMove.map((m) => pct(m.foul, m.n)), clearHonestFoulPct: pct(clear.foul, clear.n), clearHonestN: clear.n,
    kinematicLeadMedianMs: kinLeads.length ? Math.round(quantile(kinLeads, 0.5)) : null,
    foulPct: pct(F, v.length + F), foulCI: ci(F, v.length + F),
    leadMedianMs: leads.length ? Math.round(quantile(leads, 0.5)) : null, leadQ1Ms: leads.length ? Math.round(quantile(leads, 0.25)) : null, leadQ3Ms: leads.length ? Math.round(quantile(leads, 0.75)) : null,
    leadToCompletionMedianMs: leadC.length ? Math.round(quantile(leadC, 0.5)) : null,
    meanProgressAtCommit: prog.length ? +(prog.reduce((a, b) => a + b, 0) / prog.length).toFixed(3) : null,
    heldBehaviourPct: pct(v.filter((r) => r.commits.filter((/** @type {any} */ k) => k.reason !== 'BEHAVIOUR' && !k.postLanding).length === 0).length, v.length),
    sealsOk: all.every((r) => r.sealOk && r.chainOk),
    results: all,
  };
}
const strip = (/** @type {any} */ r) => { const { results, ...rest } = r; return rest; };
const seeds = (/** @type {number} */ n, /** @type {number} */ base) => Array.from({ length: Math.max(2, Math.round(n * K)) }, (_, i) => base + i);

console.log(`beaTTer v4 simulation experiments${QUICK ? ' (quick)' : ''}`);
const t00 = performance.now();

// ---------------------------------------------------------------- E1: behavioural channel alone
{
  const kinds = [['uniform', {}], ['biased', { p: [0.4, 0.33, 0.27] }], ['wsls', {}], ['humanLike', {}], ['wslsStrong', {}], ['markov1', {}], ['cycle', { lapse: 0.1 }], ['pattern', {}], ['switcher', {}], ['antiPredictor', {}]];
  /**
   * One closed loop: the policy's own moves are what the model learns from and what the synthetic
   * player reacts to. (Scoring a second policy on the trajectory of the first would be an off-policy
   * counterfactual: outcome-conditioned players would be in states that policy never produces.)
   */
  const loop = (/** @type {string} */ kind, /** @type {any} */ params, /** @type {number} */ seed, /** @type {'best'|'safe'} */ policy) => {
    const rng = makeRng(seed), aiRng = makeRng(seed + 5000);
    const pl = makePlayer(kind, rng, params);
    const model = createSequenceModel();
    const safe = createSafeExploiter();
    const h = { P: /** @type {number[]} */ ([]), A: /** @type {number[]} */ ([]), O: /** @type {number[]} */ ([]) };
    let W = 0, T = 0, L = 0, ll = 0;
    for (let r = 0; r < 300; r++) {
      const { p } = model.predict();
      const d = safe.decide(p, aiRng);
      const move = policy === 'best' ? bestResponse(p) : d.move;
      const y = pl.next(h);
      const res = payoff(/** @type {0|1|2} */ (move), /** @type {0|1|2} */ (y));
      if (res > 0) W += 1; else if (res < 0) L += 1; else T += 1;
      ll -= Math.log2(Math.max(p[y], 1e-9));
      safe.account(d.best, d.lambda, y);
      model.update(y, move);
      h.P.push(y); h.A.push(move); h.O.push(-res);
    }
    return { W, T, L, ll, n: 300 };
  };
  const rows = [];
  for (const [kind, params] of kinds) {
    const tot = { best: { W: 0, T: 0, L: 0, ll: 0, n: 0 }, safe: { W: 0, T: 0, L: 0, ll: 0, n: 0 } };
    for (const seed of seeds(40, 100)) for (const policy of /** @type {const} */ (['best', 'safe'])) {
      const r = loop(/** @type {string} */ (kind), params, seed, policy);
      const t = tot[policy]; t.W += r.W; t.T += r.T; t.L += r.L; t.ll += r.ll; t.n += r.n;
    }
    const B = tot.best, S = tot.safe;
    rows.push({
      player: kind, rounds: B.n,
      winPct: pct(B.W, B.n), winCI: ci(B.W, B.n), tiePct: pct(B.T, B.n), lossPct: pct(B.L, B.n), netPerRound: +((B.W - B.L) / B.n).toFixed(4),
      safeWinPct: pct(S.W, S.n), safeLossPct: pct(S.L, S.n), safeNetPerRound: +((S.W - S.L) / S.n).toFixed(4),
      loglossBits: +(B.ll / B.n).toFixed(4), infoGainBits: +(Math.log2(3) - B.ll / B.n).toFixed(4),
    });
    const row = rows[rows.length - 1];
    console.log(`E1 ${String(kind).padEnd(14)} best response: win ${row.winPct}% loss ${row.lossPct}% net ${row.netPerRound} | safe mixture: net ${row.safeNetPerRound} | info ${row.infoGainBits} bit`);
  }
  out('E1-behaviour-channel', { description: 'Behavioural channel only (no camera), 300 rounds per session. Two closed-loop runs per seed: the AI plays the best response of the sequence model, or the budgeted safe mixture; in each run the model learns from, and the synthetic player reacts to, the moves that policy actually played.', rows });
  fig('E1-behaviour-channel', barChart({ title: 'E1 — Yalnızca davranış kanalı: tur başına net kazanç (simülasyon)', yLabel: 'net kazanç / tur', categories: rows.map((r) => r.player), series: [{ name: 'en iyi yanıt', values: rows.map((r) => r.netPerRound) }, { name: 'güvenli karma strateji', values: rows.map((r) => r.safeNetPerRound) }] }));
}

// ---------------------------------------------------------------- E2: earliness-accuracy trade-off
{
  const freezes = [0, 40, 80, 120, 160, 200, 250];
  const rows = [];
  for (const fps of [30, 60]) for (const f of freezes) {
    const r = pool({ rules: 'serbest', fps, style: 'normal', engineCfg: { freezeLeadMs: f } }, 120, seeds(8, 200 + f));
    rows.push({ fps, freezeLeadMs: f, ...strip(r) });
    console.log(`E2 fps ${fps} freeze ${String(f).padStart(3)} ms  win ${r.winPct}%  tie ${r.tiePct}%  loss ${r.lossPct}%  foul ${r.foulPct}%  lead ${r.leadMedianMs} ms`);
  }
  out('E2-earliness-accuracy', { description: 'Decision freeze: no revision is allowed once the predicted landing is closer than freezeLeadMs. Referee preset serbest, normal openers. (Under turnuva the freeze is ignored: the referee reads the hand up to the last in-air frame, so an AI that stops looking earlier could lose to a legal throw.)', rows });
  fig('E2-earliness-accuracy', lineChart({ title: 'E2 — Erkenlik–doğruluk ödünleşimi, Serbest hakem (simülasyon)', xLabel: 'karar dondurma ufku (ms, inişten önce)', yLabel: 'kayıp oranı (%)', series: [30, 60].map((fps) => ({ name: `${fps} FPS`, points: rows.filter((r) => r.fps === fps).map((r) => [r.freezeLeadMs, r.lossPct ?? 0]) })) }));
}

// ---------------------------------------------------------------- E3: full system, presets x opener styles x fps
const e3 = [];
{
  for (const rules of ['turnuva', 'standart', 'serbest']) for (const style of ['early', 'normal', 'late']) for (const fps of [30, 60]) {
    const r = pool({ rules, style, fps }, 150, seeds(8, 300));
    e3.push({ rules, style, fps, ...strip(r) });
    console.log(`E3 ${rules.padEnd(8)} ${style.padEnd(6)} ${fps} fps  valid: W ${r.winPct}% T ${r.tiePct}% L ${r.lossPct}%  | all attempts: won ${r.attemptWinPct}% no result ${r.noResultPct}% (foul ${r.foulOfAttemptsPct}%)  lead ${r.leadMedianMs} ms (kinematic ${r.kinematicLeadMedianMs})  progress ${r.meanProgressAtCommit}`);
  }
  out('E3-full-system', { description: 'Complete pipeline (behaviour + kinematics + referee) against the humanLike behaviour player.', rows: e3 });
  const cats = ['early', 'normal', 'late'];
  fig('E3-fouls', barChart({ title: 'E3 — Faul oranı: hakem ön ayarı × açılma tarzı, 30 FPS (simülasyon)', yLabel: 'faul oranı (%)', categories: cats, series: ['turnuva', 'standart', 'serbest'].map((rules) => ({ name: rules, values: cats.map((s) => e3.find((r) => r.rules === rules && r.style === s && r.fps === 30)?.foulPct ?? 0) })) }));
  fig('E3-attempts', barChart({ title: 'E3 — Tüm denemeler içinde YZ’nin kazandığı pay, 30 FPS (simülasyon)', yLabel: 'kazanılan deneme (%)', categories: cats, series: ['turnuva', 'standart', 'serbest'].map((rules) => ({ name: rules, values: cats.map((s) => e3.find((r) => r.rules === rules && r.style === s && r.fps === 30)?.attemptWinPct ?? 0) })) }));
  fig('E3-lead', barChart({ title: 'E3 — Karar önceliği (medyan): açılma tarzı × kare hızı, Turnuva (simülasyon)', yLabel: 'inişten önce (ms)', categories: cats, series: [30, 60].map((fps) => ({ name: `${fps} FPS`, values: cats.map((s) => e3.find((r) => r.rules === 'turnuva' && r.style === s && r.fps === fps)?.leadMedianMs ?? 0) })) }));
}

// ---------------------------------------------------------------- E4: adversarial kinematics
{
  const cases = [
    ['feint paper->rock, switch 150 ms before landing', { behaviour: 'biased', behaviourParams: { p: [1, 0, 0] }, throwOptions: () => ({ feint: { from: 1, switchLeadMs: 150, morphMs: 100 } }) }],
    ['feint scissors->paper, switch 110 ms before landing', { behaviour: 'biased', behaviourParams: { p: [0, 1, 0] }, throwOptions: () => ({ feint: { from: 2, switchLeadMs: 110, morphMs: 100 } }) }],
    ['feint paper->scissors, switch 150 ms before landing', { behaviour: 'biased', behaviourParams: { p: [0, 0, 1] }, throwOptions: () => ({ feint: { from: 1, switchLeadMs: 150, morphMs: 100 } }) }],
    ['feint scissors->paper, very late (60 ms)', { behaviour: 'biased', behaviourParams: { p: [0, 1, 0] }, throwOptions: () => ({ feint: { from: 2, switchLeadMs: 60, morphMs: 90 } }) }],
    ['late throw: opens 100 ms after landing', { behaviour: 'biased', behaviourParams: { p: [0, 0.5, 0.5] }, throwOptions: () => ({ late: { afterLandingMs: 100 } }) }],
    ['tracking drop-outs (15 % of frames)', { throwOptions: () => ({ dropout: 0.15 }) }],
    ['left hand', { throwOptions: () => ({ handed: 'Left' }) }],
    ['weak throw stroke (soft landing)', { throwOptions: () => ({ throwAmplitudeScale: 0.22 }) }],
    ['two priming beats', { primeBeats: 2 }],
    ['single stroke', { primeBeats: 0 }],
    ['single stroke, 3.5 s wait before the throw', { primeBeats: 0, throwOptions: () => ({ cfg: { leadInMs: 3500 } }) }],
    ['single stroke, 60 fps', { primeBeats: 0, fps: 60 }],
    ['scissors first, ring + pinky 60 ms before landing', { behaviour: 'biased', behaviourParams: { p: [0, 1, 0] }, throwOptions: () => ({ feint: { from: 2, switchLeadMs: 60, morphMs: 120, fromLeadMs: 280 } }) }],
    ['relaxed open hand (fingers at 75 %)', { throwOptions: () => ({ perturb: { openAmplitude: { mean: 0.75, sd: 0.05 } } }) }],
  ];
  const rows = [];
  for (const rules of ['turnuva', 'serbest']) for (const [name, o] of cases) {
    const r = pool({ rules, ...(/** @type {any} */ (o)) }, 120, seeds(6, 400));
    rows.push({ rules, case: name, ...strip(r) });
    console.log(`E4 ${rules.padEnd(8)} ${String(name).padEnd(52)} valid ${r.valid} W ${r.winPct}% T ${r.tiePct}% L ${r.lossPct}% | attempts: no result ${r.noResultPct}% (foul ${r.fouls} void ${r.voids} abort ${r.aborted})`);
  }
  out('E4-adversarial', { description: 'Feints, late throws, tracking loss and alternative round structures.', rows });
}

// ---------------------------------------------------------------- E5: sensor noise
{
  const rows = [];
  for (const mm of [1, 2, 4, 6, 8]) for (const fps of [30, 60]) {
    const r = pool({ rules: 'turnuva', fps, throwOptions: () => ({ cfg: { worldNoiseSd: mm / 1000 } }) }, 120, seeds(6, 500 + mm));
    rows.push({ landmarkNoiseMm: mm, fps, ...strip(r) });
    console.log(`E5 noise ${mm} mm ${fps} fps  W ${r.winPct}% T ${r.tiePct}% L ${r.lossPct}% foul ${r.foulPct}% void ${r.voids} lead ${r.leadMedianMs}`);
  }
  out('E5-sensor-noise', { description: 'Landmark noise (sd per world coordinate) versus outcome; preset turnuva, normal openers.', rows });
  fig('E5-sensor-noise', lineChart({ title: 'E5 — Yer işareti gürültüsü ve faul oranı, Turnuva (simülasyon)', xLabel: 'yer işareti gürültüsü (mm, sd)', yLabel: 'faul oranı (%)', series: [30, 60].map((fps) => ({ name: `${fps} FPS`, points: rows.filter((r) => r.fps === fps).map((r) => [r.landmarkNoiseMm, r.foulPct ?? 0]) })) }));
}

// ---------------------------------------------------------------- E6: calibration and learning curves
{
  const r = pool({ rules: 'turnuva', style: 'normal', fps: 30 }, 300, seeds(8, 600));
  const bins = Array.from({ length: 10 }, () => ({ n: 0, conf: 0, hit: 0 }));
  let brier = 0, ll = 0, n = 0, hit = 0;
  for (const x of r.results) {
    if (!x.valid || !x.beliefAtFinalCommit) continue;
    const p = x.beliefAtFinalCommit.post, y = x.playerMove;
    const best = p.indexOf(Math.max(...p));
    const b = Math.min(9, Math.floor(p[best] * 10));
    bins[b].n += 1; bins[b].conf += p[best]; bins[b].hit += best === y ? 1 : 0;
    brier += p.reduce((/** @type {number} */ a, /** @type {number} */ v, /** @type {number} */ i) => a + (v - (i === y ? 1 : 0)) ** 2, 0);
    ll -= Math.log2(Math.max(p[y], 1e-6)); n += 1; hit += best === y ? 1 : 0;
  }
  const ece = bins.reduce((a, b) => a + (b.n ? (b.n / n) * Math.abs(b.hit / b.n - b.conf / b.n) : 0), 0);
  out('E6-calibration', {
    description: 'Belief at the judged seal versus the truth; preset turnuva, normal openers, 30 fps.',
    n, accuracyPct: pct(hit, n), brier: +(brier / n).toFixed(4), loglossBits: +(ll / n).toFixed(4), infoGainBits: +(Math.log2(3) - ll / n).toFixed(4), ece: +ece.toFixed(4),
    reliability: bins.map((b, i) => ({ bin: `${i / 10}-${(i + 1) / 10}`, n: b.n, confidence: b.n ? +(b.conf / b.n).toFixed(3) : null, accuracy: b.n ? +(b.hit / b.n).toFixed(3) : null })),
  });
  fig('E6-calibration', lineChart({ title: 'E6 — Güvenilirlik diyagramı: mühür anındaki inanç (simülasyon)', xLabel: 'bildirilen güven', yLabel: 'gözlenen isabet', series: [{ name: 'model', points: bins.filter((b) => b.n >= 5).map((b) => [b.conf / b.n, b.hit / b.n]) }, { name: 'ideal', points: [[0.33, 0.33], [1, 1]], dashed: true }], yMax: 1 }));
  console.log(`E6 calibration: accuracy ${pct(hit, n)}%  Brier ${(brier / n).toFixed(3)}  info gain ${(Math.log2(3) - ll / n).toFixed(3)} bit  ECE ${ece.toFixed(3)}`);

  // learning: decision lead and learned onset prior over rounds, for each opener style
  const curves = [];
  for (const style of ['early', 'normal', 'late']) {
    const blocks = 8, per = 15;
    const lead = Array.from({ length: blocks }, () => /** @type {number[]} */ ([]));
    const learned = [];
    for (const seed of seeds(12, 700)) {
      const s = createSession({ seed, style, rules: 'turnuva', behaviour: 'humanLike' });
      let v = 0;
      while (v < blocks * per) {
        const x = s.playRound().result;
        if (x && x.valid) { lead[Math.floor(v / per)].push(x.timing.leadToLandingMs); v += 1; }
        if (s.results.length + s.aborted > blocks * per * 4) break;
      }
      learned.push(s.player.profile().onsetLeadFrontMs.mean);
    }
    curves.push({ style, roundsPerBlock: per, medianLeadMsByBlock: lead.map((a) => (a.length ? Math.round(quantile(a, 0.5)) : null)), learnedOnsetLeadMs: Math.round(learned.reduce((a, b) => a + b, 0) / learned.length) });
    console.log(`E6 learning ${style.padEnd(6)} median lead by block ${curves[curves.length - 1].medianLeadMsByBlock.join(', ')}  learned onset lead ${curves[curves.length - 1].learnedOnsetLeadMs} ms`);
  }
  out('E6-learning', { description: 'Median decision lead (valid rounds, blocks of 15) as the per-player onset prior is learned; prior before learning: 170 ms.', curves });
  fig('E6-learning', lineChart({ title: 'E6 — Karar önceliğinin öğrenme eğrisi, Turnuva (simülasyon)', xLabel: 'geçerli tur', yLabel: 'medyan karar önceliği (ms)', series: curves.map((c) => ({ name: c.style, points: c.medianLeadMsByBlock.map((v, i) => [(i + 0.5) * c.roundsPerBlock, v ?? 0]) })) }));
}

// ---------------------------------------------------------------- E7: ablation of the two channels
{
  const r = pool({ rules: 'turnuva', style: 'normal', fps: 30, behaviour: 'humanLike' }, 300, seeds(8, 800));
  const v = r.results.filter((x) => x.valid);
  const b = { W: v.filter((x) => x.behaviour.wouldBe === 'AI').length, T: v.filter((x) => x.behaviour.wouldBe === 'TIE').length, L: v.filter((x) => x.behaviour.wouldBe === 'PLAYER').length };
  const rows = [
    { system: 'behaviour channel only (the seal made before any movement)', n: v.length, winPct: pct(b.W, v.length), winCI: ci(b.W, v.length), tiePct: pct(b.T, v.length), lossPct: pct(b.L, v.length) },
    { system: 'behaviour + kinematics (judged seal)', n: v.length, winPct: r.winPct, winCI: r.winCI, tiePct: r.tiePct, lossPct: r.lossPct },
  ];
  out('E7-channels', { description: 'Same rounds, two decisions: the pre-movement behavioural seal versus the judged seal.', rows, heldBehaviourPct: r.heldBehaviourPct });
  console.log(`E7 behaviour-only  W ${rows[0].winPct}% T ${rows[0].tiePct}% L ${rows[0].lossPct}%   |  full  W ${rows[1].winPct}% T ${rows[1].tiePct}% L ${rows[1].lossPct}%   | behavioural seal never revised in ${r.heldBehaviourPct}% of valid rounds`);
}

// ---------------------------------------------------------------- E8: robustness to model mismatch
{
  // The synthetic player of E1-E7 opens along the detector's own minimum-jerk family, to full amplitude,
  // with independent Gaussian noise and a hand that is the exact inverse of the kinematics module. Each
  // row below breaks one of those assumptions (the last one breaks several mildly at once).
  /** @type {[string, any][]} */
  const conditions = [
    ['matched baseline (minimum-jerk, i.i.d. noise)', null],
    ['opening profile: linear', { profile: 'linear' }],
    ['opening profile: exponential (abrupt start)', { profile: 'exponential' }],
    ['opening profile: cubic ease-in (slow start)', { profile: 'cubicIn' }],
    ['finger asynchrony sd 30 ms', { asyncSdMs: 30 }],
    ['finger asynchrony sd 60 ms', { asyncSdMs: 60 }],
    ['open amplitude N(0.80, 0.10)', { openAmplitude: { mean: 0.8, sd: 0.1 } }],
    ['open amplitude N(0.65, 0.10)', { openAmplitude: { mean: 0.65, sd: 0.1 } }],
    ['slow opener (median 250 ms)', { durMedianMs: 250 }],
    ['ring/pinky delay N(100, 50) ms', { groupDelay: { mean: 100, sd: 50 } }],
    ['correlated noise, AR(1) rho 0.8', { noiseRho: 0.8 }],
    ['speed-dependent noise x(1 + 2 v/8)', { noiseSpeedGain: 2 }],
    ['speed-dependent noise x(1 + 4 v/8)', { noiseSpeedGain: 4 }],
    ['fingertip outliers in 5 % of frames (3 cm)', { outlierRate: 0.05 }],
    ['fingertip outliers in 15 % of frames (3 cm)', { outlierRate: 0.15 }],
    ['apparent hand size jitter 10 %', { palmJitterSd: 0.1 }],
    ['wrist pitch 25 deg along the stroke', { pitchDeg: 25 }],
    ['inertial finger loosening 0.25', { loosen: 0.25 }],
    ['inertial loosening 0.20, throw stroke only', { loosen: 0.2, loosenThrowOnly: true }],
    ['hand: fist 180 deg / open 45 deg', { handCalibration: { thetaFist: [85, 180, 185, 180, 175], thetaOpen: [30, 45, 42, 45, 48] } }],
    ['hand: fist 160 deg / open 60 deg', { handCalibration: { thetaFist: [80, 160, 165, 160, 155], thetaOpen: [35, 60, 58, 60, 62] } }],
    ['combined mild mismatch', { profile: 'linear', asyncSdMs: 30, openAmplitude: { mean: 0.8, sd: 0.1 }, noiseRho: 0.8, noiseSpeedGain: 2, outlierRate: 0.05 }],
  ];
  const rows = [];
  for (const [rules, fps] of /** @type {[string, number][]} */ ([['turnuva', 30], ['turnuva', 60], ['serbest', 30]])) for (const [name, perturb] of conditions) {
    const r = pool({ rules, fps, style: 'normal', throwOptions: perturb ? () => ({ perturb }) : undefined }, 150, seeds(6, 900));
    rows.push({ rules, fps, condition: name, ...strip(r) });
    console.log(`E8 ${rules.padEnd(8)} ${fps} fps ${String(name).padEnd(46)} valid: W ${r.winPct}% T ${r.tiePct}% L ${r.lossPct}% | attempts: won ${r.attemptWinPct}% foul ${r.foulOfAttemptsPct}% (P ${r.foulByMovePct[1]} S ${r.foulByMovePct[2]}; clear ${r.clearHonestFoulPct}) void ${r.voidOfAttemptsPct}% | lead ${r.leadMedianMs} ms`);
  }
  out('E8-robustness', {
    description: 'Robustness to mismatch between the synthetic player and the detector model: honest normal openers, humanLike behaviour, 6 seeds x 150 attempts per row. foulOfAttemptsPct / voidOfAttemptsPct / attemptWinPct are shares of ALL attempts; winPct / lossPct are shares of valid rounds; clearHonestFoulPct is the foul rate among ROCK throws and openings that began at least 110 ms before landing.',
    clearLeadMs: CLEAR_LEAD_MS, rows,
  });
  const t30 = rows.filter((r) => r.rules === 'turnuva' && r.fps === 30);
  fig('E8-robustness', barChart({
    title: 'E8 — Model uyumsuzluğunda sonuçsuz deneme payı, Turnuva, 30 FPS (simülasyon)', yLabel: 'tüm denemelerin yüzdesi',
    categories: t30.map((_, i) => String(i + 1)),
    series: [{ name: 'faul (dürüst hamle)', values: t30.map((r) => r.foulOfAttemptsPct ?? 0) }, { name: 'geçersiz', values: t30.map((r) => r.voidOfAttemptsPct ?? 0) }],
  }));
}

console.log(`done in ${((performance.now() - t00) / 1000).toFixed(1)} s`);
