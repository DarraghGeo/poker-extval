/**
 * The chainable hand API: hand(cards, options) returns a HandView whose methods each work out only
 * what they return, the first time they are called, and remember it.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { ALL_FLAGS, DRAWS } = require('./flags');
const { prepare, withVillain, outsOf, equityOf } = require('./analysis');

const FLAG_SET = new Set(ALL_FLAGS);

/** Remembers the results of a zero-argument method, or of one keyed by its argument. */
function memo(cache, key, compute) {
  if (!cache.has(key)) cache.set(key, compute());
  return cache.get(key);
}

class HandView {
  /**
   * @param {string[]} cards - 5 or more cards: the board plus any hole cards
   * @param {{holeCards: string[]|null, street: string|null}} options - Already validated
   * @param {Object} deps - evaluate, parseRange, classifyCombos, evaluateCards (from evaluator.js)
   */
  constructor(cards, options, deps) {
    this.cards = [...cards];
    this.holeCards = options.holeCards;
    this.street = options.street;
    this._deps = deps;
    this._cache = new Map();
  }

  /** The flat evaluation, as evaluate() returns it. */
  evaluation() {
    return memo(this._cache, 'evaluation', () => this._deps.evaluate(this.cards, { holeCards: this.holeCards, street: this.street }));
  }

  /** The best five cards and the made hand: { hand, category, strength, rank }. */
  made() {
    return memo(this._cache, 'made', () => {
      const e = this.evaluation();
      return { hand: e.hand, category: e.category, strength: e.strength, rank: e.rank };
    });
  }

  /** Every flag of the best hand (strict mode), e.g. { isPair: true, isTopPair: true, ... }. */
  flags() {
    return memo(this._cache, 'flags', () => {
      const e = this.evaluation();
      return Object.fromEntries(ALL_FLAGS.map(flag => [flag, e[flag]]));
    });
  }

  /**
   * Whether one flag is true.
   *
   * @param {string} flag - A flag name, e.g. 'isFlushDraw'
   * @returns {boolean}
   * @throws {Error} If the flag does not exist
   */
  is(flag) {
    if (!FLAG_SET.has(flag)) throw new Error(`Unknown flag "${flag}"`);
    return this.evaluation()[flag];
  }

  /** The hand's draws: { flags: { isFlushDraw, ... }, keyCards: { isFlushDraw: [...], ... } }. */
  draws() {
    return memo(this._cache, 'draws', () => {
      const e = this.evaluation();
      return {
        flags: Object.fromEntries(DRAWS.map(draw => [draw, e[draw]])),
        keyCards: Object.fromEntries(DRAWS.map(draw => [draw, e.keyCards[draw]]))
      };
    });
  }

  /**
   * Graded outs (see analyzeHand). Needs hole cards and a board of 3 to 5 cards.
   *
   * @param {{strongThreshold?: number}} [options]
   * @returns {Object} The outs
   */
  outs({ strongThreshold = 0.8 } = {}) {
    checkThreshold(strongThreshold);
    return memo(this._cache, `outs|${strongThreshold}`, () => outsOf(this._prepared(), strongThreshold));
  }

  /** Hero's share of every hand villain could hold that hero beats now (ties count half). */
  handStrength() {
    return this._prepared().currentStrength.share;
  }

  /**
   * Hero against a villain range. The range is checked straight away.
   *
   * @param {string|string[]} range - Villain's range, in any poker-rangeman notation
   * @returns {MatchupView}
   */
  vs(range) {
    const key = `vs|${JSON.stringify(range)}`;
    return memo(this._cache, key, () => new MatchupView(this, this._deps.parseRange(range)));
  }

  _prepared() {
    return memo(this._cache, 'prepared', () => {
      if (!this.holeCards) throw new Error('This needs holeCards');
      if (this.cards.length > 7) throw new Error(`Expected at most 7 cards (a board of 3 to 5 plus 2 hole cards), received ${this.cards.length}`);
      const board = this.cards.filter(c => !this.holeCards.includes(c));
      return prepare({ heroCards: [...this.holeCards], board, evaluate: this._deps.evaluate });
    });
  }
}

class MatchupView {
  /**
   * @param {HandView} hand - Hero's hand
   * @param {string[]} combos - Villain's exact combos
   */
  constructor(hand, combos) {
    this.hand = hand;
    this.combos = combos;
    this._cache = new Map();
  }

  _prepared() {
    return memo(this._cache, 'prepared', () => withVillain(this.hand._prepared(), this.combos));
  }

  _group() {
    return memo(this._cache, 'group', () => equityOf(this._prepared()));
  }

  /** All-in equity against the range, every runout counted (null if no villain combo is live). */
  equity() { return this._field('equity'); }

  /** Equity if no more cards were dealt. */
  equityNow() { return this._field('equityNow'); }

  /** equity - equityNow. */
  drawEquity() { return this._field('drawEquity'); }

  /** Equity after each next card, with average, best, worst and standard deviation (null on the river). */
  nextCard() { return this._field('nextCard'); }

  /** The part of equity won only with both runout cards (flop only, else null). */
  runnerRunner() { return this._field('runnerRunnerEquity'); }

  /** How many villain combos are live (not blocked by the known cards). */
  liveCombos() { return this._prepared().villain.length; }

  /** Graded outs, with clean and dirty against this range. */
  outs({ strongThreshold = 0.8 } = {}) {
    checkThreshold(strongThreshold);
    return memo(this._cache, `outs|${strongThreshold}`, () => outsOf(this._prepared(), strongThreshold));
  }

  /** Villain's combos split by which known cards block them, as classifyRange returns. */
  blockers() {
    return memo(this._cache, 'blockers', () => {
      const { classifyCombos, evaluateCards } = this.hand._deps;
      return classifyCombos(this.combos, this.hand.cards, this.hand.holeCards, this.hand.street, evaluateCards);
    });
  }

  _field(name) {
    const group = this._group();
    return group ? group[name] : null;
  }
}

function checkThreshold(strongThreshold) {
  if (typeof strongThreshold !== 'number' || !(strongThreshold > 0 && strongThreshold <= 1)) {
    throw new Error(`strongThreshold must be a number above 0 and at most 1, received ${strongThreshold}`);
  }
}

module.exports = { HandView, MatchupView, checkThreshold };
