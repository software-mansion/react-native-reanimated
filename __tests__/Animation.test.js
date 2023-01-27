import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from '../src/';
import { getAnimatedStyle } from '../src/reanimated2/jestUtils';

const AnimatedSharedValueComponent = (props) => {
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
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

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

  test('withTiming animation, get animated style', () => {
    const { getByTestId } = render(<AnimatedComponent />);
    const view = getByTestId('view');
    const button = getByTestId('button');
    fireEvent.press(button);
    jest.advanceTimersByTime(600);
    const style = getAnimatedStyle(view);
    expect(style.width).toBe(100);
  });

  test('withTiming animation, width in a middle of animation', () => {
    const style = getDefaultStyle();

    const { getByTestId } = render(<AnimatedComponent />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.props.style.width).toBe(0);
    expect(view).toHaveAnimatedStyle(style);

    fireEvent.press(button);
    jest.advanceTimersByTime(250);
    jest.runOnlyPendingTimers(); // timers scheduled for the exact 250ms won't run without this additional call
    style.width = 50; // value of component width after 150ms of animation
    expect(view).toHaveAnimatedStyle(style);
  });

  test('withTiming animation, compare all styles', () => {
    const style = getDefaultStyle();

    const { getByTestId } = render(<AnimatedComponent />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    fireEvent.press(button);
    jest.advanceTimersByTime(250);
    jest.runOnlyPendingTimers();
    style.width = 50; // value of component width after 250ms of animation
    expect(view).toHaveAnimatedStyle(style, true);
  });

  test('withTiming animation, define shared value outside component', () => {
    let sharedValue;
    renderHook(() => {
      sharedValue = useSharedValue(0);
    });
    const { getByTestId } = render(
      <AnimatedComponent sharedValue={sharedValue} />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    fireEvent.press(button);
    jest.advanceTimersByTime(600);
    expect(view).toHaveAnimatedStyle({ width: 100 });
  });

  test('withTiming animation, change shared value outside component', () => {
    let sharedValue;
    renderHook(() => {
      sharedValue = useSharedValue(0);
    });
    const { getByTestId } = render(
      <AnimatedSharedValueComponent sharedValue={sharedValue} />
    );
    const view = getByTestId('view');
    sharedValue.value = 50;
    jest.advanceTimersByTime(600);
    expect(view).toHaveAnimatedStyle({ width: 50 });
  });
});
