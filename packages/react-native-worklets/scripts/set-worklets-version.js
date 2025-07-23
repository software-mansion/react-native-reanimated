const path = require('path');
const getVersion = require('../../../scripts/releasing').getVersion;
const { updateVersion } = require('../../../scripts/version-utils');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const jsVersionPath = path.resolve(__dirname, '../src/utils/jsVersion.ts');

const { currentVersion, newVersion } = getVersion(
  process.argv,
  packageJsonPath
);

// Update version using common utility
updateVersion(packageJsonPath, jsVersionPath, newVersion);

// Log the current version so it can be restored if needed.
console.log(currentVersion);
