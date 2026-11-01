/**
 * Poker Hand Evaluator
 *
 * Evaluates poker hands from 5 or more cards and identifies all possible made hands and draws.
 * For inputs with more than 5 cards, generates all possible 5-card combinations and evaluates each one.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { validateCards, validateHoleCards } = require('./src/cards');
const { evaluateCards } = require('./src/evaluate');
const { parseVillainRange, classifyVillainRange } = require('./src/range');

class HandEvaluator {
  /**
   * Evaluates a hand. The result is on `evaluation`.
   *
   * @param {string[]} cards - 5 or more cards in "Rs" format: rank A, K, Q, J, T, 9-2 and suit s, h, d, c
   * @param {boolean} [strict=true] - Only the strongest made hand (and the hand's draws) when true;
   *   every 5-card combination with all applicable flags when false
   * @param {string[]|null} [holeCards=null] - The player's 2 hole cards, both present in `cards`
   * @param {string[]|null} [villainRange=null] - Villain hands as exact combos ('AhKd') or shorthand
   *   ('QQ', 'AKs', 'AKo', 'AK', 'TT+', 'ATs+'); adds `villainRange` to every evaluation
   * @throws {Error} If cards, holeCards or villainRange is invalid
   * @example
   * const evaluator = new HandEvaluator(['Ks', 'Qh', '8d', '3c', 'Ad', 'Jh'], true, ['Ad', 'Jh']);
   * const [hand, evaluation] = Object.entries(evaluator.evaluation)[0];
   * // hand: 'Ad, Ks, Qh, Jh, 8d'; evaluation.isOvercardAndMiddleCard: true
   */
  constructor(cards, strict = true, holeCards = null, villainRange = null) {
    validateCards(cards);
    this.cards = [...cards];
    this.strict = strict;
    if (holeCards === null || holeCards === undefined) {
      this.holeCards = null;
    } else {
      validateHoleCards(holeCards, cards);
      this.holeCards = holeCards;
    }
    const villainCombos = villainRange === null || villainRange === undefined ? null : parseVillainRange(villainRange);
    this.evaluation = evaluateCards(this.cards, strict, this.holeCards);
    if (villainCombos) {
      const classification = classifyVillainRange(villainCombos, this.cards, this.holeCards, evaluateCards);
      for (const evaluation of Object.values(this.evaluation)) evaluation.villainRange = classification;
    }
  }
}

/**
 * Evaluates poker hands from 5 or more cards and identifies all possible made hands and draws.
 *
 * @param {string[]} cards - 5 or more cards in "Rs" format: rank A, K, Q, J, T, 9-2 and suit s, h, d, c
 * @param {boolean} [strict=true] - Only the strongest made hand (and the hand's draws) when true;
 *   every 5-card combination with all applicable flags when false
 * @param {string[]|null} [holeCards=null] - The player's 2 hole cards, both present in `cards`
 * @param {string[]|null} [villainRange=null] - Villain hands as exact combos or shorthand; adds
 *   `villainRange: { boardBlocks, heroBlocks, allBlocks }` to every evaluation
 * @returns {Object} Evaluations keyed by 5-card hand (e.g. 'As, Ks, Qs, Js, Ts')
 * @throws {Error} If cards, holeCards or villainRange is invalid
 * @example
 * const result = evaluateHand(['4h', '9h', '7h', '8s', 'Ah', 'Js'], true, ['Ah', 'Js']);
 * const evaluation = Object.values(result)[0];
 * // evaluation.isFlushDraw: true, evaluation.isComboDraw: true
 */
function evaluateHand(cards, strict = true, holeCards = null, villainRange = null) {
  return new HandEvaluator(cards, strict, holeCards, villainRange).evaluation;
}

module.exports = { evaluateHand, HandEvaluator };
module.exports.default = evaluateHand;
