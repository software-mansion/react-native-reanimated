/* THIS FILE WAS ENTIRELY AI GENERATED. */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const PACKAGES = [
  'docs/docs-reanimated/package.json',
  'docs/docs-worklets/package.json',
];
const SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies'];

const parsed = PACKAGES.map((relativePath) => ({
  relativePath,
  pkg: JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')),
}));

const mismatches = [];

for (const section of SECTIONS) {
  const allNames = new Set();
  for (const { pkg } of parsed) {
    if (pkg[section]) {
      for (const name of Object.keys(pkg[section])) {
        allNames.add(name);
      }
    }
  }

  for (const name of allNames) {
    const versions = parsed
      .filter(({ pkg }) => pkg[section] && pkg[section][name] !== undefined)
      .map(({ relativePath, pkg }) => ({
        relativePath,
        version: pkg[section][name],
      }));

    // Only validate dependencies declared in more than one package — extras are allowed.
    if (versions.length < 2) {
      continue;
    }

    const distinct = new Set(versions.map((v) => v.version));
    if (distinct.size > 1) {
      mismatches.push({ section, name, versions });
    }
  }
}

if (mismatches.length > 0) {
  console.log(
    'Mismatched dependency versions across docs packages:\n' +
      PACKAGES.map((p) => `  - ${p}`).join('\n') +
      '\n'
  );
  for (const { section, name, versions } of mismatches) {
    console.log(`  ${section} > ${name}`);
    for (const { relativePath, version } of versions) {
      console.log(`    ${relativePath}: ${version}`);
    }
  }
  console.log(
    '\nError: dependencies shared across docs packages must use identical versions.'
  );
  process.exit(1);
}
