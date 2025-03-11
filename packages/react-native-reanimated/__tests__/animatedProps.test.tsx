import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Button, View } from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedComponent() {
  const r = useSharedValue(20);

  const handlePress = () => {
    r.value += 10;
  };

  const animatedProps = useAnimatedProps(() => ({
    r: withTiming(r.value, { duration: 100 }),
  }));

  return (
    <View>
      <Svg>
        {/* This works - it has jestAnimatedProps and jestAnimatedStyles on component 👇 */}
        {/* <AnimatedPressable testID={'circle'} animatedProps={animatedProps}/> */}
        {/* This doesn't - it has no jest styles :/ 👇 */}
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="#b58df1"
          testID={'circle'}
          animatedProps={animatedProps}
        />
      </Svg>

      <Button testID={'button'} onPress={handlePress} title="Click me" />
    </View>
  );
}

describe('animatedProps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('custom prop', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const circle = getByTestId('circle');
    const button = getByTestId('button');

    expect(circle).toHaveAnimatedProps({ r: 20 });

    fireEvent.press(button);
    jest.advanceTimersByTime(100);

    expect(circle).toHaveAnimatedProps({ r: 30 });
  });
});
