import { act, render } from '@testing-library/react-native';
import React from 'react';

import type { AnimatedRef } from '../src';
import Animated, { useAnimatedRef } from '../src';

jest.mock('../src/platformFunctions/findNodeHandle', () => {
  const tags = new WeakMap<object, number>();
  let nextTag = 1000;
  return {
    findNodeHandle: jest.fn((componentOrHandle: unknown) => {
      if (typeof componentOrHandle !== 'object' || componentOrHandle === null) {
        return componentOrHandle ?? null;
      }
      if (!tags.has(componentOrHandle)) {
        tags.set(componentOrHandle, nextTag++);
      }
      return tags.get(componentOrHandle);
    }),
  };
});

describe('useAnimatedRef', () => {
  test('releases the component when the element unmounts', () => {
    // Given
    let animatedRef: AnimatedRef<Animated.View> | undefined;

    function TestComponent({ showView }: { showView: boolean }) {
      animatedRef = useAnimatedRef<Animated.View>();
      return showView ? (
        <Animated.View ref={animatedRef} testID="AnimatedView" />
      ) : null;
    }

    const component = render(<TestComponent showView />);
    expect(animatedRef?.current).not.toBeNull();

    // When
    component.update(<TestComponent showView={false} />);

    // Then
    // The owner is still mounted, so the ref itself stays reachable; it must
    // not keep the unmounted component alive.
    expect(animatedRef?.current).toBeNull();
    expect(animatedRef?.getTag?.()).toBeNull();
    expect(animatedRef?.()).toBeNull();
  });

  test('reattaches to a newly mounted element', () => {
    // Given
    let animatedRef: AnimatedRef<Animated.View> | undefined;

    function TestComponent({ showView }: { showView: boolean }) {
      animatedRef = useAnimatedRef<Animated.View>();
      return showView ? <Animated.View ref={animatedRef} /> : null;
    }

    const component = render(<TestComponent showView />);
    component.update(<TestComponent showView={false} />);

    // When
    component.update(<TestComponent showView />);

    // Then
    expect(animatedRef?.current).not.toBeNull();
  });

  test('reading the ref by calling it with no argument does not detach it', () => {
    // Given
    let animatedRef: AnimatedRef<Animated.View> | undefined;

    function TestComponent() {
      animatedRef = useAnimatedRef<Animated.View>();
      return <Animated.View ref={animatedRef} />;
    }

    render(<TestComponent />);
    const instance = animatedRef?.current;
    expect(instance).not.toBeNull();

    // When
    animatedRef?.();

    // Then
    expect(animatedRef?.current).toBe(instance);
  });

  test('reports a null tag before the ref attaches', () => {
    // Given
    let animatedRef: AnimatedRef<Animated.View> | undefined;

    function TestComponent({ showView }: { showView: boolean }) {
      animatedRef = useAnimatedRef<Animated.View>();
      return showView ? <Animated.View ref={animatedRef} /> : null;
    }

    // When
    render(<TestComponent showView={false} />);

    // Then
    expect(animatedRef?.getTag?.()).toBeNull();
  });

  test('cleans up observers when the element unmounts and observes the next element', async () => {
    // Given
    let animatedRef: AnimatedRef<Animated.View> | undefined;

    function TestComponent({ showView }: { showView: boolean }) {
      animatedRef = useAnimatedRef<Animated.View>();
      return showView ? <Animated.View ref={animatedRef} /> : null;
    }

    const component = render(<TestComponent showView />);
    const cleanup = jest.fn();
    const observer = jest.fn(() => cleanup);
    animatedRef?.observe(observer);
    const firstTag = animatedRef?.getTag?.();
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenLastCalledWith(firstTag);

    // When
    component.update(<TestComponent showView={false} />);
    await act(() => Promise.resolve());

    // Then
    expect(cleanup).toHaveBeenCalledTimes(1);

    // When
    component.update(<TestComponent showView />);

    // Then
    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenLastCalledWith(animatedRef?.getTag?.());
    expect(animatedRef?.getTag?.()).not.toBe(firstTag);
  });

  test('keeps observers while an inline ref re-attaches the same element', async () => {
    // Given
    let animatedRef: AnimatedRef<Animated.View> | undefined;

    function TestComponent() {
      animatedRef = useAnimatedRef<Animated.View>();
      return (
        <Animated.View
          ref={(instance) => {
            animatedRef?.(instance);
          }}
        />
      );
    }

    const component = render(<TestComponent />);
    const cleanup = jest.fn();
    const observer = jest.fn(() => cleanup);
    animatedRef?.observe(observer);

    // When
    component.update(<TestComponent />);
    await act(() => Promise.resolve());

    // Then
    expect(cleanup).not.toHaveBeenCalled();
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
