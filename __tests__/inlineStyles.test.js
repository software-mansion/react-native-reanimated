import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  withDelay,
} from '../src';

const AnimatedSharedValueComponent = ({ sharedValue, style }) => {
  return (
    <View>
      <Animated.View testID="view" style={style} />
      <Button
        testID="button"
        title="toggle"
        onPress={() => {
          sharedValue.value = 200;
        }}
      />
    </View>
  );
};

const AnimatedComponent = ({ style }) => {
  const sharedValue = useSharedValue(100);
  return (
    <AnimatedSharedValueComponent
      sharedValue={sharedValue}
      style={style(sharedValue)}
    />
  );
};

describe('inline styles', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('works with shared value', async () => {
    jest.useRealTimers();
    const { getByTestId } = render(
      <AnimatedComponent style={(sharedValue) => ({ width: sharedValue })} />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);
    await waitFor(() => {
      expect(view).toHaveAnimatedStyle({ width: 200 });
    });
    jest.useFakeTimers();
  });

  it('works with withTiming', () => {
    const { getByTestId } = render(
      <AnimatedComponent
        style={(sharedValue) => ({
          width: withTiming(sharedValue, { duration: 200 }),
        })}
      />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);

    jest.advanceTimersByTime(100);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 150 });

    jest.advanceTimersByTime(100);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 200 });
  });

  it('works with withSpring', () => {
    const { getByTestId } = render(
      <AnimatedComponent
        style={(sharedValue) => ({
          width: withSpring(sharedValue),
        })}
      />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);
    jest.advanceTimersByTime(5000);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 200 });
  });

  it('works with withSequence', () => {
    const { getByTestId } = render(
      <AnimatedComponent
        style={(sharedValue) => ({
          width: withSequence(
            withTiming(sharedValue, { duration: 200 }),
            withTiming(0, { duration: 100 })
          ),
        })}
      />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);
    jest.advanceTimersByTime(200);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 200 });

    jest.advanceTimersByTime(100);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 0 });
  });

  it('works with withRepeat', () => {
    const { getByTestId } = render(
      <AnimatedComponent
        style={(sharedValue) => ({
          width: withRepeat(
            withTiming(sharedValue, { duration: 200 }),
            2,
            true
          ),
        })}
      />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);

    jest.advanceTimersByTime(200);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 200 });

    jest.advanceTimersByTime(200);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 100 });
  });

  it('works with withDelay', () => {
    const { getByTestId } = render(
      <AnimatedComponent
        style={(sharedValue) => ({
          width: withDelay(200, withTiming(sharedValue, { duration: 200 })),
        })}
      />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);

    jest.advanceTimersByTime(200);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 100 });

    jest.advanceTimersByTime(200);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 200 });
  });

  it('works with a very nested example', () => {
    const { getByTestId } = render(
      <AnimatedComponent
        style={(sharedValue) => ({
          width: withDelay(
            200,
            withSequence(
              withRepeat(withTiming(sharedValue, { duration: 100 }), 2, true),
              withDelay(100, withTiming(400, { duration: 100 }))
            )
          ),
        })}
      />
    );
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ width: 100 });

    fireEvent.press(button);

    jest.advanceTimersByTime(200);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 100 });

    jest.advanceTimersByTime(100);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 200 });

    jest.advanceTimersByTime(150);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 100 });

    jest.advanceTimersByTime(150);
    jest.runOnlyPendingTimers();

    expect(view).toHaveAnimatedStyle({ width: 400 });
  });
});
