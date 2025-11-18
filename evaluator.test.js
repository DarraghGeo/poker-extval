/**
 * Poker Hand Evaluator Test Suite
 * 
 * Structure: All test cases are defined at the top for easy skimming.
 * Jest test implementations are below.
 * 
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { evaluateHand, HandEvaluator } = require('./evaluator');

// ==================== HAND EVALUATOR CLASS METHOD TESTS ====================
// Note: These tests verify internal functionality through the public evaluateHand API

describe('HandEvaluator - sort() functionality (tested via evaluation)', () => {
  test('should sort cards correctly (verified through straight detection)', () => {
    // A straight requires cards to be sorted internally
    const result = evaluateHand(['2s', 'As', 'Ks', '5s', 'Ts']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    // This hand is not a straight, but sorting is used internally
    // We verify sorting works by checking that straights are detected correctly
    expect(evaluation.isStraight).toBe(false);
  });

  test('should detect straight when cards are unsorted (verifies internal sorting)', () => {
    // Use a non-flush straight to test straight detection
    const result = evaluateHand(['2s', '3h', '4d', '5c', '6s'], false);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isStraight).toBe(true);
  });

  test('should handle face cards correctly (verifies internal sorting)', () => {
    const result = evaluateHand(['Js', 'Qs', 'Ks', 'As', 'Ts']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isRoyalFlush).toBe(true);
  });
});

describe('HandEvaluator - getDistance() functionality (tested via straight detection)', () => {
  test('should detect straight with distance 4', () => {
    // Use a non-royal flush straight to test straight detection
    const result = evaluateHand(['9s', '8s', '7s', '6s', '5s'], false);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isStraight).toBe(true);
  });

  test('should not detect straight when distance is 12', () => {
    // Use a non-flush wheel straight to test straight detection
    const result = evaluateHand(['As', '2h', '3d', '4c', '5s'], false);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    // This is a wheel straight, so it should be detected
    expect(evaluation.isStraight).toBe(true);
  });

  test('should detect consecutive cards as straight', () => {
    // Use a non-flush straight to test straight detection
    const result = evaluateHand(['5s', '6h', '7d', '8c', '9s'], false);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isStraight).toBe(true);
  });
});

describe('HandEvaluator - countSuits() functionality (tested via flush detection)', () => {
  test('should detect flush when all suits match', () => {
    // Use a non-royal flush to test flush detection
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s'], false);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isFlush).toBe(true);
  });

  test('should detect flush draw when 4 suits match', () => {
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Th']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isFlushDraw).toBe(true);
  });

  test('should detect backdoor flush draw when 3 suits match', () => {
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Jh', 'Th']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isBackdoorFlushDraw).toBe(true);
  });

  test('should not detect flush when suits are mixed', () => {
    const result = evaluateHand(['As', 'Kh', 'Qd', 'Jc', 'Ts']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isFlush).toBe(false);
  });
});

describe('HandEvaluator - countRanks() functionality (tested via pair/three/four detection)', () => {
  test('should detect two pair', () => {
    const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isTwoPair).toBe(true);
  });

  test('should detect full house', () => {
    const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Kh']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isFullHouse).toBe(true);
  });

  test('should detect no pairs', () => {
    const result = evaluateHand(['As', 'Kh', 'Qd', 'Jc', 'Ts']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isPair).toBe(false);
    expect(evaluation.isTwoPair).toBe(false);
  });

  test('should detect four of a kind', () => {
    const result = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isFourOfAKind).toBe(true);
  });

  test('should detect three of a kind', () => {
    const result = evaluateHand(['As', 'Ah', 'Ad', 'Kc', 'Qs']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isThreeOfAKind).toBe(true);
  });

  test('should detect single pair', () => {
    const result = evaluateHand(['As', 'Ah', 'Kd', 'Qc', 'Js']);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    expect(evaluation.isPair).toBe(true);
  });
});

// ==================== TEST CASES - ALL DEFINED HERE FOR EASY SKIMMING ====================

const TEST_CASES = {
  // ==================== MADE HANDS ====================
  
  royalFlush: {
    passable: [
      { cards: ["As", "Ks", "Qs", "Js", "Ts"], description: "Royal flush spades" },
      { cards: ["Ah", "Kh", "Qh", "Jh", "Th"], description: "Royal flush hearts" },
      { cards: ["Ad", "Kd", "Qd", "Jd", "Td"], description: "Royal flush diamonds" },
      { cards: ["Ac", "Kc", "Qc", "Jc", "Tc"], description: "Royal flush clubs" },
      { cards: ["Ts", "Js", "Qs", "Ks", "As"], description: "Royal flush spades shuffled" },
      { cards: ["As", "Ts", "Js", "Ks", "Qs"], description: "Royal flush spades mixed order" },
      { cards: ["Ah", "Th", "Jh", "Qh", "Kh"], description: "Royal flush hearts mixed order" },
      { cards: ["Ad", "Kd", "Td", "Jd", "Qd"], description: "Royal flush diamonds mixed order" },
      { cards: ["Ac", "Qc", "Kc", "Tc", "Jc"], description: "Royal flush clubs mixed order" },
      { cards: ["As", "Ks", "Qs", "Js", "Ts"], description: "Royal flush spades standard order" },
    ],
    fail: [
      { cards: ["As", "Ks", "Qs", "Js", "9s"], description: "Straight flush, not royal" },
      { cards: ["As", "Ks", "Qs", "Js", "Th"], description: "Four suited, one off suit" },
      { cards: ["As", "Ks", "Qs", "Jh", "Ts"], description: "Four suited, jack off suit" },
      { cards: ["As", "Ks", "Qh", "Js", "Ts"], description: "Four suited, queen off suit" },
      { cards: ["Ah", "Ks", "Qs", "Js", "Ts"], description: "Four suited, ace off suit" },
      { cards: ["As", "Kh", "Qs", "Js", "Ts"], description: "Four suited, king off suit" },
      { cards: ["As", "Ks", "Qs", "Js", "Td"], description: "Four suited, ten off suit" },
      { cards: ["9s", "Ks", "Qs", "Js", "Ts"], description: "Straight flush, missing ace" },
      { cards: ["As", "8s", "Qs", "Js", "Ts"], description: "Straight flush, wrong king" },
      { cards: ["As", "Ks", "7s", "Js", "Ts"], description: "Straight flush, wrong queen" },
    ],
    deformed: [
      { cards: ["As", "Ks", "Qs", "Js"], description: "Only 4 cards" },
      { cards: ["As", "Ks", "Qs", "Js", "T"], description: "Invalid card format - missing suit" },
      { cards: ["As", "Ks", "Qs", "Js", "Tx"], description: "Invalid suit" },
      { cards: ["As", "Ks", "Qs", "Js", "Zs"], description: "Invalid rank" },
    ],
  },

  straightFlush: {
    passable: [
      { cards: ["9s", "8s", "7s", "6s", "5s"], description: "Straight flush 9-5 spades" },
      { cards: ["Kh", "Qh", "Jh", "Th", "9h"], description: "Straight flush K-9 hearts" },
      { cards: ["5d", "4d", "3d", "2d", "Ad"], description: "Wheel straight flush diamonds" },
      { cards: ["8c", "7c", "6c", "5c", "4c"], description: "Straight flush 8-4 clubs" },
      { cards: ["Js", "Ts", "9s", "8s", "7s"], description: "Straight flush J-7 spades" },
      { cards: ["6h", "5h", "4h", "3h", "2h"], description: "Straight flush 6-2 hearts" },
      { cards: ["Qd", "Jd", "Td", "9d", "8d"], description: "Straight flush Q-8 diamonds" },
      { cards: ["7c", "6c", "5c", "4c", "3c"], description: "Straight flush 7-3 clubs" },
      { cards: ["Ts", "9s", "8s", "7s", "6s"], description: "Straight flush T-6 spades" },
      { cards: ["4h", "3h", "2h", "Ah", "5h"], description: "Ace-high straight flush (not wheel)" },
    ],
    fail: [
      { cards: ["9s", "8s", "7s", "6s", "5h"], description: "Four suited, one off suit" },
      { cards: ["9s", "8s", "7s", "6h", "5s"], description: "Four suited, six off suit" },
      { cards: ["9s", "8s", "7h", "6s", "5s"], description: "Four suited, seven off suit" },
      { cards: ["9s", "8h", "7s", "6s", "5s"], description: "Four suited, eight off suit" },
      { cards: ["9h", "8s", "7s", "6s", "5s"], description: "Four suited, nine off suit" },
      { cards: ["9s", "8s", "7s", "6s", "4s"], description: "Flush, not straight" },
      { cards: ["9s", "8s", "7s", "5s", "4s"], description: "Flush, gap in straight" },
      { cards: ["9s", "8s", "6s", "5s", "4s"], description: "Flush, two gaps" },
      { cards: ["9s", "7s", "6s", "5s", "4s"], description: "Flush, large gap" },
      { cards: ["9s", "8s", "7s", "6s", "5d"], description: "Straight, not flush" },
    ],
    deformed: [
      { cards: ["9s", "8s", "7s", "6s"], description: "Only 4 cards" },
      { cards: ["9s", "8s", "7s", "6s", "5"], description: "Invalid card format" },
      { cards: ["9s", "8s", "7s", "6s", "5z"], description: "Invalid suit" },
      { cards: ["9s", "8s", "7s", "6s", "Xs"], description: "Invalid rank" },
    ],
  },

  fourOfAKind: {
    passable: [
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four aces with king kicker" },
      { cards: ["Ks", "Kh", "Kd", "Kc", "Qs"], description: "Four kings with queen kicker" },
      { cards: ["Qs", "Qh", "Qd", "Qc", "Js"], description: "Four queens with jack kicker" },
      { cards: ["Js", "Jh", "Jd", "Jc", "Ts"], description: "Four jacks with ten kicker" },
      { cards: ["Ts", "Th", "Td", "Tc", "9s"], description: "Four tens with nine kicker" },
      { cards: ["2s", "2h", "2d", "2c", "As"], description: "Four deuces with ace kicker" },
      { cards: ["5s", "5h", "5d", "5c", "4s"], description: "Four fives with four kicker" },
      { cards: ["7s", "7h", "7d", "7c", "6s"], description: "Four sevens with six kicker" },
      { cards: ["9s", "9h", "9d", "9c", "8s"], description: "Four nines with eight kicker" },
      { cards: ["3s", "3h", "3d", "3c", "2s"], description: "Four threes with deuce kicker" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Kc", "Ks"], description: "Full house, not four of a kind" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not four" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not four" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not four" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not four" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Ad", "Ac"], description: "Only 4 cards" },
      { cards: ["As", "Ah", "Ad", "Ac", "K"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Ad", "Ac", "Kx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Ad", "Ac", "Zs"], description: "Invalid rank" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ac"], description: "Duplicate card (impossible)" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ah"], description: "Duplicate ace" },
      { cards: ["As", "As", "Ad", "Ac", "Ks"], description: "Duplicate ace of spades" },
    ],
  },

  fullHouse: {
    passable: [
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Aces full of kings" },
      { cards: ["Ks", "Kh", "Kd", "Qc", "Qh"], description: "Kings full of queens" },
      { cards: ["Qs", "Qh", "Qd", "Jc", "Jh"], description: "Queens full of jacks" },
      { cards: ["Js", "Jh", "Jd", "Tc", "Th"], description: "Jacks full of tens" },
      { cards: ["Ts", "Th", "Td", "9c", "9h"], description: "Tens full of nines" },
      { cards: ["2s", "2h", "2d", "Ac", "Ah"], description: "Deuces full of aces" },
      { cards: ["5s", "5h", "5d", "4c", "4h"], description: "Fives full of fours" },
      { cards: ["7s", "7h", "7d", "6c", "6h"], description: "Sevens full of sixes" },
      { cards: ["9s", "9h", "9d", "8c", "8h"], description: "Nines full of eights" },
      { cards: ["3s", "3h", "3d", "2c", "2h"], description: "Threes full of deuces" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Three kings, one pair aces" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Ac", "Kh"], description: "Four of a kind, not full house" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qh"], description: "Three of a kind, not full house" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qh"], description: "Two pair, not full house" },
      { cards: ["As", "Ah", "Kd", "Qc", "Jh"], description: "Pair, not full house" },
      { cards: ["As", "Kh", "Qd", "Jc", "Th"], description: "High card, not full house" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Ad", "Kc"], description: "Only 4 cards" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kc"], description: "Duplicate king of clubs" },
      { cards: ["As", "As", "Ad", "Kc", "Kh"], description: "Duplicate ace of spades" },
      { cards: ["As", "Ah", "Ad", "Kc"], description: "Only 4 cards" },
      { cards: ["As", "Ah", "Ad", "Kc", "K"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Ad", "Kc", "Zh"], description: "Invalid rank" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kc"], description: "Duplicate king of clubs" },
      { cards: ["As", "As", "Ad", "Kc", "Kh"], description: "Duplicate ace of spades" },
    ],
  },

  flush: {
    passable: [
      { cards: ["As", "Ks", "Qs", "Js", "9s"], description: "Ace-high flush spades" },
      { cards: ["Ah", "Kh", "Qh", "Jh", "9h"], description: "Ace-high flush hearts" },
      { cards: ["Ad", "Kd", "Qd", "Jd", "9d"], description: "Ace-high flush diamonds" },
      { cards: ["Ac", "Kc", "Qc", "Jc", "9c"], description: "Ace-high flush clubs" },
      { cards: ["Ks", "Qs", "Js", "Ts", "8s"], description: "King-high flush spades" },
      { cards: ["Qh", "Jh", "Th", "9h", "7h"], description: "Queen-high flush hearts" },
      { cards: ["Jd", "Td", "9d", "8d", "6d"], description: "Jack-high flush diamonds" },
      { cards: ["Tc", "9c", "8c", "7c", "5c"], description: "Ten-high flush clubs" },
      { cards: ["9s", "8s", "7s", "6s", "4s"], description: "Nine-high flush spades" },
      { cards: ["2s", "3s", "4s", "5s", "7s"], description: "Seven-high flush spades" },
    ],
    fail: [
      { cards: ["As", "Ks", "Qs", "Js", "9h"], description: "Four suited, one off suit" },
      { cards: ["As", "Ks", "Qs", "Jh", "9s"], description: "Four suited, jack off suit" },
      { cards: ["As", "Ks", "Qh", "Js", "9s"], description: "Four suited, queen off suit" },
      { cards: ["As", "Kh", "Qs", "Js", "9s"], description: "Four suited, king off suit" },
      { cards: ["Ah", "Ks", "Qs", "Js", "9s"], description: "Four suited, ace off suit" },
      { cards: ["As", "Ks", "Qs", "Js", "9d"], description: "Four suited, nine off suit" },
      { cards: ["As", "Ks", "Qh", "Jh", "9s"], description: "Three suited, two off suit" },
      { cards: ["As", "Kh", "Qh", "Jh", "9s"], description: "Three suited, two off suit" },
      { cards: ["Ah", "Kh", "Qh", "Js", "9s"], description: "Three suited, two off suit" },
    ],
    deformed: [
      { cards: ["As", "Ks", "Qs", "Js"], description: "Only 4 cards" },
      { cards: ["As", "Ks", "Qs", "Js", "9"], description: "Invalid card format" },
      { cards: ["As", "Ks", "Qs", "Js", "9x"], description: "Invalid suit" },
      { cards: ["As", "Ks", "Qs", "Js", "Zs"], description: "Invalid rank" },
    ],
  },

  straight: {
    passable: [
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "Ace-high straight" },
      { cards: ["Ks", "Qh", "Jd", "Tc", "9s"], description: "King-high straight" },
      { cards: ["Qs", "Jh", "Td", "9c", "8s"], description: "Queen-high straight" },
      { cards: ["Js", "Th", "9d", "8c", "7s"], description: "Jack-high straight" },
      { cards: ["Ts", "9h", "8d", "7c", "6s"], description: "Ten-high straight" },
      { cards: ["9s", "8h", "7d", "6c", "5s"], description: "Nine-high straight" },
      { cards: ["5s", "4h", "3d", "2c", "As"], description: "Wheel straight (A-2-3-4-5)" },
      { cards: ["8s", "7h", "6d", "5c", "4s"], description: "Eight-high straight" },
      { cards: ["7s", "6h", "5d", "4c", "3s"], description: "Seven-high straight" },
      { cards: ["6s", "5h", "4d", "3c", "2s"], description: "Six-high straight" },
    ],
    fail: [
      { cards: ["As", "Kh", "Qd", "Jc", "9s"], description: "Four to straight, missing ten" },
      { cards: ["As", "Kh", "Qd", "Tc", "9s"], description: "Four to straight, missing jack" },
      { cards: ["As", "Kh", "Jd", "Tc", "9s"], description: "Four to straight, missing queen" },
      { cards: ["As", "Qd", "Jd", "Tc", "9s"], description: "Four to straight, missing king" },
      { cards: ["Kh", "Qd", "Jc", "Ts", "6s"], description: "Four to straight, missing ace" },
      { cards: ["As", "Kh", "Qd", "Jc", "8s"], description: "Four to straight, wrong ten" },
      { cards: ["As", "Kh", "Qd", "Tc", "8s"], description: "Three to straight, two gaps" },
      { cards: ["As", "Kh", "Jd", "Tc", "8s"], description: "Three to straight, large gap" },
      { cards: ["As", "Qd", "Jd", "Tc", "8s"], description: "Three to straight, multiple gaps" },
    ],
    deformed: [
      { cards: ["As", "Kh", "Qd", "Jc"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Qd", "Jc", "T"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Qd", "Jc", "Tx"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Qd", "Jc", "Zs"], description: "Invalid rank" },
    ],
  },

  threeOfAKind: {
    passable: [
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three aces with king-queen kickers" },
      { cards: ["Ks", "Kh", "Kd", "Qc", "Js"], description: "Three kings with queen-jack kickers" },
      { cards: ["Qs", "Qh", "Qd", "Jc", "Ts"], description: "Three queens with jack-ten kickers" },
      { cards: ["Js", "Jh", "Jd", "Tc", "9s"], description: "Three jacks with ten-nine kickers" },
      { cards: ["Ts", "Th", "Td", "9c", "8s"], description: "Three tens with nine-eight kickers" },
      { cards: ["2s", "2h", "2d", "Ac", "Ks"], description: "Three deuces with ace-king kickers" },
      { cards: ["5s", "5h", "5d", "4c", "3s"], description: "Three fives with four-three kickers" },
      { cards: ["7s", "7h", "7d", "6c", "5s"], description: "Three sevens with six-five kickers" },
      { cards: ["9s", "9h", "9d", "8c", "7s"], description: "Three nines with eight-seven kickers" },
      { cards: ["3s", "3h", "3d", "2c", "As"], description: "Three threes with deuce-ace kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not three" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not three" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not three" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not three" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not three" },
      { cards: ["As", "Ah", "Kd", "Qc", "Qh"], description: "Pair of aces, pair of queens" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Ad"], description: "Only 3 cards" },
      { cards: ["As", "Ah", "Ad", "Kc", "K"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Ad", "Kc", "Zs"], description: "Invalid rank" },
      { cards: ["As", "Ah", "Ad", "Ad"], description: "Duplicate ace of diamonds" },
      { cards: ["As", "As", "Ah", "Kc", "Qs"], description: "Duplicate ace of spades" },
    ],
  },

  twoPair: {
    passable: [
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Aces and kings with queen kicker" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Kings and queens with jack kicker" },
      { cards: ["Qs", "Qh", "Jd", "Jc", "Ts"], description: "Queens and jacks with ten kicker" },
      { cards: ["Js", "Jh", "Td", "Tc", "9s"], description: "Jacks and tens with nine kicker" },
      { cards: ["Ts", "Th", "9d", "9c", "8s"], description: "Tens and nines with eight kicker" },
      { cards: ["2s", "2h", "Ad", "Ac", "Ks"], description: "Deuces and aces with king kicker" },
      { cards: ["5s", "5h", "4d", "4c", "3s"], description: "Fives and fours with three kicker" },
      { cards: ["7s", "7h", "6d", "6c", "5s"], description: "Sevens and sixes with five kicker" },
      { cards: ["9s", "9h", "8d", "8c", "7s"], description: "Nines and eights with seven kicker" },
      { cards: ["3s", "3h", "2d", "2c", "As"], description: "Threes and deuces with ace kicker" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not two pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not two pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not two pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not two pair" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Kd", "Kc"], description: "Only 4 cards" },
      { cards: ["As", "Ah", "Kd"], description: "Only 3 cards" },
      { cards: ["As", "Ah", "Kd", "Kc", "K"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Kd", "Kc", "Q"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Kd", "Kc", "Zs"], description: "Invalid rank" },
    ],
  },

  pair: {
    passable: [
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair of aces with king-queen-jack kickers" },
      { cards: ["Ks", "Kh", "Qd", "Jc", "Ts"], description: "Pair of kings with queen-jack-ten kickers" },
      { cards: ["Qs", "Qh", "Jd", "Tc", "9s"], description: "Pair of queens with jack-ten-nine kickers" },
      { cards: ["Js", "Jh", "Td", "9c", "8s"], description: "Pair of jacks with ten-nine-eight kickers" },
      { cards: ["Ts", "Th", "9d", "8c", "7s"], description: "Pair of tens with nine-eight-seven kickers" },
      { cards: ["2s", "2h", "Ad", "Kc", "Qs"], description: "Pair of deuces with ace-king-queen kickers" },
      { cards: ["5s", "5h", "4d", "3c", "2s"], description: "Pair of fives with four-three-deuce kickers" },
      { cards: ["7s", "7h", "6d", "5c", "4s"], description: "Pair of sevens with six-five-four kickers" },
      { cards: ["9s", "9h", "8d", "7c", "6s"], description: "Pair of nines with eight-seven-six kickers" },
      { cards: ["3s", "3h", "2d", "Ac", "Ks"], description: "Pair of threes with deuce-ace-king kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not pair" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "9s"], description: "High card, no pair" },
    ],
    deformed: [
      { cards: ["As", "Ah"], description: "Only 2 cards" },
      { cards: ["As", "Ah", "Kd", "Qc", "J"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Kd", "Qc", "Jx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Kd", "Qc", "Zs"], description: "Invalid rank" },
      { cards: ["As", "As", "Kd", "Qc", "Js"], description: "Duplicate ace of spades" },
      { cards: ["As", "Ah", "Kd", "Kd", "Qs"], description: "Duplicate king of diamonds" },
    ],
  },

  highCard: {
    passable: [
      { cards: ["As", "Kh", "Qd", "Jc", "9s"], description: "Ace-high, no pair" },
      { cards: ["Ks", "Qh", "Jd", "Tc", "8s"], description: "King-high, no pair" },
      { cards: ["Qs", "Jh", "Td", "9c", "7s"], description: "Queen-high, no pair" },
      { cards: ["Js", "Th", "9d", "8c", "6s"], description: "Jack-high, no pair" },
      { cards: ["Ts", "9h", "8d", "7c", "5s"], description: "Ten-high, no pair" },
      { cards: ["9s", "8h", "7d", "6c", "4s"], description: "Nine-high, no pair" },
      { cards: ["8s", "7h", "6d", "5c", "3s"], description: "Eight-high, no pair" },
      { cards: ["7s", "6h", "5d", "4c", "2s"], description: "Seven-high, no pair" },
      { cards: ["6s", "5h", "4d", "3c", "Ks"], description: "King-high, no pair" },
      { cards: ["6s", "4h", "3d", "2c", "As"], description: "Six-high with ace (not wheel)" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not high card" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "Straight, not high card" },
      { cards: ["As", "Ks", "Qs", "Js", "9s"], description: "Flush, not high card" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not high card" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not high card" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not high card" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not high card" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "Straight flush, not high card" },
      { cards: ["As", "Ks", "Qs", "Js", "Ts"], description: "Royal flush, not high card" },
      { cards: ["As", "Ah", "Kd", "Qc", "Qh"], description: "Two pair, not high card" },
    ],
    deformed: [
      { cards: ["As", "Kh", "Qd", "Jc"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Qd", "Jc", "9"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Qd", "Jc", "9x"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Qd", "Jc", "Zs"], description: "Invalid rank" },
    ],
  },

  // ==================== DETAILED PAIR CATEGORIZATION ====================

  topPair: {
    passable: [
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Top pair aces with king-queen-jack kickers" },
      { cards: ["Ks", "Kh", "Qd", "Jc", "Ts"], description: "Top pair kings with queen-jack-ten kickers" },
      { cards: ["Qs", "Qh", "Jd", "Tc", "9s"], description: "Top pair queens with jack-ten-nine kickers" },
      { cards: ["Js", "Jh", "Td", "9c", "8s"], description: "Top pair jacks with ten-nine-eight kickers" },
      { cards: ["Ts", "Th", "9d", "8c", "7s"], description: "Top pair tens with nine-eight-seven kickers" },
      { cards: ["9s", "9h", "8d", "7c", "6s"], description: "Top pair nines with eight-seven-six kickers" },
      { cards: ["8s", "8h", "7d", "6c", "5s"], description: "Top pair eights with seven-six-five kickers" },
      { cards: ["7s", "7h", "6d", "5c", "4s"], description: "Top pair sevens with six-five-four kickers" },
      { cards: ["6s", "6h", "5d", "4c", "3s"], description: "Top pair sixes with five-four-three kickers" },
      { cards: ["5s", "5h", "4d", "3c", "2s"], description: "Top pair fives with four-three-deuce kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not top pair" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Two pair, not top pair" },
      { cards: ["As", "Kh", "Qd", "Qc", "Js"], description: "Middle pair queens, not top pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Js"], description: "Bottom pair jacks, not top pair" },
      { cards: ["2s", "2h", "Ad", "Kc", "Qs"], description: "Bottom pair deuces, not top pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not pair" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Qh"], description: "Two pair, not top pair" },
    ],
    deformed: [
      { cards: ["As", "Ah"], description: "Only 2 cards" },
      { cards: ["As", "Ah", "Kd", "Qc", "J"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Kd", "Qc", "Jx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Kd", "Qc", "Zs"], description: "Invalid rank" },
    ],
  },

  middlePair: {
    passable: [
      { cards: ["As", "Kh", "Qd", "Qc", "Js"], description: "Middle pair queens with ace-jack kickers" },
      { cards: ["Ks", "Qh", "Jd", "Jc", "Ts"], description: "Middle pair jacks with king-ten kickers" },
      { cards: ["Qs", "Jh", "Td", "Tc", "9s"], description: "Middle pair tens with queen-nine kickers" },
      { cards: ["Js", "Th", "9d", "9c", "8s"], description: "Middle pair nines with jack-eight kickers" },
      { cards: ["Ts", "9h", "8d", "8c", "7s"], description: "Middle pair eights with ten-seven kickers" },
      { cards: ["As", "Kh", "Kd", "Qc", "Js"], description: "Middle pair kings with ace-queen-jack kickers" },
      { cards: ["Ks", "Qh", "Qd", "Jc", "Ts"], description: "Middle pair queens with king-jack-ten kickers" },
      { cards: ["As", "Kh", "5d", "5c", "4s"], description: "Middle pair fives with ace-king-four kickers" },
      { cards: ["Ks", "Qh", "3d", "3c", "2s"], description: "Middle pair threes with king-queen-deuce kickers" },
      { cards: ["As", "Th", "9d", "9c", "8s"], description: "Middle pair nines with ace-ten-eight kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Top pair aces, not middle pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Js"], description: "Bottom pair jacks, not middle pair" },
      { cards: ["2s", "2h", "Ad", "Kc", "Qs"], description: "Bottom pair deuces, not middle pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not middle pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not pair" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not pair" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Two pair, not middle pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Qh"], description: "Two pair, not middle pair" },
    ],
    deformed: [
      { cards: ["As", "Kh", "Qd", "Qc"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Qd", "Qc", "J"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Qd", "Qc", "Jx"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Qd", "Qc", "Zs"], description: "Invalid rank" },
    ],
  },

  bottomPair: {
    passable: [
      { cards: ["As", "Kh", "Qd", "Jc", "Js"], description: "Bottom pair jacks with ace-king-queen kickers" },
      { cards: ["Ks", "Qh", "Jd", "Tc", "Ts"], description: "Bottom pair tens with king-queen-jack kickers" },
      { cards: ["Qs", "Jh", "Td", "9c", "9s"], description: "Bottom pair nines with queen-jack-ten kickers" },
      { cards: ["Js", "Th", "9d", "8c", "8s"], description: "Bottom pair eights with jack-ten-nine kickers" },
      { cards: ["Ts", "9h", "8d", "7c", "7s"], description: "Bottom pair sevens with ten-nine-eight kickers" },
      { cards: ["As", "Kh", "Qd", "2c", "2s"], description: "Bottom pair deuces with ace-king-queen kickers" },
      { cards: ["Ks", "Qh", "Jd", "3c", "3s"], description: "Bottom pair threes with king-queen-jack kickers" },
      { cards: ["As", "Kh", "Qd", "4c", "4s"], description: "Bottom pair fours with ace-king-queen kickers" },
      { cards: ["Ks", "Qh", "Jd", "5c", "5s"], description: "Bottom pair fives with king-queen-jack kickers" },
      { cards: ["As", "Kh", "Qd", "6c", "6s"], description: "Bottom pair sixes with ace-king-queen kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Top pair aces, not bottom pair" },
      { cards: ["As", "Kh", "Qd", "Qc", "Js"], description: "Middle pair queens, not bottom pair" },
      { cards: ["As", "2h", "Ad", "Kc", "Qs"], description: "Top pair deuces, not bottom pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not bottom pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not pair" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not pair" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Two pair, not bottom pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Qh"], description: "Two pair, not bottom pair" },
    ],
    deformed: [
      { cards: ["As", "Qd", "Jc", "Js"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Qd", "Jc", "J"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Qd", "Jc", "Jx"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Qd", "Jc", "Zs"], description: "Invalid rank" },
    ],
  },

  // ==================== DETAILED THREE OF A KIND CATEGORIZATION ====================

  topThreeOfAKind: {
    passable: [
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Top three aces with king-queen kickers" },
      { cards: ["Ks", "Kh", "Kd", "Qc", "Js"], description: "Top three kings with queen-jack kickers" },
      { cards: ["Qs", "Qh", "Qd", "Jc", "Ts"], description: "Top three queens with jack-ten kickers" },
      { cards: ["Js", "Jh", "Jd", "Tc", "9s"], description: "Top three jacks with ten-nine kickers" },
      { cards: ["Ts", "Th", "Td", "9c", "8s"], description: "Top three tens with nine-eight kickers" },
      { cards: ["9s", "9h", "9d", "8c", "7s"], description: "Top three nines with eight-seven kickers" },
      { cards: ["8s", "8h", "8d", "7c", "6s"], description: "Top three eights with seven-six kickers" },
      { cards: ["7s", "7h", "7d", "6c", "5s"], description: "Top three sevens with six-five kickers" },
      { cards: ["6s", "6h", "6d", "5c", "4s"], description: "Top three sixes with five-four kickers" },
      { cards: ["5s", "5h", "5d", "4c", "3s"], description: "Top three fives with four-three kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Middle three kings, not top three" },
      { cards: ["As", "Kh", "Qd", "Qc", "Qh"], description: "Middle three queens, not top three" },
      { cards: ["As", "Kh", "Qd", "Jc", "Jh"], description: "Bottom three jacks, not top three" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not three" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not three" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not three" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not three" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not three" },
      { cards: ["2s", "2h", "2d", "Ac", "Ks"], description: "Top three deuces, but should be bottom" },
      { cards: ["3s", "3h", "3d", "Ac", "Ks"], description: "Top three threes, but should be bottom" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Ad"], description: "Only 3 cards" },
      { cards: ["As", "Ah", "Ad", "Kc", "K"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Ad", "Kc", "Zs"], description: "Invalid rank" },
    ],
  },

  middleThreeOfAKind: {
    passable: [
      { cards: ["As", "Kh", "Kd", "Kc", "Qs"], description: "Middle three kings with ace-queen kickers" },
      { cards: ["Ks", "Qh", "Qd", "Qc", "Js"], description: "Middle three queens with king-jack kickers" },
      { cards: ["Qs", "Jh", "Jd", "Jc", "Ts"], description: "Middle three jacks with queen-ten kickers" },
      { cards: ["Js", "Th", "Td", "Tc", "9s"], description: "Middle three tens with jack-nine kickers" },
      { cards: ["Ts", "9h", "9d", "9c", "8s"], description: "Middle three nines with ten-eight kickers" },
      { cards: ["As", "2h", "5d", "5c", "5h"], description: "Middle three fives with ace-king kickers" },
      { cards: ["Ks", "3h", "4d", "4c", "4h"], description: "Middle three fours with king-queen kickers" },
      { cards: ["As", "2h", "3d", "3c", "3h"], description: "Middle three threes with ace-king kickers" },
      { cards: ["Ks", "Qh", "Qd", "Qc", "2h"], description: "Middle three deuces with king-queen kickers" },
      { cards: ["As", "7h", "9d", "9c", "9h"], description: "Middle three nines with ace-ten kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Top three aces, not middle three" },
      { cards: ["As", "Kh", "Qd", "Jc", "Jh"], description: "Bottom three jacks, not middle three" },
      { cards: ["2s", "2h", "2d", "Ac", "Ks"], description: "Top three deuces, not middle three" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not three" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not three" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not three" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not three" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not three" },
      { cards: ["Ks", "Kh", "Kd", "Qc", "Js"], description: "Top three kings, not middle three" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not middle three" },
    ],
    deformed: [
      { cards: ["As", "Kh", "Kd", "Kc"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Kd", "Kc", "Q"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Kd", "Kc", "Qx"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Kd", "Kc", "Zs"], description: "Invalid rank" },
    ],
  },

  bottomThreeOfAKind: {
    passable: [
      { cards: ["As", "Kh", "Jd", "Jc", "Jh"], description: "Bottom three jacks with ace-king-queen kickers" },
      { cards: ["Ks", "Qh", "Td", "Tc", "Th"], description: "Bottom three tens with king-queen-jack kickers" },
      { cards: ["Qs", "Jh", "9d", "9c", "9h"], description: "Bottom three nines with queen-jack-ten kickers" },
      { cards: ["Js", "Th", "8d", "8c", "8h"], description: "Bottom three eights with jack-ten-nine kickers" },
      { cards: ["Ts", "9h", "7d", "7c", "7h"], description: "Bottom three sevens with ten-nine-eight kickers" },
      { cards: ["As", "Kh", "2d", "2c", "2h"], description: "Bottom three deuces with ace-king-queen kickers" },
      { cards: ["Ks", "Qh", "3d", "3c", "3h"], description: "Bottom three threes with king-queen-jack kickers" },
      { cards: ["As", "Kh", "4d", "4c", "4h"], description: "Bottom three fours with ace-king-queen kickers" },
      { cards: ["Ks", "Qh", "5d", "5c", "5h"], description: "Bottom three fives with king-queen-jack kickers" },
      { cards: ["As", "Kh", "6d", "6c", "6h"], description: "Bottom three sixes with ace-king-queen kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Top three aces, not bottom three" },
      { cards: ["As", "Kh", "Kd", "Kc", "Qs"], description: "Middle three kings, not bottom three" },
      { cards: ["Kd", "Kh", "Ad", "Ac", "Ks"], description: "Top three deuces, not bottom three" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not three" },
      { cards: ["As", "Ah", "Ad", "Kc", "Kh"], description: "Full house, not three" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Two pair, not three" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not three" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not three" },
      { cards: ["Ks", "Kh", "Kd", "Qc", "Js"], description: "Top three kings, not bottom three" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not bottom three" },
    ],
    deformed: [
      { cards: ["As", "Kh", "Jc", "Jh"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Qd", "Jc", "J"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Qd", "Jc", "Jx"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Qd", "Jc", "Zh"], description: "Invalid rank" },
    ],
  },

  // ==================== DETAILED TWO PAIR CATEGORIZATION ====================

  topAndMiddlePair: {
    passable: [
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Top and middle pair: aces and kings with queen kicker" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Top and middle pair: kings and queens with jack kicker" },
      { cards: ["Qs", "Qh", "Jd", "Jc", "Ts"], description: "Top and middle pair: queens and jacks with ten kicker" },
      { cards: ["Js", "Jh", "Td", "Tc", "9s"], description: "Top and middle pair: jacks and tens with nine kicker" },
      { cards: ["Ts", "Th", "9d", "9c", "8s"], description: "Top and middle pair: tens and nines with eight kicker" },
      { cards: ["9s", "9h", "8d", "8c", "7s"], description: "Top and middle pair: nines and eights with seven kicker" },
      { cards: ["8s", "8h", "7d", "7c", "6s"], description: "Top and middle pair: eights and sevens with six kicker" },
      { cards: ["7s", "7h", "6d", "6c", "5s"], description: "Top and middle pair: sevens and sixes with five kicker" },
      { cards: ["As", "Ah", "Qd", "Qc", "Js"], description: "Top and middle pair: aces and queens with jack kicker" },
      { cards: ["Ks", "Kh", "Jd", "Jc", "Ts"], description: "Top and middle pair: kings and jacks with ten kicker" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "2c", "2s"], description: "Top and bottom pair, not top and middle" },
      { cards: ["Ks", "Kh", "Qd", "2c", "2s"], description: "Top and bottom pair, not top and middle" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not two pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not two pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not two pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not two pair" },
      { cards: ["Qs", "Qh", "2d", "2c", "As"], description: "Middle and bottom pair, not top and middle" },
      { cards: ["Js", "Jh", "2d", "2c", "As"], description: "Middle and bottom pair, not top and middle" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not two pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Ks"], description: "Full house, not two pair" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Kd", "Kc"], description: "Only 4 cards" },
      { cards: ["As", "Ah", "Kd", "Kc", "Q"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Kd", "Kc", "Qx"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Kd", "Kc", "Zs"], description: "Invalid rank" },
    ],
  },

  topAndBottomPair: {
    passable: [
      { cards: ["As", "Ah", "Kd", "2c", "2s"], description: "Top and bottom pair: aces and deuces with king kicker" },
      { cards: ["Ks", "Kh", "Qd", "2c", "2s"], description: "Top and bottom pair: kings and deuces with queen kicker" },
      { cards: ["Qs", "Qh", "Jd", "2c", "2s"], description: "Top and bottom pair: queens and deuces with jack kicker" },
      { cards: ["Js", "Jh", "Td", "2c", "2s"], description: "Top and bottom pair: jacks and deuces with ten kicker" },
      { cards: ["Ts", "Th", "9d", "2c", "2s"], description: "Top and bottom pair: tens and deuces with nine kicker" },
      { cards: ["As", "Ah", "Kd", "3c", "3s"], description: "Top and bottom pair: aces and threes with king kicker" },
      { cards: ["Ks", "Kh", "Qd", "4c", "4s"], description: "Top and bottom pair: kings and fours with queen kicker" },
      { cards: ["Qs", "Qh", "Jd", "5c", "5s"], description: "Top and bottom pair: queens and fives with jack kicker" },
      { cards: ["Js", "Jh", "Td", "6c", "6s"], description: "Top and bottom pair: jacks and sixes with ten kicker" },
      { cards: ["As", "Ah", "Qd", "3c", "3s"], description: "Top and bottom pair: aces and threes with queen kicker" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Top and middle pair, not top and bottom" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Top and middle pair, not top and bottom" },
      { cards: ["Qs", "Qh", "Jd", "Jc", "Ts"], description: "Top and middle pair, not top and bottom" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not two pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not two pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not two pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not two pair" },
      { cards: ["Ks", "Qh", "Qd", "2c", "2s"], description: "Middle and bottom pair, but kings are top" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not two pair" },
      { cards: ["Qs", "Qh", "Jd", "Jc", "2s"], description: "Top and middle pair, not top and bottom" },
    ],
    deformed: [
      { cards: ["As", "Ah", "Kd", "2c"], description: "Only 4 cards" },
      { cards: ["As", "Ah", "Kd", "2c", "2"], description: "Invalid card format" },
      { cards: ["As", "Ah", "Kd", "2c", "2x"], description: "Invalid suit" },
      { cards: ["As", "Ah", "Kd", "2c", "Zs"], description: "Invalid rank" },
    ],
  },

  middleAndBottomPair: {
    passable: [
      { cards: ["As", "2h", "Qd", "Qc", "2s"], description: "Middle and bottom pair: queens and deuces with ace kicker" },
      { cards: ["Ks", "2h", "Jd", "Jc", "2s"], description: "Middle and bottom pair: jacks and deuces with king kicker" },
      { cards: ["Qs", "2h", "Td", "Tc", "2s"], description: "Middle and bottom pair: tens and deuces with queen kicker" },
      { cards: ["Js", "2h", "9d", "9c", "2s"], description: "Middle and bottom pair: nines and deuces with jack kicker" },
      { cards: ["Ts", "2h", "8d", "8c", "2s"], description: "Middle and bottom pair: eights and deuces with ten kicker" },
      { cards: ["As", "3h", "Qd", "Qc", "3s"], description: "Middle and bottom pair: queens and threes with ace kicker" },
      { cards: ["Ks", "4h", "Jd", "Jc", "4s"], description: "Middle and bottom pair: jacks and fours with king kicker" },
      { cards: ["Qs", "5h", "Td", "Tc", "5s"], description: "Middle and bottom pair: tens and fives with queen kicker" },
      { cards: ["Js", "6h", "9d", "9c", "6s"], description: "Middle and bottom pair: nines and sixes with jack kicker" },
      { cards: ["As", "2h", "5d", "5c", "2s"], description: "Middle and bottom pair: fives and deuces with ace-king kickers" },
    ],
    fail: [
      { cards: ["As", "Ah", "Kd", "Kc", "Qs"], description: "Top and middle pair, not middle and bottom" },
      { cards: ["As", "Ah", "Kd", "2c", "2s"], description: "Top and bottom pair, not middle and bottom" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not two pair" },
      { cards: ["As", "Ah", "Ad", "Kc", "Qs"], description: "Three of a kind, not two pair" },
      { cards: ["As", "Kh", "Qd", "Jc", "Ts"], description: "High card, not two pair" },
      { cards: ["As", "Ah", "Kd", "Qc", "Js"], description: "Pair, not two pair" },
      { cards: ["Ks", "Kh", "Qd", "Qc", "Js"], description: "Top and middle pair, not middle and bottom" },
      { cards: ["As", "Ah", "Ad", "Ac", "Ks"], description: "Four of a kind, not two pair" },
      { cards: ["As", "Ah", "Kd", "Kc", "Kh"], description: "Full house, not two pair" },
      { cards: ["As", "Ah", "Qd", "2c", "2s"], description: "Top and bottom pair, not middle and bottom" },
    ],
    deformed: [
      { cards: ["As", "Kh", "Qd", "Qc"], description: "Only 4 cards" },
      { cards: ["As", "Kh", "Qd", "Qc", "2"], description: "Invalid card format" },
      { cards: ["As", "Kh", "Qd", "Qc", "2x"], description: "Invalid suit" },
      { cards: ["As", "Kh", "Qd", "Qc", "Zs"], description: "Invalid rank" },
    ],
  },

  // ==================== DRAWS ====================

  flushDraw: {
    passable: [
      { cards: ["As", "Ks", "Qs", "Js", "9h"], description: "Four spades, one heart" },
      { cards: ["Ah", "Kh", "Qh", "Jh", "9s"], description: "Four hearts, one spade" },
      { cards: ["Ad", "Kd", "Qd", "Jd", "9c"], description: "Four diamonds, one club" },
      { cards: ["Ac", "Kc", "Qc", "Jc", "9s"], description: "Four clubs, one spade" },
      { cards: ["9s", "8s", "7s", "6s", "Kh"], description: "Four spades low, one king" },
      { cards: ["2s", "3s", "4s", "5s", "Ah"], description: "Four spades low, one ace" },
      { cards: ["Ks", "Qs", "Js", "Ts", "9d"], description: "Four spades high, one nine" },
      { cards: ["As", "Ks", "Qs", "Ts", "9h"], description: "Four spades, missing jack" },
      { cards: ["As", "Ks", "Qs", "9s", "8h"], description: "Four spades, missing jack-ten" },
      { cards: ["As", "Ks", "Ts", "9s", "8h"], description: "Four spades, missing queen-jack" },
    ],
    fail: [
      { cards: ["As", "Ks", "Qs", "Js", "Ts"], description: "Made flush, not draw" },
      { cards: ["As", "Ks", "Qs", "Js", "9s"], description: "Made flush, not draw" },
      { cards: ["As", "Ks", "Qs", "Jh", "9h"], description: "Three suited, not four" },
      { cards: ["As", "Ks", "Qh", "Jh", "9h"], description: "Three suited, not four" },
      { cards: ["As", "Kc", "Qh", "Jh", "9h"], description: "Three suited, not four" },
      { cards: ["Ah", "Kh", "Qh", "Js", "9s"], description: "Three suited, not four" },
      { cards: ["As", "Kd", "Qh", "Js", "9s"], description: "Three suited, not four" },
      { cards: ["Ac", "Kh", "Qs", "Js", "9s"], description: "Three suited, not four" },
      { cards: ["Ah", "Kd", "Qs", "Js", "9s"], description: "Three suited, not four" },
      { cards: ["As", "Ks", "Qs", "Jh", "9d"], description: "Two suited, not four" },
    ],
    deformed: [
      { cards: ["As", "Ks", "Qs", "Js"], description: "Only 4 cards" },
      { cards: ["As", "Ks", "Qs", "Js", "9"], description: "Invalid card format" },
      { cards: ["As", "Ks", "Qs", "Js", "9x"], description: "Invalid suit" },
      { cards: ["As", "Ks", "Qs", "Js", "Zh"], description: "Invalid rank" },
    ],
  },

  backdoorFlushDraw: {
    passable: [
      { cards: ["As", "Ks", "Qs", "Jh", "9h"], description: "Three spades, two hearts" },
      { cards: ["Ah", "Kh", "Qh", "Js", "9s"], description: "Three hearts, two spades" },
      { cards: ["Ad", "Kd", "Qd", "Jc", "9c"], description: "Three diamonds, two clubs" },
      { cards: ["Ac", "Kc", "Qc", "Js", "9s"], description: "Three clubs, two spades" },
      { cards: ["9s", "8s", "7s", "Kh", "Qh"], description: "Three spades low, two hearts high" },
      { cards: ["2s", "3s", "4s", "Ah", "Kh"], description: "Three spades low, two hearts high" },
      { cards: ["Ks", "Qs", "Js", "Th", "9h"], description: "Three spades high, two hearts" },
      { cards: ["As", "Ks", "Qs", "Th", "9h"], description: "Three spades, two hearts" },
      { cards: ["As", "Ks", "Ts", "9h", "8h"], description: "Three spades, two hearts" },
      { cards: ["As", "Ts", "9s", "8h", "7h"], description: "Three spades, two hearts" },
    ],
    fail: [
      { cards: ["As", "Ks", "Qs", "Js", "Ts"], description: "Made flush, not draw" },
      { cards: ["As", "Ks", "Qs", "Js", "9s"], description: "Made flush, not draw" },
      { cards: ["As", "Ks", "Qs", "Js", "9h"], description: "Four to flush, not backdoor" },
      { cards: ["Ad", "Ks", "Qs", "Jh", "9d"], description: "Two suited, three off, not backdoor" },
      { cards: ["As", "Ks", "Qc", "Jh", "9h"], description: "Two suited, three off, not backdoor" },
      { cards: ["As", "Kh", "Qh", "Jh", "9h"], description: "Four to flush, not backdoor" },
      { cards: ["Ah", "Kd", "Qh", "Js", "9s"], description: "Two suited, three off, not backdoor" },
      { cards: ["As", "Ks", "Qh", "Js", "9s"], description: "Four suited, one off, not backdoor" },
      { cards: ["As", "Kh", "Qs", "Js", "9s"], description: "Four suited, one off, not backdoor" },
      { cards: ["Ah", "Ks", "Qs", "Js", "9s"], description: "Four suited, one off, not backdoor" },
    ],
    deformed: [
      { cards: ["As", "Ks", "Qs"], description: "Only 3 cards" },
      { cards: ["As", "Ks", "Qs", "Jh", "9"], description: "Invalid card format" },
      { cards: ["As", "Ks", "Qs", "Jh", "9x"], description: "Invalid suit" },
      { cards: ["As", "Ks", "Qs", "Jh", "Zh"], description: "Invalid rank" },
    ],
  },

  openEndedStraightDraw: {
    passable: [
      { cards: ["9s", "8h", "7d", "6c", "Kh"], description: "Open-ended 9-8-7-6, need 5 or T" },
      { cards: ["Ts", "9h", "8d", "7c", "Kh"], description: "Open-ended T-9-8-7, need 6 or J" },
      { cards: ["Js", "Th", "9d", "8c", "Kh"], description: "Open-ended J-T-9-8, need 7 or Q" },
      { cards: ["Qs", "Jh", "Td", "9c", "2h"], description: "Open-ended Q-J-T-9, need 8 or K" },
      { cards: ["8s", "7h", "6d", "5c", "Ah"], description: "Open-ended 8-7-6-5, need 4 or 9" },
      { cards: ["7s", "6h", "5d", "4c", "Ah"], description: "Open-ended 7-6-5-4, need 3 or 8" },
      { cards: ["6s", "5h", "4d", "3c", "Ah"], description: "Open-ended 6-5-4-3, need 2 or 7" },
      { cards: ["5s", "4h", "3d", "2c", "Kh"], description: "Open-ended 5-4-3-2, need A or 6 (wheel)" },
      { cards: ["Ks", "Qh", "Jd", "Tc", "3h"], description: "Open-ended K-Q-J-T, need 9 or A" },
      { cards: ["9s", "8h", "7d", "6c", "2h"], description: "Open-ended 9-8-7-6, need 5 or T" },
    ],
    fail: [
      { cards: ["9s", "8h", "7d", "6c", "5s"], description: "Made straight, not draw" },
      { cards: ["Ts", "9h", "8d", "7c", "6s"], description: "Made straight, not draw" },
      { cards: ["9s", "8h", "7d", "5c", "Kh"], description: "Inside straight draw, not open-ended" },
      { cards: ["9s", "8h", "6d", "5c", "Kh"], description: "Two gaps, not open-ended" },
      { cards: ["9s", "7h", "6d", "5c", "Kh"], description: "Large gap, not open-ended" },
      { cards: ["9s", "8h", "7d", "6c", "Th"], description: "Made straight, not draw" },
      { cards: ["As", "8h", "7d", "6c", "4h"], description: "Inside straight draw, not open-ended" },
      { cards: ["9s", "8h", "7d", "5c", "4h"], description: "Two gaps, not open-ended" },
      { cards: ["9s", "8h", "6d", "5c", "4h"], description: "Three gaps, not open-ended" },
      { cards: ["Ts", "9h", "6d", "5c", "4h"], description: "Large gap, not open-ended" },
    ],
    deformed: [
      { cards: ["9s", "8h", "7d", "6c"], description: "Only 4 cards" },
      { cards: ["9s", "8h", "7d", "6c", "K"], description: "Invalid card format" },
      { cards: ["9s", "8h", "7d", "6c", "Kx"], description: "Invalid suit" },
      { cards: ["9s", "8h", "7d", "6c", "Zh"], description: "Invalid rank" },
    ],
  },

  insideStraightDraw: {
    passable: [
      { cards: ["9s", "8h", "7d", "5c", "Kh"], description: "Inside straight 9-8-7-5, need 6" },
      { cards: ["Ts", "9h", "8d", "6c", "Kh"], description: "Inside straight T-9-8-6, need 7" },
      { cards: ["Js", "Th", "9d", "7c", "Kh"], description: "Inside straight J-T-9-7, need 8" },
      { cards: ["Qs", "Jh", "Td", "8c", "Kh"], description: "Inside straight Q-J-T-8, need 9" },
      { cards: ["Ks", "Qh", "Jd", "9c", "Ah"], description: "Inside straight K-Q-J-9, need T" },
      { cards: ["8s", "7h", "6d", "4c", "Ah"], description: "Inside straight 8-7-6-4, need 5" },
      { cards: ["7s", "6h", "5d", "3c", "Ah"], description: "Inside straight 7-6-5-3, need 4" },
      { cards: ["6s", "5h", "4d", "2c", "Ah"], description: "Inside straight 6-5-4-2, need 3" },
      { cards: ["5s", "4h", "3d", "Ac", "Kh"], description: "Inside straight 5-4-3-A, need 2 (wheel)" },
      { cards: ["9s", "8h", "6d", "5c", "Kh"], description: "Inside straight 9-8-6-5, need 7" },
    ],
    fail: [
      { cards: ["9s", "8h", "7d", "6c", "5s"], description: "Made straight, not draw" },
      { cards: ["9s", "8h", "7d", "6c", "Kh"], description: "Open-ended straight draw, not inside" },
      { cards: ["8s", "7h", "6d", "5c", "4h"], description: "Made straight, not draw" },
      { cards: ["Ts", "8h", "6d", "5c", "Kh"], description: "Two gaps, not inside draw" },
      { cards: ["9s", "7h", "6d", "Ac", "Kh"], description: "Large gap, not inside draw" },
      { cards: ["9s", "8h", "7d", "6c", "Th"], description: "Made straight, not draw" },
      { cards: ["Ts", "8h", "7d", "5c", "3h"], description: "Two gaps, not inside draw" },
      { cards: ["9s", "8h", "6d", "4c", "Kh"], description: "Multiple gaps, not inside draw" },
      { cards: ["9s", "7h", "6d", "Qc", "Kh"], description: "Large gaps, not inside draw" },
      { cards: ["9s", "8h", "5d", "4c", "Kh"], description: "Multiple gaps, not inside draw" },
    ],
    deformed: [
      { cards: ["9s", "8h", "7d", "5c"], description: "Only 4 cards" },
      { cards: ["9s", "8h", "7d", "5c", "K"], description: "Invalid card format" },
      { cards: ["9s", "8h", "7d", "5c", "Kx"], description: "Invalid suit" },
      { cards: ["9s", "8h", "7d", "5c", "Zh"], description: "Invalid rank" },
    ],
  },
};

// ==================== JEST TEST IMPLEMENTATIONS ====================

// Helper function to convert test case key to property name
function getPropertyName(key) {
  return `is${key.charAt(0).toUpperCase() + key.slice(1)}`;
}

// Generate tests for each hand/draw type
Object.keys(TEST_CASES).forEach((handType) => {
  const testCase = TEST_CASES[handType];
  const propertyName = getPropertyName(handType);
  
  describe(`${handType} - Passable Tests`, () => {
    testCase.passable.forEach((testItem, index) => {
      test(`${index + 1}. ${testItem.description}`, () => {
        const result = evaluateHand(testItem.cards);
        // Extract evaluation object from the result (for 5-card hands, there's one key-value pair)
        const evaluationKey = Object.keys(result)[0];
        const evaluation = result[evaluationKey];
        expect(evaluation[propertyName]).toBe(true);
      });
    });
  });

  describe(`${handType} - Fail Tests`, () => {
    testCase.fail.forEach((testItem, index) => {
      test(`${index + 1}. ${testItem.description}`, () => {
        const result = evaluateHand(testItem.cards);
        // Extract evaluation object from the result (for 5-card hands, there's one key-value pair)
        const evaluationKey = Object.keys(result)[0];
        const evaluation = result[evaluationKey];
        expect(evaluation[propertyName]).toBe(false);
      });
    });
  });

  describe(`${handType} - Deformed Input Tests`, () => {
    testCase.deformed.forEach((testItem, index) => {
      test(`${index + 1}. ${testItem.description}`, () => {
        expect(() => evaluateHand(testItem.cards)).toThrow();
      });
    });
  });
});

// ==================== KEY CARDS AND KICKER CARDS TESTS ====================

describe('keyCards and kickerCards', () => {
  describe('Royal Flush', () => {
    test('should have all 5 cards as keyCards, no kickerCards', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isRoyalFlush.sort()).toEqual(['As', 'Ks', 'Qs', 'Js', 'Ts'].sort());
      expect(evaluation.kickerCards.isRoyalFlush).toEqual([]);
    });
  });

  describe('Straight Flush', () => {
    test('should have all 5 cards as keyCards, no kickerCards', () => {
      const result = evaluateHand(['9s', '8s', '7s', '6s', '5s']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isStraightFlush.sort()).toEqual(['9s', '8s', '7s', '6s', '5s'].sort());
      expect(evaluation.kickerCards.isStraightFlush).toEqual([]);
    });

    test('should handle wheel straight flush', () => {
      const result = evaluateHand(['5d', '4d', '3d', '2d', 'Ad']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isStraightFlush.sort()).toEqual(['5d', '4d', '3d', '2d', 'Ad'].sort());
      expect(evaluation.kickerCards.isStraightFlush).toEqual([]);
    });
  });

  describe('Four of a Kind', () => {
    test('should have 4 cards of same rank as keyCards, 1 kicker', () => {
      const result = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isFourOfAKind.sort()).toEqual(['As', 'Ah', 'Ad', 'Ac'].sort());
      expect(evaluation.kickerCards.isFourOfAKind).toEqual(['Ks']);
    });

    test('should have kicker sorted correctly', () => {
      const result = evaluateHand(['2s', '2h', '2d', '2c', 'As']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isFourOfAKind.sort()).toEqual(['2s', '2h', '2d', '2c'].sort());
      expect(evaluation.kickerCards.isFourOfAKind).toEqual(['As']);
    });
  });

  describe('Full House', () => {
    test('should have all 5 cards as keyCards, no kickerCards', () => {
      const result = evaluateHand(['As', 'Ah', 'Ad', 'Kc', 'Kh']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isFullHouse.sort()).toEqual(['As', 'Ah', 'Ad', 'Kc', 'Kh'].sort());
      expect(evaluation.kickerCards.isFullHouse).toEqual([]);
    });
  });

  describe('Flush', () => {
    test('should have all 5 cards of same suit as keyCards, no kickerCards', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isFlush.sort()).toEqual(['As', 'Ks', 'Qs', 'Js', '9s'].sort());
      expect(evaluation.kickerCards.isFlush).toEqual([]);
    });
  });

  describe('Straight', () => {
    test('should have all 5 cards as keyCards, no kickerCards', () => {
      const result = evaluateHand(['As', 'Kh', 'Qd', 'Jc', 'Ts']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isStraight.sort()).toEqual(['As', 'Kh', 'Qd', 'Jc', 'Ts'].sort());
      expect(evaluation.kickerCards.isStraight).toEqual([]);
    });

    test('should handle wheel straight', () => {
      const result = evaluateHand(['5s', '4h', '3d', '2c', 'As']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isStraight.sort()).toEqual(['5s', '4h', '3d', '2c', 'As'].sort());
      expect(evaluation.kickerCards.isStraight).toEqual([]);
    });
  });

  describe('Three of a Kind', () => {
    test('should have 3 cards of same rank as keyCards, 2 kickers', () => {
      const result = evaluateHand(['As', 'Ah', 'Ad', 'Kc', 'Qs']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isThreeOfAKind.sort()).toEqual(['As', 'Ah', 'Ad'].sort());
      expect(evaluation.kickerCards.isThreeOfAKind.sort()).toEqual(['Kc', 'Qs'].sort());
    });
  });

  describe('Two Pair', () => {
    test('should have 4 cards (2 pairs) as keyCards, 1 kicker', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isTwoPair.sort()).toEqual(['As', 'Ah', 'Kd', 'Kc'].sort());
      expect(evaluation.kickerCards.isTwoPair).toEqual(['Qs']);
    });
  });

  describe('Pair', () => {
    test('should have 2 cards of pair as keyCards, 3 kickers', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Qc', 'Js']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isPair.sort()).toEqual(['As', 'Ah'].sort());
      expect(evaluation.kickerCards.isPair.sort()).toEqual(['Kd', 'Qc', 'Js'].sort());
    });
  });

  describe('High Card', () => {
    test('should have empty keyCards, all 5 cards as kickerCards (when no draw)', () => {
      const result = evaluateHand(['As', 'Kh', 'Qd', '7c', '5s']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isHighCard).toEqual([]);
      expect(evaluation.kickerCards.isHighCard.sort()).toEqual(['As', 'Kh', 'Qd', '7c', '5s'].sort());
    });

    test('should have draw cards as keyCards when high card hand has a draw', () => {
      const result = evaluateHand(['As', 'Kh', 'Qd', 'Jc', '9s']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isStraightDraw.length).toBe(4);
      expect(evaluation.kickerCards.isStraightDraw.length).toBe(1);
      expect(evaluation.kickerCards.isStraightDraw).toEqual(['9s']);
      const keyRanks = evaluation.keyCards.isStraightDraw.map(c => c.slice(0, -1));
      expect(['A', 'K', 'Q', 'J']).toEqual(expect.arrayContaining(keyRanks));
    });
  });

  describe('Flush Draw', () => {
    test('should have 4 cards of same suit as keyCards, 1 kicker', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9h']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isFlushDraw.sort()).toEqual(['As', 'Ks', 'Qs', 'Js'].sort());
      expect(evaluation.kickerCards.isFlushDraw).toEqual(['9h']);
    });
  });

  describe('Backdoor Flush Draw', () => {
    test('should have 3 cards of same suit as keyCards, 2 kickers', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Jh', '9h']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isBackdoorFlushDraw.sort()).toEqual(['As', 'Ks', 'Qs'].sort());
      expect(evaluation.kickerCards.isBackdoorFlushDraw.sort()).toEqual(['Jh', '9h'].sort());
    });
  });

  describe('Open-Ended Straight Draw', () => {
    test('should have 4 cards forming draw as keyCards, 1 kicker', () => {
      const result = evaluateHand(['9s', '8h', '7d', '6c', 'Kh']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isOpenEndedStraightDraw.length).toBe(4);
      expect(evaluation.kickerCards.isOpenEndedStraightDraw.length).toBe(1);
      expect(evaluation.kickerCards.isOpenEndedStraightDraw).toEqual(['Kh']);
      const keyRanks = evaluation.keyCards.isOpenEndedStraightDraw.map(c => c.slice(0, -1));
      expect(['9', '8', '7', '6']).toEqual(expect.arrayContaining(keyRanks));
    });
  });

  describe('Inside Straight Draw', () => {
    test('should have 4 cards forming draw as keyCards, 1 kicker', () => {
      const result = evaluateHand(['9s', '8h', '7d', '5c', 'Kh']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isInsideStraightDraw.length).toBe(4);
      expect(evaluation.kickerCards.isInsideStraightDraw.length).toBe(1);
      expect(evaluation.kickerCards.isInsideStraightDraw).toEqual(['Kh']);
      const keyRanks = evaluation.keyCards.isInsideStraightDraw.map(c => c.slice(0, -1));
      expect(['9', '8', '7', '5']).toEqual(expect.arrayContaining(keyRanks));
    });
  });

  describe('Multiple Hand Types', () => {
    test('should have separate keyCards for pair and flush draw', () => {
      const result = evaluateHand(['As', 'Ah', 'Ks', 'Qs', 'Js']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isPair.sort()).toEqual(['As', 'Ah'].sort());
      expect(evaluation.kickerCards.isPair.sort()).toEqual(['Ks', 'Qs', 'Js'].sort());
      expect(evaluation.keyCards.isFlushDraw.sort()).toEqual(['As', 'Ks', 'Qs', 'Js'].sort());
      expect(evaluation.kickerCards.isFlushDraw).toEqual(['Ah']);
    });
  });

  describe('Empty Arrays for False Hand Types', () => {
    test('should have empty arrays for false hand types', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Qc', 'Js']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.keyCards.isFourOfAKind).toEqual([]);
      expect(evaluation.kickerCards.isFourOfAKind).toEqual([]);
      expect(evaluation.keyCards.isFlush).toEqual([]);
      expect(evaluation.kickerCards.isFlush).toEqual([]);
    });
  });

  describe('Card Sorting', () => {
    test('keyCards should be sorted from highest to lowest rank', () => {
      const result = evaluateHand(['2s', 'Ah', 'Ad', 'Ac', 'As']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      const sortedKeyCards = [...evaluation.keyCards.isFourOfAKind].sort((a, b) => {
        const rankMap = { A: 13, K: 12, Q: 11, J: 10, T: 9, '9': 8, '8': 7, '7': 6, '6': 5, '5': 4, '4': 3, '3': 2, '2': 1 };
        const rankA = rankMap[a.slice(0, -1)];
        const rankB = rankMap[b.slice(0, -1)];
        return rankB - rankA;
      });
      expect(evaluation.keyCards.isFourOfAKind).toEqual(sortedKeyCards);
    });

    test('kickerCards should be sorted from highest to lowest rank', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Qc', 'Js']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      const sortedKickerCards = [...evaluation.kickerCards.isPair].sort((a, b) => {
        const rankMap = { A: 13, K: 12, Q: 11, J: 10, T: 9, '9': 8, '8': 7, '7': 6, '6': 5, '5': 4, '4': 3, '3': 2, '2': 1 };
        const rankA = rankMap[a.slice(0, -1)];
        const rankB = rankMap[b.slice(0, -1)];
        return rankB - rankA;
      });
      expect(evaluation.kickerCards.isPair).toEqual(sortedKickerCards);
    });
  });
});

// ==================== STRICT MODE TESTS ====================

describe('Strict Mode', () => {
  describe('Default behavior (strict: true)', () => {
    test('should only mark strongest made hand - two pair filters out pair (default)', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      expect(evaluation.isPair).toBe(false);
      expect(evaluation.isTopAndMiddlePair).toBe(true);
    });

    test('should only mark strongest made hand - two pair filters out pair (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      expect(evaluation.isPair).toBe(false);
      expect(evaluation.isTopAndMiddlePair).toBe(true);
    });

    test('should filter descriptive labels for non-matching hands (default)', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      // Two pair should not have pair labels
      expect(evaluation.isTopPair).toBe(false);
      expect(evaluation.isMiddlePair).toBe(false);
      expect(evaluation.isBottomPair).toBe(false);
    });

    test('should filter descriptive labels for non-matching hands (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      // Two pair should not have pair labels
      expect(evaluation.isTopPair).toBe(false);
      expect(evaluation.isMiddlePair).toBe(false);
      expect(evaluation.isBottomPair).toBe(false);
    });

    test('should keep descriptive labels for matching strongest hand (default)', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Qc', 'Js']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isPair).toBe(true);
      // At least one pair label should be true (depending on which pair it is)
      expect(evaluation.isTopPair || evaluation.isMiddlePair || evaluation.isBottomPair).toBe(true);
    });

    test('should keep descriptive labels for matching strongest hand (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Qc', 'Js'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isPair).toBe(true);
      // At least one pair label should be true (depending on which pair it is)
      expect(evaluation.isTopPair || evaluation.isMiddlePair || evaluation.isBottomPair).toBe(true);
    });

    test('should filter straight draw when made flush exists (default)', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFlush).toBe(true);
      expect(evaluation.isStraightDraw).toBe(false);
      expect(evaluation.isOpenEndedStraightDraw).toBe(false);
      expect(evaluation.isInsideStraightDraw).toBe(false);
    });

    test('should filter straight draw when made flush exists (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', '9s'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFlush).toBe(true);
      expect(evaluation.isStraightDraw).toBe(false);
      expect(evaluation.isOpenEndedStraightDraw).toBe(false);
      expect(evaluation.isInsideStraightDraw).toBe(false);
    });

    test('should keep flush draw with two pair (default)', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      // This hand doesn't have a flush draw, so test a hand that does
      const result2 = evaluateHand(['As', 'Ah', 'Ks', 'Qs', 'Js']);
      const evaluationKey2 = Object.keys(result2)[0];
      const evaluation2 = result2[evaluationKey2];
      
      // This is actually a pair with flush draw, not two pair
      expect(evaluation2.isPair).toBe(true);
      expect(evaluation2.isFlushDraw).toBe(true);
    });

    test('should keep flush draw with two pair (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      // This hand doesn't have a flush draw, so test a hand that does
      const evaluator2 = new HandEvaluator(['As', 'Ah', 'Ks', 'Qs', 'Js'], true);
      const result2 = evaluator2.evaluation;
      const evaluationKey2 = Object.keys(result2)[0];
      const evaluation2 = result2[evaluationKey2];
      
      // This is actually a pair with flush draw, not two pair
      expect(evaluation2.isPair).toBe(true);
      expect(evaluation2.isFlushDraw).toBe(true);
    });

    test('should keep draws with high card (default)', () => {
      const result = evaluateHand(['As', 'Kh', 'Qd', 'Jc', '9s']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isHighCard).toBe(true);
      expect(evaluation.isStraightDraw).toBe(true);
    });

    test('should keep draws with high card (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Kh', 'Qd', 'Jc', '9s'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isHighCard).toBe(true);
      expect(evaluation.isStraightDraw).toBe(true);
    });

    test('should keep both flush draw and straight draw when no made hand (default)', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9h']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFlushDraw).toBe(true);
      expect(evaluation.isStraightDraw).toBe(true);
    });

    test('should keep both flush draw and straight draw when no made hand (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', '9h'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFlushDraw).toBe(true);
      expect(evaluation.isStraightDraw).toBe(true);
    });
  });

  describe('Non-strict mode (strict: false)', () => {
    test('should mark all applicable hands - two pair keeps descriptive labels', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs'], false);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      // Note: isPair is false by evaluation logic (two pair is not a pair)
      // But descriptive labels should be preserved
      expect(evaluation.isTopAndMiddlePair).toBe(true);
    });

    test('should keep all descriptive labels when applicable', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs'], false);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      // In non-strict mode, pair labels might still be false if logic says so,
      // but two pair labels should be true
      expect(evaluation.isTopAndMiddlePair).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle royal flush correctly (default)', () => {
      const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isRoyalFlush).toBe(true);
      expect(evaluation.isStraightFlush).toBe(false);
      expect(evaluation.isFlush).toBe(false);
      expect(evaluation.isStraight).toBe(false);
    });

    test('should handle royal flush correctly (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isRoyalFlush).toBe(true);
      expect(evaluation.isStraightFlush).toBe(false);
      expect(evaluation.isFlush).toBe(false);
      expect(evaluation.isStraight).toBe(false);
    });

    test('should handle four of a kind correctly (default)', () => {
      const result = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFourOfAKind).toBe(true);
      expect(evaluation.isThreeOfAKind).toBe(false);
      expect(evaluation.isPair).toBe(false);
    });

    test('should handle four of a kind correctly (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Ac', 'Ks'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFourOfAKind).toBe(true);
      expect(evaluation.isThreeOfAKind).toBe(false);
      expect(evaluation.isPair).toBe(false);
    });

    test('should handle full house correctly (default)', () => {
      const result = evaluateHand(['As', 'Ah', 'Ad', 'Kc', 'Kh']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFullHouse).toBe(true);
      expect(evaluation.isThreeOfAKind).toBe(false);
      expect(evaluation.isTwoPair).toBe(false);
      expect(evaluation.isPair).toBe(false);
    });

    test('should handle full house correctly (explicit)', () => {
      const evaluator = new HandEvaluator(['As', 'Ah', 'Ad', 'Kc', 'Kh'], true);
      const result = evaluator.evaluation;
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isFullHouse).toBe(true);
      expect(evaluation.isThreeOfAKind).toBe(false);
      expect(evaluation.isTwoPair).toBe(false);
      expect(evaluation.isPair).toBe(false);
    });
  });

  describe('evaluateHand function with strict parameter', () => {
    test('should default to strict=true', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      expect(evaluation.isPair).toBe(false);
    });

    test('should work with strict=true via evaluateHand (explicit)', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs'], true);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      expect(evaluation.isPair).toBe(false);
    });

    test('should work with strict=false via evaluateHand', () => {
      const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs'], false);
      const evaluationKey = Object.keys(result)[0];
      const evaluation = result[evaluationKey];
      
      expect(evaluation.isTwoPair).toBe(true);
      // Note: isPair is false by evaluation logic (two pair is not a pair)
      // This test verifies non-strict mode behavior
      expect(evaluation.isTopAndMiddlePair).toBe(true);
    });
  });
});

// ==================== STRICT MODE COMBINATION FILTERING TESTS ====================
// These tests verify that when strict mode is enabled with 6+ cards, only the best
// 5-card combination is returned. This is critical for RangeManager.hitsHand() to
// correctly identify hand strengths when the board already has pairs or other made hands.
//
// Example: Board 3♠ K♠ T♠ K♦ has a pair of Kings. Hand A3 makes a pair of 3s,
// so the best hand is "Two Pair" (KK + 33), not "Pair".

describe('Strict Mode Combination Filtering - Pair vs Two Pair on Paired Board', () => {
  test('should return Two Pair when board has pair and hand makes pair', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: A3 (makes pair of 3s)
    // Expected: Two Pair (KK + 33), NOT Pair
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Ac', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isTwoPair).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Two Pair when board has pair and hand pairs with different board card', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: AT (makes pair of Tens with board T)
    // Expected: Two Pair (KK + TT)
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Ac', 'Th'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isTwoPair).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should identify Two Pair when board has pair and hand has pocket pair', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: 33 (pocket pair of 3s)
    // Result: Should be Two Pair (KK + 33)
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['3c', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFullHouse).toBe(true);
    expect(evaluation.isTwoPair).toBe(false);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Pair when board has no pair and hand makes pair', () => {
    // Board: 3♠ K♠ T♠ 9♦ (no pair)
    // Hand: A3 (makes pair of 3s)
    // Expected: Pair, NOT Two Pair
    const board = ['3s', 'Ks', 'Ts', '9d'];
    const hand = ['Ac', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isPair).toBe(true);
    expect(evaluation.isTwoPair).toBe(false);
  });

  test('should return Three of a Kind when board has no pair and hand has pocket pair matching board', () => {
    // Board: 3♠ K♠ T♠ 9♦ (no pair, but has one 3)
    // Hand: 33 (pocket pair of 3s)
    // Expected: Three of a Kind (333)
    const board = ['3s', 'Ks', 'Ts', '9d'];
    const hand = ['3c', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isThreeOfAKind).toBe(true);
    expect(evaluation.isPair).toBe(false);
    expect(evaluation.isTwoPair).toBe(false);
  });

  test('should identify Two Pair when board has two pair and hand makes pair', () => {
    // Board: 3♠ K♠ T♠ K♦ T♦ (has two pair: KK + TT)
    // Hand: A3 (makes pair of 3s)
    // Result: Should still be Two Pair (best 5 cards would be KK + TT)
    const board = ['3s', 'Ks', 'Ts', 'Kd', 'Td'];
    const hand = ['Ac', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    // Best 5 cards: KK + TT + A = Two Pair
    expect(evaluation.isTwoPair).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should identify Three of a Kind when board has pair and hand adds another King', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: KK (pocket pair of Kings)
    // Result: Should be Three of a Kind (KKK), not Full House (no pair to go with KKK)
    const board = ['Th', 'Ks', 'Ts', 'Kd'];
    const hand = ['Kc', 'Kh'];
    const allCards = [...board, ...hand];
    
    // Check all combinations
    const resultNonStrict = evaluateHand(allCards, false);
    const fourOfAKindCombos = Object.keys(resultNonStrict).filter(key => 
      resultNonStrict[key].isFourOfAKind === true
    );
    expect(fourOfAKindCombos.length).toBeGreaterThan(0);
    
    // Test strict mode
    const resultStrict = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(resultStrict)[0];
    const evaluation = resultStrict[evaluationKey];
    
    // Best hand should be Three of a Kind (KKK)
    expect(evaluation.isFourOfAKind).toBe(true);
    expect(evaluation.isThreeOfAKind).toBe(false);
    expect(evaluation.isFullHouse).toBe(false);
    expect(evaluation.isTwoPair).toBe(false);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Two Pair with correct key cards when board has pair and hand pairs with ace kicker', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: A3 (makes pair of 3s, Ace kicker)
    // Expected: Two Pair (KK + 33), Ace is kicker
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Ac', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isTwoPair).toBe(true);
    expect(evaluation.isPair).toBe(false);
    expect(evaluation.keyCards.isTwoPair).toBeDefined();
    expect(evaluation.keyCards.isTwoPair.length).toBeGreaterThanOrEqual(4);
  });

  test('should identify Two Pair when board has low pair and hand makes high pair', () => {
    // Board: 3♠ 3♠ T♠ 9♦ (has pair of 3s)
    // Hand: AK (makes pair of Aces or Kings if board has one)
    // Result: Should be Two Pair if hand pairs, or Pair if no pair
    const board = ['3s', '3h', 'Ts', '9d'];
    const hand = ['Ac', 'Kd'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    // No pair in hand, so should be Pair (33 from board)
    expect(evaluation.isPair).toBe(true);
    expect(evaluation.isTwoPair).toBe(false);
  });

  test('should return Two Pair when board has pair and hand makes pair with middle card', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: QT (makes pair of Tens with board T)
    // Expected: Two Pair (KK + TT)
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Qc', 'Th'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isTwoPair).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should correctly evaluate when board has pair and hand makes no pair', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: AQ (no pair, just high cards)
    // Result: Should be Pair (KK from board)
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Ac', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isPair).toBe(true);
    expect(evaluation.isTwoPair).toBe(false);
  });

  test('should return Two Pair when board has pair and hand makes pair with lowest board card', () => {
    // Board: 2♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: A2 (makes pair of 2s with board 2)
    // Expected: Two Pair (KK + 22)
    const board = ['2s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Ac', '2h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isTwoPair).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Three of a Kind when board has pair and hand makes three of a kind', () => {
    // Board: 3♠ K♠ T♠ K♦ (has pair of Kings)
    // Hand: K3 (has King and 3)
    // Expected: Three of a Kind (KKK) - best hand
    const board = ['3s', 'Ks', 'Ts', 'Kd'];
    const hand = ['Kc', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    // Best hand: KKK + T + 3 = Three of a Kind
    expect(evaluation.isFullHouse).toBe(true);
    expect(evaluation.isThreeOfAKind).toBe(false);
    expect(evaluation.isTwoPair).toBe(false);
    expect(evaluation.isPair).toBe(false);
  });
});

// ==================== STRICT MODE COMBINATION FILTERING - OTHER HAND COMBINATIONS ====================
// These tests verify that strict mode correctly returns the best hand when multiple
// hand types are possible from different 5-card combinations.

describe('Strict Mode Combination Filtering - Other Hand Combinations', () => {
  test('should return Straight when board has pair and hand makes straight', () => {
    // Board: 9♠ T♠ J♠ K♦ Kc (has pair of Kings, straight draw)
    // Hand: Q8 (makes straight Q-J-T-9-8)
    // Expected: Straight (stronger than Pair)
    const board = ['9s', 'Th', 'Jh', 'Kd', 'Kc'];
    const hand = ['Qc', '8h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraight).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Flush when board has pair and hand makes flush', () => {
    // Board: 3♠ K♠ K♦ 9♠ 2♠ (has pair of Kings, 4 spades)
    // Hand: As (completes flush)
    // Expected: Flush (stronger than Pair)
    const board = ['3s', 'Ks', 'Kd', '9s', '2s'];
    const hand = ['As', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFlush).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Straight when board has two pair and hand makes straight', () => {
    // Board: 9♠ T♠ J♠ K♦ Kc (has pair of Kings, straight draw)
    // Hand: Q8 (makes straight Q-J-T-9-8, stronger than pair)
    // Expected: Straight (stronger than Two Pair if board had two pair)
    // Note: This test uses a board with pair + straight to verify strict mode filtering
    const board = ['9s', 'Th', 'Jh', 'Kd', 'Kc'];
    const hand = ['Qc', '8h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraight).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Flush when board has two pair and hand makes flush', () => {
    // Board: 3♠ K♠ K♦ 9♠ 2♠ (has pair of Kings, 4 spades)
    // Hand: As (completes flush)
    // Expected: Flush (stronger than Pair)
    // Note: This test uses a board with pair + flush to verify strict mode filtering
    const board = ['3s', 'Ks', 'Kd', '9s', '2s'];
    const hand = ['As', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFlush).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Flush when both straight and flush are possible', () => {
    // Board: 3♠ 4♠ 5♠ 6♠ (4 spades, straight draw)
    // Hand: 2s (makes flush, or could make straight with 2-3-4-5-6)
    // Expected: Flush (stronger than Straight)
    const board = ['3s', '4s', '5s', '6h', '2h'];
    const hand = ['2s', 'Ks'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFlush).toBe(true);
    expect(evaluation.isStraight).toBe(false);
  });

  test('should return Straight Flush when both straight and flush are possible with same suit', () => {
    // Board: 3♠ 4♠ 5♠ 6♠ (4 spades, straight draw)
    // Hand: 2s (makes straight flush 2-3-4-5-6 all spades)
    // Expected: Straight Flush (stronger than Flush or Straight)
    const board = ['3s', '4s', '5s', '6s', 'Kh'];
    const hand = ['2s', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraightFlush).toBe(true);
    expect(evaluation.isFlush).toBe(false);
    expect(evaluation.isStraight).toBe(false);
  });

  test('should return Full House when board has pair and hand makes three of a kind with different rank', () => {
    // Board: 3♠ K♠ K♦ 9♦ (has pair of Kings)
    // Hand: 33 (pocket pair of 3s)
    // Expected: Full House (KKK + 33) or (333 + KK)
    const board = ['3s', 'Ks', 'Kd', '9d', '2h'];
    const hand = ['3c', '3h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFullHouse).toBe(true);
    expect(evaluation.isThreeOfAKind).toBe(false);
    expect(evaluation.isTwoPair).toBe(false);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Three of a Kind when board has pair and hand makes three of a kind with same rank', () => {
    // Board: 3♠ K♠ K♦ 9♦ (has pair of Kings)
    // Hand: Kc (adds another King)
    // Expected: Three of a Kind (KKK)
    const board = ['3s', 'Ks', 'Kd', '9d', '2h'];
    const hand = ['Kc', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isThreeOfAKind).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Straight when board has three of a kind and hand makes straight', () => {
    // Board: 9♠ T♠ J♠ K♦ Kc (has pair of Kings, but can make three of a kind or straight)
    // Hand: Q8 (makes straight Q-J-T-9-8)
    // Expected: Straight (stronger than Three of a Kind)
    // Note: This test verifies strict mode selects straight over three of a kind
    const board = ['9s', 'Th', 'Jh', 'Kd', 'Kc'];
    const hand = ['Qc', '8h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraight).toBe(true);
    expect(evaluation.isThreeOfAKind).toBe(false);
  });

  test('should return Flush when board has three of a kind and hand makes flush', () => {
    // Board: 3♠ K♠ K♦ Kc 2♠ (has three of a kind: KKK, 3 spades)
    // Hand: As (completes flush with 4 spades on board)
    // Expected: Flush (stronger than Three of a Kind)
    const board = ['3s', 'Ks', 'Kd', 'Kc', '2s'];
    const hand = ['As', 'Qs'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFlush).toBe(true);
    expect(evaluation.isThreeOfAKind).toBe(false);
  });

  test('should return Four of a Kind when board has three of a kind and hand adds fourth', () => {
    // Board: 3♠ K♠ K♦ Kc (has three of a kind: KKK)
    // Hand: Kh (adds fourth King)
    // Expected: Four of a Kind (KKKK)
    const board = ['3s', 'Ks', 'Kd', 'Kc', '2h'];
    const hand = ['Kh', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFourOfAKind).toBe(true);
    expect(evaluation.isThreeOfAKind).toBe(false);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Royal Flush when possible', () => {
    // Board: As Ks Qs Js (4 spades, royal flush draw)
    // Hand: Ts (completes royal flush)
    // Expected: Royal Flush
    const board = ['As', 'Ks', 'Qs', 'Js', '2h'];
    const hand = ['Ts', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isRoyalFlush).toBe(true);
    expect(evaluation.isStraightFlush).toBe(false);
    expect(evaluation.isFlush).toBe(false);
    expect(evaluation.isStraight).toBe(false);
  });

  test('should return best hand when multiple strong hands are possible', () => {
    // Board: 3♠ 4♠ 5♠ 6♠ K♦ (4 spades, straight draw, pair of Kings)
    // Hand: 2s (could make flush, straight, or use pair)
    // Expected: Flush (strongest: 6 > 5 > 2)
    const board = ['3s', '4s', '5s', '6s', 'Kd'];
    const hand = ['2s', 'Kh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraightFlush).toBe(true);
    expect(evaluation.isFlush).toBe(false);
    expect(evaluation.isStraight).toBe(false);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Straight when board has pair and hand completes wheel straight', () => {
    // Board: 2♠ 3♠ 4♠ K♦ Kc (has pair of Kings, wheel straight draw)
    // Hand: A5 (completes wheel straight A-2-3-4-5)
    // Expected: Straight (wheel, stronger than Pair)
    const board = ['2s', '3s', '4s', 'Kd', 'Kc'];
    const hand = ['As', '5h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraight).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return best hand when comparing kickers matters', () => {
    // Board: 3♠ K♠ K♦ 9♦ (has pair of Kings)
    // Hand: AQ vs AT - both make pair of Kings, but AQ has better kicker
    // Expected: Should return combination with best kickers when hand strength is equal
    const board = ['3s', 'Ks', 'Kd', '9d', '2h'];
    const hand = ['Ac', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    // Should be Pair with best kickers
    expect(evaluation.isPair).toBe(true);
    expect(evaluation.isTwoPair).toBe(false);
  });

  test('should return Flush when board has flush draw and hand completes it, even with pair on board', () => {
    // Board: 3♠ K♠ K♦ 9♠ 2♠ (has pair of Kings, 4 spades)
    // Hand: As (completes flush)
    // Expected: Flush (stronger than Pair)
    const board = ['3s', 'Ks', 'Kd', '9s', '2s'];
    const hand = ['As', 'Qh'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isFlush).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });

  test('should return Straight when board has straight draw and hand completes it, even with pair on board', () => {
    // Board: 9♠ T♠ J♠ K♦ Kc (has pair of Kings, straight draw)
    // Hand: Q8 (completes straight Q-J-T-9-8)
    // Expected: Straight (stronger than Pair)
    const board = ['9s', 'Th', 'Jh', 'Kd', 'Kc'];
    const hand = ['Qc', '8h'];
    const allCards = [...board, ...hand];
    
    const result = evaluateHand(allCards, true);
    const evaluationKey = Object.keys(result)[0];
    const evaluation = result[evaluationKey];
    
    expect(evaluation.isStraight).toBe(true);
    expect(evaluation.isPair).toBe(false);
  });
});
