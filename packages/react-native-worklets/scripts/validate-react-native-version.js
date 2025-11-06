'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverPrerelease = require('semver/functions/prerelease');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const workletsVersion = packageJson.version;
const compatibilityFile = require('../compatibility.json');

const reactNativeVersion = process.argv[2];
const supportedRNVersions = [];

if (semverPrerelease(reactNativeVersion)) {
  // Don't perform any checks for pre-release versions, like nightlies or
  // feature previews. The user knows what they're doing.
  process.exit(0);
}

for (const key in compatibilityFile) {
  if (semverSatisfies(workletsVersion, key)) {
    // @ts-ignore
    supportedRNVersions.push(...compatibilityFile[key]['react-native']);
  }
}

// If user uses a version of Reanimated that is not listed in the compatibility file, we skip the check
if (supportedRNVersions.length === 0) {
  process.exit(0);
}

for (const version of supportedRNVersions) {
  if (semverSatisfies(reactNativeVersion, `${version}.x`)) {
    process.exit(0);
  }
}

// eslint-disable-next-line reanimated/use-logger
console.error(
  `[Worklets] Your installed version of React Native (${reactNativeVersion}) is not compatible with installed version of Worklets (${workletsVersion}). See the documentation for the list of supported versions: https://docs.swmansion.com/react-native-worklets/docs/guides/compatibility/`
);
process.exit(1);
