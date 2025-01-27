const { getDefaultConfig } = require('expo/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const escape = require('escape-string-regexp');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../..');
const libraryRoot = path.resolve(monorepoRoot, './packages/react-native-reanimated');

const config = getDefaultConfig(projectRoot);
// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot, libraryRoot];
// 2. Let Metro know where to resolve packages and in what order
// @ts-expect-error
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-reanimated': path.resolve(libraryRoot, 'src'),
};

const hasReactNative = require.resolve('react-native/package.json', {
  paths: [projectRoot],
});
if (!hasReactNative) {
  const modulesToBlock = ['@react-native'];
  // @ts-expect-error
  config.resolver.blacklistRE = exclusionList(
    modulesToBlock.map(
      (m) =>
        new RegExp(
          `^${escape(path.join(monorepoRoot, 'node_modules', m))}\\/.*$`
        )
    )
  );
}

module.exports = wrapWithReanimatedMetroConfig(config);
