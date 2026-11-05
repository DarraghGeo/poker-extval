/**
 * Hand analysis: graded outs, hand strength, and (against a villain range) equity, equity now,
 * draw equity, the next-card spread and runner-runner equity.
 *
 * Every runout is enumerated exactly; nothing is sampled. Cards are numbers 0-51 (see
 * src/core/tables.js) and a board is four suit lanes, scored with poker-bitvaljs's evaluateSuits.
 *
 * Most two-card hands on a board score by their ranks alone: a flush needs three of a suit on the
 * board, and then only cards of that suit matter. Scores are therefore cached per board by rank
 * class (both ranks, and for each card whether it is of the board's flush suit), which skips most
 * evaluations without changing a single result.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { CARD_NAMES, POP, RANK_CODE, SUIT_CODE } = require('./core/tables');
const { Hand, setHand, classifyStrict, scorer, RIVER } = require('./core/classify');
const { usesHoleCards } = require('./core/lists');
const { MADE_HANDS } = require('./flags');
const { CATEGORY_BY_STRENGTH } = require('./core/bits');

/** Cards in 5.2.0's DECK order (Ace high first, suits s, h, d, c), which orders outs and next cards. */
const DECK_ORDER = [];
for (let r = 12; r >= 0; r--) for (let s = 0; s < 4; s++) DECK_ORDER.push(r * 4 + s);

/** Made hand strength (1 high card ... 9 straight flush) by score category (score >>> 20). */
const STRENGTH_BY_CATEGORY = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Scores of two-card hands on one board, cached by rank class.
 */
class BoardScores {
  constructor() {
    this.bv = scorer();
    this.cache = new Int32Array(26 * 26);
    this.stamp = new Int32Array(26 * 26);
    this.generation = 0;
    this.b0 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0;
    this.flushSuit = -1;
  }

  /** Starts a board given as lanes. */
  set(b0, b1, b2, b3) {
    this.b0 = b0; this.b1 = b1; this.b2 = b2; this.b3 = b3;
    this.flushSuit = POP[b0] >= 3 ? 0 : POP[b1] >= 3 ? 1 : POP[b2] >= 3 ? 2 : POP[b3] >= 3 ? 3 : -1;
    this.generation++;
    return this;
  }

  /** The score of the board plus two cards. */
  score(c1, c2) {
    const fs = this.flushSuit;
    let k1 = (c1 >> 2) * 2 + ((c1 & 3) === fs ? 1 : 0);
    let k2 = (c2 >> 2) * 2 + ((c2 & 3) === fs ? 1 : 0);
    if (k1 < k2) { const t = k1; k1 = k2; k2 = t; }
    const key = k1 * 26 + k2;
    if (this.stamp[key] === this.generation) return this.cache[key];
    let s = this.b0, h = this.b1, d = this.b2, c = this.b3;
    for (const card of [c1, c2]) {
      const bit = 1 << (card >> 2);
      switch (card & 3) {
        case 0: s |= bit; break;
        case 1: h |= bit; break;
        case 2: d |= bit; break;
        default: c |= bit;
      }
    }
    const value = this.bv.evaluateSuits(s, h, d, c);
    this.stamp[key] = this.generation;
    this.cache[key] = value;
    return value;
  }
}

/** Four suit lanes of some cards. */
function lanesOf(cards) {
  const lanes = [0, 0, 0, 0];
  for (const c of cards) lanes[c & 3] |= 1 << (c >> 2);
  return lanes;
}

/** Lanes plus one card. */
function addCard(lanes, card) {
  const out = lanes.slice();
  out[card & 3] |= 1 << (card >> 2);
  return out;
}

/** Cards not in `known`, in DECK order. */
function unseenCards(known) {
  const used = new Uint8Array(52);
  for (const c of known) used[c] = 1;
  return DECK_ORDER.filter(c => !used[c]);
}

/**
 * Hero's hand strength on a board: the share of every hand villain could hold that hero beats,
 * counting ties as half, and how many hands beat hero.
 *
 * @returns {{share: number, beatenBy: number}}
 */
function handStrengthOn(scores, hero, lanes, known) {
  scores.set(lanes[0], lanes[1], lanes[2], lanes[3]);
  const heroScore = scores.score(hero[0], hero[1]);
  const live = unseenCards(known);
  let wins = 0;
  let ties = 0;
  let losses = 0;
  for (let a = 0; a < live.length; a++) {
    const ca = live[a];
    for (let b = a + 1; b < live.length; b++) {
      const v = scores.score(ca, live[b]);
      if (heroScore > v) wins++;
      else if (heroScore === v) ties++;
      else losses++;
    }
  }
  return { share: (wins + ties / 2) / (wins + ties + losses), beatenBy: losses };
}

/** The made hand strength and usesHoleCards of board + hero, on the river (the outs check). */
function riverHand(x, board, card, hero) {
  setHand(x, [...board, card, hero[0], hero[1]], hero[0], hero[1], RIVER);
  classifyStrict(x);
  return x;
}

/**
 * Hero's outs: next cards that give hero a better made-hand category, using a hole card, and raise
 * hero's hand strength. Each is graded by the strength of the hand it makes: nuts (no hand beats
 * it), strong (beats at least `strongThreshold` of villain's possible hands) or weak.
 *
 * @returns {Object} The outs
 */
function findOuts({ hero, board, currentStrength, currentShare, strongThreshold, villain }) {
  const outs = {
    count: 0,
    cards: [],
    nuts: [],
    strong: [],
    weak: [],
    byType: Object.fromEntries(MADE_HANDS.map(hand => [hand, []])),
    clean: villain ? [] : null,
    dirty: villain ? [] : null,
    details: []
  };
  if (board.length >= 5) return outs;
  const known = [...board, ...hero];
  const boardLanes = lanesOf(board);
  const heroBoard = lanesOf(known);
  const bv = scorer();
  const scores = new BoardScores();
  const x = new Hand();
  for (const card of unseenCards(known)) {
    // Quick filter on the score's category, then the full evaluation for the cards that pass.
    // The score cannot tell a royal flush from a straight flush, so those always go through.
    const after = addCard(heroBoard, card);
    const category = bv.evaluateSuits(after[0], after[1], after[2], after[3]) >>> 20;
    if (category !== 8 && STRENGTH_BY_CATEGORY[category] <= currentStrength) continue;
    riverHand(x, board, card, hero);
    if (x.strength <= currentStrength || !usesHoleCards(x, x.p0, x.p1, x.p2, x.p3, x.p4, x.strength)) continue;
    const newBoard = addCard(boardLanes, card);
    const strength = handStrengthOn(scores, hero, newBoard, [...known, card]);
    if (strength.share <= currentShare) continue;
    let grade = 'weak';
    if (strength.beatenBy === 0) grade = 'nuts';
    else if (strength.share >= strongThreshold) grade = 'strong';
    const name = CARD_NAMES[card];
    const madeHand = CATEGORY_BY_STRENGTH[x.strength];
    const detail = { card: name, category: madeHand, handStrength: strength.share, grade };
    if (villain) {
      scores.set(newBoard[0], newBoard[1], newBoard[2], newBoard[3]);
      const heroScore = scores.score(hero[0], hero[1]);
      let live = 0;
      let beating = 0;
      for (let k = 0; k < villain.length; k += 2) {
        const v0 = villain[k];
        const v1 = villain[k + 1];
        if (v0 === card || v1 === card) continue;
        live++;
        if (heroScore < scores.score(v0, v1)) beating++;
      }
      detail.clean = beating === 0;
      detail.beatenBy = live ? beating / live : 0;
      (detail.clean ? outs.clean : outs.dirty).push(name);
    }
    outs.count++;
    outs.cards.push(name);
    outs[grade].push(name);
    outs.byType[madeHand].push(name);
    outs.details.push(detail);
  }
  return outs;
}

/**
 * Equity against villain's live combos, enumerating every runout: equity, equity now, the equity
 * after each next card, and (with two cards to come) runner-runner equity.
 *
 * Runner-runner equity is the part of equity won only with both runout cards: runouts where hero is
 * not ahead after the turn card alone nor after the river card alone, but wins (or ties, counted as
 * half) once both are out.
 *
 * @param {number[]} hero - Hero's two cards
 * @param {number[]} board - The board
 * @param {Int8Array} villain - Live villain combos, two cards each
 * @returns {Object} { equity, equityNow, byCard, runnerRunnerEquity }
 */
function equityAgainst(hero, board, villain) {
  const combos = villain.length / 2;
  const boardLanes = lanesOf(board);
  const unseen = unseenCards([...board, ...hero]);
  const scores = new BoardScores();
  const h0 = hero[0];
  const h1 = hero[1];

  // Equity now: the hand ends on this board
  scores.set(boardLanes[0], boardLanes[1], boardLanes[2], boardLanes[3]);
  const heroNow = scores.score(h0, h1);
  let nowSum = 0;
  for (let k = 0; k < villain.length; k += 2) {
    const v = scores.score(villain[k], villain[k + 1]);
    nowSum += heroNow > v ? 1 : heroNow === v ? 0.5 : 0;
  }
  const equityNow = nowSum / combos;

  const cardsToCome = 5 - board.length;
  if (cardsToCome === 0) return { equity: equityNow, equityNow, byCard: null, runnerRunnerEquity: null };

  const cardSum = new Float64Array(52);
  const cardCount = new Float64Array(52);
  let sum = 0;
  let count = 0;
  let runnerRunner = 0;

  if (cardsToCome === 1) {
    for (const t of unseen) {
      const lanes = addCard(boardLanes, t);
      scores.set(lanes[0], lanes[1], lanes[2], lanes[3]);
      const heroScore = scores.score(h0, h1);
      let s = 0;
      let n = 0;
      for (let k = 0; k < villain.length; k += 2) {
        const v0 = villain[k];
        const v1 = villain[k + 1];
        if (v0 === t || v1 === t) continue;
        const v = scores.score(v0, v1);
        s += heroScore > v ? 1 : heroScore === v ? 0.5 : 0;
        n++;
      }
      sum += s;
      count += n;
      cardSum[t] += s;
      cardCount[t] += n;
    }
  } else {
    // Is hero ahead of each villain combo after one more card? (as if the hand ended on the turn)
    const ahead = new Uint8Array(52 * combos);
    for (const t of unseen) {
      const lanes = addCard(boardLanes, t);
      scores.set(lanes[0], lanes[1], lanes[2], lanes[3]);
      const heroScore = scores.score(h0, h1);
      for (let k = 0; k < combos; k++) {
        const v0 = villain[2 * k];
        const v1 = villain[2 * k + 1];
        if (v0 !== t && v1 !== t && heroScore > scores.score(v0, v1)) ahead[t * combos + k] = 1;
      }
    }
    for (let a = 0; a < unseen.length; a++) {
      const turn = unseen[a];
      const turnLanes = addCard(boardLanes, turn);
      const turnAhead = turn * combos;
      for (let b = a + 1; b < unseen.length; b++) {
        const river = unseen[b];
        const riverAhead = river * combos;
        const lanes = addCard(turnLanes, river);
        scores.set(lanes[0], lanes[1], lanes[2], lanes[3]);
        const heroScore = scores.score(h0, h1);
        let s = 0;
        let n = 0;
        for (let k = 0; k < combos; k++) {
          const v0 = villain[2 * k];
          const v1 = villain[2 * k + 1];
          if (v0 === turn || v1 === turn || v0 === river || v1 === river) continue;
          const v = scores.score(v0, v1);
          n++;
          if (heroScore > v) {
            s += 1;
            if (!ahead[turnAhead + k] && !ahead[riverAhead + k]) runnerRunner += 1;
          } else if (heroScore === v) {
            s += 0.5;
            if (!ahead[turnAhead + k] && !ahead[riverAhead + k]) runnerRunner += 0.5;
          }
        }
        sum += s;
        count += n;
        cardSum[turn] += s;
        cardCount[turn] += n;
        cardSum[river] += s;
        cardCount[river] += n;
      }
    }
  }

  const byCard = {};
  for (const card of unseen) {
    if (cardCount[card]) byCard[CARD_NAMES[card]] = cardSum[card] / cardCount[card];
  }
  return { equity: sum / count, equityNow, byCard, runnerRunnerEquity: cardsToCome === 2 ? runnerRunner / count : null };
}

/** Average, best, worst and standard deviation of the equity after each next card. */
function summariseNextCards(byCard) {
  const entries = Object.entries(byCard);
  const values = entries.map(([, e]) => e);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const worst = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const variance = values.reduce((acc, e) => acc + (e - average) ** 2, 0) / values.length;
  return {
    average,
    best: { card: best[0], equity: best[1] },
    worst: { card: worst[0], equity: worst[1] },
    standardDeviation: Math.sqrt(variance),
    byCard
  };
}

/**
 * Prepares an analysis: hero's current hand and strength. The parts (outs, the equity group) are
 * then worked out separately, on demand; withVillain adds a villain range.
 *
 * @param {number[]} board - The board, input order
 * @param {number[]} hero - Hero's two cards, in the order given
 * @returns {Object} The prepared analysis, with villain null
 */
function prepare(board, hero) {
  const x = new Hand();
  setHand(x, [...board, ...hero], hero[0], hero[1], -1);
  classifyStrict(x);
  const currentStrength = handStrengthOn(new BoardScores(), hero, lanesOf(board), [...board, ...hero]);
  return {
    hero,
    board,
    street: ['flop', 'turn', 'river'][x.street],
    category: CATEGORY_BY_STRENGTH[x.strength],
    currentStrength: x.strength,
    currentShare: currentStrength.share,
    villain: null
  };
}

/**
 * A prepared analysis against villain's combos: those that share no card with the board or hero,
 * as card pairs. The hero side is shared with `prepared`.
 *
 * @param {Object} prepared - From prepare
 * @param {string[]} villainCombos - Exact combos
 * @returns {Object} The prepared analysis with villain set
 */
function withVillain(prepared, villainCombos) {
  const known = new Uint8Array(52);
  for (const c of [...prepared.board, ...prepared.hero]) known[c] = 1;
  const live = [];
  for (const combo of villainCombos) {
    const a = cardFromCombo(combo, 0);
    const b = cardFromCombo(combo, 2);
    if (!known[a] && !known[b]) live.push(a, b);
  }
  return { ...prepared, villain: Int8Array.from(live) };
}

/** The card at an offset of a combo string such as 'AhKd'. */
function cardFromCombo(combo, offset) {
  return RANK_CODE[combo.charCodeAt(offset)] * 4 + SUIT_CODE[combo.charCodeAt(offset + 1)];
}

/** The graded outs of a prepared analysis. */
function outsOf(prepared, strongThreshold) {
  return findOuts({ ...prepared, strongThreshold });
}

/** The equity group of a prepared analysis, or null without live villain combos. */
function equityOf(prepared) {
  const { hero, board, villain } = prepared;
  if (!villain || !villain.length) return null;
  const r = equityAgainst(hero, board, villain);
  return {
    equity: r.equity,
    equityNow: r.equityNow,
    drawEquity: r.equity - r.equityNow,
    nextCard: r.byCard ? summariseNextCards(r.byCard) : null,
    runnerRunnerEquity: r.runnerRunnerEquity
  };
}

/** Live villain combos of a prepared analysis. */
function liveCount(prepared) {
  return prepared.villain.length / 2;
}

module.exports = { prepare, withVillain, outsOf, equityOf, liveCount };
