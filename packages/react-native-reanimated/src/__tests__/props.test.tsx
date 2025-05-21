import { fireEvent, render } from '@testing-library/react-native';
import type { ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';

import Animated, {
  getAnimatedStyle,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from '..';
import { processBoxShadow, processColor } from '../common';

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

  const animatedBoxShadowStripped = useAnimatedStyle(() => {
    const blurRadius = interpolate(pressed.value, [0, 1], [10, 0]);
    const color = interpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(255, 0, 0, 1)', 'rgba(0, 0, 255, 1)']
    );

    const boxShadow = `0px 4px ${blurRadius}px ${color}`;

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
      <AnimatedPressable
        testID={'strippedPressable'}
        style={[
          animatedBoxShadowStripped,
          {
            width: 100,
            height: 100,
            backgroundColor: 'red',
            boxShadow: '0px 4px 10px rgba(255, 0, 0, 1)',
          },
        ]}
        onPress={handlePress}>
        <Text>Stripped</Text>
      </AnimatedPressable>
    </View>
  );
};

const getDefaultStyle = () => ({
  padding: 16,
  backgroundColor: 'red',
  boxShadow: '0px 4px 10px 0px rgba(255, 0, 0, 1)',
});

const getStrippedStyle = () => ({
  width: 100,
  height: 100,
  backgroundColor: 'red',
  boxShadow: '0px 4px 10px rgba(255, 0, 0, 1)',
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

    expect(pressable.props.style).toEqual([
      {
        boxShadow: '0px 4px 10px 0px rgba(255, 0, 0, 1)',
      },
      getDefaultStyle(),
    ]);
    expect(pressable).toHaveAnimatedStyle(style);
    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);
    style.boxShadow = '0px 4px 0px 0px rgba(0, 0, 255, 1)';
    expect(pressable).toHaveAnimatedStyle(style);

    const rendered = render(<AnimatedComponent />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  test('boxShadow string without spread', () => {
    const style = getStrippedStyle();

    const { getByTestId } = render(<AnimatedComponent />);
    const strippedPressable = getByTestId('strippedPressable');

    expect(strippedPressable.props.style).toEqual([
      {
        boxShadow: '0px 4px 10px rgba(255, 0, 0, 1)',
      },
      getStrippedStyle(),
    ]);

    expect(strippedPressable).toHaveAnimatedStyle(style);
    fireEvent.press(strippedPressable);
    jest.advanceTimersByTime(600);
    style.boxShadow = '0px 4px 0px rgba(0, 0, 255, 1)';
    expect(strippedPressable).toHaveAnimatedStyle(style);
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

    const rendered = render(<AnimatedComponent />).toJSON();
    expect(rendered).toMatchSnapshot();
  });
  test('one boxShadow string parsing', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const pressable = getByTestId('pressable');

    expect(pressable.props.style).toEqual([
      {
        boxShadow: '0px 4px 10px 0px rgba(255, 0, 0, 1)',
      },
      getDefaultStyle(),
    ]);

    const unprocessedStyle = getAnimatedStyle(pressable);

    const parsedStyle = processBoxShadow(
      (unprocessedStyle as ViewStyle).boxShadow!
    );

    expect(parsedStyle).toEqual([
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 10,
        spreadDistance: 0,
        color: processColor('rgba(255, 0, 0, 1)'),
      },
    ]);

    const style = getAnimatedStyle(pressable);
    expect((style as ViewStyle).boxShadow).toBe(
      '0px 4px 10px 0px rgba(255, 0, 0, 1)'
    );

    const rendered = render(<AnimatedComponent />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  test('two boxShadows string parsing', () => {
    const multipleBoxShadowStyle = getMultipleBoxShadowStyle();

    const parsedStyle = processBoxShadow(multipleBoxShadowStyle.boxShadow);

    expect(parsedStyle).toEqual([
      {
        offsetX: -10,
        offsetY: 6,
        blurRadius: 8,
        spreadDistance: 10,
        color: processColor('rgba(255, 0, 0, 1)'),
      },
      {
        offsetX: 10,
        offsetY: 0,
        blurRadius: 15,
        spreadDistance: 6,
        color: processColor('rgba(0, 0, 255, 1)'),
      },
    ]);
  });
});
