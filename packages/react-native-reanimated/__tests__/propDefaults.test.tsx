import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { registerPropDefaults } from '../src/common';

const AnimatedView = Animated.createAnimatedComponent(View);

function renderView(props: Record<string, unknown>) {
  const { getByTestId } = render(<AnimatedView testID="subject" {...props} />);
  return getByTestId('subject').props;
}

describe('registered prop defaults', () => {
  beforeAll(() => {
    registerPropDefaults({ resting: 'rest', zero: 0 });
  });

  it('forwards the default of a prop set only by keyframes', () => {
    const props = renderView({
      animatedProps: { animationName: { to: { resting: 'x' } } },
    });

    expect(props.resting).toBe('rest');
  });

  it('collects the props of every keyframe of every animation', () => {
    const props = renderView({
      animatedProps: {
        animationName: [
          { from: { resting: 'a' } },
          css.keyframes({ '50%': { zero: 5 } }),
        ],
      },
    });

    expect(props.resting).toBe('rest');
    expect(props.zero).toBe(0);
  });

  it('forwards the default of a prop set only by style keyframes', () => {
    const props = renderView({
      style: { animationName: { to: { resting: 'x' } } },
    });

    expect(props.resting).toBe('rest');
  });

  it('forwards the default of a pseudo value without a default', () => {
    const props = renderView({
      animatedProps: { resting: { ':active': 'x' } },
    });

    expect(props.resting).toBe('rest');
  });

  it('keeps an inline value over the default', () => {
    const props = renderView({
      resting: 'inline',
      zero: 0,
      animatedProps: { animationName: { to: { resting: 'x', zero: 5 } } },
    });

    expect(props.resting).toBe('inline');
    expect(props.zero).toBe(0);
  });

  it('keeps a plain animatedProps value over the default', () => {
    const props = renderView({
      animatedProps: [
        { resting: 'plain' },
        { animationName: { to: { resting: 'x' } } },
      ],
    });

    expect(props.resting).toBe('plain');
  });

  it('keeps the default of a pseudo value over the registered one', () => {
    const props = renderView({
      animatedProps: { resting: { default: 'pseudo', ':active': 'x' } },
    });

    expect(props.resting).toBe('pseudo');
  });

  it('leaves a value in the style alone', () => {
    const props = renderView({
      style: { resting: 'styled', animationName: { to: { resting: 'x' } } },
    });

    expect(props.resting).toBeUndefined();
  });

  it('leaves props without a registered default alone', () => {
    const props = renderView({
      animatedProps: {
        animationName: { to: { opacity: 0, resting: 'x' } },
        unregistered: { ':active': 1 },
      },
    });

    expect(props.opacity).toBeUndefined();
    expect(props.unregistered).toBeUndefined();
    expect(props.resting).toBe('rest');
  });

  it('ignores animationName "none"', () => {
    const props = renderView({ animatedProps: { animationName: 'none' } });

    expect(props.resting).toBeUndefined();
  });
});
