/**
 * Villain ranges: parsing (via poker-rangeman) and blocker classification.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { MADE_HANDS, VILLAIN_DRAWS } = require('./flags');

let RangeManager = null;

/**
 * Loads poker-rangeman on first use. It is an ES module: bundlers include it as usual, and Node
 * 20.19+ / 22.13+ can require() it.
 *
 * @returns {Function} The RangeManager class
 * @throws {Error} On a Node version that cannot require() ES modules
 */
function loadRangeManager() {
  if (!RangeManager) {
    try {
      ({ RangeManager } = require('poker-rangeman'));
    } catch (error) {
      throw new Error(`Ranges need a bundler or Node.js 20.19+ / 22.13+ to load poker-rangeman: ${error.message}`);
    }
  }
  return RangeManager;
}

/**
 * Expands a range into exact two-card combos, in input order and without duplicates.
 *
 * Accepts every poker-rangeman notation: exact combos ('AhKd'), pairs ('QQ', 'TT+', '99-66'),
 * suited and offsuit hands ('AKs', 'AKo', 'ATs+', 'KQs-K9s', 'K9o+'), rank wildcards ('KXs'),
 * plus any-suit hands ('AK', 'AT+'), which are expanded to their suited and offsuit forms.
 * Combos are written high rank first with suits ordered c, d, h, s (e.g. 'AhKd', 'QcQd').
 *
 * @param {string|string[]} range - A comma-separated string ('AA,KQs,JTo') or an array of entries
 * @returns {string[]} Exact combos
 * @throws {Error} If the range is not a string or array, or an entry is not valid notation
 */
function parseRange(range) {
  const entries = typeof range === 'string' ? range.split(',') : range;
  if (!Array.isArray(entries)) {
    throw new Error('Range must be an array or a comma-separated string');
  }
  const Manager = loadRangeManager();
  const combos = [];
  const seen = new Set();
  entries.forEach((entry, i) => {
    const invalid = () => new Error(`Invalid range entry at index ${i}: "${entry}"`);
    if (typeof entry !== 'string') throw invalid();
    let notation = entry.trim();
    // poker-rangeman needs a suited or offsuit marker; 'AK' means both
    const anySuit = notation.match(/^([AKQJT2-9])([AKQJT2-9])(\+?)$/i);
    if (anySuit && anySuit[1].toUpperCase() !== anySuit[2].toUpperCase()) {
      notation = `${anySuit[1]}${anySuit[2]}s${anySuit[3]},${anySuit[1]}${anySuit[2]}o${anySuit[3]}`;
    }
    let expanded;
    try {
      expanded = new Manager(notation).toArray();
    } catch (error) {
      throw invalid();
    }
    for (const combo of expanded) {
      if (combo.slice(0, 2) === combo.slice(2)) throw invalid();
      if (!seen.has(combo)) {
        seen.add(combo);
        combos.push(combo);
      }
    }
  });
  return combos;
}

/**
 * Splits villain combos by which known cards block them, and groups the blocked ones by what
 * villain would hold with them.
 *
 * - boardBlocks: blocked by a board card (every card that is not a hole card)
 * - heroBlocks: blocked by one of the hole cards (nothing without hole cards)
 * - allBlocks: blocked by any known card
 *
 * Each view is `{ unblocked, blocked }`. `unblocked` lists the combos villain can still hold.
 * `blocked` groups the blocked combos: each one villain could otherwise be dealt is listed under
 * its made hand (the best five of board + combo) and every draw it holds, evaluated with the
 * combo as villain's hole cards; a combo containing a board card cannot be dealt at all, so it is
 * listed under `onBoard` instead. Every key is always present.
 *
 * @param {string[]} combos - Exact combos from parseRange
 * @param {string[]} fullHand - Every card passed in (board and hole cards)
 * @param {string[]|null} holeCards - Hero's hole cards, or null (every card is then board)
 * @param {string|null} street - The street, passed on to villain's evaluation
 * @param {Function} evaluateCards - The hand evaluator, used to categorise villain's combos
 * @returns {{boardBlocks: Object, heroBlocks: Object, allBlocks: Object}} The three views
 */
function classifyCombos(combos, fullHand, holeCards, street, evaluateCards) {
  const heroCards = new Set(holeCards || []);
  const boardCards = new Set(fullHand.filter(c => !heroCards.has(c)));
  const allCards = new Set(fullHand);
  const cardsOf = combo => [combo.slice(0, 2), combo.slice(2)];
  const categories = new Map();
  const categoriesOf = combo => {
    if (!categories.has(combo)) {
      const villainCards = cardsOf(combo);
      const evaluation = Object.values(evaluateCards([...boardCards, ...villainCards], true, villainCards, street))[0];
      categories.set(combo, [
        MADE_HANDS.find(hand => evaluation[hand]),
        ...VILLAIN_DRAWS.filter(draw => evaluation[draw])
      ]);
    }
    return categories.get(combo);
  };
  const split = blockers => {
    const blocked = Object.fromEntries([...MADE_HANDS, ...VILLAIN_DRAWS, 'onBoard'].map(key => [key, []]));
    const unblocked = [];
    for (const combo of combos) {
      if (!cardsOf(combo).some(c => blockers.has(c))) {
        unblocked.push(combo);
      } else if (cardsOf(combo).some(c => boardCards.has(c))) {
        blocked.onBoard.push(combo);
      } else {
        for (const category of categoriesOf(combo)) blocked[category].push(combo);
      }
    }
    return { unblocked, blocked };
  };
  return {
    boardBlocks: split(boardCards),
    heroBlocks: split(heroCards),
    allBlocks: split(allCards)
  };
}

module.exports = { parseRange, classifyCombos, loadRangeManager };
