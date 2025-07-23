const path = require('path');
const { getFlags, getVersion } = require('../../../scripts/releasing');
const {
  updateVersion,
  updatePeerDependency,
} = require('../../../scripts/version-utils');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const jsVersionPath = path.resolve(
  __dirname,
  '../src/platform-specific/jsVersion.ts'
);

const { argv } = process;
const { currentVersion, newVersion } = getVersion(argv, packageJsonPath);

// Update version using common utility
updateVersion(packageJsonPath, jsVersionPath, newVersion);

// Handle nightly builds - update peer dependency
if (getFlags(argv).flags.nightly) {
  const workletsPackageJsonPath = path.resolve(
    __dirname,
    '../../react-native-worklets/package.json'
  );
  const { newVersion: newWorkletsVersion } = getVersion(
    argv,
    workletsPackageJsonPath
  );

  updatePeerDependency(
    packageJsonPath,
    'react-native-worklets',
    newWorkletsVersion
  );
}

// Log the current version so it can be restored if needed.
console.log(currentVersion);
