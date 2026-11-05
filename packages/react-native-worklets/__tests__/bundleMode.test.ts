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

  test('resolves written worklet modules before existing resolver', () => {
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
      path.posix.join('react-native-worklets', '.worklets', '1.js'),
      'ios'
    );

    expect(result.type).toBe('sourceFile');
    expect(result.filePath.endsWith(path.join('.worklets', '1.js'))).toBe(true);
    expect(resolveRequest).not.toHaveBeenCalled();
  });

  test('enables virtual modules when the installed Metro resolves metro:inline', () => {
    const config = getBundleModeMetroConfig({
      resolver: {},
      serializer: {},
      transformer: {},
    });

    expect(config.resolver.unstable_allowVirtualModules).toBe(true);
    expect(bundleModeMetroConfig.resolver.unstable_allowVirtualModules).toBe(
      true
    );
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

  test('pins the worklets entry point and written worklet modules to their ids', () => {
    const createModuleId =
      bundleModeMetroConfig.serializer.createModuleIdFactory();

    expect(
      createModuleId('/app/node_modules/react-native-worklets/src/index.ts')
    ).toBe(-2);
    expect(
      createModuleId(
        '/app/node_modules/react-native-worklets/.worklets/12345.js'
      )
    ).toBe(12345);
    expect(createModuleId('/app/App.tsx')).toBe(0);
    expect(createModuleId('/app/App.inline-0123456789abcdef.tsx')).toBe(1);
    expect(createModuleId('/app/App.tsx')).toBe(0);
  });
});
