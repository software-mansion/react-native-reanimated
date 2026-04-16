import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-svg', () => require('../mock'));

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedSvgWrapper() {
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handlePress = () => {
    opacity.value = withTiming(opacity.value === 0.3 ? 1 : 0.3, {
      duration: 300,
    });
  };

  return (
    <AnimatedPressable
      style={animatedStyle}
      testID={'wrapper'}
      onPress={handlePress}>
      <Svg height="100" width="100">
        <Circle cx="50" cy="50" r="40" fill="blue" />
      </Svg>
      <Text>Button</Text>
    </AnimatedPressable>
  );
}

function AnimatedExample() {
  const pressed = useSharedValue(0);

  const handlePress = () => {
    pressed.value = pressed.value === 0 ? 1 : 0;
  };

  const animatedProps = useAnimatedProps(() => {
    return { r: withTiming(pressed.value === 0 ? 20 : 40, { duration: 300 }) };
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(pressed.value === 0 ? 100 : 200, { duration: 300 }),
    };
  });

  return (
    <>
      <Svg height="100" width="100">
        <AnimatedCircle
          testID="circle"
          cx="50"
          cy="50"
          style={animatedStyle}
          animatedProps={animatedProps}
        />
      </Svg>
      <Pressable testID={'pressable'} onPress={handlePress}>
        <Text>Button</Text>
      </Pressable>
    </>
  );
}

describe('Animating SVG', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test('Should animate radius - Circle', () => {
    const { getByTestId } = render(<AnimatedExample />);
    const circle = getByTestId('circle');
    const pressable = getByTestId('pressable');

    expect(circle).toHaveAnimatedProps({ r: 20 });

    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);

    expect(circle).toHaveAnimatedProps({ r: 40 });
  });

  test('Should animate width - Circle', () => {
    const { getByTestId } = render(<AnimatedExample />);
    const pressable = getByTestId('pressable');
    const circle = getByTestId('circle');

    expect(circle).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);

    expect(circle).toHaveAnimatedStyle({ width: 200 });
  });
});

describe('Animating wrapper of SVG', () => {
  test('Should animate opacity - Wrapper', () => {
    const { getByTestId } = render(<AnimatedSvgWrapper />);
    const wrapper = getByTestId('wrapper');

    expect(wrapper).toHaveAnimatedStyle({ opacity: 0.3 });

    fireEvent.press(wrapper);
    jest.advanceTimersByTime(600);

    expect(wrapper).toHaveAnimatedStyle({ opacity: 1 });
  });
});
