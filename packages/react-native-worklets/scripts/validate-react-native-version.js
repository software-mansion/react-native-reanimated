'use strict';

const path = require('path');
const { validateReactNativeVersion } = require('../../../scripts/version-utils');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const workletsVersion = packageJson.version;
const compatibilityFile = require('../compatibility.json');

const reactNativeVersion = process.argv[2];

if (validateReactNativeVersion(workletsVersion, reactNativeVersion, compatibilityFile)) {
  process.exit(0);
}

// eslint-disable-next-line reanimated/use-logger
console.error(`[Worklets] React Native ${reactNativeVersion} version is not compatible with Worklets ${workletsVersion}`);
process.exit(1);
