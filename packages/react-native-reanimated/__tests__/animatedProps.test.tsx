import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Button, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

Animated.addWhitelistedNativeProps({ text: true });

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function AnimatedComponent() {
  const r = useSharedValue(20);
  const width = useSharedValue(20);

  const handlePress = () => {
    r.value += 10;
    width.value += 10;
  };

  const animatedProps = useAnimatedProps(() => ({
    r: withTiming(r.value, { duration: 100 }),
  }));

  const textAnimatedProps = useAnimatedProps(() => {
    return {
      text: `Box width: ${width.value}`,
      defaultValue: `Box width: ${width.value}`,
    };
  });

  return (
    <View>
      <Svg>
        // This doesn't work - it has no jest styles :/ 👇
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="#b58df1"
          testID={'circle'}
          animatedProps={animatedProps}
        />
        // This works - it has jestAnimatedProps and jestAnimatedStyles on
        component 👇
        <AnimatedTextInput testID={'text'} animatedProps={textAnimatedProps} />
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

  test.skip('custom prop', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const circle = getByTestId('circle');
    const button = getByTestId('button');

    expect(circle).toHaveAnimatedProps({ r: 20 });

    fireEvent.press(button);
    jest.advanceTimersByTime(100);

    expect(circle).toHaveAnimatedProps({ r: 30 });
  });
  test('normal prop', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const textInput = getByTestId('text');
    const button = getByTestId('button');

    expect(textInput).toHaveAnimatedProps({ text: 'Box width: 20' });

    fireEvent.press(button);
    jest.advanceTimersByTime(100);

    expect(textInput).toHaveAnimatedProps({ text: 'Box width: 30' });
  });
});
