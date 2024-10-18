const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const path = require('path');

const root = path.resolve(__dirname, '../..');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
};

module.exports = wrapWithReanimatedMetroConfig(
  // @ts-expect-error Should be fixed with https://github.com/facebook/react-native/pull/46602
  mergeConfig(getDefaultConfig(__dirname), config)
);
