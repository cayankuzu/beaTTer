// @ts-check
/**
 * beaTTer v4 — fusion of the two channels and the risk-sensitive decision (pure).
 *
 *   belief  ∝  prior(behaviour)^wPrior · likelihood(kinematics)^wKin        (log-linear pool)
 *
 * and the choice of the AI's move from the part of the belief that would be LEGAL if the flight ended at
 * this frame (the referee binds the throw to the in-air headings, see round_engine.js).
 *
 * Structural fact used by the `noLoss` policy: whenever the referee would still accept at most two of
 * the three throws, the move that beats one of them and ties the other cannot lose. So the AI never
 * needs to identify the throw exactly — it only needs the in-air evidence to exclude one class. Which
 * throws are excluded is the REFEREE's reading (foulNow), not a threshold on the AI's own belief.
 */

import { ROCK, PAPER, SCISSORS, beats, losesTo } from './constants.js';

/** @typedef {import('./opening.js').OpeningEvidence} OpeningEvidence */
/** @typedef {import('./constants.js').RulePreset} RulePreset */

/**
 * @typedef {Object} Belief
 * @property {number[]} pLegal  P(final throw = y AND the throw is legal), y = ROCK, PAPER, SCISSORS
 * @property {number} pLate     P(late throw: the opening starts too late to be legal)
 * @property {number[]} post    pLegal normalised: P(y | legal)
 * @property {number[]} kinLik  kinematic likelihood of the three legal classes, normalised to sum 1
 */

/**
 * @typedef {Object} Choice
 * @property {number} action
 * @property {{pWin:number, pLoss:number, pTie:number, eu:number, safe:boolean}[]} stats  per action, in mass units;
 *           safe = the throw that beats this action is not legal
 * @property {number} pWin @property {number} pTie @property {number} pLoss  of the chosen action
 * @property {number} total  total legal mass M
 */

export const DEFAULTS = Object.freeze({
  /** Revise when EU(new) - EU(current) >= reviseMargin * M (risk-sensitive policy). */
  reviseMargin: 0.25,
  /** ... or when P(loss | current) >= reviseLossProb * M. */
  reviseLossProb: 0.30,
  /** noLoss policy: loss probabilities closer than this (times M) count as equal. */
  lossTolerance: 1e-3,
  /** noLoss policy: with equal loss, revise when P(win) improves by this much (times M). */
  winGain: 0.25,
  /** Online learning of the fusion weights. */
  fusionRate: 0.05,
  fusionMin: 0.25,
  fusionMax: 2.5,
  /** Per-round gradient of the fusion weights is clipped to +- this (nats). */
  fusionGradClip: 2,
  /** Probability floor inside logarithms. */
  probFloor: 1e-6,
});

/** Deterministic tie-break order of actions. */
const ORDER = [PAPER, SCISSORS, ROCK];
const rank = (/** @type {number} */ a) => ORDER.indexOf(a);

/** @param {number[]} v */
function lse(v) {
  let m = -Infinity;
  for (const x of v) if (x > m) m = x;
  if (m === -Infinity) return -Infinity;
  let s = 0;
  for (const x of v) s += Math.exp(x - m);
  return m + Math.log(s);
}

/** @param {number[]} p */
function normalised(p) {
  const s = p[0] + p[1] + p[2];
  return s > 0 && Number.isFinite(s) ? [p[0] / s, p[1] / s, p[2] / s] : [1 / 3, 1 / 3, 1 / 3];
}

/**
 * Fuse the behavioural prior with the evidence of the two finger-group detectors.
 * @param {{prior:number[], F:OpeningEvidence|null, Bstay:OpeningEvidence|null, Bopen:OpeningEvidence|null, wPrior?:number, wKin?:number}} input
 *   F: front group (index+middle); Bstay / Bopen: back group (ring+pinky) evaluated under the "stays"
 *   prior and under the PAPER-coupled onset prior.
 * @returns {Belief}
 */
export function fuse({ prior, F, Bstay, Bopen, wPrior = 1, wKin = 1 }) {
  const pr = normalised(prior);
  if (!F || !Bstay || !Bopen) return { pLegal: pr.slice(), pLate: 0, post: pr.slice(), kinLik: [1 / 3, 1 / 3, 1 / 3] };
  const lp = pr.map((p) => wPrior * Math.log(Math.max(p, DEFAULTS.probFloor)));
  const lR = F.logStay + Bstay.logStay;
  const lS = F.logOpenLegal + Bstay.logStay;
  const lP = F.logOpenLegal + Bopen.logOpenLegal;
  const lateS = F.logOpenLate + Bstay.logStay;
  const lateP = lse([F.logOpenLate + Bopen.logOpenLegal, F.logOpenLate + Bopen.logOpenLate, F.logOpenLegal + Bopen.logOpenLate]);
  const joint = [lp[ROCK] + wKin * lR, lp[PAPER] + wKin * lP, lp[SCISSORS] + wKin * lS, lp[PAPER] + wKin * lateP, lp[SCISSORS] + wKin * lateS];
  const z = lse(joint);
  if (z === -Infinity) return { pLegal: pr.slice(), pLate: 0, post: pr.slice(), kinLik: [1 / 3, 1 / 3, 1 / 3] };
  const p = joint.map((v) => Math.exp(v - z));
  const pLegal = [p[0], p[1], p[2]];
  const zk = lse([lR, lP, lS]);
  const kinLik = zk === -Infinity ? [1 / 3, 1 / 3, 1 / 3] : [Math.exp(lR - zk), Math.exp(lP - zk), Math.exp(lS - zk)];
  return { pLegal, pLate: p[3] + p[4], post: normalised(pLegal), kinLik };
}

/**
 * Which final throws would be a foul if the flight ended at this frame — exactly the referee's rule.
 * @param {number} hF front heading, P(index/middle measurably open by now)
 * @param {number} hB back heading
 * @param {{epsF:number, epsB:number}} rules
 * @returns {boolean[]} [ROCK, PAPER, SCISSORS]
 */
export function foulNow(hF, hB, rules) {
  const frontOpen = hF > 1 - rules.epsF, frontClosed = hF < rules.epsF;
  const backOpen = hB > 1 - rules.epsB, backClosed = hB < rules.epsB;
  return [frontOpen || backOpen, frontClosed || backClosed, frontClosed || backOpen];
}

/**
 * Legal mass: the belief restricted to throws the referee would accept right now.
 * @param {Belief} belief @param {number} hF @param {number} hB @param {{epsF:number, epsB:number}} rules
 * @returns {{mass:number[], foul:boolean[], legal:boolean[], restricted:boolean}}
 *   legal: throws the referee would accept now (all true when every throw would be a foul: then no
 *   outcome can be a loss and the belief alone decides)
 */
export function legalMassFor(belief, hF, hB, rules) {
  const foul = foulNow(hF, hB, rules);
  const legal = foul.every(Boolean) ? [true, true, true] : foul.map((f) => !f);
  if (foul.every(Boolean)) return { mass: belief.pLegal.slice(), foul, legal, restricted: false };
  const mass = belief.pLegal.map((p, y) => (foul[y] ? 0 : p));
  if (mass[0] + mass[1] + mass[2] <= 1e-12) {
    // The AI's own belief puts (numerically) nothing on the throws the referee still accepts - e.g. a
    // sharply trained onset prior meets an unusually late opening. The referee's support wins: decide
    // on the legal set with equal weights rather than on a belief about throws that are already fouls.
    const n = legal.filter(Boolean).length;
    return { mass: legal.map((ok) => (ok ? 1 / n : 0)), foul, legal, restricted: true };
  }
  return { mass, foul, legal, restricted: true };
}

/**
 * Choose the AI's move.
 *  noLoss = false: maximise EU_mu(a) = P(win) - mu * P(loss)                    (risk-sensitive)
 *  noLoss = true : prefer a SAFE move - one that cannot lose to any throw the referee would still
 *                  accept - and among safe moves maximise P(win). Safety is decided by the referee's
 *                  legal set (`legal`), never by how small the AI believes a probability to be: a legal
 *                  throw the AI considers nearly impossible is still a throw it must not lose to.
 *                  Without a safe move (all three throws legal) minimise P(loss), then maximise P(win).
 * Ties are broken by the fixed order PAPER, SCISSORS, ROCK.
 * @param {number[]} mass legal mass per class [ROCK, PAPER, SCISSORS]
 * @param {{lossAversion:number, noLoss:boolean}} policy
 * @param {boolean[]} [legal] which throws the referee would accept right now (default: all)
 * @returns {Choice}
 */
export function chooseAction(mass, policy, legal = [true, true, true]) {
  const total = mass[0] + mass[1] + mass[2];
  const mu = policy.lossAversion;
  const stats = [ROCK, PAPER, SCISSORS].map((a) => {
    const pWin = mass[losesTo(/** @type {0|1|2} */ (a))];
    const pLoss = mass[beats(/** @type {0|1|2} */ (a))];
    return { pWin, pLoss, pTie: mass[a], eu: pWin - mu * pLoss, safe: !legal[beats(/** @type {0|1|2} */ (a))] };
  });
  const tol = DEFAULTS.lossTolerance * (total > 0 ? total : 1);
  const anySafe = policy.noLoss && stats.some((x) => x.safe);
  let best = -1;
  for (const a of ORDER) {
    const x = stats[a];
    if (anySafe && !x.safe) continue;
    if (best < 0) { best = a; continue; }
    const b = stats[best];
    let better;
    if (anySafe) better = x.pWin > b.pWin + 1e-12;
    else if (policy.noLoss) better = x.pLoss < b.pLoss - tol || (Math.abs(x.pLoss - b.pLoss) <= tol && x.pWin > b.pWin + 1e-12);
    else better = x.eu > b.eu + 1e-12 || (Math.abs(x.eu - b.eu) <= 1e-12 && x.pLoss < b.pLoss - 1e-12);
    if (better) best = a;
  }
  const s = stats[best];
  return { action: best, stats, pWin: s.pWin, pTie: s.pTie, pLoss: s.pLoss, total };
}

/**
 * Should the standing commitment `current` be replaced by `choice.action`?
 * @param {number} current @param {Choice} choice @param {{lossAversion:number, noLoss:boolean}} policy
 */
export function shouldRevise(current, choice, policy) {
  if (choice.action === current) return false;
  const M = choice.total > 0 ? choice.total : 1;
  const cur = choice.stats[current], nu = choice.stats[choice.action];
  if (policy.noLoss) {
    if (nu.safe && !cur.safe) return true;                                      // from "can lose" to "cannot lose": always
    if (nu.safe && cur.safe) return nu.pWin - cur.pWin >= DEFAULTS.winGain * M; // both safe: only for a clear gain
    const tol = DEFAULTS.lossTolerance * M;
    if (cur.pLoss > nu.pLoss + tol) return true;
    return Math.abs(cur.pLoss - nu.pLoss) <= tol && nu.pWin - cur.pWin >= DEFAULTS.winGain * M;
  }
  return nu.eu - cur.eu >= DEFAULTS.reviseMargin * M || cur.pLoss >= DEFAULTS.reviseLossProb * M;
}

/**
 * Best response to a distribution over the player's move (expected payoff with win = +1, loss = -1).
 * @param {number[]} p @returns {number}
 */
export function bestResponse(p) {
  let best = ORDER[0], bestV = -Infinity;
  for (const a of ORDER) {
    const v = p[losesTo(/** @type {0|1|2} */ (a))] - p[beats(/** @type {0|1|2} */ (a))];
    if (v > bestV + 1e-12) { bestV = v; best = a; }
  }
  return best;
}

/**
 * One online gradient step on the log-loss of the log-linear pool p ∝ prior^wPrior · kinLik^wKin.
 * d(-ln p_y)/dw = -(ln q_y - E_p[ln q]) for q = prior or kinLik.
 * @param {{wPrior:number, wKin:number}} w
 * @param {{prior:number[], kinLik:number[], yTrue:number}} obs
 * @param {{rate?:number, min?:number, max?:number, gradClip?:number}} [opts]
 * @returns {{wPrior:number, wKin:number}}
 */
export function learnFusionWeights(w, { prior, kinLik, yTrue }, opts = {}) {
  const rate = opts.rate ?? DEFAULTS.fusionRate, lo = opts.min ?? DEFAULTS.fusionMin, hi = opts.max ?? DEFAULTS.fusionMax;
  if (!(yTrue === ROCK || yTrue === PAPER || yTrue === SCISSORS)) return { ...w };
  const lq = prior.map((p) => Math.log(Math.max(p, DEFAULTS.probFloor)));
  const lk = kinLik.map((p) => Math.log(Math.max(p, DEFAULTS.probFloor)));
  const joint = [0, 1, 2].map((i) => w.wPrior * lq[i] + w.wKin * lk[i]);
  const z = lse(joint);
  const p = joint.map((v) => Math.exp(v - z));
  const eq = p[0] * lq[0] + p[1] * lq[1] + p[2] * lq[2];
  const ek = p[0] * lk[0] + p[1] * lk[1] + p[2] * lk[2];
  const clamp = (/** @type {number} */ x) => Math.min(hi, Math.max(lo, x));
  // The log-loss gradient is unbounded below (a confident miss) but bounded by ~0 above (a confident
  // hit), so one bad round would outweigh hundreds of good ones. Clip it to +-gradClip.
  const g = opts.gradClip ?? DEFAULTS.fusionGradClip;
  const clip = (/** @type {number} */ x) => Math.min(g, Math.max(-g, x));
  return { wPrior: clamp(w.wPrior + rate * clip(lq[yTrue] - eq)), wKin: clamp(w.wKin + rate * clip(lk[yTrue] - ek)) };
}
