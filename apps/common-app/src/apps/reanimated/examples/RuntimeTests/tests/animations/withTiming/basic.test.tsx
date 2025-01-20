import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ComparisonMode } from '../../../ReJest/types';
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
} from '../../../ReJest/RuntimeTestsApi';

enum Tracker {
  UseAnimatedStyle = 'useAnimatedStyleTracker',
  Height = 'heightTracker',
  Width = 'widthTracker',
}

const WIDTH_COMPONENT_ACTIVE_REF = 'WidthComponentActive';
const WIDTH_COMPONENT_PASSIVE_REF = 'WidthComponentPassive';

type Width = number | `${number}%` | 'auto';

describe('withTiming animation of WIDTH', () => {
  const WidthComponent = ({
    startWidth,
    finalWidth,
    compilerApi,
  }: {
    startWidth: Width;
    finalWidth: Width;
    compilerApi: boolean;
  }) => {
    const widthActiveSV = useSharedValue(startWidth);
    const widthPassiveSV = useSharedValue(startWidth);

    const refActive = useTestRef(WIDTH_COMPONENT_ACTIVE_REF);
    const refPassive = useTestRef(WIDTH_COMPONENT_PASSIVE_REF);

    const styleActive = useAnimatedStyle(() => {
      return {
        width: withTiming(compilerApi ? widthActiveSV.get() : widthActiveSV.value, { duration: 500 }),
      };
    });
    const stylePassive = useAnimatedStyle(() => {
      return {
        width: compilerApi ? widthPassiveSV.get() : widthPassiveSV.value,
      };
    });

    useEffect(() => {
      if (compilerApi) {
        widthActiveSV.set(finalWidth);
      } else {
        widthActiveSV.value = finalWidth;
      }
    }, [widthActiveSV, finalWidth, compilerApi]);

    useEffect(() => {
      if (compilerApi) {
        widthPassiveSV.set(withTiming(finalWidth, { duration: 500 }));
      } else {
        widthPassiveSV.value = withTiming(finalWidth, { duration: 500 });
      }
    }, [widthPassiveSV, finalWidth, compilerApi]);

    return (
      <View style={styles.container}>
        <Animated.View
          ref={refActive}
          style={[styles.animatedBox, { backgroundColor: 'palevioletred' }, styleActive]}
        />
        <Animated.View ref={refPassive} style={[styles.animatedBox, { backgroundColor: 'royalblue' }, stylePassive]} />
      </View>
    );
  };

  interface TestCase {
    startWidth: Width;
    finalWidth: Width;
    finalWidthInPixels: number;
    description: string;
    compilerApi: boolean;
  }
  test.each(
    [
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
        description: 'width from pixels to percents (not supported)',
      },
    ].reduce(
      (acc, element) => [
        ...acc,
        { ...element, compilerApi: false },
        { ...element, compilerApi: true, description: `${element.description} (compiler API)` },
      ],
      [] as Record<string, unknown>[],
    ) as unknown as Array<TestCase>,
  )(
    '${description}, from ${startWidth} to ${finalWidth}',
    async ({ startWidth, finalWidth, finalWidthInPixels, compilerApi }: TestCase) => {
      await render(<WidthComponent startWidth={startWidth} finalWidth={finalWidth} compilerApi={compilerApi} />);
      const componentActive = getTestComponent(WIDTH_COMPONENT_ACTIVE_REF);
      const WidthComponentPassive = getTestComponent(WIDTH_COMPONENT_PASSIVE_REF);
      await wait(1000);
      expect(await componentActive.getAnimatedStyle('width')).toBe(finalWidthInPixels, ComparisonMode.PIXEL);
      expect(await WidthComponentPassive.getAnimatedStyle('width')).toBe(finalWidthInPixels, ComparisonMode.PIXEL);
    },
  );

  test('Width from percent to pixels is NOT handled correctly', async () => {
    await render(<WidthComponent startWidth={'20%'} finalWidth={100} compilerApi={false} />);
    const componentActive = getTestComponent(WIDTH_COMPONENT_ACTIVE_REF);
    const WidthComponentPassive = getTestComponent(WIDTH_COMPONENT_PASSIVE_REF);
    await wait(1000);
    expect(await componentActive.getAnimatedStyle('width')).not.toBe(100, ComparisonMode.PIXEL);
    expect(await WidthComponentPassive.getAnimatedStyle('width')).not.toBe(100, ComparisonMode.PIXEL);
  });
});

describe('withTiming, test CALLBACKS', () => {
  const CallbackComponent = () => {
    const sv = useSharedValue(0);

    const style = useAnimatedStyle(() => {
      callTracker(Tracker.UseAnimatedStyle);
      return {
        width: withTiming(sv.value, { duration: 200 }, callTrackerFn(Tracker.Width)),
        height: withDelay(10, withTiming(sv.value, { duration: 400 }, callTrackerFn(Tracker.Height))),
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
    height: 80,
    margin: 30,
  },
});
