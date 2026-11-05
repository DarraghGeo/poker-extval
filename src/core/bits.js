/**
 * Flags as bits. Flag i of ALL_FLAGS is bit (i % 32) of word (i >> 5): the first 32 flags are in
 * the low word, the last five (isOvercardAndUndercard ... isHighCard) in the high word.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { ALL_FLAGS, MADE_HANDS } = require('../flags');

/** Flag index by name, in ALL_FLAGS order. */
const FLAGS = Object.freeze(Object.fromEntries(ALL_FLAGS.map((flag, i) => [flag, i])));

const bit = name => 1 << (FLAGS[name] & 31);

// Low word
const ROYAL_FLUSH = bit('isRoyalFlush');
const STRAIGHT_FLUSH = bit('isStraightFlush');
const FOUR_OF_A_KIND = bit('isFourOfAKind');
const FULL_HOUSE = bit('isFullHouse');
const FLUSH = bit('isFlush');
const STRAIGHT = bit('isStraight');
const THREE_OF_A_KIND = bit('isThreeOfAKind');
const TWO_PAIR = bit('isTwoPair');
const PAIR = bit('isPair');
const OVER_PAIR = bit('isOverPair');
const TOP_PAIR = bit('isTopPair');
const MIDDLE_PAIR = bit('isMiddlePair');
const BOTTOM_PAIR = bit('isBottomPair');
const TOP_AND_MIDDLE = bit('isTopAndMiddlePair');
const TOP_AND_BOTTOM = bit('isTopAndBottomPair');
const MIDDLE_AND_BOTTOM = bit('isMiddleAndBottomPair');
const TOP_TRIPS = bit('isTopThreeOfAKind');
const MIDDLE_TRIPS = bit('isMiddleThreeOfAKind');
const BOTTOM_TRIPS = bit('isBottomThreeOfAKind');
const FLUSH_DRAW = bit('isFlushDraw');
const BACKDOOR = bit('isBackdoorFlushDraw');
const OPEN_ENDED = bit('isOpenEndedStraightDraw');
const INSIDE = bit('isInsideStraightDraw');
const STRAIGHT_DRAW = bit('isStraightDraw');
const STRAIGHT_WHEEL = bit('isStraightWheel');
const OPEN_ENDED_WHEEL = bit('isOpenEndedStraightDrawWheel');
const INSIDE_WHEEL = bit('isInsideStraightDrawWheel');
const COMBO_DRAW = bit('isComboDraw');
const UNDER_PAIR = bit('isUnderPair');
const OVERCARD = bit('isOvercard');
const TWO_OVERCARDS = bit('isTwoOvercards');
const OVER_AND_MIDDLE = bit('isOvercardAndMiddleCard');
// High word
const OVER_AND_UNDER = bit('isOvercardAndUndercard');
const TWO_MIDDLE = bit('isTwoMiddleCards');
const MIDDLE_AND_UNDER = bit('isMiddleAndUndercard');
const TWO_UNDER = bit('isTwoUndercards');
const HIGH_CARD = bit('isHighCard');

if (FLAGS.isOvercardAndMiddleCard !== 31 || FLAGS.isHighCard !== 36) throw new Error('Flag bits are out of step with ALL_FLAGS');

/** The made hand bits, strongest first, and every bit group strict mode and the draws touch. */
const MADE_BITS = ROYAL_FLUSH | STRAIGHT_FLUSH | FOUR_OF_A_KIND | FULL_HOUSE | FLUSH | STRAIGHT | THREE_OF_A_KIND | TWO_PAIR | PAIR;
const PAIR_LABEL_BITS = OVER_PAIR | TOP_PAIR | MIDDLE_PAIR | BOTTOM_PAIR | UNDER_PAIR;
const TWO_PAIR_LABEL_BITS = TOP_AND_MIDDLE | TOP_AND_BOTTOM | MIDDLE_AND_BOTTOM;
const TRIPS_LABEL_BITS = TOP_TRIPS | MIDDLE_TRIPS | BOTTOM_TRIPS;
const STRAIGHT_DRAW_BITS = OPEN_ENDED | INSIDE | STRAIGHT_DRAW | OPEN_ENDED_WHEEL | INSIDE_WHEEL;
const FLUSH_DRAW_BITS = FLUSH_DRAW | BACKDOOR;
const DRAW_BITS = FLUSH_DRAW_BITS | STRAIGHT_DRAW_BITS | COMBO_DRAW;

/**
 * Strength (10 royal flush ... 1 high card) to the low-word bit of that made hand (high card,
 * in the high word, is 0 here).
 */
const STRENGTH_BIT = [0, 0, PAIR, TWO_PAIR, THREE_OF_A_KIND, STRAIGHT, FLUSH, FULL_HOUSE, FOUR_OF_A_KIND, STRAIGHT_FLUSH, ROYAL_FLUSH];

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
  return ((flag < 32 ? lo : hi) & (1 << (flag & 31))) !== 0;
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
    isFlushDraw: (lo & FLUSH_DRAW) !== 0,
    isBackdoorFlushDraw: (lo & BACKDOOR) !== 0,
    isOpenEndedStraightDraw: (lo & OPEN_ENDED) !== 0,
    isInsideStraightDraw: (lo & INSIDE) !== 0,
    isStraightDraw: (lo & STRAIGHT_DRAW) !== 0,
    isStraightWheel: (lo & STRAIGHT_WHEEL) !== 0,
    isOpenEndedStraightDrawWheel: (lo & OPEN_ENDED_WHEEL) !== 0,
    isInsideStraightDrawWheel: (lo & INSIDE_WHEEL) !== 0,
    isComboDraw: (lo & COMBO_DRAW) !== 0,
    isUnderPair: (lo & UNDER_PAIR) !== 0,
    isOvercard: (lo & OVERCARD) !== 0,
    isTwoOvercards: (lo & TWO_OVERCARDS) !== 0,
    isOvercardAndMiddleCard: (lo & OVER_AND_MIDDLE) !== 0,
    isOvercardAndUndercard: (hi & OVER_AND_UNDER) !== 0,
    isTwoMiddleCards: (hi & TWO_MIDDLE) !== 0,
    isMiddleAndUndercard: (hi & MIDDLE_AND_UNDER) !== 0,
    isTwoUndercards: (hi & TWO_UNDER) !== 0,
    isHighCard: (hi & HIGH_CARD) !== 0
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
    isFlushDraw: (lo & FLUSH_DRAW) !== 0,
    isBackdoorFlushDraw: (lo & BACKDOOR) !== 0,
    isOpenEndedStraightDraw: (lo & OPEN_ENDED) !== 0,
    isInsideStraightDraw: (lo & INSIDE) !== 0,
    isStraightDraw: (lo & STRAIGHT_DRAW) !== 0,
    isStraightWheel: (lo & STRAIGHT_WHEEL) !== 0,
    isOpenEndedStraightDrawWheel: (lo & OPEN_ENDED_WHEEL) !== 0,
    isInsideStraightDrawWheel: (lo & INSIDE_WHEEL) !== 0,
    isComboDraw: (lo & COMBO_DRAW) !== 0,
    isUnderPair: (lo & UNDER_PAIR) !== 0,
    isOvercard: (lo & OVERCARD) !== 0,
    isTwoOvercards: (lo & TWO_OVERCARDS) !== 0,
    isOvercardAndMiddleCard: (lo & OVER_AND_MIDDLE) !== 0,
    isOvercardAndUndercard: (hi & OVER_AND_UNDER) !== 0,
    isTwoMiddleCards: (hi & TWO_MIDDLE) !== 0,
    isMiddleAndUndercard: (hi & MIDDLE_AND_UNDER) !== 0,
    isTwoUndercards: (hi & TWO_UNDER) !== 0,
    isHighCard: (hi & HIGH_CARD) !== 0
  };
}
if (Object.keys(flatObject()).join() !== ['hand', 'category', 'strength', 'rank', 'street', ...ALL_FLAGS].join()) {
  throw new Error('flatObject() is out of step with ALL_FLAGS');
}

module.exports = {
  FLAGS, hasFlag, flagsObject, flatObject, STRENGTH_BIT, CATEGORY_BY_STRENGTH,
  ROYAL_FLUSH, STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT, THREE_OF_A_KIND, TWO_PAIR, PAIR,
  OVER_PAIR, TOP_PAIR, MIDDLE_PAIR, BOTTOM_PAIR, TOP_AND_MIDDLE, TOP_AND_BOTTOM, MIDDLE_AND_BOTTOM,
  TOP_TRIPS, MIDDLE_TRIPS, BOTTOM_TRIPS, FLUSH_DRAW, BACKDOOR, OPEN_ENDED, INSIDE, STRAIGHT_DRAW,
  STRAIGHT_WHEEL, OPEN_ENDED_WHEEL, INSIDE_WHEEL, COMBO_DRAW, UNDER_PAIR, OVERCARD, TWO_OVERCARDS,
  OVER_AND_MIDDLE, OVER_AND_UNDER, TWO_MIDDLE, MIDDLE_AND_UNDER, TWO_UNDER, HIGH_CARD,
  MADE_BITS, PAIR_LABEL_BITS, TWO_PAIR_LABEL_BITS, TRIPS_LABEL_BITS, STRAIGHT_DRAW_BITS, FLUSH_DRAW_BITS, DRAW_BITS
};
