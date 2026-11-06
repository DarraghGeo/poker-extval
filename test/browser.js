// Browser test: runs test/browser-checks.js in headless Chromium three ways, and compares the
// results with the same checks run in Node:
// - bundled: the package bundled for the browser with esbuild, as an app would use it;
// - import map: dist/poker-extval.mjs, which imports poker-bitvaljs and poker-rangeman by name,
//   in a plain <script type="module"> page whose import map points at those packages;
// - self-contained: dist/poker-extval.bundle.mjs in a plain page, with no import map.
// Run with `npm run test:browser`, which builds dist/ first (needs a Playwright Chromium:
// `npx playwright-core install chromium`).
const fs = require('fs');
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
    const bundled = await runPage(browser, page => page.addScriptTag({ content: outputFiles[0].text }));
    assert.deepStrictEqual(bundled, expected);
    console.log(`Browser test passed (bundled): ${Object.keys(expected).length} checks match Node in ${browser.version()}`);

    const withImportMap = await runPage(browser, page => servePage(page, 'poker-extval.mjs', {
      'poker-bitvaljs': '/node_modules/poker-bitvaljs/bitval.mjs',
      'poker-rangeman': '/node_modules/poker-rangeman/src/rangeManager.js'
    }), false);
    assert.deepStrictEqual(withImportMap, expected);
    console.log(`Browser test passed (import map, dist/poker-extval.mjs): ${Object.keys(expected).length} checks match Node`);

    const selfContained = await runPage(browser, page => servePage(page, 'poker-extval.bundle.mjs', null), false);
    assert.deepStrictEqual(selfContained, expected);
    console.log(`Browser test passed (no import map, dist/poker-extval.bundle.mjs): ${Object.keys(expected).length} checks match Node`);
  } finally {
    await browser.close();
  }
}

/**
 * Serves a page that imports dist/<file> and runs the checks, from a made-up origin, with the
 * package's own files (dist/, node_modules/) behind it and an optional import map.
 */
async function servePage(page, file, importMap) {
  const origin = 'http://extval.test';
  const checks = `const module = {};\n${fs.readFileSync(path.join(__dirname, 'browser-checks.js'), 'utf8')}\nexport default module.exports;`;
  const map = importMap ? `<script type="importmap">${JSON.stringify({ imports: importMap })}</script>` : '';
  const html = `<!doctype html><html><head>${map}</head><body><script type="module">
    import * as lib from './dist/${file}';
    import checks from './checks.mjs';
    checks(lib).then(r => { window.__results = r; }, e => { window.__results = { fatal: e.message }; });
  </script></body></html>`;
  await page.route(`${origin}/**`, route => {
    const url = new URL(route.request().url()).pathname;
    if (url === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (url === '/checks.mjs') return route.fulfill({ contentType: 'text/javascript', body: checks });
    const local = path.join(root, decodeURIComponent(url));
    if ((url.startsWith('/dist/') || url.startsWith('/node_modules/')) && local.startsWith(root) && fs.existsSync(local)) {
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(local, 'utf8') });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });
  await page.goto(`${origin}/`);
}

/** Opens a page, loads the checks with `load`, and returns their results. */
async function runPage(browser, load, blank = true) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  if (blank) await page.setContent('<!doctype html><html><body></body></html>');
  await load(page);
  await page.waitForFunction(() => window.__results, null, { timeout: 60000 });
  const results = await page.evaluate(() => window.__results);
  assert.deepStrictEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  await page.close();
  return results;
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
