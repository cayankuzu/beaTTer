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

global.document = {
  body: new MockElement("body"),
  getElementById: (id) => getOrCreateElement(id),
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
  "gesture-label-type", "capsule-finger-dots", "beats-wrapper", "mindtwin-bet-box",
  "btn-bet-even", "btn-bet-odd", "analyst-dock-rps", "analyst-dock-mindtwin",
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
  "mindtwin-lead-badge", "mindtwin-sub-strategy", "stat-v-angle", "stat-tendon-vel", "stat-psych"
];
for (let i = 1; i <= 5; i++) elementIds.push(`pip-${i}`);
elementIds.forEach(id => getOrCreateElement(id));

// Canvas context mock
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
  setLineDash: () => {},
  measureText: () => ({ width: 50 }),
  fillText: () => {}
};
getOrCreateElement("camera-canvas").getContext = () => mockCtx;
getOrCreateElement("rival-canvas").getContext = () => mockCtx;

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
    playerParityBet: () => playerParityBet,
    setPlayerParityBet: (v) => { playerParityBet = v; },
    p1SeriesScore: () => p1SeriesScore,
    p2SeriesScore: () => p2SeriesScore,
    currentSeriesTurn: () => currentSeriesTurn,
    MindTwinEngine,
    OmegaVisionEngine,
    mindTwinEngine,
    swingEngine
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

console.log("=== RUNNING FULL SUITE AUTOMATED VERIFICATION ===");

// TEST 1: Default state is RPS
assert("Initial mode is RPS", app.activeGameMode() === "rps");

// TEST 2: Switch to MINDTWIN mode
app.setGameMode("mindtwin");
assert("Mode switched to mindtwin", app.activeGameMode() === "mindtwin");
assert("Body class is game-mode-mindtwin", document.body.className === "game-mode-mindtwin");
assert("RPS Analyst Dock hidden", getOrCreateElement("analyst-dock-rps").classList.contains("hidden"));
assert("MindTwin Dock visible", !getOrCreateElement("analyst-dock-mindtwin").classList.contains("hidden"));
assert("MindTwin Bet Box visible", !getOrCreateElement("mindtwin-bet-box").classList.contains("hidden"));
assert("Beats wrapper hidden in mindtwin", getOrCreateElement("beats-wrapper").classList.contains("hidden"));
assert("Finger dots capsule visible", !getOrCreateElement("capsule-finger-dots").classList.contains("hidden"));
assert("Player Box Title is NÖRAL İSKELET", getOrCreateElement("player-box-title").innerText.includes("NÖRAL İSKELET"));
assert("Rival Box Title is MINDTWIN", getOrCreateElement("rival-box-title").innerText.includes("MINDTWIN"));

// TEST 3: Switch back to RPS mode
app.setGameMode("rps");
assert("Mode switched to rps", app.activeGameMode() === "rps");
assert("Body class is game-mode-rps", document.body.className === "game-mode-rps");
assert("RPS Analyst Dock visible", !getOrCreateElement("analyst-dock-rps").classList.contains("hidden"));
assert("MindTwin Dock hidden", getOrCreateElement("analyst-dock-mindtwin").classList.contains("hidden"));
assert("Beats wrapper visible in rps", !getOrCreateElement("beats-wrapper").classList.contains("hidden"));
assert("MindTwin Bet Box hidden in rps", getOrCreateElement("mindtwin-bet-box").classList.contains("hidden"));
assert("Finger dots capsule hidden in rps", getOrCreateElement("capsule-finger-dots").classList.contains("hidden"));
assert("Player Box Title is CANLI KAMERA", getOrCreateElement("player-box-title").innerText.includes("CANLI KAMERA"));
assert("Rival Box Title is JANKEN AI", getOrCreateElement("rival-box-title").innerText.includes("JANKEN AI"));

// TEST 4: Parity Bet Button clicks in MindTwin mode
app.setGameMode("mindtwin");
getOrCreateElement("btn-bet-odd").click();
assert("Player parity bet changed to ODD", app.playerParityBet() === "ODD");
assert("btn-bet-odd has active class", getOrCreateElement("btn-bet-odd").classList.contains("active"));

getOrCreateElement("btn-bet-even").click();
assert("Player parity bet changed back to EVEN", app.playerParityBet() === "EVEN");
assert("btn-bet-even has active class", getOrCreateElement("btn-bet-even").classList.contains("active"));

// TEST 5: MindTwin Clash Resolution & Parity Rules
// In MindTwin, player bet is EVEN. If player opens 2 fingers, AI needs to counter to make sum odd (AI opens 1 finger -> 2 + 1 = 3 odd -> AI wins!)
app.setPlayerParityBet("EVEN");
app.mindTwinEngine.currentPredictedCount = 2;
app.triggerClash(2, "2 Parmak", 180);

assert("AI score incremented in MindTwin clash", app.p2SeriesScore() === 1);
assert("Result banner visible", !getOrCreateElement("result-banner").classList.contains("hidden"));
assert("Winner text indicates AI won", getOrCreateElement("result-winner").innerText.includes("AI KAZANDI"));
assert("Clash P1 text shows 2 PARMAK (ÇİFT)", getOrCreateElement("clash-p1-text").innerText.includes("2 PARMAK (ÇİFT)"));
assert("Clash P2 text shows 1 PARMAK (AI)", getOrCreateElement("clash-p2-text").innerText.includes("1 PARMAK (AI)"));

// TEST 6: MindTwin Continuous 5-Finger Probability Distribution Math
const syntheticLms = [];
for (let i = 0; i < 21; i++) {
  syntheticLms.push({ x: 0.5, y: 0.5 - (i * 0.02), z: 0 });
}
const intent = app.mindTwinEngine.process(syntheticLms, 0.016);
assert("MindTwinEngine returns valid intent", intent && typeof intent.fingerCount === "number");
assert("Intent fingerCount between 1 and 5", intent.fingerCount >= 1 && intent.fingerCount <= 5);
assert("Intent contains 5 rawScores", Object.keys(intent.rawScores).length === 5);

// TEST 7: RPS Clash Resolution & Counter Move
app.setGameMode("rps");
app.triggerClash("ROCK", "ROCK", 45);
assert("AI score incremented in RPS clash", app.p2SeriesScore() === 1);
assert("Clash P1 text shows TAŞ", getOrCreateElement("clash-p1-text").innerText === "TAŞ");
assert("Clash P2 text shows KAĞIT (Counter to ROCK)", getOrCreateElement("clash-p2-text").innerText === "KAĞIT");

// TEST 8: Full 5-Turn Series Completion
for (let turn = 2; turn <= 5; turn++) {
  app.resetIsResolving();
  app.triggerClash("SCISSORS", "SCISSORS", 50);
}
assert("5 turns recorded", app.p2SeriesScore() >= 5);

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed cleanly! Ready for deployment.");
  process.exit(0);
}
