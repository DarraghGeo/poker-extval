/**
 * Flags as bits in two words: `lo` holds the made hands, position labels, hole card categories,
 * isStraightWheel and isHighCard; `hi` holds every draw. FLAGS gives each flag's index in
 * ALL_FLAGS (the order of an evaluation's properties); hasFlag(lo, hi, index) reads one.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { ALL_FLAGS, MADE_HANDS, DRAWS } = require('../flags');

/** Flag index by name, in ALL_FLAGS order. */
const FLAGS = Object.freeze(Object.fromEntries(ALL_FLAGS.map((flag, i) => [flag, i])));

// Low word: made hands, labels, hole card categories
const ROYAL_FLUSH = 1 << 0; // isRoyalFlush
const STRAIGHT_FLUSH = 1 << 1; // isStraightFlush
const FOUR_OF_A_KIND = 1 << 2; // isFourOfAKind
const FULL_HOUSE = 1 << 3; // isFullHouse
const FLUSH = 1 << 4; // isFlush
const STRAIGHT = 1 << 5; // isStraight
const THREE_OF_A_KIND = 1 << 6; // isThreeOfAKind
const TWO_PAIR = 1 << 7; // isTwoPair
const PAIR = 1 << 8; // isPair
const OVER_PAIR = 1 << 9; // isOverPair
const TOP_PAIR = 1 << 10; // isTopPair
const MIDDLE_PAIR = 1 << 11; // isMiddlePair
const BOTTOM_PAIR = 1 << 12; // isBottomPair
const TOP_AND_MIDDLE = 1 << 13; // isTopAndMiddlePair
const TOP_AND_BOTTOM = 1 << 14; // isTopAndBottomPair
const MIDDLE_AND_BOTTOM = 1 << 15; // isMiddleAndBottomPair
const TOP_TRIPS = 1 << 16; // isTopThreeOfAKind
const MIDDLE_TRIPS = 1 << 17; // isMiddleThreeOfAKind
const BOTTOM_TRIPS = 1 << 18; // isBottomThreeOfAKind
const STRAIGHT_WHEEL = 1 << 19; // isStraightWheel
const UNDER_PAIR = 1 << 20; // isUnderPair
const OVERCARD = 1 << 21; // isOvercard
const TWO_OVERCARDS = 1 << 22; // isTwoOvercards
const OVER_AND_MIDDLE = 1 << 23; // isOvercardAndMiddleCard
const OVER_AND_UNDER = 1 << 24; // isOvercardAndUndercard
const TWO_MIDDLE = 1 << 25; // isTwoMiddleCards
const MIDDLE_AND_UNDER = 1 << 26; // isMiddleAndUndercard
const TWO_UNDER = 1 << 27; // isTwoUndercards
const HIGH_CARD = 1 << 28; // isHighCard

// High word: draws
const FLUSH_DRAW = 1 << 0; // isFlushDraw
const BACKDOOR = 1 << 1; // isBackdoorFlushDraw
const NUT_FLUSH_DRAW = 1 << 2; // isNutFlushDraw
const NUT_BACKDOOR = 1 << 3; // isNutBackdoorFlushDraw
const OPEN_ENDED = 1 << 4; // isOpenEndedStraightDraw
const INSIDE = 1 << 5; // isInsideStraightDraw
const DOUBLE_GUTSHOT = 1 << 6; // isDoubleGutshot
const STRAIGHT_DRAW = 1 << 7; // isStraightDraw
const BACKDOOR_STRAIGHT = 1 << 8; // isBackdoorStraightDraw
const OPEN_ENDED_WHEEL = 1 << 9; // isOpenEndedStraightDrawWheel
const INSIDE_WHEEL = 1 << 10; // isInsideStraightDrawWheel
const COMBO_DRAW = 1 << 11; // isComboDraw
const BACKDOOR_COMBO = 1 << 12; // isBackdoorComboDraw

/** The word (0 lo, 1 hi) and bit of each flag, by FLAGS index. */
const FLAG_WORD = new Uint8Array(ALL_FLAGS.length);
const FLAG_BIT = new Int32Array(ALL_FLAGS.length);
{
  const bits = [ROYAL_FLUSH, STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT, THREE_OF_A_KIND, TWO_PAIR, PAIR, OVER_PAIR, TOP_PAIR, MIDDLE_PAIR, BOTTOM_PAIR, TOP_AND_MIDDLE, TOP_AND_BOTTOM, MIDDLE_AND_BOTTOM, TOP_TRIPS, MIDDLE_TRIPS, BOTTOM_TRIPS, FLUSH_DRAW, BACKDOOR, NUT_FLUSH_DRAW, NUT_BACKDOOR, OPEN_ENDED, INSIDE, DOUBLE_GUTSHOT, STRAIGHT_DRAW, BACKDOOR_STRAIGHT, STRAIGHT_WHEEL, OPEN_ENDED_WHEEL, INSIDE_WHEEL, COMBO_DRAW, BACKDOOR_COMBO, UNDER_PAIR, OVERCARD, TWO_OVERCARDS, OVER_AND_MIDDLE, OVER_AND_UNDER, TWO_MIDDLE, MIDDLE_AND_UNDER, TWO_UNDER, HIGH_CARD];
  ALL_FLAGS.forEach((flag, i) => {
    FLAG_WORD[i] = DRAWS.includes(flag) ? 1 : 0;
    FLAG_BIT[i] = bits[i];
  });
  // Each word's bits must be distinct and in ALL_FLAGS order
  for (const w of [0, 1]) {
    const list = ALL_FLAGS.map((f, i) => i).filter(i => FLAG_WORD[i] === w).map(i => FLAG_BIT[i]);
    list.forEach((b, k) => { if (b !== 1 << k) throw new Error('Flag bits are out of step with ALL_FLAGS'); });
  }
}

const MADE_BITS = ROYAL_FLUSH | STRAIGHT_FLUSH | FOUR_OF_A_KIND | FULL_HOUSE | FLUSH | STRAIGHT | THREE_OF_A_KIND | TWO_PAIR | PAIR;
const PAIR_LABEL_BITS = OVER_PAIR | TOP_PAIR | MIDDLE_PAIR | BOTTOM_PAIR | UNDER_PAIR;
const TWO_PAIR_LABEL_BITS = TOP_AND_MIDDLE | TOP_AND_BOTTOM | MIDDLE_AND_BOTTOM;
const TRIPS_LABEL_BITS = TOP_TRIPS | MIDDLE_TRIPS | BOTTOM_TRIPS;
// High word groups
const STRAIGHT_DRAW_BITS = OPEN_ENDED | INSIDE | DOUBLE_GUTSHOT | STRAIGHT_DRAW | BACKDOOR_STRAIGHT | OPEN_ENDED_WHEEL | INSIDE_WHEEL;
const FLUSH_DRAW_BITS = FLUSH_DRAW | BACKDOOR | NUT_FLUSH_DRAW | NUT_BACKDOOR;
const COMBO_BITS = COMBO_DRAW | BACKDOOR_COMBO;
/** Draws that need two more cards, gone once only one card is to come. */
const BACKDOOR_BITS = BACKDOOR | NUT_BACKDOOR | BACKDOOR_STRAIGHT | BACKDOOR_COMBO;

/** Strength (10 royal flush ... 1 high card) to the low-word bit of that made hand. */
const STRENGTH_BIT = [0, HIGH_CARD, PAIR, TWO_PAIR, THREE_OF_A_KIND, STRAIGHT, FLUSH, FULL_HOUSE, FOUR_OF_A_KIND, STRAIGHT_FLUSH, ROYAL_FLUSH];

/** Made hand flag by strength (index 1 = 'isHighCard' ... 10 = 'isRoyalFlush'). */
const CATEGORY_BY_STRENGTH = [null, ...[...MADE_HANDS].reverse()];

/**
 * Whether a flag is set.
 *
 * @param {number} lo - Low word
 * @param {number} hi - High word
 * @param {number} flag - Flag index (FLAGS.isFlushDraw)
 * @returns {boolean}
 */
function hasFlag(lo, hi, flag) {
  return ((FLAG_WORD[flag] ? hi : lo) & FLAG_BIT[flag]) !== 0;
}

/** The flags object for two words, every flag in ALL_FLAGS order. */
function flagsObject(lo, hi) {
  return {
    isRoyalFlush: (lo & ROYAL_FLUSH) !== 0,
    isStraightFlush: (lo & STRAIGHT_FLUSH) !== 0,
    isFourOfAKind: (lo & FOUR_OF_A_KIND) !== 0,
    isFullHouse: (lo & FULL_HOUSE) !== 0,
    isFlush: (lo & FLUSH) !== 0,
    isStraight: (lo & STRAIGHT) !== 0,
    isThreeOfAKind: (lo & THREE_OF_A_KIND) !== 0,
    isTwoPair: (lo & TWO_PAIR) !== 0,
    isPair: (lo & PAIR) !== 0,
    isOverPair: (lo & OVER_PAIR) !== 0,
    isTopPair: (lo & TOP_PAIR) !== 0,
    isMiddlePair: (lo & MIDDLE_PAIR) !== 0,
    isBottomPair: (lo & BOTTOM_PAIR) !== 0,
    isTopAndMiddlePair: (lo & TOP_AND_MIDDLE) !== 0,
    isTopAndBottomPair: (lo & TOP_AND_BOTTOM) !== 0,
    isMiddleAndBottomPair: (lo & MIDDLE_AND_BOTTOM) !== 0,
    isTopThreeOfAKind: (lo & TOP_TRIPS) !== 0,
    isMiddleThreeOfAKind: (lo & MIDDLE_TRIPS) !== 0,
    isBottomThreeOfAKind: (lo & BOTTOM_TRIPS) !== 0,
    isFlushDraw: (hi & FLUSH_DRAW) !== 0,
    isBackdoorFlushDraw: (hi & BACKDOOR) !== 0,
    isNutFlushDraw: (hi & NUT_FLUSH_DRAW) !== 0,
    isNutBackdoorFlushDraw: (hi & NUT_BACKDOOR) !== 0,
    isOpenEndedStraightDraw: (hi & OPEN_ENDED) !== 0,
    isInsideStraightDraw: (hi & INSIDE) !== 0,
    isDoubleGutshot: (hi & DOUBLE_GUTSHOT) !== 0,
    isStraightDraw: (hi & STRAIGHT_DRAW) !== 0,
    isBackdoorStraightDraw: (hi & BACKDOOR_STRAIGHT) !== 0,
    isStraightWheel: (lo & STRAIGHT_WHEEL) !== 0,
    isOpenEndedStraightDrawWheel: (hi & OPEN_ENDED_WHEEL) !== 0,
    isInsideStraightDrawWheel: (hi & INSIDE_WHEEL) !== 0,
    isComboDraw: (hi & COMBO_DRAW) !== 0,
    isBackdoorComboDraw: (hi & BACKDOOR_COMBO) !== 0,
    isUnderPair: (lo & UNDER_PAIR) !== 0,
    isOvercard: (lo & OVERCARD) !== 0,
    isTwoOvercards: (lo & TWO_OVERCARDS) !== 0,
    isOvercardAndMiddleCard: (lo & OVER_AND_MIDDLE) !== 0,
    isOvercardAndUndercard: (lo & OVER_AND_UNDER) !== 0,
    isTwoMiddleCards: (lo & TWO_MIDDLE) !== 0,
    isMiddleAndUndercard: (lo & MIDDLE_AND_UNDER) !== 0,
    isTwoUndercards: (lo & TWO_UNDER) !== 0,
    isHighCard: (lo & HIGH_CARD) !== 0
  };
}
if (Object.keys(flagsObject(0, 0)).join() !== ALL_FLAGS.join()) throw new Error('flagsObject() is out of step with ALL_FLAGS');

/** Like flagsObject, with evaluate()'s leading properties first. */
function flatObject(hand, category, strength, rank, street, lo, hi) {
  return {
    hand,
    category,
    strength,
    rank,
    street,
    isRoyalFlush: (lo & ROYAL_FLUSH) !== 0,
    isStraightFlush: (lo & STRAIGHT_FLUSH) !== 0,
    isFourOfAKind: (lo & FOUR_OF_A_KIND) !== 0,
    isFullHouse: (lo & FULL_HOUSE) !== 0,
    isFlush: (lo & FLUSH) !== 0,
    isStraight: (lo & STRAIGHT) !== 0,
    isThreeOfAKind: (lo & THREE_OF_A_KIND) !== 0,
    isTwoPair: (lo & TWO_PAIR) !== 0,
    isPair: (lo & PAIR) !== 0,
    isOverPair: (lo & OVER_PAIR) !== 0,
    isTopPair: (lo & TOP_PAIR) !== 0,
    isMiddlePair: (lo & MIDDLE_PAIR) !== 0,
    isBottomPair: (lo & BOTTOM_PAIR) !== 0,
    isTopAndMiddlePair: (lo & TOP_AND_MIDDLE) !== 0,
    isTopAndBottomPair: (lo & TOP_AND_BOTTOM) !== 0,
    isMiddleAndBottomPair: (lo & MIDDLE_AND_BOTTOM) !== 0,
    isTopThreeOfAKind: (lo & TOP_TRIPS) !== 0,
    isMiddleThreeOfAKind: (lo & MIDDLE_TRIPS) !== 0,
    isBottomThreeOfAKind: (lo & BOTTOM_TRIPS) !== 0,
    isFlushDraw: (hi & FLUSH_DRAW) !== 0,
    isBackdoorFlushDraw: (hi & BACKDOOR) !== 0,
    isNutFlushDraw: (hi & NUT_FLUSH_DRAW) !== 0,
    isNutBackdoorFlushDraw: (hi & NUT_BACKDOOR) !== 0,
    isOpenEndedStraightDraw: (hi & OPEN_ENDED) !== 0,
    isInsideStraightDraw: (hi & INSIDE) !== 0,
    isDoubleGutshot: (hi & DOUBLE_GUTSHOT) !== 0,
    isStraightDraw: (hi & STRAIGHT_DRAW) !== 0,
    isBackdoorStraightDraw: (hi & BACKDOOR_STRAIGHT) !== 0,
    isStraightWheel: (lo & STRAIGHT_WHEEL) !== 0,
    isOpenEndedStraightDrawWheel: (hi & OPEN_ENDED_WHEEL) !== 0,
    isInsideStraightDrawWheel: (hi & INSIDE_WHEEL) !== 0,
    isComboDraw: (hi & COMBO_DRAW) !== 0,
    isBackdoorComboDraw: (hi & BACKDOOR_COMBO) !== 0,
    isUnderPair: (lo & UNDER_PAIR) !== 0,
    isOvercard: (lo & OVERCARD) !== 0,
    isTwoOvercards: (lo & TWO_OVERCARDS) !== 0,
    isOvercardAndMiddleCard: (lo & OVER_AND_MIDDLE) !== 0,
    isOvercardAndUndercard: (lo & OVER_AND_UNDER) !== 0,
    isTwoMiddleCards: (lo & TWO_MIDDLE) !== 0,
    isMiddleAndUndercard: (lo & MIDDLE_AND_UNDER) !== 0,
    isTwoUndercards: (lo & TWO_UNDER) !== 0,
    isHighCard: (lo & HIGH_CARD) !== 0
  };
}
if (Object.keys(flatObject()).join() !== ['hand', 'category', 'strength', 'rank', 'street', ...ALL_FLAGS].join()) {
  throw new Error('flatObject() is out of step with ALL_FLAGS');
}

module.exports = {
  FLAGS, FLAG_WORD, FLAG_BIT, hasFlag, flagsObject, flatObject, STRENGTH_BIT, CATEGORY_BY_STRENGTH,
  ROYAL_FLUSH, STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT, THREE_OF_A_KIND, TWO_PAIR, PAIR, OVER_PAIR, TOP_PAIR, MIDDLE_PAIR, BOTTOM_PAIR, TOP_AND_MIDDLE, TOP_AND_BOTTOM, MIDDLE_AND_BOTTOM, TOP_TRIPS, MIDDLE_TRIPS, BOTTOM_TRIPS, FLUSH_DRAW, BACKDOOR, NUT_FLUSH_DRAW, NUT_BACKDOOR, OPEN_ENDED, INSIDE, DOUBLE_GUTSHOT, STRAIGHT_DRAW, BACKDOOR_STRAIGHT, STRAIGHT_WHEEL, OPEN_ENDED_WHEEL, INSIDE_WHEEL, COMBO_DRAW, BACKDOOR_COMBO, UNDER_PAIR, OVERCARD, TWO_OVERCARDS, OVER_AND_MIDDLE, OVER_AND_UNDER, TWO_MIDDLE, MIDDLE_AND_UNDER, TWO_UNDER, HIGH_CARD,
  MADE_BITS, PAIR_LABEL_BITS, TWO_PAIR_LABEL_BITS, TRIPS_LABEL_BITS, STRAIGHT_DRAW_BITS, FLUSH_DRAW_BITS, COMBO_BITS, BACKDOOR_BITS
};
