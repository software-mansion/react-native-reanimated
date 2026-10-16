import path from 'path';

import { bundleModeMetroConfig, getBundleModeMetroConfig } from '../bundleMode';

describe('bundle mode Metro config', () => {
  test('uses existing resolver for non-bundle mode modules', () => {
    const resolveRequest = jest.fn(() => ({
      filePath: '/custom/resolver.js',
      type: 'sourceFile',
    }));
    const context = {};
    const config = getBundleModeMetroConfig({
      resolver: {
        resolveRequest,
      },
      serializer: {},
      transformer: {},
    });

    expect(
      config.resolver.resolveRequest(context, 'some-package', 'ios')
    ).toEqual({
      filePath: '/custom/resolver.js',
      type: 'sourceFile',
    });
    expect(resolveRequest).toHaveBeenCalledWith(context, 'some-package', 'ios');
  });

  test('falls back to context resolver when custom resolver is not provided', () => {
    const resolveRequest = jest.fn(() => ({
      filePath: '/context/resolver.js',
      type: 'sourceFile',
    }));
    const context = { resolveRequest };
    const config = getBundleModeMetroConfig({
      resolver: {},
      serializer: {},
      transformer: {},
    });

    expect(
      config.resolver.resolveRequest(context, 'some-package', 'android')
    ).toEqual({
      filePath: '/context/resolver.js',
      type: 'sourceFile',
    });
    expect(resolveRequest).toHaveBeenCalledWith(
      context,
      'some-package',
      'android'
    );
  });

  test('resolves bundle mode modules before existing resolver', () => {
    const resolveRequest = jest.fn();
    const config = getBundleModeMetroConfig({
      resolver: {
        resolveRequest,
      },
      serializer: {},
      transformer: {},
    });
    const result = config.resolver.resolveRequest(
      {},
      path.join('react-native-worklets', '.worklets', '1.js'),
      'ios'
    );

    expect(result.type).toBe('sourceFile');
    expect(result.filePath.endsWith(path.join('.worklets', '1.js'))).toBe(true);
    expect(resolveRequest).not.toHaveBeenCalled();
  });

  test('keeps existing polyfills and appends the prepareBundleMode polyfill', () => {
    const config = getBundleModeMetroConfig({
      resolver: {},
      serializer: { polyfillModuleNames: ['/custom/polyfill.js'] },
      transformer: {},
    });

    expect(config.serializer.polyfillModuleNames).toHaveLength(2);
    expect(config.serializer.polyfillModuleNames[0]).toBe(
      '/custom/polyfill.js'
    );
    expect(
      config.serializer.polyfillModuleNames[1].endsWith(
        path.join('bundleMode', 'polyfills', 'prepareBundleMode.js')
      )
    ).toBe(true);
  });
});

describe('Bundle Mode shim dependency', () => {
  test.each(['ios', 'android', 'web', 'windows'])(
    'retains the default resolver on %s',
    (platform) => {
      const resolveRequest = jest.fn(() => ({
        type: 'sourceFile',
        filePath: '/platform/react-native.js',
      }));
      const remapper = jest.fn(() => ({
        type: 'sourceFile',
        filePath: '/custom/wrapper.js',
      }));
      const context = {
        originModulePath: '/worklets/shims/reactNativeShim.js',
        resolveRequest,
      };
      const config = getBundleModeMetroConfig({
        resolver: { resolveRequest: remapper },
        serializer: {},
        transformer: {},
      });
      expect(
        config.resolver.resolveRequest(
          context,
          'react-native-worklets/bundleMode/realReactNative',
          platform
        )
      ).toEqual({ type: 'sourceFile', filePath: '/platform/react-native.js' });
      expect(resolveRequest).toHaveBeenCalledWith(
        context,
        'react-native',
        platform
      );
      expect(remapper).not.toHaveBeenCalled();
    }
  );
  test('supports the community helper', () => {
    const resolveRequest = jest.fn(() => ({
      type: 'sourceFile',
      filePath: '/native/index.js',
    }));
    const context = { resolveRequest };
    expect(
      bundleModeMetroConfig.resolver.resolveRequest(
        context,
        'react-native-worklets/bundleMode/realReactNative',
        'ios'
      )
    ).toEqual({ type: 'sourceFile', filePath: '/native/index.js' });
    expect(resolveRequest).toHaveBeenCalledWith(context, 'react-native', 'ios');
  });
});
