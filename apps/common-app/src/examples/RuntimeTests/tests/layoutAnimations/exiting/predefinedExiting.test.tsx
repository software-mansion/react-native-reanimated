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
  wait,
  unmockAnimationTimer,
  clearRenderOutput,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
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

const EXITING_SETS: Array<[string, unknown[], number]> = [
  ['LightSpeed', LIGHTSPEED_EXITING, 1600],
  ['Fade', FADE_EXITING, 1400],
  ['Bounce', BOUNCE_EXITING, 650],
  ['Flip', FLIP_EXITING, 1750],
  ['Pinwheel', PINWHEEL_EXITING, 1000],
  ['Roll', ROLL_EXITING, 1750],
  ['Rotate', ROTATE_EXITING, 1600],
  ['Slide', SLIDE_EXITING, 1800],
  ['Stretch', STRETCH_EXITING, 1000],
  ['Zoom', ZOOM_EXITING, 1800],
];

const ExitingOnMountComponent = ({ exiting }: { exiting: any }) => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(false);
  }, []);
  return (
    <View style={styles.container}>{show ? <Animated.View exiting={exiting} style={styles.animatedBox} /> : null}</View>
  );
};

async function getSnapshotUpdates(exiting: any, waitTime: number, duration: number | undefined, springify = false) {
  await mockAnimationTimer();

  const updatesContainer = await recordAnimationUpdates();
  const springExiting = springify ? exiting : exiting.springify();
  const componentExiting = duration ? springExiting.duration(duration) : springExiting;

  await render(<ExitingOnMountComponent exiting={componentExiting} />);

  await wait(waitTime);
  const updates = updatesContainer.getUpdates();
  await unmockAnimationTimer();
  await clearRenderOutput();

  return updates;
}

describe('Test predefined exiting', () => {
  describe('exiting on mount, no modifiers', () => {
    test.each(EXITING_SETS)('Test suite of ${0}Out', async ([_setName, exitingSet, waitTime]) => {
      for (const exiting of exitingSet) {
        const snapshotName = (exiting as any).name;
        const updates = await getSnapshotUpdates(exiting, waitTime, undefined);

        expect(updates).toMatchSnapshots(
          NoModifierExitingSnapshots[snapshotName as keyof typeof NoModifierExitingSnapshots],
        );
      }
    });
  });

  describe('exiting on mount, duration 100', () => {
    test.each(EXITING_SETS)('Test suite of ${0}Out', async ([_setName, exitingSet, _waitTime]) => {
      for (const exiting of exitingSet) {
        const snapshotName: string = (exiting as any).name;
        const updates = await getSnapshotUpdates(exiting, 105, 100);

        expect(updates).toMatchSnapshots(
          DurationExitingSnapshots[snapshotName as keyof typeof DurationExitingSnapshots],
        );
      }
    });
  });

  describe('exiting on mount, springify', () => {
    test.each(EXITING_SETS)('Test suite of ${0}Out', async ([_setName, exitingSet, waitTime]) => {
      const timeToWait = _setName === 'Bounce' ? 650 : waitTime * 0.3;
      for (const exiting of exitingSet) {
        const snapshotName = (exiting as any).name;
        const updates = await getSnapshotUpdates(exiting, timeToWait, undefined, true);

        expect(updates).toMatchSnapshots(
          SpringifyExitingSnapshots[snapshotName as keyof typeof SpringifyExitingSnapshots],
        );
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
