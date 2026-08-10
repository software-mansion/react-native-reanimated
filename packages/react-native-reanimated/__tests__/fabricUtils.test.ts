/* eslint-disable camelcase */
import type { InternalHostInstance } from '../src/commonTypes';
import type * as FabricUtils from '../src/fabricUtils.native';

const REACT_FABRIC_PUBLIC_INSTANCE_PATH =
  'react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance';

const FABRIC_UTILS_PATH = '../src/fabricUtils.native';

jest.mock('react-native/Libraries/Renderer/shims/ReactFabric', () => ({
  findHostInstance_DEPRECATED: jest.fn(),
}));

function requireReactFabric(): { findHostInstance_DEPRECATED: jest.Mock } {
  return jest.requireMock('react-native/Libraries/Renderer/shims/ReactFabric');
}

function makeHostInstance(node: unknown) {
  return { __internalInstanceHandle: { stateNode: { node } } };
}

function requireFabricUtils(): typeof FabricUtils {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(FABRIC_UTILS_PATH);
}

describe('getShadowNodeWrapperFromRef', () => {
  describe('when React Native exposes getNodeFromPublicInstance', () => {
    let getNodeFromPublicInstance: jest.Mock;
    let getShadowNodeWrapperFromRef: typeof FabricUtils.getShadowNodeWrapperFromRef;

    beforeEach(() => {
      jest.resetModules();
      getNodeFromPublicInstance = jest.fn();
      jest.doMock(REACT_FABRIC_PUBLIC_INSTANCE_PATH, () => ({
        getNodeFromPublicInstance,
      }));
      getShadowNodeWrapperFromRef =
        requireFabricUtils().getShadowNodeWrapperFromRef;
    });

    test('prefers the explicitly passed host instance', () => {
      const node = { shadowNode: true };
      const hostInstance = makeHostInstance(node);
      getNodeFromPublicInstance.mockReturnValue(node);

      expect(
        getShadowNodeWrapperFromRef({} as InternalHostInstance, hostInstance)
      ).toBe(node);
      expect(getNodeFromPublicInstance).toHaveBeenCalledWith(hostInstance);
    });

    test('resolves scrollable refs through getNativeScrollRef', () => {
      const node = { shadowNode: true };
      const hostInstance = makeHostInstance(node);
      getNodeFromPublicInstance.mockReturnValue(node);

      const ref = {
        getNativeScrollRef: () => hostInstance,
      } as unknown as InternalHostInstance;

      expect(getShadowNodeWrapperFromRef(ref)).toBe(node);
      expect(getNodeFromPublicInstance).toHaveBeenCalledWith(hostInstance);
    });

    test('falls back to _reactInternals when getNativeScrollRef returns null', () => {
      const node = { shadowNode: true };
      const hostInstance = makeHostInstance(node);
      getNodeFromPublicInstance.mockReturnValue(node);
      requireReactFabric().findHostInstance_DEPRECATED.mockReturnValue(
        hostInstance
      );

      const ref = {
        getNativeScrollRef: () => null,
        _reactInternals: {},
      } as unknown as InternalHostInstance;

      expect(getShadowNodeWrapperFromRef(ref)).toBe(node);
      expect(getNodeFromPublicInstance).toHaveBeenCalledWith(hostInstance);
    });

    test('throws when no shadow node can be resolved', () => {
      getNodeFromPublicInstance.mockReturnValue(null);

      expect(() =>
        getShadowNodeWrapperFromRef(
          {} as InternalHostInstance,
          makeHostInstance(null)
        )
      ).toThrow('[Reanimated] Failed to find shadow node for a ref.');
    });

    test('throws when the ref is neither a host instance nor a React component', () => {
      expect(() =>
        getShadowNodeWrapperFromRef({} as InternalHostInstance)
      ).toThrow('[Reanimated] Failed to find host instance for a ref.');
    });
  });

  describe('when resolving against the installed React Native', () => {
    test('uses the React Native implementation rather than the fallback', () => {
      jest.resetModules();
      jest.dontMock(REACT_FABRIC_PUBLIC_INSTANCE_PATH);

      const ReactFabricPublicInstance: {
        getNodeFromPublicInstance: (publicInstance: unknown) => unknown;
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      } = require(REACT_FABRIC_PUBLIC_INSTANCE_PATH);

      const node = { shadowNode: true };
      const spy = jest
        .spyOn(ReactFabricPublicInstance, 'getNodeFromPublicInstance')
        .mockReturnValue(node);

      const ref = makeHostInstance({
        unreachableThroughReactNative: true,
      }) as unknown as InternalHostInstance;

      expect(requireFabricUtils().getShadowNodeWrapperFromRef(ref)).toBe(node);
      expect(spy).toHaveBeenCalledWith(ref);

      spy.mockRestore();
    });
  });

  describe('when React Native does not expose getNodeFromPublicInstance', () => {
    test('falls back to reading the internal instance handle', () => {
      jest.resetModules();
      jest.doMock(REACT_FABRIC_PUBLIC_INSTANCE_PATH, () => ({}));

      const node = { shadowNode: true };
      const ref = makeHostInstance(node) as unknown as InternalHostInstance;

      expect(requireFabricUtils().getShadowNodeWrapperFromRef(ref)).toBe(node);
    });
  });
});
