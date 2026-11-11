// @ts-check
/**
 * beaTTer v4 — population prior: what an unknown human is likely to throw (pure).
 *
 * Numbers are published group-level measurements, not tuned constants:
 *
 *  OPENING  first throw of a match — Batzilis et al. (2019), Roshambull Facebook app, 5,012,128 first
 *           throws: Rock 33.99 %, Paper 34.82 %, Scissors 31.20 %.                      [Batzilis2019]
 *           (The often-quoted "rock 35.4 / paper 35.0 / scissors 29.6" has no published sample or method.)
 *
 *  SHIFT    next move relative to the player's own previous move, given the previous outcome —
 *           Forder & Dyson (2016), N = 36, 450 rounds each against a computer that could not be
 *           exploited: stay / upgrade / downgrade                                       [ForderDyson2016]
 *               after a WIN   42.45 / 29.32 / 28.23 %
 *               after a LOSS  21.46 / 39.13 / 39.41 %
 *               after a DRAW  29.28 / 37.32 / 33.40 %
 *           "upgrade" = the move that beats one's own previous move (shift +1), "downgrade" = the move
 *           that loses to it (shift +2).
 *
 * These are averages over people: individuals differ and adapt when exploited [BrockbankVul2024], which
 * is why this prior is only one expert among many and loses weight as soon as personal experts predict
 * better.
 */

/** P(first throw) for ROCK, PAPER, SCISSORS. */
export const OPENING = Object.freeze([0.3399, 0.3482, 0.3120]);

/** P(shift) = [stay, +1 (upgrade), +2 (downgrade)] indexed by the PLAYER's previous outcome. */
export const SHIFT_AFTER = Object.freeze({
  win: Object.freeze([0.4245, 0.2932, 0.2823]),
  loss: Object.freeze([0.2146, 0.3913, 0.3941]),
  tie: Object.freeze([0.2928, 0.3732, 0.3340]),
});

/** @param {readonly number[]} p */
const norm = (p) => { const s = p[0] + p[1] + p[2]; return Float64Array.of(p[0] / s, p[1] / s, p[2] / s); };

/**
 * @param {{P:number[], O:number[]}} ctx history: player's moves and the player's outcomes (+1 won, 0 tie, -1 lost)
 * @returns {Float64Array} distribution over the player's next move
 */
export function populationPrior(ctx) {
  const n = ctx.P.length;
  if (n === 0) return norm(OPENING);
  const o = ctx.O[n - 1];
  const s = o > 0 ? SHIFT_AFTER.win : o < 0 ? SHIFT_AFTER.loss : SHIFT_AFTER.tie;
  const last = ctx.P[n - 1];
  const q = [0, 0, 0];
  for (let y = 0; y < 3; y++) q[y] = s[(y - last + 3) % 3];
  return norm(q);
}
