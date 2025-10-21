const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const path = require('path');
const escape = require('escape-string-regexp');
const pack = require('../../packages/react-native-reanimated/package.json');

const monorepoRoot = path.resolve(__dirname, '../..');

const modulesToBlock = [
  ...Object.keys(pack.peerDependencies),
  'react-native-macos',
];

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
    blockList: [
      ...modulesToBlock.map(
        (m) =>
          new RegExp(
            `^${escape(path.join(monorepoRoot, 'node_modules', m))}\\/.*$`
          )
      ),
    ].concat(defaultConfig.resolver.blockList),

    extraNodeModules: modulesToBlock.reduce((acc, name) => {
      // @ts-expect-error
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
