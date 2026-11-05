/**
 * Hand analysis: graded outs, hand strength, and (against a villain range) equity, equity now,
 * draw equity, the next-card spread and runner-runner equity.
 *
 * Hand scores come from poker-bitvaljs. Every runout is enumerated exactly; nothing is sampled.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const BitVal = require('poker-bitvaljs');
const { RANKS, SUITS } = require('./cards');
const { MADE_HANDS, HAND_STRENGTH } = require('./flags');

const DECK = [...RANKS].flatMap(rank => [...SUITS].map(suit => rank + suit));

let bitval = null;
let cardMasks = null;

/** poker-bitvaljs and a bitmask per card, created on first use. */
function scorer() {
  if (!bitval) {
    bitval = new BitVal();
    cardMasks = Object.fromEntries(DECK.map(card => [card, bitval.getBitMasked([card])]));
  }
  return bitval;
}

const maskOf = cards => cards.reduce((mask, card) => mask | cardMasks[card], 0n);

/** Scores a hand mask: [score, kickers], compared score first, then kickers. */
function score(mask) {
  const [value, kickers] = scorer().evaluate(mask);
  return [value, kickers === null ? 0n : kickers];
}

/** 1 if `a` beats `b`, -1 if it loses, 0 for a tie. */
function compareScores(a, b) {
  if (a[0] !== b[0]) return a[0] > b[0] ? 1 : -1;
  if (a[1] !== b[1]) return a[1] > b[1] ? 1 : -1;
  return 0;
}

/** Every two-card holding that uses none of the known cards, as { cards, mask }. */
function holdingsAvoiding(known) {
  const live = DECK.filter(card => !known.has(card));
  const holdings = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) holdings.push({ cards: [live[i], live[j]], mask: cardMasks[live[i]] | cardMasks[live[j]] });
  }
  return holdings;
}

/**
 * Hero's hand strength on a board: the share of every hand villain could hold that hero beats,
 * counting ties as half, and how many hands beat hero.
 *
 * @returns {{share: number, beatenBy: number}}
 */
function handStrengthOn(heroCards, board) {
  scorer();
  const boardMask = maskOf(board);
  const hero = score(boardMask | maskOf(heroCards));
  let wins = 0;
  let ties = 0;
  let losses = 0;
  for (const holding of holdingsAvoiding(new Set([...board, ...heroCards]))) {
    const result = compareScores(hero, score(boardMask | holding.mask));
    if (result > 0) wins++;
    else if (result === 0) ties++;
    else losses++;
  }
  return { share: (wins + ties / 2) / (wins + ties + losses), beatenBy: losses };
}

/**
 * Hero's outs: next cards that give hero a better made-hand category, using a hole card, and raise
 * hero's hand strength. Each is graded by the strength of the hand it makes: nuts (no hand beats
 * it), strong (beats at least `strongThreshold` of villain's possible hands) or weak.
 *
 * @param {Object} params - heroCards, board, current (evaluate() of the current hand), currentStrength,
 *   strongThreshold, evaluate (extval's evaluate), villain (live villain combos or null)
 * @returns {Object} The outs
 */
function findOuts({ heroCards, board, current, currentStrength, strongThreshold, evaluate, villain }) {
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
  for (const card of DECK.filter(c => !known.has(c))) {
    const after = evaluate([...board, card, ...heroCards], { holeCards: heroCards, street: 'river' });
    if (HAND_STRENGTH[after.category] <= HAND_STRENGTH[current.category] || !after.usesHoleCards) continue;
    const strength = handStrengthOn(heroCards, [...board, card]);
    if (strength.share <= currentStrength.share) continue;
    let grade = 'weak';
    if (strength.beatenBy === 0) grade = 'nuts';
    else if (strength.share >= strongThreshold) grade = 'strong';
    const detail = { card, category: after.category, handStrength: strength.share, grade };
    if (villain) {
      const newBoard = [...board, card];
      const live = villain.filter(v => !v.cards.includes(card));
      const heroScore = score(maskOf(newBoard) | maskOf(heroCards));
      const beating = live.filter(v => compareScores(heroScore, score(maskOf(newBoard) | v.mask)) < 0).length;
      detail.clean = beating === 0;
      detail.beatenBy = live.length ? beating / live.length : 0;
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
function equityAgainst(heroCards, board, villain) {
  const heroMask = maskOf(heroCards);
  const boardMask = maskOf(board);
  const known = new Set([...board, ...heroCards]);
  const unseen = DECK.filter(c => !known.has(c));
  const result = (a, b) => (compareScores(a, b) > 0 ? 1 : compareScores(a, b) === 0 ? 0.5 : 0);

  // Equity now: the hand ends on this board
  const heroNow = score(boardMask | heroMask);
  const equityNow = villain.reduce((sum, v) => sum + result(heroNow, score(boardMask | v.mask)), 0) / villain.length;

  const cardsToCome = 5 - board.length;
  if (cardsToCome === 0) return { equity: equityNow, equityNow, byCard: null, runnerRunnerEquity: null };

  const perCard = new Map(unseen.map(card => [card, { sum: 0, count: 0 }]));
  let sum = 0;
  let count = 0;
  let runnerRunner = 0;

  if (cardsToCome === 1) {
    for (const card of unseen) {
      const finalMask = boardMask | cardMasks[card];
      const hero = score(finalMask | heroMask);
      for (const v of villain) {
        if (v.cards.includes(card)) continue;
        const r = result(hero, score(finalMask | v.mask));
        sum += r;
        count++;
        perCard.get(card).sum += r;
        perCard.get(card).count++;
      }
    }
  } else {
    // Is hero ahead of each villain combo after one more card? (as if the hand ended on the turn)
    const aheadAfter = new Map();
    for (const card of unseen) {
      const turnMask = boardMask | cardMasks[card];
      const hero = score(turnMask | heroMask);
      aheadAfter.set(card, villain.map(v => !v.cards.includes(card) && compareScores(hero, score(turnMask | v.mask)) > 0));
    }
    for (let i = 0; i < unseen.length; i++) {
      for (let j = i + 1; j < unseen.length; j++) {
        const [turn, river] = [unseen[i], unseen[j]];
        const finalMask = boardMask | cardMasks[turn] | cardMasks[river];
        const hero = score(finalMask | heroMask);
        villain.forEach((v, k) => {
          if (v.cards.includes(turn) || v.cards.includes(river)) return;
          const r = result(hero, score(finalMask | v.mask));
          sum += r;
          count++;
          for (const card of [turn, river]) {
            perCard.get(card).sum += r;
            perCard.get(card).count++;
          }
          if (r > 0 && !aheadAfter.get(turn)[k] && !aheadAfter.get(river)[k]) runnerRunner += r;
        });
      }
    }
  }

  const byCard = {};
  for (const [card, tally] of perCard) {
    if (tally.count) byCard[card] = tally.sum / tally.count;
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
 * Analyses one hand. Inputs must already be validated.
 *
 * @param {Object} params - heroCards, board, villainCombos (exact combos or null), strongThreshold,
 *   evaluate (extval's evaluate)
 * @returns {Object} The analysis (see the README's Hand analysis section)
 */
function analyze({ heroCards, board, villainCombos, strongThreshold, evaluate }) {
  scorer();
  const current = evaluate([...board, ...heroCards], { holeCards: heroCards });
  const currentStrength = handStrengthOn(heroCards, board);
  const known = new Set([...board, ...heroCards]);
  const villain = villainCombos
    ? villainCombos
      .map(combo => ({ cards: [combo.slice(0, 2), combo.slice(2)], mask: 0n }))
      .filter(v => !v.cards.some(c => known.has(c)))
      .map(v => ({ ...v, mask: maskOf(v.cards) }))
    : null;

  const analysis = {
    street: current.street,
    category: current.category,
    handStrength: currentStrength.share,
    outs: findOuts({ heroCards, board, current, currentStrength, strongThreshold, evaluate, villain }),
    equity: null,
    equityNow: null,
    drawEquity: null,
    nextCard: null,
    runnerRunnerEquity: null,
    villainCombos: villain ? villain.length : null
  };
  if (villain && villain.length) {
    const result = equityAgainst(heroCards, board, villain);
    analysis.equity = result.equity;
    analysis.equityNow = result.equityNow;
    analysis.drawEquity = result.equity - result.equityNow;
    analysis.nextCard = result.byCard ? summariseNextCards(result.byCard) : null;
    analysis.runnerRunnerEquity = result.runnerRunnerEquity;
  }
  return analysis;
}

module.exports = { analyze };
