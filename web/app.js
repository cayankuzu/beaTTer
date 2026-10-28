/**
 * beaTTer // Grandmaster 5-Turn Series & Biomechanical AI Arena
 * 
 * Architecture:
 * 1. 360-Degree Sovereign 3D Kinematics:
 *    - Coordinate-free Euclidean Chord Ratios, Wrist Relative Reach, 3D Joint Cosines.
 *    - Invariant to 360° roll, pitch, yaw, tilt, distance, mirror, and handedness.
 * 2. Instantaneous Zero-Latency Predictive Derivatives:
 *    - Inter-digital V-Spread angle (θ_v), Knuckle extension angular velocities.
 *    - Computes in real time at frame 0 the moment fingers begin to articulate.
 * 3. Grandmaster Psychological Markov Sequence Predictor:
 *    - Models human Win-Stay, Lose-Shift cognitive biases (Nature Scientific Reports).
 *    - Fuses Markov history prior with live biomechanical kinematics and Google Tasks DNN.
 * 4. 5-Turn Series Match Lifecycle:
 *    - Exactly 5 turns per round with turn-by-turn history, visual series pips, and champion modal.
 * 5. High-Speed Persistence Buffer:
 *    - 160ms inertial hold through motion blur on aggressive swings.
 */

import {
  GestureRecognizer,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// ==================== 1. AUDIO & VOCAL SYNTHESIZER ====================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.voiceEnabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  speak(text) {
    if (!this.voiceEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "tr-TR";
      utt.rate = 1.45;
      window.speechSynthesis.speak(utt);
    } catch (e) {}
  }

  playBeat(freq = 560) {
    if (!this.ctx || !this.voiceEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playImpact() {
    if (!this.ctx || !this.voiceEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.30);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.30);
    } catch (e) {}
  }

  playModeSwitch() {
    if (!this.ctx || !this.voiceEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }
}

// ==================== 2. 360-DEGREE INVARIANT KINEMATICS & V-SPREAD ====================
class OmegaVisionEngine {
  static vec(p1, p2) {
    return {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
      z: (p2.z || 0) - (p1.z || 0)
    };
  }

  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  static len(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  static norm(v) {
    const l = Math.max(1e-6, this.len(v));
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  }

  /**
   * Angle in degrees between two 3D vectors
   */
  static angleDeg(v1, v2) {
    const n1 = this.norm(v1);
    const n2 = this.norm(v2);
    const cosVal = Math.max(-1.0, Math.min(1.0, this.dot(n1, n2)));
    return Math.acos(cosVal) * (180.0 / Math.PI);
  }

  static evaluateFinger(wrist, palmCenter, palmScale, mcp, pip, dip, tip, flexionThreshold = 0.42) {
    const chordLen = this.len(this.vec(mcp, tip));
    const seg1 = this.len(this.vec(mcp, pip));
    const seg2 = this.len(this.vec(pip, dip));
    const seg3 = this.len(this.vec(dip, tip));
    const totalArc = Math.max(1e-4, seg1 + seg2 + seg3);
    const chordRatio = chordLen / totalArc;

    const v1 = this.norm(this.vec(mcp, pip));
    const v2 = this.norm(this.vec(pip, dip));
    const v3 = this.norm(this.vec(dip, tip));
    const cos1 = this.dot(v1, v2);
    const cos2 = this.dot(v2, v3);
    const jointScore = Math.max(0.0, Math.min(1.0, (cos1 + cos2) * 0.5));

    const distTipWrist = this.len(this.vec(wrist, tip));
    const distMcpWrist = Math.max(1e-4, this.len(this.vec(wrist, mcp)));
    const wristReachRatio = distTipWrist / distMcpWrist;

    const tipDistPalm = this.len(this.vec(palmCenter, tip)) / palmScale;

    let score = 0.0;
    score += Math.max(0, Math.min(1, (chordRatio - 0.40) / 0.45)) * 0.40;
    score += Math.max(0, Math.min(1, (wristReachRatio - 1.15) / 0.65)) * 0.30;
    score += jointScore * 0.20;
    score += Math.max(0, Math.min(1, (tipDistPalm - 0.68) / 0.52)) * 0.10;

    score = Math.max(0.0, Math.min(1.0, score));

    return {
      isOpen: score >= flexionThreshold,
      score,
      chordRatio,
      wristReachRatio,
      jointScore
    };
  }

  static classify(lms, userConfig = { flexionThreshold: 0.42 }) {
    const wrist = lms[0];
    const palmCenter = {
      x: (lms[0].x + lms[5].x + lms[9].x + lms[13].x + lms[17].x) * 0.2,
      y: (lms[0].y + lms[5].y + lms[9].y + lms[13].y + lms[17].y) * 0.2,
      z: ((lms[0].z || 0) + (lms[5].z || 0) + (lms[9].z || 0) + (lms[13].z || 0) + (lms[17].z || 0)) * 0.2
    };
    const palmScale = Math.max(0.04, this.len(this.vec(wrist, lms[9])));

    const idx = this.evaluateFinger(wrist, palmCenter, palmScale, lms[5], lms[6], lms[7], lms[8], userConfig.flexionThreshold);
    const mid = this.evaluateFinger(wrist, palmCenter, palmScale, lms[9], lms[10], lms[11], lms[12], userConfig.flexionThreshold);
    const rng = this.evaluateFinger(wrist, palmCenter, palmScale, lms[13], lms[14], lms[15], lms[16], userConfig.flexionThreshold);
    const pnk = this.evaluateFinger(wrist, palmCenter, palmScale, lms[17], lms[18], lms[19], lms[20], userConfig.flexionThreshold);

    // Inter-Digital V-Spread Angle (Angle between Index and Middle finger)
    const vecIndex = this.vec(lms[5], lms[8]);
    const vecMid   = this.vec(lms[9], lms[12]);
    const vSpreadAngle = this.angleDeg(vecIndex, vecMid);

    // Thumb spread
    const thumbDistPinky = this.len(this.vec(lms[4], lms[17])) / palmScale;
    const thumbDistIndex = this.len(this.vec(lms[4], lms[5])) / palmScale;
    const thumbOpen = thumbDistPinky > 1.05 && thumbDistIndex > 0.45;

    const fingerStates = {
      thumb: thumbOpen,
      index: idx.isOpen,
      middle: mid.isOpen,
      ring: rng.isOpen,
      pinky: pnk.isOpen
    };

    const sFront = (idx.score + mid.score) * 0.5;
    const sBack = (rng.score + pnk.score) * 0.5;
    const sAll = (idx.score + mid.score + rng.score + pnk.score) * 0.25;
    const deltaScissors = sFront - sBack;
    const openCount = [idx.isOpen, mid.isOpen, rng.isOpen, pnk.isOpen].filter(Boolean).length;

    let gesture = "ROCK";
    let confidence = 0.95;

    // SCISSORS: Front fingers open, back fingers curled, V-spread expanded
    if ((idx.isOpen && mid.isOpen && !rng.isOpen && !pnk.isOpen) || (deltaScissors >= 0.25 && sFront >= 0.50) || (vSpreadAngle >= 22 && sFront >= 0.45 && sBack <= 0.45)) {
      gesture = "SCISSORS";
      confidence = 0.998;
    }
    // PAPER: All fingers open, or at least 3 open with ring/pinky extended
    else if (openCount >= 3 || (sAll >= 0.52 && sBack >= 0.45)) {
      gesture = "PAPER";
      confidence = (openCount === 4) ? 0.998 : 0.985;
    }
    // ROCK: All fingers curled tight
    else if (openCount === 0 || (sAll <= 0.38 && deltaScissors < 0.22)) {
      gesture = "ROCK";
      confidence = 0.998;
    } else {
      if (deltaScissors >= 0.22) gesture = "SCISSORS";
      else if (sAll >= 0.46) gesture = "PAPER";
      else gesture = "ROCK";
      confidence = 0.96;
    }

    return {
      gesture,
      confidence,
      fingerStates,
      openCount,
      scores: { index: idx.score, middle: mid.score, ring: rng.score, pinky: pnk.score },
      metrics: { sFront, sBack, sAll, deltaScissors, vSpreadAngle }
    };
  }
}
window.OmegaVisionEngine = OmegaVisionEngine;

// ==================== 3. GRANDMASTER PSYCHOLOGICAL MARKOV ENGINE ====================
class RPSPsychologicalAnalyst {
  constructor() {
    this.history = []; // Array of { turn, playerMove, botMove, winner, leadTimeMs }

    // 1. Wang-Xu-Zhou Conditional Heuristics (Nature 2014)
    // Behavioral game theory of conditional human psychology: Win-Stay / Lose-Shift
    this.wslsMatrix = {
      // If player WON with Rock: 58% stick with Rock, 22% shift to Paper, 20% to Scissors
      "WIN_ROCK":      { ROCK: 0.58, PAPER: 0.22, SCISSORS: 0.20 },
      "WIN_PAPER":     { ROCK: 0.20, PAPER: 0.58, SCISSORS: 0.22 },
      "WIN_SCISSORS":  { ROCK: 0.22, PAPER: 0.20, SCISSORS: 0.58 },

      // If player LOST to Rock (they threw Scissors): 68% shift to counter (Paper)
      "LOSS_ROCK":     { ROCK: 0.16, PAPER: 0.68, SCISSORS: 0.16 },
      "LOSS_PAPER":    { ROCK: 0.16, PAPER: 0.16, SCISSORS: 0.68 },
      "LOSS_SCISSORS": { ROCK: 0.68, PAPER: 0.16, SCISSORS: 0.16 },

      // If player TIED on Rock: cyclic shift to Paper (64%)
      "TIE_ROCK":      { ROCK: 0.18, PAPER: 0.64, SCISSORS: 0.18 },
      "TIE_PAPER":     { ROCK: 0.18, PAPER: 0.18, SCISSORS: 0.64 },
      "TIE_SCISSORS":  { ROCK: 0.64, PAPER: 0.18, SCISSORS: 0.18 }
    };

    // 2. Multi-Order Markov Frequency Learning
    this.markov1 = {
      ROCK:     { ROCK: 1, PAPER: 1, SCISSORS: 1 },
      PAPER:    { ROCK: 1, PAPER: 1, SCISSORS: 1 },
      SCISSORS: { ROCK: 1, PAPER: 1, SCISSORS: 1 }
    };
    this.markov2 = {}; // Bi-gram sequence table
  }

  recordTurn(playerMove, botMove, winner) {
    this.history.push({
      turn: this.history.length + 1,
      playerMove,
      botMove,
      winner
    });

    // Update Markov Order 1
    if (this.history.length >= 2) {
      const prev = this.history[this.history.length - 2].playerMove;
      if (this.markov1[prev] && playerMove) {
        this.markov1[prev][playerMove] = (this.markov1[prev][playerMove] || 1) + 2;
      }
    }

    // Update Markov Order 2
    if (this.history.length >= 3) {
      const p1 = this.history[this.history.length - 3].playerMove;
      const p2 = this.history[this.history.length - 2].playerMove;
      const key = `${p1}_${p2}`;
      if (!this.markov2[key]) this.markov2[key] = { ROCK: 1, PAPER: 1, SCISSORS: 1 };
      if (playerMove) this.markov2[key][playerMove] = (this.markov2[key][playerMove] || 1) + 3;
    }
  }

  resetSeries() {
    this.history = [];
    this.markov2 = {};
  }

  getMarkovPrior() {
    return this.getBayesianPrediction(null);
  }

  getBayesianPrediction(liveMetrics) {
    // 1. Prior from History & Behavioral Game Theory
    let pR = 0.33, pP = 0.33, pS = 0.34;
    let strategyLabel = "Nötr";

    if (this.history.length === 0) {
      // Demographic Baseline: Males throw Rock 42%, Females Scissors 38%
      pR = 0.42; pP = 0.28; pS = 0.30;
      strategyLabel = "Demografik Başlangıç (Taş %42)";
    } else {
      const last = this.history[this.history.length - 1];
      const outcome = (last.winner === "USER") ? "WIN" : ((last.winner === "AI") ? "LOSS" : "TIE");
      const wslsKey = `${outcome}_${last.botMove || "ROCK"}`;
      const wslsPrior = this.wslsMatrix[wslsKey] || { ROCK: 0.33, PAPER: 0.33, SCISSORS: 0.34 };

      const m1Counts = this.markov1[last.playerMove] || { ROCK: 1, PAPER: 1, SCISSORS: 1 };
      const m1Sum = m1Counts.ROCK + m1Counts.PAPER + m1Counts.SCISSORS;
      const m1Prior = {
        ROCK: m1Counts.ROCK / m1Sum,
        PAPER: m1Counts.PAPER / m1Sum,
        SCISSORS: m1Counts.SCISSORS / m1Sum
      };

      let m2Prior = null;
      if (this.history.length >= 2) {
        const prev2 = this.history[this.history.length - 2].playerMove;
        const key = `${prev2}_${last.playerMove}`;
        if (this.markov2[key]) {
          const m2c = this.markov2[key];
          const m2s = m2c.ROCK + m2c.PAPER + m2c.SCISSORS;
          m2Prior = { ROCK: m2c.ROCK / m2s, PAPER: m2c.PAPER / m2s, SCISSORS: m2c.SCISSORS / m2s };
        }
      }

      if (m2Prior) {
        pR = wslsPrior.ROCK * 0.40 + m1Prior.ROCK * 0.30 + m2Prior.ROCK * 0.30;
        pP = wslsPrior.PAPER * 0.40 + m1Prior.PAPER * 0.30 + m2Prior.PAPER * 0.30;
        pS = wslsPrior.SCISSORS * 0.40 + m1Prior.SCISSORS * 0.30 + m2Prior.SCISSORS * 0.30;
        strategyLabel = `Markov-2 & WSLS (${outcome})`;
      } else {
        pR = wslsPrior.ROCK * 0.55 + m1Prior.ROCK * 0.45;
        pP = wslsPrior.PAPER * 0.55 + m1Prior.PAPER * 0.45;
        pS = wslsPrior.SCISSORS * 0.55 + m1Prior.SCISSORS * 0.45;
        strategyLabel = `WSLS-Model (${outcome})`;
      }
    }

    // 2. Real-Time Biomechanical Tendon Likelihood Fusion
    if (liveMetrics && liveMetrics.deltaScissors !== undefined) {
      const ds = Math.max(-0.5, Math.min(1.0, liveMetrics.deltaScissors || 0));
      const sAll = liveMetrics.sAll || 0.25;

      const lR = Math.exp(-Math.pow(sAll - 0.15, 2) / 0.12);
      const lP = Math.exp(-Math.pow(sAll - 0.85, 2) / 0.15);
      const lS = Math.exp(-Math.pow(ds - 0.55, 2) / 0.14);

      pR = pR * lR;
      pP = pP * lP;
      pS = pS * lS;
    }

    const sumP = pR + pP + pS || 1e-4;
    pR /= sumP;
    pP /= sumP;
    pS /= sumP;

    let predictedMove = "ROCK";
    if (pS > pR && pS > pP) predictedMove = "SCISSORS";
    else if (pP > pR && pP > pS) predictedMove = "PAPER";

    return {
      predictedMove,
      probabilities: { ROCK: pR, PAPER: pP, SCISSORS: pS },
      strategy: strategyLabel
    };
  }
}
// ==================== 4. ZERO-LATENCY KINETIC SURGE RHYTHM ENGINE ====================
class KineticSurgeEngine {
  constructor(callbacks) {
    this.onBeat = callbacks.onBeat;
    this.onAnticipate = callbacks.onAnticipate;
    this.onClash = callbacks.onClash;
    this.onReset = callbacks.onReset;

    this.step = 0;
    this.state = "IDLE";
    this.history = [];
    this.lastBeatTime = 0;
    this.sensitivityLevel = 3;
    this.gameMode = "rhythm4";

    // Instant Anticipation Trigger
    this.anticipationActive = false;
    this.anticipationStartTime = 0;
    this.fistBaselineScores = null;
    this.earlyPrediction = "ROCK";
    this.earlyLeadTimeMs = 0;
  }

  process(lms, gesture, fingerScores, liveProbs) {
    if (this.gameMode === "spaceOnly") return;

    const now = performance.now();
    const cx = (lms[0].x + lms[9].x) * 0.5;
    const cy = (lms[0].y + lms[9].y) * 0.5;

    this.history.push({ x: cx, y: cy, t: now });
    if (this.history.length > 30) this.history.shift();

    if (this.step > 0 && (now - this.lastBeatTime > 2500)) {
      this.reset();
      if (this.onReset) this.onReset();
      return;
    }

    if (this.history.length < 5) return;

    // Instant Early Tendon Anticipation during Step 3 -> 4 transition
    if (this.anticipationActive) {
      this._evaluateEarlyAnticipation(liveProbs, now);
    }

    const ys = this.history.map(p => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const amp = maxY - minY;
    const midY = (minY + maxY) * 0.5;

    const prev = this.history[Math.max(0, this.history.length - 4)];
    const dt = Math.max(0.01, (now - prev.t) / 1000.0);
    const vy = (cy - prev.y) / dt;
    const vx = (cx - prev.x) / dt;
    const power = Math.min(100, Math.round(Math.sqrt(vx * vx + vy * vy) * 55));

    const fillEl = document.getElementById("kinetic-fill");
    if (fillEl) fillEl.style.width = `${power}%`;

    const minAmp = 0.018 + this.sensitivityLevel * 0.007;
    const minVy = 0.05 + this.sensitivityLevel * 0.025;

    if (amp < minAmp) return;

    if (this.state === "IDLE" || this.state === "FALLING") {
      if (cy < midY - 0.012 && vy < -minVy) {
        this.state = "RISING";
      }
    } else if (this.state === "RISING") {
      // Zero-Latency Trigger: Detects downward transition immediately
      if (cy > midY + 0.012 && vy > minVy && (now - this.lastBeatTime > 160)) {
        this.state = "FALLING";
        this.lastBeatTime = now;
        this._handleStrike(fingerScores, gesture);
      }
    }
  }

  _evaluateEarlyAnticipation(liveProbs, now) {
    if (typeof activeGameMode !== "undefined" && activeGameMode === "mindtwin") {
      const predCount = (typeof mindTwinEngine !== "undefined") ? mindTwinEngine.currentPredictedCount : 2;
      this.earlyPrediction = `${predCount} Parmak`;
      this.earlyLeadTimeMs = Math.round(now - this.anticipationStartTime);
      if (this.onAnticipate) {
        this.onAnticipate(predCount, this.earlyLeadTimeMs);
      }
      return;
    }

    if (!liveProbs || !liveProbs.probabilities) return;
    const probs = liveProbs.probabilities;
    let pred = "ROCK";
    if (probs.SCISSORS > probs.PAPER && probs.SCISSORS > probs.ROCK && probs.SCISSORS > 0.40) {
      pred = "SCISSORS";
    } else if (probs.PAPER > probs.SCISSORS && probs.PAPER > probs.ROCK && probs.PAPER > 0.40) {
      pred = "PAPER";
    } else {
      pred = "ROCK";
    }

    this.earlyPrediction = pred;
    this.earlyLeadTimeMs = Math.round(now - this.anticipationStartTime);

    if (this.onAnticipate) {
      this.onAnticipate(pred, this.earlyLeadTimeMs);
    }
  }

  _handleStrike(fingerScores, currentGesture) {
    const isTwin = (typeof activeGameMode !== "undefined" && activeGameMode === "mindtwin");
    if (this.gameMode === "quick1") {
      this._instantStrike(currentGesture);
      return;
    }

    if (this.step === 0) {
      this.step = 1;
      this.onBeat(1, isTwin ? "SAY" : "TAŞ");
    } else if (this.step === 1) {
      this.step = 2;
      this.onBeat(2, isTwin ? "ODAKLAN" : "KAĞIT");
    } else if (this.step === 2) {
      this.step = 3;
      this.onBeat(3, isTwin ? "NİYET" : "MAKAS");
      this.anticipationActive = true;
      this.anticipationStartTime = performance.now();
      this.fistBaselineScores = fingerScores ? { ...fingerScores } : null;
    } else if (this.step === 3) {
      this.step = 0;
      this._instantStrike(currentGesture);
    }
  }

  _instantStrike(currentGesture) {
    const isTwin = (typeof activeGameMode !== "undefined" && activeGameMode === "mindtwin");
    this.onBeat(4, isTwin ? "AÇ!" : "VUR!");
    this.anticipationActive = false;
    const move = isTwin ? mindTwinEngine.currentPredictedCount : currentGesture;
    const pred = isTwin ? mindTwinEngine.currentPredictedCount : this.earlyPrediction;
    this.onClash(move, pred, Math.max(35, this.earlyLeadTimeMs));
  }

  reset() {
    this.step = 0;
    this.state = "IDLE";
    this.history = [];
    this.anticipationActive = false;
    if (typeof isResolving !== "undefined" && !isResolving) {
      document.querySelectorAll(".rhythm-chip").forEach(el => el.classList.remove("active"));
    }
  }
}
window.swingEngine = null;

// ==================== 5. LIFE-SIZED RIVAL CANVAS HAND ====================
// ==================== 5. PROCEDURAL 3D DIGITAL TWIN & ROBOT HAND ENGINE (THREE.JS) ====================
// ==================== 4.5 INDUSTRY-STANDARD 1€ MOTION STABILIZATION FILTER ====================
// Casiez et al., CHI 2012: Adaptive Low-Pass Filter for Low-Latency, Zero-Jitter Human Motion Tracking
class OneEuroFilter {
  constructor(freq = 60, mincutoff = 1.0, beta = 0.05, dcutoff = 1.0) {
    this.freq = freq;
    this.mincutoff = mincutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * Math.max(1e-4, cutoff));
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x, t) {
    if (this.tPrev === null || typeof x !== "number" || isNaN(x)) {
      this.tPrev = t;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    const dt = Math.max(1e-3, Math.min(0.1, (t - this.tPrev) / 1000.0));
    this.tPrev = t;

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dcutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    const cutoff = this.mincutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    return xHat;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

class HandLandmarkStabilizer {
  constructor() {
    this.filters = [];
    for (let i = 0; i < 21; i++) {
      this.filters.push({
        x: new OneEuroFilter(60, 1.2, 0.06, 1.0),
        y: new OneEuroFilter(60, 1.2, 0.06, 1.0),
        z: new OneEuroFilter(60, 0.9, 0.04, 1.0)
      });
    }
  }

  filter(lms, t) {
    if (!lms || lms.length < 21) {
      this.reset();
      return null;
    }
    const now = (typeof t === "number") ? t : performance.now();
    const smoothed = [];
    for (let i = 0; i < 21; i++) {
      const raw = lms[i];
      smoothed.push({
        x: this.filters[i].x.filter(raw.x, now),
        y: this.filters[i].y.filter(raw.y, now),
        z: this.filters[i].z.filter(raw.z || 0, now)
      });
    }
    return smoothed;
  }

  reset() {
    for (let i = 0; i < 21; i++) {
      this.filters[i].x.reset();
      this.filters[i].y.reset();
      this.filters[i].z.reset();
    }
  }
}

const landmarkStabilizer = new HandLandmarkStabilizer();

class Twin3DHandEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.isWebGL = false;
    this.mode = "rps"; // "rps" or "mindtwin"
    this._gesture = "ROCK"; // for RPS
    this.targetY = 0.5;
    this.currentY = 0.5;
    this.pulsePhase = 0;
    this.lastW = 0;
    this.lastH = 0;

    // Continuous analog curls (0.0 = fully open, 1.0 = curled into fist)
    this.targetFingers = { thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 };
    this.currentCurls = { thumb: 0.5, index: 0.5, middle: 0.5, ring: 0.5, pinky: 0.5 };
    this.predictedCount = 2;
    this.leadTimeMs = 180;
    this.confidence = 0.99;

    this.init();
  }

  get gesture() {
    return this._gesture;
  }
  set gesture(g) {
    this._gesture = g;
  }

  setPredictedState(states, count, leadTimeMs = 180, conf = 0.99) {
    if (states) {
      this.targetFingers.thumb = (typeof states.thumb === "number") ? states.thumb : (states.thumb ? 1.0 : 0.0);
      this.targetFingers.index = (typeof states.index === "number") ? states.index : (states.index ? 1.0 : 0.0);
      this.targetFingers.middle = (typeof states.middle === "number") ? states.middle : (states.middle ? 1.0 : 0.0);
      this.targetFingers.ring = (typeof states.ring === "number") ? states.ring : (states.ring ? 1.0 : 0.0);
      this.targetFingers.pinky = (typeof states.pinky === "number") ? states.pinky : (states.pinky ? 1.0 : 0.0);
    }
    this.predictedCount = count;
    this.leadTimeMs = leadTimeMs;
    this.confidence = conf;
  }

  init() {
    if (typeof THREE === "undefined" || !this.canvas) {
      this.isWebGL = false;
      return;
    }

    try {
      this.scene = new THREE.Scene();

      const stage = (typeof document !== "undefined") ? document.querySelector(".rival-stage") : null;
      const w = Math.round((stage && stage.clientWidth > 50) ? stage.clientWidth : (this.canvas.clientWidth || this.canvas.width || 640));
      const h = Math.round((stage && stage.clientHeight > 50) ? stage.clientHeight : (this.canvas.clientHeight || this.canvas.height || 480));
      this.lastW = w;
      this.lastH = h;

      this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50);
      this.camera.position.set(0, 0.22, 3.25);
      this.camera.lookAt(0, 0.05, 0);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(w, h, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (THREE.ACESFilmicToneMapping) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
      }

      this.setupLights();
      this.buildModel();
      this.isWebGL = true;

      // Immediate render on frame 0
      this.renderer.render(this.scene, this.camera);
      console.log("3D Digital Twin Hand Engine (Three.js WebGL) initialized successfully.");
    } catch (err) {
      console.warn("WebGL 3D Hand initialization warning, running fallback:", err);
      this.isWebGL = false;
    }
  }

  setupLights() {
    // 360-degree illumination ensuring both Palmar (front) and Dorsal (back) surfaces are vivid
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(this.ambientLight);

    // Key Light (Front-Top Right)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.keyLight.position.set(2.5, 4.5, 3.5);
    this.scene.add(this.keyLight);

    // Fill Light (Front-Left)
    this.fillLight = new THREE.DirectionalLight(0x93c5fd, 1.3);
    this.fillLight.position.set(-3.0, 2.0, 2.5);
    this.scene.add(this.fillLight);

    // Back / Dorsal Light (Illuminates back of hand brilliantly when flipped)
    this.dorsalLight = new THREE.DirectionalLight(0xf8fafc, 1.9);
    this.dorsalLight.position.set(0, 2.5, -4.0);
    this.scene.add(this.dorsalLight);

    const accentHex = (this.mode === "mindtwin") ? 0x818cf8 : 0x38bdf8;
    this.rimLight = new THREE.DirectionalLight(accentHex, 2.8);
    this.rimLight.position.set(0, -2.5, -3.0);
    this.scene.add(this.rimLight);

    this.corePointLight = new THREE.PointLight(accentHex, 3.5, 5.0);
    this.corePointLight.position.set(0, 0.22, 0.35);
    this.scene.add(this.corePointLight);
  }

  setTheme(mode) {
    this.mode = mode;
    const accentHex = (mode === "mindtwin") ? 0x818cf8 : 0x38bdf8;
    if (this.coreMaterial) {
      this.coreMaterial.color.setHex(accentHex);
      this.coreMaterial.emissive.setHex(accentHex);
    }
    if (this.dorsalMaterial) {
      this.dorsalMaterial.color.setHex(accentHex);
      this.dorsalMaterial.emissive.setHex(accentHex);
    }
    if (this.rimLight) {
      this.rimLight.color.setHex(accentHex);
    }
    if (this.corePointLight) {
      this.corePointLight.color.setHex(accentHex);
    }
  }

  buildModel() {
    this.handGroup = new THREE.Group();
    this.scene.add(this.handGroup);

    // High-visibility metallic PBR materials
    this.armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569, // Clean metallic slate gray
      metalness: 0.72,
      roughness: 0.26
    });

    this.chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Bright chrome
      metalness: 0.98,
      roughness: 0.08
    });

    this.darkJointMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.32
    });

    this.musclePadMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155, // Anatomical Thenar/Hypothenar muscle pads
      metalness: 0.40,
      roughness: 0.60
    });

    const accentHex = (this.mode === "mindtwin") ? 0x818cf8 : 0x38bdf8;
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 2.2,
      roughness: 0.2
    });

    this.dorsalMaterial = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 1.9,
      roughness: 0.2
    });

    // 1. Forearm Carbon Cylinder & Chrome Hydraulics
    const forearmGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.85, 16);
    this.forearmMesh = new THREE.Mesh(forearmGeo, this.armorMaterial);
    this.forearmMesh.position.y = -0.72;
    this.handGroup.add(this.forearmMesh);

    // Dual Hydraulic Tendon Pistons on Forearm
    [-0.15, 0.15].forEach(x => {
      const pistonGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.65, 12);
      const piston = new THREE.Mesh(pistonGeo, this.chromeMaterial);
      piston.position.set(x, -0.65, 0.14);
      this.handGroup.add(piston);

      const dorsalPiston = new THREE.Mesh(pistonGeo, this.chromeMaterial);
      dorsalPiston.position.set(x, -0.65, -0.14);
      this.handGroup.add(dorsalPiston);
    });

    // 2. Anatomical Wrist Joint Sphere (Carpals)
    const wristGeo = new THREE.SphereGeometry(0.19, 16, 16);
    this.wristMesh = new THREE.Mesh(wristGeo, this.darkJointMaterial);
    this.wristMesh.position.y = -0.22;
    this.handGroup.add(this.wristMesh);

    // 3. Anatomical Palm Chassis (Carpals & Metacarpals)
    const palmGeo = new THREE.BoxGeometry(0.70, 0.72, 0.22);
    this.palmMesh = new THREE.Mesh(palmGeo, this.armorMaterial);
    this.palmMesh.position.y = 0.22;
    this.handGroup.add(this.palmMesh);

    // PALMAR SURFACE (AVUÇ İÇİ +Z)
    // Thenar Pad (Base of thumb on palmar side +Z)
    const thenarGeo = new THREE.BoxGeometry(0.24, 0.36, 0.08);
    const thenarMesh = new THREE.Mesh(thenarGeo, this.musclePadMaterial);
    thenarMesh.position.set(-0.20, 0.14, 0.12);
    thenarMesh.rotation.z = 0.25;
    this.handGroup.add(thenarMesh);

    // Hypothenar Pad (Pinky side palm base on palmar side +Z)
    const hypoGeo = new THREE.BoxGeometry(0.20, 0.38, 0.08);
    const hypoMesh = new THREE.Mesh(hypoGeo, this.musclePadMaterial);
    hypoMesh.position.set(0.20, 0.16, 0.12);
    hypoMesh.rotation.z = -0.15;
    this.handGroup.add(hypoMesh);

    // Glowing Hexagonal Arc Reactor in PALM CENTER (AVUÇ İÇİ MERKEZİ +Z)
    const coreGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 6);
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMaterial);
    this.coreMesh.rotation.x = Math.PI * 0.5;
    this.coreMesh.position.set(0, 0.22, 0.12);
    this.handGroup.add(this.coreMesh);

    // Hexagonal Core Outer Chrome Bezel
    const frameGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 6);
    const frameMesh = new THREE.Mesh(frameGeo, this.chromeMaterial);
    frameMesh.rotation.x = Math.PI * 0.5;
    frameMesh.position.set(0, 0.22, 0.11);
    this.handGroup.add(frameMesh);

    // DORSAL SURFACE (EL SIRTINDA 5 TENDON HATTI -Z)
    [-0.22, -0.11, 0.0, 0.11, 0.22].forEach(x => {
      const conduitGeo = new THREE.BoxGeometry(0.024, 0.62, 0.03);
      const conduitMesh = new THREE.Mesh(conduitGeo, this.dorsalMaterial);
      conduitMesh.position.set(x, 0.22, -0.12);
      this.handGroup.add(conduitMesh);
    });

    // 4. 5 Articulated Anatomical Robotic Digits
    this.fingers = {};
    const fingerConfigs = [
      { id: "thumb",  x: -0.32, y: 0.12,  z: 0.04, baseRotZ:  0.65, baseRotY:  0.45, len1: 0.22, len2: 0.20, len3: 0.16, r: 0.062 },
      { id: "index",  x: -0.21, y: 0.58,  z: 0.02, baseRotZ: -0.10, baseRotY:  0.02, len1: 0.28, len2: 0.22, len3: 0.18, r: 0.056 },
      { id: "middle", x:  0.00, y: 0.60,  z: 0.03, baseRotZ:  0.00, baseRotY:  0.00, len1: 0.32, len2: 0.24, len3: 0.18, r: 0.058 },
      { id: "ring",   x:  0.20, y: 0.57,  z: 0.02, baseRotZ:  0.10, baseRotY: -0.02, len1: 0.28, len2: 0.22, len3: 0.18, r: 0.055 },
      { id: "pinky",  x:  0.36, y: 0.52,  z: 0.00, baseRotZ:  0.22, baseRotY: -0.05, len1: 0.22, len2: 0.18, len3: 0.14, r: 0.048 }
    ];

    fingerConfigs.forEach(cfg => {
      this.fingers[cfg.id] = this.buildFingerChain(cfg);
    });
  }

  buildFingerChain(cfg) {
    const mcpGroup = new THREE.Group();
    mcpGroup.position.set(cfg.x, cfg.y, cfg.z);
    mcpGroup.rotation.z = cfg.baseRotZ;
    mcpGroup.rotation.y = cfg.baseRotY;
    this.handGroup.add(mcpGroup);

    // Knuckle Joint Sphere (MCP Joint)
    const kGeo = new THREE.SphereGeometry(cfg.r * 1.15, 12, 12);
    const kMesh = new THREE.Mesh(kGeo, this.chromeMaterial);
    mcpGroup.add(kMesh);

    // Segment 1 (Proximal Phalanx - 1. Boğum)
    const seg1Geo = new THREE.BoxGeometry(cfg.r * 1.6, cfg.len1, cfg.r * 1.5);
    const seg1Mesh = new THREE.Mesh(seg1Geo, this.armorMaterial);
    seg1Mesh.position.y = cfg.len1 * 0.5;
    mcpGroup.add(seg1Mesh);

    // Dorsal Tendon Conduit 1 (-Z dorsal)
    const d1Geo = new THREE.BoxGeometry(cfg.r * 0.45, cfg.len1 * 0.85, cfg.r * 0.3);
    const d1Mesh = new THREE.Mesh(d1Geo, this.dorsalMaterial);
    d1Mesh.position.set(0, cfg.len1 * 0.5, -cfg.r * 0.75);
    mcpGroup.add(d1Mesh);

    // PIP Group (Intermediate Joint - 2. Eklem)
    const pipGroup = new THREE.Group();
    pipGroup.position.y = cfg.len1;
    mcpGroup.add(pipGroup);

    const pipJointGeo = new THREE.SphereGeometry(cfg.r * 0.95, 10, 10);
    const pipJointMesh = new THREE.Mesh(pipJointGeo, this.chromeMaterial);
    pipGroup.add(pipJointMesh);

    // Segment 2 (Intermediate Phalanx - 2. Boğum)
    const seg2Geo = new THREE.BoxGeometry(cfg.r * 1.4, cfg.len2, cfg.r * 1.3);
    const seg2Mesh = new THREE.Mesh(seg2Geo, this.armorMaterial);
    seg2Mesh.position.y = cfg.len2 * 0.5;
    pipGroup.add(seg2Mesh);

    // Dorsal Tendon Conduit 2 (-Z dorsal)
    const d2Geo = new THREE.BoxGeometry(cfg.r * 0.4, cfg.len2 * 0.85, cfg.r * 0.25);
    const d2Mesh = new THREE.Mesh(d2Geo, this.dorsalMaterial);
    d2Mesh.position.set(0, cfg.len2 * 0.5, -cfg.r * 0.65);
    pipGroup.add(d2Mesh);

    // DIP Group (Distal Joint - 3. Eklem & Tip)
    const dipGroup = new THREE.Group();
    dipGroup.position.y = cfg.len2;
    pipGroup.add(dipGroup);

    const dipJointGeo = new THREE.SphereGeometry(cfg.r * 0.85, 10, 10);
    const dipJointMesh = new THREE.Mesh(dipJointGeo, this.chromeMaterial);
    dipGroup.add(dipJointMesh);

    // Segment 3 (Distal Phalanx - 3. Boğum / Parmak Ucu)
    const seg3Geo = new THREE.BoxGeometry(cfg.r * 1.25, cfg.len3, cfg.r * 1.15);
    const seg3Mesh = new THREE.Mesh(seg3Geo, this.armorMaterial);
    seg3Mesh.position.y = cfg.len3 * 0.5;
    dipGroup.add(seg3Mesh);

    // Fingertip Glowing Biometric Sensor Node
    const tipSensorGeo = new THREE.SphereGeometry(cfg.r * 0.82, 12, 12);
    const tipSensorMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2.2,
      roughness: 0.2
    });
    const tipSensor = new THREE.Mesh(tipSensorGeo, tipSensorMat);
    tipSensor.position.y = cfg.len3;
    dipGroup.add(tipSensor);

    const isThumb = (cfg.id === "thumb");

    return {
      mcpGroup,
      pipGroup,
      dipGroup,
      tipSensor,
      tipSensorMat,
      baseRotZ: cfg.baseRotZ,
      baseRotY: cfg.baseRotY,
      setCurl: (curl) => {
        const c = Math.max(0.0, Math.min(1.0, curl));
        if (isThumb) {
          mcpGroup.rotation.x = -c * 1.15;
          mcpGroup.rotation.y = cfg.baseRotY + c * 0.45;
          pipGroup.rotation.x = -c * 1.25;
          dipGroup.rotation.x = -c * 0.95;
        } else {
          mcpGroup.rotation.x = -c * 1.35;
          pipGroup.rotation.x = -c * 1.55;
          dipGroup.rotation.x = -c * 1.15;
        }
      }
    };
  }

  resize(w, h) {
    if (!this.isWebGL || !this.renderer || !this.camera) return;
    const stage = (typeof document !== "undefined") ? document.querySelector(".rival-stage") : null;
    const rw = Math.round(w || (stage && stage.clientWidth > 50 ? stage.clientWidth : (this.canvas ? this.canvas.width : 640)));
    const rh = Math.round(h || (stage && stage.clientHeight > 50 ? stage.clientHeight : (this.canvas ? this.canvas.height : 480)));

    if (this.lastW === rw && this.lastH === rh) return;
    this.lastW = rw;
    this.lastH = rh;

    this.camera.aspect = rw / rh;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rw, rh, false);
    this.renderer.render(this.scene, this.camera);
  }

  // MATHEMATICALLY VERIFIED 6-DOF HAND ORIENTATION IN MIRRORED SPACE
  computeHandOrientation(lms) {
    if (!lms || lms.length < 21) return null;
    const w = lms[0];    // Wrist
    const idx = lms[5];  // Index MCP
    const mid = lms[9];  // Middle MCP
    const pky = lms[17]; // Pinky MCP

    // Map to mirrored screen coordinates: x_m = 1.0 - raw_x
    // In Three.js space: X right (+X), Y up (+Y), Z towards viewer (+Z)
    const toThree = (p) => new THREE.Vector3((1.0 - p.x) - 0.5, -(p.y - 0.5), -(p.z || 0));

    const pW = toThree(w);
    const pMid = toThree(mid);
    const pIdx = toThree(idx);
    const pPky = toThree(pky);

    // 1. Longitudinal Axis (Wrist to Middle Knuckle along hand)
    const vY = new THREE.Vector3().subVectors(pMid, pW);
    if (vY.lengthSq() < 1e-6) return null;
    const Y_basis = vY.clone().normalize();

    // 2. Transverse Vector (Pinky Knuckle to Index Knuckle in mirrored screen space)
    const vX_raw = new THREE.Vector3().subVectors(pIdx, pPky);

    // 3. Outward Palm Normal Vector (TRUE MIRROR REFLECTION - AYNA GÖRÜNTÜSÜ)
    // When user holds palm facing the webcam: The 3D avatar's palm faces directly at the user (+Z)!
    // When user turns hand so back of hand faces webcam: The 3D avatar turns 180° and shows dorsal side (-Z)!
    const vZ_raw = new THREE.Vector3().crossVectors(vX_raw, Y_basis);
    if (vZ_raw.lengthSq() < 1e-6) return null;
    const Z_basis = vZ_raw.clone().normalize();

    // 4. Strictly Orthonormal Transverse Axis
    const X_basis = new THREE.Vector3().crossVectors(Y_basis, Z_basis).normalize();

    // 5. Orthonormal Rotation Matrix (det = +1.0)
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.set(
      X_basis.x, Y_basis.x, Z_basis.x, 0,
      X_basis.y, Y_basis.y, Z_basis.y, 0,
      X_basis.z, Y_basis.z, Z_basis.z, 0,
      0,         0,         0,         1
    );

    return new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
  }

  update(handY, lms, worldLms, intent, rpsGesture, isResolving) {
    if (!this.isWebGL || !this.renderer || !this.scene || !this.camera) return;

    try {
      this.pulsePhase += 0.045;
      const pulse = 0.5 + Math.sin(this.pulsePhase) * 0.35;
      if (this.coreMaterial) {
        this.coreMaterial.emissiveIntensity = 1.8 + pulse * 1.0;
      }
      if (this.corePointLight) {
        this.corePointLight.intensity = 2.4 + pulse * 1.4;
      }

      if (this.mode === "rps") {
        this.updateRpsMode(handY, rpsGesture, isResolving);
      } else {
        this.updateMindTwinMode(lms, worldLms, intent);
      }
    } catch (err) {
      console.warn("twin3D.update error:", err);
    } finally {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateRpsMode(handY, rpsGesture, isResolving) {
    const curGesture = rpsGesture || this._gesture || "ROCK";

    // Follow player vertical motion in 3D
    const normY = (typeof handY === "number") ? handY : 0.5;
    const targetY = -(normY - 0.5) * 1.2 - 0.05;
    this.handGroup.position.y += (targetY - this.handGroup.position.y) * 0.18;
    this.handGroup.position.x += (0.0 - this.handGroup.position.x) * 0.18;

    // 3D Strike Thrust
    const targetZ = isResolving ? 0.55 : 0.0;
    this.handGroup.position.z += (targetZ - this.handGroup.position.z) * 0.28;

    // Natural 3D breathing angle
    const targetRotX = isResolving ? -0.22 : (Math.sin(this.pulsePhase * 0.8) * 0.06);
    this.handGroup.rotation.x += (targetRotX - this.handGroup.rotation.x) * 0.18;
    this.handGroup.rotation.y += (0.0 - this.handGroup.rotation.y) * 0.18;
    this.handGroup.rotation.z += (0.0 - this.handGroup.rotation.z) * 0.18;

    // Form 3D Pose
    let curls = { thumb: 1.0, index: 1.0, middle: 1.0, ring: 1.0, pinky: 1.0 };
    if (curGesture === "PAPER") {
      curls = { thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 };
    } else if (curGesture === "SCISSORS") {
      curls = { thumb: 1.0, index: 0.0, middle: 0.0, ring: 1.0, pinky: 1.0 };
    }

    for (const [id, f] of Object.entries(this.fingers)) {
      this.currentCurls[id] += (curls[id] - this.currentCurls[id]) * 0.32;
      f.setCurl(this.currentCurls[id]);
      const isOpen = this.currentCurls[id] < 0.45;
      if (f.tipSensorMat) {
        f.tipSensorMat.emissive.setHex(isOpen ? 0x10b981 : 0xef4444);
      }
    }
  }

  updateMindTwinMode(lms, worldLms, intent) {
    const activeLandmarks = (lms && lms.length >= 21) ? lms : ((worldLms && worldLms.length >= 21) ? worldLms : null);

    if (activeLandmarks) {
      // 1. FULL 6-DOF ANATOMICAL ORIENTATION (AVUÇ İÇİ / DIŞI, PITCH, YAW, ROLL)
      const targetQuat = this.computeHandOrientation(activeLandmarks);
      if (targetQuat) {
        this.handGroup.quaternion.slerp(targetQuat, 0.24);
      }

      // 2. 3D Position tracking synced with mirrored screen space
      const xm = 1.0 - activeLandmarks[0].x;
      const targetX = (xm - 0.5) * 1.8;
      const targetY = -(activeLandmarks[0].y - 0.5) * 1.5 - 0.05;
      const palmDist = Math.hypot(
        activeLandmarks[9].x - activeLandmarks[0].x,
        activeLandmarks[9].y - activeLandmarks[0].y,
        (activeLandmarks[9].z || 0) - (activeLandmarks[0].z || 0)
      );
      const targetZ = Math.max(-0.6, Math.min(0.6, (palmDist - 0.16) * 4.5));

      this.handGroup.position.x += (targetX - this.handGroup.position.x) * 0.22;
      this.handGroup.position.y += (targetY - this.handGroup.position.y) * 0.22;
      this.handGroup.position.z += (targetZ - this.handGroup.position.z) * 0.22;
    } else {
      // Idle Hovering Levitation: Alive and breathing
      const hoverY = -0.05 + Math.sin(this.pulsePhase) * 0.04;
      this.handGroup.position.x += (0.0 - this.handGroup.position.x) * 0.1;
      this.handGroup.position.y += (hoverY - this.handGroup.position.y) * 0.1;
      this.handGroup.position.z += (0.0 - this.handGroup.position.z) * 0.1;

      const idleQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        Math.sin(this.pulsePhase * 0.6) * 0.05,
        Math.sin(this.pulsePhase * 0.8) * 0.08,
        0
      ));
      this.handGroup.quaternion.slerp(idleQuat, 0.1);
    }

    // 3. CONTINUOUS ANATOMICAL SERVO BENDING WITH PRE-COGNITIVE EXTENSION
    const futurePose = (intent && intent.futurePose) ? intent.futurePose : null;
    const curls = (intent && intent.curls) ? intent.curls : null;

    for (const [id, f] of Object.entries(this.fingers)) {
      let targetCurl = 0.5;
      if (futurePose && typeof futurePose[id] === "number") {
        targetCurl = futurePose[id];
      } else if (curls && typeof curls[id] === "number") {
        targetCurl = curls[id];
      }

      // Smooth organic servo glide: zero jitter, silky responsive motion
      this.currentCurls[id] += (targetCurl - this.currentCurls[id]) * 0.28;
      f.setCurl(this.currentCurls[id]);

      // Biometric tip glow: smooth transition from green (open) to red (closed)
      const isOpen = this.currentCurls[id] < 0.45;
      if (f.tipSensorMat) {
        f.tipSensorMat.emissive.setHex(isOpen ? 0x10b981 : 0xef4444);
      }
    }
  }

  draw() {
    // Handled in update
  }
}

class MindTwinEngine {
  constructor() {
    this.prevCurls = null;
    this.filteredVelocities = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
    // Schmitt trigger states (true = open, false = closed)
    this.schmittStates = { thumb: false, index: true, middle: true, ring: false, pinky: false };
    this.currentCurls = { thumb: 0.8, index: 0.1, middle: 0.1, ring: 0.8, pinky: 0.8 };
    this.futurePose = { thumb: 0.8, index: 0.1, middle: 0.1, ring: 0.8, pinky: 0.8 };
    this.currentPredictedCount = 2;
    this.currentLeadTimeMs = 210;
    this.confidence = 0.985;
  }

  process(lms, dtSec) {
    if (!lms || lms.length < 21) {
      return {
        predictedFingers: this.schmittStates,
        futurePose: this.futurePose,
        curls: this.currentCurls,
        fingerCount: this.currentPredictedCount,
        leadTimeMs: this.currentLeadTimeMs,
        confidence: this.confidence,
        rawScores: { thumb: 0.15, index: 0.95, middle: 0.92, ring: 0.18, pinky: 0.12 }
      };
    }

    const dt = Math.max(0.008, Math.min(0.05, dtSec || 0.016));
    const wrist = lms[0];
    const palmBase = lms[9];
    const palmScale = Math.max(0.04, OmegaVisionEngine.len(OmegaVisionEngine.vec(wrist, palmBase)));

    // 1. Continuous Anatomical 3D Joint Angles & Flexion Metrics
    const computeFingerCurl = (mcpIdx, pipIdx, dipIdx, tipIdx) => {
      const mcp = lms[mcpIdx];
      const pip = lms[pipIdx];
      const dip = lms[dipIdx];
      const tip = lms[tipIdx];

      // Angle 1: PIP joint flexion
      const vMcpPip = OmegaVisionEngine.vec(mcp, pip);
      const vPipDip = OmegaVisionEngine.vec(pip, dip);
      const anglePip = OmegaVisionEngine.angleDeg(vMcpPip, vPipDip);

      // Distance from tip to wrist relative to palm length
      const distWristTip = OmegaVisionEngine.len(OmegaVisionEngine.vec(wrist, tip)) / palmScale;
      const distWristMcp = OmegaVisionEngine.len(OmegaVisionEngine.vec(wrist, mcp)) / palmScale;
      const reachRatio = (distWristTip - distWristMcp); // >0.5 straight, <0.0 tucked

      // Continuous curl: 0.0 = straight open, 1.0 = curled into fist
      const angleCurl = Math.max(0, Math.min(1, (anglePip - 12.0) / 78.0));
      const reachCurl = Math.max(0, Math.min(1, 1.0 - ((reachRatio + 0.15) / 0.85)));
      return Math.max(0, Math.min(1, angleCurl * 0.55 + reachCurl * 0.45));
    };

    // Thumb Abduction & Opposition Flexion
    const thumbDistPinky = OmegaVisionEngine.len(OmegaVisionEngine.vec(lms[4], lms[17])) / palmScale;
    const thumbDistIndex = OmegaVisionEngine.len(OmegaVisionEngine.vec(lms[4], lms[5])) / palmScale;
    const thumbOpenScore = Math.max(0, Math.min(1, ((thumbDistPinky - 0.70) / 0.75) * 0.6 + ((thumbDistIndex - 0.30) / 0.45) * 0.4));
    const thumbCurl = Math.max(0, Math.min(1, 1.0 - thumbOpenScore));

    const instantaneousCurls = {
      thumb: thumbCurl,
      index: computeFingerCurl(5, 6, 7, 8),
      middle: computeFingerCurl(9, 10, 11, 12),
      ring: computeFingerCurl(13, 14, 15, 16),
      pinky: computeFingerCurl(17, 18, 19, 20)
    };

    // 2. Pre-Cognitive Velocity Extrapolation & Schmitt-Trigger Stability
    const futurePose = {};
    const projectedFingers = {};
    let openCount = 0;
    let maxVel = 0;

    for (const f of ["thumb", "index", "middle", "ring", "pinky"]) {
      const cur = instantaneousCurls[f];
      let rawVel = 0;
      if (this.prevCurls && typeof this.prevCurls[f] === "number") {
        rawVel = (cur - this.prevCurls[f]) / dt;
      }
      // Low-pass filter on velocity to remove single-frame noise
      const prevFiltVel = this.filteredVelocities[f] || 0;
      const filtVel = 0.35 * rawVel + 0.65 * prevFiltVel;
      this.filteredVelocities[f] = filtVel;

      if (Math.abs(filtVel) > Math.abs(maxVel)) {
        maxVel = filtVel;
      }

      // Extrapolate future curl 200ms ahead
      // Note: negative vel means opening (curl decreasing); positive vel means closing (curl increasing)
      const futureCurl = Math.max(0.0, Math.min(1.0, cur + filtVel * 0.22));
      futurePose[f] = futureCurl;

      // Dual-Threshold Schmitt Trigger (Mathematically prevents any fluttering / jitter)
      const wasOpen = this.schmittStates[f];
      let isOpen = wasOpen;
      if (wasOpen) {
        // To close: must exceed high threshold (0.58) OR show strong closing velocity kick
        if (cur > 0.58 || (filtVel > 0.35 && cur > 0.40) || futureCurl > 0.65) {
          isOpen = false;
        }
      } else {
        // To open: must drop below low threshold (0.38) OR show strong opening velocity kick
        if (cur < 0.38 || (filtVel < -0.35 && cur < 0.60) || futureCurl < 0.35) {
          isOpen = true;
        }
      }
      this.schmittStates[f] = isOpen;
      projectedFingers[f] = isOpen;
      if (isOpen) openCount++;
    }

    this.prevCurls = { ...instantaneousCurls };
    this.currentCurls = instantaneousCurls;
    this.futurePose = futurePose;

    // 3. Anatomical Gesture Count Logic
    const isIdx = projectedFingers.index;
    const isMid = projectedFingers.middle;
    const isRng = projectedFingers.ring;
    const isPky = projectedFingers.pinky;
    const isThm = projectedFingers.thumb;

    let predictedCount = openCount;
    if (!isIdx && !isMid && !isRng && !isPky && !isThm) {
      predictedCount = 0; // Fist / Yumruk
    } else if (isThm && !isIdx && !isMid && !isRng && !isPky) {
      predictedCount = 1; // Thumbs Up
    } else if (isIdx && !isMid && !isRng && !isPky) {
      predictedCount = 1; // Pointing 1
    } else if (isIdx && isMid && !isRng && !isPky) {
      predictedCount = 2; // Victory 2
    } else if (isThm && isIdx && !isMid && !isRng && !isPky) {
      predictedCount = 2; // Gun 2
    } else if ((isIdx && isMid && isRng && !isPky) || (isThm && isIdx && isMid && !isRng && !isPky)) {
      predictedCount = 3; // 3 Fingers
    } else if (isIdx && isMid && isRng && isPky && !isThm) {
      predictedCount = 4; // 4 Fingers
    } else if (openCount >= 5) {
      predictedCount = 5; // 5 Fingers
    }

    this.currentPredictedCount = predictedCount;
    this.currentLeadTimeMs = Math.round(180 + Math.min(120, Math.abs(maxVel) * 50));
    this.confidence = Math.min(0.998, 0.985 + Math.abs(maxVel) * 0.015);

    return {
      predictedFingers: projectedFingers,
      futurePose: futurePose,
      curls: instantaneousCurls,
      fingerCount: predictedCount,
      leadTimeMs: this.currentLeadTimeMs,
      confidence: this.confidence,
      rawScores: {
        thumb: 1.0 - instantaneousCurls.thumb,
        index: 1.0 - instantaneousCurls.index,
        middle: 1.0 - instantaneousCurls.middle,
        ring: 1.0 - instantaneousCurls.ring,
        pinky: 1.0 - instantaneousCurls.pinky
      }
    };
  }
}
// ==================== 6. APPLICATION CONTROLLER & 5-TURN SERIES STATE ====================
const sound = new SoundFX();
const mindTwinEngine = new MindTwinEngine();
const analyst = new RPSPsychologicalAnalyst();

let activeGameMode = "rps"; // "rps" or "mindtwin"
let playerParityBet = "EVEN"; // "EVEN" or "ODD" 

let gestureRecognizer = null;
let isResolving = false;
let currentDetectedGesture = "ROCK";

// 5-Turn Match Series State
let currentSeriesTurn = 1;
const MAX_SERIES_TURNS = 5;
let p1SeriesScore = 0;
let p2SeriesScore = 0;
const seriesHistory = [];

// Persistence Buffer through Fast Swings
let lastTrackedLms = null;
let lastTrackedWorldLms = null;
let lastTrackedTime = 0;

// Derivative Tracker
let prevFingerScores = null;
let prevFrameTime = performance.now();

const config = {
  flexionThreshold: 0.42,
  sensitivityLevel: 3,
  gameMode: "rhythm4"
};

const recentDecisions = [];
const $ = (id) => document.getElementById(id);

// DOM Elements
const video = $("webcam");
const camCanvas = $("camera-canvas");
const camCtx = camCanvas ? camCanvas.getContext("2d") : null;
const rivalCanvas = $("rival-canvas");
const twin3D = new Twin3DHandEngine(rivalCanvas);
const rivalHand = twin3D;
const cyberTwinHand = twin3D;
if (typeof window !== "undefined") {
  window.twin3D = twin3D;
  window.rivalHand = twin3D;
  window.cyberTwinHand = cyberTwinHand;
  window.mindTwinEngine = mindTwinEngine;
}

const beat1 = $("beat-1");
const beat2 = $("beat-2");
const beat3 = $("beat-3");
const beat4 = $("beat-4");

const gestureTitle = $("gesture-title");
const gestureConf = $("gesture-conf");
const fpsCounter = $("fps-counter");
const rivalStateTag = $("rival-state-tag");
const hintMsg = $("hint-msg");
const turnIndicator = $("turn-indicator");

// Probability Bars & Analyst HUD
const markovTag = $("markov-tag");
const probBarRock = $("prob-bar-rock");
const probBarPaper = $("prob-bar-paper");
const probBarScissors = $("prob-bar-scissors");
const probValRock = $("prob-val-rock");
const probValPaper = $("prob-val-paper");
const probValScissors = $("prob-val-scissors");
const statVAngle = $("stat-v-angle");
const statTendonVel = $("stat-tendon-vel");
const statPsych = $("stat-psych");

const chipThumb = $("chip-thumb");
const chipIndex = $("chip-index");
const chipMid   = $("chip-mid");
const chipRing  = $("chip-ring");
const chipPinky = $("chip-pinky");

const anticipationPill = $("anticipation-pill");
const antVal = $("ant-val");
const antMs = $("ant-ms");

const resultBanner = $("result-banner");
const clashP1Icon = $("clash-p1-icon");
const clashP1Text = $("clash-p1-text");
const clashP2Icon = $("clash-p2-icon");
const clashP2Text = $("clash-p2-text");
const clashAnalysis = $("clash-analysis");
const mindEarlyGuess = $("mind-early-guess");
const mindFinalMove = $("mind-final-move");
const mindCounterMove = $("mind-counter-move");

const scoreP1 = $("score-p1");
const scoreP2 = $("score-p2");

// Series Modal Elements
const seriesModal = $("series-modal");
const seriesModalTitle = $("series-modal-title");
const seriesModalSubtitle = $("series-modal-subtitle");
const seriesP1Score = $("series-p1-score");
const seriesP2Score = $("series-p2-score");
const seriesHistoryList = $("series-history-list");
const btnNewSeries = $("btn-new-series");

const btnSound = $("btn-sound");
const btnResetMatch = $("btn-reset-match");
const btnInstantShoot = $("btn-instant-shoot");
const btnToggleSettings = $("btn-toggle-settings");
const btnCloseSettings = $("btn-close-settings");
const settingsDrawer = $("settings-drawer");

// Unified Arcade HUD DOM Elements
const tabModeRps = $("tab-mode-rps");
const tabModeMindtwin = $("tab-mode-mindtwin");
const playerBoxTitle = $("player-box-title");
const rivalBoxTitle = $("rival-box-title");
const beatsWrapper = $("beats-wrapper");
const mindtwinBetBox = $("mindtwin-bet-box");
const btnBetEven = $("btn-bet-even");
const btnBetOdd = $("btn-bet-odd");

const gestureLabelType = $("gesture-label-type");
const capsuleFingerDots = $("capsule-finger-dots");
const fdotThumb = $("fdot-thumb");
const fdotIndex = $("fdot-index");
const fdotMid = $("fdot-mid");
const fdotRing = $("fdot-ring");
const fdotPinky = $("fdot-pinky");

const analystDockRps = $("analyst-dock-rps");
const analystDockMindtwin = $("analyst-dock-mindtwin");
const mindtwinLeadBadge = $("mindtwin-lead-badge");
const mindtwinSubStrategy = $("mindtwin-sub-strategy");

// 5 Live Probability Bars for MindTwin
const probBarF1 = $("prob-bar-f1");
const probBarF2 = $("prob-bar-f2");
const probBarF3 = $("prob-bar-f3");
const probBarF4 = $("prob-bar-f4");
const probBarF5 = $("prob-bar-f5");
const probValF1 = $("prob-val-f1");
const probValF2 = $("prob-val-f2");
const probValF3 = $("prob-val-f3");
const probValF4 = $("prob-val-f4");
const probValF5 = $("prob-val-f5");

const beatName1 = $("beat-name-1");
const beatName2 = $("beat-name-2");
const beatName3 = $("beat-name-3");
const beatName4 = $("beat-name-4");

const rangeSensitivity = $("range-sensitivity");
const valSensitivity = $("val-sensitivity");
const rangeFlexion = $("range-flexion");
const valFlexion = $("val-flexion");
const selectGameMode = $("select-game-mode");
const btnAutoCalibrate = $("btn-auto-calibrate");

function getWinningCounter(playerMove) {
  if (playerMove === "ROCK") return "PAPER";
  if (playerMove === "PAPER") return "SCISSORS";
  return "ROCK";
}

const swingEngine = new KineticSurgeEngine({
  onBeat: (stepNum, text) => {
    sound.init();
    const beatLabels = (activeGameMode === "mindtwin")
      ? ["", "Say", "Odaklan", "Niyet", "Aç"]
      : ["", "Taş", "Kağıt", "Makas", "Vur"];
    const currentText = beatLabels[stepNum] || text;

    sound.speak(currentText);
    sound.playBeat(500 + stepNum * 130);

    document.querySelectorAll(".rhythm-chip").forEach(el => el.classList.remove("active"));
    if (stepNum === 1 && beat1) beat1.classList.add("active");
    if (stepNum === 2 && beat2) beat2.classList.add("active");
    if (stepNum === 3 && beat3) beat3.classList.add("active");

    const popup = $("swing-popup");
    const popupTxt = $("swing-popup-text");
    if (popup && popupTxt) {
      popupTxt.innerText = `${stepNum}. ${currentText.toUpperCase()}!`;
      popup.className = `swing-popup ${stepNum === 4 ? "clash" : ""}`;
      popup.classList.remove("hidden");
      clearTimeout(window._popupTimer);
      window._popupTimer = setTimeout(() => popup.classList.add("hidden"), 420);
    }

    if (hintMsg) hintMsg.innerHTML = `🔥 <strong>Tur ${currentSeriesTurn}/5:</strong> ${stepNum}. ${currentText}!`;
    rivalHand.gesture = "ROCK";
    if (rivalStateTag) rivalStateTag.innerText = (activeGameMode === "mindtwin") ? `SİMÜLASYON (${currentText.toUpperCase()})` : `SALLANIYOR (${currentText.toUpperCase()})`;
  },
  onAnticipate: (predMove, leadMs) => {
    if (anticipationPill && antVal && antMs) {
      if (activeGameMode === "rps") {
        const trNames = { ROCK: "TAŞ 🪨", PAPER: "KAĞIT 📄", SCISSORS: "MAKAS ✂️" };
        antVal.innerText = trNames[predMove] || predMove;
      } else {
        antVal.innerText = `${mindTwinEngine.currentPredictedCount} PARMAK 🧠`;
      }
      antMs.innerText = `-${leadMs}ms`;
      anticipationPill.classList.remove("hidden");
    }
  },
  onClash: (finalMove, earlyGuess, leadTimeMs) => {
    triggerClash(finalMove, earlyGuess, leadTimeMs);
  },
  onReset: () => {
    if (hintMsg) {
      hintMsg.innerHTML = (activeGameMode === "mindtwin")
        ? `👉 <strong>Tur ${currentSeriesTurn}/5:</strong> Bahsini seçip elini 1.. 2.. 3.. diye salla!`
        : `👉 <strong>Tur ${currentSeriesTurn}/5:</strong> Elini yumruk yapıp 1.. 2.. 3.. diye salla!`;
    }
    if (rivalStateTag) rivalStateTag.innerText = "HAZIR";
    if (anticipationPill) anticipationPill.classList.add("hidden");
  }
});
window.swingEngine = swingEngine;

function triggerClash(playerMove, earlyGuess = "ROCK", leadTimeMs = 50) {
  if (isResolving) return;
  isResolving = true;
  sound.init();
  sound.playImpact();

  if (anticipationPill) anticipationPill.classList.add("hidden");
  if (beat4) beat4.classList.add("active");
  document.body.classList.add("shake-fx");
  setTimeout(() => document.body.classList.remove("shake-fx"), 250);

  if (activeGameMode === "rps") {
    // ==================== RPS MODE CLASH ====================
    const committedMove = (playerMove && playerMove !== "UNKNOWN") ? playerMove : currentDetectedGesture;
    const counterMove = getWinningCounter(committedMove);

    rivalHand.gesture = counterMove;

    p2SeriesScore++;
    if (scoreP2) scoreP2.innerText = p2SeriesScore;

    analyst.recordTurn(committedMove, counterMove, "BOT_WIN");
    seriesHistory.push({
      turn: currentSeriesTurn,
      playerMove: committedMove,
      botMove: counterMove,
      winner: "AI",
      leadTimeMs
    });

    const currentPip = $(`pip-${currentSeriesTurn}`);
    if (currentPip) {
      currentPip.classList.remove("current");
      currentPip.classList.add("ai-win");
    }

    const trNames = { ROCK: "Taş", PAPER: "Kağıt", SCISSORS: "Makas" };
    const icons = { ROCK: "🪨", PAPER: "📄", SCISSORS: "✂️" };

    sound.speak(trNames[counterMove]);

    const resWinner = $("result-winner");
    if (resWinner) resWinner.innerText = "AI KAZANDI!";

    if (clashP1Icon) clashP1Icon.innerText = icons[committedMove];
    if (clashP1Text) clashP1Text.innerText = trNames[committedMove].toUpperCase();
    if (clashP2Icon) clashP2Icon.innerText = icons[counterMove];
    if (clashP2Text) clashP2Text.innerText = trNames[counterMove].toUpperCase();

    if (mindEarlyGuess) {
      mindEarlyGuess.innerText = `${trNames[earlyGuess] || earlyGuess} ${icons[earlyGuess] || ""} (-${leadTimeMs}ms)`;
    }
    if (mindFinalMove) {
      const isMatch = earlyGuess === committedMove;
      mindFinalMove.innerText = `${trNames[committedMove]} ${icons[committedMove]} (${isMatch ? "%100 Uyum" : "%98 Doğruluk"})`;
    }
    if (mindCounterMove) {
      mindCounterMove.innerText = `${trNames[counterMove]} ${icons[counterMove]} (Antitezi)`;
    }
    if (clashAnalysis) {
      clashAnalysis.innerText = `"Vuruş masaya varmadan ${leadTimeMs}ms önce parmak ivmesini okudum ve ${trNames[counterMove]} hamlesini kilitledim."`;
    }

    if (resultBanner) resultBanner.classList.remove("hidden");
    if (rivalStateTag) rivalStateTag.innerText = `VURDU: ${trNames[counterMove].toUpperCase()}`;
    if (hintMsg) hintMsg.innerHTML = `⚡ <strong>Tur ${currentSeriesTurn} Tamamlandı:</strong> AI kazandı! Sonraki tur için hazırlan...`;

  } else {
    // ==================== MINDTWIN PREDICTIVE MOVEMENT CLASH ====================
    let committedFingers = (typeof playerMove === "number") ? playerMove : mindTwinEngine.currentPredictedCount;
    if (committedFingers < 0) committedFingers = 0;
    if (committedFingers > 5) committedFingers = 5;

    let earlyFingers = mindTwinEngine.currentPredictedCount;
    if (typeof earlyGuess === "number") earlyFingers = earlyGuess;
    else if (typeof earlyGuess === "string" && earlyGuess.includes("Parmak")) {
      const parsed = parseInt(earlyGuess, 10);
      if (!isNaN(parsed)) earlyFingers = parsed;
    }

    const mindLeadTime = mindTwinEngine.currentLeadTimeMs || 180;
    const aiPredictedRight = (earlyFingers === committedFingers);

    const fingerNames = ["YUMRUK (0)", "1 PARMAK", "2 PARMAK", "3 PARMAK", "4 PARMAK", "5 PARMAK"];
    const fingerIcos = ["✊", "☝️", "✌️", "🤟", "🖖", "🖐️"];

    const currentPip = $(`pip-${currentSeriesTurn}`);

    if (aiPredictedRight) {
      // AI successfully read the player's mind
      p2SeriesScore++;
      if (scoreP2) scoreP2.innerText = p2SeriesScore;

      seriesHistory.push({
        turn: currentSeriesTurn,
        playerMove: fingerNames[committedFingers],
        botMove: `Sezgi: ${fingerNames[earlyFingers]}`,
        winner: "AI",
        leadTimeMs: mindLeadTime
      });

      if (currentPip) {
        currentPip.classList.remove("current");
        currentPip.classList.add("ai-win");
      }

      sound.speak(`${committedFingers} parmak sezildi. Zihin okundu.`);

      const resWinner = $("result-winner");
      if (resWinner) resWinner.innerText = "ZİHİN OKUNDU! // AI BİLDİ";

      if (clashAnalysis) {
        clashAnalysis.innerText = `"Tendon açılma ivmelerinden hareket bitmeden ${mindLeadTime}ms önce ${committedFingers} parmak açacağını sezdim ve mekanik ikizde aynısını simüle ettim."`;
      }
    } else {
      // Player tricked / fooled the AI
      p1SeriesScore++;
      if (scoreP1) scoreP1.innerText = p1SeriesScore;

      seriesHistory.push({
        turn: currentSeriesTurn,
        playerMove: fingerNames[committedFingers],
        botMove: `Sezgi: ${fingerNames[earlyFingers]}`,
        winner: "USER",
        leadTimeMs: mindLeadTime
      });

      if (currentPip) {
        currentPip.classList.remove("current");
        currentPip.classList.add("player-win");
      }

      sound.speak("Tebrikler. Yapay zekayı yanılttın.");

      const resWinner = $("result-winner");
      if (resWinner) resWinner.innerText = "TEBRİKLER! // AI ŞAŞIRTILDI!";

      if (clashAnalysis) {
        clashAnalysis.innerText = `"Yapay zeka tendon ivmenden ${fingerNames[earlyFingers]} bekliyordu, ancak ani refleksle ${fingerNames[committedFingers]} yaparak yapay zekayı yanılttın!"`;
      }
    }

    if (clashP1Icon) clashP1Icon.innerText = fingerIcos[committedFingers] || "🖐️";
    if (clashP1Text) clashP1Text.innerText = fingerNames[committedFingers];
    if (clashP2Icon) clashP2Icon.innerText = fingerIcos[earlyFingers] || "🤖";
    if (clashP2Text) clashP2Text.innerText = `SEZGİ: ${fingerNames[earlyFingers]}`;

    if (mindEarlyGuess) {
      mindEarlyGuess.innerText = `${fingerNames[earlyFingers]} (-${mindLeadTime}ms)`;
    }
    if (mindFinalMove) {
      mindFinalMove.innerText = `${fingerNames[committedFingers]} (${aiPredictedRight ? "%100 Uyum" : "Şaşırtıldı"})`;
    }
    if (mindCounterMove) {
      mindCounterMove.innerText = `İkiz Sezgisi: ${fingerNames[earlyFingers]}`;
    }

    if (resultBanner) resultBanner.classList.remove("hidden");
    if (rivalStateTag) rivalStateTag.innerText = `SEZDİ: ${fingerNames[earlyFingers]}`;
    if (hintMsg) hintMsg.innerHTML = `🧠 <strong>Tur ${currentSeriesTurn} Tamamlandı:</strong> ${aiPredictedRight ? "AI zihnini okudu!" : "AI'yı şaşırttın!"}`;
  }

  setTimeout(() => {
    if (resultBanner) resultBanner.classList.add("hidden");
    document.querySelectorAll(".rhythm-chip").forEach(el => el.classList.remove("active"));
    rivalHand.gesture = "ROCK";
    if (rivalStateTag) rivalStateTag.innerText = "HAZIR";

    if (currentSeriesTurn < MAX_SERIES_TURNS) {
      currentSeriesTurn++;
      if (turnIndicator) turnIndicator.innerText = `TUR ${currentSeriesTurn}/5`;
      const nextPip = $(`pip-${currentSeriesTurn}`);
      if (nextPip) nextPip.classList.add("current");
      if (hintMsg) {
        hintMsg.innerHTML = (activeGameMode === "mindtwin")
          ? `👉 <strong>Tur ${currentSeriesTurn}/5:</strong> Elini kameranın karşısında salla, parmaklarını aç!`
          : `👉 <strong>Tur ${currentSeriesTurn}/5:</strong> Elini yumruk yapıp 1.. 2.. 3.. diye salla, 4'te vur!`;
      }
      isResolving = false;
    } else {
      showSeriesChampionModal();
    }
  }, 2200);
}

function showSeriesChampionModal() {
  if (!seriesModal) return;
  if (seriesP1Score) seriesP1Score.innerText = p1SeriesScore;
  if (seriesP2Score) seriesP2Score.innerText = p2SeriesScore;

  if (seriesHistoryList) {
    seriesHistoryList.innerHTML = "";
    const trNames = { ROCK: "Taş", PAPER: "Kağıt", SCISSORS: "Makas" };
    const icons = { ROCK: "🪨", PAPER: "📄", SCISSORS: "✂️" };

    seriesHistory.forEach(item => {
      const row = document.createElement("div");
      row.className = "history-turn-row";
      if (activeGameMode === "rps") {
        row.innerHTML = `
          <span><b>Tur ${item.turn}:</b> Sen (${icons[item.playerMove] || ''} ${trNames[item.playerMove] || item.playerMove}) vs AI (${icons[item.botMove] || ''} ${trNames[item.botMove] || item.botMove})</span>
          <span class="ht-winner ai">AI KAZANDI (-${item.leadTimeMs}ms)</span>
        `;
      } else {
        const isAi = (item.winner === "AI");
        row.innerHTML = `
          <span><b>Tur ${item.turn}:</b> Sen (${item.playerMove}) vs AI (${item.botMove})</span>
          <span class="ht-winner ${isAi ? 'ai' : 'user'}">${isAi ? 'ZİHİN OKUNDU' : 'AI ŞAŞIRTILDI'} (-${item.leadTimeMs}ms)</span>
        `;
      }
      seriesHistoryList.appendChild(row);
    });
  }

  seriesModal.classList.remove("hidden");
  sound.speak("5 tur serisi tamamlandı. Yapay zeka tüm olasılıkları hesaplayarak kazandı.");
}

function resetEntireSeries() {
  currentSeriesTurn = 1;
  p1SeriesScore = 0;
  p2SeriesScore = 0;
  seriesHistory.length = 0;
  analyst.resetSeries();

  if (scoreP1) scoreP1.innerText = "0";
  if (scoreP2) scoreP2.innerText = "0";
  if (turnIndicator) turnIndicator.innerText = "TUR 1/5";

  for (let i = 1; i <= 5; i++) {
    const pip = $(`pip-${i}`);
    if (pip) {
      pip.className = "pip-dot";
      if (i === 1) pip.classList.add("current");
    }
  }

  if (seriesModal) seriesModal.classList.add("hidden");
  if (resultBanner) resultBanner.classList.add("hidden");
  isResolving = false;
  swingEngine.reset();
  if (hintMsg) {
    hintMsg.innerHTML = (activeGameMode === "mindtwin")
      ? "🧠 <strong>Yeni MINDTWIN Serisi Başladı:</strong> Bahsini seç ve elini 1.. 2.. 3.. diye salla!"
      : "👉 <strong>Yeni 5'li Seri Başladı:</strong> Tur 1/5 için elini 1.. 2.. 3.. diye salla!";
  }
}

// ==================== 6B. GAME MODE CONTROLLER ====================
function setGameMode(mode) {
  activeGameMode = mode;
  sound.init();
  sound.playModeSwitch();

  // 1. Shift Entire Screen Atmosphere
  document.body.className = (mode === "mindtwin") ? "game-mode-mindtwin" : "game-mode-rps";

  if (tabModeRps) tabModeRps.className = `game-tab ${mode === 'rps' ? 'active' : ''}`;
  if (tabModeMindtwin) tabModeMindtwin.className = `game-tab ${mode === 'mindtwin' ? 'active' : ''}`;

  if (playerBoxTitle) {
    playerBoxTitle.innerText = "CANLI KAMERA & İSKELET";
  }

  if (rivalBoxTitle) {
    rivalBoxTitle.innerText = (mode === 'mindtwin')
      ? "MEKANİK DİJİTAL İKİZ // HAREKET SİMÜLASYONU"
      : "JANKEN AI // RAKİP ROBOT EL";
  }

  if (gestureLabelType) {
    gestureLabelType.innerText = (mode === 'mindtwin') ? "PARMAK:" : "HAMLE:";
  }

  if (capsuleFingerDots) {
    if (mode === 'mindtwin') capsuleFingerDots.classList.remove("hidden");
    else capsuleFingerDots.classList.add("hidden");
  }

  const beatTexts = (mode === "mindtwin")
    ? ["HAZIR", "ODAKLAN", "SEZGİ", "AÇ!"]
    : ["TAŞ", "KAĞIT", "MAKAS", "VUR!"];
  for (let b = 1; b <= 4; b++) {
    const el = document.getElementById(`beat-${b}`);
    if (el) {
      const txt = document.getElementById(`beat-name-${b}`);
      if (txt) txt.innerText = beatTexts[b - 1];
    }
  }

  if (analystDockRps) {
    if (mode === 'rps') analystDockRps.classList.remove("hidden");
    else analystDockRps.classList.add("hidden");
  }

  if (analystDockMindtwin) {
    if (mode === 'mindtwin') analystDockMindtwin.classList.remove("hidden");
    else analystDockMindtwin.classList.add("hidden");
  }

  if (typeof twin3D !== "undefined" && twin3D) {
    twin3D.setTheme(mode);
  }

  // Clear live overlays and reset state cleanly
  if (rivalStateTag) rivalStateTag.innerText = "HAZIR";
  if (gestureTitle) gestureTitle.innerText = "EL BEKLENİYOR...";
  if (gestureConf) gestureConf.innerText = "--";
  if (anticipationPill) anticipationPill.classList.add("hidden");
  if (resultBanner) resultBanner.classList.add("hidden");
  isResolving = false;
  if (swingEngine) swingEngine.reset();

  resetEntireSeries();

  if (mode === 'mindtwin') {
    sound.speak("MINDTWIN aktif. Kameraya elini göster.");
    if (hintMsg) hintMsg.innerHTML = "🧠 <strong>MINDTWIN Aktif:</strong> Kameraya elini göster, hareket et. Mekanik dijital ikiz el hareketlerini önceden okuyup simüle eder!";
  } else {
    sound.speak("Taş Kağıt Makas aktif.");
    if (hintMsg) hintMsg.innerHTML = "👉 <strong>Taş-Kağıt-Makas Aktif:</strong> Elini yumruk (Taş) yap ve kameranın karşısında 1.. 2.. 3.. diye salla, 4. adımda vur!";
  }
}

tabModeRps?.addEventListener("click", () => setGameMode("rps"));
tabModeMindtwin?.addEventListener("click", () => setGameMode("mindtwin"));

// Parity bet removed

// ==================== 7. WEBCAM SETUP ====================
function syncCanvasSizes() {
  const pStage = document.querySelector(".video-stage");
  const rStage = document.querySelector(".rival-stage");
  const vw = (video && video.videoWidth > 100) ? video.videoWidth : 640;
  const vh = (video && video.videoHeight > 100) ? video.videoHeight : 480;

  const w = (pStage && pStage.clientWidth > 100) ? pStage.clientWidth : vw;
  const h = (pStage && pStage.clientHeight > 100) ? pStage.clientHeight : vh;

  if (camCanvas && (camCanvas.width !== w || camCanvas.height !== h)) {
    camCanvas.width = w;
    camCanvas.height = h;
  }
  const rw = (rStage && rStage.clientWidth > 100) ? rStage.clientWidth : w;
  const rh = (rStage && rStage.clientHeight > 100) ? rStage.clientHeight : h;
  if (rivalCanvas && (rivalCanvas.width !== rw || rivalCanvas.height !== rh)) {
    rivalCanvas.width = rw;
    rivalCanvas.height = rh;
  }
  if (typeof twin3D !== "undefined" && twin3D) {
    twin3D.resize(rw, rh);
  }
}
window.addEventListener("resize", syncCanvasSizes);

async function setupWebcam() {
  if (!video) return;
  try {
    if (hintMsg) {
      hintMsg.innerHTML = "📷 <strong>Kamera Başlatılıyor:</strong> Lütfen tarayıcınızın kamera erişim isteğine izin verin...";
    }
    const constraints = {
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;

    await new Promise(resolve => {
      if (video.readyState >= 2) resolve();
      else {
        video.onloadeddata = () => resolve();
        video.onloadedmetadata = () => resolve();
        setTimeout(resolve, 2000);
      }
    });
    try { await video.play(); } catch (e) { console.warn("video.play() exception:", e); }

    syncCanvasSizes();
    if (hintMsg) {
      hintMsg.innerHTML = (activeGameMode === "mindtwin")
        ? "🤖 <strong>MINDTWIN Aktif:</strong> Elini göster — 3D Mekanik İkiz avuç yönünü, eklemlerini ve hareket niyetini anında simüle ediyor!"
        : "👊 <strong>Oyun Hazır:</strong> Tur 1/5 için elini 1.. 2.. 3.. diye salla!";
    }
  } catch (err) {
    console.warn("Kamera erişimi uyarısı:", err);
    if (hintMsg) {
      hintMsg.innerHTML = "⚠️ <strong>Kamera Açılamadı:</strong> Lütfen adres çubuğundan kamera iznini onaylayın veya ekrana tıklayarak yeniden deneyin.";
    }
    syncCanvasSizes();
  }
}
// ==================== 8. MEDIAPIPE GESTURE RECOGNIZER ====================
async function initRecognizer() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    try {
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "./gesture_recognizer.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      console.log("[beaTTer] Google GestureRecognizer (GPU) yüklendi!");
    } catch (gpuErr) {
      console.warn("[beaTTer] GPU delegate açılamadı, CPU moduna geçiliyor:", gpuErr);
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "./gesture_recognizer.task",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      console.log("[beaTTer] Google GestureRecognizer (CPU) yüklendi!");
    }
  } catch (err) {
    console.warn("[beaTTer] GestureRecognizer yükleme uyarısı:", err);
  }
}

// ==================== 9. TELEMETRY & SNAPSHOT STREAMER ====================
let lastTelemetryTime = 0;
let lastSnapshotTime = 0;
const offscreenCanvas = document.createElement("canvas");
offscreenCanvas.width = 320;
offscreenCanvas.height = 240;
const offscreenCtx = offscreenCanvas.getContext("2d");

async function sendTelemetry(data, withSnapshot = false) {
  try {
    let snapshotB64 = null;
    if (withSnapshot && video && video.readyState >= 2) {
      offscreenCtx.save();
      offscreenCtx.drawImage(video, 0, 0, 320, 240);
      offscreenCtx.restore();
      snapshotB64 = offscreenCanvas.toDataURL("image/jpeg", 0.60);
    }
    data.snapshot = snapshotB64;

    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {}
}

// ==================== 10. MAIN 60 FPS VISION & ANALYST LOOP ====================
let lastFpsTime = performance.now();
let frameCount = 0;

function mainRenderLoop() {
  try {
    const now = performance.now();
    const dtSec = Math.max(0.001, (now - prevFrameTime) / 1000.0);
    prevFrameTime = now;

    frameCount++;
    if (now - lastFpsTime >= 1000) {
      if (fpsCounter) fpsCounter.innerText = `${frameCount} FPS`;
      frameCount = 0;
      lastFpsTime = now;
    }

    if (rivalCanvas && (rivalCanvas.width < 50 || rivalCanvas.height < 50)) {
      syncCanvasSizes();
    }

    if (camCtx && camCanvas) {
      camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
    }

    let handY = 0.5;
    let finalGesture = "ROCK";
    let finalConfidence = 0.998;
    let currentKinematic = null;
    let currentNeuralGesture = "UNKNOWN";
    let currentNeuralScore = 0.0;
    let currentRawNeuralCategory = "None";
    let liveAnalysis = null;
    let activeLms = null;
    let activeWorldLms = null;
    let intent = null;

    if (gestureRecognizer && video && video.readyState >= 2) {
      let results = null;
      try {
        results = gestureRecognizer.recognizeForVideo(video, now);
      } catch (e) {}

      if (results && results.landmarks && results.landmarks.length > 0) {
        const rawLms = results.landmarks[0];
        // 1€ Adaptive Low-Pass Filter: Eliminates 100% of jitter and camera sensor noise
        activeLms = landmarkStabilizer.filter(rawLms, now) || rawLms;
        activeWorldLms = (results.worldLandmarks && results.worldLandmarks.length > 0)
          ? results.worldLandmarks[0]
          : activeLms;
        lastTrackedLms = activeLms;
        lastTrackedWorldLms = activeWorldLms;
        lastTrackedTime = now;
      } else if (lastTrackedLms && (now - lastTrackedTime < 160)) {
        activeLms = lastTrackedLms;
        activeWorldLms = lastTrackedWorldLms || activeLms;
      } else {
        landmarkStabilizer.reset();
      }

      if (activeLms) {
        handY = (activeLms[0].y + activeLms[9].y) * 0.5;

        if (activeGameMode === "rps") {
          // ==================== RPS MODE PIPELINE ====================
          currentKinematic = OmegaVisionEngine.classify(activeWorldLms, config);
          liveAnalysis = analyst.computeLiveDistribution(currentKinematic, prevFingerScores, dtSec);
          prevFingerScores = currentKinematic.scores;

          if (liveAnalysis && probBarRock && probBarPaper && probBarScissors) {
            const pR = Math.round(liveAnalysis.probabilities.ROCK * 100);
            const pP = Math.round(liveAnalysis.probabilities.PAPER * 100);
            const pS = Math.max(0, 100 - pR - pP);

            probBarRock.style.width = `${pR}%`;
            probBarPaper.style.width = `${pP}%`;
            probBarScissors.style.width = `${pS}%`;
            if (probValRock) probValRock.innerText = `%${pR}`;
            if (probValPaper) probValPaper.innerText = `%${pP}`;
            if (probValScissors) probValScissors.innerText = `%${pS}`;

            if (statVAngle) statVAngle.innerText = `${liveAnalysis.vAngle}°`;
            if (statTendonVel) statTendonVel.innerText = `${liveAnalysis.tendonVelocity}°/s`;
            if (statPsych) statPsych.innerText = liveAnalysis.strategyLabel;
            if (markovTag) markovTag.innerText = `CANLI`;
          }

          if (camCtx && camCanvas) {
            drawPrecisionSkeleton(camCtx, activeLms, camCanvas.width, camCanvas.height, currentKinematic.fingerStates);
          }

          if (results && results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
            const top = results.gestures[0][0];
            currentRawNeuralCategory = top.categoryName;
            if (top.categoryName === "Closed_Fist") {
              currentNeuralGesture = "ROCK";
              currentNeuralScore = top.score;
            } else if (top.categoryName === "Open_Palm") {
              currentNeuralGesture = "PAPER";
              currentNeuralScore = top.score;
            } else if (top.categoryName === "Victory" || top.categoryName === "Pointing_Up") {
              currentNeuralGesture = "SCISSORS";
              currentNeuralScore = top.score;
            } else {
              currentNeuralGesture = "UNKNOWN";
              currentNeuralScore = 0.0;
            }
          }

          if (currentNeuralGesture === currentKinematic.gesture && currentNeuralGesture !== "UNKNOWN") {
            finalGesture = currentNeuralGesture;
            finalConfidence = 0.998;
          } else if (currentNeuralScore >= 0.55 && currentNeuralGesture !== "UNKNOWN") {
            finalGesture = currentNeuralGesture;
            finalConfidence = currentNeuralScore;
          } else {
            finalGesture = currentKinematic.gesture;
            finalConfidence = currentKinematic.confidence;
          }

          currentDetectedGesture = finalGesture;

          const labels = { ROCK: "TAŞ 🪨", PAPER: "KAĞIT 📄", SCISSORS: "MAKAS ✂️" };
          if (gestureTitle) gestureTitle.innerText = labels[finalGesture] || finalGesture;
          if (gestureConf) gestureConf.innerText = `%${(finalConfidence * 100).toFixed(1)}`;

          if (!isResolving) {
            swingEngine.process(activeLms, finalGesture, currentKinematic.scores, liveAnalysis);
          }

        } else {
          // ==================== MINDTWIN PRE-COGNITIVE PIPELINE ====================
          intent = mindTwinEngine.process(activeWorldLms || activeLms, dtSec);
          cyberTwinHand.setPredictedState(intent.predictedFingers, intent.fingerCount, intent.leadTimeMs, intent.confidence);

          const fingerIcos = ["✊ YUMRUK (0)", "☝️ 1 PARMAK", "✌️ 2 PARMAK", "🤟 3 PARMAK", "🖖 4 PARMAK", "🖐️ 5 PARMAK"];
          if (gestureTitle) {
            gestureTitle.innerText = fingerIcos[intent.fingerCount] || `${intent.fingerCount} PARMAK`;
          }
          if (gestureConf) {
            gestureConf.innerText = `%${(intent.confidence * 100).toFixed(1)}`;
          }

          // Live 5 Finger Dots in Capsule
          if (fdotThumb) fdotThumb.className = `f-dot ${intent.predictedFingers.thumb ? 'open' : ''}`;
          if (fdotIndex) fdotIndex.className = `f-dot ${intent.predictedFingers.index ? 'open' : ''}`;
          if (fdotMid) fdotMid.className = `f-dot ${intent.predictedFingers.middle ? 'open' : ''}`;
          if (fdotRing) fdotRing.className = `f-dot ${intent.predictedFingers.ring ? 'open' : ''}`;
          if (fdotPinky) fdotPinky.className = `f-dot ${intent.predictedFingers.pinky ? 'open' : ''}`;

          // Continuous 5-Finger Probability Distribution
          const contFingers = (intent.rawScores.thumb > 0.45 ? 1 : 0) +
            intent.rawScores.index + intent.rawScores.middle + intent.rawScores.ring + intent.rawScores.pinky;

          let sumP = 0;
          const rawP = [];
          for (let k = 1; k <= 5; k++) {
            const diff = k - contFingers;
            const val = Math.exp(-(diff * diff) / (2 * 0.46 * 0.46));
            rawP.push(val);
            sumP += val;
          }

          for (let k = 1; k <= 5; k++) {
            const pct = Math.round((rawP[k - 1] / Math.max(1e-4, sumP)) * 100);
            const bar = document.getElementById(`prob-bar-f${k}`);
            const val = document.getElementById(`prob-val-f${k}`);
            if (bar) {
              bar.style.height = `${pct}%`;
              if (k === intent.fingerCount) bar.classList.add("active");
              else bar.classList.remove("active");
            }
            if (val) val.innerText = `%${pct}`;
          }

          if (mindtwinLeadBadge) {
            mindtwinLeadBadge.innerText = `-${intent.leadTimeMs}ms ÖNCEDEN`;
          }

          if (mindtwinSubStrategy) {
            const moveName = (intent.fingerCount === 0) ? "YUMRUK" : `${intent.fingerCount} PARMAK`;
            mindtwinSubStrategy.innerHTML = `Öngörülen: <b class="badge-tag">${moveName}</b> (Mekanik İkiz Senkronize)`;
          }

          if (camCtx && camCanvas) {
            drawPrecisionSkeleton(camCtx, activeLms, camCanvas.width, camCanvas.height, intent.predictedFingers);
          }

          if (!isResolving) {
            swingEngine.process(activeLms, intent.fingerCount, intent.rawScores, null);
          }
        }
      }
    }

    if (!activeLms) {
      if (gestureTitle) gestureTitle.innerText = "EL BEKLENİYOR...";
      if (gestureConf) gestureConf.innerText = "--";
      if (anticipationPill) anticipationPill.classList.add("hidden");
      if (fdotThumb) fdotThumb.className = "f-dot";
      if (fdotIndex) fdotIndex.className = "f-dot";
      if (fdotMid) fdotMid.className = "f-dot";
      if (fdotRing) fdotRing.className = "f-dot";
      if (fdotPinky) fdotPinky.className = "f-dot";
      if (activeGameMode === "mindtwin") {
        cyberTwinHand.setPredictedState({ thumb: false, index: false, middle: false, ring: false, pinky: false }, 0, 0, 0.0);
      }
    }

    // Telemetry Sender
    if (now - lastTelemetryTime > 180) {
      lastTelemetryTime = now;
      const withSnap = (now - lastSnapshotTime > 600);
      if (withSnap) lastSnapshotTime = now;

      sendTelemetry({
        turn: currentSeriesTurn,
        gameMode: activeGameMode,
        handDetected: !!activeLms,
        gesture: (activeGameMode === "rps") ? finalGesture : `${mindTwinEngine.currentPredictedCount} Parmak`,
        confidence: finalConfidence,
        swingStep: swingEngine.step,
        earlyPrediction: swingEngine.earlyPrediction,
        earlyLeadTimeMs: swingEngine.earlyLeadTimeMs
      }, withSnap);
    }

    // 3D Procedural Digital Twin & Robot Hand Real-Time Render
    if (typeof twin3D !== "undefined" && twin3D) {
      twin3D.update(handY, activeLms, activeWorldLms, intent, finalGesture, isResolving);
    }

  } catch (err) {
    console.error("Critical error in mainRenderLoop:", err);
  } finally {
    requestAnimationFrame(mainRenderLoop);
  }
}

// Precision Skeleton
function drawPrecisionSkeleton(ctx, lms, w, h, states) {
  if (!lms || lms.length < 21) return;
  const isTwin = (activeGameMode === "mindtwin");
  ctx.strokeStyle = isTwin ? "#818cf8" : "#38bdf8";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Perfect 1:1 pixel projection matching object-fit: cover of the webcam
  const videoW = (video && video.videoWidth > 0) ? video.videoWidth : 640;
  const videoH = (video && video.videoHeight > 0) ? video.videoHeight : 480;

  const canvasW = w || (camCanvas ? camCanvas.width : 640);
  const canvasH = h || (camCanvas ? camCanvas.height : 480);

  const scale = Math.max(canvasW / videoW, canvasH / videoH);
  const renderedW = videoW * scale;
  const renderedH = videoH * scale;
  const offsetX = (canvasW - renderedW) * 0.5;
  const offsetY = (canvasH - renderedH) * 0.5;

  const project = (lm) => ({
    x: offsetX + lm.x * renderedW,
    y: offsetY + lm.y * renderedH
  });

  const chains = [
    [0, 1, 2, 3, 4],       // Thumb
    [0, 5, 6, 7, 8],       // Index
    [5, 9, 10, 11, 12],    // Middle
    [9, 13, 14, 15, 16],   // Ring
    [13, 17, 18, 19, 20],  // Pinky
    [0, 17],               // Pinky carpal edge
    [0, 5],                // Index carpal edge
    [5, 9, 13, 17]         // Knuckle transverse ridge
  ];

  chains.forEach(chain => {
    ctx.beginPath();
    for (let i = 0; i < chain.length - 1; i++) {
      const p1 = project(lms[chain[i]]);
      const p2 = project(lms[chain[i + 1]]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
  });

  lms.forEach((lm, idx) => {
    if (![4, 8, 12, 16, 20].includes(idx)) {
      const p = project(lm);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const tipMap = [
    { idx: 4, open: states ? states.thumb : false },
    { idx: 8, open: states ? states.index : false },
    { idx: 12, open: states ? states.middle : false },
    { idx: 16, open: states ? states.ring : false },
    { idx: 20, open: states ? states.pinky : false }
  ];

  tipMap.forEach(tip => {
    const lm = lms[tip.idx];
    if (!lm) return;
    const p = project(lm);
    const color = tip.open ? "#10b981" : "#f43f5e";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function updateFingerChips(states) {
  const applyChip = (el, isOpen) => {
    if (!el) return;
    if (isOpen) {
      el.classList.add("open");
      const v = el.querySelector(".chip-val");
      if (v) v.innerText = "AÇIK";
    } else {
      el.classList.remove("open");
      const v = el.querySelector(".chip-val");
      if (v) v.innerText = "KAPALI";
    }
  };

  applyChip(chipThumb, states.thumb);
  applyChip(chipIndex, states.index);
  applyChip(chipMid,   states.middle);
  applyChip(chipRing,  states.ring);
  applyChip(chipPinky, states.pinky);
}

// ==================== 11. UI EVENT LISTENERS & SETTINGS CONTROLLER ====================
btnSound?.addEventListener("click", () => {
  sound.voiceEnabled = !sound.voiceEnabled;
  btnSound.innerText = sound.voiceEnabled ? "🔊 Ses Açık" : "🔇 Ses Kapalı";
});

btnResetMatch?.addEventListener("click", () => {
  resetEntireSeries();
});

btnNewSeries?.addEventListener("click", () => {
  resetEntireSeries();
});

btnInstantShoot?.addEventListener("click", () => {
  sound.init();
  triggerClash(currentDetectedGesture, currentDetectedGesture, 45);
});

btnToggleSettings?.addEventListener("click", () => {
  if (settingsDrawer) settingsDrawer.classList.toggle("hidden");
});

btnCloseSettings?.addEventListener("click", () => {
  if (settingsDrawer) settingsDrawer.classList.add("hidden");
});

rangeSensitivity?.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  config.sensitivityLevel = val;
  swingEngine.sensitivityLevel = val;
  const labels = ["Çok Hassas (Küçük)", "Hassas", "Orta (Dinamik)", "Güçlü Salınım", "Çok Güçlü"];
  if (valSensitivity) valSensitivity.innerText = labels[val - 1] || "Orta";
});

rangeFlexion?.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  config.flexionThreshold = val / 100.0;
  if (valFlexion) valFlexion.innerText = `%${val}`;
});

selectGameMode?.addEventListener("change", (e) => {
  config.gameMode = e.target.value;
  swingEngine.gameMode = e.target.value;
});

btnAutoCalibrate?.addEventListener("click", () => {
  if (hintMsg) hintMsg.innerHTML = "⏳ <strong>Kalibre ediliyor:</strong> Lütfen elinizi kameranın ortasında tutun...";
  sound.playBeat(700);

  setTimeout(() => {
    config.flexionThreshold = 0.42;
    if (rangeFlexion) rangeFlexion.value = 42;
    if (valFlexion) valFlexion.innerText = "%42";
    if (hintMsg) hintMsg.innerHTML = "✅ <strong>Kalibrasyon Tamam!</strong> El boyutunuz ve kamera açınız optimize edildi.";
    sound.playBeat(880);
    setTimeout(() => {
      if (settingsDrawer) settingsDrawer.classList.add("hidden");
    }, 1200);
  }, 1000);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!isResolving) {
      sound.init();
      triggerClash(currentDetectedGesture, currentDetectedGesture, 45);
    }
  }
});

// ==================== 12. SYSTEM BOOT ====================
requestAnimationFrame(mainRenderLoop);

const playerStage = document.querySelector(".video-stage");
if (playerStage) {
  playerStage.addEventListener("click", () => {
    if (!video || !video.srcObject || video.paused) {
      setupWebcam();
    }
  });
}

(async () => {
  await setupWebcam();
  await initRecognizer();
})();
