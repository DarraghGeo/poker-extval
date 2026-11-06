/**
 * Builds the ES-module version of the package: dist/poker-extval.mjs (and a minified
 * dist/poker-extval.min.mjs), with poker-bitvaljs and poker-rangeman bundled in, so it can be
 * imported straight from a browser page, without a bundler or import map:
 *
 *   <script type="module">
 *     import { evaluate } from './poker-extval.mjs';
 *   </script>
 *
 * Runs before every `npm pack` / `npm publish` (the prepack script).
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

// poker-rangeman can load poker-extval and poker-bitvaljs itself, with import(), for features
// extval never calls. Leave those imports out: bundling them would pull in rangeman's own copy
// of extval.
const skipRangemanImports = {
  name: 'skip-rangeman-imports',
  setup(build) {
    build.onResolve({ filter: /^poker-(extval|bitvaljs)$/ }, args => (args.kind === 'dynamic-import' ? { path: args.path, external: true } : undefined));
  }
};

async function main() {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const common = {
    entryPoints: [path.join(__dirname, 'esm-entry.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    plugins: [skipRangemanImports],
    banner: { js: `/*! poker-extval ${pkg.version} | MIT | ES-module build with poker-bitvaljs and poker-rangeman */` },
    logLevel: 'warning'
  };
  await esbuild.build({ ...common, outfile: path.join(root, 'dist/poker-extval.mjs') });
  await esbuild.build({ ...common, outfile: path.join(root, 'dist/poker-extval.min.mjs'), minify: true });
  for (const file of ['poker-extval.mjs', 'poker-extval.min.mjs']) {
    const { size } = fs.statSync(path.join(root, 'dist', file));
    console.log(`dist/${file}: ${(size / 1024).toFixed(0)} KB`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
