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
const { MADE_HANDS, HAND_STRENGTH } = require('./src/flags');
const { evaluateCards, rankFive } = require('./src/evaluate');
const { streetFor } = require('./src/analyze');
const { parseRange, classifyCombos } = require('./src/range');
const { compareHands, equity } = require('./src/compare');
const { defineLazy } = require('./src/lazy');
const { HandView } = require('./src/hand');

const STREETS = ['flop', 'turn', 'river'];

/**
 * Reads the arguments after `cards`: either an options object, or the positional
 * (strict, holeCards, villainRange) form.
 *
 * @returns {{strict: boolean, holeCards: string[]|null, villainRange: string|string[]|null, street: string|null}}
 * @throws {Error} If street is not 'flop', 'turn' or 'river'
 */
function readOptions(strictOrOptions, holeCards, villainRange) {
  let options;
  if (strictOrOptions !== null && typeof strictOrOptions === 'object' && !Array.isArray(strictOrOptions)) {
    options = { strict: true, holeCards: null, villainRange: null, street: null, ...strictOrOptions };
  } else {
    options = { strict: strictOrOptions === undefined ? true : strictOrOptions, holeCards, villainRange, street: null };
  }
  if (options.holeCards === undefined) options.holeCards = null;
  if (options.villainRange === undefined) options.villainRange = null;
  if (options.street !== null && options.street !== undefined && !STREETS.includes(options.street)) {
    throw new Error(`Street must be 'flop', 'turn' or 'river', received "${options.street}"`);
  }
  return options;
}

/**
 * Splits a villain range by which known cards block it. See the README's Villain Range Blockers.
 *
 * @param {string[]} cards - 5 or more cards: the board plus any hole cards
 * @param {string[]|null} holeCards - Hero's 2 hole cards (in `cards`), or null
 * @param {string|string[]} range - Villain's range, in any poker-rangeman notation
 * @param {Object} [options] - Options
 * @param {string|null} [options.street=null] - 'flop', 'turn' or 'river'; inferred from the card count when null
 * @returns {{boardBlocks: Object, heroBlocks: Object, allBlocks: Object}} Each `{ unblocked, blocked }`
 * @throws {Error} If cards, holeCards, range or street is invalid
 * @example
 * classifyRange(['Kh', '9h', '4h', '2c', 'Ah', 'Js'], ['Ah', 'Js'], 'AQs,AA').heroBlocks.blocked.isFlush; // ['AhQh']
 */
function classifyRange(cards, holeCards, range, options = {}) {
  const { street } = readOptions({ street: options.street });
  validateCards(cards);
  if (holeCards !== null && holeCards !== undefined) validateHoleCards(holeCards, cards);
  return classifyCombos(parseRange(range), [...cards], holeCards || null, street, evaluateCards);
}

class HandEvaluator {
  /**
   * Evaluates a hand. The result is on `evaluation`.
   *
   * Takes either an options object or the positional arguments:
   * `new HandEvaluator(cards, { strict, holeCards, villainRange, street })` or
   * `new HandEvaluator(cards, strict, holeCards, villainRange)`.
   *
   * @param {string[]} cards - 5 or more cards in "Rs" format: rank A, K, Q, J, T, 9-2 and suit s, h, d, c
   * @param {boolean|Object} [strict=true] - Only the strongest made hand (and the hand's draws) when
   *   true; every 5-card combination when false. Or an options object with any of strict,
   *   holeCards, villainRange and street.
   * @param {string[]|null} [holeCards=null] - The player's 2 hole cards, both present in `cards`
   * @param {string|string[]|null} [villainRange=null] - Villain's range in any poker-rangeman notation;
   *   adds `villainRange` to every evaluation
   * @throws {Error} If cards, holeCards, villainRange or street is invalid
   * @example
   * const evaluator = new HandEvaluator(['Ks', 'Qh', '8d', '3c', 'Ad', 'Jh'], { holeCards: ['Ad', 'Jh'] });
   * const [hand, evaluation] = Object.entries(evaluator.evaluation)[0];
   * // hand: 'Ad, Ks, Qh, Jh, 8d'; evaluation.isOvercardAndMiddleCard: true
   */
  constructor(cards, strict = true, holeCards = null, villainRange = null) {
    const options = readOptions(strict, holeCards, villainRange);
    Object.assign(this, evaluateValidated(cards, options));
  }
}

/**
 * Validates and evaluates a hand for HandEvaluator and evaluate().
 *
 * @param {string[]} cards - The cards
 * @param {Object} options - From readOptions
 * @returns {{cards: string[], strict: boolean, street: string|null, holeCards: string[]|null, evaluation: Object}}
 */
function evaluateValidated(cards, options, flat = false) {
  validateCards(cards);
  if (options.holeCards !== null) validateHoleCards(options.holeCards, cards);
  const copy = [...cards];
  const holeCards = options.holeCards;
  const villainCombos = options.villainRange === null ? null : parseRange(options.villainRange);
  const evaluation = evaluateCards(copy, options.strict, holeCards, options.street, flat);
  if (villainCombos) {
    // Classified once, the first time any evaluation's villainRange is read; each gets its own copy
    let classification = null;
    const classify = () => classification || (classification = classifyCombos(villainCombos, copy, holeCards, options.street, evaluateCards));
    for (const each of Object.values(evaluation)) defineLazy(each, 'villainRange', () => structuredClone(classify()));
  }
  return { cards: copy, strict: options.strict, street: options.street, holeCards, evaluation };
}

/**
 * Evaluates poker hands from 5 or more cards and identifies all possible made hands and draws.
 *
 * Takes either an options object or the positional arguments:
 * `evaluateHand(cards, { strict, holeCards, villainRange, street })` or
 * `evaluateHand(cards, strict, holeCards, villainRange)`.
 *
 * @param {string[]} cards - 5 or more cards in "Rs" format: rank A, K, Q, J, T, 9-2 and suit s, h, d, c
 * @param {boolean|Object} [strict=true] - Strict mode, or an options object
 * @param {string[]|null} [holeCards=null] - The player's 2 hole cards, both present in `cards`
 * @param {string|string[]|null} [villainRange=null] - Villain's range; adds `villainRange` to every evaluation
 * @returns {Object} Evaluations keyed by 5-card hand (e.g. 'As, Ks, Qs, Js, Ts')
 * @throws {Error} If cards, holeCards, villainRange or street is invalid
 * @example
 * const result = evaluateHand(['4h', '9h', '7h', '8s', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] });
 * const evaluation = Object.values(result)[0];
 * // evaluation.isFlushDraw: true, evaluation.isComboDraw: true
 */
function evaluateHand(cards, strict = true, holeCards = null, villainRange = null) {
  return new HandEvaluator(cards, strict, holeCards, villainRange).evaluation;
}

/**
 * Evaluates a hand in strict mode and returns one flat object: the best five cards, the made hand
 * category, a comparable rank, and every flag, keyCards, kickerCards and usesHoleCards.
 *
 * @param {string[]} cards - 5 or more cards
 * @param {Object} [options] - Options
 * @param {string[]|null} [options.holeCards=null] - The player's 2 hole cards, both present in `cards`
 * @param {string|string[]|null} [options.villainRange=null] - Villain's range; adds `villainRange`
 * @param {string|null} [options.street=null] - 'flop', 'turn' or 'river'; inferred from the card count when null
 * @returns {Object} `{ hand, category, strength, rank, street, ...flags, keyCards, kickerCards, usesHoleCards }`
 * @throws {Error} If cards or an option is invalid
 * @example
 * const result = evaluate(['Kd', '8c', '3h', 'As', 'Kh'], { holeCards: ['As', 'Kh'] });
 * // result.category: 'isPair', result.isTopPair: true, result.hand: ['As', 'Kd', 'Kh', '8c', '3h']
 */
function evaluate(cards, options = {}) {
  const read = readOptions({ ...options, strict: true });
  // The evaluation is built with evaluate()'s leading properties in place; fill them in
  const result = evaluateValidated(cards, read, true).evaluation;
  const handKey = Object.keys(result)[0];
  const flat = result[handKey];
  const hand = handKey.split(', ');
  const category = MADE_HANDS.find(h => flat[h]);
  flat.hand = hand;
  flat.category = category;
  flat.strength = HAND_STRENGTH[category];
  defineLazy(flat, 'rank', () => rankFive(hand));
  flat.street = read.street || streetFor(cards.length);
  return flat;
}

/**
 * Analyses a hand: graded outs and hand strength, plus, against a villain range, equity, equity now,
 * draw equity, the spread of equity over the next card, and runner-runner equity.
 * See the README's Hand analysis section for every field.
 *
 * @param {string[]} cards - The board (3 to 5 cards) plus hero's 2 hole cards
 * @param {Object} options - Options
 * @param {string[]} options.holeCards - Hero's 2 hole cards, both present in `cards` (required)
 * @param {string|string[]|null} [options.villainRange=null] - Villain's range; the equity measures need it
 * @param {number} [options.strongThreshold=0.8] - Share of villain's possible hands an out must beat to be strong
 * @returns {Object} The analysis
 * @throws {Error} If cards, holeCards, villainRange or strongThreshold is invalid
 * @example
 * const a = analyzeHand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'], villainRange: 'KK,QQ' });
 * // a.outs.nuts: the nine hearts; a.equity: about 0.45; a.equityNow: 0
 */
function analyzeHand(cards, options = {}) {
  const { holeCards = null, villainRange = null, strongThreshold = 0.8 } = options;
  validateCards(cards);
  if (holeCards === null || holeCards === undefined) throw new Error('analyzeHand needs holeCards');
  validateHoleCards(holeCards, cards);
  if (cards.length > 7) throw new Error(`Expected at most 7 cards (a board of 3 to 5 plus 2 hole cards), received ${cards.length}`);
  if (typeof strongThreshold !== 'number' || !(strongThreshold > 0 && strongThreshold <= 1)) {
    throw new Error(`strongThreshold must be a number above 0 and at most 1, received ${strongThreshold}`);
  }
  const view = hand(cards, { holeCards });
  const matchup = villainRange === null || villainRange === undefined ? null : view.vs(villainRange);
  const prepared = view._prepared();
  // Outs and the equity group are worked out only when read; the equity fields share one pass
  const analysis = { street: prepared.current.street, category: prepared.current.category, handStrength: prepared.currentStrength.share };
  defineLazy(analysis, 'outs', () => (matchup || view).outs({ strongThreshold }));
  for (const field of ['equity', 'equityNow', 'drawEquity', 'nextCard', 'runnerRunnerEquity']) {
    if (matchup) defineLazy(analysis, field, () => matchup._field(field));
    else analysis[field] = null;
  }
  analysis.villainCombos = matchup ? matchup.liveCombos() : null;
  return analysis;
}

/**
 * The chainable, lazy entry point: each method works out only what it returns, the first time it
 * is called, and remembers it. See the README's "Fast, lazy analysis" section.
 *
 * @param {string[]} cards - 5 or more cards: the board plus any hole cards
 * @param {Object} [options] - Options
 * @param {string[]|null} [options.holeCards=null] - Hero's 2 hole cards, both present in `cards`
 * @param {string|null} [options.street=null] - 'flop', 'turn' or 'river'; inferred from the card count when null
 * @returns {HandView} The hand
 * @throws {Error} If cards, holeCards or street is invalid
 * @example
 * const h = hand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] });
 * h.is('isFlushDraw');           // true
 * h.vs('KK,QQ').equity();        // 0.451
 */
function hand(cards, options = {}) {
  const { holeCards, street } = readOptions({ holeCards: options.holeCards, street: options.street });
  validateCards(cards);
  if (holeCards !== null) validateHoleCards(holeCards, cards);
  return new HandView(cards, { holeCards, street }, { evaluate, parseRange, classifyCombos, evaluateCards });
}

module.exports = { evaluateHand, evaluate, analyzeHand, hand, HandEvaluator, classifyRange, parseRange, compareHands, equity };
module.exports.default = evaluateHand;
