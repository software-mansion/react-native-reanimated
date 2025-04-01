const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const {
  getMetroAndroidAssetsResolutionFix,
  // @ts-ignore react-native-monorepo-tools doesn't have types.
} = require('react-native-monorepo-tools');
const androidAssetsResolutionFix = getMetroAndroidAssetsResolutionFix();
const { cwd } = require('process');
const { rmSync, writeFileSync } = require('fs');

const path = require('path');

const root = path.resolve(__dirname, '../..');

const filePath = path.resolve(cwd(), 'assets/generatedWorklets.js');

rmSync(filePath, { force: true });
writeFileSync(filePath, 'export const code = ""');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  transformer: {
    publicPath: androidAssetsResolutionFix.publicPath,
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return androidAssetsResolutionFix.applyMiddleware(middleware);
    },
  },
  resolver: {
    assetExts: ['txt', 'jpg', 'png', 'gif', 'jpeg', 'svg'],
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
