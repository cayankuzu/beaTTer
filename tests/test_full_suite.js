// Mock browser DOM and APIs for Node.js automated test
const fs = require("fs");
const path = require("path");

class MockElement {
  constructor(id, tagName = "div") {
    this.id = id;
    this.tagName = tagName;
    this.className = "";
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c) => {
        if (this.classList._classes.has(c)) this.classList._classes.delete(c);
        else this.classList._classes.add(c);
      }
    };
    this.style = {};
    this.innerText = "";
    this.innerHTML = "";
    this.children = [];
    this.listeners = {};
    this.getContext = () => mockCtx;
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  click() {
    if (this.listeners["click"]) {
      this.listeners["click"].forEach(fn => fn());
    }
  }
  querySelector(sel) {
    return new MockElement("sub-elem");
  }
  querySelectorAll(sel) {
    return [new MockElement("sub1"), new MockElement("sub2")];
  }
  appendChild(child) {
    this.children.push(child);
  }
}

const domElements = {};
function getOrCreateElement(id) {
  if (!domElements[id]) {
    domElements[id] = new MockElement(id);
  }
  return domElements[id];
}

const mockCtx = {
  clearRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  roundRect: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  setLineDash: () => {},
  measureText: () => ({ width: 50 }),
  fillText: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} }),
  closePath: () => {}
};

global.document = {
  body: new MockElement("body"),
  getElementById: (id) => getOrCreateElement(id),
  querySelector: (sel) => {
    if (sel === ".video-stage" || sel === ".rival-stage") {
      const el = new MockElement("stage");
      el.clientWidth = 640;
      el.clientHeight = 480;
      return el;
    }
    return new MockElement("q-sel");
  },
  querySelectorAll: (sel) => [new MockElement("q1"), new MockElement("q2")],
  createElement: (tag) => new MockElement("new-" + tag, tag)
};

global.window = {
  addEventListener: () => {},
  speechSynthesis: { speak: () => {}, cancel: () => {} },
  AudioContext: class {
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
    createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
    get currentTime() { return 0; }
  },
  webkitAudioContext: class {},
  location: { hostname: "localhost" },
  performance: { now: () => Date.now() },
  requestAnimationFrame: (cb) => {}
};
global.performance = global.window.performance;
global.requestAnimationFrame = () => {};
global.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
global.navigator = { mediaDevices: { getUserMedia: () => Promise.resolve() } };
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

// Pre-create known elements
const elementIds = [
  "tab-mode-rps", "tab-mode-mindtwin", "player-box-title", "rival-box-title",
  "gesture-label-type", "capsule-finger-dots", "beats-wrapper",
  "analyst-dock-rps", "analyst-dock-mindtwin",
  "rival-state-tag", "gesture-title", "gesture-conf", "anticipation-pill", "ant-val", "ant-ms",
  "result-banner", "score-p1", "score-p2", "turn-indicator", "hint-msg",
  "beat-1", "beat-2", "beat-3", "beat-4", "series-modal", "series-p1-score", "series-p2-score",
  "series-history-list", "webcam", "camera-canvas", "rival-canvas", "swing-popup", "swing-popup-text",
  "prob-bar-rock", "prob-bar-paper", "prob-bar-scissors", "prob-val-rock", "prob-val-paper", "prob-val-scissors",
  "prob-bar-f1", "prob-bar-f2", "prob-bar-f3", "prob-bar-f4", "prob-bar-f5",
  "prob-val-f1", "prob-val-f2", "prob-val-f3", "prob-val-f4", "prob-val-f5",
  "fdot-thumb", "fdot-index", "fdot-mid", "fdot-ring", "fdot-pinky",
  "kinetic-fill", "result-winner", "clash-p1-icon", "clash-p1-text", "clash-p2-icon", "clash-p2-text",
  "mind-early-guess", "mind-final-move", "mind-counter-move", "clash-analysis",
  "mindtwin-lead-badge", "mindtwin-sub-strategy", "stat-v-angle", "stat-tendon-vel", "stat-psych", "stat-accel", "stat-predictability", "stat-lock-badge", "mind-bio-trigger", "mind-game-theory", "mind-seal",
  "face-privacy-shield", "btn-toggle-privacy", "select-face-blur", "val-face-blur"
];
for (let i = 1; i <= 5; i++) elementIds.push(`pip-${i}`);
elementIds.forEach(id => getOrCreateElement(id));

// Load app.js into environment
let code = fs.readFileSync(path.join(__dirname, "../web/app.js"), "utf8");
code = code.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, "// import stripped");

const sandbox = new Function(code + `
  return {
    setGameMode,
    triggerClash,
    resetEntireSeries,
    showSeriesChampionModal,
    resetIsResolving: () => { isResolving = false; },
    activeGameMode: () => activeGameMode,
    p1SeriesScore: () => p1SeriesScore,
    p2SeriesScore: () => p2SeriesScore,
    currentSeriesTurn: () => currentSeriesTurn,
    MindTwinEngine,
    OmegaVisionEngine,
    mindTwinEngine,
    swingEngine,
    cyberTwinHand,
    analyst,
    RPSPsychologicalAnalyst,
    KineticSurgeEngine,
    CanvasRivalHand,
    sound,
    setFacePrivacyShield
  };
`);

const app = sandbox();

let passed = 0;
let failed = 0;
function assert(desc, condition) {
  if (condition) {
    console.log(`  PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  FAIL: ${desc}`);
    failed++;
  }
}

console.log("=== RUNNING REVISED FULL SUITE AUTOMATED VERIFICATION ===");

// TEST 1: Default state is RPS
assert("Initial mode is RPS", app.activeGameMode() === "rps");

// TEST 2: Switch to MINDTWIN mode
app.setGameMode("mindtwin");
assert("Mode switched to mindtwin", app.activeGameMode() === "mindtwin");
assert("Body class is game-mode-mindtwin", document.body.className === "game-mode-mindtwin");
assert("RPS Analyst Dock hidden", getOrCreateElement("analyst-dock-rps").classList.contains("hidden"));
assert("MindTwin Dock visible", !getOrCreateElement("analyst-dock-mindtwin").classList.contains("hidden"));
assert("Finger dots capsule visible in MindTwin", !getOrCreateElement("capsule-finger-dots").classList.contains("hidden"));
assert("Rival Box Title is MEKANİK DİJİTAL İKİZ", getOrCreateElement("rival-box-title").innerText.includes("MEKANİK DİJİTAL İKİZ"));

// TEST 3: Switch back to RPS mode
app.setGameMode("rps");
assert("Mode switched to rps", app.activeGameMode() === "rps");
assert("Body class is game-mode-rps", document.body.className === "game-mode-rps");
assert("RPS Analyst Dock visible", !getOrCreateElement("analyst-dock-rps").classList.contains("hidden"));
assert("MindTwin Dock hidden", getOrCreateElement("analyst-dock-mindtwin").classList.contains("hidden"));
assert("Finger dots capsule hidden in rps", getOrCreateElement("capsule-finger-dots").classList.contains("hidden"));
assert("Rival Box Title is JANKEN AI", getOrCreateElement("rival-box-title").innerText.includes("JANKEN AI"));

// TEST 4: MindTwin Clash Resolution - AI Predicts Right (Zihin Okundu)
app.setGameMode("mindtwin");
app.mindTwinEngine.currentPredictedCount = 2;
app.triggerClash(2, 2, 180);

assert("AI score incremented when AI predicts right", app.p2SeriesScore() === 1);
assert("Player score is 0", app.p1SeriesScore() === 0);
assert("Result banner visible", !getOrCreateElement("result-banner").classList.contains("hidden"));
assert("Winner banner says ZİHİN OKUNDU", getOrCreateElement("result-winner").innerText.includes("ZİHİN OKUNDU"));
assert("Clash P1 shows 2 PARMAK", getOrCreateElement("clash-p1-text").innerText === "2 PARMAK");

// TEST 5: MindTwin Clash Resolution - Player Tricked AI (AI Şaşırtıldı)
app.resetIsResolving();
app.mindTwinEngine.currentPredictedCount = 2; // AI predicted 2
app.triggerClash(4, 2, 175); // Player actually threw 4!

assert("Player score incremented when player tricks AI", app.p1SeriesScore() === 1);
assert("Winner banner says AI ŞAŞIRTILDI", getOrCreateElement("result-winner").innerText.includes("AI ŞAŞIRTILDI"));
assert("Clash P1 shows 4 PARMAK", getOrCreateElement("clash-p1-text").innerText === "4 PARMAK");
assert("Clash P2 shows SEZGİ: 2 PARMAK", getOrCreateElement("clash-p2-text").innerText.includes("2 PARMAK"));

// TEST 6: MindTwin Engine with Synthetic Landmarks
const syntheticLms = [];
for (let i = 0; i < 21; i++) {
  syntheticLms.push({ x: 0.5, y: 0.5 - (i * 0.02), z: 0 });
}
const intent = app.mindTwinEngine.process(syntheticLms, 0.016);
assert("MindTwinEngine returns valid intent", intent && typeof intent.fingerCount === "number");
assert("Intent fingerCount between 0 and 5", intent.fingerCount >= 0 && intent.fingerCount <= 5);
assert("Intent contains 5 rawScores", Object.keys(intent.rawScores).length === 5);

// TEST 7: CyberTwinHand updates according to intent
app.cyberTwinHand.setPredictedState({ thumb: false, index: true, middle: true, ring: false, pinky: false }, 2, 180, 0.99);
app.cyberTwinHand.update(0.5);
assert("CyberTwinHand target index is 1.0", app.cyberTwinHand.targetFingers.index === 1.0);
assert("CyberTwinHand target ring is 0.0", app.cyberTwinHand.targetFingers.ring === 0.0);

// TEST 8: RPS Clash Resolution & Counter Move
app.setGameMode("rps");
app.triggerClash("ROCK", "ROCK", 45);
assert("AI score incremented in RPS clash", app.p2SeriesScore() === 1);
assert("Clash P1 text shows TAŞ", getOrCreateElement("clash-p1-text").innerText === "TAŞ");
assert("Clash P2 text shows KAĞIT (Counter to ROCK)", getOrCreateElement("clash-p2-text").innerText === "KAĞIT");

// TEST 9: Full 5-Turn Series Completion
for (let turn = 2; turn <= 5; turn++) {
  app.resetIsResolving();
  app.triggerClash("SCISSORS", "SCISSORS", 50);
}
assert("5 turns recorded", app.p2SeriesScore() >= 5);

// TEST 10: Honest RPS Feint / Outsmart AI (Player wins when bluffing)
app.resetEntireSeries();
app.setGameMode("rps");
// AI locked PAPER (predicting ROCK), but player unexpectedly threw SCISSORS!
app.triggerClash("SCISSORS", "ROCK", 210, "PAPER", "A1B2C3D4", true);
assert("Player score incremented on successful RPS feint", app.p1SeriesScore() === 1);
assert("AI score remains 0", app.p2SeriesScore() === 0);
assert("Winner banner says SEN KAZANDIN! AI ŞAŞIRTILDI!", getOrCreateElement("result-winner").innerText.includes("SEN KAZANDIN"));
assert("Cryptographic seal displayed in banner", getOrCreateElement("mind-seal").innerText.includes("MÜHÜR #A1B2C3D4"));
assert("Cryptographic seal verified", getOrCreateElement("mind-seal").innerText.includes("DOĞRULANDI"));

// TEST 11: RPS Tie (Both throw same move)
app.resetIsResolving();
const prevP1 = app.p1SeriesScore();
const prevP2 = app.p2SeriesScore();
app.triggerClash("PAPER", "ROCK", 195, "PAPER");
assert("Neither score incremented on tie", app.p1SeriesScore() === prevP1 && app.p2SeriesScore() === prevP2);
assert("Winner banner says BERABERE", getOrCreateElement("result-winner").innerText.includes("BERABERE"));

// TEST 12: Shannon Entropy & Predictability Index
const shannonUniform = app.analyst.computeShannonEntropy({ ROCK: 0.33, PAPER: 0.33, SCISSORS: 0.34 });
assert("Uniform distribution predictability is ~15-20%", shannonUniform.predictabilityPct >= 15 && shannonUniform.predictabilityPct <= 25);

const shannonSharp = app.analyst.computeShannonEntropy({ ROCK: 0.90, PAPER: 0.05, SCISSORS: 0.05 });
assert("Sharp peaked distribution predictability is > 60%", shannonSharp.predictabilityPct >= 60);

// TEST 13: KineticSurgeEngine Pre-Lock Callback
let lockTriggered = false;
let lockedP = null;
let lockedC = null;
const engine = new app.KineticSurgeEngine({
  onBeat: () => {},
  onAnticipate: () => {},
  onPreLock: (p, c, ms) => { lockTriggered = true; lockedP = p; lockedC = c; },
  onClash: () => {},
  onReset: () => {}
});
engine.step = 3;
engine.anticipationActive = true;
engine._executePreLock("ROCK", null, { probabilities: { ROCK: 0.8, PAPER: 0.1, SCISSORS: 0.1 } }, 1000);
assert("Pre-Lock callback fired", lockTriggered === true);
assert("Pre-Lock predicted move is ROCK", lockedP === "ROCK");
assert("Pre-Lock locked counter is PAPER", lockedC === "PAPER");
assert("Engine isLocked is true", engine.isLocked === true);

// TEST 14: SoundFX playLock exists
assert("SoundFX has playLock method", typeof app.sound.playLock === "function");

// TEST 15: In-air 4th strike: no premature lock while hand is rising after beat 3
let inAirLock = null;
const airEngine = new app.KineticSurgeEngine({
  onBeat: () => {},
  onAnticipate: () => {},
  onPreLock: (pred, counter, leadMs, opts) => { inAirLock = { pred, counter, leadMs, opts }; },
  onClash: () => {},
  onReset: () => {}
});

const t0 = global.performance.now();
airEngine.step = 3;
airEngine.anticipationActive = true;
airEngine.swing4Phase = "WAIT_RISE";
airEngine.swing4ApexY = 1.0;
airEngine.lastBeatTime = t0 - 200;

const lmsRise = Array(21).fill(0).map(() => ({ x: 0.5, y: 0.30 }));
airEngine.history = [
  { x: 0.5, y: 0.50, t: t0 - 150 },
  { x: 0.5, y: 0.40, t: t0 - 100 },
  { x: 0.5, y: 0.35, t: t0 - 50 },
  { x: 0.5, y: 0.30, t: t0 - 10 }
];
airEngine.process(lmsRise, "ROCK", null, null);
assert("No premature pre-lock while hand is rising after beat 3", airEngine.isLocked === false && inAirLock === null);
assert("Engine transitioned to RISING phase", airEngine.swing4Phase === "RISING");

// TEST 16: In-air 4th strike: SCISSORS onset recognized in flight -> counters with ROCK
const t1 = global.performance.now();
airEngine.swing4Phase = "DESCENDING";
airEngine.swing4ApexY = 0.20;
airEngine.swing4DescentStartT = t1 - 80;
airEngine.history = [
  { x: 0.5, y: 0.18, t: t1 - 100 },
  { x: 0.5, y: 0.20, t: t1 - 80 },
  { x: 0.5, y: 0.23, t: t1 - 60 },
  { x: 0.5, y: 0.26, t: t1 - 40 },
  { x: 0.5, y: 0.30, t: t1 - 5 }
];

const mockKinematicScissors = {
  gesture: "SCISSORS",
  scores: { index: 0.72, middle: 0.70, ring: 0.15, pinky: 0.12 },
  metrics: { sFront: 0.71, sBack: 0.135, deltaScissors: 0.575, vSpreadAngle: 28.0 },
  openCount: 2
};
airEngine.process(Array(21).fill(0).map(() => ({ x: 0.5, y: 0.30 })), "SCISSORS", mockKinematicScissors.scores, null, mockKinematicScissors, "SCISSORS", 0.95);
assert("In-Air Scissors onset locked counter ROCK", inAirLock !== null && inAirLock.counter === "ROCK");

// TEST 17: In-air 4th strike: PAPER onset recognized in flight -> counters with SCISSORS
let paperLock = null;
const paperEngine = new app.KineticSurgeEngine({
  onBeat: () => {},
  onAnticipate: () => {},
  onPreLock: (pred, counter, leadMs, opts) => { paperLock = { pred, counter, leadMs, opts }; },
  onClash: () => {},
  onReset: () => {}
});
const t2 = global.performance.now();
paperEngine.step = 3;
paperEngine.anticipationActive = true;
paperEngine.swing4Phase = "DESCENDING";
paperEngine.swing4ApexY = 0.20;
paperEngine.swing4DescentStartT = t2 - 80;
paperEngine.lastBeatTime = t2 - 200;
paperEngine.history = [
  { x: 0.5, y: 0.18, t: t2 - 100 },
  { x: 0.5, y: 0.20, t: t2 - 80 },
  { x: 0.5, y: 0.23, t: t2 - 60 },
  { x: 0.5, y: 0.26, t: t2 - 40 },
  { x: 0.5, y: 0.30, t: t2 - 5 }
];
const mockKinematicPaper = {
  gesture: "PAPER",
  scores: { index: 0.85, middle: 0.88, ring: 0.82, pinky: 0.80 },
  metrics: { sFront: 0.865, sBack: 0.81, sAll: 0.837, deltaScissors: 0.055, vSpreadAngle: 12.0 },
  openCount: 4
};
paperEngine.process(Array(21).fill(0).map(() => ({ x: 0.5, y: 0.30 })), "PAPER", mockKinematicPaper.scores, null, mockKinematicPaper, "PAPER", 0.98);
assert("In-Air Paper onset locked counter SCISSORS", paperLock !== null && paperLock.counter === "SCISSORS");

// TEST 18: In-air 4th strike: ROCK confirmed clench recognized in flight -> counters with PAPER
let rockLock = null;
const rockEngine = new app.KineticSurgeEngine({
  onBeat: () => {},
  onAnticipate: () => {},
  onPreLock: (pred, counter, leadMs, opts) => { rockLock = { pred, counter, leadMs, opts }; },
  onClash: () => {},
  onReset: () => {}
});
const t3 = global.performance.now();
rockEngine.step = 3;
rockEngine.anticipationActive = true;
rockEngine.swing4Phase = "DESCENDING";
rockEngine.swing4ApexY = 0.20;
rockEngine.swing4DescentStartT = t3 - 90;
rockEngine.lastBeatTime = t3 - 200;
rockEngine.history = [
  { x: 0.5, y: 0.15, t: t3 - 120 },
  { x: 0.5, y: 0.20, t: t3 - 90 },
  { x: 0.5, y: 0.30, t: t3 - 60 },
  { x: 0.5, y: 0.40, t: t3 - 30 },
  { x: 0.5, y: 0.48, t: t3 - 5 }
];
const mockKinematicRock = {
  gesture: "ROCK",
  scores: { index: 0.12, middle: 0.10, ring: 0.08, pinky: 0.07 },
  metrics: { sFront: 0.11, sBack: 0.075, sAll: 0.092, deltaScissors: 0.035, vSpreadAngle: 0.0 },
  openCount: 0
};
rockEngine.process(Array(21).fill(0).map(() => ({ x: 0.5, y: 0.48 })), "ROCK", mockKinematicRock.scores, null, mockKinematicRock, "ROCK", 0.96);
assert("In-Air Rock confirmed clench locked counter PAPER", rockLock !== null && rockLock.counter === "PAPER");

// TEST 19: Late Snap Feint Override (Player snaps Scissors in flight after initial clench)
let snapLock = null;
const snapEngine = new app.KineticSurgeEngine({
  onBeat: () => {},
  onAnticipate: () => {},
  onPreLock: (pred, counter, leadMs, opts) => { snapLock = { pred, counter, leadMs, opts }; },
  onClash: () => {},
  onReset: () => {}
});
const tSnap = global.performance.now();
snapEngine.step = 3;
snapEngine.anticipationActive = true;
snapEngine.swing4Phase = "DESCENDING";
snapEngine.swing4ApexY = 0.20;
snapEngine.swing4DescentStartT = tSnap - 150;
snapEngine.lastBeatTime = tSnap - 200;
snapEngine.isLocked = true;
snapEngine.lockedPrediction = "ROCK";
snapEngine.lockedCounter = "PAPER";
snapEngine.history = [
  { x: 0.5, y: 0.18, t: tSnap - 200 },
  { x: 0.5, y: 0.20, t: tSnap - 150 },
  { x: 0.5, y: 0.28, t: tSnap - 110 },
  { x: 0.5, y: 0.35, t: tSnap - 60 },
  { x: 0.5, y: 0.45, t: tSnap - 10 }
];
// Player suddenly bursts open Scissors at y=0.35 (dropProgress ~ 0.55):
snapEngine.process(
  Array(21).fill(0).map(() => ({ x: 0.5, y: 0.35 })),
  "SCISSORS",
  mockKinematicScissors.scores,
  null,
  mockKinematicScissors,
  "SCISSORS",
  0.92
);
assert("Late snap override counters with ROCK", snapLock !== null && snapLock.counter === "ROCK" && snapLock.opts.isLateOverride === true);

// TEST 20: CanvasRivalHand thrustAnimation exists and scales up
const rHand = new app.CanvasRivalHand();
assert("CanvasRivalHand has thrustAnimation", typeof rHand.thrustAnimation === "function");
rHand.thrustAnimation("SCISSORS");
assert("thrustAnimation sets gesture to SCISSORS", rHand.gesture === "SCISSORS");
assert("thrustAnimation sets thrustScale > 1.0", rHand.thrustScale > 1.2);
assert("thrustAnimation sets thrustGlow > 0.5", rHand.thrustGlow >= 0.9);

// TEST 21: Face Privacy Shield (Frosted Glass Anonymizer)
const shieldEl = getOrCreateElement("face-privacy-shield");
const toggleBtnEl = getOrCreateElement("btn-toggle-privacy");
const selectBlurEl = getOrCreateElement("select-face-blur");

assert("setFacePrivacyShield is defined", typeof app.setFacePrivacyShield === "function");
app.setFacePrivacyShield("blur");
assert("Face shield visible when enabled", !shieldEl.classList.contains("hidden"));
assert("Toggle button reflects active privacy shield", toggleBtnEl.innerText.includes("Gizlilik: Açık"));
assert("Select dropdown set to blur", selectBlurEl.value === "blur");

app.setFacePrivacyShield("off");
assert("Face shield hidden when disabled", shieldEl.classList.contains("hidden"));
assert("Toggle button reflects disabled privacy shield", toggleBtnEl.innerText.includes("Gizlilik: Kapalı"));
assert("Select dropdown set to off", selectBlurEl.value === "off");

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All revised tests passed cleanly!");
  process.exit(0);
}
