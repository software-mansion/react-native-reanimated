'use strict';

const fs = require('fs');
const path = require('path');

const ALLOW_CARET_DEPS = new Set([
  'packages/react-native-reanimated/package.json',
  'packages/react-native-worklets/package.json',
]);

/**
 * @param {string} dir
 * @returns {string[]}
 */
function findPackageJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPackageJsonFiles(fullPath));
    } else if (entry.name === 'package.json') {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * @param {{ [s: string]: any }} deps
 * @param {string} sectionName
 * @returns {string[]}
 */
function checkVersions(deps, sectionName) {
  const violations = [];
  for (const [pkg, version] of Object.entries(deps)) {
    if (/^[~^]/.test(version)) {
      violations.push(`  ${sectionName} > ${pkg}: ${version}`);
    }
  }
  return violations;
}

const root = path.resolve(__dirname, '..');
const files = findPackageJsonFiles(root);
let found = false;

for (const file of files) {
  const relativePath = path.relative(root, file);
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const skipDeps = ALLOW_CARET_DEPS.has(relativePath);
  const violations = [];

  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ]) {
    if (!pkg[section]) {
      continue;
    }
    if (section === 'dependencies' && skipDeps) {
      continue;
    }
    violations.push(...checkVersions(pkg[section], section));
  }

  if (violations.length > 0) {
    console.log(`Non-exact version found in: ${relativePath}`);
    for (const v of violations) {
      console.log(v);
    }
    found = true;
  }
}

if (found) {
  console.log(
    'Error: Non-exact versions (tilde ~ or caret ^) detected in package.json files.'
  );
  process.exit(1);
}
