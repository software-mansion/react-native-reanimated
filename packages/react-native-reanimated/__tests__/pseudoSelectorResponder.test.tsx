import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import Animated from '../src';

const AnimatedView = Animated.createAnimatedComponent(View);

// SVG components are styled through props, so `animatedProps` is their CSS
// channel and the only one that needs the handler.
describe('responder prop injected for pseudo selectors in animatedProps', () => {
  it('injects an inert handler and still forwards the resting value', () => {
    const { getByTestId } = render(
      <AnimatedView
        animatedProps={{ fill: { ':active': 'red', default: 'blue' } }}
        testID="subject"
      />
    );

    const { fill, onStartShouldSetResponder } = getByTestId('subject').props;
    expect(fill).toBe('blue');
    expect(onStartShouldSetResponder).toBeInstanceOf(Function);
    // Returning false leaves responder negotiation to ancestors.
    expect(onStartShouldSetResponder()).toBe(false);
  });

  it('does not inject when no pseudo selectors are used', () => {
    const { getByTestId } = render(
      <AnimatedView animatedProps={{ fill: 'blue' }} testID="subject" />
    );

    expect(
      getByTestId('subject').props.onStartShouldSetResponder
    ).toBeUndefined();
  });

  it('does not inject for pseudo selectors in style', () => {
    const { getByTestId } = render(
      <AnimatedView
        style={{
          backgroundColor: { ':active': 'red', default: 'blue' },
          transitionDuration: '1ms',
        }}
        testID="subject"
      />
    );

    expect(
      getByTestId('subject').props.onStartShouldSetResponder
    ).toBeUndefined();
  });

  it('still injects when the handler prop is passed as undefined', () => {
    const { getByTestId } = render(
      <AnimatedView
        animatedProps={{ fill: { ':active': 'red', default: 'blue' } }}
        onStartShouldSetResponder={undefined}
        testID="subject"
      />
    );

    expect(
      getByTestId('subject').props.onStartShouldSetResponder
    ).toBeInstanceOf(Function);
  });

  it('keeps a user-supplied handler', () => {
    const userHandler = () => true;
    const { getByTestId } = render(
      <AnimatedView
        animatedProps={{ fill: { ':active': 'red', default: 'blue' } }}
        onStartShouldSetResponder={userHandler}
        testID="subject"
      />
    );

    expect(getByTestId('subject').props.onStartShouldSetResponder).toBe(
      userHandler
    );
  });

  it('stops injecting once the pseudo selectors are removed', () => {
    const { getByTestId, rerender } = render(
      <AnimatedView
        animatedProps={{ fill: { ':active': 'red', default: 'blue' } }}
        testID="subject"
      />
    );
    expect(
      getByTestId('subject').props.onStartShouldSetResponder
    ).toBeInstanceOf(Function);

    rerender(
      <AnimatedView animatedProps={{ fill: 'blue' }} testID="subject" />
    );
    expect(
      getByTestId('subject').props.onStartShouldSetResponder
    ).toBeUndefined();
  });
});
