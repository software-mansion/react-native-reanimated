import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import Animated, { makeMutable } from '../src';

const AnimatedView = Animated.createAnimatedComponent(View);

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
      <AnimatedView animatedProps={{ fill: sharedValue }} testID="subject" />
    );

    expect(getByTestId('subject').props.fill).toBe(sharedValue);
  });
});
