import { act, renderHook } from '@testing-library/react-native';

import { useTimestamp } from '../src';

describe('useTimestamp', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  function flushFrames(count: number) {
    for (let i = 0; i < count; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
  }

  test('initializes to 0', () => {
    const { result } = renderHook(() => useTimestamp(false));

    expect(result.current.value).toBe(0);
  });

  test('does not update .value when isActive is false', () => {
    const { result } = renderHook(() => useTimestamp(false));
    flushFrames(20);

    expect(result.current.value).toBe(0);
  });

  test('updates .value across frames when active', () => {
    const { result } = renderHook(() => useTimestamp());
    flushFrames(20);

    expect(result.current.value).toBeGreaterThan(0);
  });

  test('stops updating after isActive toggles to false', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useTimestamp(active),
      { initialProps: { active: true } }
    );
    flushFrames(20);
    const valueWhileActive = result.current.value;
    expect(valueWhileActive).toBeGreaterThan(0);

    rerender({ active: false });
    flushFrames(20);

    expect(result.current.value).toBe(valueWhileActive);
  });

  test('resumes updating after isActive toggles back to true', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useTimestamp(active),
      { initialProps: { active: false } }
    );
    flushFrames(20);
    expect(result.current.value).toBe(0);

    rerender({ active: true });
    flushFrames(20);

    expect(result.current.value).toBeGreaterThan(0);
  });
});
