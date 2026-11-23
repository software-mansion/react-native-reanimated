import { renderHook } from '@testing-library/react-native';

import type * as ReanimatedModule from '../src';

const { useDerivedValue, useSharedValue } =
  jest.requireActual<typeof ReanimatedModule>('../src/mock');

describe('shared values in the Jest mock', () => {
  it('accepts listeners on a shared value', () => {
    const { result } = renderHook(() => useSharedValue(0));

    expect(() => {
      result.current.addListener(1, jest.fn());
      result.current.removeListener(1);
    }).not.toThrow();
  });

  it('modifies a shared value', () => {
    const { result } = renderHook(() => useSharedValue(1));

    result.current.modify((value) => value + 1);

    expect(result.current.get()).toBe(2);
  });

  it('accepts listeners on a derived value', () => {
    const { result } = renderHook(() => useDerivedValue(() => 0));

    expect(() => {
      result.current.addListener(1, jest.fn());
      result.current.removeListener(1);
    }).not.toThrow();
  });
});
