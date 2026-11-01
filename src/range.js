/**
 * Villain range blockers: which villain combos the known cards rule out, and what the blocked
 * combos would have made.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { RANKS, SUITS } = require('./cards');
const { MADE_HANDS, VILLAIN_DRAWS } = require('./flags');

/**
 * Expands a villain range into exact two-card combos, in input order and without duplicates.
 * Each combo is written high rank first, with suits ordered s, h, d, c for pairs (e.g. 'AhKd', 'QsQh').
 *
 * @param {string[]} villainRange - Exact combos ('AhKd') or shorthand ('QQ', 'TT+', 'AKs', 'AKo', 'AK', 'ATs+')
 * @returns {string[]} Exact combos
 * @throws {Error} If villainRange is not an array or an entry is not a valid combo or shorthand
 */
function parseVillainRange(villainRange) {
  if (!Array.isArray(villainRange)) {
    throw new Error('Villain range must be an array');
  }
  const combos = [];
  const seen = new Set();
  const add = (first, second) => {
    const order = c => RANKS.indexOf(c[0]) * 4 + SUITS.indexOf(c[1]);
    const [a, b] = order(first) <= order(second) ? [first, second] : [second, first];
    if (!seen.has(a + b)) {
      seen.add(a + b);
      combos.push(a + b);
    }
  };
  const addRanks = (high, low, type) => {
    for (const s1 of SUITS) {
      for (const s2 of SUITS) {
        if (high === low ? SUITS.indexOf(s2) <= SUITS.indexOf(s1) : (type === 's' && s1 !== s2) || (type === 'o' && s1 === s2)) continue;
        add(high + s1, low + s2);
      }
    }
  };

  villainRange.forEach((entry, i) => {
    const invalid = () => new Error(`Invalid villain range entry at index ${i}: "${entry}"`);
    if (typeof entry !== 'string') throw invalid();

    const exact = entry.match(/^([AKQJT2-9])([shdc])([AKQJT2-9])([shdc])$/);
    if (exact) {
      const [first, second] = [exact[1] + exact[2], exact[3] + exact[4]];
      if (first === second) throw invalid();
      add(first, second);
      return;
    }

    const shorthand = entry.match(/^([AKQJT2-9])([AKQJT2-9])([so]?)(\+?)$/);
    if (!shorthand) throw invalid();
    const [, r1, r2, type, plus] = shorthand;
    const [high, low] = RANKS.indexOf(r1) <= RANKS.indexOf(r2) ? [r1, r2] : [r2, r1];
    if (high === low) {
      if (type) throw invalid();
      const lows = plus ? RANKS.slice(0, RANKS.indexOf(high) + 1) : high;
      for (const rank of lows) addRanks(rank, rank);
      return;
    }
    const lows = plus ? RANKS.slice(RANKS.indexOf(high) + 1, RANKS.indexOf(low) + 1) : low;
    for (const rank of lows) addRanks(high, rank, type);
  });
  return combos;
}

/**
 * Splits villain combos by which known cards block them. See the README's Villain Range Blockers
 * section for the shape.
 *
 * @param {string[]} combos - Exact combos from parseVillainRange
 * @param {string[]} fullHand - Every card passed in
 * @param {string[]|null} holeCards - Hero's hole cards, or null (every card is then board)
 * @param {Function} evaluateCards - The hand evaluator, used to categorise villain's combos
 * @returns {{boardBlocks: Object, heroBlocks: Object, allBlocks: Object}} Each with `unblocked` and `blocked`
 */
function classifyVillainRange(combos, fullHand, holeCards, evaluateCards) {
  const heroCards = new Set(holeCards || []);
  const boardCards = new Set(fullHand.filter(c => !heroCards.has(c)));
  const allCards = new Set(fullHand);
  const cardsOf = combo => [combo.slice(0, 2), combo.slice(2)];
  const categories = new Map();
  const categoriesOf = combo => {
    if (!categories.has(combo)) {
      const villainCards = cardsOf(combo);
      const evaluation = Object.values(evaluateCards([...boardCards, ...villainCards], true, villainCards))[0];
      categories.set(combo, [
        MADE_HANDS.find(hand => evaluation[hand]),
        ...VILLAIN_DRAWS.filter(draw => evaluation[draw])
      ]);
    }
    return categories.get(combo);
  };
  const split = blockers => {
    const blocked = Object.fromEntries([...MADE_HANDS, ...VILLAIN_DRAWS].map(key => [key, []]));
    const result = { unblocked: [], blocked };
    for (const combo of combos) {
      if (!cardsOf(combo).some(c => blockers.has(c))) {
        result.unblocked.push(combo);
      } else if (!cardsOf(combo).some(c => boardCards.has(c))) {
        for (const category of categoriesOf(combo)) blocked[category].push(combo);
      }
    }
    return result;
  };
  return {
    boardBlocks: split(boardCards),
    heroBlocks: split(heroCards),
    allBlocks: split(allCards)
  };
}

module.exports = { parseVillainRange, classifyVillainRange };
