import { render } from '@testing-library/react-native';
import Animated, { css } from 'react-native-reanimated';
import { Svg, Text } from 'react-native-svg';

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

describe('SVG props inherited by children of an animated element', () => {
  it('forwards the SVG default of a prop set only by keyframes', () => {
    const props = renderText({
      animatedProps: {
        animationName: { to: { fillOpacity: 0.2 } },
        animationDuration: '1s',
      },
    });

    expect(props.fillOpacity).toBe(1);
  });

  it('collects the props of every keyframe of every animation', () => {
    const props = renderText({
      animatedProps: {
        animationName: [
          { from: { stroke: 'red' }, to: { strokeWidth: 5 } },
          css.keyframes({ '50%': { strokeOpacity: 0.5 } }),
        ],
      },
    });

    expect(props.stroke).toBe('none');
    expect(props.strokeWidth).toBe(1);
    expect(props.strokeOpacity).toBe(1);
  });

  it('keeps an inline value over the forwarded default', () => {
    const props = renderText({
      fill: 'blue',
      fillOpacity: 0.5,
      animatedProps: {
        animationName: { to: { fill: 'red', fillOpacity: 0.2 } },
      },
    });

    expect(props.fill).toBe('blue');
    expect(props.fillOpacity).toBe(0.5);
  });

  it('keeps a zero inline value over the forwarded default', () => {
    const props = renderText({
      fillOpacity: 0,
      animatedProps: { animationName: { to: { fillOpacity: 0.2 } } },
    });

    expect(props.fillOpacity).toBe(0);
  });

  it('keeps a plain animatedProps value over the forwarded default', () => {
    const props = renderText({
      animatedProps: [
        { fillOpacity: 0.5 },
        { animationName: { to: { fillOpacity: 0.2 } } },
      ],
    });

    expect(props.fillOpacity).toBe(0.5);
  });

  it('forwards the SVG default of a prop set only by style keyframes', () => {
    const props = renderText({
      style: { animationName: { to: { fillOpacity: 0.2 } } },
    });

    expect(props.fillOpacity).toBe(1);
  });

  it('keeps a style value over the forwarded default', () => {
    const props = renderText({
      style: {
        fillOpacity: 0.5,
        animationName: { to: { fillOpacity: 0.2 } },
      },
    });

    expect(props.fillOpacity).toBeUndefined();
  });

  it('forwards the SVG default of a pseudo value without a default', () => {
    const props = renderText({
      animatedProps: { fillOpacity: { ':active': 0.2 } },
    });

    expect(props.fillOpacity).toBe(1);
  });

  it('leaves props that children do not inherit alone', () => {
    const props = renderText({
      animatedProps: {
        animationName: { to: { opacity: 0, x: 10, fillOpacity: 0.2 } },
      },
    });

    expect(props.opacity).toBeUndefined();
    expect(props.x).toBeUndefined();
    expect(props.fillOpacity).toBe(1);
  });

  it('ignores animationName "none"', () => {
    const props = renderText({
      animatedProps: { animationName: 'none' },
    });

    expect(props.fill).toBeUndefined();
    expect(props.fillOpacity).toBeUndefined();
  });
});
