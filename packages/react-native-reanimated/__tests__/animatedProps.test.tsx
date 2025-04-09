import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Button, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const animationDuration = 100;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
Animated.addWhitelistedNativeProps({ r: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
Animated.addWhitelistedNativeProps({ text: true });

export default function AnimatedComponent() {
  const r = useSharedValue(20);
  const width = useSharedValue(20);

  const handlePress = () => {
    r.value += 10;
    width.value += 10;
  };

  const animatedProps = useAnimatedProps(() => ({
    r: withTiming(r.value, { duration: animationDuration }),
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
        // SVG components strip our jest props and cannot be tested
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="#b58df1"
          testID={'circle'}
          animatedProps={animatedProps}
        />
      </Svg>
      <AnimatedTextInput testID={'text'} animatedProps={textAnimatedProps} />
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

  test('SVG component cannot be tested', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const circle = getByTestId('circle');

    expect(circle).toHaveAnimatedProps({});

    // TODO: There's still a problem with stringizing `TextInput` with `animatedProps`.
    // const rendered = render(<AnimatedComponent />).toJSON();
    // expect(rendered).toMatchSnapshot();
  });

  test('Custom animated component', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const textInput = getByTestId('text');
    const button = getByTestId('button');

    expect(textInput).toHaveAnimatedProps({ text: 'Box width: 20' });

    fireEvent.press(button);
    jest.advanceTimersByTime(animationDuration);

    expect(textInput).toHaveAnimatedProps({ text: 'Box width: 30' });

    // TODO: There's still a problem with stringizing `TextInput` with `animatedProps`.
    // const rendered = render(<AnimatedComponent />).toJSON();
    // expect(rendered).toMatchSnapshot();
  });
});
