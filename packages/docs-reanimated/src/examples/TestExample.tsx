import React from 'react';
import { View, Button } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  SharedValue,
} from 'react-native-reanimated';

interface Props {
  sharedValue: SharedValue<number>;
}

const AnimatedSharedValueComponent = (props: Props) => {
  const widthSV = props.sharedValue;

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
};

const AnimatedComponent = () => {
  return <AnimatedSharedValueComponent sharedValue={useSharedValue(0)} />;
};

const getDefaultStyle = () => ({
  width: 0,
  height: 80,
  backgroundColor: 'black',
  margin: 30,
});

describe('Tests of animations', () => {
  test('withTiming animation', () => {
    const style = getDefaultStyle();

    const { getByTestId } = render(<AnimatedComponent />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.props.style.width).toBe(0);
    expect(view).toHaveAnimatedStyle(style);

    fireEvent.press(button);
    jest.advanceTimersByTime(600);

    style.width = 100;
    expect(view).toHaveAnimatedStyle(style);
  });
});

// The 'declare const' section is used because the example workspace doesn't require Jest or Jest types installed.
// This prevents TypeScript from throwing errors about 'expect', 'test', and other Jest globals.
// Since we don't want to install '@types/jest', we declare these functions as 'any'.

declare const test: any;
declare const expect: any;
declare const describe: any;
declare const fireEvent: any;
declare const render: any;
declare const jest: any;

//
