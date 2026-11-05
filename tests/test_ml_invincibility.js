// ==================== ML ENGINE & INVINCIBILITY VERIFICATION SUITE ====================
const assert = require("assert");

// Mock Browser Globals
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};
global.navigator = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  language: "tr-TR",
  hardwareConcurrency: 16
};
global.screen = { width: 1920, height: 1080, colorDepth: 24 };
global.window = global;
global.performance = { now: () => Date.now() };
global.fetch = async () => ({ ok: true, json: async () => [] });

const JankenMind = require("../web/ml_engine.js");
global.window.JankenMind = JankenMind;
const CognitiveBrain = require("../web/cognitive_brain.js");

let passed = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  passed++;
  console.log(`  PASS: ${msg}`);
}

function getBeat(m) {
  if (m === "ROCK") return "PAPER";
  if (m === "PAPER") return "SCISSORS";
  return "ROCK";
}

function getOutcome(playerMove, aiMove) {
  if (playerMove === aiMove) return "TIE";
  if (getBeat(playerMove) === aiMove) return "AI";
  return "USER";
}

(async () => {
  console.log("=== RUNNING ML ENGINE & INVINCIBILITY BENCHMARK ===");

  // 1. Test Round 1 & Mid-Air Kinematic Invincibility (Zero Self-Sabotage)
  JankenMind.resetAll();
  for (const move of ["ROCK", "PAPER", "SCISSORS"]) {
    const dec = CognitiveBrain.evaluateDecision(move, 0.94, { rock: 33, paper: 33, scissors: 34 }, 195);
    const expectedCounter = getBeat(move);
    check(
      dec.counterMove === expectedCounter,
      `Mid-air pre-lock (-195ms) for ${move} deterministically locks winning counter ${expectedCounter} (got ${dec.counterMove})`
    );
    check(
      dec.seal && typeof dec.seal.hash === "string" && dec.seal.hash.length === 64,
      `Cryptographic SHA-256 pre-lock seal generated for ${move}: #${dec.seal.short}`
    );
    check(
      JankenMind.verifySeal(dec.seal) === true,
      `Cryptographic SHA-256 seal verified authentic for ${move}`
    );
  }

  // 2. Test Tamper Detection on Cryptographic Seal
  const sampleSeal = JankenMind.commit({ leadTimeMs: 180 }).seal;
  const tamperedSeal = { ...sampleSeal, aiMove: getBeat(sampleSeal.aiMove) };
  check(
    JankenMind.verifySeal(tamperedSeal) === false,
    "Cryptographic seal rejects post-hoc AI move tampering (Anti-Cheat Guarantee)"
  );

  // 3. Test Mid-Air Kinematic GNB + Velocity Trajectory Anticipation
  JankenMind.resetAll();
  JankenMind.startTurn(1);
  // Simulate finger extension accelerating in mid-air (sFront rising from 0.18 -> 0.46, sBack still low)
  JankenMind.observeFrame({
    scores: { index: 0.25, middle: 0.24, ring: 0.08, pinky: 0.07 },
    vFront: 2.8,
    vBack: 0.1,
    neuralGesture: "UNKNOWN",
    neuralScore: 0.0,
    dropProgress: 0.35,
    dtSec: 0.016
  });
  const snap = JankenMind.observeFrame({
    scores: { index: 0.56, middle: 0.54, ring: 0.10, pinky: 0.08 },
    vFront: 3.4,
    vBack: 0.1,
    neuralGesture: "SCISSORS",
    neuralScore: 0.82,
    dropProgress: 0.45,
    dtSec: 0.016
  });
  check(
    snap.predictedPlayerMove === "SCISSORS" && snap.recommendedAiMove === "ROCK",
    `Mid-air Kinematic GNB anticipates SCISSORS from tendon velocity & locks ROCK (P(Scissors)=${(snap.playerProbs.SCISSORS * 100).toFixed(1)}%)`
  );

  // 4. Test Directional Feint Matrix (Learns ROCK->SCISSORS feint without breaking PAPER)
  // Teach 2 directional feints: player shows ROCK early, snaps to SCISSORS at impact
  await CognitiveBrain.recordRound({
    playerMove: "SCISSORS",
    aiMove: "PAPER",
    earlyGuess: "ROCK",
    winner: "USER",
    leadTimeMs: 180,
    vAngle: 26,
    tendonVelocity: 310,
    handDetected: true,
    confidence: 0.96
  });
  await CognitiveBrain.recordRound({
    playerMove: "SCISSORS",
    aiMove: "PAPER",
    earlyGuess: "ROCK",
    winner: "USER",
    leadTimeMs: 175,
    vAngle: 28,
    tendonVelocity: 325,
    handDetected: true,
    confidence: 0.96
  });

  const antiFeintRock = CognitiveBrain.evaluateDecision("ROCK", 0.92, { rock: 50, paper: 25, scissors: 25 }, 185);
  check(
    antiFeintRock.predictedPlayerMove === "SCISSORS" && antiFeintRock.counterMove === "ROCK",
    `Directional Anti-Feint learned ROCK->SCISSORS trap and pre-locked ROCK to beat SCISSORS!`
  );

  const cleanPaper = CognitiveBrain.evaluateDecision("PAPER", 0.95, { rock: 20, paper: 60, scissors: 20 }, 185);
  check(
    cleanPaper.counterMove === "SCISSORS",
    `Directional Anti-Feint on ROCK does NOT corrupt clean PAPER observation (counter=${cleanPaper.counterMove})`
  );

  // 5. Test 75-Expert Iocaine-Powder Sequence Ensemble against 4 Archetypes (Even with Blind Kinematics!)
  const archetypes = [
    {
      name: "Rotator (R->P->S->R...)",
      gen: (t) => ["ROCK", "PAPER", "SCISSORS"][t % 3]
    },
    {
      name: "Reverse Rotator (R->S->P->R...)",
      gen: (t) => ["ROCK", "SCISSORS", "PAPER"][t % 3]
    },
    {
      name: "Habitual 2-Step Pattern (R, R, P, S, R, R, P, S...)",
      gen: (t) => ["ROCK", "ROCK", "PAPER", "SCISSORS"][t % 4]
    },
    {
      name: "Counter-AI Meta Player (plays what beats AI's last move)",
      gen: (t, lastP, lastAi) => (t === 0 ? "ROCK" : getBeat(lastAi))
    }
  ];

  for (const arch of archetypes) {
    JankenMind.resetAll();
    let aiWins = 0;
    let playerWins = 0;
    let lastP = "ROCK";
    let lastAi = "PAPER";

    for (let t = 0; t < 30; t++) {
      JankenMind.startTurn(t + 1);
      const c = JankenMind.commit({ leadTimeMs: 210 });
      const aiMove = c.aiMove;
      const pMove = arch.gen(t, lastP, lastAi);
      const out = getOutcome(pMove, aiMove);
      if (out === "AI") aiWins++;
      else if (out === "USER") playerWins++;
      JankenMind.reveal(pMove, { valid: true });
      lastP = pMove;
      lastAi = aiMove;
    }

    check(
      aiWins >= 22 && aiWins > playerWins * 4,
      `75-Expert Ensemble crushed '${arch.name}' in blind sequence play: ${aiWins}W / ${playerWins}L over 30 turns`
    );
  }

  // 6. Test 100-Round Live Camera Kinematic Pre-Lock Invincibility (including after feints & Markov biases)
  let liveAiWins = 0;
  let livePlayerWins = 0;
  for (let i = 0; i < 100; i++) {
    const move = ["ROCK", "PAPER", "SCISSORS"][(i * 7 + (i % 5)) % 3];
    const dec = CognitiveBrain.evaluateDecision({
      kinematicGesture: move,
      kinematicConfidence: 0.995,
      trustKinematics: true,
      roundNum: (i % 5) + 1,
      leadTimeMs: 185
    });
    const out = getOutcome(move, dec.counterMove);
    if (out === "AI") liveAiWins++;
    else if (out === "USER") livePlayerWins++;

    await CognitiveBrain.recordRound({
      roundNumber: (i % 5) + 1,
      playerMove: move,
      aiMove: dec.counterMove,
      earlyGuess: dec.predictedPlayerMove,
      winner: out,
      leadTimeMs: 185,
      vAngle: move === "SCISSORS" ? 26.5 : 4.2,
      tendonVelocity: 240,
      handDetected: true,
      confidence: 0.98,
      sealHash: dec.seal ? dec.seal.short : "A1B2C3D4"
    });
  }

  check(
    liveAiWins === 100 && livePlayerWins === 0,
    `100-Round Live Camera Kinematic Pre-Lock achieved 100% Invincibility: ${liveAiWins}W / ${livePlayerWins}L`
  );

  const evolvedPrior = CognitiveBrain.getSequencePrior();
  check(
    evolvedPrior && evolvedPrior.probabilities && evolvedPrior.archetype && evolvedPrior.expertLabel,
    `CognitiveBrain evolved live prior & archetype after 100 rounds: Archetype='${evolvedPrior.archetype}', Expert='${evolvedPrior.expertLabel}'`
  );

  console.log(`\nALL ML ENGINE & INVINCIBILITY TESTS PASSED! (${passed}/${passed})`);
})();
