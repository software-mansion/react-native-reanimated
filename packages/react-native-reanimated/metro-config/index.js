const path = require('node:path');

const WINDOWS_JS_FALLBACK_PACKAGE_ROOTS = [
  path.dirname(__dirname),
  path.dirname(require.resolve('react-native-worklets/package.json')),
];

function shouldUseWindowsJsFallback(context, moduleName, platform) {
  return (
    platform === 'windows' &&
    moduleName.startsWith('.') &&
    WINDOWS_JS_FALLBACK_PACKAGE_ROOTS.some((packageRoot) =>
      context.originModulePath.startsWith(`${packageRoot}${path.sep}`)
    )
  );
}

const COLLAPSED_STACK_REGEX = new RegExp(
  [
    // For internal usage in the example app
    '/packages/react-native-reanimated/.+\\.(t|j)sx?$',
    // When reanimated is installed as a dependency (node_modules)
    '/node_modules/react-native-reanimated/.+\\.(t|j)sx?$',
  ]
    // Make patterns work with both Windows and POSIX paths.
    .map((pathPattern) => pathPattern.replaceAll('/', '[/\\\\]'))
    .join('|')
);

/**
 * @param {import('@react-native/metro-config').MetroConfig} config
 * @returns {import('@react-native/metro-config').MetroConfig}
 */
function wrapWithReanimatedMetroConfig(config) {
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(context, moduleName, platform) {
        const resolve =
          config.resolver?.resolveRequest ?? context.resolveRequest;

        // Keep `.windows` resolution, but skip unsupported `.native` modules.
        const resolutionContext = shouldUseWindowsJsFallback(
          context,
          moduleName,
          platform
        )
          ? { ...context, preferNativePlatform: false }
          : context;

        return resolve(resolutionContext, moduleName, platform);
      },
    },
    symbolicator: {
      async customizeFrame(frame) {
        const collapse = Boolean(
          // Collapse the stack frame based on user's config symbolicator settings
          (await config?.symbolicator?.customizeFrame?.(frame))?.collapse ||
          // or, if not already collapsed, collapse the stack frame with path
          // to react-native-reanimated source code
          (frame.file && COLLAPSED_STACK_REGEX.test(frame.file))
        );
        return {
          collapse,
        };
      },
    },
  };
}

module.exports = {
  wrapWithReanimatedMetroConfig,
};
