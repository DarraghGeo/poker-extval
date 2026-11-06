// Type definitions for poker-extval

/** A card: a rank (A, K, Q, J, T, 9-2) followed by a suit (s, h, d, c), e.g. 'Ah' or 'Td'. */
export type Card = string;

/** A street. Inferred from the card count when not given: 5 cards is the flop, 6 the turn, 7+ the river. */
export type Street = 'flop' | 'turn' | 'river';

/** Range notation: a comma-separated string ('AA,KQs,JTo') or an array of entries. Any poker-rangeman notation works. */
export type Range = string | string[];

export type MadeHand =
  | 'isRoyalFlush'
  | 'isStraightFlush'
  | 'isFourOfAKind'
  | 'isFullHouse'
  | 'isFlush'
  | 'isStraight'
  | 'isThreeOfAKind'
  | 'isTwoPair'
  | 'isPair'
  | 'isHighCard';

export type VillainDraw =
  | 'isFlushDraw'
  | 'isBackdoorFlushDraw'
  | 'isNutFlushDraw'
  | 'isNutBackdoorFlushDraw'
  | 'isOpenEndedStraightDraw'
  | 'isInsideStraightDraw'
  | 'isDoubleGutshot'
  | 'isStraightDraw'
  | 'isBackdoorStraightDraw'
  | 'isComboDraw'
  | 'isBackdoorComboDraw';

export type Flag =
  | MadeHand
  | 'isOverPair'
  | 'isTopPair'
  | 'isMiddlePair'
  | 'isBottomPair'
  | 'isTopAndMiddlePair'
  | 'isTopAndBottomPair'
  | 'isMiddleAndBottomPair'
  | 'isTopThreeOfAKind'
  | 'isMiddleThreeOfAKind'
  | 'isBottomThreeOfAKind'
  | VillainDraw
  | 'isStraightWheel'
  | 'isOpenEndedStraightDrawWheel'
  | 'isInsideStraightDrawWheel'
  | 'isUnderPair'
  | 'isOvercard'
  | 'isTwoOvercards'
  | 'isOvercardAndMiddleCard'
  | 'isOvercardAndUndercard'
  | 'isTwoMiddleCards'
  | 'isMiddleAndUndercard'
  | 'isTwoUndercards';

/** Villain combos grouped by what they would hold. Every key is always present. */
export type BlockedCombos = Record<MadeHand | VillainDraw | 'onBoard', string[]>;

export interface BlockerView {
  /** Combos villain can still hold. */
  unblocked: string[];
  /** Blocked combos by made hand and draw; combos holding a board card under `onBoard`. */
  blocked: BlockedCombos;
}

export interface VillainRange {
  /** Blocked by a board card. */
  boardBlocks: BlockerView;
  /** Blocked by one of hero's hole cards. */
  heroBlocks: BlockerView;
  /** Blocked by any known card. */
  allBlocks: BlockerView;
}

/** One 5-card evaluation: every flag, plus the cards behind each one. */
export type Evaluation = { [F in Flag]: boolean } & {
  /** Cards behind each true flag, high to low; [] for false flags. */
  keyCards: Record<Flag, Card[]>;
  /** Cards outside each true flag's key cards; [] for false flags. */
  kickerCards: Record<Flag, Card[]>;
  /** Whether the strongest made hand uses a hole card; null without hole cards. */
  usesHoleCards: boolean | null;
  /** Present when a villain range is supplied. */
  villainRange?: VillainRange;
};

/** Evaluations keyed by 5-card hand, e.g. 'As, Ks, Qs, Js, Ts'. Strict mode has exactly one key. */
export type EvaluationResult = Record<string, Evaluation>;

export interface EvaluateHandOptions {
  /** Only the strongest made hand (and the hand's draws) when true; every 5-card combination when false. Default true. */
  strict?: boolean;
  /** The player's 2 hole cards, both present in `cards`. */
  holeCards?: Card[] | null;
  /** Villain's range; adds `villainRange` to every evaluation. */
  villainRange?: Range | null;
  /** The street; inferred from the card count when not given. */
  street?: Street | null;
}

export interface EvaluateOptions {
  holeCards?: Card[] | null;
  villainRange?: Range | null;
  street?: Street | null;
}

/** The flat result of `evaluate`: the best hand plus its evaluation. */
export type FlatEvaluation = Evaluation & {
  /** The best five cards, high to low. */
  hand: Card[];
  /** The made hand. */
  category: MadeHand;
  /** 10 (royal flush) down to 1 (high card). */
  strength: number;
  /** [strength, ...tiebreak ranks]; compare element by element, the higher array wins. */
  rank: number[];
  /** The street used. */
  street: Street;
};

export interface EquityResult {
  win: number;
  tie: number;
  lose: number;
  /** (win + tie / 2) / total, or null if no matchup was possible. */
  equity: number | null;
}

export interface EquityOptions {
  /** Cards known to be out of play. */
  deadCards?: Card[];
  /** Monte Carlo samples per matchup, used preflop only. Default 10000. */
  iterations?: number;
}

export interface AnalyzeHandOptions {
  /** Hero's 2 hole cards, both present in `cards`. */
  holeCards: Card[];
  /** Villain's range; the equity measures need it. */
  villainRange?: Range | null;
  /** Share of villain's possible hands an out must beat to be graded strong. Default 0.8. */
  strongThreshold?: number;
}

export type OutGrade = 'nuts' | 'strong' | 'weak';

export interface OutDetail {
  card: Card;
  /** The made hand the card gives hero. */
  category: MadeHand;
  /** Share of villain's possible hands hero beats after the card (ties count half). */
  handStrength: number;
  grade: OutGrade;
  /** With a villain range: no live villain combo beats hero after the card. */
  clean?: boolean;
  /** With a villain range: the share of live villain combos that still beat hero after the card. */
  beatenBy?: number;
}

export interface Outs {
  count: number;
  cards: Card[];
  /** Outs that make a hand nothing can beat. */
  nuts: Card[];
  /** Outs that make a hand beating at least strongThreshold of villain's possible hands. */
  strong: Card[];
  /** Every other out. */
  weak: Card[];
  /** Outs by the made hand they give. Every key is always present. */
  byType: Record<MadeHand, Card[]>;
  /** With a villain range: outs after which no live villain combo beats hero; null without one. */
  clean: Card[] | null;
  /** With a villain range: outs after which some live villain combo still beats hero; null without one. */
  dirty: Card[] | null;
  details: OutDetail[];
}

export interface NextCardSpread {
  /** Mean of the equity after each next card. */
  average: number;
  best: { card: Card; equity: number };
  worst: { card: Card; equity: number };
  standardDeviation: number;
  /** Equity after each next card that leaves villain a live combo. */
  byCard: Record<Card, number>;
}

export interface HandAnalysis {
  street: Street;
  /** Hero's current made hand. */
  category: MadeHand;
  /** Share of every hand villain could hold that hero beats now (ties count half). */
  handStrength: number;
  outs: Outs;
  /** All-in equity against the villain range, every runout counted; null without a range. */
  equity: number | null;
  /** Equity if no more cards were dealt; null without a range. */
  equityNow: number | null;
  /** equity - equityNow; null without a range. */
  drawEquity: number | null;
  /** Equity after each next card; null on the river or without a range. */
  nextCard: NextCardSpread | null;
  /** The part of equity won only with both runout cards (flop only); null otherwise. */
  runnerRunnerEquity: number | null;
  /** Live villain combos the equity is measured against; null without a range. */
  villainCombos: number | null;
}

/** Evaluates a hand of 5 or more cards. */
export function evaluateHand(cards: Card[], options?: EvaluateHandOptions): EvaluationResult;
export function evaluateHand(
  cards: Card[],
  strict?: boolean,
  holeCards?: Card[] | null,
  villainRange?: Range | null
): EvaluationResult;

export interface HandOptions {
  /** Hero's 2 hole cards, both present in `cards`. Needed for outs and ranges. */
  holeCards?: Card[] | null;
  /** The street; inferred from the card count when not given. */
  street?: Street | null;
}

/** A hand whose methods each work out only what they return, once, and remember it. */
export interface HandView {
  readonly cards: Card[];
  readonly holeCards: Card[] | null;
  readonly street: Street | null;
  /** The flat evaluation, as evaluate() returns it. */
  evaluation(): FlatEvaluation;
  /** The best five cards and the made hand. */
  made(): { hand: Card[]; category: MadeHand; strength: number; rank: number[] };
  /** Every flag of the best hand (strict mode). */
  flags(): { [F in Flag]: boolean };
  /** Whether one flag is true; throws for an unknown flag. */
  is(flag: Flag): boolean;
  /** The hand's draws and their key cards. */
  draws(): { flags: Record<VillainDraw | 'isOpenEndedStraightDrawWheel' | 'isInsideStraightDrawWheel', boolean>; keyCards: Record<VillainDraw | 'isOpenEndedStraightDrawWheel' | 'isInsideStraightDrawWheel', Card[]> };
  /** Graded outs (needs hole cards and a board of 3 to 5 cards). */
  outs(options?: { strongThreshold?: number }): Outs;
  /** Hero's share of every hand villain could hold that hero beats now (needs hole cards). */
  handStrength(): number;
  /** Hero against a villain range (needs hole cards for the equity measures). */
  vs(range: Range): MatchupView;
}

/** Hero's hand against a villain range; every runout is counted once, on the first equity call. */
export interface MatchupView {
  readonly hand: HandView;
  /** Villain's exact combos. */
  readonly combos: string[];
  /** All-in equity; null if no villain combo is live. */
  equity(): number | null;
  /** Equity if no more cards were dealt; null if no villain combo is live. */
  equityNow(): number | null;
  /** equity - equityNow; null if no villain combo is live. */
  drawEquity(): number | null;
  /** Equity after each next card; null on the river or if no villain combo is live. */
  nextCard(): NextCardSpread | null;
  /** Equity won only with both runout cards (flop only, else null). */
  runnerRunner(): number | null;
  /** How many villain combos are live. */
  liveCombos(): number;
  /** Graded outs, with clean and dirty against the range. */
  outs(options?: { strongThreshold?: number }): Outs;
  /** Villain's combos split by which known cards block them, as classifyRange returns. */
  blockers(): VillainRange;
}

/** The chainable, lazy entry point: hand(cards, { holeCards }).is('isFlushDraw'), .vs(range).equity(), ... */
export function hand(cards: Card[], options?: HandOptions): HandView;

/** Analyses a hand: graded outs and hand strength, plus equity measures against a villain range. */
export function analyzeHand(cards: Card[], options: AnalyzeHandOptions): HandAnalysis;

/** Evaluates a hand in strict mode and returns one flat object. */
export function evaluate(cards: Card[], options?: EvaluateOptions): FlatEvaluation;

/** Splits a villain range by which known cards block it. */
export function classifyRange(
  cards: Card[],
  holeCards: Card[] | null,
  range: Range,
  options?: { street?: Street | null }
): VillainRange;

/** Expands range notation into exact combos, e.g. 'AKs' to ['AcKc', 'AdKd', 'AhKh', 'AsKs']. */
export function parseRange(range: Range): string[];

/** Compares two hands on a board: 1 if handA wins, -1 if handB wins, 0 for a tie. */
export function compareHands(handA: Card[], handB: Card[], board?: Card[]): 1 | -1 | 0;

/** Hero's equity against villain by running out the board. */
export function equity(
  hero: Range | Card[],
  villain: Range | Card[],
  board?: Card[],
  options?: EquityOptions
): Promise<EquityResult>;

export class HandEvaluator {
  constructor(cards: Card[], options?: EvaluateHandOptions);
  constructor(cards: Card[], strict?: boolean, holeCards?: Card[] | null, villainRange?: Range | null);
  readonly cards: Card[];
  readonly strict: boolean;
  readonly holeCards: Card[] | null;
  readonly street: Street | null;
  readonly evaluation: EvaluationResult;
}

/** Flag index by name, in the order of an evaluation's properties. Read flags with hasFlag. */
export const FLAGS: Readonly<{ [F in Flag]: number }>;

/** Whether flag `flag` (an index from FLAGS) is set in the two flag words. */
export function hasFlag(lo: number, hi: number, flag: number): boolean;

/** The card number (rank * 4 + suit: 0 = 2s ... 51 = Ac) of a card string, or -1. */
export function cardIndex(card: Card): number;

/** The card string of a card number (0-51). */
export function cardString(card: number): Card;

/** One combo classified by Board.classify. */
export interface Classification {
  /** Made hands, position labels, hole card categories (read with hasFlag). */
  readonly lo: number;
  /** Draws (read with hasFlag). */
  readonly hi: number;
  /** Made hand strength: 10 royal flush ... 1 high card. */
  readonly strength: number;
  /** poker-bitvaljs score of the best five: higher wins, equal ties. */
  readonly score: number;
  /** The best five cards, high to low. */
  readonly five: Card[];
  /** The made hand. */
  readonly category: MadeHand;
  /** Whether a flag is set, by name or FLAGS index. */
  is(flag: Flag | number): boolean;
  /** Every flag, as evaluateHand gives them. */
  flags(): { [F in Flag]: boolean };
  /** evaluateHand's keyCards for the hand (board then hole cards): every flag, or one. */
  keyCards(): { [F in Flag]: Card[] };
  keyCards(flag: Flag | number): Card[];
  /** evaluateHand's kickerCards: every flag, or one. */
  kickerCards(): { [F in Flag]: Card[] };
  kickerCards(flag: Flag | number): Card[];
  /** Whether the made hand uses a hole card. */
  usesHoleCards(): boolean;
}

/** Many combos classified at once by Board.classifyAll; index i is combo i. */
export interface BatchClassification {
  readonly count: number;
  readonly lo: Int32Array;
  readonly hi: Int32Array;
  readonly strength: Uint8Array;
  readonly score: Int32Array;
  /** 1 where the combo shares a card with the board (its other entries are 0). */
  readonly blocked: Uint8Array;
  /** Combo i's key cards (every flag, or one), worked out on demand; null when blocked. */
  keyCards(i: number): { [F in Flag]: Card[] } | null;
  keyCards(i: number, flag: Flag | number): Card[] | null;
  /** Combo i's kicker cards (every flag, or one); null when blocked. */
  kickerCards(i: number): { [F in Flag]: Card[] } | null;
  kickerCards(i: number, flag: Flag | number): Card[] | null;
  /** Whether combo i's made hand uses one of its cards; null when blocked. */
  usesHoleCards(i: number): boolean | null;
}

export interface BoardOptions {
  /** Defaults to the card count: 3 flop, 4 turn, 5 river. */
  street?: Street | null;
}

/** A board, worked out once, to classify hole card combos on (strict mode). */
export interface Board {
  /** The board cards as card numbers. */
  readonly cards: number[];
  readonly street: Street | null;
  /** Classifies hole cards: 'AhJs', ['Ah', 'Js'] or two card numbers. */
  classify(hole: string | Card[] | number[]): Classification;
  /** Classifies many combos ('AhKd' strings, or card numbers in pairs) into typed arrays. */
  classifyAll(combos: string[] | ArrayLike<number>): BatchClassification;
}

/** A board of 3 to 5 cards (strings or card numbers) to classify combos on. */
export function board(cards: Card[] | number[], options?: BoardOptions): Board;

export default evaluateHand;
