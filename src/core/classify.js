/**
 * The classifier: made hands, board-relative labels, draws and hole card categories as flag bits,
 * worked out with bit operations on suit lanes.
 *
 * A Hand holds one full hand (the board plus any hole cards) as cards 0-51 in input order, and
 * everything about it that every five-card combination shares. classifyStrict and classifyLoose
 * then give 5.2.0's results exactly: the same best five (the first strongest, in combination
 * order), the same flags, and, through src/core/cards.js, the same key and kicker cards.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const BitVal = require('poker-bitvaljs');
const { POP, HIGH, LOW, STRAIGHT5, WINDOWS, DRAW_WINDOWS, STRAIGHT_WINDOW, WHEEL, ROYAL } = require('./tables');
const B = require('./bits');

let bitval = null;
/** poker-bitvaljs, created on first use. */
function scorer() {
  if (!bitval) bitval = new BitVal();
  return bitval;
}

/** Streets. */
const FLOP = 0;
const TURN = 1;
const RIVER = 2;
const STREET_NAMES = ['flop', 'turn', 'river'];

/** Board positions of a rank (see position). */
const NONE = 0;
const TOP = 1;
const MIDDLE = 2;
const BOTTOM = 3;
const OVER = 4;
const UNDER = 5;

/** The street implied by a card count: 5 is the flop, 6 the turn, 7 or more the river. */
function streetFor(count) {
  return count <= 5 ? FLOP : count === 6 ? TURN : RIVER;
}

class Hand {
  constructor() {
    /** Cards in input order. */
    this.cards = [];
    this.n = 0;
    /** Hole cards (-1 without). */
    this.hole0 = -1;
    this.hole1 = -1;
    this.hasHole = false;
    this.street = FLOP;
    // Full hand lanes and rank mask
    this.fl0 = 0; this.fl1 = 0; this.fl2 = 0; this.fl3 = 0;
    this.fullMask = 0;
    // Hole card lanes and ranks
    this.hl0 = 0; this.hl1 = 0; this.hl2 = 0; this.hl3 = 0;
    this.holeRanks = 0;
    // The board: every card that is not a hole card
    this.boardMask = 0;
    this.boardHigh = -1;
    this.boardLow = -1;
    /** Hole card category bits, the same for every five. */
    this.holeLo = 0;
    this.holeHi = 0;
    // The result of the last classification
    this.lo = 0;
    this.hi = 0;
    this.strength = 0;
    this.score = 0;
    /** The best five's own flags (strict, before whole-hand draws replace its draws). */
    this.fiveLo = 0;
    /** True when the draws are the whole hand's (strict, 6+ cards). */
    this.whole = false;
    // Positions of the best five, ascending
    this.p0 = 0; this.p1 = 1; this.p2 = 2; this.p3 = 3; this.p4 = 4;
  }
}

/**
 * Sets up a hand. `cards` is kept, not copied.
 *
 * @param {Hand} x - The hand to fill in
 * @param {number[]} cards - Distinct cards, input order
 * @param {number} hole0 - First hole card, or -1
 * @param {number} hole1 - Second hole card, or -1
 * @param {number} street - FLOP, TURN, RIVER, or -1 to infer it from the card count
 * @returns {Hand} x
 */
function setHand(x, cards, hole0, hole1, street) {
  const n = cards.length;
  x.cards = cards;
  x.n = n;
  x.street = street < 0 ? streetFor(n) : street;
  let f0 = 0, f1 = 0, f2 = 0, f3 = 0;
  for (let p = 0; p < n; p++) {
    const c = cards[p];
    const bit = 1 << (c >> 2);
    switch (c & 3) {
      case 0: f0 |= bit; break;
      case 1: f1 |= bit; break;
      case 2: f2 |= bit; break;
      default: f3 |= bit;
    }
  }
  x.fl0 = f0; x.fl1 = f1; x.fl2 = f2; x.fl3 = f3;
  x.fullMask = f0 | f1 | f2 | f3;
  return setHole(x, hole0, hole1);
}

/**
 * Sets the hole cards of a hand already set up, keeping its cards.
 *
 * @param {Hand} x - The hand
 * @param {number} hole0 - First hole card, or -1
 * @param {number} hole1 - Second hole card, or -1
 * @returns {Hand} x
 */
function setHole(x, hole0, hole1) {
  x.hole0 = hole0;
  x.hole1 = hole1;
  const hasHole = hole0 >= 0;
  x.hasHole = hasHole;
  let h0 = 0, h1 = 0, h2 = 0, h3 = 0;
  if (hasHole) {
    for (const c of [hole0, hole1]) {
      const bit = 1 << (c >> 2);
      switch (c & 3) {
        case 0: h0 |= bit; break;
        case 1: h1 |= bit; break;
        case 2: h2 |= bit; break;
        default: h3 |= bit;
      }
    }
  }
  x.hl0 = h0; x.hl1 = h1; x.hl2 = h2; x.hl3 = h3;
  x.holeRanks = h0 | h1 | h2 | h3;
  // The board's rank mask: the full hand less the hole cards (a rank both have stays when the
  // board also holds it)
  let board = 0;
  const cards = x.cards;
  for (let p = 0; p < x.n; p++) {
    const c = cards[p];
    if (c !== hole0 && c !== hole1) board |= 1 << (c >> 2);
  }
  x.boardMask = board;
  x.boardHigh = HIGH[board];
  x.boardLow = LOW[board];
  let lo = 0, hi = 0;
  if (hasHole) {
    let over = 0, middle = 0, under = 0;
    for (const c of [hole0, hole1]) {
      const r = c >> 2;
      if ((board >> r) & 1) continue;
      if (r > x.boardHigh) over++;
      else if (r < x.boardLow) under++;
      else middle++;
    }
    if (over > 0) lo |= B.OVERCARD;
    if (over === 2) lo |= B.TWO_OVERCARDS;
    if (over === 1 && middle === 1) lo |= B.OVER_AND_MIDDLE;
    if (over === 1 && under === 1) hi |= B.OVER_AND_UNDER;
    if (middle === 2) hi |= B.TWO_MIDDLE;
    if (middle === 1 && under === 1) hi |= B.MIDDLE_AND_UNDER;
    if (under === 2) hi |= B.TWO_UNDER;
  }
  x.holeLo = lo;
  x.holeHi = hi;
  return x;
}

/**
 * Where a paired or tripled rank sits against the whole board: TOP, MIDDLE or BOTTOM among the
 * board's ranks, OVER or UNDER every board card (a pocket pair), or NONE when no hole card has it.
 * Only called with hole cards.
 */
function position(x, r) {
  if (!((x.holeRanks >> r) & 1)) return NONE;
  if ((x.boardMask >> r) & 1) return r === x.boardHigh ? TOP : r === x.boardLow ? BOTTOM : MIDDLE;
  return r > x.boardHigh ? OVER : r < x.boardLow ? UNDER : MIDDLE;
}

/**
 * Straight draw bits for a rank mask, by outs: two or more out ranks is open-ended, one inside.
 * With hole cards a completion only counts when its four ranks include one the board lacks.
 */
function straightDrawBits(x, m) {
  let windows = DRAW_WINDOWS[m];
  if (!windows) return 0;
  let outs = 0;
  let wheel = false;
  const hasHole = x.hasHole;
  const board = x.boardMask;
  for (; windows; windows &= windows - 1) {
    const w = 31 - Math.clz32(windows & -windows);
    const present = m & WINDOWS[w];
    if (hasHole && (present & ~board) === 0) continue;
    outs |= WINDOWS[w] & ~present;
    if (w === 0) wheel = true;
  }
  if (!outs) return 0;
  if (POP[outs] >= 2) return B.STRAIGHT_DRAW | B.OPEN_ENDED | (wheel ? B.OPEN_ENDED_WHEEL : 0);
  return B.STRAIGHT_DRAW | B.INSIDE | (wheel ? B.INSIDE_WHEEL : 0);
}

/** The high word and strength of the last classifyFive call. */
let lastHi = 0;
let lastStrength = 0;

/**
 * Flags of five cards (given as their four suit lanes) in the hand `x`. Returns the low word;
 * the high word and strength are left in lastHi and lastStrength.
 *
 * @param {Hand} x - The hand
 * @param {number} s - Spades lane of the five
 * @param {number} h - Hearts lane
 * @param {number} d - Diamonds lane
 * @param {number} c - Clubs lane
 * @param {boolean} strict - Strict mode: only the strongest made hand and its labels
 * @returns {number} The low word
 */
function classifyFive(x, s, h, d, c, strict) {
  const m = s | h | d | c;
  const distinct = POP[m];
  const hasHole = x.hasHole;
  let lo = 0;
  let strength;
  let pairRank = -1;
  let flush = false;
  let straight = false;
  if (distinct === 5) {
    flush = s === m || h === m || d === m || c === m;
    straight = STRAIGHT5[m] === 1;
    if (straight) lo |= m === WHEEL ? B.STRAIGHT | B.STRAIGHT_WHEEL : B.STRAIGHT;
    if (flush) lo |= B.FLUSH;
    if (flush && straight) {
      if (m === ROYAL) { lo |= B.ROYAL_FLUSH; strength = 10; } else { lo |= B.STRAIGHT_FLUSH; strength = 9; }
    } else {
      strength = flush ? 6 : straight ? 5 : 1;
    }
  } else if (distinct === 4) {
    lo |= B.PAIR;
    strength = 2;
    pairRank = HIGH[(s & h) | (s & d) | (s & c) | (h & d) | (h & c) | (d & c)];
    if (hasHole) {
      switch (position(x, pairRank)) {
        case OVER: lo |= B.OVER_PAIR; break;
        case TOP: lo |= B.TOP_PAIR; break;
        case MIDDLE: lo |= B.MIDDLE_PAIR; break;
        case BOTTOM: lo |= B.BOTTOM_PAIR; break;
        default:
      }
    } else {
      lo |= pairRank === HIGH[m] ? B.TOP_PAIR : pairRank === LOW[m] ? B.BOTTOM_PAIR : B.MIDDLE_PAIR;
    }
  } else if (distinct === 3) {
    const trips = (s & h & d) | (s & h & c) | (s & d & c) | (h & d & c);
    if (trips) {
      lo |= B.THREE_OF_A_KIND;
      strength = 4;
      const t = HIGH[trips];
      if (hasHole) {
        const p = position(x, t);
        if (p === TOP) lo |= B.TOP_TRIPS;
        else if (p === MIDDLE) lo |= B.MIDDLE_TRIPS;
        else if (p === BOTTOM) lo |= B.BOTTOM_TRIPS;
      } else {
        lo |= t === HIGH[m] ? B.TOP_TRIPS : t === LOW[m] ? B.BOTTOM_TRIPS : B.MIDDLE_TRIPS;
      }
    } else {
      lo |= B.TWO_PAIR;
      strength = 3;
      const pairs = (s & h) | (s & d) | (s & c) | (h & d) | (h & c) | (d & c);
      if (hasHole) {
        const a = position(x, HIGH[pairs]);
        const b = position(x, LOW[pairs]);
        if (a === TOP && b === MIDDLE) lo |= B.TOP_AND_MIDDLE;
        else if (a === TOP && b === BOTTOM) lo |= B.TOP_AND_BOTTOM;
        else if (a === MIDDLE && b === BOTTOM) lo |= B.MIDDLE_AND_BOTTOM;
      } else {
        const kicker = HIGH[m & ~pairs];
        lo |= kicker === LOW[m] ? B.TOP_AND_MIDDLE : kicker === HIGH[m] ? B.MIDDLE_AND_BOTTOM : B.TOP_AND_BOTTOM;
      }
    }
  } else if (s & h & d & c) {
    lo |= B.FOUR_OF_A_KIND;
    strength = 8;
  } else {
    lo |= B.FULL_HOUSE;
    strength = 7;
  }

  // Flush draws must use a hole card when hole cards are supplied
  if (!flush) {
    if ((POP[s] === 4 && (!hasHole || (s & x.hl0))) || (POP[h] === 4 && (!hasHole || (h & x.hl1))) ||
        (POP[d] === 4 && (!hasHole || (d & x.hl2))) || (POP[c] === 4 && (!hasHole || (c & x.hl3)))) {
      lo |= B.FLUSH_DRAW;
    } else if ((POP[s] === 3 && (!hasHole || (s & x.hl0))) || (POP[h] === 3 && (!hasHole || (h & x.hl1))) ||
        (POP[d] === 3 && (!hasHole || (d & x.hl2))) || (POP[c] === 3 && (!hasHole || (c & x.hl3)))) {
      lo |= B.BACKDOOR;
    }
  }
  if (!straight) lo |= straightDrawBits(x, m);
  if ((lo & B.FLUSH_DRAW) && (lo & B.STRAIGHT_DRAW)) lo |= B.COMBO_DRAW;
  if (x.street === RIVER) lo &= ~B.DRAW_BITS;
  else if (x.street === TURN) lo &= ~B.BACKDOOR;

  if (pairRank >= 0) {
    if (hasHole) {
      if (position(x, pairRank) === UNDER) lo |= B.UNDER_PAIR;
    } else if (x.n >= 6 && pairRank < LOW[x.fullMask & ~(1 << pairRank)]) {
      lo |= B.UNDER_PAIR;
    }
  }

  lo |= x.holeLo;
  let hi = x.holeHi;
  if (strength === 1) hi |= B.HIGH_CARD;

  if (strict) {
    lo = (lo & ~B.MADE_BITS) | B.STRENGTH_BIT[strength];
    if (strength !== 2) lo &= ~B.PAIR_LABEL_BITS;
    if (strength !== 3) lo &= ~B.TWO_PAIR_LABEL_BITS;
    if (strength !== 4) lo &= ~B.TRIPS_LABEL_BITS;
    if (strength >= 6) lo &= ~B.STRAIGHT_DRAW_BITS;
  }
  lastHi = hi;
  lastStrength = strength;
  return lo;
}

/**
 * The draws of the whole hand (6+ cards, strict): four of a suit with a hole card, ranks one card
 * from a straight, dropped once the made hand beats them, with the street rules.
 */
function wholeHandDraws(x, strength) {
  let lo = 0;
  if (strength < 6) {
    const hasHole = x.hasHole;
    const { fl0, fl1, fl2, fl3 } = x;
    if ((POP[fl0] === 4 && (!hasHole || (fl0 & x.hl0))) || (POP[fl1] === 4 && (!hasHole || (fl1 & x.hl1))) ||
        (POP[fl2] === 4 && (!hasHole || (fl2 & x.hl2))) || (POP[fl3] === 4 && (!hasHole || (fl3 & x.hl3)))) {
      lo |= B.FLUSH_DRAW;
    } else if ((POP[fl0] === 3 && (!hasHole || (fl0 & x.hl0))) || (POP[fl1] === 3 && (!hasHole || (fl1 & x.hl1))) ||
        (POP[fl2] === 3 && (!hasHole || (fl2 & x.hl2))) || (POP[fl3] === 3 && (!hasHole || (fl3 & x.hl3)))) {
      lo |= B.BACKDOOR;
    }
  }
  if (strength < 5) lo |= straightDrawBits(x, x.fullMask);
  if ((lo & B.FLUSH_DRAW) && (lo & B.STRAIGHT_DRAW)) lo |= B.COMBO_DRAW;
  if (x.street === RIVER) lo = 0;
  else if (x.street === TURN) lo &= ~B.BACKDOOR;
  return lo;
}

// Per-position suit lanes of the hand being searched (one bit in one lane per card)
const L0 = new Int32Array(52);
const L1 = new Int32Array(52);
const L2 = new Int32Array(52);
const L3 = new Int32Array(52);

function fillLanes(x) {
  const cards = x.cards;
  for (let p = 0; p < x.n; p++) {
    const c = cards[p];
    const bit = 1 << (c >> 2);
    const suit = c & 3;
    L0[p] = suit === 0 ? bit : 0;
    L1[p] = suit === 1 ? bit : 0;
    L2[p] = suit === 2 ? bit : 0;
    L3[p] = suit === 3 ? bit : 0;
  }
}

/**
 * Finds the strongest five, the first one on a tie in combination order (a < b < c < d < e),
 * and stores its positions in x.p0 ... x.p4. Returns its score.
 */
function bestFive(x) {
  const n = x.n;
  const bv = scorer();
  fillLanes(x);
  // The whole hand's score is the best five's, so the search can stop at the first five reaching it
  const target = n <= 7 ? bv.evaluateSuits(x.fl0, x.fl1, x.fl2, x.fl3) : -1;
  let best = -1;
  let ba = 0, bb = 1, bc = 2, bd = 3, be = 4;
  search:
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      const s2 = L0[a] | L0[b], h2 = L1[a] | L1[b], d2 = L2[a] | L2[b], c2 = L3[a] | L3[b];
      for (let c = b + 1; c < n - 2; c++) {
        const s3 = s2 | L0[c], h3 = h2 | L1[c], d3 = d2 | L2[c], c3 = c2 | L3[c];
        for (let d = c + 1; d < n - 1; d++) {
          const s4 = s3 | L0[d], h4 = h3 | L1[d], d4 = d3 | L2[d], c4 = c3 | L3[d];
          for (let e = d + 1; e < n; e++) {
            const score = bv.evaluateSuits(s4 | L0[e], h4 | L1[e], d4 | L2[e], c4 | L3[e]);
            if (score > best) {
              best = score;
              ba = a; bb = b; bc = c; bd = d; be = e;
              if (score === target) break search;
            }
          }
        }
      }
    }
  }
  x.p0 = ba; x.p1 = bb; x.p2 = bc; x.p3 = bd; x.p4 = be;
  return best;
}

/** Cards still needed of each rank, for pickRanks. */
const NEED = new Uint8Array(13);

/** Stores five positions found in order; returns false if fewer than five were found. */
function storeFive(x, found, count) {
  if (count < 5) return false;
  x.p0 = found[0]; x.p1 = found[1]; x.p2 = found[2]; x.p3 = found[3]; x.p4 = found[4];
  return true;
}

const FOUND = new Int32Array(5);

/**
 * The first five (in combination order) holding NEED's ranks: taking the earliest card of each
 * rank still needed gives the lexicographically smallest positions.
 */
function pickRanks(x) {
  const cards = x.cards;
  let k = 0;
  for (let p = 0; p < x.n && k < 5; p++) {
    const r = cards[p] >> 2;
    if (NEED[r]) {
      NEED[r]--;
      FOUND[k++] = p;
    }
  }
  NEED.fill(0);
  return storeFive(x, FOUND, k);
}

/** The five cards of one suit whose ranks are in `ranks`, in position order. */
function pickSuit(x, suit, ranks) {
  const cards = x.cards;
  let k = 0;
  for (let p = 0; p < x.n && k < 5; p++) {
    const c = cards[p];
    if ((c & 3) === suit && ((ranks >> (c >> 2)) & 1)) FOUND[k++] = p;
  }
  return storeFive(x, FOUND, k);
}

/** The top n ranks of a mask, as a mask. */
function topRanks(m, n) {
  let out = 0;
  for (let i = 0; i < n && m; i++) {
    const r = HIGH[m];
    out |= 1 << r;
    m &= ~(1 << r);
  }
  return out;
}

/** Marks one card needed of each rank in a mask. */
function needEach(m) {
  for (; m; m &= m - 1) NEED[31 - Math.clz32(m & -m)] = 1;
}

/**
 * The best five of up to seven cards, built from the hand's shape rather than searched for: the
 * ranks (or, for flushes, the cards) the best hand needs, then the earliest cards giving them,
 * which is the first strongest five in combination order. Stores x.p0 ... x.p4.
 *
 * @returns {boolean} False if the shape did not give five cards (the caller then searches)
 */
function bestFiveDirect(x) {
  const s = x.fl0, h = x.fl1, d = x.fl2, c = x.fl3;
  const all = s | h | d | c;
  const fs = POP[s] >= 5 ? 0 : POP[h] >= 5 ? 1 : POP[d] >= 5 ? 2 : POP[c] >= 5 ? 3 : -1;
  const lane = fs === 0 ? s : fs === 1 ? h : fs === 2 ? d : c;
  if (fs >= 0) {
    const w = STRAIGHT_WINDOW[lane];
    if (w >= 0) return pickSuit(x, fs, WINDOWS[w]);
  }
  const four = s & h & d & c;
  const three = (s & h & d) | (s & h & c) | (s & d & c) | (h & d & c);
  const two = (s & h) | (s & d) | (s & c) | (h & d) | (h & c) | (d & c);
  const trips = three & ~four;
  const pairs = two & ~three;
  if (four) {
    const q = HIGH[four];
    NEED[q] = 4;
    NEED[HIGH[all & ~(1 << q)]] = 1;
    return pickRanks(x);
  }
  if (trips) {
    const t = HIGH[trips];
    const rest = trips & ~(1 << t);
    const p = rest ? HIGH[rest] : pairs ? HIGH[pairs] : -1;
    if (p >= 0) {
      NEED[t] = 3;
      NEED[p] = 2;
      return pickRanks(x);
    }
  }
  if (fs >= 0) return pickSuit(x, fs, topRanks(lane, 5));
  const w = STRAIGHT_WINDOW[all];
  if (w >= 0) {
    needEach(WINDOWS[w]);
    return pickRanks(x);
  }
  if (trips) {
    const t = HIGH[trips];
    needEach(topRanks(all & ~(1 << t), 2));
    NEED[t] = 3;
    return pickRanks(x);
  }
  if (pairs & (pairs - 1)) {
    const p1 = HIGH[pairs];
    const p2 = HIGH[pairs & ~(1 << p1)];
    NEED[HIGH[all & ~(1 << p1) & ~(1 << p2)]] = 1;
    NEED[p1] = 2;
    NEED[p2] = 2;
    return pickRanks(x);
  }
  if (pairs) {
    const p = HIGH[pairs];
    needEach(topRanks(all & ~(1 << p), 3));
    NEED[p] = 2;
    return pickRanks(x);
  }
  needEach(topRanks(all, 5));
  return pickRanks(x);
}

/** Lanes of the five at x.p0 ... x.p4 (fillLanes must have run): writes FIVE_LANES. */
const FIVE_LANES = new Int32Array(4);
function fiveLanes(x) {
  const { p0, p1, p2, p3, p4 } = x;
  FIVE_LANES[0] = L0[p0] | L0[p1] | L0[p2] | L0[p3] | L0[p4];
  FIVE_LANES[1] = L1[p0] | L1[p1] | L1[p2] | L1[p3] | L1[p4];
  FIVE_LANES[2] = L2[p0] | L2[p1] | L2[p2] | L2[p3] | L2[p4];
  FIVE_LANES[3] = L3[p0] | L3[p1] | L3[p2] | L3[p3] | L3[p4];
}

/**
 * Strict classification: the best five and its flags, with the whole hand's draws on 6+ cards.
 * Fills in x.lo, x.hi, x.strength, x.score, x.fiveLo, x.whole and x.p0 ... x.p4.
 *
 * @param {Hand} x - The hand
 * @returns {Hand} x
 */
function classifyStrict(x) {
  if (x.n === 5) {
    x.p0 = 0; x.p1 = 1; x.p2 = 2; x.p3 = 3; x.p4 = 4;
    x.score = -1;
    const lo = classifyFive(x, x.fl0, x.fl1, x.fl2, x.fl3, true);
    x.lo = lo;
    x.fiveLo = lo;
    x.hi = lastHi;
    x.strength = lastStrength;
    x.whole = false;
    return x;
  }
  if (x.n <= 7 && bestFiveDirect(x)) {
    fillLanes(x);
    x.score = -1;
  } else {
    x.score = bestFive(x);
  }
  fiveLanes(x);
  const lo = classifyFive(x, FIVE_LANES[0], FIVE_LANES[1], FIVE_LANES[2], FIVE_LANES[3], true);
  x.fiveLo = lo;
  x.hi = lastHi;
  x.strength = lastStrength;
  x.lo = (lo & ~B.DRAW_BITS) | wholeHandDraws(x, lastStrength);
  x.whole = true;
  return x;
}

/**
 * The score of the hand's best five (the poker-bitvaljs value), worked out on demand.
 *
 * @param {Hand} x - The hand, after classifyStrict
 * @returns {number} The score
 */
function scoreOf(x) {
  if (x.score < 0) x.score = scorer().evaluateSuits(x.fl0, x.fl1, x.fl2, x.fl3);
  return x.score;
}

/**
 * Non-strict classification: every five, in combination order, with draws to a hand the full
 * hand has already made dropped from all of them.
 *
 * @param {Hand} x - The hand
 * @returns {{five: Int8Array, lo: Int32Array, hi: Int32Array, strength: Uint8Array, count: number}}
 *   Positions of each five (5 per five), and its flags and strength
 */
function classifyLoose(x) {
  const n = x.n;
  fillLanes(x);
  let count = 1;
  for (let k = 0; k < 5; k++) count = (count * (n - k)) / (k + 1);
  const five = new Int8Array(count * 5);
  const lo = new Int32Array(count);
  const hi = new Int32Array(count);
  const strength = new Uint8Array(count);
  let i = 0;
  let strongest = 0;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const w = classifyFive(x,
              L0[a] | L0[b] | L0[c] | L0[d] | L0[e], L1[a] | L1[b] | L1[c] | L1[d] | L1[e],
              L2[a] | L2[b] | L2[c] | L2[d] | L2[e], L3[a] | L3[b] | L3[c] | L3[d] | L3[e], false);
            const j = i * 5;
            five[j] = a; five[j + 1] = b; five[j + 2] = c; five[j + 3] = d; five[j + 4] = e;
            lo[i] = w;
            hi[i] = lastHi;
            strength[i] = lastStrength;
            if (lastStrength > strongest) strongest = lastStrength;
            i++;
          }
        }
      }
    }
  }
  // A draw to a hand already made is not a draw
  let drop = 0;
  if (strongest >= 5) drop |= B.STRAIGHT_DRAW_BITS;
  if (strongest >= 6) drop |= B.FLUSH_DRAW_BITS;
  for (let k = 0; k < count; k++) {
    let w = lo[k] & ~drop & ~B.COMBO_DRAW;
    if ((w & B.FLUSH_DRAW) && (w & B.STRAIGHT_DRAW)) w |= B.COMBO_DRAW;
    lo[k] = w;
  }
  return { five, lo, hi, strength, count };
}

module.exports = {
  Hand, setHand, setHole, classifyStrict, bestFive, bestFiveDirect, classifyLoose, classifyFive, scoreOf, scorer, streetFor,
  position, FLOP, TURN, RIVER, STREET_NAMES, NONE, TOP, MIDDLE, BOTTOM, OVER, UNDER
};
