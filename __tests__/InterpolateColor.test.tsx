import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Animated, {
  interpolateColor,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from '../src';

describe('colors interpolation', () => {
  it('interpolates rgb without gamma correction', () => {
    const colors = ['#105060', '#609020'];
    let interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'RGB', {
      gamma: 1,
    });
    expect(interpolatedColor).toBe('rgba(56, 112, 64, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'RGB', {
      gamma: 1,
    });
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'RGB', {
      gamma: 1,
    });
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 1)');
  });

  it('interpolates rgb with gamma correction', () => {
    const colors = ['#105060', '#609020'];

    let interpolatedColor = interpolateColor(0.5, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(71, 117, 73, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 1)');
  });

  it('interpolates hsv', () => {
    let colors = ['#105060', '#609020'];
    let interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'HSV', {
      useCorrectedHSVInterpolation: false,
    });
    expect(interpolatedColor).toBe('rgba(23, 120, 54, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'HSV', {
      useCorrectedHSVInterpolation: false,
    });
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'HSV', {
      useCorrectedHSVInterpolation: false,
    });
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 1)');

    colors = ['#ff4800', '#ff00fb'];
    interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'HSV', {
      useCorrectedHSVInterpolation: false,
    });
    expect(interpolatedColor).toBe('rgba(0, 255, 166, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'HSV', {
      useCorrectedHSVInterpolation: false,
    });
    expect(interpolatedColor).toBe('rgba(255, 72, 0, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'HSV', {
      useCorrectedHSVInterpolation: false,
    });
    expect(interpolatedColor).toBe('rgba(255, 0, 251, 1)');
  });

  it('interpolates corrected hsv', () => {
    let colors = ['#105060', '#609020'];
    let interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(23, 120, 54, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 1)');

    colors = ['#ff4800', '#ff00fb'];
    interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(255, 0, 90, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(255, 72, 0, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(255, 0, 251, 1)');
  });

  it('interpolates css colors', () => {
    const colors = ['red', 'green'];
    const interpolatedColor = interpolateColor(0.5, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(186, 93, 0, 1)');
  });

  it('interpolates semi-transparent colors', () => {
    const colors = ['#10506050', '#60902070'];
    let interpolatedColor = interpolateColor(0.5, [0, 1], colors);
    expect(interpolatedColor).toBe(`rgba(71, 117, 73, ${96 / 255})`);

    interpolatedColor = interpolateColor(0, [0, 1], colors);
    expect(interpolatedColor).toBe(`rgba(16, 80, 96, ${80 / 255})`);

    interpolatedColor = interpolateColor(1, [0, 1], colors);
    expect(interpolatedColor).toBe(`rgba(96, 144, 32, ${112 / 255})`);

    interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe(`rgba(23, 120, 54, ${96 / 255})`);

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe(`rgba(16, 80, 96, ${80 / 255})`);

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe(`rgba(96, 144, 32, ${112 / 255})`);
  });

  function TestComponent() {
    const color = useSharedValue('#105060');

    const animatedStyle = useAnimatedStyle(() => {
      return {
        backgroundColor: withTiming(color.value, { duration: 500 }),
      };
    });

    return (
      <View>
        <Animated.View style={animatedStyle} testID="view" />
        <Button
          onPress={() => {
            color.value = '#609020';
          }}
          title="run animation"
          testID="button"
        />
      </View>
    );
  }

  it('interpolates with withTiming animation', () => {
    jest.useFakeTimers();

    const { getByTestId } = render(<TestComponent />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle(
      { backgroundColor: '#105060' },
      { shouldMatchAllProps: true }
    );

    fireEvent.press(button);
    jest.advanceTimersByTime(250);

    expect(view).toHaveAnimatedStyle(
      { backgroundColor: 'rgba(71, 117, 73, 1)' },
      { shouldMatchAllProps: true }
    );

    jest.advanceTimersByTime(250);

    expect(view).toHaveAnimatedStyle(
      { backgroundColor: 'rgba(96, 144, 32, 1)' },
      { shouldMatchAllProps: true }
    );

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});
