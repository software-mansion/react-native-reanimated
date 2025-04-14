const { exec } = require('shelljs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const {
  getMetroAndroidAssetsResolutionFix,
  // @ts-ignore react-native-monorepo-tools doesn't have types.
} = require('react-native-monorepo-tools');
const androidAssetsResolutionFix = getMetroAndroidAssetsResolutionFix();
const path = require('path');

const root = path.resolve(__dirname, '../..');

let hasInitialized = false;

function initialize() {
  exec(
    'yarn react-native bundle --reset-cache --entry-file index.js  --bundle-output /dev/null --dev true --platform ios --minify false'
  );
}

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
  serializer: {
    getModulesRunBeforeMainModule() {
      return [require.resolve('react-native-worklets/src/index.ts')];
    },
    createModuleIdFactory() {
      let nextId = 0;
      const idFileMap = new Map();
      return (ppath) => {
        if (idFileMap.has(ppath)) {
          return idFileMap.get(ppath);
        }
        if (ppath.includes('react-native-worklets/generated/')) {
          const base = path.basename(ppath, '.js');
          const id = Number(base);
          idFileMap.set(ppath, id);
          return id;
        }
        idFileMap.set(ppath, nextId++);
        return idFileMap.get(ppath);
      };
    },
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return androidAssetsResolutionFix.applyMiddleware(middleware);
    },
    rewriteRequestUrl: (url) => {
      // To get the whole bundle on initial load.
      if (!hasInitialized) {
        initialize();
        hasInitialized = true;
      }

      return url;
    },
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config)
);
