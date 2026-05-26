const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getMonorepoMetroOptions } = require('../../scripts/metro');
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

// Temporary: redirect any `react-native-reanimated` import issued from inside
// apps/common-app/runtime-tests/ to a local stub, so the runtime-tests bundle
// never executes reanimated's JS module and the native commit hook is never
// installed. See runtime-tests/reanimated-shim.ts for context. Remove this
// block once the underlying reanimated bug is fixed.
const RUNTIME_TESTS_DIR = path.resolve(monorepoRoot, 'apps/common-app/runtime-tests');
const REANIMATED_SHIM = path.join(RUNTIME_TESTS_DIR, 'reanimated-shim.ts');

const runtimeTestsReanimatedShim = (context, moduleName, platform) => {
  const isReanimatedImport =
    moduleName === 'react-native-reanimated' ||
    moduleName.startsWith('react-native-reanimated/');
  const isFromRuntimeTests =
    typeof context.originModulePath === 'string' &&
    context.originModulePath.startsWith(RUNTIME_TESTS_DIR);
  if (isReanimatedImport && isFromRuntimeTests) {
    return { type: 'sourceFile', filePath: REANIMATED_SHIM };
  }
  return context.resolveRequest(context, moduleName, platform);
};

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  projectRoot: __dirname,
  watchFolders: [monorepoRoot, appsRoot],
  resolver: {
    blockList,
    extraNodeModules,
    // Re-enable this to stub out react-native-reanimated in the runtime-tests
    // bundle (see runtime-tests/reanimated-shim.ts):
    // resolveRequest: runtimeTestsReanimatedShim,
  },
};

config = mergeConfig(defaultConfig, config);

// Uncomment the following to enable bundle mode.
// const { bundleModeMetroConfig } = require('react-native-worklets/bundleMode');
// config = mergeConfig(config, bundleModeMetroConfig);

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config)
);
