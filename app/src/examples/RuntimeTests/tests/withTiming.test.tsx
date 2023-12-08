import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  coral: [0xff7f50ff, 'rgb(255,127,80)', '#ff7f50ff', 'coral'],
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

  const style = useAnimatedStyle(() => {
    callTracker('useAnimatedStyleTracker');
    return {
      width: withTiming(widthSV.value, { duration }, callTrackerFn('width')),
      backgroundColor: withTiming(
        colorSV.value,
        { duration: duration * 2 },
        callTrackerFn('color')
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

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column', backgroundColor: 'beige' },
  animatedBox: {
    width: 0,
    opacity: 0,
    height: 80,
    margin: 30,
    // backgroundColor: '#70a5e0',
  },
});

describe('With timing animation works with COLORS 🎨', () => {
  (
    [
      ['color as string "cornflowerblue"', EXAMPLE_COLORS.cornflowerblue[0]],
      ['color as hex number 0x6495ed', EXAMPLE_COLORS.cornflowerblue[1]],
      [
        'color as rgb string "rgb(100,149,237)"',
        EXAMPLE_COLORS.cornflowerblue[2],
      ],
      [
        'color as color string "cornflowerblue"',
        EXAMPLE_COLORS.cornflowerblue[3],
      ],
    ] as const
  ).forEach((entry) => {
    const [description, color] = entry;
    test(description, async () => {
      await render(<AnimatedComponent color2={color} />);
      const component = getTestComponent('AnimatedComponent');
      await wait(600);

      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        EXAMPLE_COLORS.cornflowerblue[2],
        ComparisonMode.COLOR
      );
    });
  });
});

describe('With timing tests', () => {
  test('test animating width', async () => {
    await render(<AnimatedComponent />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('width')).toBe(
      '100',
      ComparisonMode.DISTANCE
    );
  });

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
