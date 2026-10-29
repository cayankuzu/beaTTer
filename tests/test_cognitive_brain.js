/**
 * Unit & Integration Test Suite for CognitiveBrain Engine
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Mock browser globals
global.window = global;
global.navigator = { onLine: true };
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

// Mock fetch
global.fetch = async (url, options) => {
  return {
    ok: true,
    status: 200,
    json: async () => ([])
  };
};

const code = fs.readFileSync(path.join(__dirname, "../web/cognitive_brain.js"), "utf8");
eval(code);

const engine = global.CognitiveBrain;

console.log("=== RUNNING COGNITIVE BRAIN UNIT TESTS ===");

// 1. Fingerprinting
assert(engine.playerId && engine.playerId.length > 5, "PlayerId must be generated");
assert(engine.playerTag.includes("Oyuncu #"), "PlayerTag must be formatted correctly");
console.log("  PASS: Player identity & fingerprint generated:", engine.playerTag);

// 2. Initial state evaluation
const initMetrics = engine.getHUDMetrics();
assert(initMetrics.learningLevel.includes("%"), "Learning level percentage present");
console.log("  PASS: Initial HUD Metrics:", initMetrics.learningLevel, initMetrics.feintResistance);

// 3. Normal Clash (AI win)
const r1 = engine.onRoundFinished({
  roundNumber: 1,
  playerMove: "ROCK",
  aiMove: "PAPER",
  outcome: "AI",
  earlyGuess: "ROCK",
  leadTimeMs: 320,
  confidence: 0.96
});
assert.strictEqual(engine.profile.total_games, 1);
assert.strictEqual(engine.profile.total_losses, 1);
assert(r1.lesson.includes("Taş"), "Lesson should mention Taş");
console.log("  PASS: Round 1 AI Win recorded:", r1.lesson);

// 4. Feint Clash (Player tricks AI by faking Paper, throwing Rock)
const r2 = engine.onRoundFinished({
  roundNumber: 2,
  playerMove: "ROCK",
  aiMove: "SCISSORS", // AI picked Scissors because it thought user threw Paper
  outcome: "USER",
  earlyGuess: "PAPER",
  leadTimeMs: 320,
  confidence: 0.98
});
assert(r2.feintDetected, "Feint should be detected when earlyGuess != playerMove and user wins");
assert(engine.profile.feint_count >= 1, "Feint count must increment");
assert(engine.profile.feint_rate > 0, "Feint rate must increase");
console.log("  PASS: Round 2 Feint detected:", r2.lesson);

// 5. Anti-Feint Counter on next round!
// Player tries the same trick: showing Paper early. AI should anticipate the trap and pick PAPER to crush Rock!
const antiFeintDec = engine.evaluateDecision({
  kinematicGesture: "PAPER",
  kinematicConfidence: 0.65,
  roundNum: 3,
  leadTimeMs: 320
});
console.log("  Evaluation result:", antiFeintDec);
assert(antiFeintDec.antiFeintActive, "Anti-Feint must activate for known feinter");
assert.strictEqual(antiFeintDec.counterMove, "PAPER", "Anti-feint counter must be PAPER to beat the secret Rock");
console.log("  PASS: Anti-Feint Trap triggered! Countered with:", antiFeintDec.counterMove, "| Strategy:", antiFeintDec.modelStrategy);

// 6. Q-Learning weights update check
assert(engine.profile.q_weights.AFTER_LOSS, "Q-weights must exist for AFTER_LOSS");
console.log("  PASS: Q-weights updated after loss penalty:", engine.profile.q_weights.AFTER_LOSS);

// 7. Data Sanitization & Garbage Data Rejection
const spamResult = engine.onRoundFinished({
  roundNumber: 4,
  playerMove: "UNKNOWN",
  aiMove: "ROCK",
  outcome: "AI",
  handDetected: false,
  confidence: 0.20,
  isSpamTrigger: true
});
assert.strictEqual(spamResult.isValid, false, "Spam turn must be rejected");
assert(spamResult.validation.code === "NO_HAND_DETECTED", "Must reject as NO_HAND_DETECTED");
assert.strictEqual(engine.profile.total_games, 2, "Garbage data must NOT increment total_games");
console.log("  PASS: Data Sanitizer successfully rejected spam & protected model:", spamResult.validation.alertMsg);

// 8. Live Machine Thought Stream
const thought1 = engine.getLiveThought({ step: 1 });
const thought3 = engine.getLiveThought({
  step: 3,
  liveAnalysis: { vAngle: "24.5", tendonVelocity: "140" }
});
assert(thought1.includes("1. Ritim"), "Step 1 thought must describe beat 1");
assert(thought3.includes("24.5°"), "Step 3 thought must describe live kinematics");
console.log("  PASS: Live Machine Thought Stream generated:", thought3);

// 9. Dynamic Mastery Level
const updatedMetrics = engine.getHUDMetrics();
assert(parseFloat(updatedMetrics.learningLevel.replace("%", "")) > parseFloat(initMetrics.learningLevel.replace("%", "")), "Learning level must increase as rounds are played");
console.log("  PASS: Evolved Cognitive Mastery:", updatedMetrics.learningLevel, "| Feint Resistance:", updatedMetrics.feintResistance);

console.log("\nALL COGNITIVE BRAIN UNIT TESTS PASSED SUCCESSFULLY! (9/9)");
