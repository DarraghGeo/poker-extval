/**
 * Analyses a single 5-card hand: made hands, position labels, draws and hole card categories,
 * plus the key cards and kicker cards behind every flag that is true.
 *
 * Everything here is a pure function of the five cards and a context describing the full hand
 * (see buildContext), so the same five cards always give the same result.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { value, wheelValue, sortDesc } = require('./cards');
const {
  HAND_STRENGTH,
  MADE_HANDS,
  PAIR_LABELS,
  TWO_PAIR_LABELS,
  THREE_OF_A_KIND_LABELS,
  STRAIGHT_DRAWS,
  DRAWS,
  HOLE_CARD_CATEGORIES,
  ALL_FLAGS
} = require('./flags');

const HOLE_CARD_CATEGORY_SET = new Set(HOLE_CARD_CATEGORIES);

/**
 * Describes the full hand once, for every 5-card combination drawn from it.
 *
 * @param {string[]} fullHand - Every card passed in, in input order
 * @param {string[]|null} holeCards - The player's two hole cards, or null
 * @returns {Object} The context used by analyzeFive
 */
function buildContext(fullHand, holeCards) {
  const holeSet = new Set(holeCards || []);
  const board = fullHand.filter(c => !holeSet.has(c));
  return {
    fullHand,
    holeCards,
    holeSet,
    board,
    boardRanks: new Set(board.map(c => c[0])),
    boardValues: board.map(value),
    cardCount: fullHand.length,
    holeClassification: classifyHoleCards(holeCards, board)
  };
}

/**
 * Classifies each hole card against the board: 'paired' if the board has its rank, otherwise
 * 'over' (above every board card), 'under' (below every board card) or 'middle'.
 *
 * @param {string[]|null} holeCards - The hole cards
 * @param {string[]} board - The board cards
 * @returns {string[]|null} One classification per hole card, or null without hole cards or
 *   with fewer than 3 board cards
 */
function classifyHoleCards(holeCards, board) {
  if (!holeCards || board.length < 3) return null;
  const boardRanks = new Set(board.map(c => c[0]));
  const boardValues = board.map(value);
  const highest = Math.max(...boardValues);
  const lowest = Math.min(...boardValues);
  return holeCards.map(card => {
    if (boardRanks.has(card[0])) return 'paired';
    if (value(card) > highest) return 'over';
    if (value(card) < lowest) return 'under';
    return 'middle';
  });
}

/**
 * Classifies a paired (or tripled) rank against the whole board, including board cards outside
 * the current 5-card combination.
 *
 * @param {string|null} rank - The rank to classify
 * @param {Object} ctx - The hand context
 * @returns {string|null} 'top', 'middle', 'bottom', 'none' (no hole card has the rank, so it
 *   belongs to the board), or null without hole cards
 */
function boardPosition(rank, ctx) {
  if (!ctx.holeCards) return null;
  if (!rank || !ctx.holeCards.some(c => c[0] === rank)) return 'none';
  const rankValue = value(rank + 's');
  if (rankValue >= Math.max(...ctx.boardValues)) return 'top';
  if (rankValue <= Math.min(...ctx.boardValues)) return 'bottom';
  return 'middle';
}

/**
 * Precomputes the sorted orders and counts every check reads.
 *
 * @param {string[]} five - Five cards
 * @returns {Object} The hand's shape
 */
function describeFive(five) {
  const std = sortDesc(five);
  const wheel = sortDesc(five, wheelValue);
  const rankCounts = {};
  // Distinct ranks from highest to lowest, with how often each appears. Built from the sorted
  // cards, since an object lists digit keys ('2'-'9') first whatever order they were added in.
  const ranks = [];
  for (const card of std) {
    if (!rankCounts[card[0]]) ranks.push({ rank: card[0], count: 0 });
    rankCounts[card[0]] = (rankCounts[card[0]] || 0) + 1;
    ranks[ranks.length - 1].count = rankCounts[card[0]];
  }
  const counts = ranks.map(r => r.count).sort((a, b) => b - a);
  const suitCounts = {};
  for (const card of five) suitCounts[card[1]] = (suitCounts[card[1]] || 0) + 1;
  return {
    std,
    wheel,
    rankCounts,
    ranks,
    counts,
    suitCounts,
    rankWithCount: n => (ranks.find(r => r.count === n) || {}).rank || null,
    suitWithCount: n => Object.keys(suitCounts).find(s => suitCounts[s] === n) || null,
    cardsOfSuit: suit => std.filter(c => c[1] === suit)
  };
}

/**
 * Finds 4 cards of distinct, rank-adjacent ranks whose rank span is one of the given distances.
 * Paired cards count once (a hole card is preferred as the representative of its rank).
 * One-ended draws (A-K-Q-J and A-2-3-4) count as span 4, the same as an inside draw, since only
 * one rank completes them. Wheel windows must contain the Ace. With hole cards, a window whose
 * ranks are all already on the board is skipped.
 *
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @param {number[]} distances - Accepted spans (3 = open-ended, 4 = inside)
 * @param {boolean} wheel - Rank the Ace low
 * @returns {string[]|null} The 4 cards, high to low, or null
 */
function findStraightDrawWindow(shape, ctx, distances, wheel) {
  const rankValue = wheel ? wheelValue : value;
  const distinct = distinctRanks(shape, ctx, wheel);
  for (let i = 0; i + 4 <= distinct.length; i++) {
    const window = distinct.slice(i, i + 4);
    const hasAce = window.some(c => c[0] === 'A');
    if (wheel && !hasAce) continue;
    let distance = rankValue(window[0]) - rankValue(window[3]);
    if (distance === 3 && hasAce) distance = 4;
    if (distances.includes(distance) && addsRankToBoard(window, ctx)) return window;
  }
  return null;
}

/**
 * One card per rank, high to low, preferring a hole card as the representative of its rank.
 * Cached on the shape per ranking.
 */
function distinctRanks(shape, ctx, wheel) {
  const cacheKey = wheel ? 'distinctWheel' : 'distinctStd';
  if (shape[cacheKey]) return shape[cacheKey];
  const rankValue = wheel ? wheelValue : value;
  const distinct = [];
  for (const card of wheel ? shape.wheel : shape.std) {
    const last = distinct[distinct.length - 1];
    if (last && rankValue(last) === rankValue(card)) {
      if (ctx.holeSet.has(card)) distinct[distinct.length - 1] = card;
      continue;
    }
    distinct.push(card);
  }
  return (shape[cacheKey] = distinct);
}

/** The draw window for the given spans, preferring a standard draw over a wheel draw. */
function straightDrawCards(shape, ctx, distances) {
  return findStraightDrawWindow(shape, ctx, distances, false) || findStraightDrawWindow(shape, ctx, distances, true) || [];
}

/** True without hole cards, or when one of the cards is a hole card. */
function usesHoleCard(cards, ctx) {
  return !ctx.holeCards || cards.some(c => ctx.holeSet.has(c));
}

/** True without hole cards, or when one of the cards has a rank the board does not have. */
function addsRankToBoard(cards, ctx) {
  return !ctx.holeCards || cards.some(c => !ctx.boardRanks.has(c[0]));
}

/** The five cards of a made straight, high to low (Ace last for a wheel). */
function straightCards(shape) {
  const consecutive = (cards, rankValue) => cards.every((c, i) => i === 0 || rankValue(cards[i - 1]) - rankValue(c) === 1);
  if (consecutive(shape.std, value)) return shape.std;
  if (consecutive(shape.wheel, wheelValue)) return shape.wheel;
  return [];
}

/**
 * Works out every flag for five cards.
 *
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @returns {Object} Flag name to boolean
 */
function computeFlags(shape, ctx) {
  const { std, wheel, rankCounts, ranks, counts, suitCounts } = shape;
  const f = {};

  f.isFourOfAKind = counts[0] === 4 && counts[1] === 1;
  f.isFullHouse = counts[0] === 3 && counts[1] === 2;
  f.isThreeOfAKind = counts[0] === 3 && counts[1] === 1 && counts[2] === 1;
  f.isTwoPair = counts[0] === 2 && counts[1] === 2 && counts[2] === 1;
  f.isPair = counts[0] === 2 && counts[1] === 1 && counts[2] === 1 && counts[3] === 1;
  f.isFlush = Object.values(suitCounts).includes(5);

  const allDistinct = ranks.length === 5;
  // The wheel is A-2-3-4-5 only: the Ace counts low, so the top card is the 5
  f.isStraightWheel = allDistinct && std[0][0] === 'A' && std[1][0] === '5' && wheelValue(wheel[0]) - wheelValue(wheel[4]) === 4;
  f.isStraight = allDistinct && (value(std[0]) - value(std[4]) === 4 || f.isStraightWheel);
  f.isRoyalFlush = f.isFlush && f.isStraight && std[0][0] === 'A' && std[4][0] === 'T';
  f.isStraightFlush = f.isFlush && f.isStraight && !f.isRoyalFlush;

  // Position labels: against the whole board with hole cards, else within these five cards
  const top = std[0][0];
  const bottom = std[4][0];
  const pairPosition = f.isPair ? boardPosition(shape.rankWithCount(2), ctx) : null;
  f.isTopPair = f.isPair && (pairPosition !== null ? pairPosition === 'top' : rankCounts[top] === 2);
  f.isMiddlePair = f.isPair && (pairPosition !== null ? pairPosition === 'middle' : ranks.length === 4 && (ranks[1].count === 2 || ranks[2].count === 2));
  f.isBottomPair = f.isPair && (pairPosition !== null ? pairPosition === 'bottom' : rankCounts[bottom] === 2);

  f.isTopAndMiddlePair = f.isTwoPair && ranks[0].count === 2 && ranks[1].count === 2;
  f.isTopAndBottomPair = f.isTwoPair && ranks[0].count === 2 && ranks[ranks.length - 1].count === 2;
  f.isMiddleAndBottomPair = f.isTwoPair && ranks.length === 3 && ranks[1].count === 2 && ranks[2].count === 2;

  const tripsPosition = f.isThreeOfAKind ? boardPosition(shape.rankWithCount(3), ctx) : null;
  f.isTopThreeOfAKind = f.isThreeOfAKind && (tripsPosition !== null ? tripsPosition === 'top' : rankCounts[top] === 3);
  f.isMiddleThreeOfAKind = f.isThreeOfAKind && (tripsPosition !== null ? tripsPosition === 'middle' : ranks.length === 3 && ranks[1].count === 3);
  f.isBottomThreeOfAKind = f.isThreeOfAKind && (tripsPosition !== null ? tripsPosition === 'bottom' : rankCounts[bottom] === 3);

  // Flush draws must use a hole card when hole cards are supplied
  const suitedDraw = n => Object.keys(suitCounts).some(s => suitCounts[s] === n && usesHoleCard(shape.cardsOfSuit(s), ctx));
  f.isFlushDraw = !f.isFlush && suitedDraw(4);
  f.isBackdoorFlushDraw = !f.isFlush && !f.isFlushDraw && suitedDraw(3);

  // Straight draws: none once a straight is made
  f.isOpenEndedStraightDrawWheel = !f.isStraightWheel && findStraightDrawWindow(shape, ctx, [3], true) !== null;
  f.isInsideStraightDrawWheel = !f.isStraightWheel && findStraightDrawWindow(shape, ctx, [4], true) !== null;
  f.isOpenEndedStraightDraw = !f.isStraight && (findStraightDrawWindow(shape, ctx, [3], false) !== null || f.isOpenEndedStraightDrawWheel);
  f.isInsideStraightDraw = !f.isStraight && (findStraightDrawWindow(shape, ctx, [4], false) !== null || f.isInsideStraightDrawWheel);
  f.isStraightDraw = f.isOpenEndedStraightDraw || f.isInsideStraightDraw;
  f.isComboDraw = f.isFlushDraw && f.isStraightDraw;

  // The street limits which draws can still complete: no backdoors on the turn, nothing on the river
  if (ctx.cardCount >= 7) {
    for (const draw of DRAWS) f[draw] = false;
  } else if (ctx.cardCount === 6) {
    f.isBackdoorFlushDraw = false;
  }

  f.isUnderPair = f.isPair && isUnderPair(shape, ctx);

  const holeCounts = { over: 0, middle: 0, under: 0, paired: 0 };
  for (const c of ctx.holeClassification || []) holeCounts[c]++;
  f.isOvercard = holeCounts.over > 0;
  f.isTwoOvercards = holeCounts.over === 2;
  f.isOvercardAndMiddleCard = holeCounts.over === 1 && holeCounts.middle === 1;
  f.isOvercardAndUndercard = holeCounts.over === 1 && holeCounts.under === 1;
  f.isTwoMiddleCards = holeCounts.middle === 2;
  f.isMiddleAndUndercard = holeCounts.middle === 1 && holeCounts.under === 1;
  f.isTwoUndercards = holeCounts.under === 2;

  f.isHighCard = !f.isPair && !f.isTwoPair && !f.isThreeOfAKind && !f.isFullHouse && !f.isFourOfAKind && !f.isFlush && !f.isStraight;
  return f;
}

/**
 * An under pair is a pocket pair below every board card. Without hole cards the board is
 * unknown, so it needs 6+ cards and means a pair below every other card in the full hand.
 */
function isUnderPair(shape, ctx) {
  const pairRank = shape.rankWithCount(2);
  if (ctx.holeCards) {
    const [first, second] = ctx.holeCards;
    if (second[0] !== first[0] || pairRank !== first[0]) return false;
    return ctx.boardValues.every(v => v > value(first));
  }
  if (ctx.cardCount < 6) return false;
  const others = ctx.fullHand.filter(c => c[0] !== pairRank).map(value);
  return value(pairRank + 's') < Math.min(...others);
}

/**
 * Strict mode for one 5-card hand: only the strongest made hand stays true, position labels
 * only for that hand, and no straight draws once a flush or better is made.
 *
 * @param {Object} f - Flags (modified in place)
 */
function applyStrictMode(f) {
  const strongest = strengthOf(f);
  for (const hand of MADE_HANDS) {
    if (HAND_STRENGTH[hand] < strongest) f[hand] = false;
  }
  if (strongest !== HAND_STRENGTH.isPair) PAIR_LABELS.forEach(label => { f[label] = false; });
  if (strongest !== HAND_STRENGTH.isTwoPair) TWO_PAIR_LABELS.forEach(label => { f[label] = false; });
  if (strongest !== HAND_STRENGTH.isThreeOfAKind) THREE_OF_A_KIND_LABELS.forEach(label => { f[label] = false; });
  if (strongest >= HAND_STRENGTH.isFlush) STRAIGHT_DRAWS.forEach(draw => { f[draw] = false; });
}

/** The strength of the strongest true made hand (10 = royal flush ... 1 = high card, 0 = none). */
function strengthOf(evaluation) {
  const hand = MADE_HANDS.find(h => evaluation[h]);
  return hand ? HAND_STRENGTH[hand] : 0;
}

/**
 * The key cards behind each true flag ([] for false flags).
 *
 * @param {Object} f - Flags
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @returns {Object} Flag name to cards, high to low
 */
function computeKeyCards(f, shape, ctx) {
  const { std } = shape;
  const ofRank = rank => std.filter(c => c[0] === rank);
  const pairCards = () => ofRank(shape.rankWithCount(2));
  const tripsCards = () => ofRank(shape.rankWithCount(3));
  const twoPairCards = () => std.filter(c => shape.rankCounts[c[0]] === 2);
  const flushDrawCards = () => shape.cardsOfSuit(shape.suitWithCount(4));

  const finders = {
    isRoyalFlush: () => std,
    isStraightFlush: () => std,
    isFourOfAKind: () => ofRank(shape.rankWithCount(4)),
    isFullHouse: () => std,
    isFlush: () => shape.cardsOfSuit(shape.suitWithCount(5)),
    isStraight: () => straightCards(shape),
    isThreeOfAKind: tripsCards,
    isTwoPair: twoPairCards,
    isPair: pairCards,
    isTopPair: pairCards,
    isMiddlePair: pairCards,
    isBottomPair: pairCards,
    isTopAndMiddlePair: twoPairCards,
    isTopAndBottomPair: twoPairCards,
    isMiddleAndBottomPair: twoPairCards,
    isTopThreeOfAKind: tripsCards,
    isMiddleThreeOfAKind: tripsCards,
    isBottomThreeOfAKind: tripsCards,
    isFlushDraw: flushDrawCards,
    isBackdoorFlushDraw: () => shape.cardsOfSuit(shape.suitWithCount(3)),
    isOpenEndedStraightDraw: () => straightDrawCards(shape, ctx, [3]),
    isInsideStraightDraw: () => straightDrawCards(shape, ctx, [4]),
    isStraightDraw: () => straightDrawCards(shape, ctx, [3, 4]),
    isStraightWheel: () => straightCards(shape),
    isOpenEndedStraightDrawWheel: () => straightDrawCards(shape, ctx, [3]),
    isInsideStraightDrawWheel: () => straightDrawCards(shape, ctx, [4]),
    isComboDraw: () => sortDesc([...new Set([...flushDrawCards(), ...straightDrawCards(shape, ctx, [3, 4])])]),
    isUnderPair: pairCards,
    isOvercard: () => sortDesc(ctx.holeCards.filter((c, i) => ctx.holeClassification[i] === 'over')),
    isHighCard: () => []
  };
  for (const category of HOLE_CARD_CATEGORIES) {
    if (category !== 'isOvercard') finders[category] = () => sortDesc(ctx.holeCards);
  }

  const keyCards = {};
  for (const flag of ALL_FLAGS) keyCards[flag] = f[flag] ? [...finders[flag]()] : [];
  return keyCards;
}

/**
 * The kicker cards for each true flag: the cards outside its key cards ([] for false flags).
 * High card's kickers are all five cards. Hole card categories describe the hole cards against
 * the board, so their kickers come from the full hand.
 */
function computeKickerCards(f, keyCards, shape, ctx) {
  const kickerCards = {};
  for (const flag of ALL_FLAGS) {
    const keys = new Set(keyCards[flag]);
    if (!f[flag]) {
      kickerCards[flag] = [];
    } else if (flag === 'isHighCard') {
      kickerCards[flag] = [...shape.std];
    } else if (keys.size === 0) {
      kickerCards[flag] = [];
    } else if (HOLE_CARD_CATEGORY_SET.has(flag)) {
      kickerCards[flag] = sortDesc(ctx.fullHand.filter(c => !keys.has(c)));
    } else {
      kickerCards[flag] = shape.std.filter(c => !keys.has(c));
    }
  }
  return kickerCards;
}

/**
 * Works out the flags for five cards, without key or kicker cards. Cheap enough to run on every
 * combination; pass the result to toEvaluation for the ones that are returned.
 *
 * @param {string[]} five - Five cards
 * @param {Object} ctx - The hand context from buildContext
 * @param {boolean} strict - Apply strict mode
 * @returns {{shape: Object, flags: Object}} The analysed hand
 */
function analyzeFlags(five, ctx, strict) {
  const shape = describeFive(five);
  const flags = computeFlags(shape, ctx);
  if (strict) applyStrictMode(flags);
  return { shape, flags };
}

/**
 * Builds the evaluation object (flags, keyCards, kickerCards) for an analysed hand.
 *
 * @param {{shape: Object, flags: Object}} analysed - From analyzeFlags
 * @param {Object} ctx - The hand context
 * @returns {Object} The evaluation
 */
function toEvaluation({ shape, flags }, ctx) {
  const evaluation = {};
  for (const flag of ALL_FLAGS) evaluation[flag] = flags[flag];
  evaluation.keyCards = computeKeyCards(flags, shape, ctx);
  evaluation.kickerCards = computeKickerCards(flags, evaluation.keyCards, shape, ctx);
  return evaluation;
}

/**
 * Tiebreak ranks for comparing hands of the same strength: ranks grouped by how often they appear
 * (so a full house compares its three of a kind before its pair), then high to low. A straight
 * compares by its top card, with the wheel's Ace counting low.
 *
 * @param {{shape: Object, flags: Object}} analysed - From analyzeFlags
 * @returns {number[]} Ranks to compare in order
 */
function tiebreakRanks({ shape, flags }) {
  if (flags.isStraight || flags.isStraightFlush || flags.isRoyalFlush) {
    return [flags.isStraightWheel ? 4 : value(shape.std[0])];
  }
  return [...shape.ranks]
    .sort((a, b) => b.count - a.count || RANK_VALUE_OF[b.rank] - RANK_VALUE_OF[a.rank])
    .flatMap(r => Array(r.count).fill(RANK_VALUE_OF[r.rank]));
}

const RANK_VALUE_OF = Object.fromEntries('AKQJT98765432'.split('').map((rank, i) => [rank, 13 - i]));

module.exports = { analyzeFlags, toEvaluation, buildContext, strengthOf, tiebreakRanks };
