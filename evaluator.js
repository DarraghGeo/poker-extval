/**
 * Poker Hand Evaluator
 * 
 * Evaluates poker hands from 5 or more cards and identifies all possible made hands and draws.
 * For inputs with more than 5 cards, generates all possible 5-card combinations and evaluates each one.
 * 
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 * @class HandEvaluator
 * @example
 * // Evaluate a 5-card hand
 * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts']);
 * const result = evaluator.evaluation;
 * // result = { "As, Ks, Qs, Js, Ts": { isRoyalFlush: true, isStraight: true, ... } }
 * 
 * @example
 * // Evaluate a 6-card hand (generates 6 combinations)
 * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s']);
 * const result = evaluator.evaluation;
 * // result contains 6 key-value pairs, one for each 5-card combination
 */
class HandEvaluator {
  /**
   * Creates an instance of HandEvaluator.
   * 
   * @param {string[]} cards - Array of 5 or more card strings in format "Rs" where:
   *   - R is rank: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
   *   - s is suit: s (spades), h (hearts), d (diamonds), c (clubs)
   * @throws {Error} If cards is not an array, has fewer than 5 cards, contains invalid format,
   *   invalid rank, invalid suit, or duplicate cards
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts']);
   */
  constructor(cards) {
    this.#validateCards(cards);
    this.cards = cards;
    this.evaluation = this.#evaluateAllCombinations();
  }

  /**
   * Validates the input cards array for correct format, length, and uniqueness.
   * 
   * @private
   * @param {string[]} cards - Array of card strings to validate
   * @throws {Error} If cards is not an array
   * @throws {Error} If cards array has fewer than 5 cards
   * @throws {Error} If any card is not a string
   * @throws {Error} If any card has invalid format (less than 2 characters)
   * @throws {Error} If any card has an invalid rank (not A, K, Q, J, T, 9-2)
   * @throws {Error} If any card has an invalid suit (not s, h, d, c)
   * @throws {Error} If duplicate cards are found
   */
  #validateCards(cards) {
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }
    if (cards.length < 5) {
      throw new Error(`Expected at least 5 cards, received ${cards.length}`);
    }
    
    const validRanks = new Set(['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']);
    const validSuits = new Set(['s', 'h', 'd', 'c']);
    const seenCards = new Set();
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      
      if (typeof card !== 'string') {
        throw new Error(`Card at index ${i} must be a string`);
      }
      
      // Check if card has at least 2 characters (rank + suit)
      if (card.length < 2) {
        throw new Error(`Card at index ${i} has invalid format: "${card}"`);
      }
      
      // Check for duplicate cards
      if (seenCards.has(card)) {
        throw new Error(`Duplicate card found: "${card}"`);
      }
      seenCards.add(card);
      
      // Extract rank and suit
      // All ranks are single characters (A, K, Q, J, T, 9-2)
      let rank, suit;
      if (card.length >= 2) {
        rank = card.slice(0, -1);
        suit = card.slice(-1);
      } else {
        throw new Error(`Card at index ${i} has invalid format: "${card}"`);
      }
      
      if (!validRanks.has(rank)) {
        throw new Error(`Card at index ${i} has invalid rank: "${rank}"`);
      }
      
      if (!validSuits.has(suit)) {
        throw new Error(`Card at index ${i} has invalid suit: "${suit}"`);
      }
    }
  }

  /**
   * Generates all possible combinations of a given size from an array of cards.
   * Uses recursive algorithm to generate combinations without repetition.
   * 
   * @private
   * @param {string[]} cards - Array of card strings
   * @param {number} size - Size of each combination (must be 5 for poker hands)
   * @returns {string[][]} Array of arrays, where each inner array is a combination of cards
   * @example
   * // Generate all 5-card combinations from 6 cards
   * this.#generateCombinations(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s'], 5)
   * // Returns 6 combinations: C(6,5) = 6
   */
  #generateCombinations(cards, size) {
    if (size === 0) return [[]];
    if (cards.length < size) return [];
    if (cards.length === size) return [cards];
    
    const combinations = [];
    for (let i = 0; i <= cards.length - size; i++) {
      const head = cards[i];
      const tail = cards.slice(i + 1);
      const tailCombinations = this.#generateCombinations(tail, size - 1);
      for (const combo of tailCombinations) {
        combinations.push([head, ...combo]);
      }
    }
    return combinations;
  }

  /**
   * Formats a hand of cards into a sorted, comma-space separated string key.
   * Cards are sorted from highest to lowest rank (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2).
   * 
   * @private
   * @param {string[]} cards - Array of 5 card strings
   * @returns {string} Formatted string like "As, Ks, Qs, Js, Ts"
   * @example
   * this.#formatHandKey(['Ts', 'As', 'Ks', 'Qs', 'Js'])
   * // Returns "As, Ks, Qs, Js, Ts"
   */
  #formatHandKey(cards) {
    const sortedCards = [...cards];
    sortedCards.sort((a, b) => this.#getRankValue(b) - this.#getRankValue(a));
    return sortedCards.join(', ');
  }

  /**
   * Evaluates a single 5-card hand and returns an evaluation object with all hand types and draws.
   * Temporarily sets this.evaluation to an empty object to allow evaluation methods to cache results.
   * 
   * @private
   * @returns {Object} Evaluation object with boolean properties for all hand types:
   *   - Made hands: isFourOfAKind, isFullHouse, isThreeOfAKind, isTwoPair, isPair, isFlush,
   *     isStraight, isRoyalFlush, isStraightFlush, isHighCard
   *   - Pair categorization: isTopPair, isMiddlePair, isBottomPair
   *   - Two pair categorization: isTopAndMiddlePair, isTopAndBottomPair, isMiddleAndBottomPair
   *   - Three of a kind categorization: isTopThreeOfAKind, isMiddleThreeOfAKind, isBottomThreeOfAKind
   *   - Draws: isFlushDraw, isBackdoorFlushDraw, isOpenEndedStraightDraw, isInsideStraightDraw
   */
  #evaluateSingleHand() {
    // Temporarily set this.evaluation to an empty object for the evaluation methods to use
    const originalEvaluation = this.evaluation;
    this.evaluation = {};
    
    // Call all evaluation methods - they will populate this.evaluation
    this.isFourOfAKind();
    this.isFullHouse();
    this.isThreeOfAKind();
    this.isTwoPair();
    this.isPair();
    this.isFlush();
    this.isTopPair();
    this.isMiddlePair();
    this.isBottomPair();
    this.isTopAndMiddlePair();
    this.isTopAndBottomPair();
    this.isMiddleAndBottomPair();
    this.isTopThreeOfAKind();
    this.isMiddleThreeOfAKind();
    this.isBottomThreeOfAKind();
    this.isFlushDraw();
    this.isBackdoorFlushDraw();
    this.isStraight();
    this.isRoyalFlush();
    this.isStraightFlush();
    this.isOpenEndedStraightDraw();
    this.isInsideStraightDraw();
    this.isHighCard();
    
    // Get the evaluation object and restore original
    const evaluation = this.evaluation;
    this.evaluation = originalEvaluation;
    return evaluation;
  }

  /**
   * Evaluates all possible 5-card combinations from the input cards.
   * For exactly 5 cards, evaluates directly. For more cards, generates all combinations
   * and evaluates each one, returning an object mapping formatted hand strings to evaluation objects.
   * 
   * @private
   * @returns {Object<string, Object>} Object where:
   *   - Keys are formatted hand strings (e.g., "As, Ks, Qs, Js, Ts")
   *   - Values are evaluation objects with boolean properties for all hand types
   * @example
   * // With 5 cards: returns object with 1 key-value pair
   * // With 6 cards: returns object with 6 key-value pairs (C(6,5) = 6)
   * // With 7 cards: returns object with 21 key-value pairs (C(7,5) = 21)
   */
  #evaluateAllCombinations() {
    // If exactly 5 cards, evaluate directly and wrap in the new format
    if (this.cards.length === 5) {
      const key = this.#formatHandKey(this.cards);
      const evaluation = this.#evaluateSingleHand();
      return { [key]: evaluation };
    }
    
    // For more than 5 cards, generate all combinations
    const combinations = this.#generateCombinations(this.cards, 5);
    const result = {};
    for (const combination of combinations) {
      const key = this.#formatHandKey(combination);
      // Create a temporary evaluator with the 5-card combination
      // This will evaluate directly since it's exactly 5 cards
      const tempEvaluator = new HandEvaluator(combination);
      // Extract the evaluation object from the single key-value pair
      const evaluationKey = Object.keys(tempEvaluator.evaluation)[0];
      result[key] = tempEvaluator.evaluation[evaluationKey];
    }
    return result;
  }

  /**
   * Gets the numeric rank value for a card using standard poker ranking (Ace high).
   * Ace = 13, King = 12, Queen = 11, Jack = 10, Ten = 9, 9 = 8, ..., 2 = 1
   * 
   * @private
   * @param {string} card - Card string in format "Rs" (e.g., "As", "Kh")
   * @returns {number} Numeric rank value (1-13)
   * @example
   * this.#getRankValue('As') // Returns 13
   * this.#getRankValue('2s') // Returns 1
   * this.#getRankValue('Ts') // Returns 9
   */
  #getRankValue(card) {
    const rank = card.slice(0, -1);
    const rankMap = { A: 13, K: 12, Q: 11, J: 10, T: 9, '9': 8, '8': 7, '7': 6, '6': 5, '5': 4, '4': 3, '3': 2, '2': 1 };
    return rankMap[rank];
  }

  /**
   * Gets the numeric rank value for a card using wheel ranking (Ace low for wheel straights).
   * Ace = 1, 2 = 2, 3 = 3, ..., King = 13
   * Used for evaluating wheel straights (A-2-3-4-5).
   * 
   * @private
   * @param {string} card - Card string in format "Rs" (e.g., "As", "2h")
   * @returns {number} Numeric rank value (1-13)
   * @example
   * this.#getRankValueWheel('As') // Returns 1 (Ace low)
   * this.#getRankValueWheel('2s') // Returns 2
   * this.#getRankValueWheel('Ks') // Returns 13
   */
  #getRankValueWheel(card) {
    const rank = card.slice(0, -1);
    const rankMap = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13 };
    return rankMap[rank];
  }

  /**
   * Sorts cards from highest to lowest rank using standard poker ranking (Ace high).
   * Modifies the array in place. If no cards parameter is provided, sorts this.cards.
   * 
   * @param {string[]} [cards=null] - Optional array of card strings to sort.
   *   If null or undefined, sorts this.cards instead.
   * @returns {void}
   * @example
   * const evaluator = new HandEvaluator(['2s', 'As', 'Ks', '5s', 'Ts']);
   * evaluator.sort(); // Modifies evaluator.cards to ['As', 'Ks', 'Ts', '5s', '2s']
   * 
   * @example
   * const cards = ['2s', 'As', 'Ks'];
   * evaluator.sort(cards); // Modifies cards array to ['As', 'Ks', '2s']
   */
  sort(cards = null) {
    const cardsToSort = cards || this.cards;
    cardsToSort.sort((a, b) => this.#getRankValue(b) - this.#getRankValue(a));
  }

  /**
   * Sorts cards from highest to lowest rank using wheel ranking (Ace low).
   * Modifies the array in place. Used for evaluating wheel straights (A-2-3-4-5).
   * If no cards parameter is provided, sorts this.cards.
   * 
   * @param {string[]} [cards=null] - Optional array of card strings to sort.
   *   If null or undefined, sorts this.cards instead.
   * @returns {void}
   * @example
   * const evaluator = new HandEvaluator(['As', '2s', '3s', '4s', '5s']);
   * evaluator.sortWheel(); // Modifies evaluator.cards to ['5s', '4s', '3s', '2s', 'As']
   */
  sortWheel(cards = null) {
    const cardsToSort = cards || this.cards;
    cardsToSort.sort((a, b) => this.#getRankValueWheel(b) - this.#getRankValueWheel(a));
  }

  /**
   * Calculates the distance (rank difference) between the highest and lowest card.
   * Uses standard poker ranking (Ace high). Distance of 4 indicates a possible straight.
   * 
   * @param {string[]} [cards=null] - Optional array of card strings to evaluate.
   *   If null or undefined, uses this.cards instead.
   * @returns {number} Distance between highest and lowest card (0-12)
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts']);
   * evaluator.getDistance(); // Returns 4 (A=13, T=9, 13-9=4)
   * 
   * @example
   * evaluator.getDistance(['As', '2s', '3s', '4s', '5s']);
   * // Returns 12 (A=13, 2=1, 13-1=12)
   */
  getDistance(cards = null) {
    if (cards) {
      // If cards array provided, sort a copy and calculate distance
      if (cards.length === 0) return 0;
      const sortedCards = [...cards].sort((a, b) => this.#getRankValue(b) - this.#getRankValue(a));
      return this.#getRankValue(sortedCards[0]) - this.#getRankValue(sortedCards[sortedCards.length - 1]);
    }
      // If no cards provided, use instance cards property
    if (this.cards.length === 0) return 0;
    this.sort();
    return this.#getRankValue(this.cards[0]) - this.#getRankValue(this.cards[this.cards.length - 1]);
  }

  /**
   * Calculates the distance (rank difference) between the highest and lowest card using wheel ranking.
   * Uses wheel ranking (Ace low). Distance of 4 indicates a possible wheel straight (A-2-3-4-5).
   * 
   * @param {string[]} [cards=null] - Optional array of card strings to evaluate.
   *   If null or undefined, uses this.cards instead.
   * @returns {number} Distance between highest and lowest card using wheel ranking (0-12)
   * @example
   * const evaluator = new HandEvaluator(['As', '2s', '3s', '4s', '5s']);
   * evaluator.getDistanceWheel(); // Returns 4 (5=5, A=1, 5-1=4) - wheel straight
   */
  getDistanceWheel(cards = null) {
    if (cards) {
      // If cards array provided, sort a copy using wheel values and calculate distance
      if (cards.length === 0) return 0;
      const sortedCards = [...cards].sort((a, b) => this.#getRankValueWheel(b) - this.#getRankValueWheel(a));
      return this.#getRankValueWheel(sortedCards[0]) - this.#getRankValueWheel(sortedCards[sortedCards.length - 1]);
    }
    // If no cards provided, use instance cards property
    if (this.cards.length === 0) return 0;
    this.sortWheel();
    return this.#getRankValueWheel(this.cards[0]) - this.#getRankValueWheel(this.cards[this.cards.length - 1]);
  }

  /**
   * Counts the occurrences of each suit in the hand.
   * 
   * @returns {Object<string, number>} Object mapping suit to count:
   *   { s: count, h: count, d: count, c: count }
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts']);
   * evaluator.countSuits(); // Returns { s: 5 }
   * 
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', 'Qd', 'Jc', 'Ts']);
   * evaluator.countSuits(); // Returns { s: 2, h: 1, d: 1, c: 1 }
   */
  countSuits() {
    return this.cards.reduce((acc, card) => ({ ...acc, [card.slice(-1)]: (acc[card.slice(-1)] || 0) + 1 }), {});
  }

  /**
   * Counts the occurrences of each rank and returns sorted counts (descending).
   * Used to identify pairs, three of a kind, four of a kind, etc.
   * 
   * @returns {number[]} Array of rank counts sorted in descending order
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Kc', 'Ks']);
   * evaluator.countRanks(); // Returns [3, 2] (three aces, two kings)
   * 
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
   * evaluator.countRanks(); // Returns [2, 2, 1] (two aces, two kings, one queen)
   */
  countRanks() {
    this.sort();
    const rankCounts = this.cards.reduce((acc, card) => (acc[card.slice(0, -1)] = (acc[card.slice(0, -1)] || 0) + 1, acc), {});
    return Object.values(rankCounts).sort((a, b) => b - a);
  }

  /**
   * Gets a map of rank to count for all cards in the hand.
   * 
   * @private
   * @returns {Object<string, number>} Object mapping rank to count
   * @example
   * // For ['As', 'Ah', 'Ad', 'Kc', 'Ks']
   * // Returns { A: 3, K: 2 }
   */
  #getRankCounts() {
    this.sort();
    return this.cards.reduce((acc, card) => (acc[card.slice(0, -1)] = (acc[card.slice(0, -1)] || 0) + 1, acc), {});
  }

  /**
   * Gets rank counts sorted by rank value (highest first).
   * Returns an array of objects with rank, count, and value properties.
   * 
   * @private
   * @returns {Array<{rank: string, count: number, value: number}>} Array of rank info objects
   * @example
   * // For ['As', 'Ah', 'Kd', 'Kc', 'Qs']
   * // Returns [{ rank: 'A', count: 2, value: 13 }, { rank: 'K', count: 2, value: 12 }, ...]
   */
  #getRankCountsSorted() {
    const rankCounts = this.#getRankCounts();
    return Object.keys(rankCounts).map(r => ({ rank: r, count: rankCounts[r], value: this.#getRankValue(r + 's') })).sort((a, b) => b.value - a.value);
  }

  /**
   * Calculates the gaps (rank differences) between consecutive cards.
   * Returns an array of 4 gap values representing the differences between adjacent cards.
   * 
   * @private
   * @returns {number[]} Array of 4 gap values
   * @example
   * // For ['As', 'Ks', 'Qs', 'Js', 'Ts'] (consecutive ranks)
   * // Returns [1, 1, 1, 1] (all gaps are 1)
   * 
   * @example
   * // For ['As', 'Ks', 'Qs', 'Js', '9s'] (gap at the end)
   * // Returns [1, 1, 1, 2] (gap of 2 between J and 9)
   */
  #getGaps() {
    this.sort();
    const gaps = [];
    for (let i = 0; i < 4; i++) {
      gaps.push(this.#getRankValue(this.cards[i]) - this.#getRankValue(this.cards[i + 1]));
    }
    return gaps;
  }

  /**
   * Calculates the gaps (rank differences) between consecutive cards using wheel ranking.
   * Returns an array of 4 gap values representing the differences between adjacent cards.
   * Used for evaluating wheel straights and draws.
   * 
   * @private
   * @returns {number[]} Array of 4 gap values using wheel ranking
   * @example
   * // For ['As', '2s', '3s', '4s', '5s'] (wheel straight)
   * // Returns [1, 1, 1, 1] (all gaps are 1)
   */
  #getGapsWheel() {
    this.sortWheel();
    const gaps = [];
    for (let i = 0; i < 4; i++) {
      gaps.push(this.#getRankValueWheel(this.cards[i]) - this.#getRankValueWheel(this.cards[i + 1]));
    }
    return gaps;
  }

  // ==================== MADE HANDS ====================
  
  /**
   * Determines if the hand contains four cards of the same rank.
   * 
   * @returns {boolean} True if the hand is four of a kind, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
   * evaluator.isFourOfAKind(); // Returns true
   */
  isFourOfAKind() {
    if (this.evaluation.isFourOfAKind !== undefined) return this.evaluation.isFourOfAKind;
    const ranks = this.countRanks();
    return this.evaluation.isFourOfAKind = ranks[0] === 4 && ranks[1] === 1;
  }

  /**
   * Determines if the hand contains three cards of one rank and two cards of another rank.
   * 
   * @returns {boolean} True if the hand is a full house, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Kc', 'Ks']);
   * evaluator.isFullHouse(); // Returns true
   */
  isFullHouse() {
    if (this.evaluation.isFullHouse !== undefined) return this.evaluation.isFullHouse;
    const ranks = this.countRanks();
    return this.evaluation.isFullHouse = ranks[0] === 3 && ranks[1] === 2;
  }

  /**
   * Determines if the hand contains three cards of the same rank (but not four of a kind or full house).
   * 
   * @returns {boolean} True if the hand is three of a kind, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Kc', 'Qs']);
   * evaluator.isThreeOfAKind(); // Returns true
   */
  isThreeOfAKind() {
    if (this.evaluation.isThreeOfAKind !== undefined) return this.evaluation.isThreeOfAKind;
    const ranks = this.countRanks();
    return this.evaluation.isThreeOfAKind = ranks[0] === 3 && ranks[1] === 1 && ranks[2] === 1;
  }

  /**
   * Determines if the hand contains two pairs of different ranks.
   * 
   * @returns {boolean} True if the hand is two pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
   * evaluator.isTwoPair(); // Returns true
   */
  isTwoPair() {
    if (this.evaluation.isTwoPair !== undefined) return this.evaluation.isTwoPair;
    const ranks = this.countRanks();
    return this.evaluation.isTwoPair = ranks[0] === 2 && ranks[1] === 2 && ranks[2] === 1;
  }

  /**
   * Determines if the hand contains exactly one pair (two cards of the same rank).
   * 
   * @returns {boolean} True if the hand is a pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Qc', 'Js']);
   * evaluator.isPair(); // Returns true
   */
  isPair() {
    if (this.evaluation.isPair !== undefined) return this.evaluation.isPair;
    const ranks = this.countRanks();
    return this.evaluation.isPair = ranks[0] === 2 && ranks[1] === 1 && ranks[2] === 1 && ranks[3] === 1;
  }

  // ==================== PAIR CATEGORIZATION ====================
  
  /**
   * Determines if the hand contains a pair where the paired rank is the highest card.
   * Requires that the hand is a pair (not two pair or higher).
   * 
   * @returns {boolean} True if the hand is a top pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Qc', 'Js']);
   * evaluator.isTopPair(); // Returns true (pair of aces, highest card)
   */
  isTopPair() {
    if (this.evaluation.isTopPair !== undefined) return this.evaluation.isTopPair;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (!this.evaluation.isPair) return this.evaluation.isTopPair = false;
    const rankCounts = this.#getRankCounts();
    return this.evaluation.isTopPair = rankCounts[this.cards[0].slice(0, -1)] === 2;
  }

  /**
   * Determines if the hand contains a pair where the paired rank is neither the highest nor lowest card.
   * Requires that the hand is a single pair (not two pair or higher).
   * 
   * @returns {boolean} True if the hand is a middle pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', 'Kd', 'Qc', 'Js']);
   * evaluator.isMiddlePair(); // Returns true (pair of kings, not highest or lowest)
   */
  isMiddlePair() {
    if (this.evaluation.isMiddlePair !== undefined) return this.evaluation.isMiddlePair;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (!this.evaluation.isPair || this.evaluation.isTwoPair) return this.evaluation.isMiddlePair = false;
    const ranks = this.#getRankCountsSorted();
    return this.evaluation.isMiddlePair = ranks.length === 4 && (ranks[1].count === 2 || ranks[2].count === 2);
  }

  /**
   * Determines if the hand contains a pair where the paired rank is the lowest card.
   * Requires that the hand is a pair (not two pair or higher).
   * 
   * @returns {boolean} True if the hand is a bottom pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', 'Qd', '2c', '2s']);
   * evaluator.isBottomPair(); // Returns true (pair of deuces, lowest card)
   */
  isBottomPair() {
    if (this.evaluation.isBottomPair !== undefined) return this.evaluation.isBottomPair;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (!this.evaluation.isPair) return this.evaluation.isBottomPair = false;
    const rankCounts = this.#getRankCounts();
    return this.evaluation.isBottomPair = rankCounts[this.cards[this.cards.length - 1].slice(0, -1)] === 2;
  }

  // ==================== TWO PAIR CATEGORIZATION ====================
  
  /**
   * Determines if the hand contains two pairs where both pairs are in the top two ranks.
   * Requires that the hand is two pair.
   * 
   * @returns {boolean} True if the hand is top and middle pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
   * evaluator.isTopAndMiddlePair(); // Returns true (aces and kings)
   */
  isTopAndMiddlePair() {
    if (this.evaluation.isTopAndMiddlePair !== undefined) return this.evaluation.isTopAndMiddlePair;
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (!this.evaluation.isTwoPair) return this.evaluation.isTopAndMiddlePair = false;
    const ranks = this.#getRankCountsSorted();
    return this.evaluation.isTopAndMiddlePair = ranks[0].count === 2 && ranks[1].count === 2;
  }

  /**
   * Determines if the hand contains two pairs where one pair is the highest rank and the other is the lowest rank.
   * Requires that the hand is two pair.
   * 
   * @returns {boolean} True if the hand is top and bottom pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Qc', '2s', '2h']);
   * evaluator.isTopAndBottomPair(); // Returns true (aces and deuces)
   */
  isTopAndBottomPair() {
    if (this.evaluation.isTopAndBottomPair !== undefined) return this.evaluation.isTopAndBottomPair;
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (!this.evaluation.isTwoPair) return this.evaluation.isTopAndBottomPair = false;
    const ranks = this.#getRankCountsSorted();
    return this.evaluation.isTopAndBottomPair = ranks[0].count === 2 && ranks[ranks.length - 1].count === 2;
  }

  /**
   * Determines if the hand contains two pairs where both pairs are in the middle and bottom ranks.
   * Requires that the hand is two pair.
   * 
   * @returns {boolean} True if the hand is middle and bottom pair, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', 'Kd', '2c', '2s']);
   * evaluator.isMiddleAndBottomPair(); // Returns true (kings and deuces)
   */
  isMiddleAndBottomPair() {
    if (this.evaluation.isMiddleAndBottomPair !== undefined) return this.evaluation.isMiddleAndBottomPair;
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (!this.evaluation.isTwoPair) return this.evaluation.isMiddleAndBottomPair = false;
    const ranks = this.#getRankCountsSorted();
    return this.evaluation.isMiddleAndBottomPair = ranks.length === 3 && ranks[1].count === 2 && ranks[2].count === 2;
  }

  // ==================== THREE OF A KIND CATEGORIZATION ====================
  
  /**
   * Determines if the hand contains three of a kind where the three cards are the highest rank.
   * Requires that the hand is three of a kind.
   * 
   * @returns {boolean} True if the hand is top three of a kind, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Kc', 'Qs']);
   * evaluator.isTopThreeOfAKind(); // Returns true (three aces)
   */
  isTopThreeOfAKind() {
    if (this.evaluation.isTopThreeOfAKind !== undefined) return this.evaluation.isTopThreeOfAKind;
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (!this.evaluation.isThreeOfAKind) return this.evaluation.isTopThreeOfAKind = false;
    const rankCounts = this.#getRankCounts();
    return this.evaluation.isTopThreeOfAKind = rankCounts[this.cards[0].slice(0, -1)] === 3;
  }

  /**
   * Determines if the hand contains three of a kind where the three cards are neither the highest nor lowest rank.
   * Requires that the hand is three of a kind.
   * 
   * @returns {boolean} True if the hand is middle three of a kind, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', 'Kd', 'Kc', 'Qs']);
   * evaluator.isMiddleThreeOfAKind(); // Returns true (three kings)
   */
  isMiddleThreeOfAKind() {
    if (this.evaluation.isMiddleThreeOfAKind !== undefined) return this.evaluation.isMiddleThreeOfAKind;
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (!this.evaluation.isThreeOfAKind) return this.evaluation.isMiddleThreeOfAKind = false;
    const ranks = this.#getRankCountsSorted();
    return this.evaluation.isMiddleThreeOfAKind = ranks.length === 3 && ranks[1].count === 3;
  }

  /**
   * Determines if the hand contains three of a kind where the three cards are the lowest rank.
   * Requires that the hand is three of a kind.
   * 
   * @returns {boolean} True if the hand is bottom three of a kind, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', '2d', '2c', '2s']);
   * evaluator.isBottomThreeOfAKind(); // Returns true (three deuces)
   */
  isBottomThreeOfAKind() {
    if (this.evaluation.isBottomThreeOfAKind !== undefined) return this.evaluation.isBottomThreeOfAKind;
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (!this.evaluation.isThreeOfAKind) return this.evaluation.isBottomThreeOfAKind = false;
    const rankCounts = this.#getRankCounts();
    return this.evaluation.isBottomThreeOfAKind = rankCounts[this.cards[this.cards.length - 1].slice(0, -1)] === 3;
  }

  // ==================== FLUSH EVALUATION ====================
  
  /**
   * Determines if all five cards are of the same suit.
   * 
   * @returns {boolean} True if the hand is a flush, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', '9s']);
   * evaluator.isFlush(); // Returns true (all spades)
   */
  isFlush() {
    if (this.evaluation.isFlush !== undefined) return this.evaluation.isFlush;
    const suits = this.countSuits();
    return this.evaluation.isFlush = Object.values(suits).some(count => count === 5);
  }

  /**
   * Determines if the hand has four cards of the same suit (one card away from a flush).
   * Returns false if the hand is already a flush.
   * 
   * @returns {boolean} True if the hand is a flush draw, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', '9h']);
   * evaluator.isFlushDraw(); // Returns true (4 spades, 1 heart)
   */
  isFlushDraw() {
    if (this.evaluation.isFlushDraw !== undefined) return this.evaluation.isFlushDraw;
    if (this.evaluation.isFlush === undefined) this.isFlush();
    if (this.evaluation.isFlush) return this.evaluation.isFlushDraw = false;
    const suits = this.countSuits();
    return this.evaluation.isFlushDraw = Object.values(suits).some(count => count === 4);
  }

  /**
   * Determines if the hand has three cards of the same suit (two cards away from a flush).
   * Returns false if the hand is already a flush or flush draw.
   * 
   * @returns {boolean} True if the hand is a backdoor flush draw, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Jh', '9h']);
   * evaluator.isBackdoorFlushDraw(); // Returns true (3 spades, 2 hearts)
   */
  isBackdoorFlushDraw() {
    if (this.evaluation.isBackdoorFlushDraw !== undefined) return this.evaluation.isBackdoorFlushDraw;
    if (this.evaluation.isFlush === undefined) this.isFlush();
    if (this.evaluation.isFlushDraw === undefined) this.isFlushDraw();
    if (this.evaluation.isFlush || this.evaluation.isFlushDraw) return this.evaluation.isBackdoorFlushDraw = false;
    const suits = this.countSuits();
    return this.evaluation.isBackdoorFlushDraw = Object.values(suits).some(count => count === 3);
  }

  // ==================== STRAIGHT EVALUATION ====================
  
  /**
   * Determines if the hand contains five consecutive ranks (a straight).
   * Checks both standard straights and wheel straights (A-2-3-4-5).
   * Returns false if the hand contains pairs or higher (which cannot be straights).
   * 
   * @returns {boolean} True if the hand is a straight, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts']);
   * evaluator.isStraight(); // Returns true (A-K-Q-J-T)
   * 
   * @example
   * const evaluator = new HandEvaluator(['As', '2s', '3s', '4s', '5s']);
   * evaluator.isStraight(); // Returns true (wheel: A-2-3-4-5)
   */
  isStraight() {
    if (this.evaluation.isStraight !== undefined) return this.evaluation.isStraight;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isPair || this.evaluation.isTwoPair || this.evaluation.isThreeOfAKind || this.evaluation.isFullHouse || this.evaluation.isFourOfAKind) return this.evaluation.isStraight = false;
    this.sort();
    const distance = this.getDistance();
    if (distance === 4) return this.evaluation.isStraight = true;
    if (this.isStraightWheel()) return this.evaluation.isStraight = true;
    return this.evaluation.isStraight = false;
  }

  /**
   * Determines if the hand is a wheel straight (A-2-3-4-5) using wheel ranking.
   * Returns false if the hand contains pairs or higher (which cannot be straights).
   * 
   * @returns {boolean} True if the hand is a wheel straight, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', '2s', '3s', '4s', '5s']);
   * evaluator.isStraightWheel(); // Returns true (wheel: A-2-3-4-5)
   */
  isStraightWheel() {
    if (this.evaluation.isStraightWheel !== undefined) return this.evaluation.isStraightWheel;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isPair || this.evaluation.isTwoPair || this.evaluation.isThreeOfAKind || this.evaluation.isFullHouse || this.evaluation.isFourOfAKind) return this.evaluation.isStraightWheel = false;
    this.sortWheel();
    const distance = this.getDistanceWheel();
    return this.evaluation.isStraightWheel = distance === 4;
  }

  /**
   * Determines if the hand is a royal flush (A-K-Q-J-T all of the same suit).
   * Requires that the hand is both a flush and a straight.
   * 
   * @returns {boolean} True if the hand is a royal flush, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts']);
   * evaluator.isRoyalFlush(); // Returns true
   */
  isRoyalFlush() {
    if (this.evaluation.isRoyalFlush !== undefined) return this.evaluation.isRoyalFlush;
    if (this.evaluation.isFlush === undefined) this.isFlush();
    if (this.evaluation.isStraight === undefined) this.isStraight();
    if (!this.evaluation.isFlush || !this.evaluation.isStraight) return this.evaluation.isRoyalFlush = false;
    const ranks = new Set(this.cards.map(c => c.slice(0, -1)));
    return this.evaluation.isRoyalFlush = ranks.has('A') && ranks.has('K') && ranks.has('Q') && ranks.has('J') && ranks.has('T');
  }

  /**
   * Determines if the hand is a straight flush (five consecutive ranks, all same suit, but not royal flush).
   * Requires that the hand is both a flush and a straight, but not a royal flush.
   * 
   * @returns {boolean} True if the hand is a straight flush, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['9s', '8s', '7s', '6s', '5s']);
   * evaluator.isStraightFlush(); // Returns true
   */
  isStraightFlush() {
    if (this.evaluation.isStraightFlush !== undefined) return this.evaluation.isStraightFlush;
    if (this.evaluation.isFlush === undefined) this.isFlush();
    if (this.evaluation.isStraight === undefined) this.isStraight();
    if (this.evaluation.isRoyalFlush === undefined) this.isRoyalFlush();
    return this.evaluation.isStraightFlush = this.evaluation.isFlush && this.evaluation.isStraight && !this.evaluation.isRoyalFlush;
  }

  // ==================== STRAIGHT DRAWS ====================
  
  /**
   * Determines if the hand is an open-ended straight draw (one card away from a straight on either end).
   * Checks both standard and wheel-equivalent open-ended draws.
   * Returns false if the hand already contains pairs, two pair, three of a kind, full house, four of a kind, or a straight.
   * 
   * @returns {boolean} True if the hand is an open-ended straight draw, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', '9h']);
   * evaluator.isOpenEndedStraightDraw(); // Returns true (needs T or 9 to complete straight)
   */
  isOpenEndedStraightDraw() {
    if (this.evaluation.isOpenEndedStraightDraw !== undefined) return this.evaluation.isOpenEndedStraightDraw;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isStraight === undefined) this.isStraight();
    if (this.evaluation.isPair || this.evaluation.isTwoPair || this.evaluation.isThreeOfAKind || this.evaluation.isFullHouse || this.evaluation.isFourOfAKind || this.evaluation.isStraight) {
      // Check wheel equivalent before returning false
      if (this.isOpenEndedStraightDrawWheel()) return this.evaluation.isOpenEndedStraightDraw = true;
      return this.evaluation.isOpenEndedStraightDraw = false;
    }
    this.sort();
    const result = this.getDistance(this.cards.slice(0,4)) === 3 || this.getDistance(this.cards.slice(1,5)) === 3;
    if (result) return this.evaluation.isOpenEndedStraightDraw = true;
    // Check wheel equivalent
    if (this.isOpenEndedStraightDrawWheel()) return this.evaluation.isOpenEndedStraightDraw = true;
    return this.evaluation.isOpenEndedStraightDraw = false;
  }

  /**
   * Determines if the hand is an open-ended straight draw using wheel ranking.
   * Checks for wheel-equivalent open-ended draws (e.g., A-2-3-4 needs 5 or 2).
   * Returns false if the hand already contains pairs or higher, or is a wheel straight.
   * 
   * @returns {boolean} True if the hand is a wheel-equivalent open-ended straight draw, false otherwise
   */
  isOpenEndedStraightDrawWheel() {
    if (this.evaluation.isOpenEndedStraightDrawWheel !== undefined) return this.evaluation.isOpenEndedStraightDrawWheel;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isStraightWheel === undefined) this.isStraightWheel();
    if (this.evaluation.isPair || this.evaluation.isTwoPair || this.evaluation.isThreeOfAKind || this.evaluation.isFullHouse || this.evaluation.isFourOfAKind || this.evaluation.isStraightWheel) return this.evaluation.isOpenEndedStraightDrawWheel = false;
    this.sortWheel();
    return this.evaluation.isOpenEndedStraightDrawWheel = this.getDistanceWheel(this.cards.slice(0,4)) === 3 || this.getDistanceWheel(this.cards.slice(1,5)) === 3;
  }

  /**
   * Determines if the hand is an inside straight draw (one card away from a straight, but the needed card is in the middle).
   * Checks both standard and wheel-equivalent inside draws.
   * Returns false if the hand already contains pairs, two pair, three of a kind, full house, four of a kind, or a straight.
   * 
   * @returns {boolean} True if the hand is an inside straight draw, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', '9h']);
   * evaluator.isInsideStraightDraw(); // Returns true (needs T in the middle)
   */
  isInsideStraightDraw() {
    if (this.evaluation.isInsideStraightDraw !== undefined) return this.evaluation.isInsideStraightDraw;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isStraight === undefined) this.isStraight();
    if (this.evaluation.isPair || this.evaluation.isTwoPair || this.evaluation.isThreeOfAKind || this.evaluation.isFullHouse || this.evaluation.isFourOfAKind || this.evaluation.isStraight) {
      // Check wheel equivalent before returning false
      if (this.isInsideStraightDrawWheel()) return this.evaluation.isInsideStraightDraw = true;
      return this.evaluation.isInsideStraightDraw = false;
    }

    this.sort();
    const result = this.getDistance(this.cards.slice(0,4)) === 4 || this.getDistance(this.cards.slice(1,5)) === 4;
    if (result) return this.evaluation.isInsideStraightDraw = true;
    // Check wheel equivalent
    if (this.isInsideStraightDrawWheel()) return this.evaluation.isInsideStraightDraw = true;
    return this.evaluation.isInsideStraightDraw = false;
  }

  /**
   * Determines if the hand is an inside straight draw using wheel ranking.
   * Checks for wheel-equivalent inside draws (e.g., A-2-3-5 needs 4).
   * Returns false if the hand already contains pairs or higher, or is a wheel straight.
   * 
   * @returns {boolean} True if the hand is a wheel-equivalent inside straight draw, false otherwise
   */
  isInsideStraightDrawWheel() {
    if (this.evaluation.isInsideStraightDrawWheel !== undefined) return this.evaluation.isInsideStraightDrawWheel;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isStraightWheel === undefined) this.isStraightWheel();
    if (this.evaluation.isPair || this.evaluation.isTwoPair || this.evaluation.isThreeOfAKind || this.evaluation.isFullHouse || this.evaluation.isFourOfAKind || this.evaluation.isStraightWheel) return this.evaluation.isInsideStraightDrawWheel = false;

    this.sortWheel();
    return this.evaluation.isInsideStraightDrawWheel = this.getDistanceWheel(this.cards.slice(0,4)) === 4 || this.getDistanceWheel(this.cards.slice(1,5)) === 4;
  }

  // ==================== HIGH CARD ====================
  
  /**
   * Determines if the hand is high card only (no pairs, two pair, three of a kind, full house,
   * four of a kind, flush, or straight).
   * 
   * @returns {boolean} True if the hand is high card only, false otherwise
   * @example
   * const evaluator = new HandEvaluator(['As', 'Kh', 'Qd', 'Jc', '9s']);
   * evaluator.isHighCard(); // Returns true (no made hand)
   */
  isHighCard() {
    if (this.evaluation.isHighCard !== undefined) return this.evaluation.isHighCard;
    if (this.evaluation.isPair === undefined) this.isPair();
    if (this.evaluation.isTwoPair === undefined) this.isTwoPair();
    if (this.evaluation.isThreeOfAKind === undefined) this.isThreeOfAKind();
    if (this.evaluation.isFullHouse === undefined) this.isFullHouse();
    if (this.evaluation.isFourOfAKind === undefined) this.isFourOfAKind();
    if (this.evaluation.isFlush === undefined) this.isFlush();
    if (this.evaluation.isStraight === undefined) this.isStraight();
    return this.evaluation.isHighCard = !this.evaluation.isPair && !this.evaluation.isTwoPair && !this.evaluation.isThreeOfAKind && !this.evaluation.isFullHouse && !this.evaluation.isFourOfAKind && !this.evaluation.isFlush && !this.evaluation.isStraight;
  }
}

/**
 * Evaluates poker hands from 5 or more cards and identifies all possible draws.
 * Generates all 5-card combinations and evaluates each one.
 * 
 * @param {string[]} cards - Array of 5 or more card strings in format "Rs" where R is rank (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2) and s is suit (s, h, d, c)
 * @returns {Object} Object mapping sorted hand strings (e.g., "As, Ks, Qs, Js, Ts") to evaluation objects with boolean fields for all hand types and draws
 */
function evaluateHand(cards) {
  const evaluator = new HandEvaluator(cards);
  return evaluator.evaluation;
}

module.exports = { evaluateHand, HandEvaluator };

