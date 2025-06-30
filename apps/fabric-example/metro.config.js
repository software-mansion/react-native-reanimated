const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const {
  getMetroAndroidAssetsResolutionFix,
  // @ts-ignore react-native-monorepo-tools doesn't have types.
} = require('react-native-monorepo-tools');
const bundleModeMetroConfig =
  require('react-native-worklets/bundleMode').bundleModeMetroConfig;

const androidAssetsResolutionFix = getMetroAndroidAssetsResolutionFix();

const path = require('path');

const root = path.resolve(__dirname, '../..');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  watchFolders: [root],
  transformer: {
    publicPath: androidAssetsResolutionFix.publicPath,
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return androidAssetsResolutionFix.applyMiddleware(middleware);
    },
  },
};

config = mergeConfig(getDefaultConfig(__dirname), config);

// Uncomment the following to enable bundle mode.
// config = mergeConfig(config, bundleModeMetroConfig);

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
