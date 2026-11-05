/**
 * The core API: a board, worked out once, then any number of hole card combos classified on it.
 * Results are flag bits (see src/core/bits.js), the same flags evaluateHand gives in strict mode
 * with the combo as hole cards.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { cardOf, CARD_NAMES, RANK_CODE, SUIT_CODE } = require('./tables');
const { FLAGS, hasFlag, flagsObject, CATEGORY_BY_STRENGTH } = require('./bits');
const { Hand, setHand, classifyStrict, scoreOf, STREET_NAMES } = require('./classify');
const { ALL_FLAGS } = require('../flags');

const FLAG_NAMES = ALL_FLAGS;

/** A flag index from a name or an index. */
function flagIndex(flag) {
  if (typeof flag === 'number' && flag >= 0 && flag < FLAG_NAMES.length && Number.isInteger(flag)) return flag;
  const i = FLAGS[flag];
  if (i === undefined) throw new Error(`Unknown flag "${flag}"`);
  return i;
}

/** A card number from a string ('Ah') or a number (0-51), or -1. */
function toCard(card) {
  if (typeof card === 'number') return Number.isInteger(card) && card >= 0 && card < 52 ? card : -1;
  return cardOf(card);
}

/** One classified combo. */
class Classification {
  constructor(lo, hi, strength, score, five) {
    /** Flags, low word (flags 0-31 of ALL_FLAGS). */
    this.lo = lo;
    /** Flags, high word (flags 32-36). */
    this.hi = hi;
    /** Made hand strength: 10 royal flush ... 1 high card. */
    this.strength = strength;
    /** poker-bitvaljs score of the best five: higher wins, equal ties. */
    this.score = score;
    /** The best five cards, high to low. */
    this.five = five;
  }

  /** The made hand, e.g. 'isFlush'. */
  get category() {
    return CATEGORY_BY_STRENGTH[this.strength];
  }

  /**
   * Whether a flag is set.
   *
   * @param {string|number} flag - A flag name ('isFlushDraw') or index (FLAGS.isFlushDraw)
   * @returns {boolean}
   */
  is(flag) {
    return hasFlag(this.lo, this.hi, flagIndex(flag));
  }

  /** Every flag as an object, in evaluateHand's order. */
  flags() {
    return flagsObject(this.lo, this.hi);
  }
}

class Board {
  /**
   * @param {string[]|number[]} cards - 3 to 5 board cards
   * @param {Object} [options]
   * @param {string|null} [options.street=null] - 'flop', 'turn' or 'river'; by default from the
   *   card count (3 flop, 4 turn, 5 river)
   */
  constructor(cards, options = {}) {
    if (!Array.isArray(cards)) throw new Error('Board must be an array');
    if (cards.length < 3 || cards.length > 5) throw new Error(`Board must be 3 to 5 cards, received ${cards.length}`);
    const street = options.street === undefined ? null : options.street;
    if (street !== null && !STREET_NAMES.includes(street)) {
      throw new Error(`Street must be 'flop', 'turn' or 'river', received "${street}"`);
    }
    const board = [];
    this._used = new Uint8Array(52);
    cards.forEach((card, i) => {
      const c = toCard(card);
      if (c < 0) throw new Error(`Board card at index ${i} is not a card: ${JSON.stringify(card)}`);
      if (this._used[c]) throw new Error(`Duplicate card found: "${CARD_NAMES[c]}"`);
      this._used[c] = 1;
      board.push(c);
    });
    /** The board cards, as numbers. */
    this.cards = board;
    this.street = street;
    this._streetCode = street === null ? -1 : STREET_NAMES.indexOf(street);
    this._hand = [...board, 0, 0];
    this._x = new Hand();
  }

  /** Classifies the hand in this._hand (board plus two cards); leaves the result in this._x. */
  _run(c0, c1) {
    const hand = this._hand;
    const n = this.cards.length;
    hand[n] = c0;
    hand[n + 1] = c1;
    return classifyStrict(setHand(this._x, hand, c0, c1, this._streetCode));
  }

  /**
   * Classifies hole cards on the board: the flags evaluateHand gives in strict mode.
   *
   * @param {string|string[]|number[]} hole - 'AhJs', ['Ah', 'Js'] or two card numbers
   * @returns {Classification}
   * @throws {Error} If the hole cards are not two distinct cards off the board
   */
  classify(hole) {
    let c0;
    let c1;
    if (typeof hole === 'string' && hole.length === 4) {
      c0 = cardOf(hole.slice(0, 2));
      c1 = cardOf(hole.slice(2));
    } else if (Array.isArray(hole) && hole.length === 2) {
      c0 = toCard(hole[0]);
      c1 = toCard(hole[1]);
    } else {
      throw new Error('Hole cards must be two cards, such as "AhJs" or ["Ah", "Js"]');
    }
    if (c0 < 0 || c1 < 0) throw new Error(`Invalid hole cards: ${JSON.stringify(hole)}`);
    if (c0 === c1 || this._used[c0] || this._used[c1]) throw new Error(`Hole cards clash with the board or each other: ${JSON.stringify(hole)}`);
    const x = this._run(c0, c1);
    const order = [x.p0, x.p1, x.p2, x.p3, x.p4].map(p => x.cards[p]).sort((a, b) => (b >> 2) - (a >> 2));
    return new Classification(x.lo, x.hi, x.strength, scoreOf(x), order.map(c => CARD_NAMES[c]));
  }

  /**
   * Classifies many combos at once into typed arrays, allocating nothing per combo. Combos that
   * share a card with the board (or repeat a card) are marked blocked and left at zero.
   *
   * @param {string[]|number[]} combos - Combos as 'AhKd' strings, or card numbers in pairs
   *   (an array or Int8Array / Uint8Array of length 2 * count)
   * @returns {{count: number, lo: Int32Array, hi: Int32Array, strength: Uint8Array, score: Int32Array, blocked: Uint8Array}}
   */
  classifyAll(combos) {
    const numeric = combos.length > 0 && typeof combos[0] === 'number';
    const count = numeric ? combos.length >> 1 : combos.length;
    const lo = new Int32Array(count);
    const hi = new Int32Array(count);
    const strength = new Uint8Array(count);
    const score = new Int32Array(count);
    const blocked = new Uint8Array(count);
    const used = this._used;
    for (let i = 0; i < count; i++) {
      let c0;
      let c1;
      if (numeric) {
        c0 = combos[2 * i];
        c1 = combos[2 * i + 1];
      } else {
        const combo = combos[i];
        c0 = RANK_CODE[combo.charCodeAt(0) & 127] * 4 + SUIT_CODE[combo.charCodeAt(1) & 127];
        c1 = RANK_CODE[combo.charCodeAt(2) & 127] * 4 + SUIT_CODE[combo.charCodeAt(3) & 127];
        if (combo.length !== 4 || RANK_CODE[combo.charCodeAt(0) & 127] < 0 || SUIT_CODE[combo.charCodeAt(1) & 127] < 0 ||
            RANK_CODE[combo.charCodeAt(2) & 127] < 0 || SUIT_CODE[combo.charCodeAt(3) & 127] < 0) {
          throw new Error(`Invalid combo at index ${i}: "${combo}"`);
        }
      }
      if (!(c0 >= 0 && c0 < 52 && c1 >= 0 && c1 < 52)) throw new Error(`Invalid combo at index ${i}`);
      if (c0 === c1 || used[c0] || used[c1]) {
        blocked[i] = 1;
        continue;
      }
      const x = this._run(c0, c1);
      lo[i] = x.lo;
      hi[i] = x.hi;
      strength[i] = x.strength;
      score[i] = scoreOf(x);
    }
    return { count, lo, hi, strength, score, blocked };
  }
}

/**
 * A board to classify hole cards on. See Board.
 *
 * @param {string[]|number[]} cards - 3 to 5 board cards
 * @param {{street?: string|null}} [options]
 * @returns {Board}
 * @example
 * const b = board(['Kh', '9h', '4c', '2d']);
 * b.classify('AhJh').is('isFlushDraw'); // true
 */
function board(cards, options) {
  return new Board(cards, options);
}

/** The card number (0-51) of a card string, or -1. */
function cardIndex(card) {
  return cardOf(card);
}

/** The card string of a card number. */
function cardString(card) {
  if (!(Number.isInteger(card) && card >= 0 && card < 52)) throw new Error(`Not a card number: ${card}`);
  return CARD_NAMES[card];
}

module.exports = { board, Board, Classification, cardIndex, cardString, flagIndex };
