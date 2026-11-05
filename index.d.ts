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
  | 'isOpenEndedStraightDraw'
  | 'isInsideStraightDraw'
  | 'isStraightDraw'
  | 'isComboDraw';

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
  | 'isFlushDraw'
  | 'isBackdoorFlushDraw'
  | 'isOpenEndedStraightDraw'
  | 'isInsideStraightDraw'
  | 'isStraightDraw'
  | 'isStraightWheel'
  | 'isOpenEndedStraightDrawWheel'
  | 'isInsideStraightDrawWheel'
  | 'isComboDraw'
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

export default evaluateHand;
