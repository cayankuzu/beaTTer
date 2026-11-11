// @ts-check
/**
 * beaTTer v4 — stroke tracker: rhythm (beats), flight phases and landing from the palm centre's vertical
 * motion (pure).
 *
 * Signal: Y = cy / palmEma  — palm-centre height in palm lengths (PL); image y grows downward, so a
 * downward stroke has positive velocity. Thresholds are in PL and PL/s, hence independent of camera
 * distance. Two velocity estimates are kept, because they answer different questions:
 *
 *   fast  v  — constant-velocity Kalman filter [Kalman1960] with a high gain. It follows a stroke with
 *              almost no lag, which is what dating the END of a descent needs, but on a motionless hand
 *              it is close to a frame difference: its noise is about sqrt(2) * jitter / frame interval.
 *   slow  vS — least-squares slope of Y over the last `slowWindowMs`. Its noise is several times smaller
 *              and does not grow with the frame rate, at the price of about half a window of lag.
 *
 * Starts of motion (descent, upswing) must be confirmed by the slow estimate, and "still" is defined on
 * the slow estimate alone; a hand that only jitters therefore neither starts strokes nor stops being
 * still. The end of a descent uses the fast estimate.
 *
 * A "bottom" (beat / landing) is the frame at which the downward velocity has decayed to a fraction of
 * the stroke's own peak velocity. For a minimum-jerk stroke [FlashHogan1985] 20 % of peak velocity is
 * reached at 87 % of the stroke duration, where 98 % of the amplitude has been covered — i.e. the event
 * marks the end of the descent, never its middle (the previous version fired at the mid-line crossing,
 * 100-150 ms before the true bottom).
 *
 * Every descent ends in exactly one event:
 *   'bottom'      amplitude and peak speed reach the beat thresholds (counts as a beat / landing);
 *   'weakBottom'  a real but small stroke (the engine may accept it as a soft landing);
 *   'falseStart'  too small to be a stroke at all (jitter, a twitch): nothing happened.
 */

import { Kalman1D } from './filters.js';

export const DEFAULTS = Object.freeze({
  /** Kalman process-noise density for palm height (PL^2 / s^3): fast strokes reach ~200 PL/s^2. */
  q: 900,
  /** Kalman measurement variance (PL^2): landmark jitter of about 0.025 PL. */
  r: 0.000625,
  /** Time constant of the palm-size average used for normalisation (ms). */
  palmTauMs: 500,
  /** Upward speed that starts an upswing (PL/s). */
  vUp: 1.0,
  /** Speed below which an upswing is considered to have reached its apex (PL/s). */
  vApex: 0.3,
  /** Downward speed that starts a descent (PL/s). */
  vDown: 1.2,
  /** Window of the slow (least-squares) velocity estimate (ms); at least three samples are used. */
  slowWindowMs: 110,
  /** A start needs the slow estimate to agree: |vS| >= confirmFrac * threshold, same direction. */
  confirmFrac: 0.5,
  /** A descent ends when speed <= stopFrac * peak speed of that descent (dimensionless). */
  stopFrac: 0.2,
  /** ... or when speed <= vStopFloor (PL/s). */
  vStopFloor: 0.4,
  /** A descent is not ended before it has lasted this long (ms): real strokes take >= 100 ms. */
  minDescentMs: 40,
  /** The palm counts as "still" while |vS| <= stillSpeed (PL/s). */
  stillSpeed: 0.8,
  /** Minimum descent amplitude for a stroke to count as a beat (PL). */
  minAmplitudePL: 0.45,
  /** Minimum peak descent speed for a stroke to count as a beat (PL/s). */
  minPeakSpeedPL: 2.5,
  /** A descent below the beat thresholds is still a (weak) stroke from this amplitude and peak speed. */
  weakAmplitudePL: 0.15,
  weakPeakSpeedPL: 1.5,
  /** Rhythm is dropped after maxGapFactor * period without a bottom (dimensionless). */
  maxGapFactor: 1.9,
  /** Period assumed before two bottoms exist (ms). */
  defaultPeriodMs: 520,
  /** Descent duration assumed before any stroke of this player has been timed (ms). An assumption. */
  defaultDescentMs: 200,
  /** A gap between samples longer than this resets the tracker (ms). */
  lostMs: 350,
  /** Threshold multiplier chosen by the user (1 = normal; < 1 more sensitive). */
  sensitivity: 1,
});

/**
 * @typedef {{type:'bottom', t:number, index:number, amplitudePL:number, peakSpeedPL:number, descentMs:number|null, y:number}
 *  | {type:'weakBottom', t:number, amplitudePL:number, peakSpeedPL:number, descentMs:number|null, y:number}
 *  | {type:'falseStart', t:number, y:number}
 *  | {type:'apex', t:number, y:number}
 *  | {type:'descentStart', t:number, y:number}
 *  | {type:'rhythmReset', t:number, reason:'timeout'|'lost'}} StrokeEvent
 */

/**
 * @typedef {Object} StrokeState
 * @property {'REST'|'UP'|'TOP'|'DOWN'} phase
 * @property {number} beatCount
 * @property {number|null} periodMs
 * @property {number|null} lastBottomT
 * @property {number|null} apexT            apex of the stroke in progress (null once it has landed)
 * @property {number|null} descentStartT    start of the descent in progress
 * @property {number|null} meanDescentMs    mean descent duration of the strokes counted so far
 * @property {number|null} meanApexToBottomMs
 * @property {number|null} meanBottomY
 * @property {number|null} meanPeakSpeed
 * @property {number} y   filtered height (PL)
 * @property {number} vy  fast vertical velocity (PL/s, positive = downward)
 * @property {number} vSlow slow vertical velocity (PL/s)
 * @property {number} vPeak peak speed of the descent in progress
 * @property {number|null} stillSinceT      start of the current interval with |vSlow| <= stillSpeed
 */

/** @param {number[]} a */
const meanOf = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/**
 * @param {Partial<typeof DEFAULTS>} [cfg]
 */
export function createStrokeTracker(cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  const s = Math.max(0.2, c.sensitivity);
  const vUp = c.vUp * s, vDown = c.vDown * s, minAmp = c.minAmplitudePL * s, minPeak = c.minPeakSpeedPL * s;
  const weakAmp = c.weakAmplitudePL * s, weakPeak = c.weakPeakSpeedPL * s;
  const kf = new Kalman1D({ q: c.q, r: c.r, p0: 4 });

  /** @type {'REST'|'UP'|'TOP'|'DOWN'} */
  let phase = 'REST';
  /** @type {number|null} */ let lastT = null;
  /** @type {number|null} */ let palmEma = null;
  let beatCount = 0;
  /** @type {number[]} */ let bottoms = [];
  /** @type {number[]} */ let descents = [];
  /** @type {number[]} */ let apexToBottoms = [];
  /** @type {number[]} */ let bottomYs = [];
  /** @type {number[]} */ let peakSpeeds = [];
  /** @type {number|null} */ let apexT = null;
  /** @type {number|null} */ let descentStartT = null;
  /** @type {number|null} */ let stillSinceT = null;
  /** @type {{t:number, Y:number}[]} */ let win = [];
  let vSlow = 0;
  let topY = Infinity; // smallest Y (highest point) since the last bottom
  let yStart = 0;
  let vPeak = 0;

  const resetRhythm = () => {
    beatCount = 0; bottoms = []; descents = []; apexToBottoms = []; bottomYs = []; peakSpeeds = [];
    apexT = null; descentStartT = null;
  };

  const reset = () => {
    resetRhythm();
    phase = 'REST'; lastT = null; palmEma = null; stillSinceT = null; topY = Infinity; vPeak = 0;
    win = []; vSlow = 0;
    kf.reset();
  };

  const periodMs = () => {
    const n = bottoms.length;
    if (n < 2) return null;
    if (n === 2) return bottoms[1] - bottoms[0];
    return (bottoms[n - 1] - bottoms[n - 3]) / 2;
  };

  /** Least-squares slope of the raw height over the window (PL/s); 0 until three samples exist. */
  const slowVelocity = () => {
    const n = win.length;
    if (n < 3) return 0;
    let st = 0, sy = 0;
    for (const w of win) { st += w.t; sy += w.Y; }
    const mt = st / n, my = sy / n;
    let num = 0, den = 0;
    for (const w of win) { const d = w.t - mt; num += d * (w.Y - my); den += d * d; }
    return den > 0 ? (1000 * num) / den : 0;
  };

  /**
   * @param {number} t capture time (ms) @param {number} cy palm centre y (image-height units)
   * @param {number} palm palm size (image-height units)
   * @returns {StrokeEvent[]}
   */
  const push = (t, cy, palm) => {
    /** @type {StrokeEvent[]} */ const ev = [];
    if (!Number.isFinite(t) || !Number.isFinite(cy) || !(palm > 0) || !Number.isFinite(palm)) return ev;
    if (lastT !== null && t <= lastT) return ev; // duplicate or out-of-order frame
    const dt = lastT === null ? 0 : t - lastT;
    if (lastT !== null && dt > c.lostMs) {
      const hadRhythm = beatCount > 0;
      reset();
      if (hadRhythm) ev.push({ type: 'rhythmReset', t, reason: 'lost' });
    }
    palmEma = palmEma === null ? palm : palmEma + (1 - Math.exp(-dt / c.palmTauMs)) * (palm - palmEma);
    const Y = cy / palmEma;
    kf.step(Y, dt / 1000);
    lastT = t;
    const y = kf.x, vy = kf.v;

    win.push({ t, Y });
    while (win.length > 3 && win[0].t < t - c.slowWindowMs) win.shift();
    vSlow = slowVelocity();

    if (Math.abs(vSlow) <= c.stillSpeed) { if (stillSinceT === null) stillSinceT = t; } else stillSinceT = null;
    if (y < topY) topY = y;

    if (phase === 'REST' || phase === 'TOP') {
      if (vy > vDown && vSlow >= c.confirmFrac * vDown) {
        phase = 'DOWN'; descentStartT = t; yStart = Math.min(topY, y); vPeak = vy;
        ev.push({ type: 'descentStart', t, y });
      } else if (vy < -vUp && vSlow <= -c.confirmFrac * vUp) {
        phase = 'UP';
      }
    } else if (phase === 'UP') {
      if (vy >= -c.vApex) {
        phase = 'TOP'; apexT = t;
        ev.push({ type: 'apex', t, y });
      }
    } else if (phase === 'DOWN') {
      if (vy > vPeak) vPeak = vy;
      const lasted = descentStartT === null ? Infinity : t - descentStartT;
      if (lasted >= c.minDescentMs && vy <= Math.max(c.stopFrac * vPeak, c.vStopFloor)) {
        const amplitude = y - yStart;
        const descentMs = descentStartT === null ? null : t - descentStartT;
        if (amplitude >= minAmp && vPeak >= minPeak) {
          beatCount += 1;
          bottoms.push(t);
          if (descentMs !== null) descents.push(descentMs);
          if (apexT !== null) apexToBottoms.push(t - apexT);
          bottomYs.push(y); peakSpeeds.push(vPeak);
          ev.push({ type: 'bottom', t, index: beatCount, amplitudePL: amplitude, peakSpeedPL: vPeak, descentMs, y });
          phase = 'REST'; apexT = null; topY = y;
        } else if (amplitude >= weakAmp && vPeak >= weakPeak) {
          ev.push({ type: 'weakBottom', t, amplitudePL: amplitude, peakSpeedPL: vPeak, descentMs, y });
          phase = 'REST'; apexT = null; topY = y;
        } else {
          // not a stroke: keep the apex and the top of the swing, the real descent may still come
          ev.push({ type: 'falseStart', t, y });
          phase = apexT !== null ? 'TOP' : 'REST';
        }
        descentStartT = null; vPeak = 0;
      }
    }

    if (beatCount > 0 && bottoms.length) {
      const gap = t - bottoms[bottoms.length - 1];
      if (gap > c.maxGapFactor * (periodMs() ?? c.defaultPeriodMs)) {
        resetRhythm();
        ev.push({ type: 'rhythmReset', t, reason: 'timeout' });
      }
    }
    return ev;
  };

  /** @returns {StrokeState} */
  const state = () => ({
    phase,
    beatCount,
    periodMs: periodMs(),
    lastBottomT: bottoms.length ? bottoms[bottoms.length - 1] : null,
    apexT,
    descentStartT,
    meanDescentMs: meanOf(descents),
    meanApexToBottomMs: meanOf(apexToBottoms),
    meanBottomY: meanOf(bottomYs),
    meanPeakSpeed: meanOf(peakSpeeds),
    y: kf.x,
    vy: kf.v,
    vSlow,
    vPeak,
    stillSinceT,
  });

  return { push, state, reset, resetRhythm };
}

/**
 * Predicted landing time of the stroke in progress, from the most specific source available:
 *  'descent' — descent start + typical descent duration (this round's strokes, else the player's habit);
 *  'tau'     — remaining distance / speed, the first-order time-to-contact estimate (no descent history);
 *  'apex'    — apex + typical apex-to-bottom time;
 *  'tempo'   — last bottom + period [WingKristofferson1973];
 *  'default' — descent start + defaultDescentMs: a plain assumption, used only for a stroke with no
 *              history at all (first single-stroke round of a new player).
 * @param {StrokeState} st
 * @param {number} tNow
 * @param {{meanDescentMs?: number|null, meanApexToBottomMs?: number|null, lastIntervalBias?: number}} [player] learned stroke habits
 * @returns {{tHat: number|null, source: 'descent'|'tau'|'apex'|'tempo'|'default'|null}}
 */
export function predictLanding(st, tNow, player = {}) {
  const descent = st.meanDescentMs ?? player.meanDescentMs ?? null;
  const a2b = st.meanApexToBottomMs ?? player.meanApexToBottomMs ?? null;
  if (st.phase === 'DOWN' && st.descentStartT !== null) {
    if (descent !== null) return { tHat: st.descentStartT + descent, source: 'descent' };
    if (st.vy > 0 && st.meanBottomY !== null && st.meanBottomY > st.y) {
      return { tHat: tNow + (1000 * (st.meanBottomY - st.y)) / st.vy, source: 'tau' };
    }
  }
  if (st.apexT !== null && a2b !== null && (st.lastBottomT === null || st.apexT > st.lastBottomT)) {
    return { tHat: st.apexT + a2b, source: 'apex' };
  }
  if (st.lastBottomT !== null && st.periodMs !== null) {
    const bias = Number.isFinite(player.lastIntervalBias) ? /** @type {number} */ (player.lastIntervalBias) : 0;
    return { tHat: st.lastBottomT + st.periodMs * (1 + bias), source: 'tempo' };
  }
  if (st.phase === 'DOWN' && st.descentStartT !== null) {
    return { tHat: st.descentStartT + DEFAULTS.defaultDescentMs, source: 'default' };
  }
  return { tHat: null, source: null };
}
