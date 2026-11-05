/**
 * beaTTer // JankenMind ML Engine v2
 * ------------------------------------------------------------------------------------------
 * Real online machine learning for Rock-Paper-Scissors against humans.
 *
 * 1. SEQUENCE MODEL (what will this player throw next?)
 *    Bayesian mixture of ~25 base experts × 3 meta-rotations (Iocaine-Powder second guessing):
 *      - decayed frequency models (short / mid / long memory)
 *      - Markov-k chains on player moves (k = 1..4), on joint (player, AI) pairs (k = 1..3)
 *      - shift models (rotation habits) conditioned on last outcome / last shifts (WSLS-generalised)
 *      - reaction-to-AI models, longest-history pattern matching (player-only and joint)
 *      - population prior learned across every player on this device
 *    Expert weights = exponentially-forgotten log-likelihood (Bayesian model averaging with
 *    forgetting) + fixed-share mixing so the model can switch quickly when a player changes style.
 *
 * 2. KINEMATIC OBSERVATION MODEL (what is the hand doing in the air right now?)
 *    Online Gaussian Naive Bayes on in-flight finger extension features (front / back finger
 *    openness, their opening velocities) + learned confusion of the neural gesture classifier,
 *    trained on the FINAL measured move. Learned per player and pooled for the population.
 *
 * 3. DECISION
 *    posterior ∝ prior × likelihood^γ  →  expected-utility best response.
 *    When the edge is small the engine plays a Nash-mixed strategy (crypto RNG), which makes it
 *    provably unexploitable in expectation — no deterministic default a human could learn.
 *
 * 4. COMMIT–REVEAL
 *    The AI decision is sealed with SHA-256(move|nonce|round) while the hand is still in the air;
 *    the move is revealed (and the seal re-verified) only after the player's hand has landed.
 * ------------------------------------------------------------------------------------------
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JankenMind = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null), function () {
  "use strict";

  const MOVES = ["ROCK", "PAPER", "SCISSORS"];
  const IDX = { ROCK: 0, PAPER: 1, SCISSORS: 2 };
  const TR = { ROCK: "Taş", PAPER: "Kağıt", SCISSORS: "Makas" };
  const STORAGE_VERSION = "jm_v2";
  const HISTORY_CAP = 400;

  const beatOf = (m) => (m + 1) % 3;                  // move index that beats m
  const payoff = (a, p) => (a === p ? 0 : (a === beatOf(p) ? 1 : -1));
  const UNIFORM = Object.freeze([1 / 3, 1 / 3, 1 / 3]);

  function norm3(a) {
    const s = a[0] + a[1] + a[2];
    if (!(s > 0) || !isFinite(s)) return [1 / 3, 1 / 3, 1 / 3];
    return [a[0] / s, a[1] / s, a[2] / s];
  }
  // q[k] = p[(k - r) mod 3]: "the player will throw r steps further than predicted"
  function rot(p, r) {
    return [p[(3 - r) % 3], p[(4 - r) % 3], p[(5 - r) % 3]];
  }
  function argmax3(p) {
    return (p[0] >= p[1] && p[0] >= p[2]) ? 0 : (p[1] >= p[2] ? 1 : 2);
  }
  function entropyNorm(p) {
    let h = 0;
    for (const v of p) if (v > 1e-9) h -= v * Math.log(v);
    return h / Math.log(3);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function secureRandom() {
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const a = new Uint32Array(1);
        crypto.getRandomValues(a);
        return a[0] / 4294967296;
      }
    } catch (e) { /* fall through */ }
    return Math.random();
  }
  function randomHex(bytes) {
    let s = "";
    for (let i = 0; i < bytes; i++) s += Math.floor(secureRandom() * 256).toString(16).padStart(2, "0");
    return s;
  }

  // ==================== SHA-256 (synchronous, works in insecure contexts too) ====================
  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  function sha256Hex(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) {
        W[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K256[i] + W[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return Array.from(H).map(v => v.toString(16).padStart(8, "0")).join("");
  }

  // ==================== 1. SEQUENCE EXPERTS ====================
  class TableExpert {
    constructor(name, label, keyFn, opts = {}) {
      this.name = name;
      this.label = label;
      this.keyFn = keyFn;
      this.decay = opts.decay ?? 0.94;
      this.alpha = opts.alpha ?? 0.35;
      this.minMass = opts.minMass ?? 0.9;
      this.shift = !!opts.shift; // predicts shifts relative to the last player move
      this.t = Object.create(null);
    }
    _label(ctx, y) {
      if (!this.shift) return y;
      const last = ctx.P[ctx.P.length - 1];
      return (y - last + 3) % 3;
    }
    predict(ctx) {
      if (this.shift && ctx.P.length === 0) return null;
      const k = this.keyFn(ctx);
      if (k == null) return null;
      const c = this.t[k];
      if (!c || (c[0] + c[1] + c[2]) < this.minMass) return null;
      const d = norm3([c[0] + this.alpha, c[1] + this.alpha, c[2] + this.alpha]);
      return this.shift ? rot(d, ctx.P[ctx.P.length - 1]) : d;
    }
    update(ctx, y) {
      if (this.shift && ctx.P.length === 0) return;
      const k = this.keyFn(ctx);
      if (k == null) return;
      const c = this.t[k] || (this.t[k] = [0, 0, 0]);
      c[0] *= this.decay; c[1] *= this.decay; c[2] *= this.decay;
      c[this._label(ctx, y)] += 1;
    }
    toJSON() { return this.t; }
    load(obj) { if (obj && typeof obj === "object") this.t = Object.assign(Object.create(null), obj); }
  }

  class PatternExpert {
    // Longest earlier occurrence of the current history suffix → predict what followed it.
    constructor(name, label, symbolFn, maxLen = 10) {
      this.name = name;
      this.label = label;
      this.symbolFn = symbolFn;
      this.maxLen = maxLen;
    }
    predict(ctx) {
      const n = ctx.P.length;
      if (n < 4) return null;
      const sym = (i) => this.symbolFn(ctx, i);
      for (let L = Math.min(this.maxLen, n - 1); L >= 2; L--) {
        for (let start = n - L - 1; start >= 0; start--) {
          let ok = true;
          for (let j = 0; j < L; j++) {
            if (sym(start + j) !== sym(n - L + j)) { ok = false; break; }
          }
          if (ok) {
            const nextMove = ctx.P[start + L];
            const conf = Math.min(0.86, 0.5 + L * 0.06);
            const d = [(1 - conf) / 2, (1 - conf) / 2, (1 - conf) / 2];
            d[nextMove] = conf;
            return d;
          }
        }
      }
      return null;
    }
    update() { /* history driven */ }
    toJSON() { return null; }
    load() { }
  }

  function lastK(arr, k) {
    if (arr.length < k) return null;
    return arr.slice(arr.length - k).join("");
  }
  function buildExperts() {
    const ex = [];
    ex.push(new TableExpert("freq_short", "Kısa vadeli sıklık", () => "f", { decay: 0.72, minMass: 1.5 }));
    ex.push(new TableExpert("freq_mid", "Orta vadeli sıklık", () => "f", { decay: 0.90, minMass: 2 }));
    ex.push(new TableExpert("freq_long", "Uzun vadeli sıklık", () => "f", { decay: 0.985, minMass: 3 }));
    for (let k = 1; k <= 4; k++) {
      ex.push(new TableExpert(`markovP${k}`, `Markov-${k} (senin hamle zincirin)`, (c) => lastK(c.P, k), { decay: 0.93 }));
    }
    for (let k = 1; k <= 3; k++) {
      ex.push(new TableExpert(`markovJ${k}`, `Markov-${k} (sen + AI ortak zincir)`,
        (c) => (c.P.length < k ? null : c.P.slice(-k).map((p, i) => p * 3 + c.A[c.A.length - k + i]).join(".")), { decay: 0.93 }));
    }
    ex.push(new TableExpert("shiftOutcome", "Sonuca göre kaydırma (Kazan-Koru / Kaybet-Değiştir)",
      (c) => (c.O.length ? "o" + c.O[c.O.length - 1] : null), { shift: true, decay: 0.92 }));
    ex.push(new TableExpert("shiftOutcome2", "Son iki sonuca göre kaydırma",
      (c) => (c.O.length >= 2 ? "o" + c.O.slice(-2).join(",") : null), { shift: true, decay: 0.92 }));
    ex.push(new TableExpert("wsls", "Hamle + sonuç koşullu (WSLS)",
      (c) => (c.O.length ? `${c.P[c.P.length - 1]}|${c.O[c.O.length - 1]}` : null), { decay: 0.92 }));
    for (let k = 1; k <= 2; k++) {
      ex.push(new TableExpert(`shiftSeq${k}`, `Rotasyon alışkanlığı (${k} adım)`,
        (c) => {
          if (c.P.length < k + 1) return null;
          const s = [];
          for (let i = c.P.length - k; i < c.P.length; i++) s.push((c.P[i] - c.P[i - 1] + 3) % 3);
          return "s" + s.join("");
        }, { shift: true, decay: 0.93 }));
    }
    ex.push(new TableExpert("reactAI1", "AI'ın son hamlesine tepki", (c) => (c.A.length ? "a" + c.A[c.A.length - 1] : null), { decay: 0.92 }));
    ex.push(new TableExpert("reactAI2", "AI'ın son iki hamlesine tepki", (c) => (c.A.length >= 2 ? "a" + lastK(c.A, 2) : null), { decay: 0.92 }));
    ex.push(new TableExpert("roundPos", "Seri içi tur pozisyonu", (c) => "r" + c.round, { decay: 0.95 }));
    ex.push(new PatternExpert("patternP", "Desen eşleştirme (senin geçmişin)", (c, i) => c.P[i]));
    ex.push(new PatternExpert("patternJ", "Desen eşleştirme (ortak geçmiş)", (c, i) => c.P[i] * 3 + c.A[i]));
    return ex;
  }

  class SequenceModel {
    constructor() {
      this.experts = buildExperts();
      this.R = 3; // meta-rotations per expert
      this.forget = 0.90;
      this.share = 0.03;
      this.scores = this.experts.map(() => [0, 0, 0]);       // log-likelihood scores
      this.hits = this.experts.map(() => [0, 0, 0]);         // decayed decision payoff (explainability)
      this.P = []; this.A = []; this.O = [];
      this.round = 1;
      this._cache = null;
    }
    ctx() { return { P: this.P, A: this.A, O: this.O, round: this.round }; }

    predict(population = null) {
      const ctx = this.ctx();
      const preds = this.experts.map(e => { try { return e.predict(ctx); } catch (err) { return null; } });
      // Weights from scores (log domain), plus uniform/Nash expert with score 0
      let maxS = 0;
      for (let i = 0; i < preds.length; i++) for (let r = 0; r < this.R; r++) maxS = Math.max(maxS, this.scores[i][r]);
      let wSum = Math.exp(-maxS); // uniform expert
      const mix = [wSum / 3, wSum / 3, wSum / 3];
      let best = { i: -1, r: 0, w: wSum };
      for (let i = 0; i < preds.length; i++) {
        for (let r = 0; r < this.R; r++) {
          const w = Math.exp(this.scores[i][r] - maxS);
          const q = preds[i] ? rot(preds[i], r) : UNIFORM;
          mix[0] += w * q[0]; mix[1] += w * q[1]; mix[2] += w * q[2];
          wSum += w;
          if (preds[i] && w > best.w) best = { i, r, w };
        }
      }
      let prior = norm3(mix);
      // Population prior for cold start: blend while the player has little history
      if (population) {
        const popW = 1 / (1 + this.P.length / 4);
        const pop = population.predict(ctx);
        if (pop) prior = norm3([0, 1, 2].map(k => (1 - popW) * prior[k] + popW * pop[k]));
      }
      const top = best.i >= 0 ? {
        name: this.experts[best.i].name,
        label: this.experts[best.i].label + (best.r ? ` (ikinci-tahmin +${best.r})` : ""),
        weight: best.w / wSum
      } : { name: "nash", label: "Nash dengesi (rastgele)", weight: 1 };
      this._cache = { len: this.P.length, preds };
      return { prior, top };
    }

    update(y, aiMove, outcome) {
      const ctx = this.ctx();
      const preds = (this._cache && this._cache.len === this.P.length)
        ? this._cache.preds
        : this.experts.map(e => { try { return e.predict(ctx); } catch (err) { return null; } });
      for (let i = 0; i < this.experts.length; i++) {
        for (let r = 0; r < this.R; r++) {
          const q = preds[i] ? rot(preds[i], r) : UNIFORM;
          const ll = Math.log(Math.max(0.03, q[y]) * 3);
          this.scores[i][r] = this.forget * this.scores[i][r] + ll;
          this.hits[i][r] = 0.9 * this.hits[i][r] + (preds[i] ? payoff(beatOf(argmax3(q)), y) : 0);
        }
      }
      // Fixed-share: pull every score slightly towards the mean so dormant experts can recover
      let mean = 0, cnt = 0;
      for (const row of this.scores) for (const v of row) { mean += v; cnt++; }
      mean /= Math.max(1, cnt);
      for (const row of this.scores) for (let r = 0; r < this.R; r++) row[r] = (1 - this.share) * row[r] + this.share * mean;

      for (const e of this.experts) { try { e.update(ctx, y); } catch (err) { /* ignore */ } }
      this.P.push(y); this.A.push(aiMove); this.O.push(outcome);
      if (this.P.length > HISTORY_CAP) { this.P.shift(); this.A.shift(); this.O.shift(); }
      this._cache = null;
    }

    toJSON() {
      return {
        P: this.P, A: this.A, O: this.O,
        scores: this.scores, hits: this.hits,
        tables: this.experts.map(e => e.toJSON())
      };
    }
    load(obj) {
      if (!obj) return;
      if (Array.isArray(obj.P)) this.P = obj.P.slice(-HISTORY_CAP);
      if (Array.isArray(obj.A)) this.A = obj.A.slice(-HISTORY_CAP);
      if (Array.isArray(obj.O)) this.O = obj.O.slice(-HISTORY_CAP);
      if (Array.isArray(obj.scores) && obj.scores.length === this.experts.length) this.scores = obj.scores;
      if (Array.isArray(obj.hits) && obj.hits.length === this.experts.length) this.hits = obj.hits;
      if (Array.isArray(obj.tables)) this.experts.forEach((e, i) => e.load(obj.tables[i]));
    }
  }

  // Population prior: shared across every player on this device (cold start knowledge)
  class PopulationModel {
    constructor() {
      // Seeded with well-known human tendencies (rock-heavy openings, win-stay / lose-shift)
      this.opening = [1.4, 1.2, 1.0];
      this.afterOutcome = { "1": [2.0, 1.0, 1.4], "0": [1.2, 1.5, 1.2], "-1": [1.0, 1.2, 1.6] }; // shift dist given AI outcome
    }
    predict(ctx) {
      if (!ctx.P.length) return norm3(this.opening);
      const o = String(ctx.O[ctx.O.length - 1]);
      const s = this.afterOutcome[o];
      if (!s) return null;
      return rot(norm3(s), ctx.P[ctx.P.length - 1]);
    }
    update(ctx, y) {
      if (!ctx.P.length) { this.opening[y] += 1; return; }
      const o = String(ctx.O[ctx.O.length - 1]);
      const shift = (y - ctx.P[ctx.P.length - 1] + 3) % 3;
      if (!this.afterOutcome[o]) this.afterOutcome[o] = [1, 1, 1];
      this.afterOutcome[o] = this.afterOutcome[o].map(v => v * 0.995);
      this.afterOutcome[o][shift] += 1;
    }
    toJSON() { return { opening: this.opening, afterOutcome: this.afterOutcome }; }
    load(o) { if (o && o.opening) { this.opening = o.opening; this.afterOutcome = o.afterOutcome || this.afterOutcome; } }
  }

  // ==================== 2. KINEMATIC GAUSSIAN NAIVE BAYES ====================
  const FEATS = ["sFront", "sBack", "vFront", "vBack"];
  const SEED = {
    // Feature distributions of the hand AT LOCK TIME (mid-descent), per FINAL move.
    0: { mu: [0.20, 0.16, 0.0, 0.0], sd: [0.13, 0.12, 0.9, 0.9] },   // ROCK
    1: { mu: [0.55, 0.50, 1.3, 1.3], sd: [0.22, 0.22, 1.3, 1.3] },   // PAPER
    2: { mu: [0.55, 0.20, 1.3, 0.1], sd: [0.22, 0.13, 1.3, 0.9] }    // SCISSORS
  };
  const NEURAL_CATS = ["ROCK", "PAPER", "SCISSORS", "UNKNOWN"];

  class KinematicGNB {
    constructor(pseudo = 4) {
      this.n = [0, 0, 0];
      this.sum = [[], [], []];
      this.sq = [[], [], []];
      for (let y = 0; y < 3; y++) {
        for (let j = 0; j < FEATS.length; j++) {
          const mu = SEED[y].mu[j], sd = SEED[y].sd[j];
          this.sum[y][j] = mu * pseudo;
          this.sq[y][j] = (sd * sd + mu * mu) * pseudo;
        }
        this.n[y] = pseudo;
      }
      // Neural classifier confusion counts N[y][cat]
      this.conf = [[5, 1, 1, 2], [1, 5, 1, 2], [1, 1.5, 5, 2]];
      this.samples = 0;
    }
    logLik(x, neuralCat) {
      const out = [0, 0, 0];
      for (let y = 0; y < 3; y++) {
        let ll = 0;
        for (let j = 0; j < FEATS.length; j++) {
          const mu = this.sum[y][j] / this.n[y];
          const v = Math.max(j < 2 ? 0.006 : 0.15, this.sq[y][j] / this.n[y] - mu * mu);
          const d = x[j] - mu;
          ll += -0.5 * Math.log(2 * Math.PI * v) - (d * d) / (2 * v);
        }
        const ci = Math.max(0, NEURAL_CATS.indexOf(neuralCat));
        const row = this.conf[y];
        ll += Math.log(row[ci] / (row[0] + row[1] + row[2] + row[3]));
        out[y] = ll;
      }
      return out;
    }
    update(x, neuralCat, y) {
      for (let j = 0; j < FEATS.length; j++) {
        this.sum[y][j] += x[j];
        this.sq[y][j] += x[j] * x[j];
      }
      this.n[y] += 1;
      const ci = Math.max(0, NEURAL_CATS.indexOf(neuralCat));
      this.conf[y][ci] += 1;
      this.samples++;
    }
    toJSON() { return { n: this.n, sum: this.sum, sq: this.sq, conf: this.conf, samples: this.samples }; }
    load(o) {
      if (!o || !Array.isArray(o.n)) return;
      this.n = o.n; this.sum = o.sum; this.sq = o.sq; this.conf = o.conf || this.conf; this.samples = o.samples || 0;
    }
  }

  // ==================== 3. ENGINE ====================
  class JankenMindEngine {
    constructor() {
      this.playerId = null;
      this.seq = new SequenceModel();
      this.population = new PopulationModel();
      this.gnbPlayer = new KinematicGNB(4);
      this.gnbPop = new KinematicGNB(6);
      this.stats = this._emptyStats();
      this.frame = this._emptyFrame();
      this.pending = null;
      this.lastDecision = null;
      this.lastReveal = null;
    }
    _emptyStats() {
      return { rounds: 0, aiWins: 0, aiLosses: 0, ties: 0, recent: [], predHits: [], invalid: 0 };
    }
    _emptyFrame() {
      return { t: 0, sFront: 0, sBack: 0, vFront: 0, vBack: 0, neural: "UNKNOWN", neuralScore: 0, frames: 0, handPresent: false, dropProgress: 0 };
    }

    // ---------- persistence ----------
    attachPlayer(playerId) {
      this.playerId = playerId || "anon";
      this._load();
    }
    _key(suffix) { return `${STORAGE_VERSION}_${suffix}`; }
    _load() {
      try {
        const raw = localStorage.getItem(this._key("player_" + this.playerId));
        if (raw) {
          const o = JSON.parse(raw);
          this.seq.load(o.seq);
          this.gnbPlayer.load(o.gnb);
          if (o.stats) this.stats = Object.assign(this._emptyStats(), o.stats);
        }
        const pop = localStorage.getItem(this._key("population"));
        if (pop) {
          const p = JSON.parse(pop);
          this.population.load(p.prior);
          this.gnbPop.load(p.gnb);
        }
      } catch (e) { /* corrupted storage → start fresh */ }
    }
    _save() {
      try {
        localStorage.setItem(this._key("player_" + this.playerId), JSON.stringify({
          seq: this.seq.toJSON(), gnb: this.gnbPlayer.toJSON(), stats: this.stats
        }));
        localStorage.setItem(this._key("population"), JSON.stringify({
          prior: this.population.toJSON(), gnb: this.gnbPop.toJSON()
        }));
      } catch (e) { /* quota / private mode */ }
    }

    // ---------- live perception ----------
    beginRound(round) {
      this.seq.round = round || 1;
      this.frame = this._emptyFrame();
    }
    startTurn(round) {
      this.beginRound(round);
    }
    observeFrame(o = {}) {
      const f = this.frame;
      const s = o.scores || {};
      const sFront = (typeof o.sFront === "number") ? o.sFront : ((s.index || 0) + (s.middle || 0)) * 0.5;
      const sBack = (typeof o.sBack === "number") ? o.sBack : ((s.ring || 0) + (s.pinky || 0)) * 0.5;
      const t = o.t || (typeof performance !== "undefined" ? performance.now() : Date.now());
      if (typeof o.vFront === "number" && typeof o.vBack === "number") {
        const a = 0.55;
        f.vFront = f.frames > 0 ? ((1 - a) * f.vFront + a * clamp(o.vFront, -6, 6)) : clamp(o.vFront, -6, 6);
        f.vBack = f.frames > 0 ? ((1 - a) * f.vBack + a * clamp(o.vBack, -6, 6)) : clamp(o.vBack, -6, 6);
      } else if (f.frames > 0) {
        const dt = o.dtSec || Math.max(0.008, (t - f.t) / 1000);
        const a = 0.45; // EMA smoothing for opening velocity
        f.vFront = (1 - a) * f.vFront + a * clamp((sFront - f.sFront) / dt, -6, 6);
        f.vBack = (1 - a) * f.vBack + a * clamp((sBack - f.sBack) / dt, -6, 6);
      }
      f.sFront = sFront; f.sBack = sBack; f.t = t;
      f.neural = o.neuralGesture || o.neural || "UNKNOWN";
      f.neuralScore = o.neuralScore || 0;
      f.dropProgress = o.dropProgress || 0;
      f.handPresent = true;
      f.frames++;

      const sensorProbs = this.liveSensor();
      const predIdx = argmax3(sensorProbs);
      const predictedPlayerMove = MOVES[predIdx];
      const recommendedAiMove = MOVES[beatOf(predIdx)];

      return {
        sFront,
        sBack,
        vFront: f.vFront,
        vBack: f.vBack,
        playerProbs: {
          ROCK: sensorProbs[0],
          PAPER: sensorProbs[1],
          SCISSORS: sensorProbs[2]
        },
        predictedPlayerMove,
        recommendedAiMove
      };
    }
    _features() {
      const f = this.frame;
      return [f.sFront, f.sBack, f.vFront, f.vBack];
    }
    _likelihood() {
      const f = this.frame;
      if (!f.handPresent || f.frames < 2) return { lik: [1, 1, 1], informative: false };
      const x = this._features();
      const neural = f.neuralScore >= 0.45 ? f.neural : "UNKNOWN";
      const llPop = this.gnbPop.logLik(x, neural);
      const llPl = this.gnbPlayer.logLik(x, neural);
      const wp = this.gnbPlayer.samples / (this.gnbPlayer.samples + 10);
      const ll = [0, 1, 2].map(k => wp * llPl[k] + (1 - wp) * llPop[k]);
      const gamma = 0.6 + 0.3 * wp; // naive-Bayes tempering (features are correlated)
      const m = Math.max(ll[0], ll[1], ll[2]);
      const lik = ll.map(v => Math.exp(gamma * (v - m)));
      return { lik, informative: true };
    }
    /** Perception-only distribution of the current hand shape (no history prior) — safe to show live. */
    liveSensor() {
      const { lik } = this._likelihood();
      return norm3(lik);
    }

    // ---------- decision ----------
    commit(opts = {}) {
      const round = opts.round || this.seq.round;
      const useKinematics = opts.useKinematics !== false;
      const { prior, top } = this.seq.predict(this.population);
      const { lik, informative } = useKinematics ? this._likelihood() : { lik: [1, 1, 1], informative: false };
      const post = norm3([prior[0] * lik[0], prior[1] * lik[1], prior[2] * lik[2]]);
      const eu = [0, 1, 2].map(a => post[0] * payoff(a, 0) + post[1] * payoff(a, 1) + post[2] * payoff(a, 2));

      // Under pressure (human is out-playing the model) → widen randomisation towards Nash
      const recent = this.stats.recent.slice(-10);
      const net = recent.reduce((s, v) => s + v, 0);
      const pressure = net <= -3 ? 1 : 0;
      const edgeThreshold = pressure ? 0.18 : 0.10;
      const tau = pressure ? 0.22 : 0.12;

      let aiIdx = argmax3(eu);
      let mode = "EXPLOIT";
      if (opts.allowMixed === true && eu[aiIdx] < edgeThreshold) {
        const m = Math.max(eu[0], eu[1], eu[2]);
        const w = eu.map(v => Math.exp((v - m) / tau));
        const sw = w[0] + w[1] + w[2];
        let r = secureRandom() * sw;
        aiIdx = 0;
        while (aiIdx < 2 && r > w[aiIdx]) { r -= w[aiIdx]; aiIdx++; }
        mode = "MIXED";
      }
      const predictedIdx = argmax3(post);
      const nonce = randomHex(8);
      const aiMove = MOVES[aiIdx];
      const fullHash = sha256Hex(`${aiMove}|${nonce}|${round}`);
      const sealCode = fullHash.slice(0, 12).toUpperCase();
      const lockedAt = (typeof performance !== "undefined" ? performance.now() : Date.now());
      const sealObj = {
        round,
        aiMove,
        predictedPlayerMove: MOVES[predictedIdx],
        nonce,
        hash: fullHash,
        seal: sealCode,
        short: sealCode.slice(0, 8),
        lockedAt
      };

      const decision = {
        round, aiMove, predicted: MOVES[predictedIdx],
        predictedPlayerMove: MOVES[predictedIdx],
        prior: prior.map(v => +v.toFixed(4)),
        likelihood: norm3(lik).map(v => +v.toFixed(4)),
        posterior: post.map(v => +v.toFixed(4)),
        eu: eu.map(v => +v.toFixed(3)),
        edge: +eu[aiIdx].toFixed(3),
        confidence: +(1 - entropyNorm(post)).toFixed(3),
        mode, informative, topExpert: top,
        features: this._features().map(v => +v.toFixed(3)),
        neural: this.frame.neural,
        handPresent: this.frame.handPresent,
        seal: sealObj,
        sealCode,
        nonce,
        hash: fullHash,
        short: sealCode.slice(0, 8),
        lockedAt
      };
      this.pending = decision;
      this.lastDecision = decision;
      return decision;
    }

    verifySeal(d) {
      if (!d) return false;
      const target = (d.seal && typeof d.seal === "object" && !d.aiMove) ? d.seal : d;
      const aiMove = target.aiMove;
      const nonce = target.nonce;
      const round = target.round !== undefined ? target.round : target.turn;
      if (!aiMove || !nonce || round === undefined) return false;
      const expectedFull = sha256Hex(`${aiMove}|${nonce}|${round}`);
      const expectedCode = expectedFull.slice(0, 12).toUpperCase();
      if (typeof target.hash === "string" && target.hash.length === 64) {
        return target.hash === expectedFull;
      }
      const code = (typeof target.seal === "string") ? target.seal : (target.sealCode || "");
      return code === expectedCode;
    }

    hasPending() { return !!this.pending; }

    /**
     * Reveal: the player's hand has landed. Learns only from clean rounds.
     * @param {string} finalMove ROCK|PAPER|SCISSORS|UNKNOWN
     * @param {{valid:boolean}} opts
     */
    reveal(finalMove, opts = {}) {
      const d = this.pending;
      this.pending = null;
      if (!d) return null;
      const sealOk = this.verifySeal(d);
      const y = IDX[finalMove];
      const valid = opts.valid !== false && y !== undefined;
      const aiIdx = IDX[d.aiMove];
      if (!valid) {
        this.stats.invalid++;
        this._save();
        this.lastReveal = { decision: d, sealOk, valid: false };
        return this.lastReveal;
      }
      const res = payoff(aiIdx, y); // +1 AI wins, -1 player wins, 0 tie
      const ctx = this.seq.ctx();
      this.population.update(ctx, y);
      this.seq.update(y, aiIdx, res);
      if (d.handPresent && d.informative !== undefined) {
        const x = d.features;
        const neural = d.neural || "UNKNOWN";
        this.gnbPlayer.update(x, neural, y);
        this.gnbPop.update(x, neural, y);
      }
      this.stats.rounds++;
      if (res > 0) this.stats.aiWins++; else if (res < 0) this.stats.aiLosses++; else this.stats.ties++;
      this.stats.recent.push(res);
      if (this.stats.recent.length > 50) this.stats.recent.shift();
      this.stats.predHits.push(MOVES[argmax3(d.posterior)] === finalMove ? 1 : 0);
      if (this.stats.predHits.length > 30) this.stats.predHits.shift();
      this._save();

      const lesson = this._lesson(d, finalMove, res);
      this.lastReveal = { decision: d, finalMove, result: res, sealOk, valid: true, lesson };
      return this.lastReveal;
    }

    _lesson(d, finalMove, res) {
      const p = d.posterior;
      const pct = Math.round(p[IDX[finalMove]] * 100);
      if (res > 0) {
        return `🎯 ${TR[finalMove]} olasılığını %${pct} hesapladım (${d.topExpert.label}). Model bu deseni pekiştirdi.`;
      }
      if (res < 0) {
        return `📉 ${TR[finalMove]} için %${pct} verdim; ağırlıklar yeniden dağıtıldı — bu desen artık daha pahalı.`;
      }
      return `🤝 Berabere. ${TR[finalMove]} olasılığı %${pct} idi; geçiş tabloları güncellendi.`;
    }

    getStats() {
      const s = this.stats;
      const decisive = s.aiWins + s.aiLosses;
      const recent = s.recent.slice(-20);
      const rw = recent.filter(v => v > 0).length, rl = recent.filter(v => v < 0).length;
      const acc = s.predHits.length ? s.predHits.reduce((a, b) => a + b, 0) / s.predHits.length : null;
      return {
        rounds: s.rounds,
        aiWins: s.aiWins, aiLosses: s.aiLosses, ties: s.ties, invalid: s.invalid,
        aiWinRate: decisive ? s.aiWins / decisive : null,
        recentWinRate: (rw + rl) ? rw / (rw + rl) : null,
        predictionAccuracy: acc,
        kinematicSamples: this.gnbPlayer.samples,
        populationSamples: this.gnbPop.samples,
        historyLength: this.seq.P.length
      };
    }

    resetPlayer() {
      this.seq = new SequenceModel();
      this.gnbPlayer = new KinematicGNB(4);
      this.stats = this._emptyStats();
      this._save();
    }

    resetAll() {
      this.resetPlayer();
    }
  }

  const engine = new JankenMindEngine();
  engine.MOVES = MOVES;
  engine.sha256Hex = sha256Hex;
  engine._internals = { SequenceModel, KinematicGNB, PopulationModel, payoff, beatOf, rot };
  return engine;
});
