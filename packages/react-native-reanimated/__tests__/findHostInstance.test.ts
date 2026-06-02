/* eslint-disable camelcase */
import type { IAnimatedComponentInternalBase } from '../src/createAnimatedComponent/commonTypes';
import { findHostInstance } from '../src/platform-specific/findHostInstance';

jest.mock('react-native/Libraries/Renderer/shims/ReactFabric', () => ({
  findHostInstance_DEPRECATED: jest.fn(),
}));

const ReactFabric: { findHostInstance_DEPRECATED: jest.Mock } = jest.requireMock(
  'react-native/Libraries/Renderer/shims/ReactFabric'
);

describe('findHostInstance', () => {
  beforeEach(() => {
    ReactFabric.findHostInstance_DEPRECATED.mockReset();
  });

  test('uses the resolved component ref when the fast path cannot handle it', () => {
    const componentRef = { __nativeTag: 42 };
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
});
