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
  unmockAnimationTimer,
  clearRenderOutput,
  mockWindowDimensions,
  unmockWindowDimensions,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
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

const ENTERING_SETS: Array<[string, unknown[]]> = [
  ['Fade', FADE_ENTERING],
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

const EnteringOnMountComponent = ({ entering }: { entering: any }) => {
  return (
    <View style={styles.container}>
      <Animated.View entering={entering} style={styles.animatedBox} />
    </View>
  );
};

async function getSnapshotUpdates(
  entering: any,
  snapshot: Array<any>,
  duration: number | undefined,
  springify = false,
) {
  await mockAnimationTimer();
  await mockWindowDimensions();

  const updatesContainer = await recordAnimationUpdates();
  const springEntering = springify ? entering : entering.springify();
  const componentEntering = duration ? springEntering.duration(duration) : springEntering;

  await render(<EnteringOnMountComponent entering={componentEntering} />);
  await waitForAnimationUpdates(snapshot.length);
  const updates = updatesContainer.getUpdates();

  await unmockAnimationTimer();
  await unmockWindowDimensions();
  await clearRenderOutput();

  return updates;
}

describe('Test predefined entering', () => {
  describe('Entering on mount, no modifiers', () => {
    test.each(ENTERING_SETS)('Test suite of ${0}In', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const snapshotName = (entering as any).name as keyof typeof NoModifierEnteringSnapshots;
        const snapshot = NoModifierEnteringSnapshots[snapshotName];
        const updates = await getSnapshotUpdates(entering, snapshot, undefined, false);
        expect(updates).toMatchSnapshots(snapshot);
      }
    });
  });

  describe('Entering on mount, duration 100', () => {
    test.each(ENTERING_SETS)('Test suite of ${0}In', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const enteringName = (entering as any).name as keyof typeof DurationEnteringSnapshots;
        const snapshot = DurationEnteringSnapshots[enteringName];
        const updates = await getSnapshotUpdates(entering, snapshot, 100);
        expect(updates).toMatchSnapshots(snapshot);
      }
    });
  });

  describe('Entering on mount, springify', () => {
    test.each(ENTERING_SETS)('Test suite of ${0}In', async ([_setName, enteringSet]) => {
      for (const entering of enteringSet) {
        const snapshotName = (entering as any).name as keyof typeof SpringifyEnteringSnapshots;
        const snapshot = SpringifyEnteringSnapshots[snapshotName];
        const updates = await getSnapshotUpdates(entering, snapshot, undefined, true);
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
