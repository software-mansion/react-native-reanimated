const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getMonorepoMetroOptions } = require('../../scripts/metro');
const { toNormalUrl } = require('jsc-safe-url');
const {
  default: baseJSBundle,
} = require('metro/private/DeltaBundler/Serializers/baseJSBundle');
const { default: bundleToString } = require('metro/private/lib/bundleToString');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { blockList, extraNodeModules } = getMonorepoMetroOptions(
  [],
  __dirname,
  defaultConfig
);

const monorepoRoot = path.resolve(__dirname, '../..');
/** Do not remove 'apps' from watchFolders, as it's required to resolve assets. */
const appsRoot = path.resolve(monorepoRoot, 'apps');

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const watchFolders = [monorepoRoot, appsRoot];

let config = {
  projectRoot: __dirname,
  watchFolders,
  resolver: {
    blockList,
    extraNodeModules,
  },
  serializer: {
    customSerializer: (entryPoint, preModules, graph, options) =>
      bundleToString(
        baseJSBundle(entryPoint, preModules, graph, {
          ...options,
          unstable_getAsyncDependencyPath: getAsyncDependencyPath,
        })
      ).code,
  },
};

/**
 * Metro emits lazy chunk paths relative to the project root, so a module from
 * `apps/common-app` gets a `/../common-app/...` path that URL parsing
 * normalizes into a request Metro cannot resolve. Pass the same path through
 * the `bundleEntry` query parameter, which Metro reads verbatim.
 */
function getAsyncDependencyPath(dependency, serializerOptions) {
  const { searchParams } = new URL(toNormalUrl(serializerOptions.sourceUrl));
  searchParams.set('modulesOnly', 'true');
  searchParams.set('runModule', 'false');
  const modulePath = dependency.absolutePath.slice(
    0,
    -path.extname(dependency.absolutePath).length
  );
  const bundlePath = `${path.relative(serializerOptions.serverRoot, modulePath)}.bundle`;
  if (bundlePath.startsWith('..')) {
    searchParams.set('bundleEntry', bundlePath);
  }
  return `/${bundlePath}?${searchParams.toString()}`;
}

config = mergeConfig(defaultConfig, config);

const { bundleModeMetroConfig } = require('react-native-worklets/bundleMode');
config = mergeConfig(config, bundleModeMetroConfig);

/** @type {import('@react-native/metro-config').MetroConfig} */
module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config)
);
