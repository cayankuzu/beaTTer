/**
 * beaTTer // RPS Predictive Engine  (pure logic — no DOM, fully unit-testable)
 *
 * The engine decides BEFORE the player's hand lands, and everything it uses is
 * measured data. Pipeline per fresh camera frame:
 *
 *   landmarks ─► HandFeatureExtractor  (joint-angle finger extension, rotation/scale invariant)
 *             ─► KinematicTracker      (time-aware smoothing, finger velocities, hand speed in palm-lengths/s)
 *             ─► SwingDetector         (beats = bottoms of the shaking motion → tempo)
 *             ─► PatternPredictor      (history experts + Hedge weighting → prior before any motion)
 *             ─► live Bayesian fusion  (opening onset, back/front finger ratio, temporal survival model)
 *             ─► LOCK (sealed, immutable) ─► IMPACT ─► REVEAL (separate referee classifier) ─► learn
 *
 * Honesty guarantees (enforced by structure, verified by tests):
 *   - The AI move is ALWAYS counter(lockedPrediction); it can never be changed after the lock.
 *   - The final player move is read from the referee classifier only AFTER impact.
 *   - Every lock gets a seal = FNV-1a(turn|prediction|counter|time|nonce) shown at lock time
 *     and verified at reveal.
 *   - Lead times are measured timestamps, never constants.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) Object.assign(root, api);
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null), function () {
  "use strict";

  // ==================== 0. UTILITIES ====================
  const MOVES = ["ROCK", "PAPER", "SCISSORS"];
  const COUNTER = { ROCK: "PAPER", PAPER: "SCISSORS", SCISSORS: "ROCK" }; // move that beats key
  const PREY = { ROCK: "SCISSORS", PAPER: "ROCK", SCISSORS: "PAPER" };    // move that key beats
  const FINGER_IDX = { index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
  const LONG_FINGERS = ["index", "middle", "ring", "pinky"];
  const ALL_FINGERS = ["thumb", "index", "middle", "ring", "pinky"];
  const FLEX_OPEN = 30;     // deg, summed MCP+PIP+DIP flexion of a straight finger
  const FLEX_CURLED = 210;  // deg, summed flexion of a finger in a fist

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const sigmoid = (x) => 1 / (1 + Math.exp(-clamp(x, -40, 40)));
  const uniform = () => ({ ROCK: 1 / 3, PAPER: 1 / 3, SCISSORS: 1 / 3 });

  function normalize(d, floor = 1e-6) {
    const o = {};
    let s = 0;
    for (const m of MOVES) {
      const v = d && Number.isFinite(d[m]) ? d[m] : 0;
      o[m] = Math.max(floor, v);
      s += o[m];
    }
    for (const m of MOVES) o[m] /= s;
    return o;
  }

  function argmax(d) {
    let best = "ROCK";
    for (const m of MOVES) if (d[m] > d[best]) best = m;
    return best;
  }

  /** Result from the player's perspective: "USER" (player wins), "AI", or "TIE". */
  function judge(player, ai) {
    if (player === ai) return "TIE";
    return COUNTER[ai] === player ? "USER" : "AI";
  }

  function entropyBits(d) {
    let h = 0;
    for (const m of MOVES) if (d[m] > 0) h -= d[m] * Math.log2(d[m]);
    return h;
  }

  /** Standard normal CDF (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7). */
  function normalCdf(z) {
    const x = Math.abs(z) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).toUpperCase().padStart(8, "0");
  }

  function randomNonce() {
    try {
      const c = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
      if (c && c.getRandomValues) {
        const a = new Uint32Array(1);
        c.getRandomValues(a);
        return a[0].toString(16).toUpperCase().padStart(8, "0");
      }
    } catch (e) { /* fall through */ }
    return Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, "0");
  }

  function median(arr) {
    if (!arr.length) return NaN;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  const sub3 = (a, b) => ({ x: b.x - a.x, y: b.y - a.y, z: (b.z || 0) - (a.z || 0) });
  const len3 = (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  function angDeg(u, v) {
    const lu = len3(u), lv = len3(v);
    if (lu < 1e-9 || lv < 1e-9) return 0;
    const c = clamp((u.x * v.x + u.y * v.y + u.z * v.z) / (lu * lv), -1, 1);
    return Math.acos(c) * 57.29577951308232;
  }
  function validLms(l) {
    if (!l || l.length < 21) return false;
    for (let i = 0; i < 21; i++) {
      const p = l[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    }
    return true;
  }

  // ==================== 1. HAND FEATURE EXTRACTOR ====================
  /**
   * Finger extension from summed joint flexion angles (MCP + PIP + DIP).
   * Angles are invariant to hand rotation, distance and camera mirroring.
   */
  class HandFeatureExtractor {
    extract(world, image) {
      if (!validLms(image)) return null;
      const g = validLms(world) ? world : image;
      const w = g[0];
      const ext = {};
      const flex = {};
      for (const f of LONG_FINGERS) {
        const [a, b, c, d] = FINGER_IDX[f];
        const total =
          angDeg(sub3(w, g[a]), sub3(g[a], g[b])) +
          angDeg(sub3(g[a], g[b]), sub3(g[b], g[c])) +
          angDeg(sub3(g[b], g[c]), sub3(g[c], g[d]));
        flex[f] = total;
        ext[f] = clamp((FLEX_CURLED - total) / (FLEX_CURLED - FLEX_OPEN), 0, 1);
      }
      const palm = Math.max(1e-6, len3(sub3(g[0], g[9])));
      const tFlex = angDeg(sub3(g[1], g[2]), sub3(g[2], g[3])) + angDeg(sub3(g[2], g[3]), sub3(g[3], g[4]));
      const abduction = len3(sub3(g[4], g[5])) / palm;
      ext.thumb = clamp(0.5 * clamp((100 - tFlex) / 80, 0, 1) + 0.5 * clamp((abduction - 0.35) / 0.55, 0, 1), 0, 1);
      const spread = angDeg(sub3(g[5], g[8]), sub3(g[9], g[12]));

      const cx = (image[0].x + image[9].x) * 0.5;
      const cy = (image[0].y + image[9].y) * 0.5;
      const palmImg = Math.max(0.02, Math.hypot(image[9].x - image[0].x, image[9].y - image[0].y));
      return { ext, flex, spread, cx, cy, palmImg };
    }
  }

  // ==================== 2. KINEMATIC TRACKER ====================
  /** Time-constant based smoothing (frame-rate independent) + derivatives. */
  class KinematicTracker {
    constructor() { this.reset(); }

    reset() {
      this.t = null;
      this.ext = null;
      this.vel = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
      this.cx = 0; this.cy = 0; this.vx = 0; this.vy = 0; this.ay = 0;
      this.palm = 0.1;
      this.spread = 0;
    }

    update(t, f) {
      if (this.t === null || t - this.t > 250 || t <= this.t) {
        if (this.t !== null && t <= this.t) return this.state(); // duplicate / out-of-order frame: ignore
        this.t = t;
        this.ext = Object.assign({}, f.ext);
        for (const k of ALL_FINGERS) this.vel[k] = 0;
        this.cx = f.cx; this.cy = f.cy; this.vx = 0; this.vy = 0; this.ay = 0;
        this.palm = f.palmImg;
        this.spread = f.spread;
        return this.state();
      }
      const dt = clamp((t - this.t) / 1000, 0.004, 0.1);
      this.t = t;
      const aExt = 1 - Math.exp(-dt / 0.030);
      const aVel = 1 - Math.exp(-dt / 0.045);
      const aPos = 1 - Math.exp(-dt / 0.020);
      const aPalm = 1 - Math.exp(-dt / 0.300);

      for (const k of ALL_FINGERS) {
        const prev = this.ext[k];
        this.ext[k] += aExt * (f.ext[k] - this.ext[k]);
        const inst = (this.ext[k] - prev) / dt;
        this.vel[k] += aVel * (inst - this.vel[k]);
      }
      this.spread += aExt * (f.spread - this.spread);
      this.palm += aPalm * (f.palmImg - this.palm);

      const px = this.cx, py = this.cy;
      this.cx += aPos * (f.cx - this.cx);
      this.cy += aPos * (f.cy - this.cy);
      const ivx = (this.cx - px) / dt / this.palm;
      const ivy = (this.cy - py) / dt / this.palm;
      const pvy = this.vy;
      this.vx += aVel * (ivx - this.vx);
      this.vy += aVel * (ivy - this.vy);
      this.ay += aVel * ((this.vy - pvy) / dt - this.ay);
      return this.state();
    }

    state() {
      return {
        t: this.t,
        ext: Object.assign({}, this.ext),
        vel: Object.assign({}, this.vel),
        spread: this.spread,
        cx: this.cx, cy: this.cy,
        vx: this.vx, vy: this.vy, ay: this.ay,
        speed: Math.hypot(this.vx, this.vy),
        palmImg: this.palm
      };
    }
  }

  // ==================== 3. SWING (BEAT) DETECTOR ====================
  /** A beat is the BOTTOM of a downstroke (fist "lands"), like the spoken "taş… kağıt… makas…". */
  class SwingDetector {
    constructor() { this.setSensitivity(3); this.reset(); }

    setSensitivity(level) {
      const l = clamp(Math.round(Number(level) || 3), 1, 5);
      const k = [0.55, 0.75, 1.0, 1.3, 1.65][l - 1];
      this.level = l;
      this.vOn = 1.4 * k;        // palm-lengths / s to start a downstroke
      this.vOff = 0.55 * k;      // below this the hand has "landed"
      this.minTravel = 0.45 * k; // palm-lengths travelled downward
    }

    reset() {
      this.state = "IDLE";
      this.downT = 0; this.downY = 0; this.peakV = 0;
      this.lastBottomT = -1e9;
    }

    update(k) {
      const ev = [];
      const t = k.t, vy = k.vy;
      if (this.state === "IDLE" || this.state === "UP") {
        if (vy > this.vOn && t - this.lastBottomT > 150) {
          this.state = "DOWN";
          this.downT = t; this.downY = k.cy; this.peakV = vy;
          ev.push({ type: "down", t });
        }
      } else if (this.state === "DOWN") {
        this.peakV = Math.max(this.peakV, vy);
        if (vy < this.vOff) {
          const travel = (k.cy - this.downY) / Math.max(0.02, k.palmImg);
          if (travel >= this.minTravel && t - this.lastBottomT >= 200) {
            ev.push({ type: "bottom", t, travel, peakV: this.peakV, durMs: t - this.downT });
            this.lastBottomT = t;
            this.state = "BOTTOM";
          } else {
            this.state = "IDLE";
          }
        } else if (t - this.downT > 900) {
          this.state = "IDLE";
        }
      } else if (this.state === "BOTTOM") {
        if (vy < -this.vOn * 0.5) this.state = "UP";
        else if (t - this.lastBottomT > 1200) this.state = "IDLE";
      }
      return ev;
    }
  }

  // ==================== 4. PERSONAL ONSET TIMING MODEL ====================
  /** When (as a fraction of the beat-3 → impact interval) does THIS player start opening the hand? */
  class OnsetModel {
    constructor() { this.samples = []; this.mu0 = 0.55; this.sd0 = 0.22; this.kappa = 3; }
    add(phase) {
      if (!Number.isFinite(phase) || phase < -0.6 || phase > 1.6) return;
      this.samples.push(phase);
      if (this.samples.length > 40) this.samples.shift();
    }
    params() {
      const n = this.samples.length;
      const sum = this.samples.reduce((a, b) => a + b, 0);
      const mean = (this.kappa * this.mu0 + sum) / (this.kappa + n);
      let ss = this.kappa * (this.sd0 * this.sd0 + (this.mu0 - mean) * (this.mu0 - mean));
      for (const x of this.samples) ss += (x - mean) * (x - mean);
      const sd = clamp(Math.sqrt(ss / (this.kappa + n)), 0.08, 0.4);
      return { mu: mean, sd, n };
    }
    /** P(onset has NOT happened yet by phase | player will open the hand). */
    survival(phase) {
      const p = this.params();
      return 1 - normalCdf((phase - p.mu) / p.sd);
    }
  }

  // ==================== 5. PATTERN PREDICTOR (HISTORY EXPERTS + HEDGE) ====================
  const EXPERTS = [
    { id: "freq", name: "Frekans" },
    { id: "recent", name: "Yakın geçmiş" },
    { id: "markov1", name: "Markov-1" },
    { id: "markov2", name: "Markov-2" },
    { id: "wsls", name: "Kazan-kal / kaybet-değiş" },
    { id: "react", name: "AI hamlesine tepki" },
    { id: "tell", name: "Yumruk mikro-ipucu" }
  ];
  const TELL_VAR_FLOOR = [0.004, 0.004, 0.004, 0.004, 0.006, 0.003];

  function shiftOf(prev, next) {
    if (next === prev) return "stay";
    return next === COUNTER[prev] ? "up" : "down";
  }
  function fromShift(last, c) {
    return normalize({ [last]: c.stay, [COUNTER[last]]: c.up, [PREY[last]]: c.down });
  }

  class PatternPredictor {
    constructor() { this.reset(); }

    reset() {
      this.history = [];
      this.weights = {};
      this.hits = {};
      this.trials = {};
      for (const e of EXPERTS) {
        this.weights[e.id] = 1 / EXPERTS.length;
        this.hits[e.id] = 0;
        this.trials[e.id] = 0;
      }
      this._cache = null;
    }

    _expert(id, tell) {
      const h = this.history;
      const n = h.length;
      const last = h[n - 1];
      const last2 = h[n - 2];
      switch (id) {
        case "freq": {
          // Weak first-throw bias reported for casual players (rock slightly favoured).
          const c = { ROCK: 1.15, PAPER: 1.0, SCISSORS: 0.95 };
          for (const r of h) c[r.p] += 1;
          return normalize(c);
        }
        case "recent": {
          const c = { ROCK: 0.5, PAPER: 0.5, SCISSORS: 0.5 };
          let w = 1;
          for (let i = n - 1; i >= 0 && i >= n - 20; i--) { c[h[i].p] += w; w *= 0.7; }
          return normalize(c);
        }
        case "markov1": {
          if (!last) return uniform();
          const c = { ROCK: 0.5, PAPER: 0.5, SCISSORS: 0.5 };
          for (let i = 1; i < n; i++) if (h[i - 1].p === last.p) c[h[i].p] += 1;
          return normalize(c);
        }
        case "markov2": {
          if (!last2) return uniform();
          const c = { ROCK: 0.5, PAPER: 0.5, SCISSORS: 0.5 };
          for (let i = 2; i < n; i++) if (h[i - 2].p === last2.p && h[i - 1].p === last.p) c[h[i].p] += 1;
          return normalize(c);
        }
        case "wsls": {
          if (!last) return uniform();
          const prior = {
            W: { stay: 1.4, up: 1.0, down: 1.0 },
            L: { stay: 0.8, up: 1.1, down: 1.1 },
            T: { stay: 1.0, up: 1.0, down: 1.0 }
          }[last.o] || { stay: 1, up: 1, down: 1 };
          const c = Object.assign({}, prior);
          for (let i = 1; i < n; i++) if (h[i - 1].o === last.o) c[shiftOf(h[i - 1].p, h[i].p)] += 1;
          return fromShift(last.p, c);
        }
        case "react": {
          if (!last) return uniform();
          const c = { copy: 1, beat: 1, lose: 1 };
          for (let i = 1; i < n; i++) {
            const a = h[i - 1].a, p = h[i].p;
            c[p === a ? "copy" : (p === COUNTER[a] ? "beat" : "lose")] += 1;
          }
          return normalize({ [last.a]: c.copy, [COUNTER[last.a]]: c.beat, [PREY[last.a]]: c.lose });
        }
        case "tell": return this._tellExpert(tell);
        default: return uniform();
      }
    }

    /** Gaussian naive Bayes over the player's own fist posture + tempo during the count-in. */
    _tellExpert(tell) {
      if (!tell || tell.length !== TELL_VAR_FLOOR.length) return uniform();
      const rows = this.history.filter(r => Array.isArray(r.tell) && r.tell.length === tell.length);
      if (rows.length < 4) return uniform();
      const D = tell.length;
      const gMean = new Array(D).fill(0);
      for (const r of rows) for (let d = 0; d < D; d++) gMean[d] += r.tell[d] / rows.length;
      const gVar = new Array(D).fill(0);
      for (const r of rows) for (let d = 0; d < D; d++) gVar[d] += (r.tell[d] - gMean[d]) ** 2 / rows.length;
      const logp = {};
      for (const m of MOVES) {
        const cls = rows.filter(r => r.p === m);
        let lp = Math.log((cls.length + 1) / (rows.length + 3));
        for (let d = 0; d < D; d++) {
          const k = 2; // shrink toward global statistics
          let mean = gMean[d] * k, sq = 0;
          for (const r of cls) mean += r.tell[d];
          mean /= (k + cls.length);
          for (const r of cls) sq += (r.tell[d] - mean) ** 2;
          const v = Math.max(TELL_VAR_FLOOR[d], (k * (gVar[d] + (gMean[d] - mean) ** 2) + sq) / (k + cls.length));
          lp += 0.5 * (-0.5 * Math.log(2 * Math.PI * v) - ((tell[d] - mean) ** 2) / (2 * v)); // tempered x0.5
        }
        logp[m] = lp;
      }
      const mx = Math.max(logp.ROCK, logp.PAPER, logp.SCISSORS);
      return normalize({ ROCK: Math.exp(logp.ROCK - mx), PAPER: Math.exp(logp.PAPER - mx), SCISSORS: Math.exp(logp.SCISSORS - mx) });
    }

    predict(tell = null) {
      const key = tell ? null : this.history.length;
      if (key !== null && this._cache && this._cache.key === key) return this._cache.value;
      const experts = EXPERTS.map(e => {
        const dist = this._expert(e.id, tell);
        const trials = this.trials[e.id] || 0;
        return { id: e.id, name: e.name, dist, weight: this.weights[e.id], acc: trials ? this.hits[e.id] / trials : null, trials };
      });
      const mix = { ROCK: 0, PAPER: 0, SCISSORS: 0 };
      let wsum = 0;
      for (const e of experts) {
        for (const m of MOVES) mix[m] += e.weight * e.dist[m];
        wsum += e.weight;
      }
      const mixed = normalize(mix);
      // Keep 10% uniform: the prior must never be able to veto strong live kinematic evidence.
      const dist = normalize({
        ROCK: 0.9 * mixed.ROCK + 0.1 / 3,
        PAPER: 0.9 * mixed.PAPER + 0.1 / 3,
        SCISSORS: 0.9 * mixed.SCISSORS + 0.1 / 3
      });
      const top = experts.slice().sort((a, b) => b.weight - a.weight)[0];
      const value = { dist, experts, n: this.history.length, topExpert: top ? top.name : "-", entropy: entropyBits(dist) };
      if (key !== null) this._cache = { key, value };
      return value;
    }

    /** record = { p: player move, a: ai move, o: "W"|"L"|"T" (player's outcome) } */
    update(record, tell = null) {
      if (!record || !MOVES.includes(record.p) || !MOVES.includes(record.a)) return;
      const eta = 1.2;
      let total = 0;
      for (const e of EXPERTS) {
        const dist = this._expert(e.id, tell);
        const informative = !(e.id === "tell" && !tell);
        if (informative) {
          this.trials[e.id] += 1;
          if (argmax(dist) === record.p && Math.max(dist.ROCK, dist.PAPER, dist.SCISSORS) > 0.34) this.hits[e.id] += 1;
          this.weights[e.id] *= Math.pow(Math.max(1e-3, dist[record.p]) * 3, eta);
        }
        total += this.weights[e.id];
      }
      for (const e of EXPERTS) {
        this.weights[e.id] = 0.97 * (this.weights[e.id] / total) + 0.03 / EXPERTS.length;
      }
      this.history.push({ p: record.p, a: record.a, o: record.o, tell: tell ? tell.slice() : null });
      if (this.history.length > 400) this.history.shift();
      this._cache = null;
    }

    toJSON() {
      return { history: this.history, weights: this.weights, hits: this.hits, trials: this.trials };
    }

    load(obj) {
      this.reset();
      if (!obj || !Array.isArray(obj.history)) return;
      this.history = obj.history.filter(r => r && MOVES.includes(r.p) && MOVES.includes(r.a) && ["W", "L", "T"].includes(r.o)).slice(-400);
      for (const e of EXPERTS) {
        if (obj.weights && Number.isFinite(obj.weights[e.id]) && obj.weights[e.id] > 0) this.weights[e.id] = obj.weights[e.id];
        if (obj.hits && Number.isFinite(obj.hits[e.id])) this.hits[e.id] = obj.hits[e.id];
        if (obj.trials && Number.isFinite(obj.trials[e.id])) this.trials[e.id] = obj.trials[e.id];
      }
      const s = EXPERTS.reduce((a, e) => a + this.weights[e.id], 0) || 1;
      for (const e of EXPERTS) this.weights[e.id] /= s;
    }
  }

  // ==================== 6. THE PREDICTIVE ENGINE ====================
  const SOURCES = ["pattern", "kinematic", "timing", "deadline"];

  class RPSPredictiveEngine {
    constructor(options = {}) {
      this.extractor = new HandFeatureExtractor();
      this.kin = new KinematicTracker();
      this.swing = new SwingDetector();
      this.pattern = new PatternPredictor();
      this.onset = new OnsetModel();
      this.config = Object.assign({
        mode: "rhythm4",          // "rhythm4" | "quick1" | "spaceOnly"
        lockThreshold: 0.86,
        lockFrames: 2,
        lookaheadSec: 0.10,       // finger-extension extrapolation horizon
        defaultPeriodMs: 520,
        quickPeriodMs: 260,
        handLossMs: 450,
        revealStableFrames: 3,
        revealTimeoutMs: 420
      }, options);
      this.stats = this._emptyStats();
      this.log = [];
      this.turnSeq = 0;
      this.current = null;
      this.lastTurn = null;
      this.lastKin = null;
      this.lastHandT = -1e9;
    }

    _emptyStats() {
      const bySource = {};
      for (const s of SOURCES) bySource[s] = { n: 0, c: 0 };
      return { turns: 0, correct: 0, aiWins: 0, userWins: 0, ties: 0, leadSum: 0, leadN: 0, earlyLocks: 0, bySource, periodEma: 520 };
    }

    setSensitivity(level) { this.swing.setSensitivity(level); }
    setMode(mode) {
      if (["rhythm4", "quick1", "spaceOnly"].includes(mode)) { this.config.mode = mode; this.abortTurn(); }
    }

    // ---------- public frame API ----------
    /**
     * frame = { t (ms), world (21 world landmarks), image (21 normalized image landmarks),
     *           gesture ("ROCK"|"PAPER"|"SCISSORS"|null — referee classifier, only used after impact) }
     * Returns an array of events: turnStart, beat, watch, onset, lock, impact, reveal, abort.
     */
    update(frame) {
      const events = [];
      if (!frame || !Number.isFinite(frame.t)) return events;
      const t = frame.t;
      const f = this.extractor.extract(frame.world, frame.image);
      if (!f) return this.tick(t, events);

      const k = this.kin.update(t, f);
      this.lastKin = k;
      this.lastHandT = t;

      const swingEvents = this.swing.update(k);
      const cur0 = this.current;
      const swingAllowed = this.config.mode !== "spaceOnly" && !(cur0 && (cur0.metronome || cur0.impactT !== null || cur0.result));
      if (swingAllowed) for (const ev of swingEvents) this._onSwing(ev, t, events);

      const cur = this.current;
      if (cur && !cur.result) {
        if (cur.watchStartT === null) this._accumBaseline(cur, k);
        else if (cur.impactT === null) this._watchStep(cur, k, t, events);
        if (cur.impactT !== null && !cur.result) this._revealStep(cur, frame.gesture, t, events);
        if (this.current === cur) this._recordFrame(cur, k, t);
      }
      return this.tick(t, events);
    }

    /** Time-driven logic (metronome beats, timeouts). Safe to call every animation frame. */
    tick(t, events = []) {
      const turn = this.current;
      if (!turn || turn.result) return events;
      const cfg = this.config;

      if (turn.metronome) {
        const m = turn.metronome;
        while (m.next <= 3 && t >= m.t0 + (m.next - 1) * m.period) {
          const bt = m.t0 + (m.next - 1) * m.period;
          turn.beats.push(bt);
          events.push({ type: "beat", n: m.next, t: bt, turnId: turn.id });
          if (m.next === 3) this._startWatch(turn, bt, events, m.period);
          m.next++;
        }
        if (m.next === 4 && turn.impactT === null && t >= m.t0 + 3 * m.period) {
          m.next = 5;
          events.push({ type: "beat", n: 4, t: m.t0 + 3 * m.period, turnId: turn.id });
          this._impact(turn, m.t0 + 3 * m.period, events);
        }
      }
      if (this.current !== turn || turn.result) return events;

      const handGone = (t - this.lastHandT) > cfg.handLossMs;

      if (turn.impactT === null) {
        if (turn.watchStartT === null) {
          const lastBeat = turn.beats.length ? turn.beats[turn.beats.length - 1] : turn.startT;
          if (!turn.metronome && t - lastBeat > 2200) return this._abort(turn, "rhythm", events);
          if (handGone && !turn.metronome) return this._abort(turn, "hand", events);
        } else {
          if (handGone) return this._abort(turn, "hand", events);
          if (!turn.metronome) {
            const since = t - turn.watchStartT;
            // Player opened the hand and held it without a clear 4th downstroke → treat stillness as the throw.
            const k = this.lastKin;
            if (turn.onsetT !== null && k && since > Math.max(1.5 * turn.period, 650)) {
              if (Math.abs(k.vy) < 0.35) {
                if (turn.stillSince === null) turn.stillSince = t;
                else if (t - turn.stillSince >= 150) { this._impact(turn, t, events); return events; }
              } else turn.stillSince = null;
            }
            if (since > Math.max(2.4 * turn.period, 1500)) return this._abort(turn, "no-throw", events);
          }
        }
      } else if (t - turn.impactT > cfg.revealTimeoutMs) {
        const final = this._majority(turn.votes);
        if (final) this._finalize(turn, final, t, events);
        else this._abort(turn, "no-gesture", events);
      }
      return events;
    }

    /** SPACE / button: audible count-in (1-2-3) and throw on the 4th tick — no swinging needed. */
    startMetronome(t, periodMs = 480) {
      if (this.current && !this.current.result) return false;
      if (this.current && this.current.result) return false; // result still on screen
      const turn = this._newTurn(t, "metronome");
      turn.metronome = { t0: t + 300, period: clamp(periodMs, 300, 900), next: 1 };
      return true;
    }

    nextTurn() { this.current = null; }
    abortTurn() { this.current = null; }

    resetModel() {
      this.pattern.reset();
      this.onset = new OnsetModel();
      this.stats = this._emptyStats();
      this.log = [];
    }

    getPhase() {
      const c = this.current;
      if (!c) return "IDLE";
      if (c.result) return "RESULT";
      if (c.impactT !== null) return "REVEAL";
      if (c.watchStartT !== null) return "WATCH";
      return "COUNTING";
    }

    idlePrior() { return this.pattern.predict(null); }

    // ---------- internals ----------
    _newTurn(t, kind) {
      this.turnSeq += 1;
      const priorInfo = this.pattern.predict(null);
      const turn = {
        id: this.turnSeq, kind, startT: t, beats: [],
        watchStartT: null, period: this.stats.periodEma || this.config.defaultPeriodMs, expectedImpactT: null,
        baseSum: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 }, baseN: 0, baseline: null,
        tell: null, priorInfo, prior: priorInfo.dist, posterior: null, live: null,
        lock: null, lockStreak: 0, flipAfterLock: false,
        onsetT: null, impactT: null, revealT: null, stillSince: null,
        votes: [], frames: [], final: null, result: null, metronome: null
      };
      this.current = turn;
      return turn;
    }

    _onSwing(ev, t, events) {
      const mode = this.config.mode;
      if (this.current && this.current.result) return;
      if (ev.type === "down") {
        if (mode === "quick1" && !this.current) {
          const turn = this._newTurn(ev.t, "quick");
          events.push({ type: "turnStart", t: ev.t, turnId: turn.id });
          this._startWatch(turn, ev.t, events, this.config.quickPeriodMs);
        }
        return;
      }
      if (ev.type !== "bottom") return;
      if (mode === "quick1") {
        const c = this.current;
        if (c && c.watchStartT !== null && c.impactT === null) {
          events.push({ type: "beat", n: 4, t: ev.t, turnId: c.id });
          this._impact(c, ev.t, events);
        }
        return;
      }
      let turn = this.current;
      if (!turn) {
        turn = this._newTurn(ev.t, "rhythm");
        events.push({ type: "turnStart", t: ev.t, turnId: turn.id });
      }
      if (turn.impactT !== null || turn.metronome) return;
      turn.beats.push(ev.t);
      const n = turn.beats.length;
      if (n <= 3) {
        events.push({ type: "beat", n, t: ev.t, turnId: turn.id });
        if (n === 3) {
          const intervals = [];
          for (let i = 1; i < turn.beats.length; i++) intervals.push(turn.beats[i] - turn.beats[i - 1]);
          const p = intervals.length ? median(intervals) : this.config.defaultPeriodMs;
          this._startWatch(turn, ev.t, events, clamp(p, 260, 1000));
        }
      } else {
        events.push({ type: "beat", n: 4, t: ev.t, turnId: turn.id });
        this._impact(turn, ev.t, events);
      }
    }

    _accumBaseline(turn, k) {
      for (const f of ALL_FINGERS) turn.baseSum[f] += k.ext[f];
      turn.baseN += 1;
    }

    _startWatch(turn, t, events, periodMs) {
      turn.watchStartT = t;
      turn.period = periodMs;
      turn.expectedImpactT = t + periodMs;
      const base = {};
      for (const f of ALL_FINGERS) {
        const v = turn.baseN > 0 ? turn.baseSum[f] / turn.baseN : (this.lastKin ? this.lastKin.ext[f] : 0.1);
        base[f] = clamp(v, 0, 0.6);
      }
      turn.baseline = base;
      turn.tell = [base.index, base.middle, base.ring, base.pinky, base.thumb, periodMs / 1000];
      turn.priorInfo = this.pattern.predict(turn.tell);
      turn.prior = turn.priorInfo.dist;
      turn.posterior = Object.assign({}, turn.prior);
      events.push({ type: "watch", t, expectedImpactT: turn.expectedImpactT, turnId: turn.id });
      const best = argmax(turn.prior);
      if (turn.prior[best] >= this.config.lockThreshold) this._lock(turn, t, best, turn.prior, "pattern", events);
    }

    /** Live Bayesian fusion of history prior + finger kinematics + personal timing. */
    _posterior(turn, k, t) {
      const prior = turn.prior;
      const L = this.config.lookaheadSec;
      const base = turn.baseline || { index: 0.1, middle: 0.1, ring: 0.1, pinky: 0.1 };
      const d = {};
      for (const f of LONG_FINGERS) {
        const proj = clamp(k.ext[f] + Math.max(0, k.vel[f]) * L, 0, 1);
        d[f] = clamp((proj - base[f]) / Math.max(0.25, 1 - base[f]), 0, 1);
      }
      const front = (d.index + d.middle) * 0.5;
      const back = (d.ring + d.pinky) * 0.5;
      const evidence = Math.max(front, back);
      const pOpenData = sigmoid((evidence - 0.16) / 0.035);

      const phase = (t - turn.watchStartT) / Math.max(1, turn.period);
      const S = this.onset.survival(phase);
      const piOpen = prior.PAPER + prior.SCISSORS;
      const pOpenTime = (piOpen * S) / (piOpen * S + prior.ROCK + 1e-9);
      const pOpen = pOpenData + (1 - pOpenData) * pOpenTime;

      const ratio = (back + 0.02) / (front + 0.02);
      const w = clamp((evidence - 0.10) / 0.30, 0, 1);
      const qS = 0.5 + w * (sigmoid((0.45 - ratio) / 0.09) - 0.5);
      let pS = prior.SCISSORS * qS;
      let pP = prior.PAPER * (1 - qS);
      const z = pS + pP || 1e-9;
      pS /= z; pP /= z;

      turn.live = { front, back, evidence, pOpenData, pOpenTime, phase, survival: S, ratio, qS, d };
      return normalize({ ROCK: 1 - pOpen, PAPER: pOpen * pP, SCISSORS: pOpen * pS }, 1e-4);
    }

    _watchStep(turn, k, t, events) {
      const post = this._posterior(turn, k, t);
      turn.posterior = post;
      if (turn.onsetT === null && turn.live.evidence > 0.22) {
        turn.onsetT = t;
        events.push({ type: "onset", t, turnId: turn.id });
      }
      const best = argmax(post);
      if (!turn.lock) {
        if (post[best] >= this.config.lockThreshold) {
          turn.lockStreak += 1;
          if (turn.lockStreak >= this.config.lockFrames) {
            this._lock(turn, t, best, post, turn.live.pOpenData > 0.5 ? "kinematic" : "timing", events);
          }
        } else {
          turn.lockStreak = 0;
        }
      } else if (best !== turn.lock.pred && post[best] > 0.6) {
        turn.flipAfterLock = true;
      }
    }

    _lock(turn, t, pred, probs, source, events) {
      if (turn.lock) return;
      const counter = COUNTER[pred];
      const nonce = randomNonce();
      const tRound = Math.round(t);
      const seal = fnv1a(`T${turn.id}|${pred}|${counter}|${tRound}|${nonce}`);
      turn.lock = {
        t, tRound, pred, counter, conf: probs[pred], probs: Object.assign({}, probs), source,
        nonce, seal,
        phase: turn.watchStartT !== null ? (t - turn.watchStartT) / Math.max(1, turn.period) : null,
        expectedLeadMs: turn.expectedImpactT !== null ? turn.expectedImpactT - t : null,
        afterOnsetMs: turn.onsetT !== null ? t - turn.onsetT : null
      };
      events.push({ type: "lock", t, turnId: turn.id, lock: Object.assign({}, turn.lock) });
    }

    _impact(turn, t, events) {
      if (turn.impactT !== null) return;
      if (!turn.lock) {
        if (this.lastKin && turn.watchStartT !== null) this._watchStep(turn, this.lastKin, t, events);
        if (!turn.lock) {
          const post = turn.posterior || turn.prior || uniform();
          this._lock(turn, t, argmax(post), post, "deadline", events);
        }
      }
      turn.impactT = t;
      events.push({ type: "impact", t, turnId: turn.id });
    }

    _revealStep(turn, gesture, t, events) {
      if (gesture && MOVES.includes(gesture)) turn.votes.push({ t, g: gesture });
      const since = t - turn.impactT;
      const N = this.config.revealStableFrames;
      const v = turn.votes;
      let final = null;
      if (v.length >= N && since >= 50) {
        const tail = v.slice(-N);
        if (tail.every(x => x.g === tail[0].g)) final = tail[0].g;
      }
      if (!final && since >= this.config.revealTimeoutMs) final = this._majority(v);
      if (final) this._finalize(turn, final, t, events);
    }

    _majority(votes) {
      if (!votes || !votes.length) return null;
      const c = { ROCK: 0, PAPER: 0, SCISSORS: 0 };
      for (const v of votes) c[v.g] += 1;
      return argmax(c);
    }

    _recordFrame(turn, k, t) {
      if (turn.result) return;
      const probs = turn.posterior || turn.prior;
      const live = turn.live;
      turn.frames.push({
        t,
        R: probs.ROCK, P: probs.PAPER, S: probs.SCISSORS,
        front: live ? live.front : 0, back: live ? live.back : 0,
        vy: k.vy
      });
      if (turn.frames.length > 600) turn.frames.shift();
    }

    _finalize(turn, final, t, events) {
      if (turn.result) return;
      const lock = turn.lock;
      turn.revealT = t;
      turn.final = final;
      const ai = lock.counter;
      const outcome = judge(final, ai);
      const correct = lock.pred === final;
      const sealOk = fnv1a(`T${turn.id}|${lock.pred}|${lock.counter}|${lock.tRound}|${lock.nonce}`) === lock.seal;
      const result = {
        turnId: turn.id, kind: turn.kind,
        final, pred: lock.pred, ai, outcome, correct,
        conf: lock.conf, source: lock.source,
        leadImpactMs: Math.round(turn.impactT - lock.t),
        leadRevealMs: Math.round(t - lock.t),
        lockAfterOnsetMs: turn.onsetT !== null ? Math.round(lock.t - turn.onsetT) : null,
        lockPhase: lock.phase, periodMs: Math.round(turn.period),
        seal: lock.seal, nonce: lock.nonce, sealOk,
        flipAfterLock: turn.flipAfterLock,
        prior: Object.assign({}, turn.prior)
      };
      turn.result = result;

      // ---- learning from the real outcome ----
      const o = outcome === "USER" ? "W" : (outcome === "AI" ? "L" : "T");
      this.pattern.update({ p: final, a: ai, o }, turn.tell);
      if (final !== "ROCK" && turn.onsetT !== null && turn.kind !== "quick" && turn.watchStartT !== null) {
        this.onset.add((turn.onsetT - turn.watchStartT) / turn.period);
      }
      if (turn.kind === "rhythm" && turn.beats.length >= 3) {
        this.stats.periodEma = Math.round(0.7 * this.stats.periodEma + 0.3 * turn.period);
      }
      const s = this.stats;
      s.turns += 1;
      if (correct) s.correct += 1;
      if (outcome === "AI") s.aiWins += 1; else if (outcome === "USER") s.userWins += 1; else s.ties += 1;
      if (result.leadImpactMs > 0) { s.leadSum += result.leadImpactMs; s.leadN += 1; }
      if (result.leadImpactMs >= 50) s.earlyLocks += 1;
      if (s.bySource[lock.source]) { s.bySource[lock.source].n += 1; if (correct) s.bySource[lock.source].c += 1; }

      this.log.unshift({
        id: turn.id, final, pred: lock.pred, ai, outcome, correct,
        lead: result.leadImpactMs, source: lock.source, conf: Math.round(lock.conf * 100)
      });
      if (this.log.length > 30) this.log.pop();

      this.lastTurn = turn;
      events.push({ type: "reveal", t, turnId: turn.id, result });
    }

    _abort(turn, reason, events) {
      if (this.current === turn) this.current = null;
      events.push({ type: "abort", reason, turnId: turn.id, phase: turn.watchStartT !== null ? "watch" : "count" });
      return events;
    }

    // ---------- persistence ----------
    serialize() {
      return { v: 2, pattern: this.pattern.toJSON(), onset: this.onset.samples.slice(), stats: this.stats, log: this.log };
    }

    load(obj) {
      try {
        if (!obj || obj.v !== 2) return false;
        this.pattern.load(obj.pattern);
        this.onset = new OnsetModel();
        if (Array.isArray(obj.onset)) obj.onset.forEach(x => this.onset.add(x));
        const base = this._emptyStats();
        if (obj.stats && typeof obj.stats === "object") {
          for (const k of Object.keys(base)) {
            if (k === "bySource") continue;
            if (Number.isFinite(obj.stats[k])) base[k] = obj.stats[k];
          }
          if (obj.stats.bySource) {
            for (const s of SOURCES) {
              const src = obj.stats.bySource[s];
              if (src && Number.isFinite(src.n) && Number.isFinite(src.c)) base.bySource[s] = { n: src.n, c: src.c };
            }
          }
        }
        this.stats = base;
        this.log = Array.isArray(obj.log) ? obj.log.slice(0, 30) : [];
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  return {
    RPSPredictiveEngine,
    PatternPredictor,
    HandFeatureExtractor,
    KinematicTracker,
    SwingDetector,
    OnsetModel,
    RPS_UTIL: { MOVES, COUNTER, PREY, judge, normalize, argmax, entropyBits, normalCdf, fnv1a, EXPERTS }
  };
});
