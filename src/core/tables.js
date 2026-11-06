/**
 * Lookup tables over 13-bit rank masks, and the card encoding.
 *
 * A card is an integer 0-51: rank * 4 + suit, with rank 0 = deuce ... 12 = ace and suit
 * 0 = spades, 1 = hearts, 2 = diamonds, 3 = clubs. A rank mask has bit `rank` set for each rank
 * present; a card set is four such masks ("suit lanes"), in the suit order above, which is the
 * order poker-bitvaljs's evaluateSuits takes them in.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

/** Rank characters by rank (0 = '2' ... 12 = 'A'). */
const RANK_CHARS = '23456789TJQKA';
/** Suit characters by suit. */
const SUIT_CHARS = 'shdc';

/** Card strings by card (rank * 4 + suit). */
const CARD_NAMES = [];
for (let card = 0; card < 52; card++) CARD_NAMES.push(RANK_CHARS[card >> 2] + SUIT_CHARS[card & 3]);

/** Rank (0-12) by character code, -1 for anything else. */
const RANK_CODE = new Int8Array(128).fill(-1);
for (let r = 0; r < 13; r++) RANK_CODE[RANK_CHARS.charCodeAt(r)] = r;
/** Suit (0-3) by character code, -1 for anything else. */
const SUIT_CODE = new Int8Array(128).fill(-1);
for (let s = 0; s < 4; s++) SUIT_CODE[SUIT_CHARS.charCodeAt(s)] = s;

/**
 * The card for a string such as 'Ah', or -1 if it is not one.
 *
 * @param {*} name - The card string
 * @returns {number} The card (0-51) or -1
 */
function cardOf(name) {
  if (typeof name !== 'string' || name.length !== 2) return -1;
  const r = name.charCodeAt(0);
  const s = name.charCodeAt(1);
  if (r > 127 || s > 127) return -1;
  const rank = RANK_CODE[r];
  const suit = SUIT_CODE[s];
  return rank < 0 || suit < 0 ? -1 : rank * 4 + suit;
}

const SIZE = 8192;
/** Set bits in a rank mask. */
const POP = new Uint8Array(SIZE);
/** Highest set rank (-1 for 0). */
const HIGH = new Int8Array(SIZE);
/** Lowest set rank (-1 for 0). */
const LOW = new Int8Array(SIZE);
/** 1 when the mask is exactly five ranks in a row, or the wheel (A-2-3-4-5). */
const STRAIGHT5 = new Uint8Array(SIZE);
/**
 * The ten straights as rank masks, lowest first: window 0 is the wheel (A, 2, 3, 4, 5), window w
 * (1-9) is ranks w-1 to w+3.
 */
const WINDOWS = new Int32Array(10);
WINDOWS[0] = (1 << 12) | 0b1111;
for (let w = 1; w < 10; w++) WINDOWS[w] = 0b11111 << (w - 1);
/** Per rank mask, a bit per window holding exactly four of its five ranks (a straight draw). */
const DRAW_WINDOWS = new Uint16Array(SIZE);
/** Per rank mask, a bit per window holding exactly three of its five ranks (a backdoor straight draw). */
const BACKDOOR_WINDOWS = new Uint16Array(SIZE);
/** Per rank mask, the highest window it holds all five ranks of (its best straight), or -1. */
const STRAIGHT_WINDOW = new Int8Array(SIZE);

const WHEEL = WINDOWS[0];
const ROYAL = WINDOWS[9];

for (let m = 0; m < SIZE; m++) {
  let n = 0;
  for (let b = m; b; b &= b - 1) n++;
  POP[m] = n;
  HIGH[m] = m ? 31 - Math.clz32(m) : -1;
  LOW[m] = m ? 31 - Math.clz32(m & -m) : -1;
  let windows = 0;
  let backdoors = 0;
  STRAIGHT_WINDOW[m] = -1;
  for (let w = 0; w < 10; w++) {
    if ((m & WINDOWS[w]) === WINDOWS[w]) STRAIGHT_WINDOW[m] = w;
    let k = 0;
    for (let b = m & WINDOWS[w]; b; b &= b - 1) k++;
    if (k === 4) windows |= 1 << w;
    if (k === 3) backdoors |= 1 << w;
    if (k === 5 && n === 5) STRAIGHT5[m] = 1;
  }
  DRAW_WINDOWS[m] = windows;
  BACKDOOR_WINDOWS[m] = backdoors;
}

module.exports = {
  RANK_CHARS, SUIT_CHARS, CARD_NAMES, RANK_CODE, SUIT_CODE, cardOf,
  POP, HIGH, LOW, STRAIGHT5, WINDOWS, DRAW_WINDOWS, BACKDOOR_WINDOWS, STRAIGHT_WINDOW, WHEEL, ROYAL
};
