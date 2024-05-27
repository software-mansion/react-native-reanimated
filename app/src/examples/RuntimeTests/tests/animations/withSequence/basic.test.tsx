import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, withSequence, withDelay, withSpring } from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  wait,
  mockAnimationTimer,
  recordAnimationUpdates,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './snapshots.snapshot';

describe('withSequence, two components animating simultaneously', () => {
  const COMPONENT_ZERO = 'componentZero';
  const COMPONENT_ONE = 'componentOne';

  const AnimatedComponent = () => {
    const width0 = useSharedValue(0);
    const width1 = useSharedValue(50);

    const [ref0, ref1] = [useTestRef(COMPONENT_ZERO), useTestRef(COMPONENT_ONE)];

    useEffect(() => {
      width0.value = withSequence(
        withTiming(300, { duration: 150 }),
        withTiming(220, { duration: 200 }),
        withDelay(20, withSpring(333, { duration: 250 })),
        withDelay(60, withTiming(25, { duration: 300 })),
      );

      width1.value = withSequence(
        withTiming(15, { duration: 300 }),
        withTiming(200, { duration: 150 }),
        withDelay(45, withSpring(60, { duration: 300 })),
        withDelay(15, withTiming(155, { duration: 150 })),
      );
    });

    return (
      <View style={styles.container}>
        <Animated.View ref={ref0} style={[styles.animatedBox, { width: width0, backgroundColor: 'mediumseagreen' }]} />
        <Animated.View ref={ref1} style={[styles.animatedBox, { width: width1, backgroundColor: 'royalblue' }]} />
      </View>
    );
  };

  test(`Check snapshot`, async () => {
    await mockAnimationTimer();
    const updatesContainerActive = await recordAnimationUpdates();
    render(<AnimatedComponent />);
    await wait(1400);
    const updates = updatesContainerActive.getUpdates();
    const nativeUpdates = await updatesContainerActive.getNativeSnapshots();
    expect(updates).toMatchSnapshots(Snapshots.snapshotBasic1);
    expect(updates).toMatchNativeSnapshots(nativeUpdates);
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
