/**
 * The two packages extval builds on, loaded in one place: poker-bitvaljs (hand scores and equity)
 * and poker-rangeman (range notation).
 *
 * The ES-module build (scripts/build-esm.js) swaps this file for scripts/deps.esm.js, which
 * imports both packages instead, so apps share one copy of each with extval.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const BitVal = require('poker-bitvaljs');

let RangeManager = null;

/**
 * Loads poker-rangeman on first use. It is an ES module: bundlers include it as usual, and Node
 * 20.19+ / 22.13+ can require() it.
 *
 * @returns {Function} The RangeManager class
 * @throws {Error} On a Node version that cannot require() ES modules
 */
function loadRangeManager() {
  if (!RangeManager) {
    try {
      ({ RangeManager } = require('poker-rangeman'));
    } catch (error) {
      throw new Error(`Ranges need a bundler or Node.js 20.19+ / 22.13+ to load poker-rangeman: ${error.message}`);
    }
  }
  return RangeManager;
}

module.exports = { BitVal, loadRangeManager };
