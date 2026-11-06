// The ES-module build's stand-in for src/deps.js: the same exports, from real imports, so
// bundlers and import maps give extval the app's own copies of both packages.
import BitVal from 'poker-bitvaljs';
import { RangeManager } from 'poker-rangeman';

export { BitVal };
export function loadRangeManager() {
  return RangeManager;
}
