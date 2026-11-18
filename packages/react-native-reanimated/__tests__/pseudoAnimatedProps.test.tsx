import { render } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import Animated, { makeMutable } from '../src';

// View stands in for an SVG component, whose `fill` is styled through props.
const AnimatedView = Animated.createAnimatedComponent(
  View as ComponentType<ViewProps & { fill?: string }>
);

describe('pseudo selector values in animatedProps', () => {
  it('forwards the default value instead of the raw pseudo object', () => {
    const { getByTestId } = render(
      <AnimatedView
        animatedProps={{
          fill: { default: 'rgb(255,0,0)', ':hover': 'rgb(255,255,0)' },
          transitionDuration: '100ms',
        }}
        testID="subject"
      />
    );

    expect(getByTestId('subject').props.fill).toBe('rgb(255,0,0)');
  });

  it('omits a pseudo value that has no default', () => {
    const { getByTestId } = render(
      <AnimatedView
        animatedProps={{ fill: { ':hover': 'rgb(255,255,0)' } }}
        testID="subject"
      />
    );

    expect(getByTestId('subject').props.fill).toBeUndefined();
  });

  it('forwards plain animatedProps values unchanged', () => {
    const { getByTestId } = render(
      <AnimatedView animatedProps={{ fill: 'rgb(0,0,255)' }} testID="subject" />
    );

    expect(getByTestId('subject').props.fill).toBe('rgb(0,0,255)');
  });

  it('does not mistake a shared value for a pseudo selector object', () => {
    const sharedValue = makeMutable('rgb(0,0,255)');
    const { getByTestId } = render(
      <AnimatedView
        // @ts-expect-error `animatedProps` types its values as plain styles, not shared values.
        animatedProps={{ fill: sharedValue }}
        testID="subject"
      />
    );

    expect(getByTestId('subject').props.fill).toBe(sharedValue);
  });
});
