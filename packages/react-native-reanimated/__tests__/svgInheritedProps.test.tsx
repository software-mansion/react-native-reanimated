import { render } from '@testing-library/react-native';
import Animated, { css } from 'react-native-reanimated';
import { Svg, Text } from 'react-native-svg';

import { initSvgCssSupport } from '../src/css/svg';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-svg', () => require('../mock'));

const AnimatedText = Animated.createAnimatedComponent(Text);

function renderText(props: Record<string, unknown>) {
  const { getByTestId } = render(
    <Svg height="100" width="100">
      <AnimatedText testID="text" {...props}>
        Hello
      </AnimatedText>
    </Svg>
  );
  return getByTestId('text').props;
}

describe('SVG resting defaults forwarded as plain props', () => {
  beforeAll(() => {
    initSvgCssSupport();
  });

  it('forwards the default of a prop set only by keyframes', () => {
    const props = renderText({
      fill: 'blue',
      animatedProps: {
        animationName: { to: { fillOpacity: 0.2 } },
        animationDuration: '1s',
      },
    });

    expect(props.fill).toBe('blue');
    expect(props.fillOpacity).toBe(1);
  });

  it('collects the props of every keyframe of every animation', () => {
    const props = renderText({
      animatedProps: {
        animationName: [
          { from: { stroke: 'red' }, to: { strokeWidth: 5 } },
          css.keyframes({ '50%': { strokeDashoffset: 10 } }),
        ],
      },
    });

    expect(props.stroke).toBe('none');
    expect(props.strokeWidth).toBe(1);
    expect(props.strokeDashoffset).toBe(0);
  });

  it('forwards the default of a pseudo value without a default', () => {
    const props = renderText({
      animatedProps: { fillOpacity: { ':active': 0.2 } },
    });

    expect(props.fillOpacity).toBe(1);
  });

  it('keeps inline, plain and pseudo default values', () => {
    const props = renderText({
      fillOpacity: 0,
      animatedProps: [
        { strokeWidth: 3, stroke: { default: 'red', ':active': 'blue' } },
        {
          animationName: {
            to: { fillOpacity: 0.2, strokeWidth: 5, stroke: 'green' },
          },
        },
      ],
    });

    expect(props.fillOpacity).toBe(0);
    expect(props.strokeWidth).toBe(3);
    expect(props.stroke).toBe('red');
  });

  it('leaves a value in the style alone', () => {
    const props = renderText({
      style: { fillOpacity: 0.5 },
      animatedProps: { animationName: { to: { fillOpacity: 0.2 } } },
    });

    expect(props.fillOpacity).toBeUndefined();
  });

  it('leaves props that children do not inherit alone', () => {
    const props = renderText({
      animatedProps: {
        animationName: { to: { opacity: 0, x: 10, vectorEffect: 'none' } },
      },
    });

    expect(props.opacity).toBeUndefined();
    expect(props.x).toBeUndefined();
    expect(props.vectorEffect).toBeUndefined();
  });

  it('ignores animationName "none"', () => {
    const props = renderText({ animatedProps: { animationName: 'none' } });

    expect(props.fill).toBeUndefined();
  });
});
