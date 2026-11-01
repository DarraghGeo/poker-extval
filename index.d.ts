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

/** Evaluates a hand of 5 or more cards. */
export function evaluateHand(cards: Card[], options?: EvaluateHandOptions): EvaluationResult;
export function evaluateHand(
  cards: Card[],
  strict?: boolean,
  holeCards?: Card[] | null,
  villainRange?: Range | null
): EvaluationResult;

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
