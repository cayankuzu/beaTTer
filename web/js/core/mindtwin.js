// @ts-check
/**
 * beaTTer v4 — MindTwin: a digital twin that shows where each finger will be a moment from now (pure).
 *
 * Five constant-velocity Kalman filters track the finger extensions; the twin is drawn at the state
 * extrapolated `horizonMs` ahead. Because that is a real forecast, its quality is measured, not claimed:
 * every forecast is stored with its target time and compared with what the hand actually did, and the
 * skill is reported against the persistence baseline ("the hand stays where it is"):
 *
 *        skill = 1 - MAE(forecast) / MAE(persistence)          (> 0: the forecast beats doing nothing)
 */

import { Kalman1D } from './filters.js';

export const DEFAULTS = Object.freeze({
  /** Forecast horizon (ms). */
  horizonMs: 120,
  /**
   * Kalman process-noise density for a finger extension (units^2/s^3) and measurement variance. Chosen
   * by a sweep over synthetic openings of 200-400 ms at 30/60 fps (skill 0.28-0.37); a stiffer filter
   * (larger q) forecasts worse because its velocity estimate is noisier.
   */
  q: 100,
  r: 0.0016,
  /**
   * Velocity soft-threshold in units of the velocity's own standard deviation:
   * v_eff = sign(v) * max(0, |v| - deadband * sd[v]). A velocity that is not clearly different from zero
   * is noise and must not move the twin (on a still hand an unthresholded forecast is WORSE than doing
   * nothing: measured skill -0.43).
   */
  deadband: 1.5,
  /** Error statistics use an exponential window of this many evaluations. */
  window: 300,
  /** Open / closed threshold for the agreement statistic. */
  openThreshold: 0.5,
});

/**
 * @param {Partial<typeof DEFAULTS>} [cfg]
 */
export function createTwinPredictor(cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const kf = [0, 1, 2, 3, 4].map(() => new Kalman1D({ q: c.q, r: c.r, p0: 1 }));
  /** @type {{t:number, ahead:number[], now:number[]}[]} */ let pending = [];
  /** @type {number|null} */ let lastT = null;
  /** @type {number[]|null} */ let lastE = null;
  const a = 1 / c.window;
  let n = 0, maePred = 0, maePersist = 0, agree = 0;

  const reset = () => { for (const k of kf) k.reset(); pending = []; lastT = null; lastE = null; };

  /**
   * Feed the measured extensions of one frame; returns the current and the forecast state.
   * @param {number} t capture time (ms) @param {number[]} e extension per finger (thumb..pinky)
   * @returns {{now:number[], ahead:number[], aheadSd:number[], horizonMs:number}|null}
   */
  const push = (t, e) => {
    if (!Number.isFinite(t) || !Array.isArray(e) || e.length < 5 || !e.every(Number.isFinite)) return null;
    if (lastT !== null && t <= lastT) return null;
    if (lastT !== null && t - lastT > 400) reset(); // the hand was away: start over
    const prevT = lastT, prevE = lastE;
    const dt = prevT === null ? 0 : (t - prevT) / 1000;

    // score the forecasts whose target time lies between the previous frame and this one, against the
    // measurement interpolated to the target time
    while (pending.length && pending[0].t <= t) {
      const p = /** @type {{t:number, ahead:number[], now:number[]}} */ (pending.shift());
      if (prevT === null || prevE === null || p.t < prevT) continue;
      const w = (p.t - prevT) / (t - prevT);
      let ep = 0, eb = 0, ag = 0;
      for (let f = 0; f < 5; f++) {
        const actual = prevE[f] + w * (e[f] - prevE[f]);
        ep += Math.abs(p.ahead[f] - actual) / 5;
        eb += Math.abs(p.now[f] - actual) / 5;
        ag += ((p.ahead[f] > c.openThreshold) === (actual > c.openThreshold) ? 1 : 0) / 5;
      }
      n += 1;
      const k = Math.max(a, 1 / n);
      maePred += k * (ep - maePred); maePersist += k * (eb - maePersist); agree += k * (ag - agree);
    }

    for (let f = 0; f < 5; f++) kf[f].step(e[f], dt);
    lastT = t; lastE = e.slice(0, 5);
    const h = c.horizonMs / 1000;
    const now = kf.map((k) => k.x);
    const ahead = [], aheadSd = [];
    for (const k of kf) {
      const excess = Math.abs(k.v) - c.deadband * Math.sqrt(Math.max(0, k.p11));
      const vEff = excess > 0 ? Math.sign(k.v) * excess : 0;
      ahead.push(Math.min(1.05, Math.max(-0.05, k.x + vEff * h)));
      aheadSd.push(Math.sqrt(Math.max(0, k.ahead(h).variance)));
    }
    pending.push({ t: t + c.horizonMs, ahead, now });
    if (pending.length > 240) pending.shift();
    return { now, ahead, aheadSd, horizonMs: c.horizonMs };
  };

  /** Measured forecast quality so far (nulls until something has been evaluated). */
  const skill = () => ({
    n,
    maeForecast: n ? maePred : null,
    maePersistence: n ? maePersist : null,
    skill: n && maePersist > 1e-9 ? 1 - maePred / maePersist : null,
    agreement: n ? agree : null,
    horizonMs: c.horizonMs,
  });

  return { push, skill, reset, cfg: c };
}
