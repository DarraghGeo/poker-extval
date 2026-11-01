/**
 * Card helpers: parsing, ranking, sorting and validation.
 *
 * Cards are two-character strings: a rank (A, K, Q, J, T, 9-2) followed by a suit (s, h, d, c),
 * e.g. 'As', 'Td'. Every helper here is pure; none of them reorders its input.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

/** Ranks from highest to lowest. */
const RANKS = 'AKQJT98765432';

/** Suits in the order used when listing combos. */
const SUITS = 'shdc';

/** Rank values with the Ace high: A = 13 ... 2 = 1. */
const RANK_VALUES = Object.freeze({ A: 13, K: 12, Q: 11, J: 10, T: 9, 9: 8, 8: 7, 7: 6, 6: 5, 5: 4, 4: 3, 3: 2, 2: 1 });

/** Rank values with the Ace low, for wheel straights (A-2-3-4-5): A = 1, 2 = 2 ... K = 13. */
const WHEEL_VALUES = Object.freeze({ A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13 });

const rankOf = card => card[0];
const suitOf = card => card[1];

/** @returns {number} The card's rank value with the Ace high (13) */
const value = card => RANK_VALUES[card[0]];

/** @returns {number} The card's rank value with the Ace low (1) */
const wheelValue = card => WHEEL_VALUES[card[0]];

/**
 * Returns a copy of the cards sorted from highest to lowest. The sort is stable, so cards of
 * equal rank keep their input order.
 *
 * @param {string[]} cards - Cards to sort
 * @param {Function} [rankValue=value] - Rank value function (`value` or `wheelValue`)
 * @returns {string[]} A new sorted array
 */
function sortDesc(cards, rankValue = value) {
  return [...cards].sort((a, b) => rankValue(b) - rankValue(a));
}

/**
 * Generates every combination of `size` cards, in input order.
 *
 * @param {string[]} cards - Cards to choose from
 * @param {number} size - Cards per combination
 * @returns {string[][]} The combinations
 */
function combinations(cards, size) {
  const result = [];
  const current = [];
  const choose = start => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= cards.length - (size - current.length); i++) {
      current.push(cards[i]);
      choose(i + 1);
      current.pop();
    }
  };
  choose(0);
  return result;
}

/**
 * Formats five cards as the key used in evaluation results: sorted high to low and joined
 * with ', ' (e.g. 'As, Ks, Qs, Js, Ts').
 *
 * @param {string[]} cards - The cards
 * @returns {string} The key
 */
function formatHandKey(cards) {
  return sortDesc(cards).join(', ');
}

/**
 * Validates the cards array for type, length, format and uniqueness.
 *
 * @param {string[]} cards - Cards to validate
 * @throws {Error} If cards is not an array, has fewer than 5 cards, or contains a non-string,
 *   malformed, invalid-rank, invalid-suit or duplicate card
 */
function validateCards(cards) {
  if (!Array.isArray(cards)) {
    throw new Error('Cards must be an array');
  }
  if (cards.length < 5) {
    throw new Error(`Expected at least 5 cards, received ${cards.length}`);
  }
  const seen = new Set();
  cards.forEach((card, i) => {
    if (typeof card !== 'string') {
      throw new Error(`Card at index ${i} must be a string`);
    }
    if (card.length < 2) {
      throw new Error(`Card at index ${i} has invalid format: "${card}"`);
    }
    if (seen.has(card)) {
      throw new Error(`Duplicate card found: "${card}"`);
    }
    seen.add(card);
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    if (rank.length !== 1 || !RANKS.includes(rank)) {
      throw new Error(`Card at index ${i} has invalid rank: "${rank}"`);
    }
    if (!SUITS.includes(suit)) {
      throw new Error(`Card at index ${i} has invalid suit: "${suit}"`);
    }
  });
}

/**
 * Validates the hole cards: exactly 2 distinct strings, both present in the full hand.
 *
 * @param {string[]} holeCards - Hole cards to validate
 * @param {string[]} fullHand - All cards passed in
 * @throws {Error} If holeCards is not an array of exactly 2 distinct cards drawn from fullHand
 */
function validateHoleCards(holeCards, fullHand) {
  if (!Array.isArray(holeCards)) {
    throw new Error('Hole cards must be an array');
  }
  if (holeCards.length !== 2) {
    throw new Error(`Expected exactly 2 hole cards, received ${holeCards.length}`);
  }
  const fullHandSet = new Set(fullHand);
  const seen = new Set();
  holeCards.forEach((card, i) => {
    if (typeof card !== 'string') {
      throw new Error(`Hole card at index ${i} must be a string`);
    }
    if (seen.has(card)) {
      throw new Error(`Duplicate hole card found: "${card}"`);
    }
    seen.add(card);
    if (!fullHandSet.has(card)) {
      throw new Error(`Hole card not found in cards: "${card}"`);
    }
  });
}

module.exports = {
  RANKS,
  SUITS,
  RANK_VALUES,
  WHEEL_VALUES,
  rankOf,
  suitOf,
  value,
  wheelValue,
  sortDesc,
  combinations,
  formatHandKey,
  validateCards,
  validateHoleCards
};
