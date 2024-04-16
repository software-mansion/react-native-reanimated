import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  wait,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './withSpring.snapshot';
import { SpringConfig } from '../../../../../../../lib/typescript/reanimated2/animation/springUtils';

const AnimatedComponent = ({
  animateFrom,
  animateTo,
  config,
}: {
  animateFrom: number;
  animateTo: number;
  config: SpringConfig;
}) => {
  const widthSV = useSharedValue(animateFrom);

  const style = useAnimatedStyle(() => {
    return {
      width: withSpring(widthSV.value, config),
    };
  });

  useEffect(() => {
    widthSV.value = animateTo;
  }, [widthSV, animateTo]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedBox, style]} />
    </View>
  );
};

async function getSnaphotUpdates(animateFrom: number, animateTo: number, config: SpringConfig, waitTime = 2000) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();
  await render(<AnimatedComponent animateFrom={animateFrom} animateTo={animateTo} config={config} />);
  await wait(waitTime);

  const updates = updatesContainer.getUpdates();
  const nativeUpdates = await updatesContainer.getNativeSnapshots();

  return [updates, nativeUpdates];
}

describe('withSpring snapshots 📸, test various config', () => {
  test.each([
    [20, 300],
    [300, 50],
    [0, 150],
    [150, 0],
  ] as const)('Empty config, from ${0} to ${1}', async ([animateFrom, animateTo]) => {
    const [updates, nativeUpdates] = await getSnaphotUpdates(animateFrom, animateTo, {});
    const snapshotName = `empty_${animateFrom}_${animateTo}`;
    expect(updates).toMatchSnapshots(Snapshots[snapshotName]);
    expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
  });

  describe('Animate from 30 to 300, physics-based config', () => {
    test.only.each([
      [{ mass: 5 }, 10000],
      [{ mass: 0.5 }, 1200],
      [{ mass: 1 }, 3000],

      [{ mass: 5, damping: 20 }, 4000],
      [{ mass: 10, damping: 40 }, 4000],
      [{ mass: 0.5, damping: 5 }, 4000],

      [{ mass: 0.5, damping: 5, stiffness: 200 }, 4000],
      [{ mass: 1, damping: 5, stiffness: 2000 }, 4000],
      [{ mass: 0.75, damping: 5, stiffness: 50 }, 4000],
    ] as const)('From 30 to 300, ${0}', async ([config, waitTime]) => {
      const [updates, nativeUpdates] = await getSnaphotUpdates(30, 300, config, waitTime);
      console.log(updates.length);
      // const snapshotName = `empty_${animateFrom}_${animateTo}`;
      // expect(updates).toMatchSnapshots(Snapshots[snapshotName]);
      // expect(updates).toMatchNativeSnapshots(nativeUpdates);
    });
  });

  // test.each([(Easing.in, Easing.out, Easing.inOut)])('Easing.%p(Easing.elastic(10))', async easing => {
  //   const [updates, nativeUpdates] = await getSnaphotUpdates(easing(Easing.elastic(10)));
  //   expect(updates).toMatchSnapshots(Snapshots[easing.name as keyof typeof Snapshots]);
  //   expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
  // });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    height: 80,

    backgroundColor: 'darkorange',
  },
});
