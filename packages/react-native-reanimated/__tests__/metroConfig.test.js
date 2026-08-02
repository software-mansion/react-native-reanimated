const path = require('node:path');

const { wrapWithReanimatedMetroConfig } = require('../metro-config');

const RESOLUTION = {
  type: 'sourceFile',
  filePath: 'resolved.js',
};

function createContext(originModulePath) {
  return {
    originModulePath,
    preferNativePlatform: true,
    resolveRequest: jest.fn(() => RESOLUTION),
  };
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
      const resolveRequest = jest.fn(() => RESOLUTION);
      const config = wrapWithReanimatedMetroConfig({
        resolver: { resolveRequest },
      });
      const context = createContext(originModulePath);

      const result = config.resolver.resolveRequest(
        context,
        './NativeModule',
        'windows'
      );

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
    const resolveRequest = jest.fn(() => RESOLUTION);
    const config = wrapWithReanimatedMetroConfig({
      resolver: { resolveRequest },
    });
    const context = createContext(
      path.resolve(__dirname, '../src/ReanimatedModule/index.ts')
    );

    config.resolver.resolveRequest(context, moduleName, platform);

    expect(resolveRequest.mock.calls[0][0]).toBe(context);
  });

  test('does not alter Windows imports outside Reanimated and Worklets', () => {
    const resolveRequest = jest.fn(() => RESOLUTION);
    const config = wrapWithReanimatedMetroConfig({
      resolver: { resolveRequest },
    });
    const context = createContext(
      path.resolve(__dirname, '../../../app/index.ts')
    );

    config.resolver.resolveRequest(context, './NativeModule', 'windows');

    expect(resolveRequest.mock.calls[0][0]).toBe(context);
  });

  test('delegates to Metro when no custom resolver is configured', () => {
    const config = wrapWithReanimatedMetroConfig({ resolver: {} });
    const context = createContext(
      path.resolve(__dirname, '../src/ReanimatedModule/index.ts')
    );

    const result = config.resolver.resolveRequest(
      context,
      './NativeModule',
      'windows'
    );

    expect(result).toBe(RESOLUTION);
    expect(context.resolveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ preferNativePlatform: false }),
      './NativeModule',
      'windows'
    );
  });
});
