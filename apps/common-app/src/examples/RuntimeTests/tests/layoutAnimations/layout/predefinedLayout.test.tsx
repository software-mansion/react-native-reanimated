import React from 'react';
import {
  CurvedTransition,
  FadingTransition,
  JumpingTransition,
  LinearTransition,
  SequencedTransition,
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
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { TransitionSnapshot200ms, TransitionSnapshotNoModifiers } from './layoutTransition.snapshot';
import { Direction, TransitionUpOrDown, TransitionLeftOrRight, TRANSITION_REF } from './testComponents.test';

async function getSnapshotUpdates(layout: any, direction: Direction, waitTime: number) {
  await mockAnimationTimer();

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
  await clearRenderOutput();

  return updates;
}

describe.only('Test predefined layout transitions', () => {
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
      //   console.log(`${snapshotName}: ${JSON.stringify(updates)}`);
      expect(updates).toMatchSnapshots(
        TransitionSnapshotNoModifiers[snapshotName as keyof typeof TransitionSnapshotNoModifiers],
      );
    }
  });
});

describe.only('Test predefined layout transitions,  duration = 200ms', () => {
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

// describe.only('Test LINEAR transition modifiers', () => {
//   test.each([[LinearTransition.springify(), 'springify']] as Array<[any, string]>)(
//     'Modifiers: ${1}, duration = 400ms',
//     async ([transition, modifierName]) => {
//       for (const direction of Object.values(Direction)) {
//         const snapshotName = `$LINEAR_${modifierName}_${direction}_200ms`;
//         const updates = await getSnapshotUpdates(transition, direction, 400);
//         //   expect(updates).toMatchSnapshots(TransitionSnapshot[snapshotName as keyof typeof TransitionSnapshot]);
//       }
//     },
//   );
// })
