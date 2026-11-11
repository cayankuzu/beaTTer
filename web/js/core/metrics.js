// @ts-check
/**
 * beaTTer v4 — honest evaluation, updated after every judged round (pure).
 *
 * Everything here is counted or computed from round results; nothing is smoothed into a "nice" number and
 * every statistic carries its n. Learning statistics use VALID rounds only; fouls and voids are tallied
 * separately (honesty invariant I6).
 *
 * Two families of rates are reported, because they answer different questions:
 *
 *   conditional (on VALID rounds)   winRate, lossRate, tieRate, unbeaten, pValueVsChance.
 *       A round is valid only if the referee accepted the throw, and under the `turnuva` preset the
 *       referee and the AI read the same in-air frames. A would-be AI loss therefore shows up as a foul
 *       or a void, not as a loss: these numbers describe the RULE, not the quality of the prediction.
 *   unconditional (on ALL attempts) attemptWinRate, noResultRate, foulRate, voidRate.
 *       Share of judged attempts the AI actually won, and share that produced no valid round. This is
 *       where every weakness of the detector lands, so it is the number to judge the system by.
 *
 *  - rates with Wilson score intervals                         [Wilson1927]
 *  - exact binomial test of H0: P(AI wins | valid) <= 1/3
 *  - top-1 accuracy, multi-class Brier score                   [Brier1950]
 *  - mean log-loss in bits and information gain over chance    [Shannon1948]
 *  - reliability table and expected calibration error          [Naeini2015; Guo2017]
 *  - lead-time statistics (decision time before landing / before the shape was complete)
 */

import { wilsonInterval, binomTailGE, quantile } from './math.js';

const CAP = 400;
const BINS = 10;
const LOG2_3 = Math.log2(3);
const VOIDS = ['VOID_NO_HAND', 'VOID_UNKNOWN', 'VOID_NO_FIST'];

/** @param {number[]} a @param {number} v */
const pushCapped = (a, v) => { a.push(v); if (a.length > CAP) a.shift(); };
/** @param {number[]} a */
const stats = (a) => (a.length ? { n: a.length, median: quantile(a, 0.5), q1: quantile(a, 0.25), q3: quantile(a, 0.75), mean: a.reduce((s, v) => s + v, 0) / a.length } : { n: 0, median: null, q1: null, q3: null, mean: null });
/** @param {number} k @param {number} n */
const rate = (k, n) => (n > 0 ? { k, n, p: k / n, ...wilsonInterval(k, n) } : { k, n, p: null, lo: null, hi: null });
const isCount = (/** @type {unknown} */ x) => typeof x === 'number' && Number.isInteger(x) && x >= 0;
const isNum = (/** @type {unknown} */ x) => typeof x === 'number' && Number.isFinite(x);

export function createMetrics() {
  let s = fresh();

  function fresh() {
    return {
      v: 4,
      valid: 0, ai: 0, player: 0, tie: 0, fouls: 0,
      voids: /** @type {Record<string, number>} */ ({ VOID_NO_HAND: 0, VOID_UNKNOWN: 0, VOID_NO_FIST: 0 }),
      behaviour: { ai: 0, player: 0, tie: 0 },
      held: 0,                 // valid rounds whose behavioural commit was never revised
      predN: 0, top1: 0, brier: 0, logloss: 0,
      bins: Array.from({ length: BINS }, () => ({ n: 0, conf: 0, hit: 0 })),
      leadLanding: /** @type {number[]} */ ([]),
      leadKinematic: /** @type {number[]} */ ([]),
      leadCompletion: /** @type {number[]} */ ([]),
      progress: /** @type {number[]} */ ([]),
      curve: /** @type {{c:number|null, l:number|null, p:number|null, ll:number|null, w:number}[]} */ ([]),
    };
  }

  /**
   * @param {any} r RoundResult (see round_engine.js)
   */
  const record = (r) => {
    if (!r || typeof r.verdict !== 'string') return;
    if (r.verdict === 'FOUL_LATE') { s.fouls += 1; return; }
    if (VOIDS.includes(r.verdict)) { s.voids[r.verdict] += 1; return; }
    if (!r.valid || !(r.playerMove === 0 || r.playerMove === 1 || r.playerMove === 2)) return;
    s.valid += 1;
    if (r.verdict === 'AI') s.ai += 1; else if (r.verdict === 'PLAYER') s.player += 1; else s.tie += 1;
    const wb = r.behaviour?.wouldBe;
    if (wb === 'AI') s.behaviour.ai += 1; else if (wb === 'PLAYER') s.behaviour.player += 1; else if (wb === 'TIE') s.behaviour.tie += 1;
    const commits = Array.isArray(r.commits) ? r.commits : [];
    const kinematicCommits = commits.filter((/** @type {any} */ c) => c.reason !== 'BEHAVIOUR' && !c.postLanding).length;
    if (kinematicCommits === 0) s.held += 1;

    const post = r.beliefAtFinalCommit?.post;
    /** @type {number|null} */ let ll = null;
    /** @type {number|null} */ let correct = null;
    if (Array.isArray(post) && post.length === 3 && post.every((/** @type {number} */ v) => Number.isFinite(v))) {
      const y = r.playerMove;
      let best = 0;
      for (let i = 1; i < 3; i++) if (post[i] > post[best]) best = i;
      correct = best === y ? 1 : 0;
      let b = 0;
      for (let i = 0; i < 3; i++) b += (post[i] - (i === y ? 1 : 0)) ** 2;
      ll = -Math.log2(Math.max(post[y], 1e-6));
      s.predN += 1; s.top1 += correct; s.brier += b; s.logloss += ll;
      const bin = Math.min(BINS - 1, Math.floor(post[best] * BINS));
      s.bins[bin].n += 1; s.bins[bin].conf += post[best]; s.bins[bin].hit += correct;
    }
    const lead = r.timing?.leadToLandingMs;
    if (Number.isFinite(lead)) pushCapped(s.leadLanding, lead);
    // the lead of a commitment that came from watching the hand (not the one sealed before the flight)
    const judged = commits.find((/** @type {any} */ c) => c.seq === r.judgedSeq);
    if (judged && judged.reason !== 'BEHAVIOUR' && Number.isFinite(lead)) pushCapped(s.leadKinematic, lead);
    const leadC = r.timing?.leadToCompletionMs;
    if (Number.isFinite(leadC)) pushCapped(s.leadCompletion, leadC);
    if (Number.isFinite(r.progressAtCommit)) pushCapped(s.progress, r.progressAtCommit);
    s.curve.push({ c: correct, l: Number.isFinite(lead) ? lead : null, p: Number.isFinite(r.progressAtCommit) ? r.progressAtCommit : null, ll, w: r.verdict === 'AI' ? 1 : r.verdict === 'PLAYER' ? -1 : 0 });
    if (s.curve.length > CAP) s.curve.shift();
  };

  const summary = () => {
    const n = s.valid;
    const voids = VOIDS.reduce((a, k) => a + s.voids[k], 0);
    const judged = n + s.fouls + voids;
    let ece = null;
    if (s.predN > 0) { ece = 0; for (const b of s.bins) if (b.n > 0) ece += (b.n / s.predN) * Math.abs(b.hit / b.n - b.conf / b.n); }
    const logloss = s.predN > 0 ? s.logloss / s.predN : null;
    const loss = rate(s.player, n);
    return {
      rounds: { judged, valid: n, fouls: s.fouls, voids: { ...s.voids } },
      outcome: { ai: s.ai, tie: s.tie, player: s.player },
      // ---- conditional on valid rounds
      winRate: rate(s.ai, n),
      lossRate: loss,
      tieRate: rate(s.tie, n),
      /** "unbeaten" = 1 - loss rate among valid rounds, with its interval */
      unbeaten: n > 0 ? { p: 1 - s.player / n, lo: 1 - /** @type {number} */ (loss.hi), hi: 1 - /** @type {number} */ (loss.lo), n } : { p: null, lo: null, hi: null, n: 0 },
      /** exact one-sided binomial test of H0: P(AI win | valid) <= 1/3 */
      pValueVsChance: n > 0 ? binomTailGE(s.ai, n, 1 / 3) : null,
      // ---- unconditional: over every judged attempt
      attemptWinRate: rate(s.ai, judged),
      noResultRate: rate(s.fouls + voids, judged),
      voidRate: rate(voids, judged),
      foulRate: rate(s.fouls, n + s.fouls),
      behaviourOnly: { ...s.behaviour, n: s.behaviour.ai + s.behaviour.player + s.behaviour.tie, winRate: rate(s.behaviour.ai, s.behaviour.ai + s.behaviour.player + s.behaviour.tie) },
      heldBehaviourShare: rate(s.held, n),
      prediction: {
        n: s.predN,
        accuracy: rate(s.top1, s.predN),
        brier: s.predN > 0 ? s.brier / s.predN : null,
        loglossBits: logloss,
        infoGainBits: logloss === null ? null : LOG2_3 - logloss,
        ece,
        reliability: s.bins.map((b, i) => ({ lo: i / BINS, hi: (i + 1) / BINS, n: b.n, confidence: b.n ? b.conf / b.n : null, accuracy: b.n ? b.hit / b.n : null })),
      },
      leadToLandingMs: { ...stats(s.leadLanding), values: s.leadLanding.slice() },
      /** lead of judged commitments that were made from the hand's motion (behavioural holds excluded) */
      kinematicLeadMs: stats(s.leadKinematic),
      leadToCompletionMs: stats(s.leadCompletion),
      progressAtCommit: stats(s.progress),
      curve: s.curve.slice(),
    };
  };

  const toJSON = () => JSON.parse(JSON.stringify(s));

  /**
   * Restore counters. The document is accepted only if every counter is a consistent non-negative
   * integer; anything else (hand-edited, truncated, merged) is rejected and the metrics stay fresh.
   * @param {any} o
   */
  const load = (o) => {
    if (!o || typeof o !== 'object' || o.v !== 4) return false;
    try {
      const f = fresh();
      const d = JSON.parse(JSON.stringify(o));
      for (const k of ['valid', 'ai', 'player', 'tie', 'fouls', 'held', 'predN', 'top1']) if (!isCount(d[k])) return false;
      if (d.ai + d.player + d.tie !== d.valid || d.held > d.valid || d.predN > d.valid || d.top1 > d.predN) return false;
      if (!isNum(d.brier) || !isNum(d.logloss) || d.brier < 0 || d.logloss < 0) return false;
      const voids = { ...f.voids };
      if (d.voids !== undefined) {
        if (!d.voids || typeof d.voids !== 'object') return false;
        for (const k of VOIDS) { if (d.voids[k] !== undefined) { if (!isCount(d.voids[k])) return false; voids[k] = d.voids[k]; } }
      }
      const behaviour = { ...f.behaviour };
      if (d.behaviour !== undefined) {
        if (!d.behaviour || typeof d.behaviour !== 'object') return false;
        for (const k of /** @type {const} */ (['ai', 'player', 'tie'])) { if (d.behaviour[k] !== undefined) { if (!isCount(d.behaviour[k])) return false; behaviour[k] = d.behaviour[k]; } }
        if (behaviour.ai + behaviour.player + behaviour.tie > d.valid) return false;
      }
      if (!Array.isArray(d.bins) || d.bins.length !== BINS) return false;
      let binN = 0;
      for (const b of d.bins) {
        if (!b || !isCount(b.n) || !isNum(b.conf) || !isCount(b.hit) || b.hit > b.n || b.conf < 0 || b.conf > b.n + 1e-9) return false;
        binN += b.n;
      }
      if (binN !== d.predN) return false;
      const nums = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter(isNum).slice(-CAP) : []);
      const curve = Array.isArray(d.curve)
        ? d.curve.filter((/** @type {any} */ x) => x && (x.w === 1 || x.w === 0 || x.w === -1)).slice(-CAP).map((/** @type {any} */ x) => ({
          c: x.c === 1 || x.c === 0 ? x.c : null, l: isNum(x.l) ? x.l : null, p: isNum(x.p) ? x.p : null, ll: isNum(x.ll) ? x.ll : null, w: x.w,
        }))
        : [];
      s = {
        v: 4, valid: d.valid, ai: d.ai, player: d.player, tie: d.tie, fouls: d.fouls, voids, behaviour, held: d.held,
        predN: d.predN, top1: d.top1, brier: d.brier, logloss: d.logloss,
        bins: d.bins.map((/** @type {any} */ b) => ({ n: b.n, conf: b.conf, hit: b.hit })),
        leadLanding: nums(d.leadLanding), leadKinematic: nums(d.leadKinematic), leadCompletion: nums(d.leadCompletion), progress: nums(d.progress),
        curve,
      };
      return true;
    } catch { return false; }
  };

  const reset = () => { s = fresh(); };

  return { record, summary, toJSON, load, reset };
}
