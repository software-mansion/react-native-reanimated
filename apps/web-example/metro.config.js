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

const config = getDefaultConfig(projectRoot);
// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];
// 2. Let Metro know where to resolve packages and in what order
// @ts-expect-error
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

const modulesToBlock = ['@react-native'];

// @ts-expect-error
config.resolver.blacklistRE = exclusionList(
  modulesToBlock.map(
    (m) =>
      new RegExp(`^${escape(path.join(monorepoRoot, 'node_modules', m))}\\/.*$`)
  )
);

// @ts-expect-error
module.exports = wrapWithReanimatedMetroConfig(config);
