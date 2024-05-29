/* eslint-disable no-inline-styles/no-inline-styles */
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn, runOnUI } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  getTestComponent,
  wait,
  mockAnimationTimer,
  recordAnimationUpdates,
  callTracker,
  getTrackerCallCount,
  registerValue,
  getRegisteredValue,
  Presets,
  callTrackerFn,
  notify,
  waitForNotify,
  clearRenderOutput,
} from '../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './Animations.snapshot';
import { ComparisonMode } from '../ReanimatedRuntimeTestsRunner/types';

const AnimatedComponent = () => {
  const widthSV = useSharedValue(0);
  const ref = useTestRef('AnimatedComponent');

  const animatedStyle1 = useAnimatedStyle(() => {
    callTracker('useAnimatedStyleTracker');
    return {
      width: withTiming(widthSV.value, { duration: 500 }, callTrackerFn('withTimingTracker')),
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    callTracker('useAnimatedStyleTracker');
    return {
      height: withTiming(widthSV.value, { duration: 500 }, callTrackerFn('withTimingTracker')),
    };
  });

  useEffect(() => {
    widthSV.value = 100;
  }, [widthSV]);

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: 'beige' }}>
      <Animated.View
        ref={ref}
        style={[
          {
            width: 0,
            height: 80,
            backgroundColor: 'chocolate',
            margin: 30,
          },
          animatedStyle1,
        ]}
      />
      <Animated.View
        style={[
          {
            width: 80,
            height: 0,
            backgroundColor: 'teal',
            margin: 30,
          },
          animatedStyle2,
        ]}
      />
    </View>
  );
};

const AnimatedComponentWithNotify = () => {
  const widthSV = useSharedValue(0);
  const ref = useTestRef('AnimatedComponent');

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(widthSV.value, { duration: 500 }),
    };
  });

  useEffect(() => {
    widthSV.value = 100;

    setTimeout(() => {
      notify('notifyJS');
      runOnUI(() => {
        notify('notifyUI');
      })();
    }, 1000);
  }, [widthSV]);

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: 'beige' }}>
      <Animated.View
        ref={ref}
        style={[
          {
            width: 0,
            height: 80,
            backgroundColor: 'chocolate',
            margin: 30,
          },
          style,
        ]}
      />
    </View>
  );
};

const SharedValueComponent = ({ initialValue }: { initialValue: any }) => {
  const sharedValue = useSharedValue(initialValue);
  registerValue('sv', sharedValue);
  return <Text>{initialValue}</Text>;
};

const TOP = 41;
const LEFT = 42;
const MARGIN = 10;
const LayoutAnimation = () => {
  const ref = useTestRef('AnimatedComponent');

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: 'beige' }}>
      <Animated.View
        ref={ref}
        entering={FadeIn}
        style={{
          top: TOP,
          left: LEFT,
          width: 50,
          height: 50,
          backgroundColor: 'chocolate',
          margin: MARGIN,
        }}
      />
    </View>
  );
};

describe('Tests of animations', () => {
  test.only('withTiming - expect error', async () => {
    await render(<AnimatedComponent />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('width')).toBe('123');
  });

  test.only('withTiming - not - expect error', async () => {
    await render(<AnimatedComponent />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('width')).not.toBe('100');
  });

  test.only('withTiming - with not', async () => {
    await render(<AnimatedComponent />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('width')).not.toBe('123');
  });

  test.only('withTiming - expect pass', async () => {
    await render(<AnimatedComponent />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('width')).toBe('100');
  });

  test('withTiming - expect callback call', async () => {
    await render(<AnimatedComponent />);
    await wait(600);
    expect(getTrackerCallCount('useAnimatedStyleTracker')).toBeCalled(3);

    expect(getTrackerCallCount('useAnimatedStyleTracker')).toBeCalledUI(1);
    expect(getTrackerCallCount('useAnimatedStyleTracker')).toBeCalledJS(2);

    expect(getTrackerCallCount('withTimingTracker')).toBeCalledUI(1);
    expect(getTrackerCallCount('withTimingTracker')).toBeCalledJS(0);
  });

  test('withTiming - test number preset', async () => {
    for (const preset of Presets.numbers) {
      /*
        This test checks the value of sharedValue after the component mounts. Therefore, we need to clear the render output to ensure that a new component will be fully mounted, not just rerendered.
      */
      await clearRenderOutput();
      await render(<SharedValueComponent initialValue={preset} />);
      const sharedValue = await getRegisteredValue('sv');
      expect(sharedValue.onJS).toBe(preset, ComparisonMode.NUMBER);
      expect(sharedValue.onUI).toBe(preset, ComparisonMode.NUMBER);
    }
  });

  test('layoutAnimation - top & left', async () => {
    await render(<LayoutAnimation />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('top')).toBe(`${TOP + MARGIN}`);
    expect(await component.getAnimatedStyle('left')).toBe(`${LEFT + MARGIN}`);
  });

  test('layoutAnimation - opacity', async () => {
    await render(<LayoutAnimation />);
    const component = getTestComponent('AnimatedComponent');
    await wait(600);
    expect(await component.getAnimatedStyle('opacity')).toBe('1');
  });

  test.only('withTiming - match snapshot', async () => {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();
    await render(<AnimatedComponent />);
    await wait(1000);
    console.log(updatesContainer.getUpdates());
    console.log(await updatesContainer.getNativeSnapshots());

    expect(updatesContainer.getUpdates()).toMatchSnapshots(Snapshots.animation3);
    // @ts-ignore TEMP
    expect(updatesContainer.getUpdates()).toMatchNativeSnapshots(await updatesContainer.getNativeSnapshots());
  });

  test.only('layoutAnimation - entering', async () => {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();
    await render(<LayoutAnimation />);
    await wait(600);
    console.log(await updatesContainer.getNativeSnapshots());
    expect(updatesContainer.getUpdates()).toMatchSnapshots(Snapshots.layoutAnimation);
  });

  test('withTiming - notify', async () => {
    await render(<AnimatedComponentWithNotify />);
    const component = getTestComponent('AnimatedComponent');
    await waitForNotify('notifyJS');
    await waitForNotify('notifyUI');
    expect(await component.getAnimatedStyle('width')).toBe('100');
  });
});
