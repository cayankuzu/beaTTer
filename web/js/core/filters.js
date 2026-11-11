// @ts-check
/**
 * beaTTer v4 — signal filters (pure, no DOM).
 *
 *  - OneEuroFilter : speed-adaptive low-pass for DISPLAY smoothing only  [Casiez2012]
 *  - Kalman1D      : constant-velocity Kalman filter (position + velocity + covariance) [Kalman1960]
 *  - RunningStats  : exact online mean / variance (Welford's recurrence)
 *  - EwStats       : exponentially weighted mean / variance (time-constant in samples)
 *
 * The science core never differentiates raw signals numerically: velocities come from Kalman1D, and the
 * opening detector uses raw (unfiltered) samples on purpose because it needs independent noise.
 */

/** @param {unknown} x */
const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * 1-euro filter: first-order low-pass whose cutoff rises with the (low-passed) speed of the signal.
 *   alpha = 1 / (1 + tau/Te),  tau = 1 / (2*pi*fc),  fc = minCutoff + beta * |dx_hat|
 * Units matter: `beta` multiplies a speed in (signal units)/s, so it must be tuned for the unit of the
 * signal that is fed in (the previous version fed normalised coordinates into pixel-scale parameters).
 */
export class OneEuroFilter {
  /** @param {{minCutoff?: number, beta?: number, dCutoff?: number}} [cfg] cutoffs in Hz, beta in Hz per (unit/s) */
  constructor({ minCutoff = 1.0, beta = 0.02, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.reset();
  }

  reset() {
    /** @type {number|null} */ this._x = null;
    this._dx = 0;
    /** @type {number|null} */ this._t = null;
  }

  /** @param {number} cutoffHz @param {number} dtSec */
  static alpha(cutoffHz, dtSec) {
    const tau = 1 / (2 * Math.PI * cutoffHz);
    return 1 / (1 + tau / dtSec);
  }

  /**
   * @param {number} x   raw sample
   * @param {number} tMs timestamp in ms (any monotonic clock)
   * @returns {number} filtered sample (the raw sample itself for the first call or non-increasing time)
   */
  filter(x, tMs) {
    if (!finite(x) || !finite(tMs)) return this._x ?? (finite(x) ? x : 0);
    if (this._x === null || this._t === null || tMs <= this._t) {
      if (this._x === null) this._x = x;
      this._t = tMs;
      return this._x;
    }
    const dt = (tMs - this._t) / 1000;
    this._t = tMs;
    const rawDx = (x - this._x) / dt;
    this._dx += OneEuroFilter.alpha(this.dCutoff, dt) * (rawDx - this._dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this._dx);
    this._x += OneEuroFilter.alpha(cutoff, dt) * (x - this._x);
    return this._x;
  }
}

/**
 * Constant-velocity Kalman filter with white-acceleration process noise.
 *   state x = [pos, vel],  F = [[1, dt], [0, 1]],  H = [1, 0]
 *   Q = q * [[dt^3/3, dt^2/2], [dt^2/2, dt]]   (q: acceleration spectral density, units^2 / s^3)
 */
export class Kalman1D {
  /**
   * @param {{q: number, r: number, x0?: number, v0?: number, p0?: number}} cfg
   *   q: process noise density; r: measurement variance; p0: initial variance of both states
   */
  constructor({ q, r, x0 = 0, v0 = 0, p0 = 1 }) {
    this.q = q;
    this.r = r;
    this.p0 = p0;
    this.reset(x0, v0);
  }

  /** @param {number} [x0] @param {number} [v0] */
  reset(x0 = 0, v0 = 0) {
    this.x = x0;
    this.v = v0;
    this.p00 = this.p0;
    this.p01 = 0;
    this.p11 = this.p0;
    this.n = 0;
  }

  /** @param {number} dtSec time step in seconds (ignored unless positive and finite) */
  predict(dtSec) {
    if (!finite(dtSec) || dtSec <= 0) return;
    const dt = dtSec;
    this.x += this.v * dt;
    const { p00, p01, p11, q } = this;
    this.p00 = p00 + 2 * dt * p01 + dt * dt * p11 + (q * dt * dt * dt) / 3;
    this.p01 = p01 + dt * p11 + (q * dt * dt) / 2;
    this.p11 = p11 + q * dt;
  }

  /** @param {number} z measurement @param {number} [rOverride] measurement variance for this sample */
  update(z, rOverride) {
    if (!finite(z)) return;
    const r = finite(rOverride) && /** @type {number} */ (rOverride) > 0 ? /** @type {number} */ (rOverride) : this.r;
    const s = this.p00 + r;
    const k0 = this.p00 / s;
    const k1 = this.p01 / s;
    const innovation = z - this.x;
    this.x += k0 * innovation;
    this.v += k1 * innovation;
    const { p00, p01, p11 } = this;
    this.p00 = (1 - k0) * p00;
    this.p01 = (1 - k0) * p01;
    this.p11 = p11 - k1 * p01;
    this.n += 1;
  }

  /** predict + update. @param {number} z @param {number} dtSec @param {number} [rOverride] */
  step(z, dtSec, rOverride) {
    if (this.n === 0 && finite(z)) {
      this.x = z; // start at the first measurement instead of dragging in from x0
    } else {
      this.predict(dtSec);
    }
    this.update(z, rOverride);
  }

  /**
   * Extrapolate `hSec` seconds ahead without changing the filter.
   * @param {number} hSec
   * @returns {{x: number, variance: number}}
   */
  ahead(hSec) {
    const h = finite(hSec) && hSec > 0 ? hSec : 0;
    return {
      x: this.x + this.v * h,
      variance: this.p00 + 2 * h * this.p01 + h * h * this.p11 + (this.q * h * h * h) / 3,
    };
  }
}

/** Exact online mean and unbiased variance (Welford). */
export class RunningStats {
  constructor() {
    this.n = 0;
    this._mean = 0;
    this._m2 = 0;
  }

  /** @param {number} x */
  push(x) {
    if (!finite(x)) return;
    this.n += 1;
    const d = x - this._mean;
    this._mean += d / this.n;
    this._m2 += d * (x - this._mean);
  }

  get mean() { return this.n > 0 ? this._mean : null; }
  get variance() { return this.n > 1 ? this._m2 / (this.n - 1) : null; }
  get sd() { const v = this.variance; return v === null ? null : Math.sqrt(v); }

  toJSON() { return { n: this.n, mean: this._mean, m2: this._m2 }; }

  /** @param {any} o */
  static fromJSON(o) {
    const s = new RunningStats();
    if (o && finite(o.n) && finite(o.mean) && finite(o.m2) && o.n >= 0) {
      s.n = o.n; s._mean = o.mean; s._m2 = Math.max(0, o.m2);
    }
    return s;
  }
}

/** Exponentially weighted mean / variance; `tau` is the memory length in samples (weight e^-1 after tau). */
export class EwStats {
  /** @param {number} tau */
  constructor(tau) {
    this.alpha = 1 - Math.exp(-1 / Math.max(1, tau));
    this.n = 0;
    this._mean = 0;
    this._var = 0;
  }

  /** @param {number} x */
  push(x) {
    if (!finite(x)) return;
    this.n += 1;
    if (this.n === 1) { this._mean = x; this._var = 0; return; }
    // bias-corrected warm-up: behave like a plain average until alpha becomes the smaller step
    const a = Math.max(this.alpha, 1 / this.n);
    const d = x - this._mean;
    this._mean += a * d;
    this._var = (1 - a) * (this._var + a * d * d);
  }

  get mean() { return this.n > 0 ? this._mean : null; }
  get variance() { return this.n > 1 ? this._var : null; }
  get sd() { const v = this.variance; return v === null ? null : Math.sqrt(v); }
}
