import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import React from 'react';
import { ComparisonMode } from '../../../ReanimatedRuntimeTestsRunner/types';
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
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

enum Tracker {
  UseAnimatedStyle = 'useAnimatedStyleTracker',
  Height = 'heightTracker',
  Width = 'widthTracker',
}

const WIDTH_COMPONENT_REF = 'WidthComponent';
type Width = number | `${number}%` | 'auto';

describe('withSpring animation of WIDTH', () => {
  const WidthComponent = ({ startWidth, finalWidth }: { startWidth: Width; finalWidth: Width }) => {
    const widthSV = useSharedValue(startWidth);
    const ref = useTestRef(WIDTH_COMPONENT_REF);

    const style = useAnimatedStyle(() => {
      return {
        width: withSpring(widthSV.value, { duration: 500 }),
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

  interface TestCase {
    startWidth: Width;
    finalWidth: Width;
    finalWidthInPixels: number;
    description: string;
  }
  test.each([
    { startWidth: 0, finalWidth: 100, finalWidthInPixels: 100, description: 'width in pixels' },
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
      startWidth: 20,
      finalWidth: '40%',
      finalWidthInPixels: Dimensions.get('window').width * 0.4,
      description: 'width from pixels to percents',
    },
  ] as Array<TestCase>)(
    '${description}, from ${startWidth} to ${finalWidth}',
    async ({ startWidth, finalWidth, finalWidthInPixels }: TestCase) => {
      await render(<WidthComponent startWidth={startWidth} finalWidth={finalWidth} />);
      const component = getTestComponent(WIDTH_COMPONENT_REF);
      await wait(1000);
      expect(await component.getAnimatedStyle('width')).toBe(finalWidthInPixels, ComparisonMode.DISTANCE);
    },
  );

  test('Width from percent to pixels is NOT handled correctly', async () => {
    await render(<WidthComponent startWidth={'20%'} finalWidth={100} />);
    const component = getTestComponent(WIDTH_COMPONENT_REF);
    await wait(1000);
    expect(await component.getAnimatedStyle('width')).not.toBe(100, ComparisonMode.DISTANCE);
  });
});

describe('withSpring, test CALLBACKS', () => {
  const CallbackComponent = () => {
    const sv = useSharedValue(0);

    const style = useAnimatedStyle(() => {
      callTracker(Tracker.UseAnimatedStyle);
      return {
        width: withSpring(sv.value, { duration: 200 }, callTrackerFn(Tracker.Width)),
        height: withDelay(10, withSpring(sv.value, { duration: 400 }, callTrackerFn(Tracker.Height))),
        opacity: 1,
      };
    });

    useEffect(() => {
      sv.value = 100;
    }, [sv]);

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.animatedBox, style]} />
      </View>
    );
  };

  test('withTiming - test callback of independent withTiming animations', async () => {
    await render(<CallbackComponent />);
    await wait(600);

    expect(getTrackerCallCount(Tracker.UseAnimatedStyle)).toBeCalled(3);
    expect(getTrackerCallCount(Tracker.UseAnimatedStyle)).toBeCalledUI(1);
    expect(getTrackerCallCount(Tracker.UseAnimatedStyle)).toBeCalledJS(2);

    expect(getTrackerCallCount(Tracker.Width)).toBeCalledUI(1);
    expect(getTrackerCallCount(Tracker.Width)).toBeCalledJS(0);

    expect(getTrackerCallCount(Tracker.Height)).toBeCalledUI(1);
    expect(getTrackerCallCount(Tracker.Height)).toBeCalledJS(0);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 0,
    opacity: 0,
    height: 80,
    margin: 30,
  },
});
