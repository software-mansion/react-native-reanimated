import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  waitForAnimationUpdates,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './withSpring.snapshot';

const AnimatedComponent = ({
  animateFrom,
  animateTo,
  config,
}: {
  animateFrom: number;
  animateTo: number;
  config: WithSpringConfig;
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

async function getSnapshotUpdates(snapshotName: keyof typeof Snapshots, animateFrom: number, animateTo: number) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();
  await render(<AnimatedComponent animateFrom={animateFrom} animateTo={animateTo} config={{}} />);
  await waitForAnimationUpdates(Snapshots[snapshotName].length);
  const updates = updatesContainer.getUpdates();
  const nativeUpdates = await updatesContainer.getNativeSnapshots();

  return [updates, nativeUpdates];
}

describe('WithSpring snapshots 📸, test various configs', () => {
  describe('Empty configuration', () => {
    test.each([
      [20, 300],
      [300, 50],
      [0, 150],
      [150, 0],
    ] as Array<[number, number]>)(
      'Empty config, from ${0} to ${1}',
      async ([animateFrom, animateTo]: [number, number]) => {
        const snapshotName = `empty_${animateFrom}_${animateTo}` as keyof typeof Snapshots;
        const [updates, nativeUpdates] = await getSnapshotUpdates(snapshotName, animateFrom, animateTo);
        expect(updates).toMatchSnapshots(Snapshots[snapshotName]);
        expect(updates).toMatchNativeSnapshots(nativeUpdates, true);
      },
    );
  });

  describe('Invalid configuration, test warning', () => {
    test.warn(
      'Invalid mass and stiffness, config is { mass: -40, stiffness: -400 }',
      '[Reanimated] Invalid spring config, stiffness must be grater than zero but got -400, mass must be grater than zero but got -40',
      async () => {
        await render(<AnimatedComponent animateFrom={30} animateTo={300} config={{ mass: -40, stiffness: -400 }} />);
      },
    );

    test.warn.each([
      { mass: 0, stiffness: 5000 },
      { mass: 0 },
      { mass: -10 },
      { mass: -5, duration: 5000 },
      { mass: -5, damping: 50 },
      { mass: -20, stiffness: 20 },
    ])(
      '%# Invalid mass, config is %p',
      '[Reanimated] Invalid spring config, mass must be grater than zero but got ${mass}',
      async config => {
        await render(<AnimatedComponent animateFrom={30} animateTo={300} config={config as any} />);
      },
    );

    test.warn.each([
      { stiffness: -20 },
      { stiffness: 0 },
      { damping: 20, stiffness: -20 },
      { mass: 20, stiffness: -20 },
      { mass: 20, stiffness: 0 },
    ])(
      '%# Invalid stiffness, config is %p',
      '[Reanimated] Invalid spring config, stiffness must be grater than zero but got ${stiffness}',
      async config => {
        await render(<AnimatedComponent animateFrom={30} animateTo={300} config={config} />);
      },
    );

    test.warn.each([{ damping: -20 }, { damping: 0 }])(
      '%# Invalid damping, config is %p',
      '[Reanimated] Invalid spring config, damping must be grater than zero but got ${damping}',
      async config => {
        await render(<AnimatedComponent animateFrom={30} animateTo={300} config={config} />);
      },
    );

    test.warn.each([{ duration: -20 }])(
      '%# Invalid duration, config is %p',
      "[Reanimated] Invalid spring config, duration can't be negative, got ${duration}",
      async config => {
        await render(<AnimatedComponent animateFrom={30} animateTo={300} config={config} />);
      },
    );
  });
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
