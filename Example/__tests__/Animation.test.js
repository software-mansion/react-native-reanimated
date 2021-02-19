import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import {
  withReanimatedTimer,
  moveAnimationByTime,
  moveAnimationByFrame,
} from 'react-native-reanimated/../../src/reanimated2/Jest';

export default function TestComponent1() {
  const widthSV = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(widthSV.value, { duration: 500 }),
    };
  });

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <Animated.View
        testID="view"
        style={[
          { width: 0, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        testID="button"
        title="toggle"
        onPress={() => {
          widthSV.value = 100;
        }}
      />
    </View>
  );
}

describe('Tests of animations', () => {
  test('withTiming animation', async () => {
    jest.useFakeTimers();
    const style = {
      width: 0,
      height: 80,
      backgroundColor: 'black',
      margin: 30,
    };

    const { getByTestId } = render(<TestComponent1 />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.props.style.width).toBe(0);
    expect(view).toHaveAnimatedStyle(style);
    fireEvent.press(button);

    jest.runAllTimers();

    style.width = 100;
    expect(view).toHaveAnimatedStyle(style);
  });

  test('withTiming animation, width in a middle of animation', () => {
    withReanimatedTimer(() => {
      const style = {
        width: 0,
        height: 80,
        backgroundColor: 'black',
        margin: 30,
      };

      const { getByTestId } = render(<TestComponent1 />);
      const view = getByTestId('view');
      const button = getByTestId('button');

      expect(view.props.style.width).toBe(0);
      expect(view).toHaveAnimatedStyle(style);

      fireEvent.press(button);
      moveAnimationByTime(260);
      style.width = 46.08;
      expect(view).toHaveAnimatedStyle(style);
    });
  });

  test('withTiming animation, move by 10 frame of animation', () => {
    withReanimatedTimer(() => {
      const { getByTestId } = render(<TestComponent1 />);
      const view = getByTestId('view');
      const button = getByTestId('button');

      fireEvent.press(button);
      moveAnimationByFrame(10);
      expect(view).toHaveAnimatedStyle({ width: 16.588799999999996 });
    });
  });

  test('withTiming animation, compare all of styles', () => {
    withReanimatedTimer(() => {
      const style = {
        width: 46.08,
        height: 80,
        backgroundColor: 'black',
        margin: 30,
      };
      const { getByTestId } = render(<TestComponent1 />);
      const view = getByTestId('view');
      const button = getByTestId('button');

      fireEvent.press(button);
      moveAnimationByTime(260);
      expect(view).toHaveEqualAnimatedStyle(style);
    });
  });
});
