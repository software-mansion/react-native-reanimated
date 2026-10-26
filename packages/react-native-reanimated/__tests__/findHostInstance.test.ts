/* eslint-disable eslint-core/camelcase */
import { Component } from 'react';

import type { IAnimatedComponentInternalBase } from '../src/createAnimatedComponent/commonTypes';
import { findHostInstance } from '../src/platform-specific/findHostInstance';

jest.mock('react-native/Libraries/Renderer/shims/ReactFabric', () => ({
  findHostInstance_DEPRECATED: jest.fn(),
}));

const ReactFabric: { findHostInstance_DEPRECATED: jest.Mock } =
  jest.requireMock('react-native/Libraries/Renderer/shims/ReactFabric');

class ClassComponent extends Component {}

class ScrollableClassComponent extends Component {
  getNativeScrollRef = () => null;
  getScrollableNode = () => 42;
}

describe('findHostInstance', () => {
  beforeEach(() => {
    ReactFabric.findHostInstance_DEPRECATED.mockReset();
  });

  test('uses the resolved component ref when the fast path cannot handle it', () => {
    const componentRef = new ClassComponent({});
    const hostInstance = { host: true };
    const animatedComponent = {
      _componentRef: componentRef,
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    ReactFabric.findHostInstance_DEPRECATED.mockReturnValue(hostInstance);

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).toHaveBeenCalledWith(
      componentRef
    );
  });

  test('uses the fast path for React Native 0.83 host instances', () => {
    const hostInstance = {
      __internalInstanceHandle: {},
      __nativeTag: 42,
      __viewConfig: { uiViewClassName: 'RCTView' },
    };
    const animatedComponent = {
      _componentRef: hostInstance,
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).not.toHaveBeenCalled();
  });

  test('resolves scrollable components through getNativeScrollRef', () => {
    const hostInstance = {
      __internalInstanceHandle: {},
      __nativeTag: 42,
      __viewConfig: { uiViewClassName: 'RCTScrollView' },
    };
    const animatedComponent = {
      _componentRef: { getNativeScrollRef: () => hostInstance },
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).not.toHaveBeenCalled();
  });

  test('resolves scrollable components through getScrollableNode', () => {
    const hostInstance = {
      __internalInstanceHandle: {},
      __nativeTag: 42,
      __viewConfig: { uiViewClassName: 'RCTScrollView' },
    };
    const animatedComponent = {
      _componentRef: { getScrollableNode: () => hostInstance },
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).not.toHaveBeenCalled();
  });

  test('falls back when getScrollableNode returns a view tag', () => {
    const hostInstance = { host: true };
    const componentRef = new ScrollableClassComponent({});
    const animatedComponent = {
      _componentRef: componentRef,
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    ReactFabric.findHostInstance_DEPRECATED.mockReturnValue(hostInstance);

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).toHaveBeenCalledWith(
      componentRef
    );
  });

  test('falls back to the animated component for an imperative handle', () => {
    const hostInstance = { host: true };
    const animatedComponent = {
      _componentRef: { seek: jest.fn(), pause: jest.fn() },
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    ReactFabric.findHostInstance_DEPRECATED.mockReturnValue(hostInstance);

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).toHaveBeenCalledWith(
      animatedComponent
    );
  });

  test('falls back to the animated component without a component ref', () => {
    const hostInstance = { host: true };
    const animatedComponent = {
      _componentRef: null,
      _hasAnimatedRef: false,
    } as unknown as IAnimatedComponentInternalBase;

    ReactFabric.findHostInstance_DEPRECATED.mockReturnValue(hostInstance);

    expect(findHostInstance(animatedComponent)).toBe(hostInstance);
    expect(ReactFabric.findHostInstance_DEPRECATED).toHaveBeenCalledWith(
      animatedComponent
    );
  });
});
