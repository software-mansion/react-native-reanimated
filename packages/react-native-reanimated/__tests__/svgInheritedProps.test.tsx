import { render } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';
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

  it('forwards the default of a fill prop set only by keyframes', () => {
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

  it('forwards the defaults of stroke props set only by keyframes', () => {
    const props = renderText({
      animatedProps: {
        animationName: {
          from: { stroke: 'red', strokeDashoffset: 10 },
          to: { strokeWidth: 5 },
        },
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
});
