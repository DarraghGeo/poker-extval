# Poker Hand Evaluator

A comprehensive poker hand evaluation library for Node.js that evaluates poker hands from 5 or more cards and identifies all possible made hands and draws. The library generates all possible 5-card combinations from the input cards and evaluates each combination, providing detailed categorization of hand types.

## Features

- **Comprehensive Hand Evaluation**: Evaluates all standard poker hand types (Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, Pair, High Card)
- **Detailed Categorization**: Categorizes pairs (Top, Middle, Bottom), two pairs, and three of a kind by position
- **Draw Detection**: Identifies flush draws, backdoor flush draws, open-ended straight draws, and inside straight draws
- **Wheel Straight Support**: Handles Ace-low straights (A-2-3-4-5) correctly
- **Multiple Card Support**: Accepts 5 or more cards and evaluates all possible 5-card combinations
- **Extensive Documentation**: Full JSDoc comments for all methods

## Installation

```bash
npm install poker-extval
```

## Usage

### Basic Usage

```javascript
const { evaluateHand } = require('poker-extval');

// Evaluate a 5-card hand
const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);
console.log(result);
// {
//   "As, Ks, Qs, Js, Ts": {
//     "isRoyalFlush": true,
//     "isStraightFlush": false,
//     "isFlush": true,
//     "isStraight": true,
//     ...
//   }
// }
```

### Using the HandEvaluator Class

```javascript
const { HandEvaluator } = require('poker-extval');

// Create an evaluator instance
const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s']);

// Access evaluation results
const evaluation = evaluator.evaluation;
// Object with keys for each 5-card combination
```

### Evaluating Multiple Card Hands

When you provide more than 5 cards, the evaluator generates all possible 5-card combinations:

```javascript
// 6 cards = 6 combinations (C(6,5) = 6)
const result6 = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s']);
console.log(Object.keys(result6).length); // 6

// 7 cards = 21 combinations (C(7,5) = 21)
const result7 = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s', '8s']);
console.log(Object.keys(result7).length); // 21
```

## Card Format

Cards must be strings in the format `"Rs"` where:
- **R** is the rank: `A`, `K`, `Q`, `J`, `T`, `9`, `8`, `7`, `6`, `5`, `4`, `3`, `2`
- **s** is the suit: `s` (spades), `h` (hearts), `d` (diamonds), `c` (clubs)

**Note**: The ten card is represented as `T`, not `10`.

Examples:
- `"As"` = Ace of Spades
- `"Kh"` = King of Hearts
- `"Td"` = Ten of Diamonds
- `"2c"` = Two of Clubs

## Response Object Format

The `evaluateHand()` function returns an object where:

- **Keys**: Sorted hand strings in comma-space separated format (e.g., `"As, Ks, Qs, Js, Ts"`)
- **Values**: Evaluation objects containing boolean properties for all hand types

### Evaluation Object Properties

#### Made Hands
- `isRoyalFlush` - A-K-Q-J-T all same suit
- `isStraightFlush` - Five consecutive ranks, all same suit (not royal)
- `isFourOfAKind` - Four cards of the same rank
- `isFullHouse` - Three of one rank, two of another
- `isFlush` - All five cards same suit
- `isStraight` - Five consecutive ranks (includes wheel: A-2-3-4-5)
- `isThreeOfAKind` - Three cards of the same rank
- `isTwoPair` - Two pairs of different ranks
- `isPair` - Exactly one pair
- `isHighCard` - No made hand

#### Pair Categorization (only true if `isPair` is true)
- `isTopPair` - Pair is the highest card
- `isMiddlePair` - Pair is neither highest nor lowest
- `isBottomPair` - Pair is the lowest card

#### Two Pair Categorization (only true if `isTwoPair` is true)
- `isTopAndMiddlePair` - Both pairs are in top two ranks
- `isTopAndBottomPair` - One pair is highest, other is lowest
- `isMiddleAndBottomPair` - Both pairs are in middle and bottom ranks

#### Three of a Kind Categorization (only true if `isThreeOfAKind` is true)
- `isTopThreeOfAKind` - Three of a kind is the highest rank
- `isMiddleThreeOfAKind` - Three of a kind is neither highest nor lowest
- `isBottomThreeOfAKind` - Three of a kind is the lowest rank

#### Draws
- `isFlushDraw` - Four cards of the same suit (one away from flush)
- `isBackdoorFlushDraw` - Three cards of the same suit (two away from flush)
- `isOpenEndedStraightDraw` - One card away from straight on either end
- `isInsideStraightDraw` - One card away from straight (needed card in middle)
- `isStraightDraw` - Any type of straight draw (open-ended or inside, standard or wheel)

#### Wheel Straight Support
- `isStraightWheel` - Wheel straight (A-2-3-4-5)
- `isOpenEndedStraightDrawWheel` - Open-ended draw using wheel ranking
- `isInsideStraightDrawWheel` - Inside draw using wheel ranking

#### Card Arrays
- `keyCards` - Object with keys for each hand type/draw, values are arrays of cards (sorted) that constitute that specific hand type or draw. False hand types have empty arrays `[]`.
- `kickerCards` - Object with keys for each hand type/draw, values are arrays of cards (sorted) that don't constitute that specific hand type or draw. False hand types have empty arrays `[]`, except `isHighCard` which contains all 5 cards when true.

**Note**: Each hand type has its own `keyCards` and `kickerCards` entries. For example, a hand with both a pair and a flush draw will have separate entries in `keyCards.isPair`, `keyCards.isFlushDraw`, `kickerCards.isPair`, and `kickerCards.isFlushDraw`.

### Example Response

```javascript
{
  "As, Ks, Qs, Js, Ts": {
    "isFourOfAKind": false,
    "isFullHouse": false,
    "isThreeOfAKind": false,
    "isTwoPair": false,
    "isPair": false,
    "isFlush": true,
    "isStraight": true,
    "isRoyalFlush": true,
    "isStraightFlush": true,
    "isTopPair": false,
    "isMiddlePair": false,
    "isBottomPair": false,
    "isTopAndMiddlePair": false,
    "isTopAndBottomPair": false,
    "isMiddleAndBottomPair": false,
    "isTopThreeOfAKind": false,
    "isMiddleThreeOfAKind": false,
    "isBottomThreeOfAKind": false,
    "isFlushDraw": false,
    "isBackdoorFlushDraw": false,
    "isOpenEndedStraightDraw": false,
    "isInsideStraightDraw": false,
    "isStraightDraw": false,
    "isHighCard": false,
    "keyCards": {
      "isRoyalFlush": ["As", "Ks", "Qs", "Js", "Ts"],
      "isStraightFlush": [],
      "isFourOfAKind": [],
      "isFullHouse": [],
      "isFlush": ["As", "Ks", "Qs", "Js", "Ts"],
      "isStraight": ["As", "Ks", "Qs", "Js", "Ts"],
      "isThreeOfAKind": [],
      "isTwoPair": [],
      "isPair": [],
      "isTopPair": [],
      "isMiddlePair": [],
      "isBottomPair": [],
      "isTopAndMiddlePair": [],
      "isTopAndBottomPair": [],
      "isMiddleAndBottomPair": [],
      "isTopThreeOfAKind": [],
      "isMiddleThreeOfAKind": [],
      "isBottomThreeOfAKind": [],
      "isFlushDraw": [],
      "isBackdoorFlushDraw": [],
      "isOpenEndedStraightDraw": [],
      "isInsideStraightDraw": [],
      "isStraightDraw": [],
      "isStraightWheel": [],
      "isOpenEndedStraightDrawWheel": [],
      "isInsideStraightDrawWheel": [],
      "isHighCard": []
    },
    "kickerCards": {
      "isRoyalFlush": [],
      "isStraightFlush": [],
      "isFourOfAKind": [],
      "isFullHouse": [],
      "isFlush": [],
      "isStraight": [],
      "isThreeOfAKind": [],
      "isTwoPair": [],
      "isPair": [],
      "isTopPair": [],
      "isMiddlePair": [],
      "isBottomPair": [],
      "isTopAndMiddlePair": [],
      "isTopAndBottomPair": [],
      "isMiddleAndBottomPair": [],
      "isTopThreeOfAKind": [],
      "isMiddleThreeOfAKind": [],
      "isBottomThreeOfAKind": [],
      "isFlushDraw": [],
      "isBackdoorFlushDraw": [],
      "isOpenEndedStraightDraw": [],
      "isInsideStraightDraw": [],
      "isStraightDraw": [],
      "isStraightWheel": [],
      "isOpenEndedStraightDrawWheel": [],
      "isInsideStraightDrawWheel": [],
      "isHighCard": []
    }
  }
}
```

**Example 2: Pair with Flush Draw**

```javascript
{
  "As, Ah, Ks, Qs, Js": {
    "isPair": true,
    "isFlushDraw": true,
    // ... other boolean properties ...
    "keyCards": {
      "isPair": ["As", "Ah"],
      "isFlushDraw": ["As", "Ks", "Qs", "Js"],
      // ... other hand types with empty arrays ...
    },
    "kickerCards": {
      "isPair": ["Ks", "Qs", "Js"],
      "isFlushDraw": ["Ah"],
      // ... other hand types with empty arrays ...
    }
  }
}
```

## Performance Benchmarks

This library prioritizes **extensiveness and accuracy over raw speed**. The evaluation system is designed to provide comprehensive analysis of all possible hand combinations, which means:

- **5-card hands**: Evaluated directly (~80,000 ops/sec)
- **6-card hands**: Generates 6 combinations (~11,000 ops/sec)
- **7-card hands**: Generates 21 combinations (~3,000 ops/sec)

### Running Benchmarks

```bash
npm run benchmark
```

The benchmark suite includes:
- Hand type evaluation performance
- Card count comparisons (5, 6, 7 cards)
- Individual method performance
- Utility method performance
- Combination generation performance
- Complete scenario: 1326 x 7-card hands (27,846 total combinations)

### Benchmark Results Summary

Typical performance on modern hardware:

```
5-card evaluation:     ~0.01-0.02ms per hand
6-card evaluation:     ~0.10-0.15ms per hand (6 combinations)
7-card evaluation:     ~0.30-0.50ms per hand (21 combinations)
```

**Note**: Performance may vary based on:
- Hardware specifications
- Node.js version
- System load
- Hand complexity (some hand types require more computation)

The library is optimized for correctness and comprehensive evaluation rather than maximum speed. For applications requiring extremely high throughput, consider caching strategies or specialized optimizations.

## Error Handling

The evaluator validates input and throws descriptive errors for:

- Non-array input
- Fewer than 5 cards
- Invalid card format
- Invalid rank (not A, K, Q, J, T, 9-2)
- Invalid suit (not s, h, d, c)
- Duplicate cards

Example:
```javascript
try {
  evaluateHand(['As', 'Ks', 'Qs', 'Js']); // Only 4 cards
} catch (error) {
  console.error(error.message); // "Expected at least 5 cards, received 4"
}
```

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes 572+ tests covering:
- All hand types
- Edge cases
- Invalid input handling
- Wheel straights
- Draw detection
- Categorization logic

## API Reference

### `evaluateHand(cards)`

Main function to evaluate poker hands.

**Parameters:**
- `cards` (string[]): Array of 5 or more card strings

**Returns:**
- Object mapping sorted hand strings to evaluation objects

**Throws:**
- Error if input is invalid

### `HandEvaluator` Class

#### Constructor

```javascript
new HandEvaluator(cards)
```

Creates a new HandEvaluator instance.

**Parameters:**
- `cards` (string[]): Array of 5 or more card strings

**Properties:**
- `evaluation` - Object mapping sorted hand strings to evaluation objects (same format as `evaluateHand()` return value)
- `cards` - Array of input cards

**Note**: All internal methods are private. Use the `evaluation` property to access evaluation results.

## License

MIT License

Copyright (c) 2025 Darragh Geoghegan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

Contributions are welcome! Please ensure all tests pass and add tests for new features.

