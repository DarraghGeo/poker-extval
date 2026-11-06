// Entry point of the ES-module build (dist/poker-extval.mjs): every export of evaluator.js as a
// named export, and evaluateHand as the default, as `import` from the CommonJS build gives them.
import lib from '../evaluator.js';

export const {
  evaluateHand, evaluate, analyzeHand, hand, HandEvaluator, classifyRange, parseRange, compareHands, equity,
  board, cardIndex, cardString, FLAGS, hasFlag
} = lib;
export default lib.evaluateHand;
