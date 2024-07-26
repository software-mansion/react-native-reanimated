import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeOut,
  FadeOutRight,
  FadeOutLeft,
  FadeOutUp,
  FadeOutDown,
  BounceOut,
  BounceOutRight,
  BounceOutLeft,
  BounceOutUp,
  BounceOutDown,
  FlipOutEasyX,
  FlipOutEasyY,
  FlipOutXDown,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutYRight,
  PinwheelOut,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  SlideOutRight,
  SlideOutLeft,
  SlideOutUp,
  SlideOutDown,
  StretchOutX,
  StretchOutY,
  ZoomOut,
  ZoomOutDown,
  ZoomOutEasyDown,
  ZoomOutEasyUp,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutRotate,
  ZoomOutUp,
  RollOutRight,
  RollOutLeft,
  LightSpeedOutRight,
  LightSpeedOutLeft,
} from 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  waitForAnimationUpdates,
  unmockAnimationTimer,
  clearRenderOutput,
  mockWindowDimensions,
  unmockWindowDimensions,
} from '../../../ReJest/RuntimeTestsApi';
import { DurationExitingSnapshots, NoModifierExitingSnapshots, SpringifyExitingSnapshots } from './exiting.snapshot';

const FADE_EXITING = [FadeOut, FadeOutRight, FadeOutLeft, FadeOutUp, FadeOutDown];
const BOUNCE_EXITING = [BounceOut, BounceOutRight, BounceOutLeft, BounceOutUp, BounceOutDown];
const FLIP_EXITING = [FlipOutEasyX, FlipOutEasyY, FlipOutXDown, FlipOutXUp, FlipOutYLeft, FlipOutYRight];
const LIGHTSPEED_EXITING = [LightSpeedOutRight, LightSpeedOutLeft];
const PINWHEEL_EXITING = [PinwheelOut];
const ROLL_EXITING = [RollOutRight, RollOutLeft];
const ROTATE_EXITING = [RotateOutDownLeft, RotateOutDownRight, RotateOutUpLeft, RotateOutUpRight];
const SLIDE_EXITING = [SlideOutRight, SlideOutLeft, SlideOutUp, SlideOutDown];
const STRETCH_EXITING = [StretchOutX, StretchOutY];
const ZOOM_EXITING = [
  ZoomOut,
  ZoomOutDown,
  ZoomOutEasyDown,
  ZoomOutEasyUp,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutRotate,
  ZoomOutUp,
];

const EXITING_SETS: Array<[string, unknown[]]> = [
  ['LightSpeed', LIGHTSPEED_EXITING],
  ['Fade', FADE_EXITING],
  ['Bounce', BOUNCE_EXITING],
  ['Flip', FLIP_EXITING],
  ['Pinwheel', PINWHEEL_EXITING],
  ['Roll', ROLL_EXITING],
  ['Rotate', ROTATE_EXITING],
  ['Slide', SLIDE_EXITING],
  ['Stretch', STRETCH_EXITING],
  ['Zoom', ZOOM_EXITING],
];

const ExitingComponent = ({ exiting }: { exiting: any }) => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(false);
  }, []);
  return (
    <View style={styles.container}>{show ? <Animated.View exiting={exiting} style={styles.animatedBox} /> : null}</View>
  );
};

async function getSnapshotUpdates(exiting: any, snapshot: Array<any>, duration: number | undefined, springify = false) {
  await mockAnimationTimer();
  await mockWindowDimensions();

  const updatesContainer = await recordAnimationUpdates();
  const springExiting = springify ? exiting : exiting.springify();
  const componentExiting = duration ? springExiting.duration(duration) : springExiting;

  await render(<ExitingComponent exiting={componentExiting} />);

  await waitForAnimationUpdates(snapshot.length);
  const updates = updatesContainer.getUpdates();

  await unmockAnimationTimer();
  await unmockWindowDimensions();
  await clearRenderOutput();

  return updates;
}

describe('Test predefined exiting', () => {
  describe('exiting on mount, no modifiers', () => {
    test.each(EXITING_SETS)('Test suite of ${0}Out', async ([_setName, exitingSet]) => {
      for (const exiting of exitingSet) {
        const snapshotName = (exiting as any).name as keyof typeof NoModifierExitingSnapshots;
        const snapshot = NoModifierExitingSnapshots[snapshotName];
        const updates = await getSnapshotUpdates(exiting, snapshot, undefined);
        expect(updates).toMatchSnapshots(snapshot);
      }
    });
  });

  describe('exiting on mount, duration 100', () => {
    test.each(EXITING_SETS)('Test suite of ${0}Out', async ([_setName, exitingSet]) => {
      for (const exiting of exitingSet) {
        const snapshotName = (exiting as any).name as keyof typeof DurationExitingSnapshots;
        const snapshot = DurationExitingSnapshots[snapshotName];
        const updates = await getSnapshotUpdates(exiting, snapshot, 100);
        expect(updates).toMatchSnapshots(snapshot);
      }
    });
  });

  describe('exiting on mount, springify', () => {
    test.each(EXITING_SETS)('Test suite of ${0}Out', async ([_setName, exitingSet]) => {
      for (const exiting of exitingSet) {
        const snapshotName = (exiting as any).name as keyof typeof SpringifyExitingSnapshots;
        const snapshot = SpringifyExitingSnapshots[snapshotName];
        const updates = await getSnapshotUpdates(exiting, snapshot, undefined, true);
        expect(updates).toMatchSnapshots(snapshot);
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
