import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

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
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
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
    const style = {
      width: 10,
      height: 80,
      backgroundColor: 'black',
      margin: 30,
    };
    jest.useFakeTimers();

    const { getByTestId } = render(<TestComponent1 />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.props.style.width).toBe(0);
    expect(view).toHaveAnimatedStyle(style);
    fireEvent.press(button);

    style.width = 100;
    expect(view).toHaveAnimatedStyle(style);

    jest.runAllTimers();
  });
});
