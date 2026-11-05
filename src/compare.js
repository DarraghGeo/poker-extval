/**
 * Hand comparison and equity, using poker-bitvaljs.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { isCard, validateCardList } = require('./cards');
const { parseRange } = require('./range');
const { scoreCards, compareScores } = require('./score');
const { scorer } = require('./core/classify');


/**
 * Compares two hands on a board. Each hand plus the board must make 5 to 7 cards.
 *
 * @param {string[]} handA - First player's cards (e.g. hole cards ['Ah', 'Kd'])
 * @param {string[]} handB - Second player's cards
 * @param {string[]} [board=[]] - Shared board cards
 * @returns {number} 1 if handA wins, -1 if handB wins, 0 for a tie
 * @throws {Error} If a card is invalid, a card appears twice, or a hand plus board is not 5-7 cards
 * @example
 * compareHands(['Ah', 'Kd'], ['Qs', 'Qc'], ['Ks', '7h', '2d']); // 1: kings beat queens
 */
function compareHands(handA, handB, board = []) {
  for (const [name, cards] of [['handA', handA], ['handB', handB], ['board', board]]) {
    if (!Array.isArray(cards)) throw new Error(`${name} must be an array`);
  }
  validateCardList([...handA, ...handB, ...board]);
  for (const [name, hand] of [['handA', handA], ['handB', handB]]) {
    const total = hand.length + board.length;
    if (total < 5 || total > 7) throw new Error(`${name} plus the board must be 5 to 7 cards, received ${total}`);
  }
  return compareScores(scoreCards([...handA, ...board]), scoreCards([...handB, ...board]));
}

/** A hand given as two cards (['Ah', 'Kd']) becomes one exact combo; anything else is range notation. */
function toCombos(hand) {
  if (Array.isArray(hand) && hand.length === 2 && hand.every(isCard)) return parseRange([hand.join('')]);
  return parseRange(hand);
}

/**
 * Hero's equity against villain, by running out the board. Exact on the flop and turn (every
 * runout); Monte Carlo preflop. Combos that clash with the board or dead cards are skipped.
 *
 * @param {string|string[]} hero - Hero's hand or range: a combo ('AhKd'), two cards (['Ah', 'Kd']),
 *   or range notation ('AKs,QQ+' or ['AKs', 'QQ+'])
 * @param {string|string[]} villain - Villain's hand or range, in the same forms
 * @param {string[]} [board=[]] - 0, 3, 4 or 5 board cards
 * @param {Object} [options] - Options
 * @param {string[]} [options.deadCards=[]] - Cards known to be out of play
 * @param {number} [options.iterations=10000] - Monte Carlo samples per matchup (preflop only)
 * @returns {Promise<{win: number, tie: number, lose: number, equity: number|null}>} Runout counts
 *   from hero's side, and equity = (win + tie / 2) / total, or null if no matchup was possible
 * @throws {Error} If the board, dead cards or a range is invalid
 * @example
 * const result = await equity(['Ah', 'Js'], 'KK', ['4h', '9h', '7h']);
 * // result.equity: about 0.45 (2676 wins, 3264 losses over 5,940 runouts)
 */
async function equity(hero, villain, board = [], options = {}) {
  const { deadCards = [], iterations = 10000 } = options;
  if (!Array.isArray(board)) throw new Error('board must be an array');
  if (!Array.isArray(deadCards)) throw new Error('deadCards must be an array');
  validateCardList([...board, ...deadCards]);
  if (![0, 3, 4, 5].includes(board.length)) {
    throw new Error(`Board must be 0, 3, 4 or 5 cards, received ${board.length}`);
  }
  const result = await scorer().compareRange(toCombos(hero), toCombos(villain), board, deadCards, 5, iterations, true, null, 100, false);
  const total = result.win + result.tie + result.lose;
  return { win: result.win, tie: result.tie, lose: result.lose, equity: total ? (result.win + result.tie / 2) / total : null };
}

module.exports = { compareHands, equity };
