import React, { Activity, Fragment, StrictMode } from 'react';
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
  wait,
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

function Fixture({ visible, strict }: { visible: boolean; strict: boolean }) {
  const ref = useTestRef(TARGET_REF);
  const Wrapper = strict ? StrictMode : Fragment;

  return (
    <Wrapper>
      <Activity mode={visible ? 'visible' : 'hidden'}>
        <Animated.View
          entering={entering}
          exiting={exiting}
          ref={ref}
          style={styles.box}
        />
      </Activity>
    </Wrapper>
  );
}

async function expectUICalls(tracker: Tracker, count: number) {
  await expectEventually(() => getTrackerCallCount(tracker)).toBeCalledUI(
    count
  );
  await wait(DURATION_MS * 3);
  expect(await getTrackerCallCount(tracker)).toBeCalledUI(count);
}

describe('Activity entering animation', () => {
  test.each([false, true])(
    'runs when Activity restores a hidden view, StrictMode: **%p**',
    async (strict) => {
      await render(<Fixture visible strict={strict} />);
      await expectUICalls(Tracker.EnteringFinished, 1);
      const tag = getTestComponent(TARGET_REF).getTag();

      await render(<Fixture visible={false} strict={strict} />);
      if (Platform.OS === 'ios') {
        await expectUICalls(Tracker.ExitingFinished, 1);
      }

      await render(<Fixture visible strict={strict} />);
      await expectUICalls(
        Tracker.EnteringFinished,
        Platform.OS === 'ios' ? 2 : 1
      );
      expect(getTestComponent(TARGET_REF).getTag()).toBe(tag);

      await render(null);
      await expectUICalls(
        Tracker.ExitingFinished,
        Platform.OS === 'ios' ? 2 : 1
      );
    }
  );
});

const styles = StyleSheet.create({
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'royalblue',
  },
});
