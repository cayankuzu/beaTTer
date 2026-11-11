// @ts-check
/**
 * beaTTer v4 — behavioural sequence model, "Channel A" (pure).
 *
 * predict() gives the distribution of the player's NEXT move from previous rounds only; it never looks
 * at the round in progress, so its output exists before the player moves.
 *
 * Persistence: only the move histories are stored. The model is a deterministic function of the history,
 * so load() rebuilds it by replaying the rounds — small, versioned and impossible to corrupt partially.
 * The stored history is capped at `historyCap` rounds: up to that length a save/load round trip is
 * exact; beyond it a reload rebuilds the model from the most recent `historyCap` rounds only, i.e. the
 * oldest evidence is forgotten at that moment (the mixture forgets exponentially anyway).
 */

import { buildExperts } from './experts.js';
import { createMixture } from './mixture.js';

export const DEFAULTS = Object.freeze({
  /** Rounds kept (and replayed on load). */
  historyCap: 4000,
});

const SCHEMA = 4;

/**
 * @param {Partial<typeof DEFAULTS> & {mixture?: object}} [cfg]
 */
export function createSequenceModel(cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  let experts = buildExperts();
  let mixture = createMixture({ nExperts: experts.length, ...(cfg.mixture ?? {}) });
  /** @type {number[]} */ let P = [];
  /** @type {number[]} */ let A = [];
  /** @type {number[]} */ let O = [];
  /** @type {{n:number, preds:(Float64Array|null)[]}|null} */ let cache = null;

  const ctx = () => ({ P, A, O });

  const predictions = () => {
    if (cache && cache.n === P.length) return cache.preds;
    const context = ctx();
    const preds = experts.map((e) => {
      try { return e.predict(context); } catch { return null; }
    });
    cache = { n: P.length, preds };
    return preds;
  };

  /**
   * @returns {{p: number[], top: {name:string, family:string, rotation:number, weight:number}[]}}
   */
  const predict = () => {
    const { p, top } = mixture.combine(predictions());
    return {
      p: [p[0], p[1], p[2]],
      top: top.map((t) => ({
        name: t.expert < 0 ? 'uniform' : experts[t.expert].name,
        family: t.expert < 0 ? 'uniform' : experts[t.expert].family,
        rotation: t.rotation,
        weight: t.weight,
      })),
    };
  };

  /**
   * Record a finished (valid) round. @param {number} y player's move @param {number} aiMove AI's judged move
   */
  const update = (y, aiMove) => {
    if (!(y === 0 || y === 1 || y === 2) || !(aiMove === 0 || aiMove === 1 || aiMove === 2)) return;
    const preds = predictions();
    mixture.update(preds, y);
    const context = ctx();
    for (const e of experts) e.update(context, y, aiMove);
    P.push(y); A.push(aiMove);
    O.push(y === aiMove ? 0 : y === (aiMove + 1) % 3 ? 1 : -1); // player's outcome
    if (P.length > c.historyCap) { P.shift(); A.shift(); O.shift(); }
    cache = null;
  };

  const reset = () => {
    experts = buildExperts();
    mixture = createMixture({ nExperts: experts.length, ...(cfg.mixture ?? {}) });
    P = []; A = []; O = []; cache = null;
  };

  const toJSON = () => ({ v: SCHEMA, P: P.join(''), A: A.join('') });

  /** @param {any} json */
  const load = (json) => {
    reset();
    if (!json || json.v !== SCHEMA || typeof json.P !== 'string' || typeof json.A !== 'string') return false;
    if (json.P.length !== json.A.length || !/^[012]*$/.test(json.P) || !/^[012]*$/.test(json.A)) return false;
    const start = Math.max(0, json.P.length - c.historyCap);
    for (let i = start; i < json.P.length; i++) update(json.P.charCodeAt(i) - 48, json.A.charCodeAt(i) - 48);
    return true;
  };

  /** Descriptive statistics of the player's behaviour (for the lab panel). */
  const stats = () => {
    const n = P.length;
    const freq = [0, 0, 0];
    for (const y of P) freq[y] += 1;
    /** counts[outcome][shift]: outcome 0 = after win, 1 = after tie, 2 = after loss; shift 0 stay, 1 up, 2 down */
    const cond = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 1; i < n; i++) cond[O[i - 1] > 0 ? 0 : O[i - 1] === 0 ? 1 : 2][(P[i] - P[i - 1] + 3) % 3] += 1;
    let h = 0;
    for (const f of freq) if (f > 0) h -= (f / n) * Math.log2(f / n);
    return { n, freq, conditional: cond, entropyBits: n > 0 ? h : null };
  };

  return {
    predict, update, reset, toJSON, load, stats,
    history: () => ({ P: P.slice(), A: A.slice(), O: O.slice() }),
    get length() { return P.length; },
    expertNames: () => experts.map((e) => e.name),
  };
}
