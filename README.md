# Poker Hand Evaluator

A comprehensive poker hand evaluation library for Node.js that evaluates poker hands from 5 or more cards and identifies all possible made hands and draws. The library generates all possible 5-card combinations from the input cards and evaluates each combination, providing detailed categorization of hand types.

## Features

- **Comprehensive Hand Evaluation**: Evaluates all standard poker hand types (Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, Pair, High Card)
- **Strict Mode (Default)**: Only marks the strongest made hand and stronger draws, preventing weaker hands from being marked when stronger ones exist
- **Detailed Categorization**: Categorizes pairs (Top, Middle, Bottom), two pairs, and three of a kind by position
- **Overcard Categorization**: With hole cards supplied, classifies them against the board (two overcards, overcard and middle card, overcard and undercard, two middle cards, middle and undercard, two undercards)
- **Draw Detection**: Identifies flush draws, backdoor flush draws, open-ended straight draws, and inside straight draws
- **Key Cards and Kicker Cards**: Provides detailed card arrays showing which cards form each hand type and which are kickers
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

// Evaluate a 5-card hand (strict mode enabled by default)
const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);
console.log(result);
// {
//   "As, Ks, Qs, Js, Ts": {
//     "isRoyalFlush": true,
//     "isStraightFlush": false,
//     "isFlush": false,  // Filtered out in strict mode (royal flush is stronger)
//     "isStraight": false,  // Filtered out in strict mode (royal flush is stronger)
//     ...
//   }
// }
```

### Using the HandEvaluator Class

```javascript
const { HandEvaluator } = require('poker-extval');

// Create an evaluator instance (strict mode enabled by default)
const evaluator = new HandEvaluator(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s']);

// Access evaluation results
const evaluation = evaluator.evaluation;
// Object with keys for each 5-card combination

// Non-strict mode (all applicable hands marked)
const nonStrictEvaluator = new HandEvaluator(['As', 'Ah', 'Kd', 'Kc', 'Qs'], false);
```

### Overcards

The overcard categorizations describe your **hole cards** relative to the **board**, so the evaluator needs to know which two of the cards are yours. Pass them as the third argument:

```javascript
const { evaluateHand } = require('poker-extval');

const board = ['Ks', 'Qh', '8d', '3c'];
const holeCards = ['Ad', 'Jh'];

const result = evaluateHand([...board, ...holeCards], true, holeCards);
const evaluation = result[Object.keys(result)[0]];

evaluation.isOvercard;                // true  (the ace beats every board card)
evaluation.isOvercardAndMiddleCard;   // true  (ace is an overcard, jack sits between 3 and K)
evaluation.isTwoOvercards;            // false
evaluation.keyCards.isOvercard;       // ['Ad']
```

Each hole card is classified against the board:

| Classification | Meaning |
| --- | --- |
| Overcard | Rank is higher than every board card |
| Middle card | Rank sits strictly between the highest and lowest board ranks |
| Undercard | Rank is lower than every board card |
| Paired | Rank matches a board card, so it belongs to none of the above |

The two classifications combine into one (and only one) of the six categories below. If either hole card pairs the board, none of the six is true — though `isOvercard` can still be true on its own.

```javascript
// Board: K Q 8 3
evaluateHand([...board, 'Ad', 'Kc'], true, ['Ad', 'Kc']);  // isOvercard only (the king pairs the board)
evaluateHand([...board, 'Jd', 'Th'], true, ['Jd', 'Th']);  // isTwoMiddleCards
evaluateHand([...board, '4d', '2h'], true, ['4d', '2h']);  // isMiddleAndUndercard (the 4 beats the 3)
evaluateHand([...board, '2d', '2h'], true, ['2d', '2h']);  // isTwoUndercards
```

**Notes:**
- Hole cards are optional. Without them every overcard property is `false`.
- Supplying hole cards also restricts draws to those that use at least one hole card (see [Draws](#draws)).
- Both hole cards must appear in the `cards` array, but they do **not** have to appear in the 5-card combination being evaluated — the classification is a property of the whole hand and is identical across every combination.
- These categorizations describe the hole cards, not the made hand, so **strict mode does not filter them**. A hand that flops a straight with A-J on a K-Q-T-3 board reports both `isStraight` and `isOvercardAndMiddleCard`.

### Strict Mode

By default, the evaluator uses **strict mode** which only marks the strongest made hand and stronger draws as true. This prevents weaker hands from being marked when a stronger hand exists.

**Example with strict mode (default):**
```javascript
const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs']);
// isTwoPair: true
// isPair: false (filtered out because two pair is stronger)
// isTopAndMiddlePair: true
```

**Example with non-strict mode:**
```javascript
const result = evaluateHand(['As', 'Ah', 'Kd', 'Kc', 'Qs'], false);
// isTwoPair: true
// isPair: false (evaluation logic prevents this, not strict mode)
// isTopAndMiddlePair: true
```

**Strict Mode Rules:**
- Only the strongest made hand is marked as true
- Descriptive labels (isTopPair, etc.) are only true if they match the strongest hand
- Made flush or stronger cannot have straight draws (flush > straight)
- Draws can coexist when no made hand exists (flush draw + straight draw is valid)
- With 6 or more cards, draws are collected from **every** 5-card combination, not just the best one, so a draw using a card outside the best five is still reported. Straight draws are dropped once a straight or better is made, and flush draws once a flush or better is made. `isComboDraw` is true when the whole hand has both a flush draw and a straight draw.

**Draws by street**: the number of cards sets the street. With 5 cards (the flop) every draw is possible; with 6 (the turn) there is no `isBackdoorFlushDraw`, since one card to come cannot complete it; with 7 (the river) there are no draws at all. This applies in both modes.

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

#### Pair Categorization (only true if `isPair` is true in strict mode)
- `isTopPair` - Pair is the highest card
- `isMiddlePair` - Pair is neither highest nor lowest
- `isBottomPair` - Pair is the lowest card

#### Two Pair Categorization (only true if `isTwoPair` is true in strict mode)
- `isTopAndMiddlePair` - Both pairs are in top two ranks
- `isTopAndBottomPair` - One pair is highest, other is lowest
- `isMiddleAndBottomPair` - Both pairs are in middle and bottom ranks

#### Three of a Kind Categorization (only true if `isThreeOfAKind` is true in strict mode)
- `isTopThreeOfAKind` - Three of a kind is the highest rank
- `isMiddleThreeOfAKind` - Three of a kind is neither highest nor lowest
- `isBottomThreeOfAKind` - Three of a kind is the lowest rank

**Note**: With `holeCards`, pair and three of a kind positions are judged against the **whole board**, including board cards left out of the 5-card combination: top means at or above the highest board card (so a pocket pair above the board is top pair), bottom means at or below the lowest, middle is anything between. A pair or three of a kind made only of board cards gets no position. Without `holeCards` the board is unknown, so positions are judged within the 5-card combination. Two pair positions are always judged within the 5-card combination.

#### Overcard Categorization (requires `holeCards`; not filtered by strict mode)
- `isOvercard` - At least one hole card ranks above every board card
- `isTwoOvercards` - Both hole cards rank above every board card
- `isOvercardAndMiddleCard` - One overcard, one middle card
- `isOvercardAndUndercard` - One overcard, one undercard
- `isTwoMiddleCards` - Both hole cards sit strictly between the highest and lowest board ranks
- `isMiddleAndUndercard` - One middle card, one undercard
- `isTwoUndercards` - Both hole cards rank below every board card

#### Other Categorization
- `isUnderPair` - Pocket pair ranked below every board card. With `holeCards` this works on any street, including the flop; without them the board is unknown, so it requires 6+ cards and means a pair ranked below every other card
- `isComboDraw` - Both a flush draw (not backdoor) and a straight draw

#### Draws
- `isFlushDraw` - Four cards of the same suit (one away from flush)
- `isBackdoorFlushDraw` - Three cards of the same suit (two away from flush)
- `isOpenEndedStraightDraw` - Four in a row that a card at either end completes (e.g. 9-8-7-6). A-K-Q-J and A-2-3-4 complete at one end only, so they count as inside draws
- `isInsideStraightDraw` - One card away from a straight that only one rank completes (a gap in the middle, or A-K-Q-J / A-2-3-4)
- `isStraightDraw` - Any type of straight draw (open-ended or inside, standard or wheel)

**Note**: When `holeCards` are supplied, every draw (including `isComboDraw` and the wheel draws) must use at least one hole card. A draw made entirely of board cards is shared by every player, so it is not reported: 2-2 on a 9-8-7-6 board is not an open-ended straight draw, and A♦-Q♦ on a K♠-7♠-2♠ flop is not a backdoor flush draw. Without `holeCards` the evaluator cannot tell the board from the hand, so draws are detected from all cards.

**Note**: Straight draws count paired cards once, so a paired hand can still hold one: 5-4 on an 8-8-6 flop is a pair and an inside straight draw. With `holeCards`, a hole card that only pairs a board rank does not create a straight draw (9-2 on a 9-8-7-6 board has no straight draw of its own).

#### Wheel Straight Support
- `isStraightWheel` - Wheel straight (A-2-3-4-5)
- `isOpenEndedStraightDrawWheel` - Open-ended draw using wheel ranking
- `isInsideStraightDrawWheel` - Inside draw using wheel ranking

#### Card Arrays
- `keyCards` - Object with keys for each hand type/draw, values are arrays of cards (sorted) that constitute that specific hand type or draw. False hand types have empty arrays `[]`.
- `kickerCards` - Object with keys for each hand type/draw, values are arrays of cards (sorted) that don't constitute that specific hand type or draw. False hand types have empty arrays `[]`, except `isHighCard` which contains all 5 cards when true.

**Note**: For the overcard categorizations, `keyCards` holds the qualifying hole cards and `kickerCards` holds the remaining cards of the **full hand** (the board, plus any hole card that is not a key card) rather than the remaining cards of the 5-card combination.

**Note**: Each hand type has its own `keyCards` and `kickerCards` entries. For example, a hand with both a pair and a flush draw will have separate entries in `keyCards.isPair`, `keyCards.isFlushDraw`, `kickerCards.isPair`, and `kickerCards.isFlushDraw`.

### Example Response

**Example 1: Royal Flush (strict mode - default)**

```javascript
{
  "As, Ks, Qs, Js, Ts": {
    "isFourOfAKind": false,
    "isFullHouse": false,
    "isThreeOfAKind": false,
    "isTwoPair": false,
    "isPair": false,
    "isFlush": false,  // Filtered out in strict mode (royal flush is stronger)
    "isStraight": false,  // Filtered out in strict mode (royal flush is stronger)
    "isRoyalFlush": true,
    "isStraightFlush": false,  // Filtered out in strict mode (royal flush is stronger)
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
      "isFlush": [],  // Empty in strict mode (royal flush is stronger)
      "isStraight": [],  // Empty in strict mode (royal flush is stronger)
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

**Example 2: Pair with Flush Draw (strict mode - default)**

```javascript
{
  "As, Ah, Ks, Qs, Js": {
    "isPair": true,
    "isFlushDraw": true,  // Draws can coexist with made hands in strict mode
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

**Example 3: Two Pair (strict mode - default)**

```javascript
{
  "As, Ah, Kd, Kc, Qs": {
    "isTwoPair": true,
    "isPair": false,  // Filtered out in strict mode (two pair is stronger)
    "isTopAndMiddlePair": true,
    // ... other boolean properties ...
    "keyCards": {
      "isTwoPair": ["As", "Ah", "Kd", "Kc"],
      "isPair": [],  // Empty in strict mode
      // ... other hand types with empty arrays ...
    },
    "kickerCards": {
      "isTwoPair": ["Qs"],
      "isPair": [],  // Empty in strict mode
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
- Hole cards that are not an array of exactly 2 distinct cards drawn from `cards`

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

The test suite includes 700+ tests covering:
- All hand types
- Edge cases
- Invalid input handling
- Wheel straights
- Draw detection
- Categorization logic
- Overcard categorization and hole card validation

## API Reference

### `evaluateHand(cards, strict, holeCards, villainRange)`

Main function to evaluate poker hands.

**Parameters:**
- `cards` (string[]): Array of 5 or more card strings
- `strict` (boolean, optional): If `true`, only the strongest made hand and stronger draws are marked. If `false`, all applicable hand types are marked (default: `true`).
- `holeCards` (string[] | null, optional): Exactly 2 cards identifying the player's hole cards, both of which must appear in `cards`. Required for the overcard categorizations; without it those properties are always `false` (default: `null`).
- `villainRange` (string[] | null, optional): Villain hands as exact combos (`'AhKd'`) or shorthand (`'QQ'`, `'AKs'`, `'AKo'`, `'AK'`, `'TT+'`, `'ATs+'`, `'ATo+'`, `'AT+'`). When supplied, each evaluation gets a `villainRange` property; see [Villain Range Blockers](#villain-range-blockers) (default: `null`).

**Returns:**
- Object mapping sorted hand strings to evaluation objects

**Throws:**
- Error if input is invalid

### `HandEvaluator` Class

#### Constructor

```javascript
new HandEvaluator(cards, strict, holeCards, villainRange)
```

Creates a new HandEvaluator instance.

**Parameters:**
- `cards` (string[]): Array of 5 or more card strings
- `strict` (boolean, optional): If `true`, only the strongest made hand and stronger draws are marked. If `false`, all applicable hand types are marked (default: `true`).
- `holeCards` (string[] | null, optional): Exactly 2 cards identifying the player's hole cards, both of which must appear in `cards`. Required for the overcard categorizations (default: `null`).
- `villainRange` (string[] | null, optional): Villain hands as exact combos (`'AhKd'`) or shorthand (`'QQ'`, `'AKs'`, `'AKo'`, `'AK'`, `'TT+'`, `'ATs+'`, `'ATo+'`, `'AT+'`). When supplied, each evaluation gets a `villainRange` property; see [Villain Range Blockers](#villain-range-blockers) (default: `null`).

**Properties:**
- `evaluation` - Object mapping sorted hand strings to evaluation objects (same format as `evaluateHand()` return value)
- `cards` - Array of input cards
- `strict` - Boolean indicating whether strict mode is enabled
- `holeCards` - Array of the 2 hole cards, or `null` if none were supplied

### Villain Range Blockers

Pass a villain range as the fourth argument to see which of its combos the known cards rule out, and what those blocked combos would have made:

```javascript
const board = ['Kh', '9h', '4h', '2c'];
const holeCards = ['Ah', 'Js'];
const result = evaluateHand([...board, ...holeCards], true, holeCards, ['AQs', 'AA', 'QQ']);
const { villainRange } = Object.values(result)[0];

villainRange.heroBlocks;
// {
//   unblocked: ['AsQs', 'AdQd', 'AcQc', 'AsAd', 'AsAc', 'AdAc', 'QsQh', 'QsQd', 'QsQc', 'QhQd', 'QhQc', 'QdQc'],
//   blocked: {
//     isRoyalFlush: [], isStraightFlush: [], isFourOfAKind: [], isFullHouse: [],
//     isFlush: ['AhQh'],                    // your A♥ blocks villain's nut flush
//     isStraight: [], isThreeOfAKind: [], isTwoPair: [],
//     isPair: ['AsAh', 'AhAd', 'AhAc'],
//     isHighCard: []
//   }
// }
```

The result has three views, each `{ unblocked, blocked }`:

- `boardBlocks` - blocked by a board card (every card in `cards` that is not a hole card)
- `heroBlocks` - blocked by one of the hole cards
- `allBlocks` - blocked by any known card; `unblocked` here is what villain can actually hold

`unblocked` is an array of combos. `blocked` groups combos by the made hand villain would hold with them on this board (the best five of board + combo), keyed by the made hand flag from `isRoyalFlush` to `isHighCard`. Every key is always present, empty when no combo falls in it. A combo containing a board card cannot be dealt, so it has no hand and is left out of `blocked`; as a result `boardBlocks.blocked` is always empty, and those combos only show up as missing from `unblocked`.

Shorthand is expanded to combos, so a partly blocked entry such as `AKs` is split across both lists. Combos are written high rank first (`'AhKd'`, and `'QsQh'` for pairs with suits ordered s, h, d, c), duplicates are removed, and input order is kept. Without `holeCards`, every card is treated as board, so `heroBlocks` blocks nothing. In non-strict mode every combination carries the same `villainRange`. The property is omitted when no range is supplied, and an invalid entry throws.

**Note**: All internal methods are private. Use the `evaluation` property to access evaluation results.

## Releasing

Pushing to `main` publishes to npm via GitHub Actions (`.github/workflows/publish.yml`), using npm trusted publishing so no token is stored. Every push to `main` is released: the workflow runs the tests, bumps the patch version, commits the bump back to `main`, tags it `v<version>` and publishes. There is no need to bump the version by hand for patch releases. For a minor or major release, bump it in your change (`npm version minor|major --no-git-tag-version`); a version that is not on npm yet is published as is, without an extra bump.

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

