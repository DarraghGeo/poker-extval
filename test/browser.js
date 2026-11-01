// Browser test: bundles the package for the browser with esbuild, runs test/browser-checks.js in
// headless Chromium, and compares the results with the same checks run in Node.
// Run with `npm run test:browser` (needs a Playwright Chromium: `npx playwright-core install chromium`).
const path = require('path');
const assert = require('assert');
const esbuild = require('esbuild');
const { chromium } = require('playwright-core');
const browserChecks = require('./browser-checks');

const root = path.resolve(__dirname, '..');

async function main() {
  const expected = await browserChecks(require(root));
  for (const [name, value] of Object.entries(expected)) {
    if (name !== 'invalidRange' && typeof value === 'string' && value.startsWith('ERROR')) {
      throw new Error(`${name} failed in Node: ${value}`);
    }
  }

  const { outputFiles } = await esbuild.build({
    stdin: {
      contents: "const checks = require('./test/browser-checks'); checks(require('poker-extval')).then(r => { window.__results = r; }, e => { window.__results = { fatal: e.message }; });",
      resolveDir: root
    },
    bundle: true,
    platform: 'browser',
    format: 'iife',
    write: false,
    alias: { 'poker-extval': root },
    logLevel: 'silent'
  });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: outputFiles[0].text });
    await page.waitForFunction(() => window.__results, null, { timeout: 60000 });
    const actual = await page.evaluate(() => window.__results);
    assert.deepStrictEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
    assert.deepStrictEqual(actual, expected);
    console.log(`Browser test passed: ${Object.keys(expected).length} checks match Node in ${browser.version()}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
