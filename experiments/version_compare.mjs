// @ts-check
/**
 * beaTTer — the same simulated rounds on another version of the code (thesis, Section 5.1.8).
 *
 *     mkdir <dir>
 *     git archive <commit> package.json web tests | tar -x -C <dir>
 *     node experiments/version_compare.mjs <dir>           (or without <dir>: this working tree)
 *
 * Commits: 79ada3b = v4.0 (the engine of the first thesis text), 355bf07 = v4.2.0, 2ea6541 = v4.2.1,
 * b9d9481 = v4.2.2 (same engine as v4.2.1). package.json belongs in the archive: it marks the files as ES
 * modules, which Node versions before 20.19 / 22.7 do not find out by themselves.
 *
 * Prints, for the code under <dir>: (1) E3 cells with the seeds of experiments/run_all.mjs (8 seeds from
 * 300, 150 rounds each, humanLike behaviour): verdicts, fouls over all attempts, fouls on clear honest throws
 * (ROCK, or an opening that began at least 110 ms before the landing) and per thrown move; (2) staged
 * throws, 60 seeds each: an honest PAPER whose ring and little finger lag behind the other two; an on-time
 * SCISSORS and an on-time PAPER whose last in-air frame is blurred; a SCISSORS whose last two in-air
 * frames are blurred; a fist with one noisy frame; (3) a throw stroke scaled down to 3, 6 and 10 % of its
 * amplitude: soft landings, fouls, and the dating of the soft landing. Everything is SIMULATED.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(process.argv[2] ?? here).split('\\').join('/').replace(/\/$/, '') + '/';
const imp = (/** @type {string} */ p) => import(pathToFileURL(root + p).href);
const { createSession } = await imp('web/js/sim/session.js');
const { genFrames, strokePlan, fingerPlan, freshEngine, feed, FIST } = await imp('tests/helpers/frames.js');
const { makeRng } = await imp('web/js/core/rng.js');
const { createPlayerModel } = await imp('web/js/core/player_model.js');

const CLEAR_LEAD_MS = 110;
const pct = (/** @type {number} */ k, /** @type {number} */ n) => (n ? +(100 * k / n).toFixed(2) : null);
const resultOf = (/** @type {any[]} */ events) => { const e = events.find((x) => x.type === 'result'); return e ? e.result : null; };

/** One E3 cell, pooled as in run_all.mjs. @param {any} o */
function cell(o) {
  let attempts = 0;
  /** @type {any[]} */ const all = [];
  const clear = { n: 0, foul: 0 };
  const byMove = [0, 1, 2].map(() => ({ n: 0, foul: 0 }));
  for (let seed = 300; seed < 308; seed++) {
    const s = createSession({ behaviour: 'humanLike', ...o, seed });
    for (let i = 0; i < 150; i++) {
      const x = s.playRound(); attempts += 1;
      const honest = x.truth && x.truth.move !== null && !x.truth.feint && !x.truth.late && !x.truth.noFist;
      if (!honest) continue;
      const foul = !!x.result && x.result.verdict === 'FOUL_LATE';
      byMove[x.intended].n += 1; if (foul) byMove[x.intended].foul += 1;
      if (x.intended === 0 || x.truth.leadMs >= CLEAR_LEAD_MS) { clear.n += 1; if (foul) clear.foul += 1; }
    }
    all.push(...s.results);
  }
  const c = (/** @type {string} */ k) => all.filter((r) => r.verdict === k).length;
  return {
    attempts, valid: all.filter((r) => r.valid).length, W: c('AI'), T: c('TIE'), L: c('PLAYER'),
    foulOfAttemptsPct: pct(c('FOUL_LATE'), attempts), clearHonestFoulPct: pct(clear.foul, clear.n),
    foulPctPaper: pct(byMove[1].foul, byMove[1].n), foulPctScissors: pct(byMove[2].foul, byMove[2].n),
  };
}

const freshPlayer = () => { const p = createPlayerModel(); p.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 }); return p; };

/** Staged: index and middle finger open 260 ms before the landing, ring and little finger start 170 ms before it. */
function laggingPaper(/** @type {number} */ fps, /** @type {string} */ rules) {
  /** @type {Record<string, number>} */ const tally = {};
  for (let seed = 1; seed <= 60; seed++) {
    const plan = strokePlan({ t0: 1000, beats: 4 });
    const L = plan.tLanding;
    const front = { t0: L - 260, dur: 200, to: 0.95 }, back = { t0: L - 170, dur: 260, to: 0.95 };
    const frames = genFrames({ rng: makeRng(500 + seed), fps, t0: 1000, tEnd: L + 800, yPL: plan.yPL, ext: fingerPlan(FIST, [[], [front], [front], [back], [back]]) });
    const res = resultOf(feed(freshEngine(seed, { rules }, freshPlayer()).engine, frames));
    const k = res ? res.verdict : 'none';
    tally[k] = (tally[k] ?? 0) + 1;
  }
  return tally;
}

/**
 * Two-pass staging, as in tests/engine_regressions.test.js: find the engine's landing frame on clean frames,
 * then alter single frames before it (`alter` gets the time of the frame `back` frames before the landing).
 * Tally of verdicts; a void is listed under its explanation code.
 * @param {number} fps @param {number} seedBase @param {(L:number) => ((t:number) => number[])} shape
 * @param {(tAt:(back:number) => number|null, ext:(t:number) => number[]) => ((t:number) => number[])} alter
 */
function staged(fps, seedBase, shape, alter) {
  /** @type {Record<string, number>} */ const tally = {};
  for (let seed = 1; seed <= 60; seed++) {
    const plan = strokePlan({ t0: 1000, beats: 4 });
    const ext = shape(plan.tLanding);
    const mk = (/** @type {(t:number) => number[]} */ e) => genFrames({ rng: makeRng(seedBase + seed), fps, t0: 1000, tEnd: plan.tLanding + 800, yPL: plan.yPL, ext: e });
    const clean = mk(ext);
    const res0 = resultOf(feed(freshEngine(seed, { rules: 'turnuva' }, freshPlayer()).engine, clean));
    if (!res0) { tally.unstaged = (tally.unstaged ?? 0) + 1; continue; }
    const tAt = (/** @type {number} */ back) => { const f = clean.find((x) => x.index === res0.landingFrame - back); return f && f.present ? f.t : null; };
    const res = resultOf(feed(freshEngine(seed, { rules: 'turnuva' }, freshPlayer()).engine, mk(alter(tAt, ext))));
    const k = !res ? 'none' : res.valid || res.verdict === 'FOUL_LATE' ? res.verdict : (res.explanation && res.explanation.code) || res.verdict;
    tally[k] = (tally[k] ?? 0) + 1;
  }
  return tally;
}
const at = (/** @type {number} */ t, /** @type {number|null} */ x) => x !== null && Math.abs(t - x) < 1;
const fistShape = () => fingerPlan(FIST, []);
const scissorsShape = (/** @type {number} */ L) => fingerPlan(FIST, [[], [{ t0: L - 240, dur: 260, to: 0.95 }], [{ t0: L - 240, dur: 260, to: 0.95 }], [], []]);
const paperShape = (/** @type {number} */ L) => fingerPlan(FIST, [[], [{ t0: L - 240, dur: 260, to: 0.95 }], [{ t0: L - 240, dur: 260, to: 0.95 }], [{ t0: L - 225, dur: 260, to: 0.95 }], [{ t0: L - 225, dur: 260, to: 0.95 }]]);
const FRONT_BLURRED = [FIST[0], 0.05, 0.05, FIST[3], FIST[4]], ALL_BLURRED = [FIST[0], 0.05, 0.05, 0.05, 0.05];

/**
 * A throw stroke scaled down to `scale` of its amplitude (20 fps, 12 seeds x 40 rounds, normal openers):
 * how many soft landings, fouls and losses, and where the soft landing is dated against the true one.
 */
function gentleThrow(/** @type {number} */ scale) {
  const q = (/** @type {number[]} */ a, /** @type {number} */ p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
  /** @type {Record<string, number>} */ const tally = {};
  /** @type {number[]} */ const dt = [];
  for (let seed = 1; seed <= 12; seed++) {
    const s = createSession({ behaviour: 'humanLike', rules: 'turnuva', style: 'normal', fps: 20, seed, throwOptions: () => ({ throwAmplitudeScale: scale }) });
    for (let i = 0; i < 40; i++) {
      const x = s.playRound();
      const r = x.result;
      const k = r ? `${r.landingSource}:${r.verdict}` : 'aborted';
      tally[k] = (tally[k] ?? 0) + 1;
      if (r && r.landingSource === 'soft' && x.truth && Number.isFinite(x.truth.tLanding)) dt.push(r.timing.tLanding - x.truth.tLanding);
    }
  }
  return { tally, softLandingMinusTrueMs: { n: dt.length, q10: q(dt, 0.1), median: q(dt, 0.5), q90: q(dt, 0.9) } };
}

console.log(`code under ${root}  (SIMULATION)`);
for (const [rules, style, fps] of /** @type {const} */ ([['turnuva', 'normal', 30], ['turnuva', 'normal', 60], ['turnuva', 'early', 30], ['turnuva', 'late', 30], ['serbest', 'normal', 30]])) {
  console.log(`E3 ${rules} ${style} ${fps} fps`, JSON.stringify(cell({ rules, style, fps })));
}
for (const [fps, rules] of /** @type {const} */ ([[30, 'turnuva'], [20, 'turnuva'], [30, 'serbest']])) console.log(`staged lagging-back PAPER, ${rules} ${fps} fps`, JSON.stringify(laggingPaper(fps, rules)));
// one blurred frame right before the landing (index and middle read almost closed) on an on-time SCISSORS
console.log('staged blurred last frame SCISSORS, turnuva 20 fps', JSON.stringify(staged(20, 700, scissorsShape, (tAt, e) => (t) => (at(t, tAt(1)) ? FRONT_BLURRED : e(t)))));
// ... and on an on-time PAPER (all four fingers read closed on the last in-air frame)
for (const fps of [30, 20]) console.log(`staged blurred last frame PAPER, turnuva ${fps} fps`, JSON.stringify(staged(fps, 700, paperShape, (tAt, e) => (t) => (at(t, tAt(1)) ? ALL_BLURRED : e(t)))));
// the last TWO in-air frames of an on-time SCISSORS blurred
console.log('staged two blurred frames SCISSORS, turnuva 30 fps', JSON.stringify(staged(30, 900, scissorsShape, (tAt, e) => (t) => (at(t, tAt(1)) || at(t, tAt(2)) ? FRONT_BLURRED : e(t)))));
// a fist; two frames before the landing index and middle read 0.45 on one noisy frame
console.log('staged noisy frame on a FIST, turnuva 20 fps', JSON.stringify(staged(20, 900, fistShape, (tAt, e) => (t) => (at(t, tAt(2)) ? [FIST[0], 0.45, 0.45, FIST[3], FIST[4]] : e(t)))));
for (const scale of [0.03, 0.06, 0.1]) console.log(`gentle throw stroke (x${scale}), turnuva 20 fps`, JSON.stringify(gentleThrow(scale)));
