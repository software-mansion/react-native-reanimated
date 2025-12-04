const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getModuleBlocklist } = require('../../scripts/metro-blocklist');
const path = require('path');

const modulesToBlock = ['react', 'react-native'];
const blockList = getModuleBlocklist(modulesToBlock);

const monorepoRoot = path.resolve(__dirname, '../..');
const appsPath = path.resolve(monorepoRoot, 'apps');

const defaultConfig = getDefaultConfig(__dirname);
/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  projectRoot: __dirname,
  watchFolders: [monorepoRoot, appsPath],
  resolver: {
    blockList: [...blockList.concat(defaultConfig.resolver.blockList)],

    extraNodeModules: modulesToBlock.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, /** @type {{ [key: string]: string }} */ ({})),
  },
};

config = mergeConfig(defaultConfig, config);

// Uncomment the following to enable bundle mode.
// const { bundleModeMetroConfig } = require('react-native-worklets/bundleMode');
// config = mergeConfig(config, bundleModeMetroConfig);

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config)
);
