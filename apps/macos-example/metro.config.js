const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const path = require('path');
// @ts-expect-error
const exclusionList = require('metro-config/src/defaults/exclusionList');
const escape = require('escape-string-regexp');
const pack = require('../../packages/react-native-reanimated/package.json');

const root = path.resolve(__dirname, '../..');

const modules = [...Object.keys(pack.peerDependencies), 'react-native-macos'];

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  projectRoot: __dirname,
  watchFolders: [root],

  // We need to make sure that only one version is loaded for peerDependencies
  // So we exclude them at the root, and alias them to the versions in example's node_modules
  resolver: {
    blacklistRE: exclusionList(
      modules.map(
        (m) =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
      )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      // @ts-expect-error
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
