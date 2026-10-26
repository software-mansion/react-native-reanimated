import { renderHook } from '@testing-library/react-native';

import type * as ReanimatedModule from '../src';
import type { SharedValue } from '../src';

const {
  isSharedValue,
  makeMutable,
  useScrollOffset,
  useSharedValue,
  useTimestamp,
} = jest.requireActual<typeof ReanimatedModule>('../src/mock');

function expectFullSharedValue(sharedValue: SharedValue<number>) {
  expect(isSharedValue(sharedValue)).toBe(true);
  expect(() => {
    sharedValue.addListener(1, jest.fn());
    sharedValue.removeListener(1);
  }).not.toThrow();

  sharedValue.set(1);
  sharedValue.modify((value) => value + 1);

  expect(sharedValue.get()).toBe(2);
  expect(sharedValue.value).toBe(2);
}

describe('mocked shared value factories', () => {
  test('makeMutable returns a shared value', () => {
    expectFullSharedValue(makeMutable(0));
  });

  test('useScrollOffset returns a stable shared value', () => {
    const { result, rerender } = renderHook(() => useScrollOffset(null));
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
    expectFullSharedValue(result.current);
  });

  test('useScrollOffset returns the provided offset', () => {
    const { result } = renderHook(() => {
      const providedOffset = useSharedValue(0);
      return { providedOffset, offset: useScrollOffset(null, providedOffset) };
    });

    expect(result.current.offset).toBe(result.current.providedOffset);
  });

  test('useTimestamp returns a stable shared value', () => {
    const { result, rerender } = renderHook(() => useTimestamp());
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
    expectFullSharedValue(result.current);
  });
});
