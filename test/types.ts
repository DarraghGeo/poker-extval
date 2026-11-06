// Compile-time checks for index.d.ts: run with `npm run test:types`. Nothing here is executed.
import evaluateHand2, { evaluateHand, evaluate, analyzeHand, hand, HandView, MatchupView, HandAnalysis, classifyRange, parseRange, compareHands, equity, HandEvaluator, Evaluation, board, Board, Classification, BatchClassification, FLAGS, hasFlag, cardIndex, cardString } from '..';
const r = evaluateHand(['As', 'Kd', '8c', '3h', 'Kh'], { holeCards: ['As', 'Kh'], street: 'flop' });
const e: Evaluation = Object.values(r)[0];
const top: boolean = e.isTopPair;
const keys: string[] = e.keyCards.isFlushDraw;
const uses: boolean | null = e.usesHoleCards;
const r2 = evaluateHand(['As', 'Kd', '8c', '3h', 'Kh'], false, ['As', 'Kh'], 'AA,KQs');
const blocked: string[] | undefined = Object.values(r2)[0].villainRange?.heroBlocks.blocked.onBoard;
const flat = evaluate(['As', 'Kd', '8c', '3h', 'Kh']);
const cat: 'isPair' | string = flat.category;
const rank: number[] = flat.rank;
const v = classifyRange(['As', 'Kd', '8c', '3h', 'Kh'], null, ['AA']);
const combos: string[] = parseRange('AKs');
const c: 1 | -1 | 0 = compareHands(['Ah', 'Kd'], ['Qs', 'Qc'], ['Ks', '7h', '2d']);
equity('AhJs', 'KK', ['4h', '9h', '7h']).then(x => x.equity);
const h = new HandEvaluator(['As', 'Kd', '8c', '3h', 'Kh'], { strict: true });
const street = h.street;
evaluateHand2(['As', 'Kd', '8c', '3h', 'Kh']);
// @ts-expect-error unknown flag
e.isOverPairs;
// @ts-expect-error bad street
evaluateHand(['As', 'Kd', '8c', '3h', 'Kh'], { street: 'preflop' });
const analysis: HandAnalysis = analyzeHand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'], villainRange: 'KK' });
const nutOuts: string[] = analysis.outs.nuts;
const flushOuts: string[] = analysis.outs.byType.isFlush;
const draw: number | null = analysis.drawEquity;
const bestCard: string | undefined = analysis.nextCard?.best.card;
// @ts-expect-error holeCards is required
analyzeHand(['4h', '9h', '7h', 'Ah', 'Js'], {});
const view: HandView = hand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] });
const isDraw: boolean = view.is('isFlushDraw');
const category: string = view.made().category;
const matchup: MatchupView = view.vs('KK,QQ');
const viewEquity: number | null = matchup.equity();
const spread: number | undefined = matchup.nextCard()?.standardDeviation;
const blockedFlushes: string[] = matchup.blockers().heroBlocks.blocked.isFlush;
// @ts-expect-error unknown flag
view.is('isNothing');
const b: Board = board(['Kh', '9h', '4c', '2d'], { street: 'turn' });
const one: Classification = b.classify('AhJh');
const fd: boolean = one.is('isFlushDraw') && one.is(FLAGS.isComboDraw);
const made: string = one.category;
const batch: BatchClassification = b.classifyAll(parseRange('AKs,QQ'));
const firstFd: boolean = hasFlag(batch.lo[0], batch.hi[0], FLAGS.isFlushDraw);
const fromNumbers: BatchClassification = b.classifyAll(Int8Array.of(cardIndex('Ah'), cardIndex('Jh')));
const name: string = cardString(51);
// @ts-expect-error unknown flag
one.is('isNothing');
const nut: boolean = e.isNutFlushDraw || e.isBackdoorStraightDraw || e.isDoubleGutshot || e.isBackdoorComboDraw || e.isNutBackdoorFlushDraw;
const villainBackdoors: string[] = matchup.blockers().heroBlocks.blocked.isBackdoorStraightDraw;
