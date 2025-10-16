import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Button, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';

const animationDuration = 100;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function AnimatedComponent() {
  const r = useSharedValue(20);
  const width = useSharedValue(20);

  const handlePress = () => {
    r.value += 10;
    width.value += 10;
  };

  const textAnimatedProps = useAnimatedProps(() => {
    return {
      text: `Box width: ${width.value}`,
      defaultValue: `Box width: ${width.value}`,
    };
  });

  return (
    <View>
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

  test('Custom animated component', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const textInput = getByTestId('text');
    const button = getByTestId('button');

    expect(textInput).toHaveAnimatedProps({ text: 'Box width: 20' });

    fireEvent.press(button);
    jest.advanceTimersByTime(animationDuration);

    expect(textInput).toHaveAnimatedProps({ text: 'Box width: 30' });

    const rendered = render(<AnimatedComponent />).toJSON();
    expect(rendered).toMatchSnapshot();
  });
});
