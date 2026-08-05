const { getDefaultConfig } = require('expo/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const path = require('path');
const Module = require('module');

// Expo SDK 56 imports this removed React Native subpath while preparing web
// polyfills. RN 0.87 moved the same function to @react-native/js-polyfills.
const resolveFilename = Module._resolveFilename;
const reactNativePolyfills = require.resolve('@react-native/js-polyfills');
Module._resolveFilename = function resolveReactNativePolyfills(
  request,
  parent,
  isMain,
  options
) {
  if (request === 'react-native/rn-get-polyfills') {
    return reactNativePolyfills;
  }

  return resolveFilename.call(this, request, parent, isMain, options);
};

const defaultConfig = getDefaultConfig(__dirname);

module.exports = wrapWithReanimatedMetroConfig(defaultConfig);
