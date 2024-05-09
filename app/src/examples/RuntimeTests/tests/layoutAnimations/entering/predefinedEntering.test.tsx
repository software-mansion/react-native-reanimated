import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInLeft,
  FadeInUp,
  FadeInDown,
  BounceIn,
  BounceInRight,
  BounceInLeft,
  BounceInUp,
  BounceInDown,
  FlipInEasyX,
  FlipInEasyY,
  FlipInXDown,
  FlipInXUp,
  FlipInYLeft,
  FlipInYRight,
  LightSpeedInRight,
  LightSpeedInLeft,
  PinwheelIn,
  RollInRight,
  RollInLeft,
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  SlideInRight,
  SlideInLeft,
  SlideInUp,
  SlideInDown,
  StretchInX,
  StretchInY,
  ZoomIn,
  ZoomInDown,
  ZoomInEasyDown,
  ZoomInEasyUp,
  ZoomInLeft,
  ZoomInRight,
  ZoomInRotate,
  ZoomInUp,
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
  clearRenderOutput,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { PredefinedEnteringSnapshots as Snapshots } from './entering.snapshot';

const FADE_ENTERING = [FadeIn, FadeInRight, FadeInLeft, FadeInUp, FadeInDown];
const BOUNCE_ENTERING = [BounceIn, BounceInRight, BounceInLeft, BounceInUp, BounceInDown];
const FLIP_ENTERING = [FlipInEasyX, FlipInEasyY, FlipInXDown, FlipInXUp, FlipInYLeft, FlipInYRight];
const LIGHTSPEED_ENTERING = [LightSpeedInRight, LightSpeedInLeft];
const PINWHEEL_ENTERING = [PinwheelIn];
const ROLL_ENTERING = [RollInRight, RollInLeft];
const ROTATE_ENTERING = [RotateInDownLeft, RotateInDownRight, RotateInUpLeft, RotateInUpRight];
const SLIDE_ENTERING = [SlideInRight, SlideInLeft, SlideInUp, SlideInDown];
const STRETCH_ENTERING = [StretchInX, StretchInY];
const ZOOM_ENTERING = [
  ZoomIn,
  ZoomInDown,
  ZoomInEasyDown,
  ZoomInEasyUp,
  ZoomInLeft,
  ZoomInRight,
  ZoomInRotate,
  ZoomInUp,
];

const ENTERING_SETS = [
  // ['Fade', FADE_ENTERING],
  ['Bounce', BOUNCE_ENTERING],
  ['Flip', FLIP_ENTERING],
  ['LightSpeed', LIGHTSPEED_ENTERING],
  ['Pinwheel', PINWHEEL_ENTERING],
  ['Roll', ROLL_ENTERING],
  ['Rotate', ROTATE_ENTERING],
  ['Slide', SLIDE_ENTERING],
  ['Stretch', STRETCH_ENTERING],
  ['Zoom', ZOOM_ENTERING],
];
const EnteringOnMountComponent = ({ entering, duration }: { entering: any; duration?: number }) => {
  const enteringAnimation = duration ? entering.duration(duration) : entering;
  return (
    <View style={styles.container}>
      <Animated.View entering={enteringAnimation} style={styles.animatedBox} />
    </View>
  );
};

async function getSnapshotUpdates(entering: any, duration?: number, springify = false) {
  await mockAnimationTimer();

  const updatesContainer = await recordAnimationUpdates();
  const componentEntering = springify ? entering : entering.springify();
  await render(<EnteringOnMountComponent entering={componentEntering} duration={duration} />);

  await wait(500 + (duration || 1200));
  const updates = updatesContainer.getUpdates();

  await unmockAnimationTimer();
  await clearRenderOutput();

  return updates;
}

describe('Test predefined entering', () => {
  describe.only('Entering on mount, no modifiers', async () => {
    test.each(ENTERING_SETS)('Test set of ${0}In', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const snapshotName = entering.name;
        const updates = await getSnapshotUpdates(entering, undefined);
        // console.log(`${snapshotName}: ${JSON.stringify(updates)},`);
        expect(updates).toMatchSnapshots(Snapshots[snapshotName as keyof typeof Snapshots]);
      }
    });
  });

  describe('Entering on mount, duration 100', async () => {
    test.each(ENTERING_SETS)('Test set of ${0}In ${1}', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const snapshotName = entering.name + '_100';
        const updates = await getSnapshotUpdates(entering, 100);
        // console.log(`${snapshotName}: ${JSON.stringify(updates)},`);
        expect(updates).toMatchSnapshots(Snapshots[snapshotName as keyof typeof Snapshots]);
      }
    });
  });

  describe('Entering on mount, springify', async () => {
    test.each(ENTERING_SETS)('Test set ${0}', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const snapshotName = entering.name + '_springify';
        const updates = await getSnapshotUpdates(entering, undefined, true);
        // console.log(`${snapshotName}: ${JSON.stringify(updates)},`);
        expect(updates).toMatchSnapshots(Snapshots[snapshotName as keyof typeof Snapshots]);
      }
    });
  });

  describe('Entering on mount, springify, duration 100', async () => {
    test.each(ENTERING_SETS)('Test set ${0}', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const snapshotName = entering.name + '_springify_100';
        const updates = await getSnapshotUpdates(entering, 100, true);
        // console.log(`${snapshotName}: ${JSON.stringify(updates)},`);
        expect(updates).toMatchSnapshots(Snapshots[snapshotName as keyof typeof Snapshots]);
      }
    });
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
