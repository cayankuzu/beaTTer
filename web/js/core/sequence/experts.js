// @ts-check
/**
 * beaTTer v4 — the base experts of the behavioural channel (pure).
 *
 * Every expert predicts the player's next move from the history of previous rounds only, so its
 * prediction is available before the player moves. An expert may abstain (return null) until it has data
 * for the current context; the mixture treats it as "sleeping" (the specialists setting).
 *
 * Context: P = player's moves, A = AI's moves, O = outcomes from the PLAYER's view (+1 won, 0 tie, -1 lost).
 * Table experts keep exponentially decayed counts and predict with the Krichevsky-Trofimov estimator
 * q(x) = (c_x + 1/2) / (n + 3/2)  [KT1981].
 */

import { createCTW } from './ctw.js';
import { createPPM } from './ppm.js';
import { populationPrior } from './population.js';

/** @typedef {{P:number[], A:number[], O:number[]}} SeqContext */
/**
 * @typedef {Object} Expert
 * @property {string} name     stable machine name (the UI maps it to a label)
 * @property {string} family   'freq'|'markov'|'reaction'|'joint'|'shift'|'rotation'|'ctw'|'ppm'|'self'|'population'
 * @property {(ctx:SeqContext) => Float64Array|null} predict
 * @property {(ctx:SeqContext, y:number, aiMove:number) => void} update   ctx = history BEFORE this round
 */

/** @param {number[]} arr @param {number} k */
const lastK = (arr, k) => (arr.length < k ? null : arr.slice(arr.length - k).join(''));

/**
 * Decayed-count table expert.
 * @param {{name:string, family:string, key:(ctx:SeqContext)=>string|null, decay:number, minMass?:number,
 *          target?:'move'|'shift'|'ai'}} o
 *   target 'move': the player's move; 'shift': (move - own last move) mod 3; 'ai': the AI's move (the
 *   prediction is then turned into the player move that would beat it).
 * @returns {Expert}
 */
function tableExpert({ name, family, key, decay, minMass = 0.5, target = 'move' }) {
  /** @type {Map<string, Float64Array>} */
  const table = new Map();
  return {
    name, family,
    predict(ctx) {
      if (target === 'shift' && ctx.P.length === 0) return null;
      const k = key(ctx);
      if (k === null) return null;
      const c = table.get(k);
      if (!c) return null;
      const n = c[0] + c[1] + c[2];
      if (n < minMass) return null;
      const q = Float64Array.of((c[0] + 0.5) / (n + 1.5), (c[1] + 0.5) / (n + 1.5), (c[2] + 0.5) / (n + 1.5));
      if (target === 'move') return q;
      const out = new Float64Array(3);
      if (target === 'shift') {
        const last = ctx.P[ctx.P.length - 1];
        for (let y = 0; y < 3; y++) out[y] = q[(y - last + 3) % 3];
      } else {
        for (let y = 0; y < 3; y++) out[y] = q[(y + 2) % 3]; // y beats the AI move (y + 2) % 3
      }
      return out;
    },
    update(ctx, y, aiMove) {
      if (target === 'shift' && ctx.P.length === 0) return;
      const k = key(ctx);
      if (k === null) return;
      let c = table.get(k);
      if (!c) { c = new Float64Array(3); table.set(k, c); }
      c[0] *= decay; c[1] *= decay; c[2] *= decay;
      const label = target === 'move' ? y : target === 'shift' ? (y - ctx.P[ctx.P.length - 1] + 3) % 3 : aiMove;
      if (label === 0 || label === 1 || label === 2) c[label] += 1;
    },
  };
}

/** Shift sequence of the player: s_i = (P_i - P_{i-1}) mod 3. @param {number[]} P */
const shifts = (P) => { const s = []; for (let i = 1; i < P.length; i++) s.push((P[i] - P[i - 1] + 3) % 3); return s; };

/** Most-recent-first context of length `depth`. @param {number[]} seq @param {number} depth */
const recentFirst = (seq, depth) => { const out = []; for (let d = 0; d < depth && d < seq.length; d++) out.push(seq[seq.length - 1 - d]); return out; };

/** @returns {Expert[]} the 26 base experts, in a fixed order (serialised models rely on it) */
export function buildExperts() {
  /** @type {Expert[]} */
  const ex = [];
  for (const d of [0.60, 0.85, 0.97, 1.0]) {
    ex.push(tableExpert({ name: `freq_${d}`, family: 'freq', key: () => '', decay: d, minMass: 0.9 }));
  }
  for (let k = 1; k <= 4; k++) {
    ex.push(tableExpert({ name: `markovP_${k}`, family: 'markov', key: (c) => lastK(c.P, k), decay: 0.96 }));
  }
  for (let k = 1; k <= 2; k++) {
    ex.push(tableExpert({ name: `markovA_${k}`, family: 'reaction', key: (c) => lastK(c.A, k), decay: 0.96 }));
  }
  for (let k = 1; k <= 3; k++) {
    ex.push(tableExpert({
      name: `markovJ_${k}`, family: 'joint', decay: 0.96,
      key: (c) => { if (c.P.length < k) return null; let s = ''; for (let i = c.P.length - k; i < c.P.length; i++) s += c.P[i] * 3 + c.A[i]; return s; },
    }));
  }
  ex.push(tableExpert({ name: 'shiftO1', family: 'shift', target: 'shift', decay: 0.96, key: (c) => (c.O.length ? String(c.O[c.O.length - 1]) : null) }));
  ex.push(tableExpert({ name: 'shiftO2', family: 'shift', target: 'shift', decay: 0.96, key: (c) => (c.O.length >= 2 ? `${c.O[c.O.length - 2]},${c.O[c.O.length - 1]}` : null) }));
  ex.push(tableExpert({ name: 'shiftOM', family: 'shift', target: 'shift', decay: 0.96, key: (c) => (c.O.length ? `${c.O[c.O.length - 1]}|${c.P[c.P.length - 1]}` : null) }));
  for (let k = 1; k <= 2; k++) {
    ex.push(tableExpert({ name: `shiftSeq_${k}`, family: 'rotation', target: 'shift', decay: 0.96, key: (c) => lastK(shifts(c.P), k) }));
  }

  const ctwP = createCTW({ depth: 6 });
  ex.push({
    name: 'ctwP', family: 'ctw',
    predict: (c) => (c.P.length ? ctwP.predict(recentFirst(c.P, 6)) : null),
    update: (c, y) => ctwP.update(recentFirst(c.P, 6), y),
  });
  const ctwS = createCTW({ depth: 5 });
  ex.push({
    name: 'ctwShift', family: 'ctw',
    predict(c) {
      if (c.P.length < 2) return null;
      const q = ctwS.predict(recentFirst(shifts(c.P), 5));
      const last = c.P[c.P.length - 1];
      return Float64Array.of(q[(0 - last + 3) % 3], q[(1 - last + 3) % 3], q[(2 - last + 3) % 3]);
    },
    update(c, y) {
      if (c.P.length < 1) return;
      ctwS.update(recentFirst(shifts(c.P), 5), (y - c.P[c.P.length - 1] + 3) % 3);
    },
  });
  const ctwJ = createCTW({ depth: 3, contextAlphabet: 9 });
  /** @param {SeqContext} c */
  const pairs = (c) => { const out = []; for (let d = 0; d < 3 && d < c.P.length; d++) { const i = c.P.length - 1 - d; out.push(c.P[i] * 3 + c.A[i]); } return out; };
  ex.push({
    name: 'ctwJ', family: 'ctw',
    predict: (c) => (c.P.length ? ctwJ.predict(pairs(c)) : null),
    update: (c, y) => ctwJ.update(pairs(c), y),
  });
  const ppm = createPPM({ maxOrder: 6 });
  ex.push({
    name: 'ppmP', family: 'ppm',
    predict: (c) => (c.P.length ? ppm.predict(c.P) : null),
    update: (c, y) => ppm.update(c.P, y),
  });

  // "Mirror" experts (Iocaine Powder P'-strategies [Egnor2000]): model the AI's own next move the way an
  // opponent would, and assume the player plays what beats it.
  ex.push(tableExpert({ name: 'selfFreq', family: 'self', target: 'ai', decay: 0.9, minMass: 0.9, key: () => '' }));
  for (let k = 1; k <= 2; k++) {
    ex.push(tableExpert({ name: `selfMarkov_${k}`, family: 'self', target: 'ai', decay: 0.96, key: (c) => lastK(c.A, k) }));
  }

  ex.push({ name: 'population', family: 'population', predict: (c) => populationPrior(c), update: () => {} });
  return ex;
}
