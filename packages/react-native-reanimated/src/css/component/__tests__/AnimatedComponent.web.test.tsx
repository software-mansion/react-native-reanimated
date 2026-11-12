'use strict';
import { act, render } from '@testing-library/react';
import { Component } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import Animated, { FadeIn } from '../../..';

// Exposes its inner host view the way library wrappers do.
class Wrapper extends Component<ViewProps> {
  inner: React.ComponentRef<typeof View> | null = null;

  getAnimatableRef() {
    return this.inner;
  }

  render() {
    return (
      <View
        ref={(view) => {
          this.inner = view;
        }}
        {...this.props}
      />
    );
  }
}

const AnimatedWrapper = Animated.createAnimatedComponent(Wrapper);

describe('createAnimatedComponent with getAnimatableRef (web)', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  test('runs the entering animation on the view returned by getAnimatableRef', () => {
    const screen = render(
      <>
        <Animated.View entering={FadeIn} testID="host" />
        <AnimatedWrapper entering={FadeIn} testID="inner" />
      </>
    );

    // Entering animations are applied on the next animation frame.
    act(() => {
      jest.advanceTimersByTime(50);
    });

    const host = screen.getByTestId('host') as HTMLElement;
    const inner = screen.getByTestId('inner') as HTMLElement;

    expect(host.style.animationName).not.toBe('');
    expect(inner.style.animationName).toBe(host.style.animationName);
  });
});
