import path from 'path';

import { getBundleModeMetroConfig } from '../bundleMode';

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
});
