import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import React from 'react';
import { ComparisonMode } from '../ReanimatedRuntimeTestsRunner/types';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  getTestComponent,
  wait,
  callTracker,
  callTrackerFn,
  getTrackerCallCount,
} from '../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

const EXAMPLE_COLORS = {
  coral: [0xff7f50, 'rgb(255,127,80)', '#ff7f50', 'coral'],
  cornflowerblue: [0x6495ed, 'rgb(100,149,237)', '#6495ed', 'cornflowerblue'],
};

const AnimatedComponent = ({
  color1 = EXAMPLE_COLORS.coral[3],
  color2 = EXAMPLE_COLORS.cornflowerblue[3],
  duration = 200,
}: {
  color1?: string | number;
  color2?: string | number;
  duration?: number;
}) => {
  const widthSV = useSharedValue(0);
  const colorSV = useSharedValue(color1);
  const ref = useTestRef('AnimatedComponent');

  // @ts-ignore number is not a valid color
  const style = useAnimatedStyle(() => {
    callTracker('useAnimatedStyleTracker');
    return {
      width: withTiming(widthSV.value, { duration }, callTrackerFn('width')),
      backgroundColor: withDelay(
        100,
        withTiming(
          colorSV.value,
          { duration: duration * 2 },
          callTrackerFn('color')
        )
      ),
      opacity: 1,
    };
  });

  useEffect(() => {
    widthSV.value = 100;
    colorSV.value = color2;
  }, [widthSV, colorSV, color2]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.animatedBox, style]} />
    </View>
  );
};

describe('withTiming animation of COLOR 🎨', () => {
  (
    [
      {
        description:
          'color as hex number 0x6495ed\n\t\t⚠️ This is not a valid color format, this behavior may be broken in the future\n\t',
        color: EXAMPLE_COLORS.cornflowerblue[0],
      },
      {
        description: 'color as rgb string "rgb(100,149,237)"',
        color: EXAMPLE_COLORS.cornflowerblue[1],
      },
      {
        description: 'color as hex string "0x6495ed"',
        color: EXAMPLE_COLORS.cornflowerblue[2],
      },
      {
        description: 'color as color string "cornflowerblue"',
        color: EXAMPLE_COLORS.cornflowerblue[3],
      },
    ] as const
  ).forEach((testCase) => {
    const { description, color } = testCase;
    test(description, async () => {
      await render(<AnimatedComponent color2={color} />);
      const component = getTestComponent('AnimatedComponent');
      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        EXAMPLE_COLORS.coral[2],
        ComparisonMode.COLOR
      );
      await wait(600);

      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        EXAMPLE_COLORS.cornflowerblue[2],
        ComparisonMode.COLOR
      );
    });
  });
});

describe('withTiming animation of WIDTH', () => {
  const AnimatedWidth = ({
    startWidth,
    finalWidth,
  }: {
    startWidth: number | `${number}%` | 'auto';
    finalWidth: number | `${number}%` | 'auto';
  }) => {
    const widthSV = useSharedValue(startWidth);
    const ref = useTestRef('AnimatedWidth');

    const style = useAnimatedStyle(() => {
      return {
        width: withTiming(widthSV.value, { duration: 200 }),
      };
    });

    useEffect(() => {
      widthSV.value = finalWidth;
    }, [widthSV, finalWidth]);

    return (
      <View style={styles.container}>
        <Animated.View ref={ref} style={[styles.animatedBox, style]} />
      </View>
    );
  };

  (
    [
      {
        startWidth: 0,
        finalWidth: 100,
        finalWidthInPixels: 100,
        description: 'width in pixels',
      },
      {
        startWidth: '0%',
        finalWidth: '100%',
        finalWidthInPixels: Dimensions.get('window').width,
        description: 'width in percents',
      },
      {
        startWidth: '0%',
        finalWidth: '75%',
        finalWidthInPixels: Dimensions.get('window').width * 0.75,
        description: 'width in percents',
      },
      {
        startWidth: '20%',
        finalWidth: 100,
        finalWidthInPixels: 100,
        description: 'width from percents to pixels',
      },
      {
        startWidth: 20,
        finalWidth: '40%',
        finalWidthInPixels: Dimensions.get('window').width * 0.4,
        description: 'width from pixels to percents',
      },
      {
        startWidth: 'auto',
        finalWidth: '20%',
        finalWidthInPixels: Dimensions.get('window').width * 0.2,
        description: 'width from auto to percents',
      },
      {
        startWidth: 'auto',
        finalWidth: 20,
        finalWidthInPixels: 20,
        description: 'width from auto to pixels',
      },
    ] as const
  ).forEach((testCase) => {
    const { startWidth, finalWidth, finalWidthInPixels, description } =
      testCase;

    const fullDescription = `${description}, from ${startWidth} to ${finalWidth}`;
    test(fullDescription, async () => {
      await render(
        <AnimatedWidth startWidth={startWidth} finalWidth={finalWidth} />
      );
      const component = getTestComponent('AnimatedWidth');
      await wait(600);
      expect(await component.getAnimatedStyle('width')).toBe(
        finalWidthInPixels,
        ComparisonMode.DISTANCE
      );
    });
  });
});

describe('withTiming, test CALLBACKS', () => {
  test('withTiming - test callback of independent withTiming animations', async () => {
    await render(<AnimatedComponent />);
    await wait(600);

    expect(getTrackerCallCount('useAnimatedStyleTracker')).toBeCalled(3);

    expect(getTrackerCallCount('width')).toBeCalledUI(1);
    expect(getTrackerCallCount('width')).toBeCalledJS(0);

    expect(getTrackerCallCount('color')).toBeCalledUI(1);
    expect(getTrackerCallCount('color')).toBeCalledJS(0);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'beige',
  },
  animatedBox: {
    width: 0,
    opacity: 0,
    height: 80,
    margin: 30,
  },
});
