/**
 * Card validation, with the error messages callers see.
 *
 * Cards are two-character strings: a rank (A, K, Q, J, T, 9-2) followed by a suit (s, h, d, c),
 * e.g. 'As', 'Td'.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

/** Ranks from highest to lowest. */
const RANKS = 'AKQJT98765432';

/** Suits in the order used when listing combos. */
const SUITS = 'shdc';

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
  validateCardList(cards);
}

/** True for a well-formed card such as 'Ah' or 'Td'. */
function isCard(card) {
  return typeof card === 'string' && card.length === 2 && RANKS.includes(card[0]) && SUITS.includes(card[1]);
}

/**
 * Validates every card in a list of any length: each a string with a valid rank and suit, and
 * no card twice.
 *
 * @param {string[]} cards - Cards to validate
 * @param {string} [label='Card'] - What to call a card in error messages
 * @throws {Error} If a card is not a string, is malformed, has an invalid rank or suit, or repeats
 */
function validateCardList(cards, label = 'Card') {
  const seen = new Set();
  cards.forEach((card, i) => {
    if (typeof card !== 'string') {
      throw new Error(`${label} at index ${i} must be a string`);
    }
    if (card.length < 2) {
      throw new Error(`${label} at index ${i} has invalid format: "${card}"`);
    }
    if (seen.has(card)) {
      throw new Error(`Duplicate card found: "${card}"`);
    }
    seen.add(card);
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    if (rank.length !== 1 || !RANKS.includes(rank)) {
      throw new Error(`${label} at index ${i} has invalid rank: "${rank}"`);
    }
    if (!SUITS.includes(suit)) {
      throw new Error(`${label} at index ${i} has invalid suit: "${suit}"`);
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
  isCard,
  validateCards,
  validateCardList,
  validateHoleCards
};
