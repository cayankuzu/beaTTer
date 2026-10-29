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
  "mindtwin-lead-badge", "mindtwin-sub-strategy", "stat-v-angle", "stat-tendon-vel", "stat-psych", "stat-accel", "stat-predictability", "stat-lock-badge", "mind-bio-trigger", "mind-game-theory", "mind-seal"
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
    sound
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

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All revised tests passed cleanly!");
  process.exit(0);
}
