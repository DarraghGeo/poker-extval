# Poker Hand Evaluator

A Texas Hold'em hand evaluator for Node.js. Give it 5 to 7 cards (board plus hole cards) and it tells you what the player holds: the made hand, where it sits on the board (top pair, over pair, bottom set), every draw that uses the player's cards, how the hole cards rank against the board, and which of a villain's combos the known cards block. It also compares hands and calculates equity.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Card format](#card-format)
- [Evaluating a hand](#evaluating-a-hand)
- [Strict and non-strict mode](#strict-and-non-strict-mode)
- [Streets](#streets)
- [The evaluation object](#the-evaluation-object)
- [Villain range blockers](#villain-range-blockers)
- [Comparing hands and equity](#comparing-hands-and-equity)
- [Ranges](#ranges)
- [API reference](#api-reference)
- [TypeScript](#typescript)
- [Performance](#performance)
- [Testing](#testing)
- [Releasing](#releasing)
- [License](#license)

## Installation

```bash
npm install poker-extval
```

Requires Node.js 20.19+ or 22.13+ (range parsing uses [poker-rangeman](https://github.com/DarraghGeo/poker-rangeman), an ES module this CommonJS package loads with `require`).

## Quick start

```javascript
const { evaluate } = require('poker-extval');

// Turn: board 4♥ 9♥ 7♥ 8♠, hero A♥ J♠
const result = evaluate(['4h', '9h', '7h', '8s', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] });

result.hand;                    // ['Ah', 'Js', '9h', '8s', '7h']  the best five cards
result.category;                // 'isHighCard'
result.street;                  // 'turn'
result.isFlushDraw;             // true   (A♥ plus three board hearts)
result.isInsideStraightDraw;    // true   (J-9-8-7 needs a T)
result.isComboDraw;             // true
result.isTwoOvercards;          // true
result.keyCards.isFlushDraw;    // ['Ah', '9h', '7h', '4h']
```

## Card format

Cards are two-character strings: a rank `A K Q J T 9 8 7 6 5 4 3 2` and a suit `s h d c`. Ten is `T`, not `10`. Examples: `'As'` (ace of spades), `'Td'` (ten of diamonds).

## Evaluating a hand

There are two entry points:

- **`evaluate(cards, options)`** returns one flat object for the best hand. Use this unless you need every 5-card combination.
- **`evaluateHand(cards, options)`** returns evaluations keyed by 5-card hand (`{ 'Ah, Js, 9h, 8s, 7h': { ... } }`). In strict mode (the default) there is one key; in non-strict mode there is one per combination.

Both take an options object:

| Option | Default | Meaning |
| --- | --- | --- |
| `holeCards` | `null` | The player's 2 hole cards, both also in `cards`. Needed for board-relative labels, overcards, `usesHoleCards` and the rule that draws must use a hole card. |
| `villainRange` | `null` | Villain's range; adds [`villainRange`](#villain-range-blockers) to the result. |
| `street` | inferred | `'flop'`, `'turn'` or `'river'`. See [Streets](#streets). |
| `strict` | `true` | `evaluateHand` only. See [Strict and non-strict mode](#strict-and-non-strict-mode). |

`evaluateHand` and `new HandEvaluator` also still accept the positional form `(cards, strict, holeCards, villainRange)`.

```javascript
const { evaluateHand } = require('poker-extval');

const result = evaluateHand(['Kd', '8c', '3h', 'As', 'Kh'], { holeCards: ['As', 'Kh'] });
const evaluation = Object.values(result)[0];
evaluation.isTopPair;      // true
evaluation.usesHoleCards;  // true
```

## Strict and non-strict mode

**Strict mode** (the default) returns the best 5-card hand only:

- Only the strongest made hand is true (a full house is not also three of a kind).
- Position labels (`isTopPair` etc.) are true only for that made hand.
- With 6 or 7 cards, draws are collected from **every** 5-card combination, so a draw using a card outside the best five is still reported, and `isComboDraw` is true when the whole hand has a flush draw and a straight draw.
- Straight draws are dropped once a straight or better is made, and flush draws once a flush or better is made.

**Non-strict mode** returns every 5-card combination, each judged on its own five cards, with every applicable flag. Draws the full hand has already made are still dropped from every combination: with a made flush, no combination reports a flush draw.

## Streets

The street decides which draws can still complete:

| Street | Cards | Draws |
| --- | --- | --- |
| Flop | 5 | All |
| Turn | 6 | No `isBackdoorFlushDraw` (one card to come cannot complete it) |
| River | 7 | None |

By default the street comes from the card count. Pass `street` to override it, for example to evaluate a 5-card river board on its own.

## The evaluation object

### Made hands

Exactly one is true in strict mode.

| Flag | Meaning |
| --- | --- |
| `isRoyalFlush` | A-K-Q-J-T suited |
| `isStraightFlush` | Five in a row, suited (not royal) |
| `isFourOfAKind` | Four of a rank |
| `isFullHouse` | Three of one rank, two of another |
| `isFlush` | Five of a suit |
| `isStraight` | Five in a row, including the wheel A-2-3-4-5 |
| `isThreeOfAKind` | Three of a rank |
| `isTwoPair` | Two pairs |
| `isPair` | One pair |
| `isHighCard` | None of the above |
| `isStraightWheel` | The straight is A-2-3-4-5 |

### Position labels

With `holeCards`, positions are judged against the **whole board**, including board cards outside the best five. A board rank is top, middle or bottom by where it sits among the board ranks; a pocket pair is over, middle or under. A pair or three of a kind made only of board cards gets no label. Without `holeCards` the board is unknown, so positions are judged within the five cards (and there is no over pair).

| Flag | With hole cards |
| --- | --- |
| `isOverPair` | Pocket pair above every board card |
| `isTopPair` | Pairs the highest board card |
| `isMiddlePair` | Pairs a board card between the highest and lowest, or a pocket pair between them |
| `isBottomPair` | Pairs the lowest board card |
| `isUnderPair` | Pocket pair below every board card. Without hole cards it needs 6+ cards and means a pair below every other card |
| `isTopAndMiddlePair` | Two pair: both hole cards pair the top and a middle board card |
| `isTopAndBottomPair` | Two pair: the top and bottom board cards |
| `isMiddleAndBottomPair` | Two pair: a middle and the bottom board card |
| `isTopThreeOfAKind` | Set or trips of the highest board card |
| `isMiddleThreeOfAKind` | Set or trips of a middle board card |
| `isBottomThreeOfAKind` | Set or trips of the lowest board card |

A two pair that uses a board pair, or pairs two middle board cards, has none of the three two-pair labels.

### `usesHoleCards`

Whether the strongest made hand uses a hole card (for high card: whether a hole card is among the best five). `false` means the player is playing the board: A-K on 8-8-3 has `isPair: true`, but the pair is the board's. `null` without hole cards.

### Draws

| Flag | Meaning |
| --- | --- |
| `isFlushDraw` | Four of a suit |
| `isBackdoorFlushDraw` | Three of a suit, flop only |
| `isOpenEndedStraightDraw` | Two or more ranks complete a straight (8 outs). Includes double gutshots such as K-J-T-9-7 (a Q or an 8) |
| `isInsideStraightDraw` | Exactly one rank completes a straight (4 outs). Includes one-ended draws such as A-K-Q-J and A-2-3-4 |
| `isStraightDraw` | Either of the above |
| `isOpenEndedStraightDrawWheel` | An open-ended draw where one completion is the wheel |
| `isInsideStraightDrawWheel` | An inside draw where the completion is the wheel |
| `isComboDraw` | A flush draw and a straight draw |

With `holeCards`, a draw must be the player's: a flush draw must include a hole card, and a straight draw must use a rank the board does not have. 2-2 on 9-8-7-6 has no straight draw, and A♦-Q♦ on K♠-7♠-2♠ has no backdoor flush draw. Paired cards count once, so 5-4 on 8-8-6 is a pair and an inside straight draw.

### Hole cards against the board

Each hole card is an overcard (above every board card), a middle card, an undercard (below every board card), or paired (its rank is on the board). These describe the hole cards rather than the made hand, so strict mode does not filter them. They need `holeCards`.

| Flag | Meaning |
| --- | --- |
| `isOvercard` | At least one overcard |
| `isTwoOvercards` | Two overcards |
| `isOvercardAndMiddleCard` | One of each |
| `isOvercardAndUndercard` | One of each |
| `isTwoMiddleCards` | Two middle cards |
| `isMiddleAndUndercard` | One of each |
| `isTwoUndercards` | Two undercards |

### `keyCards` and `kickerCards`

Both have a key for every flag. For a true flag, `keyCards` lists the cards that make it, high to low, and `kickerCards` lists the rest of the five; for a false flag both are `[]`. High card has no key cards and all five as kickers. For the hole card labels, `keyCards` holds the qualifying hole cards and `kickerCards` the rest of the full hand.

```javascript
// A♠ A♥ K♠ Q♠ J♠
keyCards.isPair;          // ['As', 'Ah']
kickerCards.isPair;       // ['Ks', 'Qs', 'Js']
keyCards.isFlushDraw;     // ['As', 'Ks', 'Qs', 'Js']
kickerCards.isFlushDraw;  // ['Ah']
```

A straight draw's key cards are the ranks its completions use: for each out, the highest straight it makes. A-K-Q-J-9 needs a T, so its key cards are A-K-Q-J; a double gutshot such as K-J-T-9-7 uses all five. On 6 or 7 cards in strict mode, a draw's key and kicker cards can include cards outside the best five.

### `evaluate` extras

`evaluate()` adds these to the flat object:

| Property | Meaning |
| --- | --- |
| `hand` | The best five cards, high to low |
| `category` | The made hand flag, e.g. `'isFlush'` |
| `strength` | 10 (royal flush) down to 1 (high card) |
| `rank` | `[strength, ...tiebreak ranks]`: compare element by element, the higher array is the better hand |
| `street` | The street used |

## Villain range blockers

Pass `villainRange` to see which of villain's combos the known cards rule out, and what the blocked combos would have made or been drawing to. `classifyRange(cards, holeCards, range)` returns the same thing on its own.

```javascript
const { classifyRange } = require('poker-extval');

// Board K♥ 9♥ 4♥ 2♣, hero A♥ J♠
classifyRange(['Kh', '9h', '4h', '2c', 'Ah', 'Js'], ['Ah', 'Js'], 'AQs,AA,QQ').heroBlocks;
// {
//   unblocked: ['AcQc', 'AdQd', 'AsQs', 'AcAd', 'AcAs', 'AdAs', 'QcQd', 'QcQh', 'QcQs', 'QdQh', 'QdQs', 'QhQs'],
//   blocked: {
//     isFlush: ['AhQh'],                      // your A♥ blocks villain's nut flush
//     isPair: ['AcAh', 'AdAh', 'AhAs'],
//     isFlushDraw: ['AcAh', 'AdAh', 'AhAs'],  // A♥ plus three board hearts
//     ...every other key, empty
//   }
// }
```

There are three views, each `{ unblocked, blocked }`:

- `boardBlocks`: blocked by a board card (every card that is not a hole card)
- `heroBlocks`: blocked by a hole card
- `allBlocks`: blocked by any known card; its `unblocked` is what villain can actually hold

`unblocked` lists the combos. `blocked` groups the blocked combos, with every key always present:

- A combo villain could otherwise be dealt is listed under its made hand (the best five of board + combo, `isRoyalFlush` to `isHighCard`) and under every draw it holds (`isFlushDraw`, `isBackdoorFlushDraw`, `isOpenEndedStraightDraw`, `isInsideStraightDraw`, `isStraightDraw`, `isComboDraw`). Draws follow the same rules as hero's, with the combo as villain's hole cards.
- A combo containing a board card cannot be dealt at all, so it is listed under `onBoard`.

Without `holeCards`, every card is treated as board, so `heroBlocks` blocks nothing. In non-strict mode each combination gets its own copy.

## Comparing hands and equity

These use [poker-bitvaljs](https://github.com/DarraghGeo/poker-bitvaljs).

```javascript
const { compareHands, equity } = require('poker-extval');

compareHands(['Ah', 'Kd'], ['Qs', 'Qc'], ['Ks', '7h', '2d']);  // 1 (kings beat queens)

await equity(['Ah', 'Js'], 'KK', ['4h', '9h', '7h']);
// { win: 2994, tie: 30, lose: 4032, equity: 0.4264... }
```

- `compareHands(handA, handB, board)` returns `1` if `handA` wins, `-1` if `handB` wins, `0` for a tie. Each hand plus the board must be 5 to 7 cards.
- `equity(hero, villain, board, { deadCards, iterations })` returns runout counts from hero's side and `equity = (win + tie / 2) / total`. Hero and villain can each be a combo (`'AhJs'`), two cards (`['Ah', 'Js']`) or a range (`'KK,AKs'`). On the flop and turn every runout is counted, so the result is exact; preflop it is a Monte Carlo estimate. Combos that clash with the board or dead cards are skipped.

## Ranges

Ranges are parsed by [poker-rangeman](https://github.com/DarraghGeo/poker-rangeman). A range is a comma-separated string (`'AA,KQs,JTo'`) or an array of entries, using any of its notation:

| Notation | Example | Means |
| --- | --- | --- |
| Exact combo | `AhKd` | One combo |
| Pair | `QQ`, `TT+`, `99-66` | A pair, that pair and higher, a span of pairs |
| Suited / offsuit | `AKs`, `AKo`, `ATs+`, `KQs-K9s` | Plus raises the second rank up to one below the first |
| Any suit | `AK`, `AT+` | Suited and offsuit together |
| Rank wildcard | `KXs`, `KXo` | Every suited / offsuit hand with a K |

`parseRange(range)` expands a range into exact combos, high rank first with suits ordered c, d, h, s (`'AcKc'`, `'QcQd'`), keeping input order and removing duplicates. An invalid entry throws `Invalid range entry at index i: "..."`.

## API reference

| Function | Returns |
| --- | --- |
| `evaluate(cards, { holeCards, villainRange, street })` | The best hand as one flat object |
| `evaluateHand(cards, { strict, holeCards, villainRange, street })` | Evaluations keyed by 5-card hand |
| `evaluateHand(cards, strict, holeCards, villainRange)` | The same, positional form |
| `new HandEvaluator(cards, options)` | `.evaluation` (as `evaluateHand`), `.cards`, `.strict`, `.holeCards`, `.street` |
| `classifyRange(cards, holeCards, range, { street })` | `{ boardBlocks, heroBlocks, allBlocks }` |
| `parseRange(range)` | Exact combos |
| `compareHands(handA, handB, board)` | `1`, `-1` or `0` |
| `equity(hero, villain, board, { deadCards, iterations })` | `Promise<{ win, tie, lose, equity }>` |

Every function validates its input and throws an `Error` with a descriptive message: fewer than 5 cards, a malformed card or invalid rank or suit, a duplicate card, hole cards that are not 2 distinct cards from `cards`, an unknown street, or an invalid range entry.

```javascript
evaluateHand(['As', 'Ks', 'Qs', 'Js']);  // throws "Expected at least 5 cards, received 4"
```

## TypeScript

Types ship with the package (`index.d.ts`), covering every function, option and flag:

```typescript
import { evaluate, Evaluation, FlatEvaluation, VillainRange } from 'poker-extval';
```

## Performance

Typical times per hand on a modern machine:

| Hand | Strict | Non-strict |
| --- | --- | --- |
| 5 cards (flop) | ~0.1 ms | ~0.1 ms |
| 6 cards (turn) | ~0.2 ms | ~0.4 ms |
| 7 cards (river) | ~0.4 ms | ~0.7 ms |

A full 1,326-combo villain range on the river takes about 40 ms. Run `npm run benchmark` for the full suite.

## Testing

```bash
npm test
```

Runs the Jest suite (over 800 tests) and type-checks `index.d.ts`. Alongside the per-hand tests, the suite checks strict mode's best hand, every draw, and hand ranks against independent reference implementations on random hands.

## Releasing

Pushing to `main` publishes to npm via GitHub Actions (`.github/workflows/publish.yml`), using npm trusted publishing so no token is stored. A push publishes only when it changes the package's code (`evaluator.js`, `src/`, `index.d.ts`) or `package.json`; changes to docs or tests alone do not. A release runs the tests, bumps the patch version (unless `package.json` already holds a version that is not on npm yet, e.g. a manual `npm version minor --no-git-tag-version`), commits the bump back to `main`, tags it `v<version>` and publishes. The workflow can also be started by hand from the Actions tab.

Tests run on every push and pull request (`.github/workflows/test.yml`) on each supported Node version.

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
