// @ts-check
/**
 * beaTTer v4 — round engine and referee (pure). The honesty invariants live here.
 *
 *   IDLE -> PRIMING (beats 1..primeBeats) -> FLIGHT -> SETTLING -> RESOLVED -> (acknowledge) -> IDLE
 *   (single-stroke mode: IDLE -> ARMED -> FLIGHT -> ...)
 *
 * I1  The AI's judged commitment is the last one made on a frame BEFORE the landing frame. "Before" is
 *     decided by FRAME ORDER alone - frame indices are integers and strictly increasing, so the test is
 *     exact; time stamps are never compared for it (a sealed time is rounded to 0.1 ms, a frame time is
 *     not, and mixing the two once let a pre-landing seal be discarded). commit() throws outside
 *     ARMED/FLIGHT; commitments made on or after the (possibly retroactive) landing frame are kept in
 *     the audit log, flagged `postLanding`, and never judged. A tracked frame that follows a tracking
 *     gap and already shows the hand at its landing height is the landing frame: what happened inside
 *     the gap is unknown, so nothing after it counts as in-air.
 * I2  Every commitment is a SHA-256 hash published at once; the move stays secret until reveal.
 * I3  All commitments and revisions of a round are kept in order, opened and verified at reveal — also
 *     when the round is aborted.
 * I4  Every number in a RoundResult is measured; unknown values are null.
 * I5  The referee (fouls / voids) reads only pre-landing headings under a fixed prior and the settled
 *     shape — never the AI's commitment. Without fresh in-air evidence OF THE THROW (a tracked frame
 *     shortly before landing on which the AI was free to revise) the round is void, never a foul.
 * I6  Everything about the game is learned only from valid rounds (verdict AI / PLAYER / TIE). Sensor
 *     calibration alone may also adapt on VOID_NO_FIST / VOID_UNKNOWN rounds (player_model.learnPosture).
 */

import { ROCK, PAPER, SCISSORS, RULES, DEFAULT_RULE, payoff } from './constants.js';
import { frameFeatures, openingFromBaseline } from './kinematics.js';
import { createStrokeTracker, predictLanding } from './stroke.js';
import { createOpeningDetector, measureOpening } from './opening.js';
import { fuse, legalMassFor, chooseAction, shouldRevise, foulNow } from './decision.js';
import { createPoseClassifier, decideFinal, completionTime } from './pose.js';
import { Kalman1D } from './filters.js';
import { median } from './math.js';

/** @typedef {import('./constants.js').HandFrame} HandFrame */
/** @typedef {import('./constants.js').PublicCommit} PublicCommit */

export const DEFAULTS = Object.freeze({
  /** Fist pumps before the throw stroke: 3 ("taş-kağıt-makas-VUR"), 2, or 0 (single stroke). */
  primeBeats: 3,
  /** Referee preset name (constants.RULES). */
  rules: DEFAULT_RULE,
  /** Time allowed after landing for the shape to settle (ms). */
  settleMs: 450,
  /**
   * A fist right after landing is confirmed as ROCK only if it is still a fist this long after landing
   * (ms). Fingers that open inside this window are a late throw. 250 ms is just above the simple visual
   * reaction time (about 213-231 ms [Woods2015]), so nobody can open in reaction to the revealed AI move
   * and still be inside the window.
   */
  rockHoldMs: 250,
  /** Front-group opening that counts as "the fist has opened" after landing (two consecutive frames). */
  lateOpenThreshold: 0.35,
  /** No kinematic revision before this many tracked in-flight frames. */
  minEvidenceFrames: 2,
  /**
   * A round is void unless the hand was tracked in >= minInAirTracked frames of the last
   * max(inAirWindowMs, inAirWindowFrames frame intervals) before landing ...
   */
  inAirWindowMs: 160,
  inAirWindowFrames: 2.6,
  minInAirTracked: 2,
  /** ... and the last of them is at most max(inAirMaxAgeMs, inAirMaxAgeFrames frame intervals) old. */
  inAirMaxAgeMs: 45,
  inAirMaxAgeFrames: 2.2,
  /**
   * A tracked frame right after a tracking gap counts as "already landed" when the palm is within
   * max(arrivedMarginPL, arrivedFrac * stroke amplitude) of the landing height (palm lengths).
   */
  arrivedMarginPL: 0.04,
  arrivedFrac: 0.03,
  /** ... and "right after" means this many tracked frames (the velocity filter needs one more to recover). */
  gapRecoveryFrames: 2,
  /** Soft landing: a weak throw stroke is accepted as the landing if no stronger one follows within this (ms). */
  softLandingHoldMs: 90,
  /** Single-stroke mode: a steady fist (both groups below armMaxExtension) for this long arms the round (ms). */
  armHoldMs: 350,
  armMaxExtension: 0.4,
  /** Single-stroke mode, while armed: slide the onset grid this often and keep this much history (ms). */
  armedSlideMs: 400,
  armedKeepMs: 1200,
  /** Single-stroke mode: the hand held open this long without a stroke cancels the armed round (ms). */
  armedOpenAbortMs: 600,
  /** Single-stroke mode: a descent that has not ended after this long cancels the round (ms). */
  singleStrokeTimeoutMs: 1500,
  /** Metronome mode: lead-in before the first beat, tolerance around the scheduled throw, default period (ms). */
  metronomeLeadInMs: 700,
  metronomeWindowMs: 260,
  metronomePeriodMs: 600,
  /** In-motion noise sd of the group opening is estimated per round and kept inside these limits. */
  noiseFloorSd: 0.035,
  noiseCapSd: 0.15,
  /** Samples used for the fist baseline. */
  baselineFrames: 20,
  /** The priming posture must be a fist: raw extension of both groups below this. */
  fistMaxExtension: 0.45,
  /**
   * A count-in starts on the first stroke unless the hand is clearly OPEN (raw extension above this).
   * The gate is deliberately looser than fistMaxExtension: a fist that the current calibration reads
   * as half-open must still be able to start a round, so that the referee can void it (VOID_NO_FIST)
   * and the calibration can learn from it. A stricter gate would lock such a hand out for good.
   */
  primeStartMaxExtension: 0.7,
  /**
   * Optional decision freeze: no revision when the predicted landing is closer than this (ms). 0 = off.
   * Ignored under a no-loss preset: there the referee reads the hand up to the last in-air frame, and an
   * AI that stops looking earlier could lose to a legal throw.
   */
  freezeLeadMs: 0,
  /** Sensor calibration from a void round: a finger counts as open from this opening; the settled shape
   *  must not move by more than postureStableRange over the last samples. */
  postureOpenMin: 0.55,
  postureStableRange: 0.25,
  /** Abort when the hand is missing for this long during a round (ms). */
  handLostMs: 400,
  /** Stroke-threshold multiplier (user sensitivity). */
  sensitivity: 1,
});

export const THOUGHT_CODES = Object.freeze(['WAITING_HAND', 'PRIOR_READY', 'COUNTING', 'ARMED', 'FLIGHT_WATCHING', 'ONSET_FRONT', 'PAPER_LIKELY', 'SCISSORS_LIKELY', 'ROCK_BY_ABSENCE', 'LANDED', 'RESULT']);
export const EXPLANATION_CODES = Object.freeze(['HELD_BEHAVIOUR', 'ROCK_BY_ABSENCE', 'RESOLVED_PAPER', 'RESOLVED_SCISSORS', 'SAFE_SCISSORS', 'REVISED_AFTER_FEINT', 'GAMBLE_AMBIGUOUS', 'KINEMATIC', 'FOUL_LATE_OPEN', 'FOUL_LATE_CLOSE', 'VOID_NO_HAND', 'VOID_UNKNOWN', 'VOID_NO_FIST']);

const round1 = (/** @type {number} */ x) => Math.round(x * 10) / 10;

/**
 * @param {Object} deps
 * @param {ReturnType<typeof import('./player_model.js').createPlayerModel>} deps.player
 * @param {ReturnType<typeof import('./commit.js').createCommitLog>} deps.commitLog
 * @param {{next():number}} deps.rng
 * @param {Partial<typeof DEFAULTS>} [deps.cfg]
 */
export function createRoundEngine({ player, commitLog, rng, cfg = {} }) {
  const c = { ...DEFAULTS, ...cfg };
  const stroke = createStrokeTracker({ sensitivity: c.sensitivity });
  const flexKf = new Kalman1D({ q: 4e6, r: 60 }); // mean index+middle flexion (deg); velocity in deg/s

  let ruleName = RULES[/** @type {keyof typeof RULES} */ (c.rules)] ? c.rules : DEFAULT_RULE;
  let pendingRule = ruleName;
  /** @type {{primeBeats:number, metronome: null|{periodMs:number}}} */
  let mode = { primeBeats: c.primeBeats, metronome: null };

  /** @type {'IDLE'|'ARMED'|'PRIMING'|'FLIGHT'|'SETTLING'|'RESOLVED'} */
  let phase = 'IDLE';
  // round numbers continue after whatever the commit log already holds: a revealed round is closed for
  // good, so an engine that is rebuilt on the same log (settings change, new profile) must not reuse one
  let roundNo = Math.max(0, typeof commitLog.lastRound === 'function' ? commitLog.lastRound() : 0);
  let beat = 0;
  let handPresent = false;
  /** @type {number|null} */ let lastHandT = null;
  /** @type {number|null} */ let lastT = null;
  /** @type {number|null} */ let lastIndex = null;
  let frameDt = 33;
  /** @type {import('./kinematics.js').KinSample[]} */ let recent = [];
  /** @type {number|null} */ let fistSinceT = null;
  /** @type {any} */ let hand = null;
  /** @type {any} */ let r = null;       // context of the round in progress
  /** @type {any} */ let last = null;    // last RoundResult
  /** @type {{beatTimes:number[], throwT:number, next:number}|null} */ let schedule = null;

  const rules = () => RULES[/** @type {keyof typeof RULES} */ (ruleName)];

  // ------------------------------------------------------------------------------------------ helpers
  const startRound = (/** @type {number} */ t) => {
    roundNo += 1;
    ruleName = pendingRule;
    beat = 0;
    r = {
      round: roundNo, tStart: t,
      priming: /** @type {import('./kinematics.js').KinSample[]} */ ([]),
      base: null, baseRaw: null, noiseVarF: c.noiseFloorSd ** 2, noiseVarB: c.noiseFloorSd ** 2, noiseSd: c.noiseFloorSd, primingTheta: null,
      prior: [1 / 3, 1 / 3, 1 / 3], top: [], behaviour: null,
      tFlightStart: null, flightFrame: null, period: null, lastBeatT: null,
      commits: /** @type {any[]} */ ([]), kinematicCommits: 0,
      F: createOpeningDetector(), B: createOpeningDetector(), clf: null,
      belief: null, hF: 0, hB: 0, tLandHat: null, legalCount: 3,
      trace: { t: [], uF: [], uB: [], cy: [], hF: [], hB: [], pR: [], pP: [], pS: [], commitT: [], commitSeq: [] },
      samples: /** @type {import('./pose.js').PoseSample[]} */ ([]),
      inAir: /** @type {{t:number,index:number,hF:number,hB:number,u4:number[],y:number,afterGap:boolean,open:boolean}[]} */ ([]),
      flightFrames: /** @type {{t:number,index:number,tracked:boolean}[]} */ ([]),
      trackedInFlight: 0, lastEvalT: null, gapRecovery: 0,
      descentStartT: null, apexT: null, reanchored: false, peakFlexVel: 0,
      soft: /** @type {{t:number,y:number,amplitudePL:number}|null} */ (null), openSinceT: null,
      landing: null, settle: /** @type {import('./pose.js').PoseSample[]} */ ([]), settleTheta: /** @type {number[][]} */ ([]), settleNeural: /** @type {string[]} */ ([]), vSpread: null,
    };
  };

  /** Fist baseline, in-motion noise and mean flexion from the samples before the flight. */
  const computeBaseline = (/** @type {import('./kinematics.js').KinSample[]} */ samples) => {
    const use = samples.slice(-c.baselineFrames);
    if (use.length === 0) { r.base = [0, 0, 0, 0, 0]; r.baseRaw = { front: 0, back: 0 }; return; }
    r.base = [0, 1, 2, 3, 4].map((f) => median(use.map((s) => s.e[f])));
    r.baseRaw = { front: (r.base[1] + r.base[2]) / 2, back: (r.base[3] + r.base[4]) / 2 };
    const uF = [], uB = [];
    for (const s of use) { const u = openingFromBaseline(s.e, r.base); uF.push((u[1] + u[2]) / 2); uB.push((u[3] + u[4]) / 2); }
    const variance = (/** @type {number[]} */ a) => { if (a.length < 3) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1); };
    const lim = (/** @type {number} */ v) => Math.min(c.noiseCapSd ** 2, Math.max(c.noiseFloorSd ** 2, v));
    r.noiseVarF = lim(variance(uF)); r.noiseVarB = lim(variance(uB));
    r.noiseSd = Math.sqrt((r.noiseVarF + r.noiseVarB) / 2);
    r.primingTheta = [0, 1, 2, 3, 4].map((f) => use.reduce((x, s) => x + s.theta[f], 0) / use.length);
  };

  /**
   * Seal a move (I1, I2, I3). Throws outside ARMED / FLIGHT — there is no other way to create a commitment.
   * @returns {PublicCommit}
   */
  const commit = (/** @type {number} */ move, /** @type {'BEHAVIOUR'|'KINEMATIC'|'REVISION'} */ reason, /** @type {HandFrame} */ frame, /** @type {any} */ snap, /** @type {any[]} */ events) => {
    if (phase !== 'ARMED' && phase !== 'FLIGHT') throw new Error(`round_engine: commit attempted in phase ${phase}`);
    const expectedPrev = commitLog.head();
    const pub = commitLog.commit({ round: r.round, move, reason, frame: frame.index, t: frame.t });
    const entry = { pub, move, reason, expectedPrev, postLanding: false, ...snap };
    r.commits.push(entry);
    if (reason !== 'BEHAVIOUR') r.kinematicCommits += 1;
    r.trace.commitT.push(pub.t); r.trace.commitSeq.push(pub.seq);
    events.push({ type: 'commit', t: frame.t, commit: pub, reason, revision: r.commits.length - 1, belief: snap.belief ? { post: snap.belief.post.slice(), pLate: snap.belief.pLate } : null });
    return pub;
  };

  /** Open and verify every commitment of the round in progress (I2, I3). */
  const openRound = () => {
    const revealed = commitLog.reveal(r.round);
    const bySeq = new Map(revealed.map((x) => [x.seq, x]));
    let sealOk = true;
    const commits = r.commits.map((/** @type {any} */ k) => {
      const rev = bySeq.get(k.pub.seq);
      const v = rev ? commitLog.verify(rev, k.expectedPrev) : { ok: false };
      const verified = !!v.ok && !!rev && rev.move === k.move;
      if (!verified) sealOk = false;
      return { ...(rev ?? k.pub), verified, postLanding: k.postLanding, belief: k.belief ? { post: k.belief.post, pLate: k.belief.pLate } : null };
    });
    return { commits, sealOk, chainOk: commitLog.verifyChain().ok };
  };

  /** Drop everything older than tMin from the buffers of an armed round (single-stroke mode can wait long). */
  const trimRound = (/** @type {number} */ tMin) => {
    const cut = (/** @type {{t:number}[]} */ a) => { let k = 0; while (k < a.length && a[k].t < tMin) k++; if (k) a.splice(0, k); };
    cut(r.inAir); cut(r.samples); cut(r.flightFrames);
    const tr = r.trace;
    let k = 0;
    while (k < tr.t.length && tr.t[k] < tMin) k++;
    if (k) for (const key of ['t', 'uF', 'uB', 'cy', 'hF', 'hB', 'pR', 'pP', 'pS']) tr[key].splice(0, k);
  };

  const startFlight = (/** @type {HandFrame} */ frame, /** @type {import('./kinematics.js').KinSample|null} */ s0, /** @type {any[]} */ events, /** @type {'FLIGHT'|'ARMED'} */ into) => {
    computeBaseline(r.priming.length ? r.priming : recent);
    const pred = player.sequence.predict();
    r.prior = pred.p; r.top = pred.top;
    const d = player.safety.decide(pred.p, rng);
    r.behaviour = { move: d.move, best: d.best, lambda: d.lambda };
    r.clf = createPoseClassifier(player.poseState);
    r.F.reset(frame.t); r.B.reset(frame.t);
    r.tFlightStart = frame.t; r.flightFrame = frame.index;
    const s = stroke.state();
    r.period = s.periodMs ?? (mode.metronome ? mode.metronome.periodMs : null);
    r.lastBeatT = s.lastBottomT;
    phase = into;
    r.lastEvalT = s0 ? frame.t : null;
    events.push({ type: 'flightStart', t: frame.t, round: r.round });
    // the opening measured on this very frame goes into the record (null without a hand): I4
    const u0 = s0 ? openingFromBaseline(s0.e, r.base) : null;
    commit(d.move, 'BEHAVIOUR', frame, { belief: { post: pred.p.slice(), pLate: 0, prior: pred.p.slice(), kinLik: [1 / 3, 1 / 3, 1 / 3], pLoss: null, legalCount: 3, informative: false }, u4: u0 ? [u0[1], u0[2], u0[3], u0[4]] : null, hF: null, hB: null }, events);
  };

  const abort = (/** @type {string} */ reason, /** @type {number} */ t, /** @type {any[]} */ events) => {
    // I3: seals that were shown are opened and verified even though the round is not judged
    let opened = { commits: /** @type {any[]} */ ([]), sealOk: true, chainOk: true };
    const round = r ? r.round : null;
    if (r && r.commits.length) { try { opened = openRound(); } catch { opened = { commits: [], sealOk: false, chainOk: false }; } }
    r = null; schedule = null; phase = 'IDLE'; beat = 0; fistSinceT = null; recent = [];
    stroke.resetRhythm();
    events.push({ type: 'aborted', t, reason, round, commits: opened.commits, sealOk: opened.sealOk, chainOk: opened.chainOk });
  };

  /**
   * Fix the landing. `t` may lie in the past (soft and metronome landings are confirmed later); `info`
   * carries the palm height and amplitude of the stroke that ended.
   */
  const land = (/** @type {number} */ t, /** @type {'stroke'|'soft'|'metronome'} */ source, /** @type {HandFrame} */ frame, /** @type {any[]} */ events, /** @type {{y:number, amplitudePL?:number}|null} */ info = null) => {
    let landT = source === 'stroke' ? frame.t : t;
    let landingFrame = frame.index;
    if (source !== 'stroke') {
      const hit = r.flightFrames.find((/** @type {any} */ f) => f.t >= t);
      if (hit) landingFrame = hit.index;
    }
    if (info && Number.isFinite(info.y)) {
      // A frame that follows a tracking gap carries no usable velocity. If the palm was already at its
      // landing height there, the hand had landed (inside the gap, or on that frame without the stop
      // being recognised): that frame is the landing frame.
      const delta = Math.max(c.arrivedMarginPL, c.arrivedFrac * (info.amplitudePL ?? 0));
      for (let i = r.inAir.length - 1; i >= 0; i--) {
        const f = r.inAir[i];
        if (f.index >= landingFrame) continue;
        if (!(f.y >= info.y - delta)) break;
        if (f.afterGap) { landingFrame = f.index; landT = f.t; }
      }
    }
    landingFrame = Math.max(landingFrame, r.flightFrame + 1); // the behavioural commit always precedes the landing
    if (!(landT > r.tFlightStart)) { abort('RHYTHM_TIMEOUT', frame.t, events); return; }
    r.landing = { t: landT, frame: landingFrame, source };
    // I1, by frame order only: landingFrame is the first frame at or after the landing time, so every
    // frame before it lies before the landing. Comparing the SEALED time (rounded to 0.1 ms) with the
    // unrounded landing time instead would discard a seal made on a frame a few hundredths of a
    // millisecond before a scheduled landing, although the referee still reads that very frame.
    for (const k of r.commits) if (k.pub.frame >= landingFrame) k.postLanding = true;
    phase = 'SETTLING';
    events.push({ type: 'landing', t: landT, source });
  };

  // ------------------------------------------------------------------------------- in-flight evaluation
  const evaluate = (/** @type {import('./kinematics.js').KinSample} */ s, /** @type {HandFrame} */ frame, /** @type {any[]} */ events, /** @type {boolean} */ mayRevise) => {
    const u = openingFromBaseline(s.e, r.base);
    const uF = (u[1] + u[2]) / 2, uB = (u[3] + u[4]) / 2;
    if (r.F.observe(s.t, uF, r.noiseVarF).reanchored) r.reanchored = true;
    if (r.B.observe(s.t, uB, r.noiseVarB).reanchored) r.reanchored = true;
    const pl = predictLanding(stroke.state(), s.t, player.stroke);
    let tL = pl.tHat;
    if (schedule && (tL === null || Math.abs(tL - schedule.throwT) > c.metronomeWindowMs)) tL = schedule.throwT;
    tL = Math.max(tL ?? s.t + frameDt, s.t + frameDt);
    const eF = r.F.evidence(tL, player.onsetPrior('front'));
    const eBs = r.B.evidence(tL, player.onsetPrior('back'));
    const opened = eF.meanOnsetT !== null && Math.max(eF.logOpenLegal, eF.logOpenLate) > eF.logStay - 3;
    const eBp = opened ? r.B.evidence(tL, player.coupledBackPrior(/** @type {number} */ (eF.meanOnsetT))) : eBs;
    const belief = fuse({ prior: r.prior, F: eF, Bstay: eBs, Bopen: eBp, wPrior: player.fusion.wPrior, wKin: player.fusion.wKin });
    const hF = r.F.headingNow(), hB = r.B.headingNow();
    const legal = legalMassFor(belief, hF, hB, rules());
    const choice = chooseAction(legal.mass, rules(), legal.legal);
    r.belief = belief; r.hF = hF; r.hB = hB; r.tLandHat = tL;
    r.legalCount = legal.mass.filter((m) => m > 1e-9).length;
    r.trackedInFlight += 1;
    // After a tracking gap the stroke velocity is an average over the gap, and the filter needs one
    // more frame to recover: this frame and the next are marked, so that the landing rule can fall
    // back on the palm HEIGHT for them (see land()).
    if (r.lastEvalT === null || s.t - r.lastEvalT > 1.6 * frameDt) r.gapRecovery = c.gapRecoveryFrames;
    const afterGap = r.gapRecovery > 0;
    if (afterGap) r.gapRecovery -= 1;
    r.lastEvalT = s.t;
    // `open`: the revision step below is reached on this frame (not while a single-stroke round merely
    // waits armed, and not before enough frames of the round have been seen)
    r.inAir.push({ t: s.t, index: frame.index, hF, hB, u4: [u[1], u[2], u[3], u[4]], y: stroke.state().y, afterGap, open: mayRevise && r.trackedInFlight >= c.minEvidenceFrames });
    r.samples.push({ t: s.t, u4: [u[1], u[2], u[3], u[4]], neural: s.neural });
    const tr = r.trace;
    tr.t.push(round1(s.t)); tr.uF.push(+uF.toFixed(3)); tr.uB.push(+uB.toFixed(3)); tr.cy.push(+s.cy.toFixed(4));
    tr.hF.push(+hF.toFixed(3)); tr.hB.push(+hB.toFixed(3)); tr.pR.push(+belief.post[0].toFixed(3)); tr.pP.push(+belief.post[1].toFixed(3)); tr.pS.push(+belief.post[2].toFixed(3));

    if (!mayRevise || r.trackedInFlight < c.minEvidenceFrames) return;
    if (c.freezeLeadMs > 0 && !rules().noLoss && tL - s.t < c.freezeLeadMs) return;
    const cur = r.commits[r.commits.length - 1].move;
    if (shouldRevise(cur, choice, rules())) {
      const total = choice.total > 0 ? choice.total : 1;
      commit(choice.action, r.kinematicCommits === 0 ? 'KINEMATIC' : 'REVISION', frame, {
        belief: { post: belief.post.slice(), pLate: belief.pLate, prior: r.prior.slice(), kinLik: belief.kinLik.slice(), pLoss: choice.pLoss / total, legalCount: r.legalCount, informative: true },
        u4: [u[1], u[2], u[3], u[4]], hF, hB,
      }, events);
    }
  };

  // --------------------------------------------------------------------------------------- the referee
  const judge = (/** @type {ReturnType<typeof decideFinal>} */ decision, /** @type {number} */ t, /** @type {any[]} */ events) => {
    const L = r.landing;
    const judged = [...r.commits].reverse().find((k) => !k.postLanding) ?? r.commits[0];
    const inAir = r.inAir.filter((/** @type {any} */ f) => f.index < L.frame); // frame order, as in land()
    const lastInAir = inAir.length ? inAir[inAir.length - 1] : null;
    const windowMs = Math.max(c.inAirWindowMs, c.inAirWindowFrames * frameDt);
    const trackedLate = inAir.filter((/** @type {any} */ f) => f.t >= L.t - windowMs).length;
    // the referee needs FRESH in-air evidence: a last look that is several frames old says nothing about
    // what the fingers did just before landing, so such a round is void rather than a foul
    const stale = !lastInAir || L.t - lastInAir.t > Math.max(c.inAirMaxAgeMs, c.inAirMaxAgeFrames * frameDt);
    // ... and it has to be a look at the THROW. In single-stroke mode the frames of the armed wait are
    // recorded as in-air frames, but the AI may not revise on them. If the landing is dated before any
    // frame of the stroke itself (a very fast stroke hidden by a dropped frame), nothing was seen of the
    // throw and the standing commitment never had a chance to follow the referee's reading: void.
    const unseen = !!lastInAir && !lastInAir.open;
    const R = rules();

    /** @type {string} */ let verdict;
    /** @type {0|1|2|null} */ let playerMove = decision.move;
    let code = 'KINEMATIC';
    if (r.baseRaw && (r.baseRaw.front > c.fistMaxExtension || r.baseRaw.back > c.fistMaxExtension)) {
      verdict = 'VOID_NO_FIST'; code = 'VOID_NO_FIST';
    } else if (trackedLate < c.minInAirTracked || !lastInAir || stale || unseen || decision.reason === 'NO_HAND') {
      verdict = 'VOID_NO_HAND'; code = 'VOID_NO_HAND';
    } else if (/** @type {string} */ (decision.reason) === 'LATE_OPEN') {
      verdict = 'FOUL_LATE'; code = 'FOUL_LATE_OPEN'; // the hand landed as a fist and opened afterwards
    } else if (playerMove === null) {
      verdict = 'VOID_UNKNOWN'; code = 'VOID_UNKNOWN';
    } else if (foulNow(lastInAir.hF, lastInAir.hB, R)[playerMove]) {
      // I5: only the pre-landing headings and the settled shape decide; the AI's move is not consulted
      verdict = 'FOUL_LATE';
      const frontMustOpen = playerMove !== ROCK;
      code = (frontMustOpen && lastInAir.hF < R.epsF) || (playerMove === PAPER && lastInAir.hB < R.epsB) ? 'FOUL_LATE_OPEN' : 'FOUL_LATE_CLOSE';
    } else {
      const p = payoff(/** @type {0|1|2} */ (judged.move), playerMove);
      verdict = p > 0 ? 'AI' : p < 0 ? 'PLAYER' : 'TIE';
    }
    const valid = verdict === 'AI' || verdict === 'PLAYER' || verdict === 'TIE';

    // reveal and verify every commitment of the round (I2, I3)
    const opened = openRound();
    const sealOk = opened.sealOk, chainOk = opened.chainOk;
    const commits = opened.commits.map((/** @type {any} */ k) => ({ ...k, leadMs: round1(L.t - k.t) }));

    // timing — all measured
    const allSamples = r.samples;
    // "completion" is the moment the shape became recognisable; a fist is there from the start, so the
    // quantity is defined for PAPER and SCISSORS only
    const tComplete = valid && playerMove !== ROCK && decision.tStable !== null ? completionTime(allSamples, /** @type {number} */ (playerMove), decision.tStable, r.clf) : null;
    const flightMs = L.t - r.tFlightStart;
    const before = r.flightFrames.filter((/** @type {any} */ f) => f.index < L.frame);
    const nBefore = before.length;
    const spanMs = nBefore >= 2 ? before[nBefore - 1].t - before[0].t : 0;
    const firstKin = r.commits.find((/** @type {any} */ k) => k.reason !== 'BEHAVIOUR' && !k.postLanding);
    const tail = r.settle.slice(-5);
    const finalU4 = tail.length ? [0, 1, 2, 3].map((k) => median(tail.map((/** @type {any} */ s) => s.u4[k]))) : null;
    const thetaTail = r.settleTheta.slice(-5);
    const finalTheta = thetaTail.length ? [0, 1, 2, 3, 4].map((f) => thetaTail.reduce((/** @type {number} */ a, /** @type {number[]} */ th) => a + th[f], 0) / thetaTail.length) : null;
    let progressAtCommit = null;
    if (valid && playerMove !== ROCK && finalU4 && judged.u4) {
      const den = finalU4.reduce((a, v) => a + v * v, 0);
      if (den > 0.05) progressAtCommit = judged.u4.reduce((/** @type {number} */ a, /** @type {number} */ v, /** @type {number} */ i) => a + v * finalU4[i], 0) / den;
    }
    const traceF = { t: r.trace.t, u: r.trace.uF }, traceB = { t: r.trace.t, u: r.trace.uB };
    const mF = measureOpening(traceF, L.t, r.noiseSd), mB = measureOpening(traceB, L.t, r.noiseSd);

    if (valid) {
      if (judged.reason === 'BEHAVIOUR') code = 'HELD_BEHAVIOUR';
      else if (r.reanchored || r.kinematicCommits >= 3) code = 'REVISED_AFTER_FEINT';
      else if (judged.belief && judged.belief.legalCount >= 3) code = 'GAMBLE_AMBIGUOUS';
      else if (judged.move === PAPER) code = 'ROCK_BY_ABSENCE';
      else if (judged.move === ROCK) code = 'RESOLVED_SCISSORS';
      else code = judged.hB >= 1 - R.epsB ? 'RESOLVED_PAPER' : 'SAFE_SCISSORS';
    }

    const wouldBe = valid ? (() => { const p = payoff(r.behaviour.move, /** @type {0|1|2} */ (playerMove)); return p > 0 ? 'AI' : p < 0 ? 'PLAYER' : 'TIE'; })() : null;
    const result = {
      round: r.round, verdict, valid, landingSource: L.source, landingFrame: L.frame,
      playerMove, aiMove: judged.move,
      commits, judgedSeq: judged.pub.seq, sealOk, chainOk,
      timing: {
        tFlightStart: round1(r.tFlightStart), tApex: r.apexT === null ? null : round1(r.apexT),
        tFirstKinematicCommit: firstKin ? firstKin.pub.t : null,
        tFinalCommit: judged.pub.t, tLanding: round1(L.t), tComplete: tComplete === null ? null : round1(tComplete),
        leadToLandingMs: round1(L.t - judged.pub.t),
        leadToCompletionMs: tComplete === null ? null : round1(tComplete - judged.pub.t),
        flightMs: round1(flightMs),
        fpsInFlight: spanMs > 0 ? round1((1000 * (nBefore - 1)) / spanMs) : null,
        trackedInFlight: nBefore > 0 ? +(before.filter((/** @type {any} */ f) => f.tracked).length / nBefore).toFixed(3) : null,
        lastInAirAgeMs: lastInAir ? round1(L.t - lastInAir.t) : null,
      },
      progressAtCommit: progressAtCommit === null ? null : +progressAtCommit.toFixed(3),
      behaviour: { prior: r.prior.map((/** @type {number} */ v) => +v.toFixed(4)), move: r.behaviour.move, lambda: +r.behaviour.lambda.toFixed(3), wouldBe, top: r.top.slice(0, 3) },
      kinematics: {
        onsetLeadFrontMs: mF && mF.opened && mF.onsetT !== null ? round1(L.t - mF.onsetT) : null,
        onsetLeadBackMs: mB && mB.opened && mB.onsetT !== null ? round1(L.t - mB.onsetT) : null,
        openingMsFront: mF && mF.opened && mF.durationMs !== null ? round1(mF.durationMs) : null,
        peakFlexionVelDegS: r.peakFlexVel > 0 ? Math.round(r.peakFlexVel) : null,
        vSpreadDeg: r.vSpread === null ? null : round1(r.vSpread),
        headingFront: lastInAir ? +lastInAir.hF.toFixed(3) : null,
        headingBack: lastInAir ? +lastInAir.hB.toFixed(3) : null,
        noiseSd: +r.noiseSd.toFixed(3),
        reanchored: r.reanchored,
      },
      beliefAtFinalCommit: judged.belief ? { prior: judged.belief.prior, kinLik: judged.belief.kinLik, post: judged.belief.post, pLate: judged.belief.pLate, pLoss: judged.belief.pLoss, legalCount: judged.belief.legalCount } : null,
      trace: r.trace,
      rules: { preset: ruleName, epsF: R.epsF, epsB: R.epsB },
      explanation: { code, params: { aiMove: judged.move, playerMove, leadMs: round1(L.t - judged.pub.t), progress: progressAtCommit, revisions: r.kinematicCommits } },
    };

    if (valid) { // I6
      player.learnFromRound({
        playerMove: /** @type {0|1|2} */ (playerMove), aiMove: judged.move,
        traceFront: traceF, traceBack: traceB, tLanding: L.t, noiseSd: r.noiseSd,
        primingTheta: r.primingTheta,
        finalTheta,
        finalU4,
        neuralLabel: r.settleNeural.length ? r.settleNeural[r.settleNeural.length - 1] : null,
        stroke: {
          throwDescentMs: L.source === 'stroke' && r.descentStartT !== null ? L.t - r.descentStartT : null,
          throwIntervalMs: L.source === 'stroke' && r.lastBeatT !== null ? L.t - r.lastBeatT : null,
          periodMs: r.period,
          apexToBottomMs: L.source === 'stroke' && r.apexT !== null ? L.t - r.apexT : null,
        },
        belief: { prior: r.prior, kinLik: judged.belief ? judged.belief.kinLik : [1 / 3, 1 / 3, 1 / 3], informative: !!(judged.belief && judged.belief.informative) },
        behaviour: { best: r.behaviour.best, lambda: r.behaviour.lambda },
        result,
      });
    } else {
      player.metrics.record(result);
      // sensor calibration only (I6): how this camera reads this hand's fist and open fingers
      if (verdict === 'VOID_NO_FIST') {
        player.learnPosture({ primingTheta: r.primingTheta, finalTheta: null, openFingers: [] });
      } else if (verdict === 'VOID_UNKNOWN' && finalU4 && tail.length >= 3) {
        const steady = [0, 1, 2, 3].every((k) => { const v = tail.map((/** @type {any} */ x) => x.u4[k]); return Math.max(...v) - Math.min(...v) <= c.postureStableRange; });
        if (steady) player.learnPosture({ primingTheta: r.primingTheta, finalTheta, openFingers: [1, 2, 3, 4].filter((f) => finalU4[f - 1] >= c.postureOpenMin) });
      }
    }
    void t;
    last = result;
    phase = 'RESOLVED';
    schedule = null;
    events.push({ type: 'result', result });
  };

  // ------------------------------------------------------------------------------------------ frames
  /**
   * Feed one camera frame (also frames without a hand). Never throws on malformed frames.
   * @param {HandFrame} frame
   * @returns {any[]} events
   */
  const pushFrame = (frame) => {
    /** @type {any[]} */ const events = [];
    if (!frame || !Number.isFinite(frame.t) || !Number.isInteger(frame.index) || frame.index < 0) return events;
    // frames must advance in time AND in index: "before the landing" is decided by frame order (I1)
    if (lastT !== null && frame.t <= lastT) return events;
    if (lastIndex !== null && frame.index <= lastIndex) return events;
    if (lastT !== null) { const d = frame.t - lastT; if (d > 0 && d < 250) frameDt += 0.1 * (d - frameDt); }
    lastT = frame.t; lastIndex = frame.index;

    const s = frameFeatures(frame, player.calibration);
    if (s) {
      if (!handPresent) { handPresent = true; events.push({ type: 'handSeen', t: frame.t }); }
      lastHandT = frame.t;
      flexKf.step((s.theta[1] + s.theta[2]) / 2, (frame.t - (hand ? hand.t : frame.t - frameDt)) / 1000);
      hand = { t: frame.t, e: s.e, theta: s.theta, vSpreadDeg: s.vSpread, flexVelDegS: -flexKf.v, front: s.front, back: s.back, cy: s.cy, palm: s.palm };
      recent.push(s);
      if (recent.length > c.baselineFrames) recent.shift();
    } else if (handPresent) {
      handPresent = false; events.push({ type: 'handLost', t: frame.t });
      recent = []; fistSinceT = null; // a baseline never spans a loss of tracking
    }
    const strokeEvents = s ? stroke.push(s.t, s.cy, s.palm) : [];

    if ((phase === 'PRIMING' || phase === 'ARMED' || phase === 'FLIGHT') && lastHandT !== null && frame.t - lastHandT > c.handLostMs) {
      abort('HAND_LOST', frame.t, events);
      return events;
    }

    if (phase === 'IDLE') {
      if (mode.primeBeats === 0 && !mode.metronome) {
        const steady = s && s.front < c.armMaxExtension && s.back < c.armMaxExtension && stroke.state().stillSinceT !== null;
        if (!steady) fistSinceT = null; else if (fistSinceT === null) fistSinceT = frame.t;
        if (steady && fistSinceT !== null && frame.t - fistSinceT >= c.armHoldMs) {
          const since = fistSinceT;
          startRound(frame.t);
          // the fist baseline comes from the steady interval that armed the round, nothing older
          r.priming = recent.filter((x) => x.t >= since);
          stroke.resetRhythm();
          startFlight(frame, s, events, 'ARMED');
        }
      } else if (!mode.metronome) {
        const b = strokeEvents.find((e) => e.type === 'bottom');
        if (b && b.type === 'bottom') {
          if (b.index === 1 && s && s.front < c.primeStartMaxExtension && s.back < c.primeStartMaxExtension) {
            startRound(frame.t);
            r.priming = recent.slice();
            phase = 'PRIMING'; beat = 1;
            events.push({ type: 'beat', n: 1, t: b.t, periodMs: null });
          } else {
            stroke.resetRhythm(); // a stroke that cannot start a round must not shift the beat count
          }
        }
      }
      return events;
    }

    if (phase === 'PRIMING') {
      if (s) r.priming.push(s);
      if (schedule) {
        // a stall that jumps past the scheduled throw (hidden tab, long hitch) cannot start a flight
        if (frame.t >= schedule.throwT) { abort('RHYTHM_TIMEOUT', frame.t, events); return events; }
        if (mode.primeBeats === 0) { startFlight(frame, s, events, 'FLIGHT'); return events; }
        while (schedule.next < schedule.beatTimes.length - 1 && frame.t >= schedule.beatTimes[schedule.next]) {
          beat = schedule.next + 1;
          events.push({ type: 'beat', n: beat, t: schedule.beatTimes[schedule.next], periodMs: mode.metronome ? mode.metronome.periodMs : null, scheduled: true });
          schedule.next += 1;
          if (beat === mode.primeBeats) { startFlight(frame, s, events, 'FLIGHT'); break; }
        }
        return events;
      }
      for (const e of strokeEvents) {
        if (e.type === 'rhythmReset') { abort(e.reason === 'lost' ? 'HAND_LOST' : 'RHYTHM_TIMEOUT', frame.t, events); return events; }
        if (e.type === 'bottom') {
          beat = e.index;
          events.push({ type: 'beat', n: beat, t: e.t, periodMs: stroke.state().periodMs });
          if (beat >= mode.primeBeats) { startFlight(frame, s, events, 'FLIGHT'); break; }
        }
      }
      return events;
    }

    const single = mode.primeBeats === 0 && !schedule;

    if (phase === 'ARMED') {
      // single-stroke mode: the behavioural commitment is sealed; watch the fingers, but start deciding
      // only once the stroke is under way (before that there is no landing estimate to anchor the priors)
      for (const e of strokeEvents) {
        if (e.type === 'descentStart') { phase = 'FLIGHT'; r.descentStartT = e.t; }
      }
      r.flightFrames.push({ t: frame.t, index: frame.index, tracked: !!s });
      if (s) {
        evaluate(s, frame, events, phase === 'FLIGHT');
        if (phase === 'ARMED') {
          // the hand held open without a stroke: this is not a throw, start over
          const open = s.front > c.fistMaxExtension || s.back > c.fistMaxExtension;
          if (!open) r.openSinceT = null; else if (r.openSinceT === null) r.openSinceT = frame.t;
          if (r.openSinceT !== null && frame.t - r.openSinceT > c.armedOpenAbortMs) { abort('MANUAL', frame.t, events); return events; }
          // The player may wait as long as they like. While the fist is clearly closed, keep the onset
          // grid of both detectors over the near future and forget the idle past.
          if (r.hF < 0.02 && r.hB < 0.02 && frame.t - r.F.anchorT >= c.armedSlideMs) {
            r.F.slide(frame.t); r.B.slide(frame.t);
            trimRound(frame.t - c.armedKeepMs);
          }
        }
      }
      return events;
    }

    if (phase === 'FLIGHT') {
      r.flightFrames.push({ t: frame.t, index: frame.index, tracked: !!s });
      // landing first: a frame that brings the landing never produces a commitment (I1)
      for (const e of strokeEvents) {
        if (e.type === 'apex') { if (r.apexT === null) r.apexT = e.t; }
        else if (e.type === 'descentStart') r.descentStartT = e.t;
        else if (e.type === 'rhythmReset') { if (!schedule) { abort(e.reason === 'lost' ? 'HAND_LOST' : 'RHYTHM_TIMEOUT', frame.t, events); return events; } }
        else if (e.type === 'bottom') {
          if (!schedule || Math.abs(e.t - schedule.throwT) <= c.metronomeWindowMs) { land(e.t, 'stroke', frame, events, { y: e.y, amplitudePL: e.amplitudePL }); break; }
        } else if (e.type === 'weakBottom' || e.type === 'falseStart') {
          if (single) {
            // one stroke decides a single-stroke round, so it has to be a clear one: anything less
            // (a twitch, landmark jitter) is not a throw and the round stays armed
            phase = 'ARMED'; r.descentStartT = null;
          } else if (e.type === 'weakBottom' && !schedule && (r.apexT !== null || e.t - r.tFlightStart >= 0.5 * (r.period ?? 520))) {
            // after the count-in a weak stroke is still a throw: candidate for a soft landing
            r.soft = { t: e.t, y: e.y, amplitudePL: e.amplitudePL };
          }
        }
      }
      if (phase === 'IDLE') return events; // the landing was rejected and the round aborted
      if (phase === 'ARMED') { if (s) evaluate(s, frame, events, false); return events; }
      if (phase === 'FLIGHT' && schedule && frame.t >= schedule.throwT) {
        const st = stroke.state();
        const moving = st.phase === 'DOWN' || st.phase === 'UP';
        if (!moving || frame.t >= schedule.throwT + c.metronomeWindowMs) land(schedule.throwT, 'metronome', frame, events);
        if (phase === 'IDLE') return events;
      }
      if (phase === 'FLIGHT' && !schedule) {
        if (r.soft && frame.t - r.soft.t >= c.softLandingHoldMs && stroke.state().phase !== 'DOWN') {
          land(r.soft.t, 'soft', frame, events, r.soft);
          if (phase === 'IDLE') return events;
        } else if (single && r.descentStartT !== null && frame.t - r.descentStartT > c.singleStrokeTimeoutMs) {
          abort('RHYTHM_TIMEOUT', frame.t, events); return events; // the single stroke never came to rest
        }
      }
      if (phase === 'FLIGHT') {
        if (s) {
          if (hand && hand.flexVelDegS > r.peakFlexVel) r.peakFlexVel = hand.flexVelDegS;
          evaluate(s, frame, events, true);
        }
        return events;
      }
      // fall through: this frame is the landing frame and belongs to the settle window
    }

    if (phase === 'SETTLING') {
      const L = r.landing;
      if (s && frame.index >= L.frame) {
        const u = openingFromBaseline(s.e, r.base);
        const sample = { t: s.t, u4: [u[1], u[2], u[3], u[4]], neural: s.neural };
        r.settle.push(sample); r.samples.push(sample);
        r.settleTheta.push(s.theta); if (s.neural) r.settleNeural.push(s.neural.label);
        r.vSpread = s.vSpread;
        const tr = r.trace;
        tr.t.push(round1(s.t)); tr.uF.push(+((u[1] + u[2]) / 2).toFixed(3)); tr.uB.push(+((u[3] + u[4]) / 2).toFixed(3)); tr.cy.push(+s.cy.toFixed(4));
      }
      let decision = decideFinal(r.settle, r.clf);
      const elapsed = frame.t - L.t;
      if (decision.move === ROCK) {
        // a fist at landing is not yet a throw: if the fingers open afterwards it is a late throw
        const n = r.settle.length;
        const open = (/** @type {any} */ p) => (p.u4[0] + p.u4[1]) / 2 > c.lateOpenThreshold;
        if (n >= 2 && open(r.settle[n - 1]) && open(r.settle[n - 2])) decision = { move: null, tStable: null, confidence: null, reason: /** @type {any} */ ('LATE_OPEN') };
        else if (elapsed < c.rockHoldMs) return events;
      }
      if (decision.move !== null || decision.reason === /** @type {any} */ ('LATE_OPEN') || elapsed >= c.settleMs) judge(decision, frame.t, events);
      return events;
    }
    return events; // RESOLVED: wait for acknowledge()
  };

  // ------------------------------------------------------------------------------------------- public
  const thought = () => {
    if (phase === 'RESOLVED') return { code: 'RESULT', params: { verdict: last ? last.verdict : null } };
    if (phase === 'SETTLING') return { code: 'LANDED', params: {} };
    if (phase === 'PRIMING') return { code: 'COUNTING', params: { beat, primeBeats: mode.primeBeats } };
    if (phase === 'ARMED') return { code: 'ARMED', params: {} };
    if (phase === 'FLIGHT' && r) {
      const ms = r.tLandHat !== null && lastT !== null ? Math.max(0, Math.round(r.tLandHat - lastT)) : null;
      if (!r.belief) return { code: 'FLIGHT_WATCHING', params: { msToLanding: ms } };
      const R = rules();
      if (r.hF >= 0.5) {
        if (r.hB >= 1 - R.epsB) return { code: 'PAPER_LIKELY', params: { msToLanding: ms } };
        if (r.hB < R.epsB && r.belief.post[SCISSORS] > 0.6) return { code: 'SCISSORS_LIKELY', params: { msToLanding: ms } };
        return { code: 'ONSET_FRONT', params: { msToLanding: ms } };
      }
      if (r.belief.post[ROCK] > 0.6) return { code: 'ROCK_BY_ABSENCE', params: { msToLanding: ms } };
      return { code: 'FLIGHT_WATCHING', params: { msToLanding: ms } };
    }
    if (!handPresent) return { code: 'WAITING_HAND', params: {} };
    const pred = player.sequence.predict();
    let best = 0;
    for (let i = 1; i < 3; i++) if (pred.p[i] > pred.p[best]) best = i;
    return { code: 'PRIOR_READY', params: { move: best, p: pred.p[best], expert: pred.top[0] ? pred.top[0].name : 'uniform', rotation: pred.top[0] ? pred.top[0].rotation : 0, rounds: player.sequence.length } };
  };

  /** Cheap state for the UI. Never contains the AI's move before the reveal (I2). */
  const snapshot = () => {
    const idlePred = phase === 'IDLE' || phase === 'PRIMING' ? player.sequence.predict() : null;
    const standing = r && r.commits.length ? r.commits[r.commits.length - 1] : null;
    const inFlight = phase === 'FLIGHT' || phase === 'ARMED';
    return {
      phase, round: r ? r.round : roundNo, beat, primeBeats: mode.primeBeats, metronome: !!mode.metronome,
      rules: ruleName,
      periodMs: r && r.period ? r.period : stroke.state().periodMs,
      tLandHat: inFlight && r ? r.tLandHat : null,
      flightProgress: inFlight && r && r.tLandHat !== null && lastT !== null && r.tLandHat > r.tFlightStart ? Math.min(1.5, Math.max(0, (lastT - r.tFlightStart) / (r.tLandHat - r.tFlightStart))) : null,
      handPresent,
      hand: handPresent && hand ? {
        e: hand.e.slice(), theta: hand.theta.slice(), vSpreadDeg: hand.vSpreadDeg, flexVelDegS: hand.flexVelDegS,
        uF: r && r.trace.uF.length ? r.trace.uF[r.trace.uF.length - 1] : null,
        uB: r && r.trace.uB.length ? r.trace.uB[r.trace.uB.length - 1] : null,
        noiseSd: r ? r.noiseSd : player.noiseSd, strokeY: stroke.state().y, strokeV: stroke.state().vy,
      } : null,
      prior: r && r.tFlightStart !== null ? r.prior.slice() : idlePred ? idlePred.p.slice() : null,
      kinLik: r && r.belief ? r.belief.kinLik.slice() : null,
      post: r && r.belief ? r.belief.post.slice() : null,
      pLate: r && r.belief ? r.belief.pLate : null,
      headings: r && r.belief ? { front: r.hF, back: r.hB } : null,
      standing: standing && phase !== 'RESOLVED' ? { seq: standing.pub.seq, short: standing.pub.short, hash: standing.pub.hash, t: standing.pub.t, reason: standing.reason, revisions: r.commits.length - 1 } : null,
      thought: thought(),
      topExperts: (r && r.top.length ? r.top : idlePred ? idlePred.top : []).slice(0, 3),
      schedule: schedule ? { beatTimes: schedule.beatTimes.slice(), throwT: schedule.throwT } : null,
    };
  };

  /** Leave RESOLVED (button-driven progression). */
  const acknowledge = () => {
    if (phase !== 'RESOLVED') return false;
    phase = 'IDLE'; r = null; beat = 0; fistSinceT = null; recent = [];
    stroke.resetRhythm();
    return true;
  };

  /** @param {string} name takes effect from the next round */
  const setRules = (name) => {
    if (!RULES[/** @type {keyof typeof RULES} */ (name)]) throw new RangeError(`round_engine: unknown rule preset ${name}`);
    pendingRule = name;
    if (phase === 'IDLE') ruleName = name;
  };

  /** @param {{primeBeats?: number, metronome?: null|{periodMs:number}}} m only while idle */
  const setMode = (m) => {
    if (phase !== 'IDLE') return false;
    if (m.primeBeats !== undefined) {
      if (![0, 2, 3].includes(m.primeBeats)) throw new RangeError('round_engine: primeBeats must be 0, 2 or 3');
      mode.primeBeats = m.primeBeats;
    }
    if (m.metronome !== undefined) mode.metronome = m.metronome ? { periodMs: Math.min(1200, Math.max(350, m.metronome.periodMs || c.metronomePeriodMs)) } : null;
    stroke.resetRhythm(); fistSinceT = null;
    return true;
  };

  /**
   * Metronome mode: schedule the count-in. Beat times are returned so the UI can schedule audio exactly.
   * @param {number} tNow current time on the frame clock
   * @returns {{beatTimes:number[]}|null}
   */
  const armMetronome = (tNow) => {
    if (phase !== 'IDLE' || !mode.metronome || !Number.isFinite(tNow)) return null;
    const p = mode.metronome.periodMs;
    const beatTimes = [];
    for (let k = 0; k <= mode.primeBeats; k++) beatTimes.push(tNow + c.metronomeLeadInMs + k * p);
    schedule = { beatTimes, throwT: beatTimes[beatTimes.length - 1], next: 0 };
    lastHandT = null; // the hand may still be on its way into the picture: the hand-lost timer starts when it is seen
    startRound(tNow);
    phase = 'PRIMING';
    return { beatTimes: beatTimes.slice() };
  };

  /** @param {string} [reason] */
  const abortRound = (reason = 'MANUAL') => {
    /** @type {any[]} */ const events = [];
    if (phase === 'IDLE') return events;
    if (phase === 'RESOLVED') { acknowledge(); return events; }
    abort(reason, lastT ?? 0, events);
    return events;
  };

  return {
    pushFrame, snapshot, acknowledge, setRules, setMode, armMetronome, abortRound,
    lastResult: () => last,
    get phase() { return phase; },
    get mode() { return { ...mode }; },
    cfg: c,
  };
}
