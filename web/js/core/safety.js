// @ts-check
/**
 * beaTTer v4 — budgeted safe exploitation of the behavioural channel (pure).
 *
 * A deterministic best response can itself be predicted and beaten. The behavioural decision is therefore
 * the mixed strategy
 *        sigma = lambda * (best response) + (1 - lambda) * uniform,      lambda = clamp(budget, 0, 1)
 * and after every round
 *        budget <- budget + epsilon + lambda * payoff(best response, actual move).
 * The uniform part earns exactly 0 against any move, so lambda * payoff is the EXPECTED payoff of sigma
 * against the move that was actually played: the budget only ever risks what has been won ("risk what
 * you've won", [GanzfriedSandholm2015]) plus a small allowance epsilon per round.
 *
 * Guarantee (proved in the thesis, tested here): against ANY opponent, cumulative expected payoff over T
 * rounds >= -(initialBudget + epsilon * T).
 */

import { payoff } from './constants.js';
import { bestResponse } from './decision.js';

export const DEFAULTS = Object.freeze({
  /** Expected loss the behavioural channel may incur before it starts mixing towards Nash. */
  initialBudget: 1.0,
  /** Allowance added every round; bounds the long-run expected loss per round. */
  epsilonPerRound: 0.02,
  /** Budget cap: winnings beyond this are not banked (keeps lambda responsive after a long winning run). */
  maxBudget: 6,
});

/**
 * @param {Partial<typeof DEFAULTS>} [cfg]
 */
export function createSafeExploiter(cfg = {}) {
  const c = { ...DEFAULTS, ...cfg };
  let budget = c.initialBudget;
  let rounds = 0;
  let expectedPayoff = 0;

  const lambda = () => Math.min(1, Math.max(0, budget));

  /**
   * Sample the behavioural move.
   * @param {number[]} p predicted distribution of the player's move
   * @param {{next():number}} rng
   * @returns {{move:number, best:number, lambda:number, mixed:boolean}}
   */
  const decide = (p, rng) => {
    const best = bestResponse(p);
    const l = lambda();
    if (rng.next() < l) return { move: best, best, lambda: l, mixed: false };
    return { move: Math.min(2, Math.floor(rng.next() * 3)), best, lambda: l, mixed: true };
  };

  /**
   * Account for a finished round. @param {number} best the best response that sigma was built on
   * @param {number} lambdaUsed the lambda in force when the move was sampled @param {number} yTrue
   */
  const account = (best, lambdaUsed, yTrue) => {
    if (!(yTrue === 0 || yTrue === 1 || yTrue === 2) || !(best === 0 || best === 1 || best === 2)) return;
    const gain = lambdaUsed * payoff(/** @type {0|1|2} */ (best), /** @type {0|1|2} */ (yTrue));
    expectedPayoff += gain;
    budget = Math.min(c.maxBudget, budget + c.epsilonPerRound + gain);
    rounds += 1;
  };

  const toJSON = () => ({ v: 4, budget, rounds, expectedPayoff });
  /** @param {any} o */
  const load = (o) => {
    if (!o || o.v !== 4 || !Number.isFinite(o.budget)) return false;
    budget = Math.min(c.maxBudget, Math.max(0, o.budget));
    rounds = Number.isFinite(o.rounds) && o.rounds >= 0 ? o.rounds : 0;
    expectedPayoff = Number.isFinite(o.expectedPayoff) ? o.expectedPayoff : 0;
    return true;
  };

  return { lambda, decide, account, toJSON, load, get budget() { return budget; }, get rounds() { return rounds; }, get expectedPayoff() { return expectedPayoff; }, cfg: c };
}
