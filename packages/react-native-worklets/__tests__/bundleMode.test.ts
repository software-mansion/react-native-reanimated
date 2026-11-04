import path from 'path';

import { bundleModeMetroConfig, getBundleModeMetroConfig } from '../bundleMode';

describe('bundle mode Metro config', () => {
  test('keeps an existing custom resolver', () => {
    const resolveRequest = jest.fn();
    const config = getBundleModeMetroConfig({
      resolver: {
        resolveRequest,
      },
      serializer: {},
      transformer: {},
    });

    expect(config.resolver.resolveRequest).toBe(resolveRequest);
  });

  test('enables virtual modules, which metro:inline worklet modules need', () => {
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

  test('pins the worklets entry point to module id -2', () => {
    const createModuleId =
      bundleModeMetroConfig.serializer.createModuleIdFactory();

    expect(
      createModuleId('/app/node_modules/react-native-worklets/src/index.ts')
    ).toBe(-2);
    expect(createModuleId('/app/App.tsx')).toBe(0);
    expect(createModuleId('/app/App.inline-0123456789abcdef.tsx')).toBe(1);
    expect(createModuleId('/app/App.tsx')).toBe(0);
  });
});
