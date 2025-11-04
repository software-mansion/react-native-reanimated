const { getDefaultConfig } = require('expo/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const path = require('path');
const escape = require('escape-string-regexp');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);
// 1. Watch all files within the monorepo
// @ts-expect-error TODO: overhaul this config at some point
defaultConfig.watchFolders = [monorepoRoot];
// 2. Let Metro know where to resolve packages and in what order
// @ts-expect-error
defaultConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

const hasReactNative = require.resolve('react-native/package.json', {
  paths: [projectRoot],
});
if (!hasReactNative) {
  const modulesToBlock = ['@react-native'];
  // @ts-expect-error
  defaultConfig.resolver.blacklistRE = [
    ...modulesToBlock.map(
      (m) =>
        new RegExp(
          `^${escape(path.join(monorepoRoot, 'node_modules', m))}\\/.*$`
        )
    ),
  ].concat(defaultConfig.resolver?.blockList ?? []);
}

module.exports = wrapWithReanimatedMetroConfig(defaultConfig);
