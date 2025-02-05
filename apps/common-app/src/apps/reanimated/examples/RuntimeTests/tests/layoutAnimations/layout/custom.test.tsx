import React from 'react';
import type { LayoutAnimationsValues } from 'react-native-reanimated';
import { withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import {
  clearRenderOutput,
  describe,
  expect,
  getTestComponent,
  mockAnimationTimer,
  mockWindowDimensions,
  recordAnimationUpdates,
  render,
  test,
  unmockAnimationTimer,
  unmockWindowDimensions,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
import { SnapshotsDynamicSize, SnapshotsStaticSize } from './custom.snapshot';
import { Direction, TRANSITION_REF, TransitionLeftOrRight, TransitionUpOrDown } from './TestComponents';

const moveCornersFirst = (values: LayoutAnimationsValues) => {
  'worklet';
  return {
    animations: {
      width: withSequence(
        withTiming(values.currentWidth - values.targetOriginX + values.currentOriginX, { duration: 200 }),
        withTiming(values.targetWidth, { duration: 200 }),
      ),
      height: withDelay(
        100,
        withSequence(
          withTiming(values.currentHeight - values.targetOriginY + values.currentOriginY, { duration: 200 }),
          withTiming(values.currentHeight, { duration: 200 }),
        ),
      ),
      originX: withTiming(values.targetOriginX, { duration: 200 }),
      originY: withDelay(100, withTiming(values.targetOriginY, { duration: 200 })),
    },

    initialValues: {
      width: values.currentWidth,
      height: values.currentHeight,
      originX: values.currentOriginX,
      originY: values.currentOriginY,
    },
  };
};

const moveWithRotationOverCorner = (values: LayoutAnimationsValues) => {
  'worklet';
  return {
    animations: {
      originX: withTiming(values.targetOriginX, { duration: 400 }),
      originY: withTiming(values.targetOriginY, { duration: 400 }),
      height: withDelay(300, withTiming(values.targetHeight, { duration: 400 })),
      width: withDelay(300, withTiming(values.targetWidth, { duration: 400 })),
      transform: [
        { translateX: values.currentHeight / 2 },
        { rotate: withTiming('0deg', { duration: 400 }) },
        { translateX: -values.currentHeight / 2 },
      ],
    },

    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      height: values.currentHeight,
      width: values.currentWidth,
      transform: [
        { translateX: values.currentHeight / 2 },
        { rotate: '90deg' },
        { translateX: -values.currentHeight / 2 },
      ],
    },
  };
};

const colorDependingOnInitialPosition = (values: LayoutAnimationsValues) => {
  'worklet';

  const newBackgroundColor = `rgb(${values.currentOriginX % 255},${values.currentOriginY % 255},${
    values.targetOriginY % 255
  })`;
  return {
    animations: {
      originX: withTiming(values.targetOriginX, { duration: 200 }),
      originY: withTiming(values.targetOriginY, { duration: 200 }),
      height: withSpring(values.targetHeight, { duration: 400 }),
      width: withSpring(values.targetWidth, { duration: 400 }),
      backgroundColor: withTiming(newBackgroundColor, { duration: 200 }),
    },

    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      height: values.currentHeight,
      width: values.currentWidth,
      backgroundColor: 'gold',
    },
  };
};

const TRANSITIONS = [
  { snapshotPrefix: 'moveCornersFirst', transition: moveCornersFirst },
  { snapshotPrefix: 'moveWithRotationOverCorner', transition: moveWithRotationOverCorner },
  { snapshotPrefix: 'colorDependingOnInitialPosition', transition: colorDependingOnInitialPosition },
];

async function getSnapshotUpdates(layout: any, direction: Direction, snapshot: Array<unknown>, changeSize?: boolean) {
  await mockAnimationTimer();
  await mockWindowDimensions();

  const updatesContainer = await recordAnimationUpdates();
  if (direction === Direction.UP || direction === Direction.DOWN) {
    await render(<TransitionUpOrDown layout={layout} direction={direction} changeSize={changeSize} />);
  } else {
    await render(<TransitionLeftOrRight layout={layout} direction={direction} changeSize={changeSize} />);
  }
  await waitForAnimationUpdates(snapshot.length);
  const component = getTestComponent(TRANSITION_REF);
  const updates = updatesContainer.getUpdates(component);

  await unmockAnimationTimer();
  await unmockWindowDimensions();
  await clearRenderOutput();

  return updates;
}

describe('Test custom layout transitions', () => {
  test.each(TRANSITIONS)('Test animation "${snapshotPrefix}"', async ({ snapshotPrefix, transition }) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `${snapshotPrefix}_${direction}`;
      const snapshot = SnapshotsStaticSize[snapshotName as keyof typeof SnapshotsStaticSize];
      const updates = await getSnapshotUpdates(transition, direction, snapshot, false);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});

describe('Test custom layout transitions _with size update_', () => {
  test.each(TRANSITIONS)('Test animation "${snapshotPrefix}"', async ({ snapshotPrefix, transition }) => {
    for (const direction of Object.values(Direction)) {
      const snapshotName = `${snapshotPrefix}_${direction}`;
      const snapshot = SnapshotsDynamicSize[snapshotName as keyof typeof SnapshotsDynamicSize];
      const updates = await getSnapshotUpdates(transition, direction, snapshot, true);
      expect(updates).toMatchSnapshots(snapshot);
    }
  });
});
