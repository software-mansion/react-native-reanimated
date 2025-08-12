'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverGte = require('semver/functions/gte');
const semverLte = require('semver/functions/lte');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const jsVersion = packageJson.version;
const compatibilityFile = require('../compatibility.json');

const reactNativeVersion = process.argv[2];

const supportedRNVersions = [];

for (const key in compatibilityFile) {
  if (key.includes('–')) {
    let min = key.split(' –')[0];
    let max = key.split(' –')[1];
    if (min.includes('x')) {
        min = min.replace('x', '0');
    }
    if (max.includes('x')) {
        max = max.replace('x', '1000');
    }
    if (semverGte(jsVersion, min) && semverLte(jsVersion, max)) {
      // @ts-ignore
      supportedRNVersions.push(...compatibilityFile[key]['react-native']);
    }
  } else if (semverSatisfies(jsVersion, key)) {
    // @ts-ignore
    supportedRNVersions.push(...compatibilityFile[key]['react-native']);
  }
}

if (supportedRNVersions.length === 0) {
  process.exit(0);
}

for (const version of supportedRNVersions) {
  if (semverSatisfies(reactNativeVersion, `${version}.x`)) {
    process.exit(0);
  }
}

// eslint-disable-next-line reanimated/use-logger
console.error(`[Reanimated] React Native ${reactNativeVersion} version is not compatible with Reanimated ${jsVersion}`);
process.exit(1);
