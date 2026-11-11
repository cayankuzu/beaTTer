// @ts-check
/**
 * beaTTer v4 — adversarial fuzz of the "unbeatable by rule" guarantee (SIMULATION, seeded).
 *
 *     node experiments/fuzz_guarantee.mjs [sessions = 2500] [--save]
 *
 * --save writes the summary to docs/results/fuzz-guarantee.json (the thesis quotes the 15000-session run).
 *
 * Under the `turnuva` preset no round the referee declares valid may be won by the player (thesis,
 * Theorem 1). This script tries to break that against the real engine with everything the round
 * machinery can meet at once: every mode (three beats, two beats, single stroke, metronome with three
 * beats and with none), frame rates from 12 to 144 fps, feints, late throws, weak strokes, tracking
 * drop-outs and extra gaps, openings that do not follow the detector's model, a user-set decision freeze,
 * behavioural moves drawn at random, and frames glued to within a few hundredths of a millisecond of
 * the scheduled beats and of the true landing (the two holes found while the thesis was written were of
 * exactly that kind: a frame of the armed wait judged as the last in-air frame, and a rounded seal time
 * compared with an unrounded frame time).
 *
 * For every judged round it checks: no PLAYER verdict; the judged seal was made on a frame before the
 * landing frame; the post-landing flag of every seal equals the frame order; all seals verify; the
 * reported lead is not negative; the engine never throws. The process exits with code 1 on any
 * violation, so the script can serve as a long-running check.
 *
 * It is evidence that the implementation behaves as the theorem says, not a substitute for the proof,
 * and it says nothing about real cameras.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from '../web/js/core/rng.js';
import { createCommitLog } from '../web/js/core/commit.js';
import { createPlayerModel } from '../web/js/core/player_model.js';
import { createRoundEngine } from '../web/js/core/round_engine.js';
import { simulateThrow } from '../web/js/sim/kinematic_player.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const N = Math.max(1, Math.floor(Number(args.find((a) => !a.startsWith('--')) ?? 2500)) || 2500);
const FPS = [12, 15, 20, 24, 30, 45, 60, 90, 120, 144];
const MODES = ['beats3', 'beats3', 'beats2', 'single', 'metro3', 'metro3', 'metro0'];

/** @type {Record<string, number>} */ const tally = {};
/** @type {Record<string, {judged:number, valid:number, loss:number}>} */ const byMode = {};
let losses = 0, exceptions = 0, orderViolations = 0, judgedRounds = 0, validRounds = 0;
/** @type {any[]} */ const examples = [];

for (let seed = 1; seed <= N; seed++) {
  const rng = makeRng(90000 + seed);
  const pick = (/** @type {any[]} */ a) => a[rng.int(a.length)];
  const fps = pick(FPS);
  const modeName = pick(MODES);
  const primeBeats = modeName === 'beats2' ? 2 : modeName === 'single' || modeName === 'metro0' ? 0 : 3;
  const metro = modeName.startsWith('metro');
  const player = createPlayerModel();
  if (rng.next() < 0.5) player.safety.load({ v: 4, budget: 0, rounds: 0, expectedPayoff: 0 }); // random behavioural move
  const nonce = makeRng(seed);
  const hex = (/** @type {number} */ n) => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(nonce.next() * 256).toString(16).padStart(2, '0'); return s; };
  const commitLog = createCommitLog({ sessionId: `fz${seed}`, randomBytesHex: hex });
  const engine = createRoundEngine({ player, commitLog, rng: makeRng(seed + 7), cfg: { rules: 'turnuva', primeBeats, freezeLeadMs: pick([0, 0, 120, 300]) } });
  let clock = 1000, idx = 0;
  const rounds = 1 + rng.int(3);
  for (let k = 0; k < rounds; k++) {
    const move = /** @type {0|1|2} */ (rng.int(3));
    /** @type {any} */
    const opts = { move, rng, fps, primeBeats, t0: clock, frameIndex: idx, style: { leadMean: pick([20, 60, 110, 170, 260]), leadSd: pick([5, 30, 60]) } };
    const r = rng.next();
    if (r < 0.2) opts.feint = { from: (move + 1 + rng.int(2)) % 3, switchLeadMs: 20 + rng.next() * 180, morphMs: 60 + rng.next() * 200, fromLeadMs: 200 + rng.next() * 200 };
    else if (r < 0.3) opts.late = { afterLandingMs: 10 + rng.next() * 250 };
    else if (r < 0.4) opts.throwAmplitudeScale = 0.12 + rng.next() * 0.5;
    if (rng.next() < 0.3) opts.dropout = pick([0.05, 0.15, 0.3]);
    if (rng.next() < 0.2) opts.perturb = { profile: pick(['linear', 'exponential', 'cubicIn']), noiseSpeedGain: pick([0, 2, 4]), openAmplitude: { mean: pick([0.7, 0.85, 1]), sd: 0.08 }, groupDelay: { mean: pick([15, 80, 140]), sd: 40 } };
    opts.cfg = { timestampJitterMs: pick([0, 2, 8]), leadInMs: primeBeats === 0 && !metro ? pick([1000, 1800, 3000]) : pick([300, 450]) };
    /** @type {{beatTimes:number[]}|null} */ let sched = null;
    if (metro) {
      engine.setMode({ primeBeats, metronome: { periodMs: pick([380, 520, 700]) } });
      sched = engine.armMetronome(clock);
      if (!sched) { clock += 500; continue; }
      const s = sched;
      const off = pick([0, 0, 40, 150, 290, -60]); // the throw stroke comes early, on time or (very) late
      opts.beatTimes = s.beatTimes.map((b, i) => b + rng.normal(0, 12) + (i === s.beatTimes.length - 1 ? off : 0));
      opts.still = rng.next() < 0.3;
    }
    let sim;
    try { sim = simulateThrow(opts); } catch { continue; } // an impossible plan (e.g. beats out of order): skip
    const frames = sim.frames;
    // glue a frame to just before / at / after the scheduled beats and the true landing
    for (const T of [sim.truth.tLanding, ...(sched ? sched.beatTimes : [])]) if (rng.next() < 0.6) {
      let j = -1;
      for (let i = 0; i < frames.length; i++) if (frames[i].t < T) j = i;
      const d = pick([-0.04, -0.02, -0.005, 0, 0.005, 0.03]);
      if (j >= 1 && j + 1 < frames.length && T + d > frames[j - 1].t && T + d < frames[j + 1].t) frames[j].t = T + d;
    }
    // extra tracking gaps of one to five frames
    const gaps = rng.int(3);
    for (let g = 0; g < gaps; g++) {
      const a = rng.int(frames.length), len = 1 + rng.int(5);
      for (let i = a; i < Math.min(frames.length, a + len); i++) frames[i] = { ...frames[i], present: false, image: null, world: null, neural: null };
    }
    /** @type {any} */ let res = null;
    try {
      for (const f of frames) for (const e of engine.pushFrame(f)) if (e.type === 'result') res = e.result;
    } catch (err) {
      exceptions += 1;
      if (examples.length < 5) examples.push({ seed, k, modeName, fps, error: String(/** @type {any} */ (err)?.message) });
      break;
    }
    clock = sim.truth.tEnd + 400; idx = sim.truth.nextFrameIndex;
    if (!res) { engine.abortRound(); tally.none = (tally.none ?? 0) + 1; continue; }
    engine.acknowledge();
    judgedRounds += 1; tally[res.verdict] = (tally[res.verdict] ?? 0) + 1;
    const m = (byMode[modeName] = byMode[modeName] ?? { judged: 0, valid: 0, loss: 0 });
    m.judged += 1;
    const judged = res.commits.find((/** @type {any} */ c) => c.seq === res.judgedSeq);
    const ordered = judged && judged.frame < res.landingFrame && !judged.postLanding
      && res.commits.every((/** @type {any} */ c) => c.postLanding === (c.frame >= res.landingFrame))
      && res.sealOk && res.chainOk && res.timing.leadToLandingMs >= 0;
    if (!ordered) {
      orderViolations += 1;
      if (examples.length < 5) examples.push({ seed, k, modeName, fps, kind: 'order', lead: res.timing.leadToLandingMs, landingFrame: res.landingFrame, commits: res.commits.map((/** @type {any} */ c) => `${c.reason}@f${c.frame}${c.postLanding ? '*' : ''}`) });
    }
    if (res.valid) { validRounds += 1; m.valid += 1; }
    if (res.verdict === 'PLAYER') {
      losses += 1; m.loss += 1;
      if (examples.length < 5) examples.push({ seed, k, modeName, fps, kind: 'LOSS', source: res.landingSource, ai: res.aiMove, player: res.playerMove, hF: res.kinematics.headingFront, hB: res.kinematics.headingBack, lastInAirAgeMs: res.timing.lastInAirAgeMs, judgedReason: judged && judged.reason, landingFrame: res.landingFrame, commits: res.commits.map((/** @type {any} */ c) => `${c.reason}@f${c.frame}${c.postLanding ? '*' : ''}:${c.move}`) });
    }
  }
}

const summary = {
  id: 'fuzz-guarantee', simulated: true, generatedBy: 'experiments/fuzz_guarantee.mjs', rules: 'turnuva',
  description: 'Adversarial fuzz of the turnuva guarantee: random modes, frame rates, feints, late throws, weak strokes, drop-outs, extra gaps, model mismatch, decision freeze, random behavioural moves and frames placed within hundredths of a millisecond of scheduled beats and of the true landing. Seeds 90001..90000+sessions. "none" counts attempts that produced no judged round (aborted or never started).',
  sessions: N, judgedRounds, validRounds, losses, exceptions, orderViolations, tally, byMode, examples,
};
console.log(JSON.stringify(summary, null, 1));
if (SAVE) {
  mkdirSync(join(ROOT, 'docs/results'), { recursive: true });
  writeFileSync(join(ROOT, 'docs/results', 'fuzz-guarantee.json'), JSON.stringify(summary, null, 1));
}
process.exitCode = losses || exceptions || orderViolations ? 1 : 0;
