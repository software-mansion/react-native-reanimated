const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getModuleBlocklist } = require('../../scripts/metro-blocklist');

const path = require('path');

const modulesToBlock = ['react', 'react-native'];
const monorepoRoot = path.resolve(__dirname, '../..');

const blockList = getModuleBlocklist(modulesToBlock);

const defaultConfig = getDefaultConfig(__dirname);

const appsPath = path.resolve(monorepoRoot, 'apps');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  watchFolders: [monorepoRoot, appsPath],
  resolver: {
    blockList: [...blockList.concat(defaultConfig.resolver.blockList)],

    extraNodeModules: modulesToBlock.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, /** @type {{ [key: string]: string }} */ ({})),
  },
};

config = mergeConfig(getDefaultConfig(__dirname), config);

// Uncomment the following to enable bundle mode.
// const { bundleModeMetroConfig } = require('react-native-worklets/bundleMode');
// config = mergeConfig(config, bundleModeMetroConfig);

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
