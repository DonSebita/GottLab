#!/usr/bin/env node
// Post-install: fix iceberg-js missing ESM build
// iceberg-js@0.8.1 is missing dist/index.mjs — patch exports to use CJS

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'node_modules', 'iceberg-js', 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('[postinstall] iceberg-js not found — skipping');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let changed = false;

if (pkg.exports?.['.']?.import?.default !== './dist/index.cjs') {
  pkg.exports['.'].import.default = './dist/index.cjs';
  changed = true;
}
if (pkg.exports?.['.']?.default !== './dist/index.cjs') {
  pkg.exports['.'].default = './dist/index.cjs';
  changed = true;
}
if (pkg.module !== './dist/index.cjs') {
  pkg.module = './dist/index.cjs';
  changed = true;
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('[postinstall] iceberg-js ESM exports patched → CJS');
} else {
  console.log('[postinstall] iceberg-js already patched');
}
