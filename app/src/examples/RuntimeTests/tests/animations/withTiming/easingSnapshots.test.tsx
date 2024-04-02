import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  EasingFunction,
  EasingFunctionFactory,
} from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  useTestRef,
  wait,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './withTiming.snapshot';

const AnimatedComponent = ({
  easing,
}: {
  easing: EasingFunction | EasingFunctionFactory | undefined;
}) => {
  const widthSV = useSharedValue(0);
  const ref = useTestRef('AnimatedComponent');

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(
        widthSV.value,
        easing ? { duration: 1000, easing } : { duration: 1000 }
      ),
    };
  });

  useEffect(() => {
    widthSV.value = 100;
  }, [widthSV]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.animatedBox, style]} />
    </View>
  );
};

async function getSnaphotUpdates(
  easingFn: EasingFunction | EasingFunctionFactory | undefined
) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();
  await render(<AnimatedComponent easing={easingFn} />);
  await wait(1200);
  const updates = updatesContainer.getUpdates();
  const nativeUpdates = await updatesContainer.getNativeSnapshots();
  return [updates, nativeUpdates];
}

describe('withTiming snapshots 📸, test EASING', () => {
  test('No easing function', async () => {
    const [updates, nativeUpdates] = await getSnaphotUpdates(undefined);
    expect(updates).toMatchSnapshots(Snapshots.noEasing);
    expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
  });

  (
    [
      ['back', [[0], [4.75]]],
      [
        'bezier',
        [
          [0.25, 0.1, 0.25, 1],
          [0.93, 2, 0.08, -0.96],
        ],
      ],
      ['elastic', [[0], [10]]],
      ['poly', [[1.5], [10], [5.5], [4]]],
      [
        'steps',
        [
          [7, true],
          [1.5, true],
          [1.5, false],
        ],
      ],
    ] as const
  ).forEach((testArray) => {
    const [easingName, argumentSets] = testArray;

    argumentSets.forEach((argumentSet, idx: number) => {
      //@ts-ignore This error is because various easing functions accept different number of arguments
      const easing = Easing[easingName](...argumentSet);
      const message = `Easing.${easingName}(${argumentSet.join(',')})`;
      const snapshotName = `${easingName}${idx}` as keyof typeof Snapshots;

      test(message, async () => {
        const [updates, nativeUpdates] = await getSnaphotUpdates(easing);
        expect(updates).toMatchSnapshots(Snapshots[snapshotName]);
        expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
      });
    });
  });

  (
    [
      'bounce',
      'circle',
      'cubic',
      'ease',
      'exp',
      'linear',
      'quad',
      'sin',
    ] as const
  ).forEach((easingName) => {
    test(`Easing.${easingName}`, async () => {
      const [updates, nativeUpdates] = await getSnaphotUpdates(
        Easing[easingName]
      );
      expect(updates).toMatchSnapshots(Snapshots[easingName]);
      expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
    });
  });

  (['in', 'inOut'] as const).forEach((easingName) => {
    test(`Easing.${easingName}(Easing.elastic(10))`, async () => {
      const easing = Easing[easingName](Easing.elastic(10));
      const [updates, nativeUpdates] = await getSnaphotUpdates(easing);
      expect(updates).toMatchSnapshots(Snapshots[easingName]);
      expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
    });
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    height: 80,
  },
});
