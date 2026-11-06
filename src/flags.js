/**
 * The evaluation flags and the groups they belong to. Every list is defined once here.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

/** Made hand flags, strongest first. Exactly one is true for a 5-card hand in strict mode. */
const MADE_HANDS = Object.freeze([
  'isRoyalFlush',
  'isStraightFlush',
  'isFourOfAKind',
  'isFullHouse',
  'isFlush',
  'isStraight',
  'isThreeOfAKind',
  'isTwoPair',
  'isPair',
  'isHighCard'
]);

/** Hand strength by made hand flag: 10 (royal flush) down to 1 (high card). */
const HAND_STRENGTH = Object.freeze(Object.fromEntries(MADE_HANDS.map((hand, i) => [hand, MADE_HANDS.length - i])));

/** Position labels for a pair, and the made hand they describe. */
const PAIR_LABELS = Object.freeze(['isOverPair', 'isTopPair', 'isMiddlePair', 'isBottomPair', 'isUnderPair']);
const TWO_PAIR_LABELS = Object.freeze(['isTopAndMiddlePair', 'isTopAndBottomPair', 'isMiddleAndBottomPair']);
const THREE_OF_A_KIND_LABELS = Object.freeze(['isTopThreeOfAKind', 'isMiddleThreeOfAKind', 'isBottomThreeOfAKind']);

/** Straight draw flags, including the wheel-specific ones and backdoor straight draws. */
const STRAIGHT_DRAWS = Object.freeze([
  'isOpenEndedStraightDraw',
  'isInsideStraightDraw',
  'isDoubleGutshot',
  'isStraightDraw',
  'isBackdoorStraightDraw',
  'isOpenEndedStraightDrawWheel',
  'isInsideStraightDrawWheel'
]);

/** Flush draw flags, including the nut variants. */
const FLUSH_DRAWS = Object.freeze(['isFlushDraw', 'isBackdoorFlushDraw', 'isNutFlushDraw', 'isNutBackdoorFlushDraw']);

/**
 * Every draw flag. On 6+ cards draws describe the whole hand rather than one 5-card combination,
 * so strict mode collects them from every combination.
 */
const DRAWS = Object.freeze([...FLUSH_DRAWS, ...STRAIGHT_DRAWS, 'isComboDraw', 'isBackdoorComboDraw']);

/**
 * Draw flags used when grouping villain combos. The wheel draw flags are left out since wheel
 * draws are already counted in isOpenEndedStraightDraw and isInsideStraightDraw.
 */
const VILLAIN_DRAWS = Object.freeze([
  'isFlushDraw',
  'isBackdoorFlushDraw',
  'isNutFlushDraw',
  'isNutBackdoorFlushDraw',
  'isOpenEndedStraightDraw',
  'isInsideStraightDraw',
  'isDoubleGutshot',
  'isStraightDraw',
  'isBackdoorStraightDraw',
  'isComboDraw',
  'isBackdoorComboDraw'
]);

/**
 * Flags that categorise the player's hole cards relative to the board. They describe the two hole
 * cards rather than a 5-card hand, so their kicker cards come from the full hand.
 */
const HOLE_CARD_CATEGORIES = Object.freeze([
  'isOvercard',
  'isTwoOvercards',
  'isOvercardAndMiddleCard',
  'isOvercardAndUndercard',
  'isTwoMiddleCards',
  'isMiddleAndUndercard',
  'isTwoUndercards'
]);

/** Every flag, in the order they appear in an evaluation object and in keyCards / kickerCards. */
const ALL_FLAGS = Object.freeze([
  'isRoyalFlush',
  'isStraightFlush',
  'isFourOfAKind',
  'isFullHouse',
  'isFlush',
  'isStraight',
  'isThreeOfAKind',
  'isTwoPair',
  'isPair',
  'isOverPair',
  'isTopPair',
  'isMiddlePair',
  'isBottomPair',
  ...TWO_PAIR_LABELS,
  ...THREE_OF_A_KIND_LABELS,
  'isFlushDraw',
  'isBackdoorFlushDraw',
  'isNutFlushDraw',
  'isNutBackdoorFlushDraw',
  'isOpenEndedStraightDraw',
  'isInsideStraightDraw',
  'isDoubleGutshot',
  'isStraightDraw',
  'isBackdoorStraightDraw',
  'isStraightWheel',
  'isOpenEndedStraightDrawWheel',
  'isInsideStraightDrawWheel',
  'isComboDraw',
  'isBackdoorComboDraw',
  'isUnderPair',
  ...HOLE_CARD_CATEGORIES,
  'isHighCard'
]);

module.exports = {
  MADE_HANDS,
  HAND_STRENGTH,
  PAIR_LABELS,
  TWO_PAIR_LABELS,
  THREE_OF_A_KIND_LABELS,
  STRAIGHT_DRAWS,
  FLUSH_DRAWS,
  DRAWS,
  VILLAIN_DRAWS,
  HOLE_CARD_CATEGORIES,
  ALL_FLAGS
};
