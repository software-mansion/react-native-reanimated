import { View, Pressable, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useSharedValue,
  useAnimatedStyle,
} from '../src';
import { getAnimatedStyle } from '../src/jestUtils';
import { processBoxShadow } from '../src/processBoxShadow';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AnimatedComponent = () => {
  const pressed = useSharedValue(0);

  const animatedBoxShadow = useAnimatedStyle(() => {
    const blurRadius = interpolate(pressed.value, [0, 1], [10, 0]);
    const color = interpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(255, 0, 0, 1)', 'rgba(0, 0, 255, 1)']
    );

    const boxShadow = `0px 4px ${blurRadius}px 0px ${color}`;

    return {
      boxShadow,
    };
  });

  const handlePress = () => {
    pressed.value = pressed.value === 0 ? 1 : 0;
  };

  return (
    <View
      style={{
        padding: 24,
      }}>
      <AnimatedPressable
        testID={'pressable'}
        style={[
          animatedBoxShadow,
          {
            backgroundColor: 'red',
            padding: 16,
            boxShadow: '0px 4px 10px 0px rgba(255, 0, 0, 1)',
          },
        ]}
        onPress={handlePress}>
        <Text>Button</Text>
      </AnimatedPressable>
    </View>
  );
};

const getDefaultStyle = () => ({
  padding: 16,
  backgroundColor: 'red',
  boxShadow: '0px 4px 10px 0px rgba(255, 0, 0, 1)',
});

const getMultipleBoxShadowStyle = () => ({
  padding: 16,
  backgroundColor: 'red',
  boxShadow:
    '-10px 6px 8px 10px rgba(255, 0, 0, 1), 10px 0px 15px 6px rgba(0, 0, 255, 1)',
});

describe('Test of boxShadow prop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('boxShadow prop animation', () => {
    const style = getDefaultStyle();

    const { getByTestId } = render(<AnimatedComponent />);
    const pressable = getByTestId('pressable');

    expect(pressable.props.style.boxShadow).toBe(
      '0px 4px 10px 0px rgba(255, 0, 0, 1)'
    );
    expect(pressable).toHaveAnimatedStyle(style);
    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);
    style.boxShadow = '0px 4px 0px 0px rgba(0, 0, 255, 1)';
    expect(pressable).toHaveAnimatedStyle(style);
  });

  test('boxShadow prop animation, get animated style', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const pressable = getByTestId('pressable');

    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);

    const style = getAnimatedStyle(pressable);
    expect((style as ViewStyle).boxShadow).toBe(
      '0px 4px 0px 0px rgba(0, 0, 255, 1)'
    );
  });
  test('one boxShadow string parsing', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const pressable = getByTestId('pressable');

    expect(pressable.props.style.boxShadow).toBe(
      '0px 4px 10px 0px rgba(255, 0, 0, 1)'
    );

    processBoxShadow(pressable.props.style);

    expect(pressable.props.style.boxShadow).toEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 10,
        spreadDistance: 0,
        color: 'rgba(255, 0, 0, 1)',
      },
    ]);

    const style = getAnimatedStyle(pressable);
    expect((style as ViewStyle).boxShadow).toBe(
      '0px 4px 10px 0px rgba(255, 0, 0, 1)'
    );
  });

  test('two boxShadows string parsing', () => {
    const multipleBoxShadowStyle = getMultipleBoxShadowStyle();

    processBoxShadow(multipleBoxShadowStyle);

    expect(multipleBoxShadowStyle.boxShadow).toEqual([
      {
        offsetX: -10,
        offsetY: 6,
        blurRadius: 8,
        spreadDistance: 10,
        color: 'rgba(255, 0, 0, 1)',
      },
      {
        offsetX: 10,
        offsetY: 0,
        blurRadius: 15,
        spreadDistance: 6,
        color: 'rgba(0, 0, 255, 1)',
      },
    ]);
  });
});
