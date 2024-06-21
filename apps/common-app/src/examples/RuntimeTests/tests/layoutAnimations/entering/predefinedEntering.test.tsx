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
  RollInRight,
  RollInLeft,
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
import {
  DurationEnteringSnapshots,
  NoModifierEnteringSnapshots,
  SpringifyEnteringSnapshots,
} from './entering.snapshot';

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

const ENTERING_SETS: Array<[string, unknown[], number]> = [
  ['Fade', FADE_ENTERING, 1350],
  ['Bounce', BOUNCE_ENTERING, 650],
  ['Flip', FLIP_ENTERING, 1750],
  ['LightSpeed', LIGHTSPEED_ENTERING, 1600],
  ['Pinwheel', PINWHEEL_ENTERING, 1000],
  ['Roll', ROLL_ENTERING, 1750],
  ['Rotate', ROTATE_ENTERING, 1600],
  ['Slide', SLIDE_ENTERING, 1800],
  ['Stretch', STRETCH_ENTERING, 1000],
  ['Zoom', ZOOM_ENTERING, 1800],
];

const EnteringOnMountComponent = ({ entering }: { entering: any }) => {
  return (
    <View style={styles.container}>
      <Animated.View entering={entering} style={styles.animatedBox} />
    </View>
  );
};

async function getSnapshotUpdates(entering: any, waitTime: number, duration: number | undefined, springify = false) {
  await mockAnimationTimer();

  const updatesContainer = await recordAnimationUpdates();
  const springEntering = springify ? entering : entering.springify();
  const componentEntering = duration ? springEntering.duration(duration) : springEntering;

  await render(<EnteringOnMountComponent entering={componentEntering} />);
  await wait(waitTime);
  const updates = updatesContainer.getUpdates();
  await unmockAnimationTimer();
  await clearRenderOutput();

  return updates;
}

describe('Test predefined entering', () => {
  describe('Entering on mount, no modifiers', () => {
    test.each(ENTERING_SETS)('Test suite of ${0}In', async ([_setName, enteringSet, waitTime]) => {
      for (const entering of enteringSet) {
        const snapshotName = (entering as any).name;
        const updates = await getSnapshotUpdates(entering, waitTime, undefined);
        expect(updates).toMatchSnapshots(
          NoModifierEnteringSnapshots[snapshotName as keyof typeof NoModifierEnteringSnapshots],
        );
      }
    });
  });

  describe('Entering on mount, duration 100', () => {
    test.each(ENTERING_SETS)('Test suite of ${0}In', async ([_setName, enteringSet, _waitTime]) => {
      for (const entering of enteringSet) {
        const enteringName: string = (entering as any).name;
        const updates = await getSnapshotUpdates(entering, 105, 100);
        expect(updates).toMatchSnapshots(
          DurationEnteringSnapshots[enteringName as keyof typeof DurationEnteringSnapshots],
        );
      }
    });
  });

  describe('Entering on mount, springify', () => {
    test.each(ENTERING_SETS)('Test suite of ${0}In', async ([_setName, enteringSet, waitTime]) => {
      const timeToWait = _setName === 'Bounce' ? 650 : waitTime * 0.3;
      for (const entering of enteringSet) {
        const snapshotName = (entering as any).name;
        const updates = await getSnapshotUpdates(entering, timeToWait, undefined, true);
        expect(updates).toMatchSnapshots(
          SpringifyEnteringSnapshots[snapshotName as keyof typeof SpringifyEnteringSnapshots],
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
