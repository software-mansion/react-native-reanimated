import {
  CurvedTransition,
  FadingTransition,
  JumpingTransition,
  LinearTransition,
  SequencedTransition,
  Easing,
} from 'react-native-reanimated';
import { describe, test, expect } from '../../../ReJest/RuntimeTestsApi';
import {
  CurvedSnapshot,
  FadingSnapshot,
  JumpingSnapshot,
  LinearSnapshot,
  SequencedSnapshot,
  TransitionSnapshot200ms,
  TransitionSnapshotNoModifiers,
} from './layoutTransition.snapshot';
import { Direction, getSnapshotUpdates } from './TestComponents';

const TRANSITIONS = [LinearTransition, SequencedTransition, FadingTransition, JumpingTransition, CurvedTransition];

describe('Test predefined layout transitions', () => {
  test.each(TRANSITIONS)('%p', async transition => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `${transition.name}_${direction}` as keyof typeof TransitionSnapshotNoModifiers;
      const snapshot = TransitionSnapshotNoModifiers[snapshotName];
      const updates = await getSnapshotUpdates(transition, direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test predefined layout transitions,  duration = 200ms', () => {
  test.each(TRANSITIONS)('Test transition %p, duration = 200ms', async transition => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `${transition.name}_${direction}` as keyof typeof TransitionSnapshot200ms;
      const snapshot = TransitionSnapshot200ms[snapshotName];
      const updates = await getSnapshotUpdates(transition.duration(200), direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test **LINEAR** transition modifiers', () => {
  test.each([
    [LinearTransition.springify().damping(40).stiffness(1000), 'springify1'],
    [LinearTransition.stiffness(1000).springify().damping(40), 'springify1'], // Change the order of modifiers but keep the snapshot name
    [LinearTransition.springify().duration(450), 'springify2'],
    [LinearTransition.springify().duration(450).dampingRatio(0.3), 'springify3'],
    [LinearTransition.easing(Easing.back()).duration(250), 'easingBack'],
    [LinearTransition.easing(Easing.steps(4)), 'easingSteps'],
    [LinearTransition.easing(Easing.steps(4)).duration(100), 'easingStepsFast'],
    [LinearTransition.easing(Easing.bounce), 'easingBounce'],
    [LinearTransition.easing(Easing.bounce).duration(400), 'easingBounceLong'],
  ] as Array<[any, string]>)('Modifiers: ${1}', async ([transition, modifierName]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `LINEAR_${modifierName}_${direction}` as keyof typeof LinearSnapshot;
      const snapshot = LinearSnapshot[snapshotName];
      const updates = await getSnapshotUpdates(transition, direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test **SEQUENCED** transition modifiers', () => {
  test.each([
    [SequencedTransition, 'default'],
    [SequencedTransition.duration(500), 'default'],
    [SequencedTransition.duration(400), 'duration_400'],
    [SequencedTransition.duration(400).reverse(), 'duration_400_reverse'],
  ] as Array<[any, string]>)('Modifiers: ${1}', async ([transition, modifierName]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `SEQUENCED_${modifierName}_${direction}` as keyof typeof SequencedSnapshot;
      const snapshot = SequencedSnapshot[snapshotName];
      const updates = await getSnapshotUpdates(transition, direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test **FADING** transition modifiers', () => {
  test.each([
    [FadingTransition, 'default'],
    [FadingTransition.duration(500), 'default'],
    [FadingTransition.duration(400), 'duration_400'],
  ] as Array<[any, string]>)('Modifiers: ${1}', async ([transition, modifierName]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `FADING_${modifierName}_${direction}` as keyof typeof FadingSnapshot;
      const snapshot = FadingSnapshot[snapshotName];
      const updates = await getSnapshotUpdates(transition, direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test **JUMPING** transition modifiers', () => {
  test.each([
    [JumpingTransition, 'default'],
    [JumpingTransition.duration(300), 'default'],
    [JumpingTransition.duration(400), 'duration_400'],
  ] as Array<[any, string]>)('Modifiers: ${1}', async ([transition, modifierName]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `JUMPING_${modifierName}_${direction}` as keyof typeof JumpingSnapshot;
      const snapshot = JumpingSnapshot[snapshotName];
      const updates = await getSnapshotUpdates(transition, direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test **CURVED** transition modifiers', () => {
  test.each([
    [CurvedTransition, 'default'],
    [CurvedTransition.duration(300), 'default'],
    [CurvedTransition.duration(200), 'duration_200'],
    [CurvedTransition.duration(1200).easingX(Easing.back()), 'easingBack'], // This doesn't work, perhaps due to overshoot clamping?
    [CurvedTransition.duration(200).easingX(Easing.bounce), 'easingBounce'],
    [CurvedTransition.duration(200).easingX(Easing.bounce).easingY(Easing.bounce), 'easingBounce_XY'],
    [CurvedTransition.duration(200).easingX(Easing.steps(7)).easingY(Easing.steps(7)), 'easingSteps_7_7'],
    [CurvedTransition.duration(200).easingX(Easing.steps(7)).easingY(Easing.steps(5)), 'easingSteps_7_5'],
  ] as Array<[any, string]>)('Modifiers: ${1}', async ([transition, modifierName]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `CURVED_${modifierName}_${direction}` as keyof typeof CurvedSnapshot;
      const snapshot = CurvedSnapshot[snapshotName];
      const updates = await getSnapshotUpdates(transition, direction, snapshot.length);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});
