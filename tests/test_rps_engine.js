const assert = require("assert");
const {
  RPSPredictiveEngine,
  PatternPredictor,
  HandFeatureExtractor,
  KinematicTracker,
  SwingDetector,
  OnsetModel,
  RPS_UTIL
} = require("../web/rps_engine.js");

const { judge, COUNTER, PREY, fnv1a } = RPS_UTIL;

let passed = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
  }
}

console.log("=== RUNNING RPS_ENGINE DEDICATED VERIFICATION SUITE ===");

// 1. RPS_UTIL tests
test("judge: basic game theory rules", () => {
  assert.strictEqual(judge("ROCK", "PAPER"), "AI");
  assert.strictEqual(judge("SCISSORS", "PAPER"), "USER");
  assert.strictEqual(judge("PAPER", "PAPER"), "TIE");
  assert.strictEqual(judge("ROCK", "SCISSORS"), "USER");
  assert.strictEqual(judge("SCISSORS", "ROCK"), "AI");
  assert.strictEqual(judge("PAPER", "ROCK"), "USER");
});

test("fnv1a: deterministic hash", () => {
  const h1 = fnv1a("T1|ROCK|PAPER|1000|ABCD");
  const h2 = fnv1a("T1|ROCK|PAPER|1000|ABCD");
  const h3 = fnv1a("T1|ROCK|PAPER|1000|ABCE");
  assert.strictEqual(h1, h2);
  assert.notStrictEqual(h1, h3);
  assert.strictEqual(h1.length, 8);
});

// 2. HandFeatureExtractor tests
function makeMockHand(fingerConfig) {
  // fingerConfig: { thumbOpen, indexOpen, midOpen, ringOpen, pinkyOpen }
  // Create 21 landmarks in MediaPipe format
  const lms = [];
  // 0: wrist
  lms.push({ x: 0.5, y: 0.8, z: 0.0 });
  // thumb: 1,2,3,4
  const tOpen = fingerConfig.thumbOpen;
  lms.push({ x: 0.45, y: 0.75, z: 0 });
  lms.push({ x: 0.40, y: 0.70, z: 0 });
  lms.push({ x: 0.35, y: 0.65, z: 0 });
  lms.push({ x: tOpen ? 0.30 : 0.45, y: tOpen ? 0.60 : 0.70, z: 0 });

  // fingers: index (5-8), mid (9-12), ring (13-16), pinky (17-20)
  const fingers = [
    { baseIdx: 5, open: fingerConfig.indexOpen, x: 0.45 },
    { baseIdx: 9, open: fingerConfig.midOpen, x: 0.50 },
    { baseIdx: 13, open: fingerConfig.ringOpen, x: 0.55 },
    { baseIdx: 17, open: fingerConfig.pinkyOpen, x: 0.60 }
  ];

  fingers.forEach(f => {
    // MCP
    lms.push({ x: f.x, y: 0.60, z: 0 });
    // PIP
    lms.push({ x: f.x, y: f.open ? 0.48 : 0.65, z: 0 });
    // DIP
    lms.push({ x: f.x, y: f.open ? 0.38 : 0.70, z: 0 });
    // TIP
    lms.push({ x: f.x, y: f.open ? 0.28 : 0.75, z: 0 });
  });

  return lms;
}

test("HandFeatureExtractor: detects open vs curled fingers", () => {
  const extractor = new HandFeatureExtractor();
  
  // Fist (curled)
  const fist = makeMockHand({ thumbOpen: false, indexOpen: false, midOpen: false, ringOpen: false, pinkyOpen: false });
  const fFist = extractor.extract(fist, fist);
  assert(fFist !== null);
  assert(fFist.ext.index < 0.35, "Fist index should have low extension");
  assert(fFist.ext.middle < 0.35, "Fist middle should have low extension");

  // Open Palm
  const palm = makeMockHand({ thumbOpen: true, indexOpen: true, midOpen: true, ringOpen: true, pinkyOpen: true });
  const fPalm = extractor.extract(palm, palm);
  assert(fPalm.ext.index > 0.65, "Palm index should have high extension");
  assert(fPalm.ext.middle > 0.65, "Palm middle should have high extension");
  assert(fPalm.ext.ring > 0.65, "Palm ring should have high extension");
  assert(fPalm.ext.pinky > 0.65, "Palm pinky should have high extension");
});

// 3. PatternPredictor Hedge Expert weights
test("PatternPredictor: updates weights on learning", () => {
  const predictor = new PatternPredictor();
  const init = predictor.predict();
  assert(init.dist.ROCK > 0 && init.dist.PAPER > 0 && init.dist.SCISSORS > 0);
  assert.strictEqual(Math.round((init.dist.ROCK + init.dist.PAPER + init.dist.SCISSORS) * 100) / 100, 1.0);

  // Feed player playing ROCK repeatedly
  for (let i = 0; i < 5; i++) {
    predictor.update({ p: "ROCK", a: "PAPER", o: "L" }, [0.1, 0.1, 0.1, 0.1, 0.1, 0.5]);
  }

  const updated = predictor.predict([0.1, 0.1, 0.1, 0.1, 0.1, 0.5]);
  assert(updated.dist.ROCK > updated.dist.SCISSORS, "ROCK frequency should increase after repeated rocks");
});

// 4. RPSPredictiveEngine full lifecycle & seal honesty
test("RPSPredictiveEngine: Metronome mode pre-lock and honest resolution", () => {
  const engine = new RPSPredictiveEngine({ mode: "rhythm4" });

  let t = 1000;
  engine.startMetronome(t, 400);

  let lockEvent = null;
  let impactEvent = null;
  let revealEvent = null;

  // Run 10 ticks up to impact
  for (let step = 0; step < 25; step++) {
    t += 60;
    const fist = makeMockHand({ thumbOpen: false, indexOpen: false, midOpen: false, ringOpen: false, pinkyOpen: false });
    const evs = engine.update({ t, world: fist, image: fist, gesture: null });
    for (const ev of evs) {
      if (ev.type === "lock") lockEvent = ev;
      if (ev.type === "impact") impactEvent = ev;
      if (ev.type === "reveal") revealEvent = ev;
    }
  }

  assert(lockEvent !== null, "Lock event should have fired before or at impact");
  assert(lockEvent.lock.seal, "Lock event must contain cryptographic seal");
  assert.strictEqual(COUNTER[lockEvent.lock.pred], lockEvent.lock.counter, "Counter must beat prediction");

  // Verify seal matches
  const expectedSeal = fnv1a(`T${lockEvent.turnId}|${lockEvent.lock.pred}|${lockEvent.lock.counter}|${lockEvent.lock.tRound}|${lockEvent.lock.nonce}`);
  assert.strictEqual(lockEvent.lock.seal, expectedSeal, "Seal must be cryptographically valid");

  // Now simulate referee providing final gesture after impact
  for (let step = 0; step < 10; step++) {
    t += 50;
    const fist = makeMockHand({ thumbOpen: false, indexOpen: false, midOpen: false, ringOpen: false, pinkyOpen: false });
    const evs = engine.update({ t, world: fist, image: fist, gesture: "ROCK" });
    for (const ev of evs) {
      if (ev.type === "reveal") revealEvent = ev;
    }
  }

  assert(revealEvent !== null, "Reveal event must fire");
  assert.strictEqual(revealEvent.result.final, "ROCK");
  assert.strictEqual(revealEvent.result.sealOk, true, "Seal verification must pass on reveal");
  assert.strictEqual(revealEvent.result.ai, lockEvent.lock.counter, "AI final move must be the sealed locked counter");
});

test("RPSPredictiveEngine: Player Bluff / Feint allows Player to Win", () => {
  const engine = new RPSPredictiveEngine({ mode: "rhythm4" });

  let t = 2000;
  engine.startMetronome(t, 400);

  let lockedCounter = null;
  // Progress until impact (which guarantees lock either by kinematic certainty or by deadline)
  for (let step = 0; step < 28; step++) {
    t += 60;
    // Hand appears to be closed fist (ROCK)
    const fist = makeMockHand({ thumbOpen: false, indexOpen: false, midOpen: false, ringOpen: false, pinkyOpen: false });
    const evs = engine.update({ t, world: fist, image: fist, gesture: null });
    for (const ev of evs) {
      if (ev.type === "lock") {
        lockedCounter = ev.lock.counter;
      }
    }
  }

  assert(lockedCounter !== null, "Engine should have locked");

  // Player feints: instead of what AI counteracted, player intentionally plays the move that beats AI's locked counter!
  const playerWinningMove = COUNTER[lockedCounter];

  let revealEvent = null;
  const feintHand = makeMockHand({ thumbOpen: true, indexOpen: true, midOpen: true, ringOpen: true, pinkyOpen: true });
  for (let step = 0; step < 10; step++) {
    t += 50;
    const evs = engine.update({ t, world: feintHand, image: feintHand, gesture: playerWinningMove });
    for (const ev of evs) {
      if (ev.type === "reveal") revealEvent = ev;
    }
  }

  assert(revealEvent !== null, "Reveal must occur");
  assert.strictEqual(revealEvent.result.outcome, "USER", "Player must win when feinting/outsmarting AI's sealed lock!");
  assert.strictEqual(revealEvent.result.correct, false, "AI prediction was outsmarted");
});

console.log(`\nTest Summary: ${passed} passed, ${total - passed} failed out of ${total} tests.`);
if (passed === total) {
  console.log("All dedicated rps_engine tests passed cleanly!");
  process.exit(0);
} else {
  process.exit(1);
}
