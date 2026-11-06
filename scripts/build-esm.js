/**
 * Builds the ES-module versions of the package:
 *
 * - dist/poker-extval.mjs (and .min.mjs): imports poker-bitvaljs and poker-rangeman by name, so an
 *   app (through its bundler, or an import map) shares one copy of each with extval. This is what
 *   `import ... from 'poker-extval'` gives.
 * - dist/poker-extval.bundle.mjs (and .bundle.min.mjs): both packages built in, for a page that
 *   loads plain ES modules with no bundler and no import map:
 *
 *     <script type="module">
 *       import { evaluate } from './poker-extval.bundle.mjs';
 *     </script>
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

// src/deps.js loads the two packages with require(); the ES-module builds use
// scripts/deps.esm.js, which imports them, instead. (esbuild turns a require() of an external
// package into a shim that throws in browsers; an import stays an import.)
const esmDeps = {
  name: 'esm-deps',
  setup(build) {
    build.onResolve({ filter: /(^|\/)deps$/ }, args => (path.dirname(args.importer).startsWith(path.join(root, 'src'))
      ? { path: path.join(__dirname, 'deps.esm.js') }
      : undefined));
  }
};

const BUILDS = [
  { file: 'poker-extval.mjs', shared: true },
  { file: 'poker-extval.min.mjs', shared: true, minify: true },
  { file: 'poker-extval.bundle.mjs', shared: false },
  { file: 'poker-extval.bundle.min.mjs', shared: false, minify: true }
];

async function main() {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  for (const { file, shared, minify } of BUILDS) {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'esm-entry.js')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      plugins: [esmDeps, skipRangemanImports],
      external: shared ? ['poker-bitvaljs', 'poker-rangeman'] : [],
      minify: !!minify,
      banner: {
        js: shared
          ? `/*! poker-extval ${pkg.version} | MIT | ES module; imports poker-bitvaljs and poker-rangeman */`
          : `/*! poker-extval ${pkg.version} | MIT | ES module with poker-bitvaljs and poker-rangeman built in */`
      },
      outfile: path.join(root, 'dist', file),
      logLevel: 'warning'
    });
  }
  for (const { file } of BUILDS) {
    const { size } = fs.statSync(path.join(root, 'dist', file));
    console.log(`dist/${file}: ${(size / 1024).toFixed(0)} KB`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
