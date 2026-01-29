const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getMonorepoMetroOptions } = require('../../scripts/metro');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { blockList, extraNodeModules } = getMonorepoMetroOptions(
  [],
  __dirname,
  defaultConfig
);

const monorepoRoot = path.resolve(__dirname, '../..');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  projectRoot: __dirname,
  watchFolders: [monorepoRoot],
  resolver: {
    blockList,
    extraNodeModules,
  },
};

config = mergeConfig(defaultConfig, config);

// Uncomment the following to enable bundle mode.
// const { bundleModeMetroConfig } = require('react-native-worklets/bundleMode');
// config = mergeConfig(config, bundleModeMetroConfig);

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config)
);
