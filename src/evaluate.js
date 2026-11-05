/**
 * Evaluates a full hand of 5 or more cards: every 5-card combination, or in strict mode the
 * best one (found by scoring every five) with the draws of the whole hand.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { combinations, formatHandKey } = require('./cards');
const { HAND_STRENGTH, STRAIGHT_DRAWS, FLUSH_DRAWS } = require('./flags');
const { analyzeFlags, toEvaluation, wholeHandDraws, buildContext, strengthOf, tiebreakRanks } = require('./analyze');
const { laneTables } = require('./score');

/**
 * In non-strict mode every combination is returned on its own, but a draw to a hand the full
 * hand has already made is not a draw: drops straight draws from every combination once any
 * combination makes a straight or better, and flush draws once any makes a flush or better.
 *
 * @param {Object[]} analysed - Every combination, from analyzeFlags (modified in place)
 */
function dropMadeDraws(analysed) {
  const strongest = Math.max(...analysed.map(hand => strengthOf(hand.flags)));
  for (const { flags } of analysed) {
    if (strongest >= HAND_STRENGTH.isStraight) STRAIGHT_DRAWS.forEach(draw => { flags[draw] = false; });
    if (strongest >= HAND_STRENGTH.isFlush) FLUSH_DRAWS.forEach(draw => { flags[draw] = false; });
    flags.isComboDraw = flags.isFlushDraw && flags.isStraightDraw;
  }
}

/**
 * Evaluates the hand. Inputs must already be validated.
 *
 * @param {string[]} cards - 5 or more cards
 * @param {boolean} strict - Strict mode
 * @param {string[]|null} holeCards - The player's hole cards, or null
 * @param {string|null} [street=null] - 'flop', 'turn' or 'river'; inferred from the card count when null
 * @param {boolean} [flat=false] - Start each evaluation with evaluate()'s leading properties, for it to fill in
 * @returns {Object<string, Object>} Evaluations keyed by 5-card hand
 */
function evaluateCards(cards, strict, holeCards, street = null, flat = false) {
  const ctx = buildContext(cards, holeCards, street, flat);
  if (strict && cards.length > 5) {
    // Strict: score every five, keep the first of the strongest, and analyse only that one.
    // Draws come from the whole hand, so they can use cards outside the best five.
    const bestFive = strongestFive(cards);
    const best = analyzeFlags(bestFive, ctx, true);
    return { [formatHandKey(bestFive)]: toEvaluation(best, ctx, wholeHandDraws(ctx, strengthOf(best.flags))) };
  }
  const fives = cards.length === 5 ? [cards] : combinations(cards, 5);
  if (!strict) {
    const analysed = fives.map(five => analyzeFlags(five, ctx, false));
    dropMadeDraws(analysed);
    const result = {};
    fives.forEach((five, i) => { result[formatHandKey(five)] = toEvaluation(analysed[i], ctx); });
    return result;
  }
  // Strict, five cards
  return { [formatHandKey(cards)]: toEvaluation(analyzeFlags(cards, ctx, true), ctx) };
}

/**
 * The strongest five-card combination of the hand, the first one on a tie, scoring each five
 * straight from the cards' suit lanes in the same order as `combinations`.
 *
 * @param {string[]} cards - The whole hand
 * @returns {string[]} The strongest five, in input order
 */
function strongestFive(cards) {
  const tables = laneTables();
  const suit = [];
  const bit = [];
  for (const card of cards) {
    const i = tables.index.get(card);
    suit.push(tables.suit[i]);
    bit.push(tables.bit[i]);
  }
  let best = null;
  let bestScore = -1;
  const lanes = [0, 0, 0, 0];
  const n = cards.length;
  // Same order as combinations(): a < b < c < d < e
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            lanes[0] = 0; lanes[1] = 0; lanes[2] = 0; lanes[3] = 0;
            lanes[suit[a]] |= bit[a];
            lanes[suit[b]] |= bit[b];
            lanes[suit[c]] |= bit[c];
            lanes[suit[d]] |= bit[d];
            lanes[suit[e]] |= bit[e];
            const score = tables.eval(lanes[0], lanes[1], lanes[2], lanes[3]);
            if (score > bestScore) {
              bestScore = score;
              best = [a, b, c, d, e];
            }
          }
        }
      }
    }
  }
  return best.map(i => cards[i]);
}

/**
 * A comparable rank for five cards: [strength, ...tiebreak ranks]. Compare element by element;
 * the higher array is the stronger hand.
 *
 * @param {string[]} five - Five cards
 * @returns {number[]} The rank
 */
function rankFive(five) {
  const analysed = analyzeFlags(five, buildContext(five, null), true);
  return [strengthOf(analysed.flags), ...tiebreakRanks(analysed)];
}

module.exports = { evaluateCards, rankFive };
