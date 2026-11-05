/**
 * Hand scores with plain numbers, from poker-bitvaljs's fast evaluator: higher beats lower, equal
 * values tie, and `score >>> 20` is the made-hand category (0 high card ... 8 straight flush).
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { scorer } = require('./core/classify');

/**
 * A comparable score for 5 to 7 distinct cards: higher is a better hand, equal is a tie.
 *
 * @param {string[]} cards - 5 to 7 cards
 * @returns {number} The score
 */
function scoreCards(cards) {
  return scorer().evaluateCards(cards);
}

/** 1, -1 or 0 for two scores. */
function compareScores(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
}

module.exports = { scoreCards, compareScores };
