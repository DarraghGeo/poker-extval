# Poker Hand Evaluator

A Texas Hold'em hand evaluator for the browser and Node.js. Give it 5 to 7 cards (board plus hole cards) and it tells you what the player holds: the made hand, where it sits on the board (top pair, over pair, bottom set), every draw that uses the player's cards, how the hole cards rank against the board, and which of a villain's combos the known cards block. It also compares hands and calculates equity.

Version 6 is a rewrite for speed: the same results as 5.2, byte for byte (plus nut flush, double gutshot and backdoor straight draws), 5 to 12 times faster to evaluate a hand and 4 to 7 times faster to analyse one, plus a [core API](#core-api) that classifies a whole range on one board in a fraction of a microsecond per combo. See [Upgrading from 5.x](#upgrading-from-5x).

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
- [Hand analysis](#hand-analysis)
- [Fast, lazy analysis](#fast-lazy-analysis)
- [Core API](#core-api)
- [Ranges](#ranges)
- [API reference](#api-reference)
- [TypeScript](#typescript)
- [Performance](#performance)
- [Upgrading from 5.x](#upgrading-from-5x)
- [Testing](#testing)
- [Releasing](#releasing)
- [License](#license)

## Installation

```bash
npm install poker-extval
npm install poker-extval@next   # the 6.0 prerelease
```

Works in the browser, through any bundler (tested with esbuild, webpack and Vite) or [with none](#in-the-browser-without-a-bundler), and in Node.js 20.19+ or 22.13+. Needs poker-bitvaljs 1.12 or later (installed automatically). Range parsing uses [poker-rangeman](https://github.com/DarraghGeo/poker-rangeman) 4.0.0-beta.7 or later, a **peer dependency**: extval uses your app's copy, and npm 7+ installs it for you if the app has none (or run `npm install poker-rangeman@beta`). Node needs those versions because rangeman is an ES module this CommonJS package loads with `require`; on older Node everything except ranges and equity still works.

```javascript
import { evaluate } from 'poker-extval';           // bundler / ES modules
const { evaluate } = require('poker-extval');      // CommonJS
```

### In the browser without a bundler

Two ES-module builds ship in `dist/`:

| File | Size (minified) | Use it when |
| --- | --- | --- |
| `dist/poker-extval.mjs` | 107 KB (51 KB) | Your page or bundler also loads poker-bitvaljs and poker-rangeman: it imports them by name, so there is one copy of each. This is what `import ... from 'poker-extval'` gives in bundlers and Node. |
| `dist/poker-extval.bundle.mjs` | 352 KB (151 KB) | You want a single file with nothing else to set up: both packages are built in. |

Without a bundler, give `poker-extval.mjs` an import map for its two dependencies (both ship ES modules):

```html
<script type="importmap">
  { "imports": {
      "poker-bitvaljs": "/node_modules/poker-bitvaljs/bitval.mjs",
      "poker-rangeman": "/node_modules/poker-rangeman/src/rangeManager.js"
  } }
</script>
<script type="module">
  import { evaluate, board } from '/node_modules/poker-extval/dist/poker-extval.mjs';

  const result = evaluate(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] });
  console.log(result.isNutFlushDraw); // true
</script>
```

Or import the self-contained file with no import map, from your files or a CDN:

```html
<script type="module">
  import { evaluate } from 'https://cdn.jsdelivr.net/npm/poker-extval@next/dist/poker-extval.bundle.mjs';
</script>
```

`require('poker-extval')` uses the CommonJS build, as before.

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
- With 6 or 7 cards, draws are worked out on the **whole hand**, so a draw using a card outside the best five is still reported, and `isComboDraw` is true when the whole hand has a flush draw and a straight draw. This also finds draws no single five holds: K-Q-T-9-7-6 is open-ended (a J or an 8), though every five-card subset holds only one of the two.
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
| `isNutFlushDraw` | A flush draw holding the best card of the suit the board lacks (the A♥, or the K♥ with the A♥ on the board), so hitting makes the nut flush. Needs `holeCards` |
| `isNutBackdoorFlushDraw` | The same, for a backdoor flush draw |
| `isOpenEndedStraightDraw` | Two or more ranks complete a straight (8 outs). Includes double gutshots such as K-J-T-9-7 (a Q or an 8) |
| `isInsideStraightDraw` | Exactly one rank completes a straight (4 outs). Includes one-ended draws such as A-K-Q-J and A-2-3-4 |
| `isDoubleGutshot` | An open-ended draw with no four in a row: two different gutshots, as K-J-T-9-7 or 9-7-6-5-3 (but not 9-8-7-6) |
| `isStraightDraw` | Any of the above straight draws |
| `isBackdoorStraightDraw` | Flop only, with no straight draw: three ranks of a straight, so two more cards can complete it, as K-J-T or 8 with J-T |
| `isOpenEndedStraightDrawWheel` | An open-ended draw where one completion is the wheel |
| `isInsideStraightDrawWheel` | An inside draw where the completion is the wheel |
| `isComboDraw` | A flush draw and a straight draw |
| `isBackdoorComboDraw` | A backdoor flush draw and a backdoor straight draw |

With `holeCards`, a draw must be the player's: a flush draw must include a hole card, and a straight draw (backdoor ones too) must use a rank the board does not have. An out counts only when the straight it makes beats the one the board makes on its own with that card: on 7-9-6-8, 4-2 has no draw, since a 5 gives it 4-8 but the board 5-9, and J-4 has only a gutshot (the T). 2-2 on 9-8-7-6 has no straight draw, and A♦-Q♦ on K♠-7♠-2♠ has no backdoor flush draw. Paired cards count once, so 5-4 on 8-8-6 is a pair and an inside straight draw.

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

A straight draw's key cards are the ranks its completions use: for each out, the highest straight it makes. A-K-Q-J-9 needs a T, so its key cards are A-K-Q-J; a double gutshot such as K-J-T-9-7 uses all five. On 6 or 7 cards in strict mode, a draw's key cards can include cards outside the best five, and its kicker cards are the rest of the full hand.

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

- A combo villain could otherwise be dealt is listed under its made hand (the best five of board + combo, `isRoyalFlush` to `isHighCard`) and under every draw it holds (`isFlushDraw`, `isBackdoorFlushDraw`, `isNutFlushDraw`, `isNutBackdoorFlushDraw`, `isOpenEndedStraightDraw`, `isInsideStraightDraw`, `isDoubleGutshot`, `isStraightDraw`, `isBackdoorStraightDraw`, `isComboDraw`, `isBackdoorComboDraw`). Draws follow the same rules as hero's, with the combo as villain's hole cards.
- A combo containing a board card cannot be dealt at all, so it is listed under `onBoard`.

Without `holeCards`, every card is treated as board, so `heroBlocks` blocks nothing. In non-strict mode each combination gets its own copy.

## Comparing hands and equity

These use [poker-bitvaljs](https://github.com/DarraghGeo/poker-bitvaljs).

```javascript
const { compareHands, equity } = require('poker-extval');

compareHands(['Ah', 'Kd'], ['Qs', 'Qc'], ['Ks', '7h', '2d']);  // 1 (kings beat queens)

await equity(['Ah', 'Js'], 'KK', ['4h', '9h', '7h']);
// { win: 2676, tie: 0, lose: 3264, equity: 0.4505... }  (5,940 runouts: 990 for each KK combo)
```

- `compareHands(handA, handB, board)` returns `1` if `handA` wins, `-1` if `handB` wins, `0` for a tie. Each hand plus the board must be 5 to 7 cards.
- `equity(hero, villain, board, { deadCards, iterations })` returns runout counts from hero's side and `equity = (win + tie / 2) / total`. Hero and villain can each be a combo (`'AhJs'`), two cards (`['Ah', 'Js']`) or a range (`'KK,AKs'`). On the flop and turn every runout is counted, so the result is exact; preflop it is a Monte Carlo estimate. Combos that clash with the board or dead cards are skipped.

## Hand analysis

`analyzeHand(cards, { holeCards, villainRange, strongThreshold })` measures a hand's outs and, against a villain range, its equity. Every runout is counted exactly.

```javascript
const { analyzeHand } = require('poker-extval');

// Flop: board 4♥ 9♥ 7♥, hero A♥ J♠, villain on KK or QQ
const a = analyzeHand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'], villainRange: 'KK,QQ' });

a.outs.count;            // 14
a.outs.nuts;             // ['Kh', 'Qh', '2h']      the nut flush
a.outs.strong;           // ['As', 'Ad', 'Ac', 'Jh', 'Jd', 'Jc', 'Th', '8h', '6h', '5h', '3h']
a.outs.byType.isFlush;   // the nine hearts
a.outs.dirty;            // ['Jd', 'Jc']            a pair of jacks still loses to KK and QQ
a.equity;                // 0.451  all-in equity to the river
a.equityNow;             // 0      if no more cards came
a.drawEquity;            // 0.451  equity - equityNow
a.runnerRunnerEquity;    // 0.010  won only with both turn and river
a.nextCard.worst;        // { card: 'Ks', equity: 0.235 }
```

**Outs** need only the hole cards. An out is a next card that gives hero a better made-hand category (high card to pair, pair to two pair, a draw to a flush, ...) using a hole card, and raises hero's hand strength. A card that pairs the board does not count, and neither does one that "improves" hero while helping villain more: A-A on 9-7-4 gets two pair from a 7, but a 7 gives villain trips, so it is not an out. Each out is graded by the hand it makes, against every hand villain could hold:

| Grade | Meaning |
| --- | --- |
| `nuts` | No hand beats it |
| `strong` | Beats at least `strongThreshold` (default 0.8) of villain's possible hands |
| `weak` | Any other out |

| Field | Meaning |
| --- | --- |
| `street`, `category` | The street and hero's current made hand |
| `handStrength` | Share of every hand villain could hold that hero beats now (ties count half) |
| `outs.count`, `outs.cards` | Every out |
| `outs.nuts`, `outs.strong`, `outs.weak` | Outs by grade |
| `outs.byType` | Outs by the made hand they give, e.g. `isFlush`; every key always present |
| `outs.clean`, `outs.dirty` | With a range: outs after which no live villain combo beats hero, and outs that still lose to some (`null` without a range) |
| `outs.details` | Per out: `card`, `category`, `handStrength`, `grade`, and with a range `clean` and `beatenBy` (the share of villain's combos still ahead) |
| `equity` | All-in equity against the range, every runout counted |
| `equityNow` | Equity if no more cards were dealt |
| `drawEquity` | `equity - equityNow`; negative when the cards to come hurt more than they help, as for an over pair on a coordinated board |
| `nextCard` | The equity after each next card: `byCard`, `average`, `best`, `worst`, `standardDeviation` (`null` on the river) |
| `runnerRunnerEquity` | Flop only: the part of `equity` won only with both runout cards, where neither card alone would have put hero ahead |
| `villainCombos` | How many of villain's combos are live (not blocked by the known cards) |

The equity measures are `null` without a `villainRange`. On the river there are no outs and `equity` equals `equityNow`. A flop analysis against a few dozen combos takes about a millisecond; against a very wide range (about 1,000 combos) about 10 ms.

## Fast, lazy analysis

`hand(cards, { holeCards, street })` is the entry point for high-volume use. Each method works out only what it returns, the first time it is called, and remembers it, so asking one question costs only that question.

```javascript
const { hand } = require('poker-extval');

const h = hand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] });

h.is('isFlushDraw');   // true
h.made();              // { hand: ['Ah', 'Js', '9h', '7h', '4h'], category: 'isHighCard', strength: 1, rank: [...] }
h.draws();             // { flags: { isFlushDraw: true, ... }, keyCards: { isFlushDraw: ['Ah', '9h', '7h', '4h'], ... } }
h.outs().nuts;         // ['Kh', 'Qh', '2h']
h.handStrength();      // 0.54

const m = h.vs('KK,QQ');
m.equity();            // 0.451  every runout counted, once, on the first equity call
m.equityNow();         // 0
m.nextCard().worst;    // { card: 'Ks', equity: 0.235 }
m.runnerRunner();      // 0.010
m.outs().dirty;        // ['Jd', 'Jc']
m.blockers();          // as classifyRange
```

| Method | Returns |
| --- | --- |
| `made()` | `{ hand, category, strength, rank }` |
| `flags()`, `is(flag)` | Every strict flag, or one of them |
| `draws()` | Draw flags and their key cards |
| `outs({ strongThreshold })` | Graded outs, as in [Hand analysis](#hand-analysis) (needs hole cards) |
| `handStrength()` | Share of villain's possible hands hero beats now (needs hole cards) |
| `evaluation()` | The same object as `evaluate()` |
| `vs(range)` | A matchup: `equity()`, `equityNow()`, `drawEquity()`, `nextCard()`, `runnerRunner()`, `liveCombos()`, `outs()` with clean and dirty, `blockers()` |

The other functions are lazy too, with the same output as before. In every evaluation, `keyCards`, `kickerCards` and `villainRange` are worked out the first time they are read. In `analyzeHand`, the outs and the equity fields work the same way. They behave like plain properties in `JSON.stringify`, spread, `Object.keys`, `structuredClone` and equality checks.

## Core API

For engines that classify hundreds of hands per decision, the core API skips the evaluation objects altogether. Set up a board once, then classify hole cards on it: each result is the strict-mode flags `evaluateHand` gives (with the combo as hole cards), packed into two integers.

```javascript
const { board, parseRange, FLAGS, hasFlag } = require('poker-extval');

const b = board(['Kh', '9h', '4c', '2d']);   // 3 to 5 cards; { street } as in evaluateHand

const r = b.classify('AhJh');                // or ['Ah', 'Jh'], or two card numbers
r.is('isFlushDraw');                         // true
r.is(FLAGS.isTwoOvercards);                  // false (J is below K)
r.category;                                  // 'isHighCard'
r.five;                                      // ['Ah', 'Kh', 'Jh', '9h', '4c']
r.score;                                     // poker-bitvaljs score: higher wins, equal ties
r.flags();                                   // every flag, as an object

// A whole range at once, into typed arrays, with nothing allocated per combo
const combos = parseRange('22+,A2s+,K9o+');
const all = b.classifyAll(combos);
for (let i = 0; i < all.count; i++) {
  if (all.blocked[i]) continue;              // shares a card with the board
  if (hasFlag(all.lo[i], all.hi[i], FLAGS.isFlushDraw)) { /* combos[i] holds a flush draw */ }
  all.strength[i];                           // 10 royal flush ... 1 high card
  all.score[i];
}
```

| Export | Meaning |
| --- | --- |
| `board(cards, { street })` | A board of 3 to 5 cards (strings or card numbers) |
| `.classify(hole)` | `{ lo, hi, strength, score, five, category, is(flag), flags(), keyCards(flag?), kickerCards(flag?), usesHoleCards() }` |
| `.classifyAll(combos)` | `{ count, lo, hi, strength, score, blocked }`, each a typed array indexed like `combos`; combos are `'AhKd'` strings or card numbers in pairs. `keyCards(i, flag?)`, `kickerCards(i, flag?)` and `usesHoleCards(i)` give combo `i`'s (`null` if blocked) |
| `FLAGS` | Flag index by name, in the evaluation's order. Read a flag with `hasFlag(lo, hi, FLAGS.name)`: `lo` holds the made hands, position labels and hole card categories, `hi` every draw (so `hi === 0` means no draws) |
| `hasFlag(lo, hi, flag)` | Whether a flag index is set |
| `cardIndex(card)`, `cardString(n)` | Card strings to card numbers (`rank * 4 + suit`, `'2s'` = 0 ... `'Ac'` = 51) and back |

`keyCards`, `kickerCards` and `usesHoleCards` are the same as `evaluateHand` gives for the board followed by the hole cards: every flag's cards without an argument, or one flag's (`r.keyCards('isFlushDraw')` is `['Ah', 'Kh', 'Jh', '9h']` above). They are worked out on the first call, so classifying stays fast when they are not used; on a batch, they classify that one combo again.

On a turn board `classifyAll` takes about 0.15 µs per combo and `classify` about 0.4 µs.

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
| `analyzeHand(cards, { holeCards, villainRange, strongThreshold })` | Outs, hand strength and equity measures; see [Hand analysis](#hand-analysis) |
| `hand(cards, { holeCards, street })` | A lazy, chainable view; see [Fast, lazy analysis](#fast-lazy-analysis) |
| `classifyRange(cards, holeCards, range, { street })` | `{ boardBlocks, heroBlocks, allBlocks }` |
| `parseRange(range)` | Exact combos |
| `compareHands(handA, handB, board)` | `1`, `-1` or `0` |
| `equity(hero, villain, board, { deadCards, iterations })` | `Promise<{ win, tie, lose, equity }>` |
| `board(cards, { street })` | A board to classify combos on; see [Core API](#core-api) |
| `FLAGS`, `hasFlag(lo, hi, flag)`, `cardIndex(card)`, `cardString(n)` | Core API helpers |

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

Everything runs on integer cards and four 13-bit suit masks. The best five is built from the hand's shape (no search), flags are bit operations, and the objects are built at the end with lazy card lists. Hands are scored with poker-bitvaljs's fast evaluator. In `analyzeHand`, scores on each runout board are cached by rank class: unless a flush is possible, two hands with the same ranks score the same. Ranges parsed recently are remembered.

Times on one machine (Node 22), steady state, against 5.2.0 on the same machine. `npm run benchmark` prints the 6.0 timings first.

| Call | 5.2.0 | 6.0 | Faster |
| --- | --- | --- | --- |
| `evaluate`, 7 cards | 19 µs | 1.6 µs | 11.6× |
| `evaluateHand`, 7 cards, strict | 15 µs | 2.0 µs | 7.7× |
| `evaluateHand`, 6 cards, strict | 13 µs | 1.9 µs | 7.1× |
| `evaluateHand`, 5 cards, strict | 8.3 µs | 1.6 µs | 5.1× |
| `evaluateHand`, 7 cards, then read `keyCards` | 33 µs | 7.3 µs | 4.4× |
| `evaluateHand`, 7 cards, non-strict (21 combinations) | 121 µs | 20 µs | 6.0× |
| `analyzeHand`, flop, outs only | 1.4 ms | 0.19 ms | 7.4× |
| `analyzeHand`, flop against 950 villain combos, every field | 38 ms | 10 ms | 3.7× |
| `analyzeHand`, turn against 950 villain combos, every field | 6.4 ms | 1.6 ms | 3.9× |
| `classifyRange`, turn, 950 combos | 3.2 ms | 0.44 ms | 7.3× |
| Core: `board().classifyAll`, turn, per combo | – | 0.12 µs | – |
| Core: `board().classify`, turn | – | 0.40 µs | – |

Reading `keyCards` or `kickerCards` adds about 5 µs to a 7-card evaluation, the first time.

## Upgrading from 5.x

Apart from five new draw flags, version 6 returns exactly what 5.2.0 returns: the same keys, values and property order, the same errors word for word, and the same lazy card lists. This was checked on hundreds of thousands of random hands, strict and non-strict, with and without hole cards, villain ranges and streets, and on 1,000 `analyzeHand` spots. The differences:

- **Straight draw outs:** an out counts only when its straight beats the board's own straight with the same card (see [Draws](#draws)), so a few draws 5.2 reported, such as 4-2 on 7-9-6-8, are gone. This changes about 0.2% of random hands.
- **New draw flags:** `isNutFlushDraw`, `isNutBackdoorFlushDraw`, `isDoubleGutshot`, `isBackdoorStraightDraw` and `isBackdoorComboDraw` (see [Draws](#draws)). Each evaluation, its `keyCards` and `kickerCards`, and `villainRange`'s `blocked` groups have the five extra keys, placed beside the draws they refine. Code that lists every key (snapshots, `Object.keys` checks) sees them; nothing else changes.
- **ES-module builds:** `import` gets `dist/poker-extval.mjs`, which imports poker-bitvaljs and poker-rangeman so apps share one copy; `dist/poker-extval.bundle.mjs` has both built in ([see above](#in-the-browser-without-a-bundler)). In 6.0.0-beta.1, `poker-extval.mjs` was the self-contained file; it is now `poker-extval.bundle.mjs`. The package now has an `exports` map, so only the package itself, `dist/*` and `package.json` can be imported; files under `src/` can no longer be required directly.
- **Dependencies:** poker-bitvaljs 1.12 (with its own ES-module entry). poker-rangeman 4 (4.0.0-beta.7 or later) is now a peer dependency, so extval always shares the app's copy; npm reports a conflict for an app still on rangeman 3.
- **New:** the [core API](#core-api) (`board`, `FLAGS`, `hasFlag`, `cardIndex`, `cardString`).
- **Computed up front:** `usesHoleCards` and `evaluate()`'s `rank` are cheap now, so they are plain values rather than lazy properties. Their values are unchanged.
- **Hidden state:** evaluation objects keep their lazy state under a non-enumerable symbol. `JSON.stringify`, `Object.keys`, spread, `structuredClone` and equality checks never see it; `Reflect.ownKeys` does.
- **Range cache:** `parseRange` remembers the last 64 ranges it parsed. It still returns a new array every time.
- **Internals removed:** `src/analyze.js` is gone, and `src/score.js` keeps only `scoreCards` and `compareScores`.

## Testing

```bash
npm test
```

Runs the Jest suite (nearly 900 tests) and type-checks `index.d.ts`. Alongside the per-hand tests, the suite checks strict mode's best hand, every draw, and hand ranks against independent reference implementations on random hands.

```bash
npm run test:browser
```

Bundles the package for the browser with esbuild, runs every public function in headless Chromium, and checks the results match Node. It also loads `dist/poker-extval.mjs` into a plain page with `<script type="module">` and no bundler, and checks that against Node too. It builds `dist/` first and needs a Playwright Chromium (`npx playwright-core install chromium`).

## Releasing

Pushing to `main` publishes to npm via GitHub Actions (`.github/workflows/publish.yml`), using npm trusted publishing so no token is stored. A push publishes only when it changes the package's code (`evaluator.js`, `src/`, `index.d.ts`) or `package.json`; changes to docs or tests alone do not. A release runs the tests, builds `dist/` (the `prepack` script), bumps the patch version (unless `package.json` already holds a version that is not on npm yet, e.g. a manual `npm version minor --no-git-tag-version`), commits the bump back to `main`, tags it `v<version>` and publishes. The workflow can also be started by hand from the Actions tab.

Prereleases come from the `rewrite/v6` branch the same way. Its versions are prereleases such as `6.0.0-beta.0`; each release bumps the last number and publishes under npm's `next` tag, so `npm install poker-extval` still installs the latest release from `main`. The workflow refuses a release version on a prerelease branch, and a prerelease version on `main`.

Tests run on every push and pull request (`.github/workflows/test.yml`) on each supported Node version, plus the browser test in headless Chromium.

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
