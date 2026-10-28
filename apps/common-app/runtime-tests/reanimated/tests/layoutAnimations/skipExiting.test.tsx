import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  LayoutAnimationConfig,
  ReduceMotion,
} from 'react-native-reanimated';

import {
  callTracker,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  isViewMountedNatively,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const EXIT_MS = 1000;
const SKIPPED_REMOVAL_TIMEOUT_MS = EXIT_MS / 2;
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
  await waitForFrames(3);
  expect(await isViewMountedNatively(tag)).toBe(true);
  await expectEventually(() => isViewMountedNatively(tag), EXIT_MS * 3).toBe(
    false
  );
  await expectEventually(() => getTrackerCallCount(tracker)).toBeCalledUI(1);
}

async function expectExitingAnimationToBeSkipped(
  tags: number[],
  trackers: Tracker[]
) {
  for (const tag of tags) {
    await expectEventually(
      () => isViewMountedNatively(tag),
      SKIPPED_REMOVAL_TIMEOUT_MS
    ).toBe(false);
  }
  await wait(EXIT_MS * 1.5);
  for (const tracker of trackers) {
    expect(await getTrackerCallCount(tracker)).toBeCalled(0);
  }
}

describe('LayoutAnimationConfig skipExiting', () => {
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
