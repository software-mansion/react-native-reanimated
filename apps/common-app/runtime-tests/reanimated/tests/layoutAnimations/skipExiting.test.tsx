import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  LayoutAnimationConfig,
  ReduceMotion,
} from 'react-native-reanimated';

import {
  beforeEach,
  callTracker,
  describe,
  expect,
  getTestComponent,
  getTrackerCallCount,
  isViewMountedNatively,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const EXIT_MS = 1000;
const MOCKED_FRAME_MS = 16;
const EXIT_FRAMES = Math.ceil(EXIT_MS / MOCKED_FRAME_MS);
const MID_EXIT_FRAMES = Math.floor(EXIT_FRAMES / 2);
const REMOVAL_MARGIN_FRAMES = 30;
const SKIPPED_REMOVAL_FRAMES = 5;
const FIRST = 'skip-exiting-first';
const SECOND = 'skip-exiting-second';

enum Tracker {
  First = 'skip-exiting-first-callback',
  Second = 'skip-exiting-second-callback',
}

function exitingWithTracker(tracker: Tracker) {
  return FadeOut.duration(EXIT_MS)
    .reduceMotion(ReduceMotion.Never)
    .withCallback(() => {
      'worklet';
      callTracker(tracker);
    });
}

const firstExiting = exitingWithTracker(Tracker.First);
const secondExiting = exitingWithTracker(Tracker.Second);

function SingleChild({
  show,
  skipExiting,
}: {
  show: boolean;
  skipExiting?: boolean;
}) {
  const ref = useTestRef(FIRST);
  return (
    <View collapsable={false} style={styles.container}>
      {show && (
        <LayoutAnimationConfig skipExiting={skipExiting}>
          <Animated.View ref={ref} exiting={firstExiting} style={styles.box} />
        </LayoutAnimationConfig>
      )}
    </View>
  );
}

function NestedChild({ show }: { show: boolean }) {
  const ref = useTestRef(FIRST);
  return (
    <View collapsable={false} style={styles.container}>
      {show && (
        <LayoutAnimationConfig skipExiting>
          <View collapsable={false} style={styles.wrapper}>
            <Animated.View
              ref={ref}
              exiting={firstExiting}
              style={styles.box}
            />
          </View>
        </LayoutAnimationConfig>
      )}
    </View>
  );
}

function MultipleChildren({ show }: { show: boolean }) {
  const firstRef = useTestRef(FIRST);
  const secondRef = useTestRef(SECOND);
  return (
    <View collapsable={false} style={styles.container}>
      {show && (
        <LayoutAnimationConfig skipExiting>
          <Animated.View
            ref={firstRef}
            exiting={firstExiting}
            style={styles.box}
          />
          <Animated.View
            ref={secondRef}
            exiting={secondExiting}
            style={styles.box}
          />
        </LayoutAnimationConfig>
      )}
    </View>
  );
}

function ChildOfMountedConfig({ show }: { show: boolean }) {
  const ref = useTestRef(FIRST);
  return (
    <View collapsable={false} style={styles.container}>
      <LayoutAnimationConfig skipExiting>
        {show && (
          <Animated.View ref={ref} exiting={firstExiting} style={styles.box} />
        )}
      </LayoutAnimationConfig>
    </View>
  );
}

async function getMountedTag(name: string) {
  await waitForFrames();
  const tag = getTestComponent(name).getTag();
  expect(await isViewMountedNatively(tag)).toBe(true);
  return tag;
}

async function expectExitingAnimationToRun(tag: number, tracker: Tracker) {
  await waitForFrames(MID_EXIT_FRAMES);
  expect(await isViewMountedNatively(tag)).toBe(true);
  expect(await getTrackerCallCount(tracker)).toBeCalledUI(0);
  await waitForFrames(EXIT_FRAMES - MID_EXIT_FRAMES + REMOVAL_MARGIN_FRAMES);
  expect(await isViewMountedNatively(tag)).toBe(false);
  expect(await getTrackerCallCount(tracker)).toBeCalledUI(1);
}

async function expectExitingAnimationToBeSkipped(
  tags: number[],
  trackers: Tracker[]
) {
  await waitForFrames(SKIPPED_REMOVAL_FRAMES);
  for (const tag of tags) {
    expect(await isViewMountedNatively(tag)).toBe(false);
  }
  await waitForFrames(EXIT_FRAMES + REMOVAL_MARGIN_FRAMES);
  for (const tracker of trackers) {
    expect(await getTrackerCallCount(tracker)).toBeCalled(0);
  }
}

describe('LayoutAnimationConfig skipExiting', () => {
  beforeEach(async () => {
    await mockAnimationTimer();
  });

  test('runs the exiting animation of a child without skipExiting', async () => {
    await render(<SingleChild show />);
    const tag = await getMountedTag(FIRST);

    await render(<SingleChild show={false} />);

    await expectExitingAnimationToRun(tag, Tracker.First);
  });

  test('runs the exiting animation of a child with skipExiting set to false', async () => {
    await render(<SingleChild show skipExiting={false} />);
    const tag = await getMountedTag(FIRST);

    await render(<SingleChild show={false} skipExiting={false} />);

    await expectExitingAnimationToRun(tag, Tracker.First);
  });

  test('removes a child at once when skipExiting is set', async () => {
    await render(<SingleChild show skipExiting />);
    const tag = await getMountedTag(FIRST);

    await render(<SingleChild show={false} skipExiting />);

    await expectExitingAnimationToBeSkipped([tag], [Tracker.First]);
  });

  test('removes a nested view at once when skipExiting is set', async () => {
    await render(<NestedChild show />);
    const tag = await getMountedTag(FIRST);

    await render(<NestedChild show={false} />);

    await expectExitingAnimationToBeSkipped([tag], [Tracker.First]);
  });

  test('removes all children at once when skipExiting is set', async () => {
    await render(<MultipleChildren show />);
    const firstTag = await getMountedTag(FIRST);
    const secondTag = await getMountedTag(SECOND);

    await render(<MultipleChildren show={false} />);

    await expectExitingAnimationToBeSkipped(
      [firstTag, secondTag],
      [Tracker.First, Tracker.Second]
    );
  });

  test('runs the exiting animation of a child removed while LayoutAnimationConfig stays mounted', async () => {
    await render(<ChildOfMountedConfig show />);
    const tag = await getMountedTag(FIRST);

    await render(<ChildOfMountedConfig show={false} />);

    await expectExitingAnimationToRun(tag, Tracker.First);
  });
});

const styles = StyleSheet.create({
  container: { width: 200, height: 200 },
  wrapper: { padding: 10, backgroundColor: '#dddddd' },
  box: { width: 100, height: 60, backgroundColor: '#2277dd' },
});
