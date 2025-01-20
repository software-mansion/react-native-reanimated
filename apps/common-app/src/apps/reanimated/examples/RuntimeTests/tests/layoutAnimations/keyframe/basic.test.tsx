import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  render,
  expect,
  clearRenderOutput,
  mockAnimationTimer,
  mockWindowDimensions,
  recordAnimationUpdates,
  unmockAnimationTimer,
  unmockWindowDimensions,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
import type { ReanimatedKeyframe } from 'react-native-reanimated/lib/typescript/layoutReanimation/animationBuilder/Keyframe';
import { Snapshots } from './basic.snapshot.test';

const AnimatedComponent = ({ enteringAnimation }: { enteringAnimation: ReanimatedKeyframe }) => {
  return (
    <View style={styles.container}>
      <Animated.View style={styles.box} entering={enteringAnimation} />
    </View>
  );
};

describe('entering with custom animation (withDelay + withTiming color changes) test', () => {
  const twirlingAnimation = new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 50 }, { rotate: '820deg' }, { scale: 0 }] },
    50: {
      opacity: 0.5,
      transform: [{ translateY: 25 }, { rotate: '-180deg' }, { scale: 0.5 }],
      easing: Easing.out(Easing.quad),
    },
    100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }] },
  }).duration(1000);

  const rainbowPulsarAnimation = new Keyframe({
    0: { transform: [{ scale: 2 }], backgroundColor: 'hsl(0, 100%, 50%)' },
    15: { transform: [{ scale: 1 }], easing: Easing.poly(1) },
    30: { transform: [{ scale: 2 }], easing: Easing.poly(2), backgroundColor: '#ffd700ff' },
    45: { transform: [{ scale: 1 }], easing: Easing.poly(3) },
    60: { transform: [{ scale: 2 }], backgroundColor: '#00F', easing: Easing.poly(10) },
    75: { transform: [{ scale: 1 }], easing: Easing.poly(4) },
    85: { transform: [{ scale: 2 }], backgroundColor: 'rgb(128, 0, 128)', easing: Easing.poly(5) },
    100: { transform: [{ scale: 1 }], backgroundColor: 'red', easing: Easing.poly(6) },
  }).duration(1000);

  const rotateAroundCornerAnimation = new Keyframe({
    0: {
      transform: [
        { translateX: 50 },
        { translateY: 50 },
        { rotateZ: '0deg' },
        { translateX: -50 },
        { translateY: -50 },
      ],
    },
    100: {
      transform: [
        { translateX: 50 },
        { translateY: 50 },
        { rotateZ: '360deg' },
        { translateX: -50 },
        { translateY: -50 },
      ],
    },
  }).duration(1000);

  const changeBordersAnimation = new Keyframe({
    0: {
      borderRadius: 20,
      borderWidth: 5,
      backgroundColor: '#3cb371ff',
      borderColor: '#2f4f4fff',
    },
    25: {
      borderRadius: 50,
      borderWidth: 10,
      borderColor: '#2f4f4fff',
    },
    50: {
      borderRadius: 45,
      borderWidth: 50,
      borderColor: '#2f4f4fff',
      backgroundColor: '#3cb371ff',
    },
    51: {
      borderRadius: 45,
      borderWidth: 50,
      borderColor: '#2f4f4fff',
      backgroundColor: '#ffd700ff',
    },
    100: {
      borderRadius: 5,
      borderWidth: 0,
    },
  }).duration(2000);

  const elasticAnimation = new Keyframe({
    0: { transform: [{ translateY: 0 }] },
    100: { transform: [{ translateY: 200 }], easing: Easing.elastic(10) },
  }).duration(2000);

  const linearAnimation = new Keyframe({
    0: { transform: [{ translateY: 0 }] },
    100: { transform: [{ translateY: 200 }] },
  }).duration(500);

  // This is a reproduction of a weird bug happening on new architecture only.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const changeBordersAnimationBugRepro = new Keyframe({
    0: {
      borderRadius: 20,
      borderWidth: 5,
      backgroundColor: '#3cb371ff',
      borderColor: '#2f4f4fff',
    },
    25: {
      borderRadius: 50,
      borderWidth: 10,
      borderColor: '#2f4f4fff',
    },
    50: {
      borderRadius: 50,
      borderWidth: 50,
      backgroundColor: '#3cb371ff',
    },
    51: {
      borderRadius: 45,
      borderWidth: 50,
      borderColor: '#2f4f4fff',
      backgroundColor: '#ffd700ff',
    },
    100: {
      borderRadius: 5,
      borderWidth: 0,
    },
  }).duration(5000);

  test.each([
    [twirlingAnimation, 'twirling'],
    [rainbowPulsarAnimation, 'rainbowPulsar'],
    [rotateAroundCornerAnimation, 'rotateAroundCorner'],
    [changeBordersAnimation, 'changeBorders'],
    [elasticAnimation, 'elastic'],
    [linearAnimation, 'linear'],
  ] as Array<[ReanimatedKeyframe, keyof typeof Snapshots]>)(
    'Test keyframe animation **${1}**',
    async ([keyframeAnimation, snapshotName]) => {
      await mockAnimationTimer();
      await mockWindowDimensions();
      const updatesContainer = await recordAnimationUpdates();

      await render(<AnimatedComponent enteringAnimation={keyframeAnimation} />);

      await waitForAnimationUpdates(Snapshots[snapshotName].length);
      const updates = updatesContainer.getUpdates();
      expect(updates).toMatchSnapshots(Snapshots[snapshotName]);

      await unmockAnimationTimer();
      await unmockWindowDimensions();
      await clearRenderOutput();
    },
  );
});

const styles = StyleSheet.create({
  container: {
    height: 250,
    flex: 1,
    padding: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
