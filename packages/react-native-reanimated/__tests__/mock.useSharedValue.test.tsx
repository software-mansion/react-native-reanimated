import { renderHook } from '@testing-library/react-native';

import type { useSharedValue as UseSharedValue } from '../src';

const { useSharedValue } = jest.requireActual<{
  useSharedValue: typeof UseSharedValue;
}>('../src/mock');

describe('mock useSharedValue', () => {
  test('calls a lazy initializer and stores its result', () => {
    const { result } = renderHook(() => useSharedValue(() => 5));

    expect(result.current.get()).toBe(5);
  });

  test('keeps the same shared value across re-renders', () => {
    const { result, rerender } = renderHook(() => useSharedValue(0));
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });
});
