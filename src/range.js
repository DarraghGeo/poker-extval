/**
 * Villain ranges: parsing (via poker-rangeman) and blocker classification.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { MADE_HANDS, VILLAIN_DRAWS } = require('./flags');
const { cardOf } = require('./core/tables');
const { FLAGS, FLAG_BIT, CATEGORY_BY_STRENGTH } = require('./core/bits');
const { Hand, setHand, classifyStrict, STREET_NAMES } = require('./core/classify');
const { loadRangeManager } = require('./deps');

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
  // Engines pass the same few ranges again and again: remember the last ones parsed
  const key = typeof range === 'string' ? range : Array.isArray(range) && range.every(e => typeof e === 'string') ? JSON.stringify(range) : null;
  if (key !== null) {
    const cached = parsed.get(key);
    if (cached) {
      parsed.delete(key);
      parsed.set(key, cached);
      return cached.slice();
    }
  }
  const combos = parseUncached(range);
  if (key !== null) {
    parsed.set(key, combos.slice());
    if (parsed.size > PARSE_CACHE_SIZE) parsed.delete(parsed.keys().next().value);
  }
  return combos;
}

/** Recently parsed ranges, oldest first. */
const parsed = new Map();
const PARSE_CACHE_SIZE = 64;

function parseUncached(range) {
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
 * @param {number[]} cards - The full hand (board and hole cards) as card numbers, input order
 * @param {number[]|null} holeOrder - Positions of hero's hole cards, or null (every card is then board)
 * @param {string|null} street - The street, passed on to villain's evaluation
 * @returns {{boardBlocks: Object, heroBlocks: Object, allBlocks: Object}} The three views
 */
function classifyCombos(combos, cards, holeOrder, street) {
  const hero = new Uint8Array(52);
  const onBoard = new Uint8Array(52);
  if (holeOrder) for (const p of holeOrder) hero[cards[p]] = 1;
  const villainHand = [];
  for (const c of cards) {
    if (!hero[c]) {
      onBoard[c] = 1;
      villainHand.push(c);
    }
  }
  const n = villainHand.length;
  villainHand.push(0, 0);
  const streetCode = street ? STREET_NAMES.indexOf(street) : -1;
  const x = new Hand();
  const count = combos.length;
  const first = new Int8Array(count);
  const second = new Int8Array(count);
  for (let i = 0; i < count; i++) {
    first[i] = cardOf(combos[i].slice(0, 2));
    second[i] = cardOf(combos[i].slice(2));
  }
  // Villain's made hand and draws, worked out once per combo that needs them
  const categories = new Array(count).fill(null);
  const categoriesOf = i => {
    if (!categories[i]) {
      villainHand[n] = first[i];
      villainHand[n + 1] = second[i];
      setHand(x, villainHand, first[i], second[i], streetCode);
      classifyStrict(x);
      const list = [CATEGORY_BY_STRENGTH[x.strength]];
      for (let k = 0; k < VILLAIN_DRAWS.length; k++) if (x.hi & VILLAIN_DRAW_BITS[k]) list.push(VILLAIN_DRAWS[k]);
      categories[i] = list;
    }
    return categories[i];
  };
  const split = (blockA, blockB) => {
    const blocked = {};
    for (const key of BLOCKED_KEYS) blocked[key] = [];
    const unblocked = [];
    for (let i = 0; i < count; i++) {
      const a = first[i];
      const b = second[i];
      if (!(blockA[a] || blockA[b] || (blockB && (blockB[a] || blockB[b])))) {
        unblocked.push(combos[i]);
      } else if (onBoard[a] || onBoard[b]) {
        blocked.onBoard.push(combos[i]);
      } else {
        for (const category of categoriesOf(i)) blocked[category].push(combos[i]);
      }
    }
    return { unblocked, blocked };
  };
  return {
    boardBlocks: split(onBoard, null),
    heroBlocks: split(hero, null),
    allBlocks: split(onBoard, hero)
  };
}

const BLOCKED_KEYS = [...MADE_HANDS, ...VILLAIN_DRAWS, 'onBoard'];
const VILLAIN_DRAW_BITS = VILLAIN_DRAWS.map(draw => FLAG_BIT[FLAGS[draw]]);

module.exports = { parseRange, classifyCombos, loadRangeManager };
