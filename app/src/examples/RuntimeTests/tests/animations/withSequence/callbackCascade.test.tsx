import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  expect,
  render,
  wait,
  callTracker,
  getTrackerCallCount,
  mockAnimationTimer,
  recordAnimationUpdates,
  getRegisteredValue,
  registerValue,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './snapshots.snapshot';

describe(`Cascade of callbacks`, () => {
  enum Tracker {
    callbackAnimation = 'callbackAnimation',
    interruptedAnimation = 'interruptedAnimationTracker',
    animationNotExecuted = 'animationNotExecuted',
  }
  enum SV {
    callbackArgument0 = 'callbackArgument0',
    callbackArgument1 = 'callbackArgument1',
  }
  const CallbackComponent = () => {
    const callbackArgument0 = useSharedValue<boolean | undefined | null>(null);
    const callbackArgument1 = useSharedValue<boolean | undefined | null>(false);
    registerValue(SV.callbackArgument0, callbackArgument0);
    registerValue(SV.callbackArgument1, callbackArgument1);

    const sv0 = useSharedValue(0);
    const sv1 = useSharedValue(0);
    const sv2 = useSharedValue(0);

    useEffect(() => {
      sv0.value = withSequence(
        withTiming(100, { duration: 400 }, () => {
          sv1.value = withSequence(
            withTiming(20, { duration: 600 }, (finished?: boolean) => {
              //this animation gets interrupted
              callbackArgument0.value = finished;
              callTracker(Tracker.interruptedAnimation);
            }),
            withTiming(1000, { duration: 600 }, (finished?: boolean) => {
              //execution of this animation never starts
              callTracker(Tracker.animationNotExecuted);
              callbackArgument1.value = finished;
            }),
            withTiming(1000, { duration: 600 }, (finished?: boolean) => {
              //execution of this animation never starts
              callTracker(Tracker.animationNotExecuted);
              callbackArgument1.value = callbackArgument1.value || finished;
            }),
          );
        }),

        withTiming(20, { duration: 300 }, () => {
          sv1.value = withSpring(150, { duration: 500 }, () => {
            callTracker(Tracker.callbackAnimation);
          });
          sv2.value = withSequence(
            withSpring(150, { duration: 300, dampingRatio: 2 }, () => {
              callTracker(Tracker.callbackAnimation);
            }),
            withSpring(10, { duration: 300, dampingRatio: 2 }, () => {
              callTracker(Tracker.callbackAnimation);
            }),
          );
        }),
        withTiming(200, { duration: 400 }),
      );
    });

    const animatedStyle = useAnimatedStyle(() => {
      return { height: 20 + sv0.value, width: 20 + sv1.value, top: sv2.value };
    });

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.animatedBox, animatedStyle]} />
      </View>
    );
  };

  test('Test cascade of callback (no self-modify)', async () => {
    await mockAnimationTimer();
    const updatesContainerActive = await recordAnimationUpdates();

    await render(<CallbackComponent />);
    await wait(1400);
    const updates = updatesContainerActive.getUpdates();
    const nativeUpdates = await updatesContainerActive.getNativeSnapshots();

    expect(updates).toMatchSnapshots(Snapshots.CallbackCascade);
    expect(updates).toMatchNativeSnapshots(nativeUpdates);

    expect((await getRegisteredValue(SV.callbackArgument0)).onJS).toBe(false);
    expect((await getRegisteredValue(SV.callbackArgument1)).onJS).toBe(false);

    (
      [
        [Tracker.animationNotExecuted, 2],
        [Tracker.interruptedAnimation, 1],
        [Tracker.callbackAnimation, 3],
      ] as const
    ).forEach(([trackerRef, counts]) => {
      expect(getTrackerCallCount(trackerRef)).toBeCalled(counts);
      expect(getTrackerCallCount(trackerRef)).toBeCalledUI(counts);
      expect(getTrackerCallCount(trackerRef)).toBeCalledJS(0);
    });
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 0,
    backgroundColor: 'darkorange',
    height: 80,
    marginLeft: 30,
  },
});
