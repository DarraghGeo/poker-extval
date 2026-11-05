// Calls every public function once. test/browser.js runs this in Node and, bundled, in Chromium,
// and checks the two give the same results.
module.exports = async function browserChecks(lib) {
  const results = {};
  const check = async (name, fn) => {
    try {
      results[name] = await fn();
    } catch (error) {
      results[name] = `ERROR: ${error.message}`;
    }
  };
  await check('evaluateHand', () => Object.values(lib.evaluateHand(['As', 'Kd', '8c', '3h', 'Kh'], { holeCards: ['As', 'Kh'] }))[0].isTopPair);
  await check('evaluate', () => lib.evaluate(['4h', '9h', '7h', '8s', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'] }).keyCards.isComboDraw);
  await check('HandEvaluator', () => Object.keys(new lib.HandEvaluator(['2d', '3c', '4h', '5d', '6s', '7c', '8h']).evaluation));
  await check('parseRange', () => lib.parseRange('KQs-K9s,AA,KXo'));
  await check('villainRange', () => lib.evaluate(['Kh', '9h', '4h', '2c', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'], villainRange: 'AQs,AA,JT' }).villainRange);
  await check('classifyRange', () => lib.classifyRange(['Kh', '9h', '4h', '2c', 'Ah', 'Js'], ['Ah', 'Js'], ['AA', 'KQs']));
  await check('compareHands', () => lib.compareHands(['Ah', 'Kd'], ['Qs', 'Qc'], ['Ks', '7h', '2d']));
  await check('equity', () => lib.equity(['Ah', 'Js'], 'KK', ['4h', '9h', '7h']));
  await check('analyzeHand', () => {
    const a = lib.analyzeHand(['4h', '9h', '7h', 'Ah', 'Js'], { holeCards: ['Ah', 'Js'], villainRange: 'KK,QQ' });
    return { outs: a.outs, equity: a.equity, equityNow: a.equityNow, runnerRunnerEquity: a.runnerRunnerEquity, average: a.nextCard.average };
  });
  await check('invalidRange', () => lib.parseRange('AX'));
  return results;
};
