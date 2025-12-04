const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getModuleBlocklist } = require('../../scripts/metro-blocklist');
const path = require('path');

const pack = require('../../packages/react-native-reanimated/package.json');
const modulesToBlock = [
  ...Object.keys(pack.peerDependencies),
  'react-native-macos',
];
const blockList = getModuleBlocklist(modulesToBlock);

const monorepoRoot = path.resolve(__dirname, '../..');

const defaultConfig = getDefaultConfig(__dirname);

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
    blockList: [...blockList.concat(defaultConfig.resolver.blockList)],

    extraNodeModules: modulesToBlock.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, /** @type {{ [key: string]: string }} */ ({})),
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config)
);
