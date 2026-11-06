/**
 * Whether a straight draw's out is real: the straight it makes with a hole card must beat the one
 * the board makes on its own with the same card. On 7-9-6-8, a 5 gives 4-2 a 4-8 straight, but the
 * board alone then reads 5-9, so the 5 is no out. Used for straight draws (one card to add) and
 * backdoor straight draws (two), by the classifier and the key cards alike.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { WINDOWS, STRAIGHT_WINDOW } = require('./tables');

/**
 * @param {number} m - Rank mask of the hand (board plus hole cards)
 * @param {number} board - Rank mask of the board
 * @param {number} added - The out's rank bits (one, or two for a backdoor)
 * @returns {boolean} True if, with `added`, some straight using a rank the board lacks beats the
 *   board's best straight with `added` (no straight counts as lower than any)
 */
function beatsBoard(m, board, added) {
  const hand = m | added;
  const mine = m & ~board;
  for (let w = 9; w > STRAIGHT_WINDOW[board | added]; w--) {
    const window = WINDOWS[w];
    if ((hand & window) === window && (window & mine) !== 0) return true;
  }
  return false;
}

module.exports = { beatsBoard };
