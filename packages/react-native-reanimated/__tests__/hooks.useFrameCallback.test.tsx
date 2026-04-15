/* eslint-disable @typescript-eslint/no-empty-function */
import { cleanup, render } from '@testing-library/react-native';
import React from 'react';

import Animated, { useFrameCallback } from '../src';

jest.useFakeTimers();

function flushFrames(count: number) {
  for (let i = 0; i < count; i++) {
    jest.runOnlyPendingTimers();
  }
}

afterEach(() => {
  cleanup();
  flushFrames(20);
  jest.clearAllTimers();
});

describe('useFrameCallback', () => {
  test('returns a frame callback object with expected shape', () => {
    let result: ReturnType<typeof useFrameCallback> | undefined;

    function TestComponent() {
      result = useFrameCallback(() => {});
      return <Animated.View />;
    }

    render(<TestComponent />);

    expect(result).toBeDefined();
    expect(typeof result!.setActive).toBe('function');
    expect(typeof result!.isActive).toBe('boolean');
    expect(typeof result!.callbackId).toBe('number');
  });

  test('is active by default (autostart = true)', () => {
    let result: ReturnType<typeof useFrameCallback> | undefined;

    function TestComponent() {
      result = useFrameCallback(() => {});
      return <Animated.View />;
    }

    render(<TestComponent />);

    expect(result!.isActive).toBe(true);
  });

  test('is inactive when autostart is false', () => {
    let result: ReturnType<typeof useFrameCallback> | undefined;

    function TestComponent() {
      result = useFrameCallback(() => {}, false);
      return <Animated.View />;
    }

    render(<TestComponent />);

    expect(result!.isActive).toBe(false);
  });

  test('setActive toggles isActive', () => {
    let result: ReturnType<typeof useFrameCallback> | undefined;

    function TestComponent() {
      result = useFrameCallback(() => {}, false);
      return <Animated.View />;
    }

    render(<TestComponent />);

    expect(result!.isActive).toBe(false);
    result!.setActive(true);
    expect(result!.isActive).toBe(true);
    result!.setActive(false);
    expect(result!.isActive).toBe(false);
  });

  test('invokes the callback on frame updates when active', () => {
    const callback = jest.fn();

    function TestComponent() {
      useFrameCallback((info) => {
        callback(info);
      });
      return <Animated.View />;
    }

    render(<TestComponent />);
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

    function TestComponent() {
      useFrameCallback(() => {
        callback();
      }, false);
      return <Animated.View />;
    }

    render(<TestComponent />);
    flushFrames(20);

    expect(callback).not.toHaveBeenCalled();
  });

  test('starts invoking the callback after setActive(true)', () => {
    const callback = jest.fn();
    let result: ReturnType<typeof useFrameCallback> | undefined;

    function TestComponent() {
      result = useFrameCallback(() => {
        callback();
      }, false);
      return <Animated.View />;
    }

    render(<TestComponent />);
    flushFrames(20);
    expect(callback).not.toHaveBeenCalled();

    result!.setActive(true);
    flushFrames(20);

    expect(callback).toHaveBeenCalled();
  });

  test('stops invoking the callback after setActive(false)', () => {
    const callback = jest.fn();
    let result: ReturnType<typeof useFrameCallback> | undefined;

    function TestComponent() {
      result = useFrameCallback(() => {
        callback();
      });
      return <Animated.View />;
    }

    render(<TestComponent />);
    flushFrames(20);
    const callsWhileActive = callback.mock.calls.length;
    expect(callsWhileActive).toBeGreaterThan(0);

    result!.setActive(false);
    flushFrames(20);

    expect(callback.mock.calls.length).toBe(callsWhileActive);
  });

  test('provides a consistent FrameInfo shape across frames', () => {
    const frames: Array<{
      timestamp: number;
      timeSincePreviousFrame: number | null;
      timeSinceFirstFrame: number;
    }> = [];

    function TestComponent() {
      useFrameCallback((info) => {
        frames.push(info);
      });
      return <Animated.View />;
    }

    render(<TestComponent />);
    flushFrames(20);

    expect(frames.length).toBeGreaterThan(2);

    expect(frames[0].timeSincePreviousFrame).toBeNull();
    expect(frames[0].timeSinceFirstFrame).toBe(0);

    for (let i = 1; i < frames.length; i++) {
      expect(typeof frames[i].timestamp).toBe('number');
      expect(typeof frames[i].timeSinceFirstFrame).toBe('number');
      expect(frames[i].timeSincePreviousFrame).not.toBeNull();
    }
  });

  test('stops invoking the callback after unmount', () => {
    const callback = jest.fn();

    function TestComponent() {
      useFrameCallback(() => {
        callback();
      });
      return <Animated.View />;
    }

    const component = render(<TestComponent />);
    flushFrames(20);
    const callsBeforeUnmount = callback.mock.calls.length;
    expect(callsBeforeUnmount).toBeGreaterThan(0);

    component.unmount();
    flushFrames(20);

    expect(callback.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
