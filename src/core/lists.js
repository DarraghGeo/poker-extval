/**
 * Key cards and kicker cards: the cards behind each true flag, and the rest. Worked out only when
 * an evaluation's keyCards or kickerCards is read, following 5.2.0's rules exactly:
 *
 * - cards run high to low, equal ranks in input order (the wheel's Ace last where noted);
 * - a straight draw takes one card per rank, a hole card where the hand has two of that rank;
 * - kicker cards come from the five, or from the full hand for hole card categories and for the
 *   whole hand's draws (strict, 6+ cards).
 *
 * Cards are handled as positions in the hand (indices into x.cards) and named at the end.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { ALL_FLAGS, DRAWS, HOLE_CARD_CATEGORIES } = require('../flags');
const { DRAW_WINDOWS, BACKDOOR_WINDOWS, WINDOWS, HIGH, WHEEL } = require('./tables');
const { FLAGS, hasFlag } = require('./bits');
const { beatsBoard } = require('./straights');

const DRAW_SET = new Set(DRAWS);
const HOLE_SET = new Set(HOLE_CARD_CATEGORIES);

/** Stable sort of positions, high rank first (Ace low with `wheel`). */
function sortPositions(x, list, wheel = false) {
  const cards = x.cards;
  const key = p => {
    const r = cards[p] >> 2;
    return wheel && r === 12 ? -1 : r;
  };
  const out = list.slice();
  for (let i = 1; i < out.length; i++) {
    const p = out[i];
    const k = key(p);
    let j = i - 1;
    while (j >= 0 && key(out[j]) < k) {
      out[j + 1] = out[j];
      j--;
    }
    out[j + 1] = p;
  }
  return out;
}

const rankAt = (x, p) => x.cards[p] >> 2;
const suitAt = (x, p) => x.cards[p] & 3;
const isHole = (x, p) => x.cards[p] === x.hole0 || x.cards[p] === x.hole1;

/** Rank mask of some positions. */
function maskOf(x, list) {
  let m = 0;
  for (const p of list) m |= 1 << rankAt(x, p);
  return m;
}

/** Per-rank counts of some positions. */
function countsOf(x, list) {
  const counts = new Uint8Array(13);
  for (const p of list) counts[rankAt(x, p)]++;
  return counts;
}

/** The highest rank appearing exactly n times, or -1. */
function rankWithCount(counts, n) {
  for (let r = 12; r >= 0; r--) if (counts[r] === n) return r;
  return -1;
}

/**
 * The cards behind a straight draw of the cards `std` (sorted): for each out the highest straight
 * it completes, then one card per rank those straights use (a hole card where there are two of a
 * rank), high to low, the Ace last when every straight is the wheel.
 */
function straightDrawCards(x, std, wheelOnly) {
  const mask = maskOf(x, std);
  const byOut = new Map();
  for (let w = 0; w < 10; w++) {
    if (!((DRAW_WINDOWS[mask] >> w) & 1)) continue;
    const present = mask & WINDOWS[w];
    if (x.hasHole && ((present & ~x.boardMask) === 0 || !beatsBoard(mask, x.boardMask, WINDOWS[w] & ~present))) continue;
    if (wheelOnly && w !== 0) continue;
    byOut.set(HIGH[WINDOWS[w] & ~present], w);
  }
  let ranks = 0;
  let allWheel = byOut.size > 0;
  for (const w of byOut.values()) {
    ranks |= mask & WINDOWS[w];
    if (w !== 0) allWheel = false;
  }
  const chosen = new Int8Array(13).fill(-1);
  for (const p of std) {
    const r = rankAt(x, p);
    if (!((ranks >> r) & 1)) continue;
    if (chosen[r] < 0 || (!isHole(x, chosen[r]) && isHole(x, p))) chosen[r] = p;
  }
  const out = [];
  for (let r = 12; r >= 0; r--) if (chosen[r] >= 0) out.push(chosen[r]);
  if (allWheel && chosen[12] >= 0) out.push(out.shift());
  return out;
}

/** One card per rank of a rank mask from `std` (a hole card where there are two), high to low. */
function oneCardPerRank(x, std, ranks, aceLow) {
  const chosen = new Int8Array(13).fill(-1);
  for (const p of std) {
    const r = rankAt(x, p);
    if (!((ranks >> r) & 1)) continue;
    if (chosen[r] < 0 || (!isHole(x, chosen[r]) && isHole(x, p))) chosen[r] = p;
  }
  const out = [];
  for (let r = 12; r >= 0; r--) if (chosen[r] >= 0) out.push(chosen[r]);
  if (aceLow && chosen[12] >= 0) out.push(out.shift());
  return out;
}

/**
 * The cards behind a backdoor straight draw of the cards `std`: the three ranks of the highest
 * straight it can make with two more cards (by the hole card rule), one card each, high to low
 * (the Ace last for the wheel).
 */
function backdoorStraightCards(x, std) {
  const mask = maskOf(x, std);
  for (let w = 9; w >= 0; w--) {
    if (!((BACKDOOR_WINDOWS[mask] >> w) & 1)) continue;
    const present = mask & WINDOWS[w];
    if (x.hasHole && ((present & ~x.boardMask) === 0 || !beatsBoard(mask, x.boardMask, WINDOWS[w] & ~mask))) continue;
    return oneCardPerRank(x, std, present, w === 0);
  }
  return [];
}

/** Positions of `std` of one suit. */
const ofSuit = (x, std, suit) => std.filter(p => suitAt(x, p) === suit);
/** Positions of `std` of one rank. */
const ofRank = (x, std, rank) => std.filter(p => rankAt(x, p) === rank);

/** The suit with exactly n cards among the positions, the first to appear on a tie, or -1. */
function suitWithCount(x, list, n, needsHole) {
  const counts = [0, 0, 0, 0];
  const holes = [false, false, false, false];
  for (const p of list) {
    counts[suitAt(x, p)]++;
    if (isHole(x, p)) holes[suitAt(x, p)] = true;
  }
  const seen = [];
  for (const p of list) {
    const s = suitAt(x, p);
    if (seen.includes(s)) continue;
    seen.push(s);
    if (counts[s] === n && (!needsHole || !x.hasHole || holes[s])) return s;
  }
  return -1;
}

/** The union of two position lists, first-seen order, sorted high to low. */
function union(x, a, b) {
  const out = [...a];
  for (const p of b) if (!out.includes(p)) out.push(p);
  return sortPositions(x, out);
}

/**
 * keyCards and kickerCards of one evaluation.
 *
 * @param {Object} x - The hand (a Hand from src/core/classify.js, not reused afterwards)
 * @param {string[]} names - The card strings, by position
 * @param {number[]|null} holeOrder - Positions of the hole cards in the order they were given
 * @param {number[]} five - Positions of the five, ascending
 * @param {number} lo - Flags, low word
 * @param {number} hi - Flags, high word
 * @param {boolean} whole - The draws are the whole hand's
 * @returns {{keyCards: Object, kickerCards: Object}}
 */
function cardLists(x, names, holeOrder, five, lo, hi, whole) {
  const std = sortPositions(x, five);
  const counts = countsOf(x, std);
  const all = [];
  for (let p = 0; p < x.n; p++) all.push(p);
  const fullStd = whole ? sortPositions(x, all) : null;

  const pair = () => ofRank(x, std, rankWithCount(counts, 2));
  const trips = () => ofRank(x, std, rankWithCount(counts, 3));
  const twoPair = () => std.filter(p => counts[rankAt(x, p)] === 2);
  const straight = () => (maskOf(x, std) === WHEEL ? [...std.slice(1), std[0]] : std);
  let drawCache = null;
  const fiveDraws = () => {
    if (drawCache) return drawCache;
    const flush = () => ofSuit(x, std, suitWithCount(x, five, 4, false));
    const backdoor = () => ofSuit(x, std, suitWithCount(x, five, 3, false));
    const straightDraw = () => straightDrawCards(x, std, false);
    const backdoorStraight = () => backdoorStraightCards(x, std);
    return (drawCache = {
      isFlushDraw: flush,
      isBackdoorFlushDraw: backdoor,
      isNutFlushDraw: flush,
      isNutBackdoorFlushDraw: backdoor,
      isOpenEndedStraightDraw: straightDraw,
      isInsideStraightDraw: straightDraw,
      isDoubleGutshot: straightDraw,
      isStraightDraw: straightDraw,
      isBackdoorStraightDraw: backdoorStraight,
      isOpenEndedStraightDrawWheel: () => straightDrawCards(x, std, true),
      isInsideStraightDrawWheel: () => straightDrawCards(x, std, true),
      isComboDraw: () => union(x, flush(), straightDraw()),
      isBackdoorComboDraw: () => union(x, backdoor(), backdoorStraight())
    });
  };
  let wholeCache = null;
  const wholeDraws = () => {
    if (wholeCache) return wholeCache;
    const flagOn = flag => hasFlag(lo, hi, FLAGS[flag]);
    const sd = flagOn('isStraightDraw') ? straightDrawCards(x, fullStd, false) : [];
    const wheel = flagOn('isOpenEndedStraightDrawWheel') || flagOn('isInsideStraightDrawWheel') ? straightDrawCards(x, fullStd, true) : [];
    const flush = flagOn('isFlushDraw') ? ofSuit(x, fullStd, suitWithCount(x, all, 4, true)) : [];
    const backdoor = flagOn('isBackdoorFlushDraw') ? ofSuit(x, fullStd, suitWithCount(x, all, 3, true)) : [];
    const backdoorStraight = flagOn('isBackdoorStraightDraw') ? backdoorStraightCards(x, fullStd) : [];
    return (wholeCache = {
      isFlushDraw: flush,
      isBackdoorFlushDraw: backdoor,
      isNutFlushDraw: flagOn('isNutFlushDraw') ? flush : [],
      isNutBackdoorFlushDraw: flagOn('isNutBackdoorFlushDraw') ? backdoor : [],
      isOpenEndedStraightDraw: flagOn('isOpenEndedStraightDraw') ? sd : [],
      isInsideStraightDraw: flagOn('isInsideStraightDraw') ? sd : [],
      isDoubleGutshot: flagOn('isDoubleGutshot') ? sd : [],
      isStraightDraw: sd,
      isBackdoorStraightDraw: backdoorStraight,
      isOpenEndedStraightDrawWheel: flagOn('isOpenEndedStraightDrawWheel') ? wheel : [],
      isInsideStraightDrawWheel: flagOn('isInsideStraightDrawWheel') ? wheel : [],
      isComboDraw: flagOn('isComboDraw') ? union(x, flush, sd) : [],
      isBackdoorComboDraw: flagOn('isBackdoorComboDraw') ? union(x, backdoor, backdoorStraight) : []
    });
  };

  const keyFor = flag => {
    switch (flag) {
      case 'isRoyalFlush': case 'isStraightFlush': case 'isFullHouse': case 'isFlush': return std;
      case 'isFourOfAKind': return ofRank(x, std, rankWithCount(counts, 4));
      case 'isStraight': case 'isStraightWheel': return straight();
      case 'isThreeOfAKind': case 'isTopThreeOfAKind': case 'isMiddleThreeOfAKind': case 'isBottomThreeOfAKind': return trips();
      case 'isTwoPair': case 'isTopAndMiddlePair': case 'isTopAndBottomPair': case 'isMiddleAndBottomPair': return twoPair();
      case 'isPair': case 'isOverPair': case 'isTopPair': case 'isMiddlePair': case 'isBottomPair': case 'isUnderPair': return pair();
      case 'isOvercard': return sortPositions(x, holeOrder.filter(p => {
        const r = rankAt(x, p);
        return !((x.boardMask >> r) & 1) && r > x.boardHigh;
      }));
      case 'isHighCard': return [];
      default:
        if (HOLE_SET.has(flag)) return sortPositions(x, holeOrder);
        return whole ? wholeDraws()[flag] : fiveDraws()[flag]();
    }
  };

  const name = list => list.map(p => names[p]);
  const keyCards = {};
  const kickerCards = {};
  for (let i = 0; i < ALL_FLAGS.length; i++) {
    const flag = ALL_FLAGS[i];
    if (!hasFlag(lo, hi, i)) {
      keyCards[flag] = [];
      kickerCards[flag] = [];
      continue;
    }
    const keys = keyFor(flag);
    keyCards[flag] = name(keys);
    if (flag === 'isHighCard') {
      kickerCards[flag] = name(std);
    } else if (keys.length === 0) {
      kickerCards[flag] = [];
    } else if (HOLE_SET.has(flag) || (whole && DRAW_SET.has(flag))) {
      kickerCards[flag] = name(all.filter(p => !keys.includes(p)).sort((a, b) => rankAt(x, b) - rankAt(x, a)));
    } else {
      kickerCards[flag] = name(std.filter(p => !keys.includes(p)));
    }
  }
  return { keyCards, kickerCards };
}

/**
 * Whether the made hand uses a hole card: one of its key cards (every card of the five for high
 * card and five-card hands) is a hole card.
 *
 * @returns {boolean|null} null without hole cards
 */
function usesHoleCards(x, p0, p1, p2, p3, p4, strength) {
  if (!x.hasHole) return null;
  const cards = x.cards;
  const five = [cards[p0], cards[p1], cards[p2], cards[p3], cards[p4]];
  let keyRanks = 0x1fff;
  if (strength === 8 || strength === 4 || strength === 3 || strength === 2) {
    const counts = new Uint8Array(13);
    for (const c of five) counts[c >> 2]++;
    const n = strength === 8 ? 4 : strength === 4 ? 3 : 2;
    keyRanks = 0;
    if (strength === 3) {
      for (let r = 0; r < 13; r++) if (counts[r] === 2) keyRanks |= 1 << r;
    } else {
      for (let r = 12; r >= 0; r--) if (counts[r] === n) { keyRanks = 1 << r; break; }
    }
  }
  for (const c of five) {
    if ((c === x.hole0 || c === x.hole1) && ((keyRanks >> (c >> 2)) & 1)) return true;
  }
  return false;
}

module.exports = { cardLists, usesHoleCards, sortPositions };
