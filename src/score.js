/**
 * Fast hand scoring with plain numbers, using poker-bitvaljs's public fast evaluator (1.9.0+).
 *
 * A set of cards is four 13-bit "suit lanes" (one rank mask per suit, in poker-bitvaljs's order).
 * A score is an integer: higher beats lower, equal values tie, and `score >>> 20` is the made-hand
 * category. poker-bitvaljs documents this format as stable across versions.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const BitVal = require('poker-bitvaljs');
const { RANKS, SUITS } = require('./cards');

const DECK = [...RANKS].flatMap(rank => [...SUITS].map(suit => rank + suit));

/** Made hand flag by category index (score >>> 20): 0 high card ... 8 straight flush. */
const CATEGORY_BY_INDEX = ['isHighCard', 'isPair', 'isTwoPair', 'isThreeOfAKind', 'isStraight', 'isFlush', 'isFullHouse', 'isFourOfAKind', 'isStraightFlush'];

let bitval = null;
let tables = null;

/** poker-bitvaljs, created on first use. */
function bv() {
  if (!bitval) bitval = new BitVal();
  return bitval;
}

/**
 * A comparable score for 5 to 7 distinct cards: higher is a better hand, equal is a tie.
 *
 * @param {string[]} cards - 5 to 7 cards
 * @returns {number} The score
 */
function scoreCards(cards) {
  return bv().evaluateCards(cards);
}

/** 1, -1 or 0 for two scores. */
function compareScores(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
}

/**
 * The made hand a score represents, e.g. 'isFlush'. Royal flushes count as straight flushes here;
 * callers needing the distinction use the full evaluation.
 *
 * @param {number} score - From scoreCards or laneTables().eval
 * @returns {string} The made hand flag
 */
function categoryOf(score) {
  return CATEGORY_BY_INDEX[score >>> 20];
}

/**
 * Each card's suit lane and rank bit, indexed like DECK, for callers that build suit lanes
 * themselves in hot loops, plus the evaluator for four lanes.
 *
 * @returns {{suit: Int8Array, bit: Int32Array, index: Map<string, number>, eval: Function}}
 */
function laneTables() {
  if (tables) return tables;
  const b = bv();
  const suit = new Int8Array(DECK.length);
  const bit = new Int32Array(DECK.length);
  DECK.forEach((card, i) => {
    const masks = b.toSuitMasks([card]);
    suit[i] = masks.findIndex(mask => mask !== 0);
    bit[i] = masks[suit[i]];
  });
  tables = { suit, bit, index: new Map(DECK.map((card, i) => [card, i])), eval: (s, h, d, c) => b.evaluateSuits(s, h, d, c) };
  return tables;
}

module.exports = { DECK, laneTables, scoreCards, compareScores, categoryOf };
