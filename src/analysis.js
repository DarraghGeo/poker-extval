/**
 * Hand analysis: graded outs, hand strength, and (against a villain range) equity, equity now,
 * draw equity, the next-card spread and runner-runner equity.
 *
 * Every runout is enumerated exactly; nothing is sampled. Hands are scored through src/score.js,
 * with card sets held as four 13-bit suit lanes.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { DECK, laneTables, compareScores, categoryOf } = require('./score');
const { MADE_HANDS, HAND_STRENGTH } = require('./flags');

/**
 * Scoring for card sets: `base(cards)` makes a set, `add(set, i)` adds the card DECK[i], and
 * `score(set, i, j)` scores the set plus up to two more cards (-1 for none). A set is an
 * Int32Array of four suit lanes, so no arrays are built in the hot loops.
 */
function makeEngine() {
  const { suit, bit, index, eval: evaluateLanes } = laneTables();
  const add = (set, i) => {
    const out = Int32Array.from(set);
    out[suit[i]] |= bit[i];
    return out;
  };
  return {
    index: card => index.get(card),
    base: cards => {
      const set = new Int32Array(4);
      for (const card of cards) {
        const i = index.get(card);
        set[suit[i]] |= bit[i];
      }
      return set;
    },
    add,
    score: (set, i = -1, j = -1) => {
      let s0 = set[0];
      let s1 = set[1];
      let s2 = set[2];
      let s3 = set[3];
      for (const k of [i, j]) {
        if (k < 0) continue;
        const b = bit[k];
        switch (suit[k]) {
          case 0: s0 |= b; break;
          case 1: s1 |= b; break;
          case 2: s2 |= b; break;
          default: s3 |= b;
        }
      }
      return evaluateLanes(s0, s1, s2, s3);
    }
  };
}

/** Indices (into DECK) of every card not in `known`. */
function unseenIndices(known) {
  const out = [];
  for (let i = 0; i < DECK.length; i++) if (!known.has(DECK[i])) out.push(i);
  return out;
}

/**
 * Hero's hand strength on a board: the share of every hand villain could hold that hero beats,
 * counting ties as half, and how many hands beat hero.
 *
 * @param {Object} engine - From makeEngine
 * @param {number[]} hero - Hero's two card indices
 * @param {*} boardSet - The board, as an engine set
 * @param {Set<string>} known - Board and hero cards
 * @returns {{share: number, beatenBy: number}}
 */
function handStrengthOn(engine, hero, boardSet, known) {
  const heroScore = engine.score(boardSet, hero[0], hero[1]);
  const live = unseenIndices(known);
  let wins = 0;
  let ties = 0;
  let losses = 0;
  for (let a = 0; a < live.length; a++) {
    for (let b = a + 1; b < live.length; b++) {
      const result = compareScores(heroScore, engine.score(boardSet, live[a], live[b]));
      if (result > 0) wins++;
      else if (result === 0) ties++;
      else losses++;
    }
  }
  return { share: (wins + ties / 2) / (wins + ties + losses), beatenBy: losses };
}

/**
 * Hero's outs: next cards that give hero a better made-hand category, using a hole card, and raise
 * hero's hand strength. Each is graded by the strength of the hand it makes: nuts (no hand beats
 * it), strong (beats at least `strongThreshold` of villain's possible hands) or weak.
 *
 * @param {Object} params - engine, heroCards, hero (indices), board, current (evaluate() of the
 *   current hand), currentStrength, strongThreshold, evaluate (extval's evaluate), villain (live
 *   villain combos as index pairs, or null)
 * @returns {Object} The outs
 */
function findOuts({ engine, heroCards, hero, board, current, currentStrength, strongThreshold, evaluate, villain }) {
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
  const known = new Set([...board, ...heroCards]);
  const boardSet = engine.base(board);
  const heroBoard = engine.base([...board, ...heroCards]);
  const currentLevel = HAND_STRENGTH[current.category];
  for (const i of unseenIndices(known)) {
    const card = DECK[i];
    // Quick filter on the score's category, then the full evaluation for the cards that pass.
    // The score cannot tell a royal flush from a straight flush, so those always go through.
    const quick = categoryOf(engine.score(heroBoard, i));
    if (quick !== 'isStraightFlush' && HAND_STRENGTH[quick] <= currentLevel) continue;
    const after = evaluate([...board, card, ...heroCards], { holeCards: heroCards, street: 'river' });
    if (HAND_STRENGTH[after.category] <= currentLevel || !after.usesHoleCards) continue;
    const newBoard = engine.add(boardSet, i);
    const strength = handStrengthOn(engine, hero, newBoard, new Set([...known, card]));
    if (strength.share <= currentStrength.share) continue;
    let grade = 'weak';
    if (strength.beatenBy === 0) grade = 'nuts';
    else if (strength.share >= strongThreshold) grade = 'strong';
    const detail = { card, category: after.category, handStrength: strength.share, grade };
    if (villain) {
      const heroScore = engine.score(newBoard, hero[0], hero[1]);
      let live = 0;
      let beating = 0;
      for (const [v0, v1] of villain) {
        if (v0 === i || v1 === i) continue;
        live++;
        if (compareScores(heroScore, engine.score(newBoard, v0, v1)) < 0) beating++;
      }
      detail.clean = beating === 0;
      detail.beatenBy = live ? beating / live : 0;
      (detail.clean ? outs.clean : outs.dirty).push(card);
    }
    outs.count++;
    outs.cards.push(card);
    outs[grade].push(card);
    outs.byType[after.category].push(card);
    outs.details.push(detail);
  }
  return outs;
}

/** 1 for a win, 0.5 for a tie, 0 for a loss. */
function result(heroScore, villainScore) {
  const r = compareScores(heroScore, villainScore);
  return r > 0 ? 1 : r === 0 ? 0.5 : 0;
}

/**
 * Equity against villain's live combos, enumerating every runout: equity, equity now, the equity
 * after each next card, and (with two cards to come) runner-runner equity.
 *
 * Runner-runner equity is the part of equity won only with both runout cards: runouts where hero is
 * not ahead after the turn card alone nor after the river card alone, but wins (or ties, counted as
 * half) once both are out.
 *
 * @returns {Object} { equity, equityNow, byCard, runnerRunnerEquity }
 */
function equityAgainst(engine, heroCards, hero, board, villain) {
  const boardSet = engine.base(board);
  const unseen = unseenIndices(new Set([...board, ...heroCards]));

  // Equity now: the hand ends on this board
  const heroNow = engine.score(boardSet, hero[0], hero[1]);
  let nowSum = 0;
  for (const [v0, v1] of villain) nowSum += result(heroNow, engine.score(boardSet, v0, v1));
  const equityNow = nowSum / villain.length;

  const cardsToCome = 5 - board.length;
  if (cardsToCome === 0) return { equity: equityNow, equityNow, byCard: null, runnerRunnerEquity: null };

  const cardSum = new Float64Array(DECK.length);
  const cardCount = new Float64Array(DECK.length);
  let sum = 0;
  let count = 0;
  let runnerRunner = 0;

  if (cardsToCome === 1) {
    for (const t of unseen) {
      const finalSet = engine.add(boardSet, t);
      const heroScore = engine.score(finalSet, hero[0], hero[1]);
      for (const [v0, v1] of villain) {
        if (v0 === t || v1 === t) continue;
        const r = result(heroScore, engine.score(finalSet, v0, v1));
        sum += r;
        count++;
        cardSum[t] += r;
        cardCount[t]++;
      }
    }
  } else {
    // Is hero ahead of each villain combo after one more card? (as if the hand ended on the turn)
    const ahead = new Uint8Array(DECK.length * villain.length);
    for (const t of unseen) {
      const turnSet = engine.add(boardSet, t);
      const heroScore = engine.score(turnSet, hero[0], hero[1]);
      villain.forEach(([v0, v1], k) => {
        if (v0 !== t && v1 !== t && compareScores(heroScore, engine.score(turnSet, v0, v1)) > 0) ahead[t * villain.length + k] = 1;
      });
    }
    for (let a = 0; a < unseen.length; a++) {
      const turn = unseen[a];
      const turnSet = engine.add(boardSet, turn);
      for (let b = a + 1; b < unseen.length; b++) {
        const river = unseen[b];
        const finalSet = engine.add(turnSet, river);
        const heroScore = engine.score(finalSet, hero[0], hero[1]);
        for (let k = 0; k < villain.length; k++) {
          const [v0, v1] = villain[k];
          if (v0 === turn || v1 === turn || v0 === river || v1 === river) continue;
          const r = result(heroScore, engine.score(finalSet, v0, v1));
          sum += r;
          count++;
          cardSum[turn] += r;
          cardCount[turn]++;
          cardSum[river] += r;
          cardCount[river]++;
          if (r > 0 && !ahead[turn * villain.length + k] && !ahead[river * villain.length + k]) runnerRunner += r;
        }
      }
    }
  }

  const byCard = {};
  for (const i of unseen) {
    if (cardCount[i]) byCard[DECK[i]] = cardSum[i] / cardCount[i];
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
 * Prepares an analysis: the engine, and hero's current hand and strength. The parts (outs, the
 * equity group) are then worked out separately, on demand; withVillain adds a villain range.
 *
 * @param {Object} params - heroCards, board, evaluate (extval's evaluate)
 * @returns {Object} The prepared analysis, with villain null
 */
function prepare({ heroCards, board, evaluate }) {
  const engine = makeEngine();
  const hero = heroCards.map(engine.index);
  const current = evaluate([...board, ...heroCards], { holeCards: heroCards });
  const known = new Set([...board, ...heroCards]);
  const currentStrength = handStrengthOn(engine, hero, engine.base(board), known);
  return { engine, heroCards, hero, board, current, currentStrength, villain: null, evaluate };
}

/**
 * A prepared analysis against villain's combos: those that share no card with the board or hero,
 * as index pairs. The hero side is shared with `prepared`.
 *
 * @param {Object} prepared - From prepare
 * @param {string[]} villainCombos - Exact combos
 * @returns {Object} The prepared analysis with villain set
 */
function withVillain(prepared, villainCombos) {
  const known = new Set([...prepared.board, ...prepared.heroCards]);
  const villain = villainCombos
    .map(combo => [combo.slice(0, 2), combo.slice(2)])
    .filter(cards => !cards.some(c => known.has(c)))
    .map(cards => cards.map(prepared.engine.index));
  return { ...prepared, villain };
}

/** The graded outs of a prepared analysis. */
function outsOf(prepared, strongThreshold) {
  return findOuts({ ...prepared, strongThreshold });
}

/** The equity group of a prepared analysis, or null without live villain combos. */
function equityOf(prepared) {
  const { engine, heroCards, hero, board, villain } = prepared;
  if (!villain || !villain.length) return null;
  const r = equityAgainst(engine, heroCards, hero, board, villain);
  return {
    equity: r.equity,
    equityNow: r.equityNow,
    drawEquity: r.equity - r.equityNow,
    nextCard: r.byCard ? summariseNextCards(r.byCard) : null,
    runnerRunnerEquity: r.runnerRunnerEquity
  };
}

module.exports = { prepare, withVillain, outsOf, equityOf };
