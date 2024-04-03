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
      [Easing.back, [0]],
      [Easing.back, [4.75]],
      [Easing.bezier, [0.25, 0.1, 0.25, 1]],
      [Easing.bezier, [0.93, 2, 0.08, -0.96]],
      [Easing.elastic, [0]],
      [Easing.elastic, [10]],
      [Easing.poly, [1.5]],
      [Easing.poly, [10]],
      [Easing.poly, [5.5]],
      [Easing.poly, [4]],
      [Easing.steps, [7, true]],
      [Easing.steps, [1.5, true]],
      [Easing.steps, [1.5, false]],
    ] as const
  ).forEach((testArray) => {
    const [easing, argumentSet] = testArray;
    const message = `Easing.${easing.name}(${argumentSet.join(', ')})`;
    const snapshotName = `${easing.name}_${argumentSet
      .join('_')
      .replace(/\./g, '$')
      .replace(/-/g, '$$')}`;

    test(message, async () => {
      const [updates, nativeUpdates] = await getSnaphotUpdates(
        //@ts-ignore This error is because various easing functions accept different number of arguments
        easing(...argumentSet)
      );
      expect(updates).toMatchSnapshots(
        Snapshots[snapshotName as keyof typeof Snapshots]
      );
      expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
    });
  });

  [
    Easing.bounce,
    Easing.circle,
    Easing.cubic,
    Easing.ease,
    Easing.exp,
    Easing.linear,
    Easing.quad,
    Easing.sin,
  ].forEach((easing) => {
    test(`easing.${easing.name}`, async () => {
      const [updates, nativeUpdates] = await getSnaphotUpdates(easing);
      expect(updates).toMatchSnapshots(
        Snapshots[easing.name as keyof typeof Snapshots]
      );
      expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
    });
  });

  [Easing.in, Easing.out, Easing.inOut].forEach((easing) => {
    test(`Easing.${easing.name}(Easing.elastic(10))`, async () => {
      const [updates, nativeUpdates] = await getSnaphotUpdates(
        easing(Easing.elastic(10))
      );
      expect(updates).toMatchSnapshots(
        Snapshots[easing.name as keyof typeof Snapshots]
      );
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
