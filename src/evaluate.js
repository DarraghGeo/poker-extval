/**
 * The 5.x evaluation objects, built from the core classifier: evaluateHand's results keyed by
 * five-card hand, and evaluate()'s flat result. Flags are set straight away; keyCards,
 * kickerCards and usesHoleCards are lazy, worked out the first time one is read.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { validateCards, validateHoleCards } = require('./cards');
const { defineLazyGroup, keyedObject } = require('./lazy');
const { cardOf, CARD_NAMES } = require('./core/tables');
const { flagsObject, flatObject, CATEGORY_BY_STRENGTH } = require('./core/bits');
const { Hand, setHand, classifyStrict, classifyLoose, STREET_NAMES } = require('./core/classify');
const { cardLists, usesHoleCards } = require('./core/lists');

const STREET_CODES = { flop: 0, turn: 1, river: 2 };

/**
 * Validates cards and converts them to card numbers. Errors are 5.2.0's, word for word: on any
 * problem the original validator runs to report it.
 *
 * @param {string[]} cards - 5 or more cards
 * @returns {number[]} The cards (0-51), in input order
 * @throws {Error} If the cards are invalid
 */
function toCards(cards) {
  if (!Array.isArray(cards) || cards.length < 5) validateCards(cards);
  const n = cards.length;
  const out = new Array(n);
  let seenLo = 0;
  let seenHi = 0;
  for (let i = 0; i < n; i++) {
    const c = cardOf(cards[i]);
    if (c < 0) return invalid(cards);
    if (c < 32) {
      if (seenLo & (1 << c)) return invalid(cards);
      seenLo |= 1 << c;
    } else {
      if (seenHi & (1 << (c - 32))) return invalid(cards);
      seenHi |= 1 << (c - 32);
    }
    out[i] = c;
  }
  return out;
}

function invalid(cards) {
  validateCards(cards);
  throw new Error('Invalid cards');
}

/**
 * Validates hole cards against the hand, returning their positions in the order given.
 *
 * @param {string[]} holeCards - The hole cards
 * @param {string[]} cards - The full hand (already validated)
 * @returns {number[]} Positions in `cards`
 * @throws {Error} 5.2.0's errors for invalid hole cards
 */
function holePositions(holeCards, cards) {
  if (Array.isArray(holeCards) && holeCards.length === 2) {
    const a = holeCards[0];
    const b = holeCards[1];
    if (typeof a === 'string' && typeof b === 'string' && a !== b) {
      const pa = cards.indexOf(a);
      const pb = cards.indexOf(b);
      if (pa >= 0 && pb >= 0) return [pa, pb];
    }
  }
  validateHoleCards(holeCards, cards);
  throw new Error('Invalid hole cards');
}

/**
 * A hand ready to classify: validated, as card numbers, with its hole cards and street.
 *
 * @param {string[]} names - The cards (validated by toCards)
 * @param {number[]} cards - From toCards
 * @param {number[]|null} holeOrder - From holePositions, or null
 * @param {string|null} street - 'flop', 'turn', 'river' or null
 * @returns {Hand}
 */
function makeHand(cards, holeOrder, street) {
  const x = new Hand();
  const hole0 = holeOrder ? cards[holeOrder[0]] : -1;
  const hole1 = holeOrder ? cards[holeOrder[1]] : -1;
  return setHand(x, cards, hole0, hole1, street ? STREET_CODES[street] : -1);
}

const LIST_KEYS = ['keyCards', 'kickerCards'];

/**
 * Adds keyCards and kickerCards (lazy: worked out together, the first time either is read) and
 * usesHoleCards (cheap, so set straight away) to an evaluation.
 */
function addLists(evaluation, x, names, holeOrder, five, lo, hi, whole, strength) {
  let lists = null;
  defineLazyGroup(evaluation, LIST_KEYS, key => {
    if (!lists) lists = cardLists(x, names, holeOrder, five, lo, hi, whole);
    return lists[key];
  });
  evaluation.usesHoleCards = usesHoleCards(x, five[0], five[1], five[2], five[3], five[4], strength);
  return evaluation;
}

/**
 * The five's cards, high to low with equal ranks in input order.
 *
 * @param {Hand} x - The hand
 * @param {string[]} names - Card strings by position
 * @param {number} p0 - Positions of the five, ascending
 * @returns {string[]} The cards
 */
function fiveNames(x, names, p0, p1, p2, p3, p4) {
  const cards = x.cards;
  // Rank high, then position low: one key per card, sorted high to low
  const k = [
    ((cards[p0] >> 2) << 6) | (63 - p0), ((cards[p1] >> 2) << 6) | (63 - p1), ((cards[p2] >> 2) << 6) | (63 - p2),
    ((cards[p3] >> 2) << 6) | (63 - p3), ((cards[p4] >> 2) << 6) | (63 - p4)
  ];
  for (let i = 1; i < 5; i++) {
    const v = k[i];
    let j = i - 1;
    while (j >= 0 && k[j] < v) {
      k[j + 1] = k[j];
      j--;
    }
    k[j + 1] = v;
  }
  return [names[63 - (k[0] & 63)], names[63 - (k[1] & 63)], names[63 - (k[2] & 63)], names[63 - (k[3] & 63)], names[63 - (k[4] & 63)]];
}

/** '<card>, <card>, ...' for five cards sorted high to low. */
function handKey(sorted) {
  return sorted[0] + ', ' + sorted[1] + ', ' + sorted[2] + ', ' + sorted[3] + ', ' + sorted[4];
}

/**
 * Evaluates a validated hand: 5.2.0's evaluateHand result, keyed by five-card hand.
 *
 * @param {string[]} names - The cards (a copy the result may keep)
 * @param {number[]} cards - From toCards
 * @param {boolean} strict - Strict mode
 * @param {number[]|null} holeOrder - Hole card positions, or null
 * @param {string|null} street - The street, or null to infer it
 * @returns {Object<string, Object>} Evaluations keyed by five-card hand
 */
function evaluateCards(names, cards, strict, holeOrder, street) {
  const x = makeHand(cards, holeOrder, street);
  const result = keyedObject();
  if (strict) {
    classifyStrict(x);
    const five = [x.p0, x.p1, x.p2, x.p3, x.p4];
    const evaluation = addLists(flagsObject(x.lo, x.hi), x, names, holeOrder, five, x.lo, x.hi, x.whole, x.strength);
    result[handKey(fiveNames(x, names, x.p0, x.p1, x.p2, x.p3, x.p4))] = evaluation;
    return result;
  }
  const all = classifyLoose(x);
  for (let i = 0; i < all.count; i++) {
    const j = i * 5;
    const five = [all.five[j], all.five[j + 1], all.five[j + 2], all.five[j + 3], all.five[j + 4]];
    const lo = all.lo[i];
    const hi = all.hi[i];
    result[handKey(fiveNames(x, names, five[0], five[1], five[2], five[3], five[4]))] = addLists(flagsObject(lo, hi), x, names, holeOrder, five, lo, hi, false, all.strength[i]);
  }
  return result;
}

/**
 * evaluate()'s flat result for a validated hand (strict).
 *
 * @returns {Object} The result
 */
function evaluateFlat(names, cards, holeOrder, street) {
  const x = makeHand(cards, holeOrder, street);
  classifyStrict(x);
  const five = [x.p0, x.p1, x.p2, x.p3, x.p4];
  const hand = fiveNames(x, names, x.p0, x.p1, x.p2, x.p3, x.p4);
  const flat = flatObject(hand, CATEGORY_BY_STRENGTH[x.strength], x.strength, rankOf(x, five, x.strength), street || STREET_NAMES[x.street], x.lo, x.hi);
  return addLists(flat, x, names, holeOrder, five, x.lo, x.hi, x.whole, x.strength);
}

/**
 * A comparable rank for the best five: [strength, ...tiebreak ranks], 5.2.0's rankFive. Ranks
 * are grouped by how often they appear, then high to low; a straight is its top card, the
 * wheel's 5 (rank value 4).
 *
 * @param {Hand} x - The hand
 * @param {number[]} five - Positions of the five
 * @param {number} strength - Its strength
 * @returns {number[]} The rank
 */
function rankOf(x, five, strength) {
  const counts = new Uint8Array(13);
  let mask = 0;
  for (const p of five) {
    const r = x.cards[p] >> 2;
    counts[r]++;
    mask |= 1 << r;
  }
  if (strength === 5 || strength === 9 || strength === 10) {
    // Rank values run A = 13 ... 2 = 1; the wheel counts its 5
    return [strength, mask === 0x100f ? 4 : 32 - Math.clz32(mask)];
  }
  const out = [strength];
  for (let n = 4; n >= 1; n--) {
    for (let r = 12; r >= 0; r--) {
      if (counts[r] === n) for (let k = 0; k < n; k++) out.push(r + 1);
    }
  }
  return out;
}

module.exports = { toCards, holePositions, makeHand, evaluateCards, evaluateFlat, rankOf, CARD_NAMES };
