/* eslint-disable @typescript-eslint/no-empty-function */
import { act, renderHook } from '@testing-library/react-native';

import { useFrameCallback } from '../src';

describe('useFrameCallback', () => {
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

  test('returns a frame callback object with expected shape', () => {
    const { result } = renderHook(() => useFrameCallback(() => {}));

    expect(result.current).toBeDefined();
    expect(typeof result.current.setActive).toBe('function');
    expect(typeof result.current.isActive).toBe('boolean');
    expect(typeof result.current.callbackId).toBe('number');
  });

  test('is active by default (autostart = true)', () => {
    const { result } = renderHook(() => useFrameCallback(() => {}));

    expect(result.current.isActive).toBe(true);
  });

  test('is inactive when autostart is false', () => {
    const { result } = renderHook(() => useFrameCallback(() => {}, false));

    expect(result.current.isActive).toBe(false);
  });

  test('setActive toggles isActive', () => {
    const { result } = renderHook(() => useFrameCallback(() => {}, false));

    expect(result.current.isActive).toBe(false);
    result.current.setActive(true);
    expect(result.current.isActive).toBe(true);
    result.current.setActive(false);
    expect(result.current.isActive).toBe(false);
  });

  test('invokes the callback on frame updates when active', () => {
    const callback = jest.fn();

    renderHook(() =>
      useFrameCallback((info) => {
        callback(info);
      })
    );
    flushFrames(20);

    expect(callback).toHaveBeenCalled();
    expect(callback.mock.calls.length).toBeGreaterThan(1);

    const frameInfo = callback.mock.calls[0][0];
    expect(frameInfo).toHaveProperty('timestamp');
    expect(frameInfo).toHaveProperty('timeSincePreviousFrame');
    expect(frameInfo).toHaveProperty('timeSinceFirstFrame');
    expect(typeof frameInfo.timestamp).toBe('number');
    expect(frameInfo.timeSincePreviousFrame).toBeNull();
    expect(frameInfo.timeSinceFirstFrame).toBe(0);
  });

  test('does not invoke the callback when autostart is false', () => {
    const callback = jest.fn();

    renderHook(() =>
      useFrameCallback(() => {
        callback();
      }, false)
    );
    flushFrames(20);

    expect(callback).not.toHaveBeenCalled();
  });

  test('starts invoking the callback after setActive(true)', () => {
    const callback = jest.fn();

    const { result } = renderHook(() =>
      useFrameCallback(() => {
        callback();
      }, false)
    );
    flushFrames(20);
    expect(callback).not.toHaveBeenCalled();

    result.current.setActive(true);
    flushFrames(20);

    expect(callback).toHaveBeenCalled();
  });

  test('stops invoking the callback after setActive(false)', () => {
    const callback = jest.fn();

    const { result } = renderHook(() =>
      useFrameCallback(() => {
        callback();
      })
    );
    flushFrames(20);
    const callsWhileActive = callback.mock.calls.length;
    expect(callsWhileActive).toBeGreaterThan(0);

    result.current.setActive(false);
    flushFrames(20);

    expect(callback.mock.calls.length).toBe(callsWhileActive);
  });

  test('provides a consistent FrameInfo shape across frames', () => {
    const frames: Array<{
      timestamp: number;
      timeSincePreviousFrame: number | null;
      timeSinceFirstFrame: number;
    }> = [];

    renderHook(() =>
      useFrameCallback((info) => {
        frames.push(info);
      })
    );
    flushFrames(20);

    expect(frames.length).toBeGreaterThan(2);

    expect(frames[0].timeSincePreviousFrame).toBeNull();
    expect(frames[0].timeSinceFirstFrame).toBe(0);

    for (let i = 1; i < frames.length; i++) {
      expect(typeof frames[i].timestamp).toBe('number');
      expect(typeof frames[i].timeSinceFirstFrame).toBe('number');
      expect(typeof frames[i].timeSincePreviousFrame).toBe('number');
    }
  });

  test('stops invoking the callback after unmount', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() =>
      useFrameCallback(() => {
        callback();
      })
    );
    flushFrames(20);
    const callsBeforeUnmount = callback.mock.calls.length;
    expect(callsBeforeUnmount).toBeGreaterThan(0);

    unmount();
    flushFrames(20);

    expect(callback.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
