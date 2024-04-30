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
  wait,
  unmockAnimationTimer,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { EasingSnapshots } from './withTiming.snapshot';

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

async function getSnaphotUpdates(easingFn: EasingFunction | EasingFunctionFactory | undefined) {
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
  //We have to hardcode the first frame, since it doesn't get recorded
  const passiveUpdates = [{ width: 0 }, ...updatesContainerPassive.getUpdates()];

  return [activeUpdates, activeNaiveUpdates, passiveUpdates];
}

describe('withTiming snapshots 📸, test EASING', () => {
  test('No easing function', async () => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnaphotUpdates(undefined);

    expect(activeUpdates).toMatchSnapshots(EasingSnapshots.noEasing);
    expect(passiveUpdates).toMatchSnapshots(EasingSnapshots.noEasing);

    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });

  test.each([
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
  ])('Easing.${0}(${1})', async ([easing, argumentSet]) => {
    const snapshotName = `${(easing as Function).name}_${(argumentSet as any)
      .join('_')
      .replace(/\./g, '$')
      .replace(/-/g, '$')}`;

    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnaphotUpdates(
      //@ts-ignore This error is because various easing functions accept different number of arguments
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
    Easing.bounce,
    Easing.circle,
    Easing.cubic,
    Easing.ease,
    Easing.exp,
    Easing.linear,
    Easing.quad,
    Easing.sin,
  ])('Easing.%p', async easing => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnaphotUpdates(easing);
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots[easing.name as keyof typeof EasingSnapshots]);
    expect(passiveUpdates).toMatchSnapshots(EasingSnapshots[easing.name as keyof typeof EasingSnapshots]);
    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });

  test('Easing.exp', async () => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnaphotUpdates(Easing.exp);

    expect(activeUpdates).toMatchSnapshots(EasingSnapshots.exp);
    expect(passiveUpdates).toMatchSnapshots([{ width: 0 }, ...EasingSnapshots.exp]);
    expect(activeUpdates).toMatchNativeSnapshots(activeNativeUpdates, true);
  });

  test.each([(Easing.in, Easing.out, Easing.inOut)])('Easing.%p(Easing.elastic(10))', async easing => {
    const [activeUpdates, activeNativeUpdates, passiveUpdates] = await getSnaphotUpdates(easing(Easing.elastic(10)));
    expect(activeUpdates).toMatchSnapshots(EasingSnapshots[easing.name as keyof typeof EasingSnapshots]);
    expect(passiveUpdates).toMatchSnapshots(EasingSnapshots[easing.name as keyof typeof EasingSnapshots]);
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
