const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getMonorepoMetroOptions } = require('../../scripts/metro');
const path = require('path');

const modulesToFilter = ['react', 'react-native', 'react-native-macos'];
const defaultConfig = getDefaultConfig(__dirname);
const { blockList, extraNodeModules } = getMonorepoMetroOptions(
  modulesToFilter,
  __dirname,
  // @ts-expect-error Metro types differ for macOS
  defaultConfig
);

const monorepoRoot = path.resolve(__dirname, '../..');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot: __dirname,
  watchFolders: [monorepoRoot],

  // We need to make sure that only one version is loaded for peerDependencies
  // So we exclude them at the root, and alias them to the versions in example's node_modules
  resolver: {
    blockList,
    extraNodeModules,
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config)
);
