import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  clearRenderOutput,
  describe,
  expect,
  getTestComponent,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  test,
  unmockAnimationTimer,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { SingleViewSnapshot } from '../../../ReJest/TestRunner/UpdatesContainer';

enum TestAnimation {
  TIMING = 'withTiming',
  SEQUENCE = 'sequence of withTiming and withSpring',
}

const TEST_COMPONENT_ACTIVE_REF = 'TestComponentActive';
const TEST_COMPONENT_PASSIVE_REF = 'TestComponentPassive';
const TestComponent = ({
  applyWithDelay,
  testAnimation,
  delay,
}: {
  applyWithDelay: boolean;
  testAnimation: TestAnimation;
  delay: number;
}) => {
  const widthActiveSV = useSharedValue(100);
  const widthPassiveSV = useSharedValue(100);

  const refActive = useTestRef(TEST_COMPONENT_ACTIVE_REF);
  const refPassive = useTestRef(TEST_COMPONENT_PASSIVE_REF);

  const stylePassive = useAnimatedStyle(() => {
    return {
      width: widthPassiveSV.value,
    };
  });

  const getBaseAnimation = useCallback(
    (x: number): number => {
      'worklet';
      switch (testAnimation) {
        case TestAnimation.TIMING:
          return withTiming(x, { duration: 300 });
        case TestAnimation.SEQUENCE:
          return withSequence(withTiming(x, { duration: 150 }), withSpring(20, { duration: 150 }));
      }
    },
    [testAnimation],
  );

  const styleActive = useAnimatedStyle(() => {
    return {
      width: applyWithDelay
        ? withDelay(delay, getBaseAnimation(widthActiveSV.value))
        : getBaseAnimation(widthActiveSV.value),
    };
  });

  useEffect(() => {
    widthActiveSV.value = 150;
  }, [widthActiveSV]);

  useEffect(() => {
    widthPassiveSV.value = applyWithDelay ? withDelay(delay, getBaseAnimation(150)) : getBaseAnimation(150);
  }, [widthPassiveSV, applyWithDelay, getBaseAnimation, delay]);

  return (
    <View style={styles.container}>
      <Animated.View ref={refActive} style={[styles.animatedBox, { backgroundColor: 'limegreen' }, styleActive]} />
      <Animated.View ref={refPassive} style={[styles.animatedBox, { backgroundColor: 'forestgreen' }, stylePassive]} />
    </View>
  );
};

async function getSnapshotUpdates(testAnimation: TestAnimation, delay: number) {
  await unmockAnimationTimer();
  await mockAnimationTimer();
  const updatesContainerNoDelay = await recordAnimationUpdates();
  await render(<TestComponent applyWithDelay={false} testAnimation={testAnimation} delay={delay} />);
  await wait(350);

  let componentActive = getTestComponent(TEST_COMPONENT_ACTIVE_REF);
  let componentPassive = getTestComponent(TEST_COMPONENT_PASSIVE_REF);

  const noDelaySnapshots = {
    active: updatesContainerNoDelay.getUpdates(componentActive),
    passive: updatesContainerNoDelay.getUpdates(componentPassive),
    activeNative: await updatesContainerNoDelay.getNativeSnapshots(componentActive),
    passiveNative: await updatesContainerNoDelay.getNativeSnapshots(componentPassive),
  };

  await unmockAnimationTimer();
  await mockAnimationTimer();
  await clearRenderOutput();
  const updatesContainerWithDelay = await recordAnimationUpdates();
  await render(<TestComponent applyWithDelay={true} testAnimation={testAnimation} delay={delay} />);
  await wait(350 + delay);
  componentActive = getTestComponent(TEST_COMPONENT_ACTIVE_REF);
  componentPassive = getTestComponent(TEST_COMPONENT_PASSIVE_REF);

  const delaySnapshots = {
    active: updatesContainerWithDelay.getUpdates(componentActive),
    passive: updatesContainerWithDelay.getUpdates(componentPassive),
    activeNative: await updatesContainerWithDelay.getNativeSnapshots(componentActive),
    passiveNative: await updatesContainerWithDelay.getNativeSnapshots(componentPassive),
  };
  await clearRenderOutput();

  return {
    noDelaySnapshots,
    delaySnapshots,
  };
}

function compareActiveAndPassiveSnapshots(
  msg: string,
  {
    active,
    activeNative,
    passive,
    passiveNative,
  }: Record<'active' | 'activeNative' | 'passive' | 'passiveNative', SingleViewSnapshot>,
) {
  // animation from useAnimatedStyle does not record static frames in snapshot
  const fillerSize = active.length - passive.length;
  const filler = Array.from({ length: fillerSize }, () => {
    return {
      width: 100,
    };
  });
  expect([...filler, ...passive]).toMatchSnapshots(active);
  expect(active).toMatchNativeSnapshots(activeNative);
  expect(passive).toMatchNativeSnapshots(passiveNative);
}

const testCases = [
  { testAnimation: TestAnimation.TIMING, delay: 0 },
  { testAnimation: TestAnimation.SEQUENCE, delay: 0 },
  { testAnimation: TestAnimation.TIMING, delay: 100 },
  { testAnimation: TestAnimation.TIMING, delay: 500 },
  { testAnimation: TestAnimation.SEQUENCE, delay: 100 },
] as const;

for (const { testAnimation, delay } of testCases) {
  describe(`Apply **${delay}ms** delay to _${testAnimation}_`, () => {
    test('Components animated with `withDelay` of have same snapshot but moved in time', async () => {
      const { delaySnapshots, noDelaySnapshots } = await getSnapshotUpdates(testAnimation, delay);

      compareActiveAndPassiveSnapshots(
        'Components animated _without_ withDelay in two different ways have matching snapshots',
        noDelaySnapshots,
      );
      compareActiveAndPassiveSnapshots(
        'Components animated _with_ withDelay in two different ways have matching snapshots',
        delaySnapshots,
      );

      // Create snapshot of static animation consisting of frame {width: 100} repeated multiple times
      const fillerSize = delaySnapshots.active.length - noDelaySnapshots.active.length;
      const filler = Array.from({ length: fillerSize }, () => {
        return {
          width: 100,
        };
      });

      expect([...filler, ...noDelaySnapshots.active]).toMatchSnapshots(delaySnapshots.active);
    });
  });
}

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
