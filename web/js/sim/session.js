// @ts-check
/**
 * beaTTer v4 — simulated sessions: behaviour player + kinematic player + the real engine (pure).
 *
 * The single entry point for integration tests, the experiments and the demo mode: frames produced by
 * the synthetic player go through exactly the same engine as camera frames. Results are SIMULATION.
 */

import { makeRng } from '../core/rng.js';
import { createCommitLog } from '../core/commit.js';
import { createPlayerModel } from '../core/player_model.js';
import { createRoundEngine } from '../core/round_engine.js';
import { simulateThrow } from './kinematic_player.js';
import { makePlayer } from './behaviour_players.js';

/**
 * Feed frames to an engine. @param {ReturnType<typeof createRoundEngine>} engine
 * @param {import('../core/constants.js').HandFrame[]} frames
 * @returns {any[]} all events, in order
 */
export function runRoundFrames(engine, frames) {
  const events = [];
  for (const f of frames) for (const e of engine.pushFrame(f)) events.push(e);
  return events;
}

/**
 * @param {Object} o
 * @param {number} o.seed
 * @param {string} [o.behaviour]            behaviour player kind (sim/behaviour_players.js)
 * @param {any} [o.behaviourParams]
 * @param {any} [o.style]                   opener style name or {leadMean, leadSd}
 * @param {number} [o.fps]
 * @param {string} [o.rules]                referee preset
 * @param {number} [o.primeBeats]
 * @param {object} [o.engineCfg]
 * @param {(round:number, rng:any) => object} [o.throwOptions]   extra simulateThrow options per round (feints, late throws, ...)
 * @param {any} [o.playerJson]              restore a serialised player model
 * @param {number} [o.gapMs]                pause between rounds
 */
export function createSession(o) {
  const seed = o.seed;
  const kinRng = makeRng(seed * 7919 + 1), behRng = makeRng(seed * 104729 + 2), engRng = makeRng(seed * 1299709 + 3), nonceRng = makeRng(seed * 15485863 + 4);
  const fps = o.fps ?? 30;
  const primeBeats = o.primeBeats ?? 3;
  const hex = (/** @type {number} */ n) => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(nonceRng.next() * 256).toString(16).padStart(2, '0'); return s; };
  const commitLog = createCommitLog({ sessionId: `sim-${seed}`, randomBytesHex: hex });
  const player = createPlayerModel();
  if (o.playerJson) player.load(o.playerJson);
  const engine = createRoundEngine({ player, commitLog, rng: engRng, cfg: { rules: o.rules ?? 'turnuva', primeBeats, ...(o.engineCfg ?? {}) } });
  const behaviour = makePlayer(o.behaviour ?? 'humanLike', behRng, o.behaviourParams);
  const h = { P: /** @type {number[]} */ ([]), A: /** @type {number[]} */ ([]), O: /** @type {number[]} */ ([]) };
  let clock = 1000, frameIndex = 0, round = 0, aborted = 0;
  /** @type {any[]} */ const results = [];

  /**
   * Play one attempt (it may end in a foul, a void or an abort).
   * @param {object} [extra] simulateThrow options for this attempt
   */
  const playRound = (extra = {}) => {
    round += 1;
    const move = /** @type {0|1|2} */ (behaviour.next(h));
    const opts = { ...(o.throwOptions ? o.throwOptions(round, kinRng) : {}), ...extra };
    const sim = simulateThrow({ move, rng: kinRng, fps, style: o.style ?? 'normal', primeBeats, t0: clock, frameIndex, ...opts });
    const events = runRoundFrames(engine, sim.frames);
    clock = sim.truth.tEnd + (o.gapMs ?? 500);
    frameIndex = sim.truth.nextFrameIndex;
    const res = events.find((e) => e.type === 'result');
    if (!res) { aborted += 1; engine.abortRound(); return { result: null, truth: sim.truth, events, intended: move }; }
    engine.acknowledge();
    const result = res.result;
    results.push(result);
    if (result.valid) { h.P.push(result.playerMove); h.A.push(result.aiMove); h.O.push(result.verdict === 'PLAYER' ? 1 : result.verdict === 'AI' ? -1 : 0); }
    return { result, truth: sim.truth, events, intended: move };
  };

  return { playRound, engine, player, commitLog, results, get aborted() { return aborted; }, history: h };
}

/**
 * Run a whole simulated session.
 * @param {Parameters<typeof createSession>[0] & {rounds:number}} o `rounds` = number of attempts
 */
export function runSession(o) {
  const s = createSession(o);
  for (let i = 0; i < o.rounds; i++) s.playRound();
  return { results: s.results, summary: s.player.metrics.summary(), aborted: s.aborted, player: s.player, commitLog: s.commitLog };
}

/** Median helper for experiment tables. @param {number[]} a */
export const medianOf = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
