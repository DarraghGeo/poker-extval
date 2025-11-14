/**
 * Performance Benchmarking Suite for HandEvaluator
 * 
 * Benchmarks various operations and hand evaluations to measure performance.
 * Run with: node benchmark.js
 * 
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const { HandEvaluator, evaluateHand } = require('./evaluator');
const { performance } = require('perf_hooks');

// ==================== TEST DATA ====================

const TEST_HANDS = {
  royalFlush: ['As', 'Ks', 'Qs', 'Js', 'Ts'],
  straightFlush: ['9s', '8s', '7s', '6s', '5s'],
  fourOfAKind: ['As', 'Ah', 'Ad', 'Ac', 'Ks'],
  fullHouse: ['As', 'Ah', 'Ad', 'Kc', 'Ks'],
  flush: ['As', 'Ks', 'Qs', 'Js', '9s'],
  straight: ['As', 'Ks', 'Qs', 'Js', 'Th'],
  wheelStraight: ['As', '2s', '3s', '4s', '5s'],
  threeOfAKind: ['As', 'Ah', 'Ad', 'Kc', 'Qs'],
  twoPair: ['As', 'Ah', 'Kd', 'Kc', 'Qs'],
  pair: ['As', 'Ah', 'Kd', 'Qc', 'Js'],
  highCard: ['As', 'Kh', 'Qd', 'Jc', '9s'],
};

const TEST_HANDS_6_CARDS = {
  royalFlush: ['As', 'Ks', 'Qs', 'Js', 'Ts', '9s'],
  straightFlush: ['9s', '8s', '7s', '6s', '5s', '4s'],
  fourOfAKind: ['As', 'Ah', 'Ad', 'Ac', 'Ks', 'Qs'],
  fullHouse: ['As', 'Ah', 'Ad', 'Kc', 'Ks', 'Qs'],
  flush: ['As', 'Ks', 'Qs', 'Js', '9s', '8s'],
  straight: ['As', 'Ks', 'Qs', 'Js', 'Th', '9h'],
  twoPair: ['As', 'Ah', 'Kd', 'Kc', 'Qs', 'Qh'],
  pair: ['As', 'Ah', 'Kd', 'Qc', 'Js', '9h'],
  highCard: ['As', 'Kh', 'Qd', 'Jc', '9s', '8h'],
};

const TEST_HANDS_7_CARDS = {
  royalFlush: ['As', 'Ks', 'Qs', 'Js', 'Ts', '9s', '8s'],
  straightFlush: ['9s', '8s', '7s', '6s', '5s', '4s', '3s'],
  fourOfAKind: ['As', 'Ah', 'Ad', 'Ac', 'Ks', 'Qs', 'Js'],
  fullHouse: ['As', 'Ah', 'Ad', 'Kc', 'Ks', 'Qs', 'Qh'],
  flush: ['As', 'Ks', 'Qs', 'Js', '9s', '8s', '7s'],
  straight: ['As', 'Ks', 'Qs', 'Js', 'Th', '9h', '8h'],
  twoPair: ['As', 'Ah', 'Kd', 'Kc', 'Qs', 'Qh', 'Js'],
  pair: ['As', 'Ah', 'Kd', 'Qc', 'Js', '9h', '8h'],
  highCard: ['As', 'Kh', 'Qd', 'Jc', '9s', '8h', '7h'],
};

// ==================== CARD GENERATION UTILITIES ====================

/**
 * Generates a full deck of 52 cards
 * @returns {string[]} Array of all 52 cards
 */
function generateDeck() {
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const suits = ['s', 'h', 'd', 'c'];
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(rank + suit);
    }
  }
  return deck;
}

/**
 * Generates all combinations of a given size from an array
 * @param {Array} arr - Array to generate combinations from
 * @param {number} size - Size of each combination
 * @returns {Array[]} Array of combinations
 */
function generateCombinations(arr, size) {
  if (size === 0) return [[]];
  if (arr.length < size) return [];
  if (arr.length === size) return [arr];
  
  const combinations = [];
  for (let i = 0; i <= arr.length - size; i++) {
    const head = arr[i];
    const tail = arr.slice(i + 1);
    const tailCombinations = generateCombinations(tail, size - 1);
    for (const combo of tailCombinations) {
      combinations.push([head, ...combo]);
    }
  }
  return combinations;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (mutates original)
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates 1326 unique 7-card hands from a deck using random sampling
 * Ensures diverse hands by shuffling the deck and sampling randomly
 * @returns {string[][]} Array of 1326 unique 7-card hands
 */
function generate1326SevenCardHands() {
  const deck = generateDeck();
  const hands = [];
  const seen = new Set();
  const maxHands = 1326;
  
  // Shuffle deck to ensure randomness
  const shuffledDeck = [...deck];
  shuffleArray(shuffledDeck);
  
  // Generate random combinations until we have 1326 unique hands
  let attempts = 0;
  const maxAttempts = maxHands * 100; // Safety limit to prevent infinite loops
  
  while (hands.length < maxHands && attempts < maxAttempts) {
    attempts++;
    
    // Create a temporary shuffled copy for this attempt
    const tempDeck = [...shuffledDeck];
    shuffleArray(tempDeck);
    
    // Select 7 random cards
    const hand = tempDeck.slice(0, 7);
    const handKey = hand.sort().join(',');
    
    if (!seen.has(handKey)) {
      seen.add(handKey);
      hands.push(hand);
    }
  }
  
  // If we didn't get enough unique hands, fill with systematic combinations
  if (hands.length < maxHands) {
    const remaining = maxHands - hands.length;
    let count = 0;
    
    for (let i = 0; i < deck.length && count < remaining; i++) {
      for (let j = i + 1; j < deck.length && count < remaining; j++) {
        for (let k = j + 1; k < deck.length && count < remaining; k++) {
          for (let l = k + 1; l < deck.length && count < remaining; l++) {
            for (let m = l + 1; m < deck.length && count < remaining; m++) {
              for (let n = m + 1; n < deck.length && count < remaining; n++) {
                for (let o = n + 1; o < deck.length && count < remaining; o++) {
                  const hand = [
                    deck[i], deck[j], deck[k], deck[l], 
                    deck[m], deck[n], deck[o]
                  ];
                  const handKey = hand.sort().join(',');
                  
                  if (!seen.has(handKey)) {
                    seen.add(handKey);
                    hands.push(hand);
                    count++;
                    
                    if (count >= remaining) break;
                  }
                }
                if (count >= remaining) break;
              }
              if (count >= remaining) break;
            }
            if (count >= remaining) break;
          }
          if (count >= remaining) break;
        }
        if (count >= remaining) break;
      }
      if (count >= remaining) break;
    }
  }
  
  return hands;
}

// ==================== BENCHMARK UTILITIES ====================

class Benchmark {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  /**
   * Runs a function multiple times and measures execution time
   * @param {Function} fn - Function to benchmark
   * @param {number} iterations - Number of iterations
   * @returns {Object} Statistics object with min, max, avg, total, and times
   */
  run(fn, iterations = 1000) {
    const times = [];
    
    // Warmup
    for (let i = 0; i < 10; i++) {
      fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }

    const total = times.reduce((a, b) => a + b, 0);
    const avg = total / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

    return {
      name: this.name,
      iterations,
      total: total.toFixed(2),
      avg: avg.toFixed(4),
      min: min.toFixed(4),
      max: max.toFixed(4),
      median: median.toFixed(4),
      opsPerSec: (1000 / avg).toFixed(0),
    };
  }

  /**
   * Formats benchmark results for display
   */
  formatResult(result) {
    return `
${result.name}
  Iterations: ${result.iterations}
  Total time: ${result.total}ms
  Average: ${result.avg}ms
  Min: ${result.min}ms
  Max: ${result.max}ms
  Median: ${result.median}ms
  Operations/sec: ${result.opsPerSec}`;
  }
}

// ==================== BENCHMARK SUITES ====================

/**
 * Benchmarks full hand evaluation for different hand types
 */
function benchmarkHandTypes() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Full Hand Evaluation by Hand Type (5 cards)');
  console.log('='.repeat(60));

  const benchmark = new Benchmark('Hand Type Evaluation');
  const results = [];

  for (const [handType, cards] of Object.entries(TEST_HANDS)) {
    const result = benchmark.run(() => {
      evaluateHand(cards);
    }, 1000);
    result.handType = handType;
    results.push(result);
    console.log(`${handType.padEnd(20)}: ${result.avg}ms avg, ${result.opsPerSec} ops/sec`);
  }

  return results;
}

/**
 * Benchmarks evaluation performance for different card counts
 */
function benchmarkCardCounts() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Evaluation Performance by Card Count');
  console.log('='.repeat(60));

  const results = [];
  const testSets = [
    { name: '5 cards', hands: TEST_HANDS },
    { name: '6 cards', hands: TEST_HANDS_6_CARDS },
    { name: '7 cards', hands: TEST_HANDS_7_CARDS },
  ];

  for (const testSet of testSets) {
    const benchmark = new Benchmark(`Evaluation (${testSet.name})`);
    let totalTime = 0;
    let totalOps = 0;

    for (const [handType, cards] of Object.entries(testSet.hands)) {
      const result = benchmark.run(() => {
        evaluateHand(cards);
      }, 500);
      totalTime += parseFloat(result.total);
      totalOps += parseInt(result.opsPerSec);
    }

    const avgTime = (totalTime / Object.keys(testSet.hands).length).toFixed(2);
    const avgOps = Math.round(totalOps / Object.keys(testSet.hands).length);
    const combinations = testSet.name === '5 cards' ? 1 : 
                         testSet.name === '6 cards' ? 6 : 21;

    console.log(`${testSet.name.padEnd(15)}: ${avgTime}ms avg, ${avgOps} ops/sec, ${combinations} combinations`);
    results.push({ name: testSet.name, avgTime, avgOps, combinations });
  }

  return results;
}

/**
 * Benchmarks individual evaluation methods (via public API)
 * Note: Methods are private, so we benchmark through evaluation property access
 */
function benchmarkIndividualMethods() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Individual Property Access Performance');
  console.log('='.repeat(60));
  console.log('Note: Methods are private, benchmarking property access instead');

  const testHands = [
    { name: 'Royal Flush', cards: TEST_HANDS.royalFlush, property: 'isRoyalFlush' },
    { name: 'Straight Flush', cards: TEST_HANDS.straightFlush, property: 'isStraightFlush' },
    { name: 'Four of a Kind', cards: TEST_HANDS.fourOfAKind, property: 'isFourOfAKind' },
    { name: 'Full House', cards: TEST_HANDS.fullHouse, property: 'isFullHouse' },
    { name: 'Flush', cards: TEST_HANDS.flush, property: 'isFlush' },
    { name: 'Straight', cards: TEST_HANDS.straight, property: 'isStraight' },
    { name: 'Three of a Kind', cards: TEST_HANDS.threeOfAKind, property: 'isThreeOfAKind' },
    { name: 'Two Pair', cards: TEST_HANDS.twoPair, property: 'isTwoPair' },
    { name: 'Pair', cards: TEST_HANDS.pair, property: 'isPair' },
    { name: 'High Card', cards: TEST_HANDS.highCard, property: 'isHighCard' },
  ];

  const results = [];
  for (const testHand of testHands) {
    const benchmark = new Benchmark(`Property: ${testHand.property}`);
    const result = benchmark.run(() => {
      const evaluation = evaluateHand(testHand.cards);
      const evaluationKey = Object.keys(evaluation)[0];
      return evaluation[evaluationKey][testHand.property];
    }, 5000);
    result.property = testHand.property;
    results.push(result);
    console.log(`${testHand.property.padEnd(30)}: ${result.avg}ms avg, ${result.opsPerSec} ops/sec`);
  }

  return results;
}

/**
 * Benchmarks utility method performance (via public API)
 * Note: Methods are private, so we benchmark through evaluation results
 */
function benchmarkUtilityMethods() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Utility Method Performance (via Evaluation)');
  console.log('='.repeat(60));
  console.log('Note: Methods are private, benchmarking through evaluation results');

  const results = [];

  // Benchmark evaluation that uses sorting internally
  const sortBenchmark = new Benchmark('Evaluation (uses sort internally)');
  const sortResult = sortBenchmark.run(() => {
    evaluateHand(['2s', 'As', 'Ks', '5s', 'Ts']); // Requires sorting
  }, 10000);
  results.push(sortResult);
  console.log(`${'Evaluation with sorting'.padEnd(30)}: ${sortResult.avg}ms avg, ${sortResult.opsPerSec} ops/sec`);

  // Benchmark evaluation that uses distance calculation
  const distanceBenchmark = new Benchmark('Evaluation (uses distance)');
  const distanceResult = distanceBenchmark.run(() => {
    evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts']); // Straight uses distance
  }, 10000);
  results.push(distanceResult);
  console.log(`${'Evaluation with distance'.padEnd(30)}: ${distanceResult.avg}ms avg, ${distanceResult.opsPerSec} ops/sec`);

  // Benchmark evaluation that uses suit counting
  const suitsBenchmark = new Benchmark('Evaluation (uses suit counting)');
  const suitsResult = suitsBenchmark.run(() => {
    evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s']); // Flush uses suit counting
  }, 10000);
  results.push(suitsResult);
  console.log(`${'Evaluation with suit counting'.padEnd(30)}: ${suitsResult.avg}ms avg, ${suitsResult.opsPerSec} ops/sec`);

  // Benchmark evaluation that uses rank counting
  const ranksBenchmark = new Benchmark('Evaluation (uses rank counting)');
  const ranksResult = ranksBenchmark.run(() => {
    evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']); // Four of a kind uses rank counting
  }, 10000);
  results.push(ranksResult);
  console.log(`${'Evaluation with rank counting'.padEnd(30)}: ${ranksResult.avg}ms avg, ${ranksResult.opsPerSec} ops/sec`);

  return results;
}

/**
 * Benchmarks combination generation performance
 */
function benchmarkCombinationGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Combination Generation Performance');
  console.log('='.repeat(60));

  const evaluator = new HandEvaluator(TEST_HANDS_6_CARDS.royalFlush);
  const results = [];

  // Test with different card counts
  const testCases = [
    { name: '5 cards → 1 combination', cards: TEST_HANDS.royalFlush, expected: 1 },
    { name: '6 cards → 6 combinations', cards: TEST_HANDS_6_CARDS.royalFlush, expected: 6 },
    { name: '7 cards → 21 combinations', cards: TEST_HANDS_7_CARDS.royalFlush, expected: 21 },
  ];

  for (const testCase of testCases) {
    const benchmark = new Benchmark(`Combinations (${testCase.name})`);
    const result = benchmark.run(() => {
      const evaluator = new HandEvaluator(testCase.cards);
      Object.keys(evaluator.evaluation).length; // Force evaluation
    }, 500);
    result.expectedCombinations = testCase.expected;
    results.push(result);
    console.log(`${testCase.name.padEnd(35)}: ${result.avg}ms avg, ${result.opsPerSec} ops/sec`);
  }

  return results;
}

/**
 * Benchmarks constructor vs evaluateHand function
 */
function benchmarkConstructorVsFunction() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Constructor vs evaluateHand Function');
  console.log('='.repeat(60));

  const cards = TEST_HANDS.royalFlush;
  const results = [];

  // Constructor approach
  const constructorBenchmark = new Benchmark('new HandEvaluator()');
  const constructorResult = constructorBenchmark.run(() => {
    const evaluator = new HandEvaluator(cards);
    return evaluator.evaluation;
  }, 1000);
  results.push(constructorResult);
  console.log(`${'new HandEvaluator()'.padEnd(30)}: ${constructorResult.avg}ms avg, ${constructorResult.opsPerSec} ops/sec`);

  // Function approach
  const functionBenchmark = new Benchmark('evaluateHand()');
  const functionResult = functionBenchmark.run(() => {
    return evaluateHand(cards);
  }, 1000);
  results.push(functionResult);
  console.log(`${'evaluateHand()'.padEnd(30)}: ${functionResult.avg}ms avg, ${functionResult.opsPerSec} ops/sec`);

  return results;
}

/**
 * Benchmarks worst-case scenario (many combinations)
 */
function benchmarkWorstCase() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Worst-Case Performance (7 cards = 21 combinations)');
  console.log('='.repeat(60));

  const cards = TEST_HANDS_7_CARDS.royalFlush;
  const benchmark = new Benchmark('7-card evaluation');
  
  const result = benchmark.run(() => {
    evaluateHand(cards);
  }, 100);

  console.log(`Average time: ${result.avg}ms`);
  console.log(`Operations/sec: ${result.opsPerSec}`);
  console.log(`Total combinations evaluated: 21 per operation`);
  console.log(`Time per combination: ${(parseFloat(result.avg) / 21).toFixed(4)}ms`);

  return result;
}

/**
 * Benchmarks strict mode vs non-strict mode performance
 */
function benchmarkStrictMode() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Strict Mode vs Non-Strict Mode Performance');
  console.log('='.repeat(60));

  const testHands = [
    { name: 'Two Pair', cards: TEST_HANDS.twoPair },
    { name: 'Pair with Flush Draw', cards: ['As', 'Ah', 'Ks', 'Qs', 'Js'] },
    { name: 'Made Flush', cards: TEST_HANDS.flush },
    { name: 'Full House', cards: TEST_HANDS.fullHouse },
    { name: 'High Card with Draws', cards: ['As', 'Kh', 'Qd', 'Jc', '9s'] },
  ];

  const results = [];

  for (const testHand of testHands) {
    // Strict mode
    const strictBenchmark = new Benchmark(`Strict Mode (${testHand.name})`);
    const strictResult = strictBenchmark.run(() => {
      evaluateHand(testHand.cards, true);
    }, 1000);
    strictResult.mode = 'strict';
    strictResult.handType = testHand.name;
    results.push(strictResult);

    // Non-strict mode
    const nonStrictBenchmark = new Benchmark(`Non-Strict Mode (${testHand.name})`);
    const nonStrictResult = nonStrictBenchmark.run(() => {
      evaluateHand(testHand.cards, false);
    }, 1000);
    nonStrictResult.mode = 'non-strict';
    nonStrictResult.handType = testHand.name;
    results.push(nonStrictResult);

    const overhead = ((parseFloat(strictResult.avg) - parseFloat(nonStrictResult.avg)) / parseFloat(nonStrictResult.avg) * 100).toFixed(2);
    console.log(`${testHand.name.padEnd(25)}: Strict ${strictResult.avg}ms, Non-Strict ${nonStrictResult.avg}ms, Overhead: ${overhead}%`);
  }

  return results;
}

/**
 * Benchmarks keyCards and kickerCards generation performance
 */
function benchmarkKeyCardsAndKickerCards() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: KeyCards and KickerCards Generation Performance');
  console.log('='.repeat(60));

  const testHands = [
    { name: 'Royal Flush', cards: TEST_HANDS.royalFlush },
    { name: 'Four of a Kind', cards: TEST_HANDS.fourOfAKind },
    { name: 'Full House', cards: TEST_HANDS.fullHouse },
    { name: 'Flush', cards: TEST_HANDS.flush },
    { name: 'Straight', cards: TEST_HANDS.straight },
    { name: 'Three of a Kind', cards: TEST_HANDS.threeOfAKind },
    { name: 'Two Pair', cards: TEST_HANDS.twoPair },
    { name: 'Pair', cards: TEST_HANDS.pair },
    { name: 'High Card', cards: TEST_HANDS.highCard },
    { name: 'Flush Draw', cards: ['As', 'Ks', 'Qs', 'Js', '9h'] },
    { name: 'Straight Draw', cards: ['As', 'Kh', 'Qd', 'Jc', '9s'] },
  ];

  const results = [];

  for (const testHand of testHands) {
    const benchmark = new Benchmark(`KeyCards/KickerCards (${testHand.name})`);
    const result = benchmark.run(() => {
      const evaluation = evaluateHand(testHand.cards);
      const evaluationKey = Object.keys(evaluation)[0];
      const evalObj = evaluation[evaluationKey];
      // Access keyCards and kickerCards to ensure they're generated
      const keyCards = evalObj.keyCards;
      const kickerCards = evalObj.kickerCards;
      // Count total entries
      const keyCardsCount = Object.values(keyCards).reduce((sum, arr) => sum + arr.length, 0);
      const kickerCardsCount = Object.values(kickerCards).reduce((sum, arr) => sum + arr.length, 0);
      return { keyCardsCount, kickerCardsCount };
    }, 1000);
    result.handType = testHand.name;
    results.push(result);
    console.log(`${testHand.name.padEnd(25)}: ${result.avg}ms avg, ${result.opsPerSec} ops/sec`);
  }

  // Benchmark accessing keyCards/kickerCards for specific hand types
  console.log('\n' + '-'.repeat(60));
  console.log('Accessing Specific KeyCards/KickerCards Properties:');
  console.log('-'.repeat(60));

  const accessBenchmark = new Benchmark('Access keyCards/kickerCards properties');
  const accessResult = accessBenchmark.run(() => {
    const evaluation = evaluateHand(TEST_HANDS.twoPair);
    const evaluationKey = Object.keys(evaluation)[0];
    const evalObj = evaluation[evaluationKey];
    // Access multiple specific properties
    const pairKeyCards = evalObj.keyCards.isPair;
    const pairKickerCards = evalObj.kickerCards.isPair;
    const twoPairKeyCards = evalObj.keyCards.isTwoPair;
    const twoPairKickerCards = evalObj.kickerCards.isTwoPair;
    return { pairKeyCards, pairKickerCards, twoPairKeyCards, twoPairKickerCards };
  }, 5000);
  results.push(accessResult);
  console.log(`Property access: ${accessResult.avg}ms avg, ${accessResult.opsPerSec} ops/sec`);

  return results;
}

/**
 * Benchmarks 1326 unique 7-card hands (complete scenario)
 * Each 7-card hand generates 21 combinations, totaling 27,846 evaluations
 */
function benchmark1326SevenCardHands() {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK: Complete Scenario - 1326 x 7-Card Hands');
  console.log('='.repeat(60));
  console.log('Generating 1326 unique 7-card hands...');
  
  const generationStart = performance.now();
  const hands = generate1326SevenCardHands();
  const generationEnd = performance.now();
  const generationTime = ((generationEnd - generationStart) / 1000).toFixed(2);
  
  console.log(`Generated ${hands.length} unique 7-card hands in ${generationTime}s`);
  console.log(`Each hand generates 21 combinations (C(7,5) = 21)`);
  console.log(`Total 5-card combinations to evaluate: ${hands.length * 21}`);
  console.log('\nEvaluating all hands...');
  
  const benchmark = new Benchmark('1326 x 7-card hands');
  const startTime = performance.now();
  
  // Track hand type counts
  const handTypeCounts = {
    // Made hands
    isFourOfAKind: 0,
    isFullHouse: 0,
    isThreeOfAKind: 0,
    isTwoPair: 0,
    isPair: 0,
    isFlush: 0,
    isStraight: 0,
    isRoyalFlush: 0,
    isStraightFlush: 0,
    isHighCard: 0,
    // Pair categorization
    isTopPair: 0,
    isMiddlePair: 0,
    isBottomPair: 0,
    // Two pair categorization
    isTopAndMiddlePair: 0,
    isTopAndBottomPair: 0,
    isMiddleAndBottomPair: 0,
    // Three of a kind categorization
    isTopThreeOfAKind: 0,
    isMiddleThreeOfAKind: 0,
    isBottomThreeOfAKind: 0,
    // Draws
    isFlushDraw: 0,
    isBackdoorFlushDraw: 0,
    isOpenEndedStraightDraw: 0,
    isInsideStraightDraw: 0,
  };
  
  let totalCombinations = 0;
  let evaluatedHands = 0;
  
  for (const hand of hands) {
    const result = evaluateHand(hand);
    totalCombinations += Object.keys(result).length;
    evaluatedHands++;
    
    // Count hand types across all combinations
    for (const evaluation of Object.values(result)) {
      for (const [key, value] of Object.entries(evaluation)) {
        if (handTypeCounts.hasOwnProperty(key) && value === true) {
          handTypeCounts[key]++;
        }
      }
    }
  }
  
  const endTime = performance.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  const avgTimePerHand = ((endTime - startTime) / hands.length).toFixed(4);
  const avgTimePerCombination = ((endTime - startTime) / totalCombinations).toFixed(4);
  const handsPerSec = (hands.length / ((endTime - startTime) / 1000)).toFixed(0);
  const combinationsPerSec = (totalCombinations / ((endTime - startTime) / 1000)).toFixed(0);
  
  console.log('\n' + '-'.repeat(60));
  console.log('PERFORMANCE RESULTS:');
  console.log('-'.repeat(60));
  console.log(`Total 7-card hands evaluated: ${evaluatedHands}`);
  console.log(`Total 5-card combinations evaluated: ${totalCombinations}`);
  console.log(`Total evaluation time: ${totalTime}s`);
  console.log(`Average time per 7-card hand: ${avgTimePerHand}ms`);
  console.log(`Average time per 5-card combination: ${avgTimePerCombination}ms`);
  console.log(`7-card hands per second: ${handsPerSec}`);
  console.log(`5-card combinations per second: ${combinationsPerSec}`);
  console.log(`Expected combinations per hand: 21`);
  console.log(`Actual combinations per hand: ${(totalCombinations / evaluatedHands).toFixed(2)}`);
  
  // Calculate and display hand type breakdown
  console.log('\n' + '='.repeat(60));
  console.log('HAND TYPE BREAKDOWN:');
  console.log('='.repeat(60));
  
  const categories = {
    'MADE HANDS': [
      'isRoyalFlush',
      'isStraightFlush',
      'isFourOfAKind',
      'isFullHouse',
      'isFlush',
      'isStraight',
      'isThreeOfAKind',
      'isTwoPair',
      'isPair',
      'isHighCard',
    ],
    'PAIR CATEGORIZATION': [
      'isTopPair',
      'isMiddlePair',
      'isBottomPair',
    ],
    'TWO PAIR CATEGORIZATION': [
      'isTopAndMiddlePair',
      'isTopAndBottomPair',
      'isMiddleAndBottomPair',
    ],
    'THREE OF A KIND CATEGORIZATION': [
      'isTopThreeOfAKind',
      'isMiddleThreeOfAKind',
      'isBottomThreeOfAKind',
    ],
    'DRAWS': [
      'isFlushDraw',
      'isBackdoorFlushDraw',
      'isOpenEndedStraightDraw',
      'isInsideStraightDraw',
    ],
  };
  
  for (const [category, types] of Object.entries(categories)) {
    console.log(`\n${category}:`);
    console.log('-'.repeat(60));
    
    for (const type of types) {
      const count = handTypeCounts[type] || 0;
      const percentage = ((count / totalCombinations) * 100).toFixed(2);
      const barLength = Math.round((count / totalCombinations) * 50);
      const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
      
      const displayName = type.replace('is', '').replace(/([A-Z])/g, ' $1').trim();
      console.log(`${displayName.padEnd(35)}: ${count.toString().padStart(6)} (${percentage.padStart(6)}%) ${bar}`);
    }
  }
  
  // Summary statistics
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY STATISTICS:');
  console.log('='.repeat(60));
  
  const madeHandsTotal = categories['MADE HANDS'].reduce((sum, type) => sum + (handTypeCounts[type] || 0), 0);
  const pairCategorizationTotal = categories['PAIR CATEGORIZATION'].reduce((sum, type) => sum + (handTypeCounts[type] || 0), 0);
  const twoPairCategorizationTotal = categories['TWO PAIR CATEGORIZATION'].reduce((sum, type) => sum + (handTypeCounts[type] || 0), 0);
  const threeOfAKindCategorizationTotal = categories['THREE OF A KIND CATEGORIZATION'].reduce((sum, type) => sum + (handTypeCounts[type] || 0), 0);
  const drawsTotal = categories['DRAWS'].reduce((sum, type) => sum + (handTypeCounts[type] || 0), 0);
  
  console.log(`Total made hands: ${madeHandsTotal} (${((madeHandsTotal / totalCombinations) * 100).toFixed(2)}%)`);
  console.log(`Total pair categorizations: ${pairCategorizationTotal} (${((pairCategorizationTotal / totalCombinations) * 100).toFixed(2)}%)`);
  console.log(`Total two pair categorizations: ${twoPairCategorizationTotal} (${((twoPairCategorizationTotal / totalCombinations) * 100).toFixed(2)}%)`);
  console.log(`Total three of a kind categorizations: ${threeOfAKindCategorizationTotal} (${((threeOfAKindCategorizationTotal / totalCombinations) * 100).toFixed(2)}%)`);
  console.log(`Total draws: ${drawsTotal} (${((drawsTotal / totalCombinations) * 100).toFixed(2)}%)`);
  
  return {
    handsEvaluated: evaluatedHands,
    totalCombinations,
    totalTime: parseFloat(totalTime),
    avgTimePerHand: parseFloat(avgTimePerHand),
    avgTimePerCombination: parseFloat(avgTimePerCombination),
    handsPerSec: parseFloat(handsPerSec),
    combinationsPerSec: parseFloat(combinationsPerSec),
    handTypeCounts,
    handTypePercentages: Object.fromEntries(
      Object.entries(handTypeCounts).map(([key, value]) => [
        key,
        ((value / totalCombinations) * 100).toFixed(2)
      ])
    ),
  };
}

// ==================== MAIN EXECUTION ====================

function runAllBenchmarks() {
  console.log('\n' + '█'.repeat(60));
  console.log('  HAND EVALUATOR PERFORMANCE BENCHMARK SUITE');
  console.log('█'.repeat(60));
  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);

  const startTime = performance.now();

  const results = {
    handTypes: benchmarkHandTypes(),
    cardCounts: benchmarkCardCounts(),
    individualMethods: benchmarkIndividualMethods(),
    utilityMethods: benchmarkUtilityMethods(),
    combinationGeneration: benchmarkCombinationGeneration(),
    constructorVsFunction: benchmarkConstructorVsFunction(),
    worstCase: benchmarkWorstCase(),
    strictMode: benchmarkStrictMode(),
    keyCardsAndKickerCards: benchmarkKeyCardsAndKickerCards(),
    completeScenario: benchmark1326SevenCardHands(),
  };

  const endTime = performance.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total benchmark time: ${totalTime}s`);
  console.log('\nBenchmark complete!');

  return results;
}

// Run benchmarks if executed directly
if (require.main === module) {
  runAllBenchmarks();
}

module.exports = {
  Benchmark,
  runAllBenchmarks,
  benchmarkHandTypes,
  benchmarkCardCounts,
  benchmarkIndividualMethods,
  benchmarkUtilityMethods,
  benchmarkCombinationGeneration,
  benchmarkConstructorVsFunction,
  benchmarkWorstCase,
  benchmarkStrictMode,
  benchmarkKeyCardsAndKickerCards,
  benchmark1326SevenCardHands,
  generate1326SevenCardHands,
  generateDeck,
  generateCombinations,
  shuffleArray,
};

