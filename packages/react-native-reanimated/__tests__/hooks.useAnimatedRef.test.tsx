import { render } from '@testing-library/react-native';
import React from 'react';

import type { AnimatedRef } from '../src';
import Animated, { useAnimatedRef } from '../src';

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
});
