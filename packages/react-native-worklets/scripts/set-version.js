const path = require('path');
const { getVersion } = require('../../../scripts/releasing');
const { updateVersion } = require('../../../scripts/version-utils');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const jsVersionPath = path.resolve(__dirname, '../src/debug/jsVersion.ts');

if (!process.argv.includes('--package-json-path')) {
  process.argv.push('--package-json-path', packageJsonPath);
}

const { currentVersion, newVersion } = getVersion(process.argv);

updateVersion(packageJsonPath, jsVersionPath, newVersion);

// Log the current version so it can be restored if needed.
console.log(currentVersion);
