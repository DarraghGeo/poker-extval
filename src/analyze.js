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

const { RANKS, SUITS, RANK_VALUES, WHEEL_VALUES, value, wheelValue, sortDesc } = require('./cards');
const { defineLazyGroup } = require('./lazy');
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
 * @param {string|null} [street=null] - 'flop', 'turn' or 'river'; inferred from the card count when null
 * @param {boolean} [flat=false] - Give evaluations evaluate()'s leading properties (see newFlatFlags)
 * @returns {Object} The context used by analyzeFlags
 */
function buildContext(fullHand, holeCards, street = null, flat = false) {
  const holeSet = new Set(holeCards || []);
  const board = fullHand.filter(c => !holeSet.has(c));
  const boardValues = board.map(value);
  const holeClassification = classifyHoleCards(holeCards, board);
  const holeCounts = { over: 0, middle: 0, under: 0, paired: 0 };
  for (const c of holeClassification || []) holeCounts[c]++;
  let boardRankMask = 0;
  for (const card of board) boardRankMask |= CARD[card].mask;
  return {
    fullHand,
    holeCards,
    holeSet,
    holeRanks: new Set((holeCards || []).map(c => c[0])),
    board,
    boardRanks: new Set(board.map(c => c[0])),
    boardRankMask,
    boardValues,
    boardHighest: Math.max(...boardValues),
    boardLowest: Math.min(...boardValues),
    cardCount: fullHand.length,
    street: street || streetFor(fullHand.length),
    holeClassification,
    holeCounts,
    flat
  };
}

/**
 * The street implied by the number of cards: 5 is the flop, 6 the turn, 7 or more the river.
 *
 * @param {number} cardCount - Cards in the full hand
 * @returns {string} 'flop', 'turn' or 'river'
 */
function streetFor(cardCount) {
  if (cardCount <= 5) return 'flop';
  return cardCount === 6 ? 'turn' : 'river';
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
 * A rank on the board is 'top', 'middle' or 'bottom' by where it sits among the board ranks. A
 * pocket pair the board does not have is 'over' (above every board card), 'under' (below every
 * board card) or 'middle' (in between).
 *
 * @param {string|null} rank - The rank to classify
 * @param {Object} ctx - The hand context
 * @returns {string|null} 'over', 'top', 'middle', 'bottom', 'under', 'none' (no hole card has
 *   the rank, so it belongs to the board), or null without hole cards
 */
function boardPosition(rank, ctx) {
  if (!ctx.holeCards) return null;
  if (!rank || !ctx.holeRanks.has(rank)) return 'none';
  const rankValue = RANK_VALUES[rank];
  const highest = ctx.boardHighest;
  const lowest = ctx.boardLowest;
  if (ctx.boardRanks.has(rank)) {
    if (rankValue === highest) return 'top';
    if (rankValue === lowest) return 'bottom';
    return 'middle';
  }
  if (rankValue > highest) return 'over';
  if (rankValue < lowest) return 'under';
  return 'middle';
}

/**
 * Per-card facts, looked up instead of parsing strings: rank, suit, value (A = 13 ... 2 = 1), wheel
 * value (A = 1), and a rank bit. Rank bits run 2 = bit 1 ... A = bit 13, with the Ace also at bit 0
 * so the wheel (A-2-3-4-5) is bits 0-4.
 */
const CARD = {};
for (const rank of RANKS) {
  for (const suit of SUITS) {
    const v = RANK_VALUES[rank];
    CARD[rank + suit] = { rank, suit, v, w: WHEEL_VALUES[rank], mask: rank === 'A' ? (1 << 13) | 1 : 1 << v };
  }
}

/** Rank by rank bit (bit 0 and bit 13 are both the Ace). */
const RANK_BY_BIT = ['A', ...[...RANKS].reverse()];

/** Stable insertion sort, high to low, by a numeric key. */
function sortBy(cards, key) {
  const out = cards.slice();
  for (let i = 1; i < out.length; i++) {
    const card = out[i];
    const k = CARD[card][key];
    let j = i - 1;
    while (j >= 0 && CARD[out[j]][key] < k) {
      out[j + 1] = out[j];
      j--;
    }
    out[j + 1] = card;
  }
  return out;
}

/**
 * Precomputes the sorted order and counts every check reads. Works for any number of cards.
 *
 * @param {string[]} cards - The cards (five, or the whole hand for its draws)
 * @returns {Object} The hand's shape
 */
function describeFive(cards) {
  const std = sortBy(cards, 'v');
  const rankCounts = {};
  // Distinct ranks from highest to lowest, with how often each appears. Built from the sorted
  // cards, since an object lists digit keys ('2'-'9') first whatever order they were added in.
  const ranks = [];
  let rankMask = 0;
  for (const card of std) {
    const info = CARD[card];
    if (rankCounts[info.rank]) {
      rankCounts[info.rank]++;
      ranks[ranks.length - 1].count++;
    } else {
      rankCounts[info.rank] = 1;
      ranks.push({ rank: info.rank, count: 1 });
      rankMask |= info.mask;
    }
  }
  const counts = ranks.map(r => r.count).sort((a, b) => b - a);
  const suitCounts = {};
  for (const card of cards) suitCounts[card[1]] = (suitCounts[card[1]] || 0) + 1;
  return { cards, std, wheelSorted: null, rankCounts, ranks, counts, suitCounts, rankMask, straightDraws: null };
}

/** The shape's cards sorted high to low with the Ace low (worked out once, when first needed). */
function wheelOrder(shape) {
  if (!shape.wheelSorted) shape.wheelSorted = sortBy(shape.cards, 'w');
  return shape.wheelSorted;
}

/** The rank appearing exactly n times (the highest such rank), or null. */
function rankWithCount(shape, n) {
  for (const r of shape.ranks) if (r.count === n) return r.rank;
  return null;
}

/** The suit appearing exactly n times, or null. */
function suitWithCount(shape, n) {
  for (const suit in shape.suitCounts) if (shape.suitCounts[suit] === n) return suit;
  return null;
}

/** The shape's cards of one suit, high to low. */
function cardsOfSuit(shape, suit) {
  return shape.std.filter(c => c[1] === suit);
}

/** Every straight as a rank mask, the wheel (A-2-3-4-5, bits 0-4) first. */
const STRAIGHT_MASKS = Array.from({ length: 10 }, (_, low) => 0b11111 << low);

/** The ranks of a rank mask, high bit first (bit 0 counts as the Ace). */
function ranksOfMask(mask) {
  const ranks = [];
  for (let bit = 13; bit >= 0; bit--) if (mask & (1 << bit)) ranks.push(RANK_BY_BIT[bit]);
  return ranks;
}

/** Number of set bits in a rank mask. */
function bitCount(mask) {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}

/**
 * Works out the hand's straight draws by their outs. A straight completes when one more rank
 * gives five in a row; the ranks that do it are the outs. With hole cards, a completion only
 * counts when its four ranks include one the board does not have, so the draw is the player's.
 *
 * Two or more out ranks is open-ended (8 outs), which includes double gutshots; exactly one is an
 * inside draw (4 outs), which includes one-ended draws such as A-K-Q-J and A-2-3-4. Paired cards
 * count once. Cached on the shape.
 *
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @returns {{outs: string[], completions: Array<{out: string, ranks: string[], wheel: boolean}>}}
 */
function straightDraws(shape, ctx) {
  if (shape.straightDraws) return shape.straightDraws;
  const completions = [];
  let outMask = 0;
  for (let i = 0; i < STRAIGHT_MASKS.length; i++) {
    const present = shape.rankMask & STRAIGHT_MASKS[i];
    if (bitCount(present) !== 4) continue;
    if (ctx.holeCards && (present & ~ctx.boardRankMask) === 0) continue;
    const missing = STRAIGHT_MASKS[i] & ~present;
    // The wheel's missing card is never the Ace's low bit's twin: bit 0 and bit 13 are both 'A'
    outMask |= missing === 1 ? 1 << 13 : missing;
    completions.push({ out: RANK_BY_BIT[bitIndex(missing)], ranks: ranksOfMask(present), wheel: i === 0 });
  }
  return (shape.straightDraws = { outs: ranksOfMask(outMask), completions });
}

/** Index of the single set bit in a mask. */
function bitIndex(mask) {
  return 31 - Math.clz32(mask);
}

/**
 * The cards behind a straight draw. For each out, the highest straight it completes counts; the
 * key cards are one card for every rank those straights use (a hole card where the hand has two
 * of that rank), high to low, with the Ace last when every one is the wheel. A-K-Q-J-9 needs a
 * T for A-K-Q-J-T, so its key cards are A-K-Q-J; a double gutshot such as K-J-T-9-7 uses all five.
 *
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @param {boolean} [wheelOnly=false] - Only the completions that make the wheel
 * @returns {string[]} The cards
 */
function straightDrawCards(shape, ctx, wheelOnly = false) {
  const highestByOut = new Map();
  // STRAIGHTS runs low to high, so the last completion for an out is its highest straight
  for (const completion of straightDraws(shape, ctx).completions) {
    if (!wheelOnly || completion.wheel) highestByOut.set(completion.out, completion);
  }
  const completions = [...highestByOut.values()];
  const ranks = new Set(completions.flatMap(c => c.ranks));
  const cards = [...ranks].map(rank => {
    const ofRank = shape.std.filter(c => c[0] === rank);
    return ofRank.find(c => ctx.holeSet.has(c)) || ofRank[0];
  });
  const allWheel = completions.length > 0 && completions.every(c => c.wheel);
  return sortBy(cards, allWheel ? 'w' : 'v');
}

/** True without hole cards, or when one of the cards is a hole card. */
function usesHoleCard(cards, ctx) {
  return !ctx.holeCards || cards.some(c => ctx.holeSet.has(c));
}

/** The five cards of a made straight, high to low (Ace last for a wheel). */
function straightCards(shape) {
  const consecutive = (cards, rankValue) => cards.every((c, i) => i === 0 || rankValue(cards[i - 1]) - rankValue(c) === 1);
  if (consecutive(shape.std, value)) return shape.std;
  const wheel = wheelOrder(shape);
  if (consecutive(wheel, wheelValue)) return wheel;
  return [];
}

/**
 * A flag object with every flag false, its properties in ALL_FLAGS order. Written out in full so
 * every evaluation shares one fixed object shape, which keeps reading and copying flags fast.
 */
function newFlags() {
  return {
    isRoyalFlush: false, isStraightFlush: false, isFourOfAKind: false, isFullHouse: false, isFlush: false,
    isStraight: false, isThreeOfAKind: false, isTwoPair: false, isPair: false,
    isOverPair: false, isTopPair: false, isMiddlePair: false, isBottomPair: false,
    isTopAndMiddlePair: false, isTopAndBottomPair: false, isMiddleAndBottomPair: false,
    isTopThreeOfAKind: false, isMiddleThreeOfAKind: false, isBottomThreeOfAKind: false,
    isFlushDraw: false, isBackdoorFlushDraw: false, isOpenEndedStraightDraw: false, isInsideStraightDraw: false,
    isStraightDraw: false, isStraightWheel: false, isOpenEndedStraightDrawWheel: false, isInsideStraightDrawWheel: false,
    isComboDraw: false, isUnderPair: false,
    isOvercard: false, isTwoOvercards: false, isOvercardAndMiddleCard: false, isOvercardAndUndercard: false,
    isTwoMiddleCards: false, isMiddleAndUndercard: false, isTwoUndercards: false,
    isHighCard: false
  };
}
if (Object.keys(newFlags()).join() !== ALL_FLAGS.join()) throw new Error('newFlags() is out of step with ALL_FLAGS');

/** The properties evaluate() puts before the flags. */
const FLAT_PREFIX = ['hand', 'category', 'strength', 'rank', 'street'];

/**
 * Like newFlags, with evaluate()'s leading properties first, so evaluate() can fill in one object
 * instead of copying every flag into a second one.
 */
function newFlatFlags() {
  return {
    hand: null, category: null, strength: null, rank: null, street: null,
    isRoyalFlush: false, isStraightFlush: false, isFourOfAKind: false, isFullHouse: false, isFlush: false,
    isStraight: false, isThreeOfAKind: false, isTwoPair: false, isPair: false,
    isOverPair: false, isTopPair: false, isMiddlePair: false, isBottomPair: false,
    isTopAndMiddlePair: false, isTopAndBottomPair: false, isMiddleAndBottomPair: false,
    isTopThreeOfAKind: false, isMiddleThreeOfAKind: false, isBottomThreeOfAKind: false,
    isFlushDraw: false, isBackdoorFlushDraw: false, isOpenEndedStraightDraw: false, isInsideStraightDraw: false,
    isStraightDraw: false, isStraightWheel: false, isOpenEndedStraightDrawWheel: false, isInsideStraightDrawWheel: false,
    isComboDraw: false, isUnderPair: false,
    isOvercard: false, isTwoOvercards: false, isOvercardAndMiddleCard: false, isOvercardAndUndercard: false,
    isTwoMiddleCards: false, isMiddleAndUndercard: false, isTwoUndercards: false,
    isHighCard: false
  };
}
if (Object.keys(newFlatFlags()).join() !== [...FLAT_PREFIX, ...ALL_FLAGS].join()) throw new Error('newFlatFlags() is out of step with ALL_FLAGS');

/**
 * Works out every flag for five cards.
 *
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @returns {Object} Flag name to boolean
 */
function computeFlags(shape, ctx) {
  const { std, rankCounts, ranks, counts, suitCounts } = shape;
  const f = ctx.flat ? newFlatFlags() : newFlags();

  f.isFourOfAKind = counts[0] === 4 && counts[1] === 1;
  f.isFullHouse = counts[0] === 3 && counts[1] === 2;
  f.isThreeOfAKind = counts[0] === 3 && counts[1] === 1 && counts[2] === 1;
  f.isTwoPair = counts[0] === 2 && counts[1] === 2 && counts[2] === 1;
  f.isPair = counts[0] === 2 && counts[1] === 1 && counts[2] === 1 && counts[3] === 1;
  f.isFlush = Object.values(suitCounts).includes(5);

  const allDistinct = ranks.length === 5;
  // The wheel is A-2-3-4-5 only: five distinct ranks topped by A then 5 can only be that
  f.isStraightWheel = allDistinct && std[0][0] === 'A' && std[1][0] === '5';
  f.isStraight = allDistinct && (value(std[0]) - value(std[4]) === 4 || f.isStraightWheel);
  f.isRoyalFlush = f.isFlush && f.isStraight && std[0][0] === 'A' && std[4][0] === 'T';
  f.isStraightFlush = f.isFlush && f.isStraight && !f.isRoyalFlush;

  // Position labels: against the whole board with hole cards, else within these five cards
  const top = std[0][0];
  const bottom = std[4][0];
  const pairPosition = f.isPair ? boardPosition(rankWithCount(shape, 2), ctx) : null;
  f.isOverPair = f.isPair && pairPosition === 'over';
  f.isTopPair = f.isPair && (pairPosition !== null ? pairPosition === 'top' : rankCounts[top] === 2);
  f.isMiddlePair = f.isPair && (pairPosition !== null ? pairPosition === 'middle' : ranks.length === 4 && (ranks[1].count === 2 || ranks[2].count === 2));
  f.isBottomPair = f.isPair && (pairPosition !== null ? pairPosition === 'bottom' : rankCounts[bottom] === 2);

  // Two pair with hole cards: both pairs must use a hole card, judged against the board
  const pairRanks = ranks.filter(r => r.count === 2).map(r => r.rank);
  const twoPairPositions = f.isTwoPair && ctx.holeCards ? pairRanks.map(rank => boardPosition(rank, ctx)).join() : null;
  f.isTopAndMiddlePair = f.isTwoPair && (twoPairPositions !== null ? twoPairPositions === 'top,middle' : ranks[0].count === 2 && ranks[1].count === 2);
  f.isTopAndBottomPair = f.isTwoPair && (twoPairPositions !== null ? twoPairPositions === 'top,bottom' : ranks[0].count === 2 && ranks[ranks.length - 1].count === 2);
  f.isMiddleAndBottomPair = f.isTwoPair && (twoPairPositions !== null ? twoPairPositions === 'middle,bottom' : ranks.length === 3 && ranks[1].count === 2 && ranks[2].count === 2);

  const tripsPosition = f.isThreeOfAKind ? boardPosition(rankWithCount(shape, 3), ctx) : null;
  f.isTopThreeOfAKind = f.isThreeOfAKind && (tripsPosition !== null ? tripsPosition === 'top' : rankCounts[top] === 3);
  f.isMiddleThreeOfAKind = f.isThreeOfAKind && (tripsPosition !== null ? tripsPosition === 'middle' : ranks.length === 3 && ranks[1].count === 3);
  f.isBottomThreeOfAKind = f.isThreeOfAKind && (tripsPosition !== null ? tripsPosition === 'bottom' : rankCounts[bottom] === 3);

  // Flush draws must use a hole card when hole cards are supplied
  const suitedDraw = n => Object.keys(suitCounts).some(s => suitCounts[s] === n && usesHoleCard(cardsOfSuit(shape, s), ctx));
  f.isFlushDraw = !f.isFlush && suitedDraw(4);
  f.isBackdoorFlushDraw = !f.isFlush && !f.isFlushDraw && suitedDraw(3);

  // Straight draws by outs (none once a straight is made): two or more out ranks is open-ended,
  // one is inside. The wheel flags mark draws where one of the completions is A-2-3-4-5.
  const draws = f.isStraight ? { outs: [], completions: [] } : straightDraws(shape, ctx);
  const drawsToWheel = draws.completions.some(c => c.wheel);
  f.isOpenEndedStraightDraw = draws.outs.length >= 2;
  f.isInsideStraightDraw = draws.outs.length === 1;
  f.isStraightDraw = draws.outs.length > 0;
  f.isOpenEndedStraightDrawWheel = f.isOpenEndedStraightDraw && drawsToWheel;
  f.isInsideStraightDrawWheel = f.isInsideStraightDraw && drawsToWheel;
  f.isComboDraw = f.isFlushDraw && f.isStraightDraw;

  // The street limits which draws can still complete: no backdoors on the turn, nothing on the river
  if (ctx.street === 'river') {
    for (const draw of DRAWS) f[draw] = false;
  } else if (ctx.street === 'turn') {
    f.isBackdoorFlushDraw = false;
  }

  f.isUnderPair = f.isPair && isUnderPair(shape, ctx);

  const holeCounts = ctx.holeCounts;
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
  const pairRank = rankWithCount(shape, 2);
  if (ctx.holeCards) return boardPosition(pairRank, ctx) === 'under';
  if (ctx.cardCount < 6) return false;
  const others = ctx.fullHand.filter(c => c[0] !== pairRank).map(value);
  return RANK_VALUES[pairRank] < Math.min(...others);
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
  const pairCards = () => ofRank(rankWithCount(shape, 2));
  const tripsCards = () => ofRank(rankWithCount(shape, 3));
  const twoPairCards = () => std.filter(c => shape.rankCounts[c[0]] === 2);
  const flushDrawCards = () => cardsOfSuit(shape, suitWithCount(shape, 4));

  const finders = {
    isRoyalFlush: () => std,
    isStraightFlush: () => std,
    isFourOfAKind: () => ofRank(rankWithCount(shape, 4)),
    isFullHouse: () => std,
    isFlush: () => cardsOfSuit(shape, suitWithCount(shape, 5)),
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
    isBackdoorFlushDraw: () => cardsOfSuit(shape, suitWithCount(shape, 3)),
    isOpenEndedStraightDraw: () => straightDrawCards(shape, ctx),
    isInsideStraightDraw: () => straightDrawCards(shape, ctx),
    isStraightDraw: () => straightDrawCards(shape, ctx),
    isStraightWheel: () => straightCards(shape),
    isOpenEndedStraightDrawWheel: () => straightDrawCards(shape, ctx, true),
    isInsideStraightDrawWheel: () => straightDrawCards(shape, ctx, true),
    isComboDraw: () => sortDesc([...new Set([...flushDrawCards(), ...straightDrawCards(shape, ctx)])]),
    isUnderPair: pairCards,
    isOverPair: pairCards,
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
 * Builds the evaluation object for an analysed hand. The flags are set straight away; keyCards,
 * kickerCards and usesHoleCards are lazy, worked out the first time one of them is read.
 *
 * @param {{shape: Object, flags: Object}} analysed - From analyzeFlags
 * @param {Object} ctx - The hand context
 * @param {Object|null} [draws=null] - Whole-hand draws (from wholeHandDraws) replacing the five's own
 * @returns {Object} The evaluation
 */
function toEvaluation({ shape, flags }, ctx, draws = null) {
  // The flags object (fixed shape, ALL_FLAGS order) becomes the evaluation itself
  const evaluation = flags;
  // The five's own draw flags, kept for its key cards before the whole-hand draws replace them
  const fiveDraws = draws ? DRAWS.map(draw => flags[draw]) : null;
  if (draws) Object.assign(evaluation, draws.flags);
  let lists = null;
  defineLazyGroup(evaluation, LAZY_KEYS, key => {
    if (key === 'usesHoleCards') return usesHoleCards(evaluation, shape, ctx);
    if (!lists) lists = cardLists(evaluation, shape, ctx, draws, fiveDraws);
    return lists[key];
  });
  return evaluation;
}

const LAZY_KEYS = ['keyCards', 'kickerCards', 'usesHoleCards'];

/** keyCards and kickerCards for an evaluation (see toEvaluation). */
function cardLists(evaluation, shape, ctx, draws, fiveDraws) {
  let fiveFlags = evaluation;
  if (draws) {
    // Only the flag properties: the evaluation also carries the lazy card lists being built here
    fiveFlags = newFlags();
    for (const flag of ALL_FLAGS) fiveFlags[flag] = evaluation[flag];
    DRAWS.forEach((draw, i) => { fiveFlags[draw] = fiveDraws[i]; });
  }
  const keyCards = computeKeyCards(fiveFlags, shape, ctx);
  const kickerCards = computeKickerCards(fiveFlags, keyCards, shape, ctx);
  if (draws) {
    const drawCards = draws.cards();
    for (const draw of DRAWS) {
      keyCards[draw] = drawCards.keyCards[draw];
      kickerCards[draw] = drawCards.kickerCards[draw];
    }
  }
  return { keyCards, kickerCards };
}

/**
 * The draws of the whole hand (6 or more cards), for strict mode. A draw is the hand's when some
 * of its cards make it: four of a suit (with a hole card), or ranks one card from a straight. Working
 * on the whole hand rather than on each five-card subset finds draws no single subset holds, such as
 * K-Q-T-9-7-6 drawing to both K-high (a J) and T-high (an 8): open-ended, not inside.
 *
 * Draws the made hand already beats are dropped (straight draws once a straight or better is made,
 * flush draws once a flush or better is made), and the street rules apply. Key cards follow the
 * five-card rules; kicker cards are the rest of the full hand.
 *
 * @param {Object} ctx - The hand context
 * @param {number} strongest - Strength of the best made hand (HAND_STRENGTH)
 * @returns {{flags: Object, cards: Function}} Draw flags, and a function returning their key and kicker cards
 */
function wholeHandDraws(ctx, strongest) {
  const shape = describeFive(ctx.fullHand);
  const f = {};
  const flushMade = strongest >= HAND_STRENGTH.isFlush;
  const suitFor = n => Object.keys(shape.suitCounts).find(s => shape.suitCounts[s] === n && usesHoleCard(cardsOfSuit(shape, s), ctx)) || null;
  const flushSuit = flushMade ? null : suitFor(4);
  const backdoorSuit = flushMade || flushSuit ? null : suitFor(3);
  f.isFlushDraw = flushSuit !== null;
  f.isBackdoorFlushDraw = backdoorSuit !== null;

  const draws = strongest >= HAND_STRENGTH.isStraight ? { outs: [], completions: [] } : straightDraws(shape, ctx);
  const drawsToWheel = draws.completions.some(c => c.wheel);
  f.isOpenEndedStraightDraw = draws.outs.length >= 2;
  f.isInsideStraightDraw = draws.outs.length === 1;
  f.isStraightDraw = draws.outs.length > 0;
  f.isOpenEndedStraightDrawWheel = f.isOpenEndedStraightDraw && drawsToWheel;
  f.isInsideStraightDrawWheel = f.isInsideStraightDraw && drawsToWheel;
  f.isComboDraw = f.isFlushDraw && f.isStraightDraw;

  if (ctx.street === 'river') {
    for (const draw of DRAWS) f[draw] = false;
  } else if (ctx.street === 'turn') {
    f.isBackdoorFlushDraw = false;
  }

  const cards = () => {
    const straight = f.isStraightDraw ? straightDrawCards(shape, ctx) : [];
    const wheelCards = f.isOpenEndedStraightDrawWheel || f.isInsideStraightDrawWheel ? straightDrawCards(shape, ctx, true) : [];
    const flush = f.isFlushDraw ? cardsOfSuit(shape, flushSuit) : [];
    const keyCards = {
      isFlushDraw: flush,
      isBackdoorFlushDraw: f.isBackdoorFlushDraw ? cardsOfSuit(shape, backdoorSuit) : [],
      isOpenEndedStraightDraw: f.isOpenEndedStraightDraw ? straight : [],
      isInsideStraightDraw: f.isInsideStraightDraw ? straight : [],
      isStraightDraw: straight,
      isOpenEndedStraightDrawWheel: f.isOpenEndedStraightDrawWheel ? wheelCards : [],
      isInsideStraightDrawWheel: f.isInsideStraightDrawWheel ? wheelCards : [],
      isComboDraw: f.isComboDraw ? sortDesc([...new Set([...flush, ...straight])]) : []
    };
    const kickerCards = {};
    for (const draw of DRAWS) {
      const keys = new Set(keyCards[draw]);
      keyCards[draw] = [...keyCards[draw]];
      kickerCards[draw] = keys.size ? sortDesc(ctx.fullHand.filter(c => !keys.has(c))) : [];
    }
    return { keyCards, kickerCards };
  };
  return { flags: f, cards };
}

/**
 * Whether the strongest made hand uses a hole card: one of its key cards (or, for high card, one
 * of the five cards) is a hole card. False means the player is playing the board, e.g. A-K on
 * 8-8-3 has a pair, but it is the board's.
 *
 * @param {Object} evaluation - Flags and keyCards
 * @param {Object} shape - From describeFive
 * @param {Object} ctx - The hand context
 * @returns {boolean|null} null without hole cards
 */
function usesHoleCards(evaluation, shape, ctx) {
  if (!ctx.holeCards) return null;
  const hand = MADE_HANDS.find(h => evaluation[h]);
  const cards = hand === 'isHighCard' ? shape.std : evaluation.keyCards[hand];
  return cards.some(c => ctx.holeSet.has(c));
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
    .sort((a, b) => b.count - a.count || RANK_VALUES[b.rank] - RANK_VALUES[a.rank])
    .flatMap(r => Array(r.count).fill(RANK_VALUES[r.rank]));
}

module.exports = { analyzeFlags, toEvaluation, wholeHandDraws, buildContext, strengthOf, tiebreakRanks, streetFor };
