const path = require('node:path');

const { wrapWithReanimatedMetroConfig } = require('../metro-config');

/** @typedef {import('metro-resolver').CustomResolver} CustomResolver */
/** @typedef {import('metro-resolver').CustomResolutionContext} CustomResolutionContext */

/** @type {import('metro-resolver').Resolution} */
const RESOLUTION = {
  type: 'sourceFile',
  filePath: 'resolved.js',
};

/** @returns {jest.Mock<ReturnType<CustomResolver>, Parameters<CustomResolver>>} */
function createResolver() {
  return jest.fn(/** @type {CustomResolver} */ (() => RESOLUTION));
}

/**
 * @param {string} originModulePath
 * @returns {{
 *   originModulePath: string;
 *   preferNativePlatform: boolean;
 *   resolveRequest: ReturnType<typeof createResolver>;
 * }}
 */
function createContext(originModulePath) {
  return {
    originModulePath,
    preferNativePlatform: true,
    resolveRequest: createResolver(),
  };
}

/**
 * Calls the resolver of a config returned by `wrapWithReanimatedMetroConfig`.
 *
 * @param {import('@react-native/metro-config').MetroConfig} config
 * @param {ReturnType<typeof createContext>} context
 * @param {string} moduleName
 * @param {string} platform
 * @returns {import('metro-resolver').Resolution}
 */
function resolve(config, context, moduleName, platform) {
  const resolveRequest = config.resolver?.resolveRequest;
  if (!resolveRequest) {
    throw new Error('[Reanimated] The wrapped config has no resolveRequest.');
  }
  return resolveRequest(
    /** @type {CustomResolutionContext} */ (/** @type {unknown} */ (context)),
    moduleName,
    platform
  );
}

describe('wrapWithReanimatedMetroConfig', () => {
  test.each([
    ['Reanimated', path.resolve(__dirname, '../src/ReanimatedModule/index.ts')],
    [
      'Worklets',
      path.resolve(
        __dirname,
        '../../react-native-worklets/src/WorkletsModule/NativeWorklets.ts'
      ),
    ],
  ])(
    'uses the JavaScript fallback for internal %s imports on Windows',
    (_, originModulePath) => {
      const resolveRequest = createResolver();
      const config = wrapWithReanimatedMetroConfig({
        resolver: { resolveRequest },
      });
      const context = createContext(originModulePath);

      const result = resolve(config, context, './NativeModule', 'windows');

      expect(result).toBe(RESOLUTION);
      expect(resolveRequest).toHaveBeenCalledWith(
        expect.objectContaining({ preferNativePlatform: false }),
        './NativeModule',
        'windows'
      );
      expect(context.preferNativePlatform).toBe(true);
    }
  );

  test.each([
    ['a non-Windows platform', 'android', './NativeModule'],
    ['a package import', 'windows', 'react-native-worklets'],
  ])('keeps the original context for %s', (_, platform, moduleName) => {
    const resolveRequest = createResolver();
    const config = wrapWithReanimatedMetroConfig({
      resolver: { resolveRequest },
    });
    const context = createContext(
      path.resolve(__dirname, '../src/ReanimatedModule/index.ts')
    );

    resolve(config, context, moduleName, platform);

    expect(resolveRequest.mock.calls[0][0]).toBe(context);
  });

  test('does not alter Windows imports outside Reanimated and Worklets', () => {
    const resolveRequest = createResolver();
    const config = wrapWithReanimatedMetroConfig({
      resolver: { resolveRequest },
    });
    const context = createContext(
      path.resolve(__dirname, '../../../app/index.ts')
    );

    resolve(config, context, './NativeModule', 'windows');

    expect(resolveRequest.mock.calls[0][0]).toBe(context);
  });

  test('delegates to Metro when no custom resolver is configured', () => {
    const config = wrapWithReanimatedMetroConfig({ resolver: {} });
    const context = createContext(
      path.resolve(__dirname, '../src/ReanimatedModule/index.ts')
    );

    const result = resolve(config, context, './NativeModule', 'windows');

    expect(result).toBe(RESOLUTION);
    expect(context.resolveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ preferNativePlatform: false }),
      './NativeModule',
      'windows'
    );
  });
});
