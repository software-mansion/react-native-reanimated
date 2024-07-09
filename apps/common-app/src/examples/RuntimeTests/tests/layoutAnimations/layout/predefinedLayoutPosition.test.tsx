import React from 'react';
import {
  CurvedTransition,
  FadingTransition,
  JumpingTransition,
  LinearTransition,
  SequencedTransition,
  Easing,
} from 'react-native-reanimated';
import {
  describe,
  test,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  wait,
  expect,
  unmockAnimationTimer,
  clearRenderOutput,
  getTestComponent,
  mockWindowDimensions,
  unmockWindowDimensions,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import {
  CurvedSnapshot,
  FadingSnapshot,
  JumpingSnapshot,
  LinearSnapshot,
  SequencedSnapshot,
  TransitionSnapshot200ms,
  TransitionSnapshotNoModifiers,
} from './layoutTransition.snapshot';
import { Direction, TransitionUpOrDown, TransitionLeftOrRight, TRANSITION_REF } from './TestComponents';

async function getSnapshotUpdates(layout: any, direction: Direction, waitTime: number) {
  await mockAnimationTimer();
  await mockWindowDimensions();

  const updatesContainer = await recordAnimationUpdates();
  if (direction === Direction.UP || direction === Direction.DOWN) {
    await render(<TransitionUpOrDown layout={layout} direction={direction} />);
  } else {
    await render(<TransitionLeftOrRight layout={layout} direction={direction} />);
  }
  await wait(waitTime);
  const component = getTestComponent(TRANSITION_REF);
  const updates = updatesContainer.getUpdates(component);

  await unmockAnimationTimer();
  await unmockWindowDimensions();
  await clearRenderOutput();

  return updates;
}

describe('Test predefined layout transitions', () => {
  test.each([
    [LinearTransition, 300],
    [SequencedTransition, 600],
    [FadingTransition, 600],
    [JumpingTransition, 400],
    [CurvedTransition, 350],
  ] as Array<[any, number]>)('${0}', async ([transition, waitTime]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `${transition.name}_${direction}`;
      const updates = await getSnapshotUpdates(transition, direction, waitTime);
      expect(updates).toMatchSnapshots(
        TransitionSnapshotNoModifiers[snapshotName as keyof typeof TransitionSnapshotNoModifiers],
      );
    }
  });
});

describe('Test predefined layout transitions,  duration = 200ms', () => {
  test.each([LinearTransition, SequencedTransition, FadingTransition, JumpingTransition, CurvedTransition])(
    'Test transition %p, duration = 200ms',
    async transition => {
      for (const direction of Object.values(Direction)) {
        const snapshotName = `${transition.name}_${direction}`;
        const updates = await getSnapshotUpdates(transition.duration(200), direction, 250);
        expect(updates).toMatchSnapshots(TransitionSnapshot200ms[snapshotName as keyof typeof TransitionSnapshot200ms]);
      }
    },
  );
});

describe('Test LINEAR transition modifiers', () => {
  test.each([
    [LinearTransition.springify().damping(40).stiffness(1000), 'springify1', 500],
    [LinearTransition.stiffness(1000).springify().damping(40), 'springify1', 500], // Change the order of modifiers but keep the snapshot name
    [LinearTransition.springify().duration(450), 'springify2', 500],
    [LinearTransition.springify().duration(450).dampingRatio(0.3), 'springify3', 500],
    [LinearTransition.easing(Easing.back()).duration(250), 'easingBack', 300],
    [LinearTransition.easing(Easing.steps(4)), 'easingSteps', 300],
    [LinearTransition.easing(Easing.steps(4)).duration(100), 'easingStepsFast', 150],
    [LinearTransition.easing(Easing.bounce), 'easingBounce', 300],
    [LinearTransition.easing(Easing.bounce).duration(400), 'easingBounceLong', 450],
  ] as Array<[any, string, number]>)('Modifiers: ${1}', async ([transition, modifierName, waitTime]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `LINEAR_${modifierName}_${direction}`;
      const updates = await getSnapshotUpdates(transition, direction, waitTime);
      expect(updates).toMatchSnapshots(LinearSnapshot[snapshotName as keyof typeof LinearSnapshot]);
    }
  });
});

describe('Test SEQUENCED transition modifiers', () => {
  test.each([
    [SequencedTransition, 'default', 550],
    [SequencedTransition.duration(500), 'default', 550], // the default duration is 500
    [SequencedTransition.duration(400), 'duration_400', 450],
    [SequencedTransition.duration(400).reverse(), 'duration_400_reverse', 450],
  ] as Array<[any, string, number]>)('Modifiers: ${1}', async ([transition, modifierName, waitTime]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `SEQUENCED_${modifierName}_${direction}`;
      const updates = await getSnapshotUpdates(transition, direction, waitTime);
      expect(updates).toMatchSnapshots(SequencedSnapshot[snapshotName as keyof typeof SequencedSnapshot]);
    }
  });
});

describe('Test FADING transition modifiers', () => {
  test.each([
    [FadingTransition, 'default', 550],
    [FadingTransition.duration(500), 'default', 550], // the default duration is 500
    [FadingTransition.duration(400), 'duration_400', 450],
  ] as Array<[any, string, number]>)('Modifiers: ${1}', async ([transition, modifierName, waitTime]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `FADING_${modifierName}_${direction}`;
      const updates = await getSnapshotUpdates(transition, direction, waitTime);
      expect(updates).toMatchSnapshots(FadingSnapshot[snapshotName as keyof typeof FadingSnapshot]);
    }
  });
});

describe('Test JUMPING transition modifiers', () => {
  test.each([
    [JumpingTransition, 'default', 350],
    [JumpingTransition.duration(300), 'default', 350], // the default duration is 300
    [JumpingTransition.duration(400), 'duration_400', 450],
  ] as Array<[any, string, number]>)('Modifiers: ${1}', async ([transition, modifierName, waitTime]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `JUMPING_${modifierName}_${direction}`;
      const updates = await getSnapshotUpdates(transition, direction, waitTime);
      expect(updates).toMatchSnapshots(JumpingSnapshot[snapshotName as keyof typeof JumpingSnapshot]);
    }
  });
});

describe('Test CURVED transition modifiers', () => {
  test.each([
    [CurvedTransition, 'default', 350],
    [CurvedTransition.duration(300), 'default', 350], // the default duration is 300
    [CurvedTransition.duration(200), 'duration_200', 250],
    [CurvedTransition.duration(1200).easingX(Easing.back()), 'easingBack', 1250], // This doesn't work, perhaps due to overshoot clamping?
    [CurvedTransition.duration(200).easingX(Easing.bounce), 'easingBounce', 250],
    [CurvedTransition.duration(200).easingX(Easing.bounce).easingY(Easing.bounce), 'easingBounce_XY', 250],
    [CurvedTransition.duration(200).easingX(Easing.steps(7)).easingY(Easing.steps(7)), 'easingSteps_7_7', 250],
    [CurvedTransition.duration(200).easingX(Easing.steps(7)).easingY(Easing.steps(5)), 'easingSteps_7_5', 250],
  ] as Array<[any, string, number]>)('Modifiers: ${1}', async ([transition, modifierName, waitTime]) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `CURVED_${modifierName}_${direction}`;
      const updates = await getSnapshotUpdates(transition, direction, waitTime);
      expect(updates).toMatchSnapshots(CurvedSnapshot[snapshotName as keyof typeof CurvedSnapshot]);
    }
  });
});
