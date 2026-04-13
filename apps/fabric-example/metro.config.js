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
/** Do not remove 'apps' from watchFolders, as it's required to resolve assets. */
const appsRoot = path.resolve(monorepoRoot, 'apps');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  projectRoot: __dirname,
  watchFolders: [monorepoRoot, appsRoot],
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
