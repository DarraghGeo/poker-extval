/**
 * Evaluates a full hand of 5 or more cards: every 5-card combination, or in strict mode the
 * best one with the hand's draws collected from all of them.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { sortDesc, combinations, formatHandKey } = require('./cards');
const { HAND_STRENGTH, STRAIGHT_DRAWS, FLUSH_DRAWS, DRAWS } = require('./flags');
const { analyzeFlags, toEvaluation, buildContext, strengthOf, tiebreakRanks } = require('./analyze');

/**
 * Compares two analysed hands (from analyzeFlags, in strict mode).
 *
 * @returns {number} Positive if `a` is the stronger hand, negative if `b` is, 0 if equal
 */
function compareAnalysed(a, b) {
  const strength = strengthOf(a.flags) - strengthOf(b.flags);
  if (strength !== 0) return strength;
  const ranksA = tiebreakRanks(a);
  const ranksB = tiebreakRanks(b);
  for (let i = 0; i < ranksA.length; i++) {
    if (ranksA[i] !== ranksB[i]) return ranksA[i] - ranksB[i];
  }
  return 0;
}

/**
 * In strict mode only the best combination is returned, but a draw can use cards outside it
 * (e.g. the hole card that makes four to a flush). Copies onto the best evaluation every draw
 * found in any combination, with that combination's key and kicker cards, then drops draws the
 * made hand already beats and recomputes the combo draw for the whole hand.
 *
 * @param {Object} best - The best combination's evaluation (modified in place)
 * @param {Object[]} analysed - Every combination, from analyzeFlags, in combination order
 * @param {Object} ctx - The hand context
 */
function mergeDraws(best, analysed, ctx) {
  const clear = draw => {
    best[draw] = false;
    best.keyCards[draw] = [];
    best.kickerCards[draw] = [];
  };
  const evaluations = new Map();
  const evaluationOf = hand => {
    if (!evaluations.has(hand)) evaluations.set(hand, toEvaluation(hand, ctx));
    return evaluations.get(hand);
  };
  for (const draw of DRAWS) {
    if (draw === 'isComboDraw' || best[draw]) continue;
    const source = analysed.find(hand => hand.flags[draw]);
    if (!source) continue;
    best[draw] = true;
    best.keyCards[draw] = evaluationOf(source).keyCards[draw];
    best.kickerCards[draw] = evaluationOf(source).kickerCards[draw];
  }

  // A made straight or better needs no straight draw; a made flush or better needs no flush draw
  const strongest = strengthOf(best);
  if (strongest >= HAND_STRENGTH.isStraight) STRAIGHT_DRAWS.forEach(clear);
  if (strongest >= HAND_STRENGTH.isFlush) FLUSH_DRAWS.forEach(clear);

  const hasBoth = best.isFlushDraw && best.isStraightDraw;
  if (!hasBoth) {
    clear('isComboDraw');
    return;
  }
  if (best.isComboDraw) return;
  best.isComboDraw = true;
  const keyCards = sortDesc([...new Set([...best.keyCards.isFlushDraw, ...best.keyCards.isStraightDraw])]);
  best.keyCards.isComboDraw = keyCards;
  best.kickerCards.isComboDraw = sortDesc(ctx.fullHand.filter(c => !keyCards.includes(c)));
}

/**
 * In non-strict mode every combination is returned on its own, but a draw to a hand the full
 * hand has already made is not a draw: drops straight draws from every combination once any
 * combination makes a straight or better, and flush draws once any makes a flush or better.
 *
 * @param {Object[]} analysed - Every combination, from analyzeFlags (modified in place)
 */
function dropMadeDraws(analysed) {
  const strongest = Math.max(...analysed.map(hand => strengthOf(hand.flags)));
  for (const { flags } of analysed) {
    if (strongest >= HAND_STRENGTH.isStraight) STRAIGHT_DRAWS.forEach(draw => { flags[draw] = false; });
    if (strongest >= HAND_STRENGTH.isFlush) FLUSH_DRAWS.forEach(draw => { flags[draw] = false; });
    flags.isComboDraw = flags.isFlushDraw && flags.isStraightDraw;
  }
}

/**
 * Evaluates the hand. Inputs must already be validated.
 *
 * @param {string[]} cards - 5 or more cards
 * @param {boolean} strict - Strict mode
 * @param {string[]|null} holeCards - The player's hole cards, or null
 * @param {string|null} [street=null] - 'flop', 'turn' or 'river'; inferred from the card count when null
 * @returns {Object<string, Object>} Evaluations keyed by 5-card hand
 */
function evaluateCards(cards, strict, holeCards, street = null) {
  const ctx = buildContext(cards, holeCards, street);
  const fives = cards.length === 5 ? [cards] : combinations(cards, 5);
  const analysed = fives.map(five => analyzeFlags(five, ctx, strict));
  if (!strict) dropMadeDraws(analysed);
  if (!strict || fives.length === 1) {
    const result = {};
    fives.forEach((five, i) => { result[formatHandKey(five)] = toEvaluation(analysed[i], ctx); });
    return result;
  }
  // The first of equally strong combinations is kept
  let bestIndex = 0;
  for (let i = 1; i < analysed.length; i++) {
    if (compareAnalysed(analysed[i], analysed[bestIndex]) > 0) bestIndex = i;
  }
  const best = toEvaluation(analysed[bestIndex], ctx);
  mergeDraws(best, analysed, ctx);
  return { [formatHandKey(fives[bestIndex])]: best };
}

/**
 * A comparable rank for five cards: [strength, ...tiebreak ranks]. Compare element by element;
 * the higher array is the stronger hand.
 *
 * @param {string[]} five - Five cards
 * @returns {number[]} The rank
 */
function rankFive(five) {
  const analysed = analyzeFlags(five, buildContext(five, null), true);
  return [strengthOf(analysed.flags), ...tiebreakRanks(analysed)];
}

module.exports = { evaluateCards, compareAnalysed, rankFive };
