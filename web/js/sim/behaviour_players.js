// @ts-check
/**
 * beaTTer v4 — synthetic behavioural players (pure; tests, experiments and the demo mode).
 *
 * Each player decides its next move from the history of previous rounds, like a human would. They are
 * MODELS, not data: results obtained against them are simulation results and are labelled as such.
 */

import { OPENING, SHIFT_AFTER } from '../core/sequence/population.js';
import { bestResponse } from '../core/decision.js';

/** @typedef {{P:number[], A:number[], O:number[]}} History  own moves, opponent (AI) moves, own outcomes (+1/0/-1) */
/** @typedef {{next:(h:History)=>number, kind:string}} BehaviourPlayer */
/** @typedef {{next():number, int(n:number):number}} Rng */

/** @param {readonly number[]} w @param {Rng} rng */
function sample(w, rng) {
  const s = w[0] + w[1] + w[2];
  let r = rng.next() * s;
  for (let i = 0; i < 2; i++) { if (r < w[i]) return i; r -= w[i]; }
  return 2;
}

/** Krichevsky-Trofimov estimate of P(next | last) from a sequence (used by the players that model the AI). */
function markov1(/** @type {number[]} */ seq) {
  if (seq.length < 2) return [1 / 3, 1 / 3, 1 / 3];
  const last = seq[seq.length - 1];
  const c = [0.5, 0.5, 0.5];
  for (let i = 1; i < seq.length; i++) if (seq[i - 1] === last) c[seq[i]] += 1;
  const n = c[0] + c[1] + c[2];
  return [c[0] / n, c[1] / n, c[2] / n];
}

export const KINDS = Object.freeze(['uniform', 'biased', 'wsls', 'wslsStrong', 'markov1', 'cycle', 'pattern', 'antiPredictor', 'humanLike', 'switcher']);

/**
 * @param {string} kind one of KINDS
 * @param {Rng} rng
 * @param {any} [params]
 * @returns {BehaviourPlayer}
 */
export function makePlayer(kind, rng, params = {}) {
  /** @param {History} h @param {{win:readonly number[], loss:readonly number[], tie:readonly number[]}} table */
  const conditional = (h, table) => {
    const n = h.P.length;
    if (n === 0) return sample(OPENING, rng);
    const o = h.O[n - 1];
    const shift = sample(o > 0 ? table.win : o < 0 ? table.loss : table.tie, rng);
    return (h.P[n - 1] + shift) % 3;
  };
  switch (kind) {
    case 'uniform':
      return { kind, next: () => rng.int(3) };
    case 'biased': {
      const p = params.p ?? [0.5, 0.25, 0.25];
      return { kind, next: () => sample(p, rng) };
    }
    case 'wsls': // group-level conditional response of real players [ForderDyson2016]
      return { kind, next: (h) => conditional(h, params.table ?? SHIFT_AFTER) };
    case 'wslsStrong': { // a caricature: strong win-stay / lose-shift
      const table = params.table ?? { win: [0.8, 0.1, 0.1], loss: [0.1, 0.45, 0.45], tie: [0.34, 0.33, 0.33] };
      return { kind, next: (h) => conditional(h, table) };
    }
    case 'markov1': {
      const T = params.T ?? [[0.15, 0.7, 0.15], [0.15, 0.15, 0.7], [0.7, 0.15, 0.15]];
      return { kind, next: (h) => (h.P.length ? sample(T[h.P[h.P.length - 1]], rng) : rng.int(3)) };
    }
    case 'cycle': {
      const step = params.step ?? 1, lapse = params.lapse ?? 0;
      return { kind, next: (h) => (h.P.length === 0 || rng.next() < lapse ? rng.int(3) : (h.P[h.P.length - 1] + step) % 3) };
    }
    case 'pattern': {
      const pat = params.pattern ?? [0, 0, 1, 2, 1];
      return { kind, next: (h) => pat[h.P.length % pat.length] };
    }
    case 'antiPredictor': // second-guesser: predicts what a Markov-1 model of itself predicts, and plays what beats the AI's best response
      return {
        kind,
        next: (h) => {
          if (h.P.length < 3) return rng.int(3);
          const aiMove = bestResponse(markov1(h.P));
          return (aiMove + 1) % 3;
        },
      };
    case 'humanLike': { // conditional response with individual differences and lapses
      const jitter = () => 0.75 + 0.5 * rng.next();
      const table = {
        win: SHIFT_AFTER.win.map((v) => v * jitter()),
        loss: SHIFT_AFTER.loss.map((v) => v * jitter()),
        tie: SHIFT_AFTER.tie.map((v) => v * jitter()),
      };
      const lapse = params.lapse ?? 0.15;
      return { kind, next: (h) => (rng.next() < lapse ? rng.int(3) : conditional(h, table)) };
    }
    case 'switcher': {
      const kinds = params.kinds ?? ['cycle', 'wslsStrong', 'biased', 'uniform'];
      const every = params.every ?? 40;
      const players = kinds.map((/** @type {string} */ k) => makePlayer(k, rng));
      return { kind, next: (h) => players[Math.floor(h.P.length / every) % players.length].next(h) };
    }
    default:
      throw new RangeError(`makePlayer: unknown kind ${kind}`);
  }
}
