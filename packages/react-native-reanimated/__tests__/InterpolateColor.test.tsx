import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Button, View } from 'react-native';

import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from '../src';

describe('colors interpolation', () => {
  test('interpolates rgb without gamma correction', () => {
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

  test('interpolates rgb with gamma correction', () => {
    const colors = ['#105060', '#609020'];

    let interpolatedColor = interpolateColor(0.5, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(71, 117, 73, 1)');

    interpolatedColor = interpolateColor(0, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 1)');

    interpolatedColor = interpolateColor(1, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 1)');
  });

  test('interpolates hsv', () => {
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

  test('interpolates corrected hsv', () => {
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

  test('interpolates css colors', () => {
    const colors = ['red', 'green'];
    const interpolatedColor = interpolateColor(0.5, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(186, 93, 0, 1)');
  });

  test('interpolates semi-transparent colors', () => {
    const colors = ['#10506050', '#60902070'];
    let interpolatedColor = interpolateColor(0.5, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(71, 117, 73, 0.376)');

    interpolatedColor = interpolateColor(0, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 0.314)');

    interpolatedColor = interpolateColor(1, [0, 1], colors);
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 0.439)');

    interpolatedColor = interpolateColor(0.5, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(23, 120, 54, 0.376)');

    interpolatedColor = interpolateColor(0, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(16, 80, 96, 0.314)');

    interpolatedColor = interpolateColor(1, [0, 1], colors, 'HSV');
    expect(interpolatedColor).toBe('rgba(96, 144, 32, 0.439)');
  });

  test('handles tiny values', () => {
    const colors = ['#00000000', '#ff802001'];

    // We don't want output like "rgba(4, 2, 0, 3.921568627450981e-7)":
    const interpolatedColor = interpolateColor(0.0001, [0, 1], colors);
    expect(interpolatedColor).toBe(`rgba(4, 2, 0, 0)`);
  });

  describe('simple transparent to color interpolation', () => {
    const cases = [
      {
        name: 'transparent to color at midpoint',
        value: 0.5,
        inputRange: [0, 1],
        outputRange: ['transparent', '#ff0000'],
        expected: 'rgba(255, 0, 0, 0.5)',
      },
      {
        name: 'transparent at start position',
        value: 0,
        inputRange: [0, 1],
        outputRange: ['transparent', '#ff0000'],
        expected: 'rgba(255, 0, 0, 0)',
      },
      {
        name: 'color at end position',
        value: 1,
        inputRange: [0, 1],
        outputRange: ['transparent', '#ff0000'],
        expected: 'rgba(255, 0, 0, 1)',
      },
      {
        name: 'transparent to transparent',
        value: 0.5,
        inputRange: [0, 1],
        outputRange: ['transparent', 'transparent'],
        expected: 'rgba(0, 0, 0, 0)',
      },
    ];

    const colorSpaces: Array<{
      colorSpace: 'RGB' | 'HSV' | 'LAB';
      options?: Record<string, unknown>;
      eps?: number;
    }> = [
      { colorSpace: 'RGB' },
      { colorSpace: 'RGB', options: { gamma: 1 } },
      { colorSpace: 'HSV' },
      { colorSpace: 'HSV', options: { useCorrectedHSVInterpolation: false } },
      // LAB may produce slightly different results, but the differences are usually small
      { colorSpace: 'LAB', eps: 1e-5 },
    ];

    colorSpaces.forEach(({ colorSpace, options, eps }) => {
      test.each(cases)(
        `$name using ${colorSpace}${options ? ` with options ${JSON.stringify(options)}` : ''}`,
        ({ value, inputRange, outputRange, expected }) => {
          const result = interpolateColor(
            value,
            inputRange,
            outputRange,
            colorSpace,
            options
          );

          if (eps) {
            const getChannels = (color: string) =>
              color
                .replace('rgba(', '')
                .replace(')', '')
                .split(',')
                .map((v) => parseFloat(v.trim()));

            getChannels(result).forEach((v, i) => {
              expect(v).toBeCloseTo(getChannels(expected)[i], eps);
            });
          } else {
            expect(result).toBe(expected);
          }
        }
      );
    });
  });

  describe('color interpolation with multiple transparent colors', () => {
    const inputRange = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const outputRange = [
      'transparent',
      'transparent',
      'red',
      'transparent',
      'blue',
      '#00ff00',
    ];

    const cases: [number, string][] = [
      [0.1, 'rgba(255, 0, 0, 0)'], // red transparent
      [0.2, 'rgba(255, 0, 0, 0)'], // red transparent
      [0.3, 'rgba(255, 0, 0, 0.5)'], // between transparent red and red
      [0.4, 'rgba(255, 0, 0, 1)'], // red
      [0.5, 'rgba(255, 0, 0, 0.5)'], // between red and transparent red
      [0.6, 'rgba(255, 0, 0, 0)'], // red transparent
      [0.6000001, 'rgba(0, 0, 255, 0)'], // blue transparent
      [0.7, 'rgba(0, 0, 255, 0.5)'], // between transparent blue and blue
      [0.8, 'rgba(0, 0, 255, 1)'], // blue
      [0.9, 'rgba(0, 127.5, 127.5, 1)'], // between blue and green
      [1, 'rgba(0, 255, 0, 1)'], // green
    ];

    test.each(cases)(`for value %s, the result is %s`, (value, expected) => {
      expect(
        interpolateColor(value, inputRange, outputRange, 'RGB', {
          gamma: 1,
        })
      ).toBe(expected);
    });
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

  test('interpolates with withTiming animation', () => {
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

    const rendered = render(<TestComponent />).toJSON();
    expect(rendered).toMatchSnapshot();
  });
});
