// @ts-check
// Test helper: scalar finger-group traces of one flight (minimum-jerk openings + Gaussian noise) and a
// compact decision loop built on the production modules. Independent of the engine and the hand model,
// so it isolates opening.js + decision.js.

import { minJerk } from '../../web/js/core/math.js';
import { createOpeningDetector } from '../../web/js/core/opening.js';
import { fuse, legalMassFor, chooseAction, shouldRevise, foulNow } from '../../web/js/core/decision.js';

/**
 * @param {{move:number, fps:number, noise:number, lead:number, dur:number, backDelay?:number, enslave?:number,
 *          flightMs?:number, rng:{next():number, normal(m?:number,s?:number):number},
 *          feint?: {from:number, fromLead:number, switchLead:number, morphDur:number} | null}} o
 * @returns {{t:number, uF:number, uB:number}[]} samples up to (not including) the landing at t = 0
 */
export function throwTrace(o) {
  const { move, fps, noise, lead, dur, backDelay = 15, enslave = 0.08, flightMs = 520, rng, feint = null } = o;
  const dt = 1000 / fps;
  const out = [];
  const shape = (/** @type {number} */ mv, /** @type {number} */ s, /** @type {number} */ sBack) => [
    mv === 0 ? 0 : minJerk(s),
    mv === 1 ? minJerk(sBack) : mv === 2 ? enslave * minJerk(s) : 0,
  ];
  for (let t = -flightMs + rng.next() * dt; t < 0; t += dt) {
    let [uF, uB] = shape(move, (t + lead) / dur, (t + lead - backDelay) / dur);
    if (feint) {
      const sw = -feint.switchLead;
      if (t < sw) {
        [uF, uB] = shape(feint.from, (t + feint.fromLead) / dur, (t + feint.fromLead) / dur);
      } else {
        const f0 = shape(feint.from, (sw + feint.fromLead) / dur, (sw + feint.fromLead) / dur);
        const s2 = minJerk((t - sw) / feint.morphDur);
        const target = [move === 0 ? 0 : 1, move === 1 ? 1 : move === 2 ? enslave : 0];
        uF = f0[0] + (target[0] - f0[0]) * s2;
        uB = f0[1] + (target[1] - f0[1]) * s2;
      }
    }
    out.push({ t, uF: uF + rng.normal(0, noise), uB: uB + rng.normal(0, noise) });
  }
  return out;
}

const DEFAULT_PRIOR = Object.freeze({ kind: 'lead', leadMeanMs: 170, leadSdMs: 85, durLogMean: Math.log(130), durLogSd: 0.5 });

/**
 * Run one flight through two detectors with the engine's revision policy.
 * @param {{t:number,uF:number,uB:number}[]} trace @param {{epsF:number, epsB:number, lossAversion:number, noLoss:boolean}} rules
 * @param {{noise:number, behaviourMove:number, prior?:number[], onsetPrior?:any, fps:number}} o
 */
export function playFlight(trace, rules, o) {
  const F = createOpeningDetector(), B = createOpeningDetector();
  F.reset(trace[0].t - 1); B.reset(trace[0].t - 1);
  const noiseVar = Math.max(o.noise, 0.035) ** 2;
  const pri = /** @type {any} */ (o.onsetPrior ?? DEFAULT_PRIOR);
  let cur = o.behaviourMove, commitT = trace[0].t, revisions = 0, hF = 0, hB = 0;
  for (let k = 0; k < trace.length; k++) {
    const f = trace[k];
    const tL = Math.max(0, f.t + 1000 / o.fps);
    F.observe(f.t, f.uF, noiseVar); B.observe(f.t, f.uB, noiseVar);
    const eF = F.evidence(tL, pri), eBs = B.evidence(tL, pri);
    const opened = Math.max(eF.logOpenLegal, eF.logOpenLate) > eF.logStay - 3 && eF.meanOnsetT !== null;
    const eBp = opened
      ? B.evidence(tL, { kind: 'absolute', onsetMeanT: /** @type {number} */ (eF.meanOnsetT) + 15, onsetSdMs: 40, durLogMean: pri.durLogMean, durLogSd: pri.durLogSd })
      : eBs;
    const belief = fuse({ prior: o.prior ?? [1 / 3, 1 / 3, 1 / 3], F: eF, Bstay: eBs, Bopen: eBp });
    hF = F.headingNow(); hB = B.headingNow();
    const lm = legalMassFor(belief, hF, hB, rules);
    const choice = chooseAction(lm.mass, rules, lm.legal);
    if (k >= 1 && shouldRevise(cur, choice, rules)) { cur = choice.action; commitT = f.t; revisions += 1; }
  }
  return { action: cur, leadMs: -commitT, revisions, hF, hB };
}

/** Referee verdict for a final move given the headings at the last in-air frame. */
export function isFoul(/** @type {number} */ move, /** @type {number} */ hF, /** @type {number} */ hB, /** @type {{epsF:number, epsB:number}} */ rules) {
  return foulNow(hF, hB, rules)[move];
}
