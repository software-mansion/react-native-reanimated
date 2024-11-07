import React, { useEffect } from 'react';
import { View, StyleSheet, Easing as EasingRN } from 'react-native';
import type { EasingFunction, EasingFunctionFactory } from 'react-native-reanimated';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  wait,
  unmockAnimationTimer,
} from '../../../ReJest/RuntimeTestsApi';
import { EasingSnapshots } from './withTiming.snapshot';
import { ErrorBoundary } from '../../../ReJest/RuntimeTestsRunner';

const ActiveAnimatedComponent = ({ easing }: { easing: EasingFunction | EasingFunctionFactory | undefined }) => {
  const widthSV = useSharedValue(0);

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
      <Animated.View style={[styles.animatedBox, style]} />
    </View>
  );
};

const PassiveAnimatedComponent = ({ easing }: { easing: EasingFunction | EasingFunctionFactory | undefined }) => {
  const widthSV = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    return {
      width: widthSV.value,
    };
  });

  useEffect(() => {
    widthSV.value = withTiming(100, easing ? { duration: 1000, easing } : { duration: 1000 });
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedBox, style]} />
    </View>
  );
};

async function getSnapshotUpdates(easingFn: EasingFunction | EasingFunctionFactory | undefined) {
  await mockAnimationTimer();
  const updatesContainerActive = await recordAnimationUpdates();
  await render(<ActiveAnimatedComponent easing={easingFn} />);
  await wait(1200);
  const activeUpdates = updatesContainerActive.getUpdates();
  const activeNaiveUpdates = await updatesContainerActive.getNativeSnapshots();

  await unmockAnimationTimer();
  await mockAnimationTimer();

  const updatesContainerPassive = await recordAnimationUpdates();
  await render(<PassiveAnimatedComponent easing={easingFn} />);
  await wait(1200);

  // For passive updates we have the following order of operations:
  // 1. Slightly increase sharedValue
  // 2. Once the sharedValue changed update the style
  // Therefore the first frame is not recorded and we have to hardcode it

  const passiveUpdates = [{ width: 0 }, ...updatesContainerPassive.getUpdates()];

  return [activeUpdates, activeNaiveUpdates, passiveUpdates];
}

describe('withTiming snapshots 📸, test EASING', () => {
  describe('Invalid easing', () => {
    test('Easing imported from react-native throws an error', async () => {
      await expect(async () => {
        await render(
          <ErrorBoundary>
            <ActiveAnimatedComponent easing={EasingRN.linear} />
          </ErrorBoundary>,
        );
      }).toThrow(
        'Error: [Reanimated] The easing function is not a worklet. Please make sure you import `Easing` from react-native-reanimated.',
      );
    });

    test('Easing must be a worklet, otherwise it throws an error', async () => {
      await expect(async () => {
        await render(
          <ErrorBoundary>
            <ActiveAnimatedComponent
              easing={() => {
                return 42;
              }}
            />
          </ErrorBoundary>,
        );
      }).toThrow(
        'Error: [Reanimated] The easing function is not a worklet. Please make sure you import `Easing` from react-native-reanimated.',
      );
    });
  });

  test('No easing function', async () => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnapshotUpdates(undefined);
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots.noEasing);
    expect(passiveUpdates).toMatchSnapshots(EasingSnapshots.noEasing);

    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });

  test.each([
    ['back', Easing.back, [0]],
    ['back', Easing.back, [4.75]],
    ['bezier', Easing.bezier, [0.25, 0.1, 0.25, 1]],
    ['bezier', Easing.bezier, [0.93, 2, 0.08, -0.96]],
    ['elastic', Easing.elastic, [0]],
    ['elastic', Easing.elastic, [10]],
    ['poly', Easing.poly, [1.5]],
    ['poly', Easing.poly, [10]],
    ['poly', Easing.poly, [5.5]],
    ['poly', Easing.poly, [4]],
    ['steps', Easing.steps, [7, true]],
    ['steps', Easing.steps, [1.5, true]],
    ['steps', Easing.steps, [1.5, false]],
  ] as const)('Easing.${0}(${2})', async ([easingName, easing, argumentSet]) => {
    const snapshotName = `${easingName}_${argumentSet.join('_').replace(/\./g, '$').replace(/-/g, '$')}`;

    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnapshotUpdates(
      // @ts-ignore This error is because various easing functions accept different number of arguments
      easing(...argumentSet),
    );
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots[snapshotName as keyof typeof EasingSnapshots]);
    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);

    if (easing !== Easing.steps) {
      // passiveUpdates of steps don't record duplicated frames, so we execute this test only for constant motion, not for the quantified one
      expect(passiveUpdates).toMatchSnapshots(EasingSnapshots[snapshotName as keyof typeof EasingSnapshots]);
    }
  });

  test.each([
    ['bounce', Easing.bounce],
    ['circle', Easing.circle],
    ['cubic', Easing.cubic],
    ['ease', Easing.ease],
    ['linear', Easing.linear],
    ['quad', Easing.quad],
    ['sin', Easing.sin],
  ] as const)('Easing.%p', async ([easingName, easing]) => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnapshotUpdates(easing);
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots[easingName]);
    expect(passiveUpdates).toMatchSnapshots(EasingSnapshots[easingName]);
    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });
  test('Easing.exp', async () => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnapshotUpdates(Easing.exp);
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots.exp);
    // TODO Investigate why easing.exp works different than other easings
    expect(passiveUpdates).toMatchSnapshots([{ width: 0 }, ...EasingSnapshots.exp]);
    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });

  test.each([
    ['in', Easing.in],
    ['out', Easing.out],
    ['inOut', Easing.inOut],
  ] as const)('Easing.${0}(Easing.elastic(10))', async ([easingName, easing]) => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnapshotUpdates(easing(Easing.elastic(10)));
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots[easingName]);
    expect(passiveUpdates).toMatchSnapshots(EasingSnapshots[easingName]);
    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    backgroundColor: 'royalblue',
    height: 80,
    margin: 40,
  },
});
