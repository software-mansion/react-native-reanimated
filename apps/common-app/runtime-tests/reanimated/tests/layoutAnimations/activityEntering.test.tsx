import React, { Activity } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';

import {
  callTracker,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  render,
  test,
  useTestRef,
} from '../../../ReJest/RuntimeTestsApi';

const TARGET_REF = 'activity-entering-target';
const DURATION_MS = 80;

enum Tracker {
  EnteringFinished = 'activity-entering-finished',
  ExitingFinished = 'activity-exiting-finished',
}

const entering = FadeIn.duration(DURATION_MS)
  .reduceMotion(ReduceMotion.Never)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      callTracker(Tracker.EnteringFinished);
    }
  });

const exiting = FadeOut.duration(DURATION_MS)
  .reduceMotion(ReduceMotion.Never)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      callTracker(Tracker.ExitingFinished);
    }
  });

function Fixture({ visible }: { visible: boolean }) {
  const ref = useTestRef(TARGET_REF);

  return (
    <Activity mode={visible ? 'visible' : 'hidden'}>
      <Animated.View
        entering={entering}
        exiting={exiting}
        ref={ref}
        style={styles.box}
      />
    </Activity>
  );
}

async function expectUICalls(tracker: Tracker, count: number) {
  await expectEventually(() => getTrackerCallCount(tracker)).toBeCalledUI(
    count
  );
}

describe('Activity entering animation', () => {
  test('runs when Activity restores a hidden view', async () => {
    await render(<Fixture visible />);
    await expectUICalls(Tracker.EnteringFinished, 1);
    const tag = getTestComponent(TARGET_REF).getTag();

    await render(<Fixture visible={false} />);
    if (Platform.OS === 'ios') {
      await expectUICalls(Tracker.ExitingFinished, 1);
    }

    await render(<Fixture visible />);
    await expectUICalls(
      Tracker.EnteringFinished,
      Platform.OS === 'ios' ? 2 : 1
    );
    expect(getTestComponent(TARGET_REF).getTag()).toBe(tag);
  });
});

const styles = StyleSheet.create({
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'royalblue',
  },
});
