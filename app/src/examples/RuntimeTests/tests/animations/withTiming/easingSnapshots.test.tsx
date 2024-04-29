import { useEffect } from 'react';
import { View, StyleSheet, Easing as EasingRN } from 'react-native';
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
import { ErrorBoundary } from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

const AnimatedComponent = ({ easing }: { easing: EasingFunction | EasingFunctionFactory | undefined }) => {
  const widthSV = useSharedValue(0);
  const ref = useTestRef('AnimatedComponent');

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(widthSV.value, easing ? { duration: 1000, easing } : { duration: 1000 }),
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

async function getSnapshotUpdates(easingFn: EasingFunction | EasingFunctionFactory | undefined) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();
  await render(<AnimatedComponent easing={easingFn} />);
  await wait(1200);
  const updates = updatesContainer.getUpdates();
  const nativeUpdates = await updatesContainer.getNativeSnapshots();
  return [updates, nativeUpdates];
}

describe.only('withTiming, *****test***** invalid _easing_', async () => {
  test.failing(
    'Easing imported from react-native *throws* an error',
    'Error: [Reanimated] The easing function is not a worklet. Please make sure you import `Easing` from react-native-reanimated.',
    async () => {
      await render(
        <ErrorBoundary>
          <AnimatedComponent easing={EasingRN.linear} />
        </ErrorBoundary>,
      );
      await wait(1200);
    },
  );

  test.failing(
    'Easing must be a worklet, otherwise it throws an error',
    'Error: [Reanimated] The easing function is not a worklet. Please make sure you import `Easing` from react-native-reanimated.',
    async () => {
      await render(
        <ErrorBoundary>
          <AnimatedComponent
            easing={() => {
              return 42;
            }}
          />
        </ErrorBoundary>,
      );
      await wait(1200);
    },
  );
});

describe('withTiming snapshots 📸, test EASING', () => {
  test('No easing function', async () => {
    const [updates, nativeUpdates] = await getSnapshotUpdates(undefined);
    expect(updates).toMatchSnapshots(Snapshots.noEasing);
    expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
  });

  test.only.each([
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
  ])(
    '**LOL** Easing.${0}(${1}) **X** and & ***X*** ijin ****qwerty**** aefsd *****676767***** ijin **D*',
    async ([easing, argumentSet]) => {
      const snapshotName = `${(easing as Function).name}_${(argumentSet as any)
        .join('_')
        .replace(/\./g, '$')
        .replace(/-/g, '$')}`;

      const [updates, nativeUpdates] = await getSnapshotUpdates(
        //@ts-ignore This error is because various easing functions accept different number of arguments
        easing(...argumentSet),
      );
      expect(updates).toMatchSnapshots(Snapshots[snapshotName as keyof typeof Snapshots]);
      expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
    },
  );

  test.skip.each([
    Easing.bounce,
    Easing.circle,
    Easing.cubic,
    Easing.ease,
    Easing.exp,
    Easing.linear,
    Easing.quad,
    Easing.sin,
  ])('Easing.%p', async easing => {
    const [updates, nativeUpdates] = await getSnapshotUpdates(easing);
    expect(updates).toMatchSnapshots(Snapshots[easing.name as keyof typeof Snapshots]);
    expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
  });

  test.each([(Easing.in, Easing.out, Easing.inOut)])('Easing.%p(Easing.elastic(10))', async easing => {
    const [updates, nativeUpdates] = await getSnapshotUpdates(easing(Easing.elastic(10)));
    expect(updates).toMatchSnapshots(Snapshots[easing.name as keyof typeof Snapshots]);
    expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
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
