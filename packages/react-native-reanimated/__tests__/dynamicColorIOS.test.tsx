'use strict';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import Animated, {
  DynamicColorIOSAnimated,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from '../src';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LIGHT_COLORS = ['rgba(56, 172, 221, 1)', 'rgba(87, 180, 149, 1)'];
const DARK_COLORS = ['rgba(181, 141, 241, 1)', 'rgba(255, 98, 89, 1)'];

const AnimatedComponent = () => {
  const pressed = useSharedValue(0);

  const handlePress = () => {
    pressed.value = withTiming(pressed.value === 0 ? 1 : 0);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const lightColor = interpolateColor(pressed.value, [0, 1], LIGHT_COLORS);
    const darkColor = interpolateColor(pressed.value, [0, 1], DARK_COLORS);

    return {
      width: withTiming(pressed.value === 0 ? 100 : 200),
      backgroundColor: DynamicColorIOSAnimated({
        light: lightColor,
        dark: darkColor,
      }),
    };
  });

  return (
    <View>
      <AnimatedPressable
        testID={'pressable'}
        onPress={handlePress}
        style={[animatedStyle, { height: 100 }]}>
        <Text>Button</Text>
      </AnimatedPressable>
    </View>
  );
};

const getBackgroundParsedStyle = () => ({
  backgroundColor: {
    dynamic: {
      light: LIGHT_COLORS[0],
      dark: DARK_COLORS[0],
      highContrastLight: undefined,
      highContrastDark: undefined,
    },
  },
});

const getInterpolatedBackgroundParsedStyle = () => ({
  backgroundColor: {
    dynamic: {
      light: LIGHT_COLORS[1],
      dark: DARK_COLORS[1],
      highContrastLight: undefined,
      highContrastDark: undefined,
    },
  },
});

const getDefaultStyle = () => ({
  width: 100,
  ...getBackgroundParsedStyle(),
});

describe('DynamicColorIOSAnimated test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('colors are animating', () => {
    const style = getDefaultStyle();
    const { getByTestId } = render(<AnimatedComponent />);
    const pressable = getByTestId('pressable');

    expect(pressable.props.style).toEqual([style, { height: 100 }]);

    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);

    expect(pressable).toHaveAnimatedStyle(
      getInterpolatedBackgroundParsedStyle()
    );

    const rendered = render(<AnimatedComponent />).toJSON();
    expect(rendered).toMatchSnapshot();
  });
  test('other props are not affected', () => {
    const style = getDefaultStyle();
    const { getByTestId } = render(<AnimatedComponent />);
    const pressable = getByTestId('pressable');

    expect(pressable.props.style).toEqual([style, { height: 100 }]);

    fireEvent.press(pressable);
    jest.advanceTimersByTime(600);
    expect(pressable).toHaveAnimatedStyle({
      width: 200,
    });
  });
});
