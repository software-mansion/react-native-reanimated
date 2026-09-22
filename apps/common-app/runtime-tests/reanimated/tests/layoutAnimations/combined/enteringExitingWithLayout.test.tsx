import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import {
  callTracker,
  createTestValue,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  test,
  useTestRef,
  wait,
  waitForNotifications,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

/**
 * Runtime version of the "[LA] Entering and Exiting with Layout" example
 * (apps/common-app/src/apps/reanimated/examples/LayoutAnimations/Combined.tsx).
 *
 * Six boxes are toggled at once inside a column container with `flexWrap`.
 * Every outer box has entering, exiting and layout animations; some of them
 * wrap a child that has its own entering/exiting animation. The container
 * height cycles through the same values as in the example, so the boxes wrap
 * into 2, 3, 4, 5 or 6 rows per column.
 *
 * Two kinds of evidence are collected:
 *
 * - Animation callbacks (`withCallback`) tell which animation ran, how many
 *   times, and whether it finished or was cancelled.
 * - The per-frame values the layout animations manager sends to native
 *   (`_notifyAboutProgress`, captured by `recordAnimationUpdates`) tell what
 *   was drawn: opacity of entering/exiting boxes frame by frame, and the
 *   origin/size of boxes during layout transitions. The final layout is
 *   cross-checked against the shadow tree via `getViewProp`.
 */

const BOX = { width: 100, height: 50, margin: 10 };
// Every box takes the same slot in the flex-wrapped container.
const SLOT = {
  width: BOX.width + 2 * BOX.margin,
  height: BOX.height + 2 * BOX.margin,
};

// Container heights in the order the example cycles through them.
const CONTAINER_HEIGHTS = [420, 140, 210, 280, 350, 420] as const;
const HEIGHT_PAIRS = CONTAINER_HEIGHTS.slice(1).map(
  (height, index) => [CONTAINER_HEIGHTS[index], height] as [number, number]
);
const TALL_CONTAINER = CONTAINER_HEIGHTS[0]; // single column
const SHORT_CONTAINER = CONTAINER_HEIGHTS[1]; // two boxes per column

const SLOW_EXIT_DURATION = 2000; // default FadeIn / FadeOut take 300ms

// Frame counts with the mocked animation timer (16ms per frame).
const MIN_TRANSITION_FRAMES = 10;
const FAST_FADE_FRAMES = { min: 12, max: 30 }; // ~19 frames for 300ms
const SLOW_FADE_FRAMES = { min: 80, max: 170 }; // ~125 frames for 2000ms

enum Box {
  ONE = 'ONE',
  TWO = 'TWO',
  THREE = 'THREE',
  FOUR = 'FOUR',
  FIVE = 'FIVE',
  SIX = 'SIX',
  FOUR_CHILD = 'FOUR_CHILD',
  FIVE_CHILD = 'FIVE_CHILD',
  SIX_CHILD = 'SIX_CHILD',
}

enum Phase {
  ENTERING = 'entering',
  EXITING = 'exiting',
  LAYOUT = 'layout',
}

const OUTER_BOXES = [
  Box.ONE,
  Box.TWO,
  Box.THREE,
  Box.FOUR,
  Box.FIVE,
  Box.SIX,
] as const;
const CHILD_BOXES = [Box.FOUR_CHILD, Box.FIVE_CHILD, Box.SIX_CHILD] as const;
const ANIMATED_BOXES = [...OUTER_BOXES, ...CHILD_BOXES] as const;

// Box ONE sits in a plain wrapper View; the wrapper moves when the container
// wraps, but the box's own frame inside it never changes, so it never gets a
// layout transition. The other outer boxes are direct children of the
// container.
const LAYOUT_CANDIDATES = [Box.TWO, Box.THREE, Box.FOUR, Box.FIVE, Box.SIX];

// Outer box with FadeOut.duration(2000); its child exits in the default 300ms.
const SLOW_EXITING_BOXES = [Box.FIVE] as const;
// Child with FadeOut.duration(2000) inside a parent that exits in 300ms. When
// the parent's exiting animation ends, the layout animations proxy removes the
// whole subtree and cancels the still running child animation.
const CANCELLED_EXITING_BOXES = [Box.SIX_CHILD] as const;
const FAST_EXITING_BOXES = ANIMATED_BOXES.filter(
  (box) =>
    !(SLOW_EXITING_BOXES as readonly Box[]).includes(box) &&
    !(CANCELLED_EXITING_BOXES as readonly Box[]).includes(box)
);

// ---------------------------------------------------------------------------
// Expected geometry
// ---------------------------------------------------------------------------

type Frame = { x: number; y: number; width: number; height: number };

const OUTER_INDEX: Record<string, number> = {
  [Box.ONE]: 0,
  [Box.TWO]: 1,
  [Box.THREE]: 2,
  [Box.FOUR]: 3,
  [Box.FIVE]: 4,
  [Box.SIX]: 5,
};

function slotOrigin(index: number, containerHeight: number) {
  const boxesPerColumn = Math.floor(containerHeight / SLOT.height);
  return {
    x: Math.floor(index / boxesPerColumn) * SLOT.width,
    y: (index % boxesPerColumn) * SLOT.height,
  };
}

/** Frame of an outer box relative to its parent for a given container height. */
function expectedFrame(box: Box, containerHeight: number): Frame {
  const slot = slotOrigin(OUTER_INDEX[box], containerHeight);
  switch (box) {
    case Box.ONE:
      // Relative to its wrapper View, which is what the box's layout is.
      return {
        x: BOX.margin,
        y: BOX.margin,
        width: BOX.width,
        height: BOX.height,
      };
    case Box.TWO:
      // Styled box directly in the container: the margin is outside the frame.
      return {
        x: slot.x + BOX.margin,
        y: slot.y + BOX.margin,
        width: BOX.width,
        height: BOX.height,
      };
    default:
      // Unstyled wrapper around a styled child: it fills the whole slot.
      return { x: slot.x, y: slot.y, width: SLOT.width, height: SLOT.height };
  }
}

function framesDiffer(a: Frame, b: Frame) {
  return (
    a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height
  );
}

function movingBoxes(fromHeight: number, toHeight: number) {
  return LAYOUT_CANDIDATES.filter((box) =>
    framesDiffer(expectedFrame(box, fromHeight), expectedFrame(box, toHeight))
  );
}

function staticBoxes(fromHeight: number, toHeight: number) {
  const moving = movingBoxes(fromHeight, toHeight);
  return OUTER_BOXES.filter((box) => !moving.includes(box));
}

// ---------------------------------------------------------------------------
// Callback tracking
// ---------------------------------------------------------------------------

type LayoutAnimationCallback = (finished: boolean) => void;

type TrackedCallback = {
  finished: { value: boolean | string };
  callback: LayoutAnimationCallback;
};

/**
 * Callbacks of one test run. Tracker and notification names are global, and the
 * runner unmounts the rendered tree when a test ends, which starts exiting
 * animations whose callbacks would otherwise land in the next test. A unique
 * prefix per test keeps the runs apart.
 */
type TrackedCallbacks = {
  id: string;
  callbacks: Record<string, TrackedCallback>;
};

let trackedCallbacksCounter = 0;

function createTrackedCallback(name: string): TrackedCallback {
  const [finished, setFinished] = createTestValue<boolean>(false);
  const callback = (isFinished: boolean) => {
    'worklet';
    callTracker(name);
    setFinished(isFinished, name);
  };
  return { finished, callback };
}

function trackerName(tracked: TrackedCallbacks, phase: Phase, box: Box) {
  return `${tracked.id}_${phase}_${box}`;
}

function createTrackedCallbacks(): TrackedCallbacks {
  trackedCallbacksCounter += 1;
  const tracked: TrackedCallbacks = {
    id: `combined${trackedCallbacksCounter}`,
    callbacks: {},
  };
  for (const phase of Object.values(Phase)) {
    for (const box of ANIMATED_BOXES) {
      const name = trackerName(tracked, phase, box);
      tracked.callbacks[name] = createTrackedCallback(name);
    }
  }
  return tracked;
}

function getCallback(tracked: TrackedCallbacks, phase: Phase, box: Box) {
  return tracked.callbacks[trackerName(tracked, phase, box)].callback;
}

function trackers(
  tracked: TrackedCallbacks,
  phase: Phase,
  boxes: readonly Box[]
) {
  return boxes.map((box) => trackerName(tracked, phase, box));
}

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

type CombinedComponentProps = {
  show: boolean;
  containerHeight: number;
  tracked: TrackedCallbacks;
};

function CombinedComponent({
  show,
  containerHeight,
  tracked,
}: CombinedComponentProps) {
  const refOne = useTestRef(Box.ONE);
  const refTwo = useTestRef(Box.TWO);
  const refThree = useTestRef(Box.THREE);
  const refFour = useTestRef(Box.FOUR);
  const refFive = useTestRef(Box.FIVE);
  const refSix = useTestRef(Box.SIX);
  const refFourChild = useTestRef(Box.FOUR_CHILD);
  const refFiveChild = useTestRef(Box.FIVE_CHILD);
  const refSixChild = useTestRef(Box.SIX_CHILD);

  const entering = (box: Box) =>
    FadeIn.withCallback(getCallback(tracked, Phase.ENTERING, box));
  const exiting = (box: Box) =>
    FadeOut.withCallback(getCallback(tracked, Phase.EXITING, box));
  const slowExiting = (box: Box) =>
    FadeOut.duration(SLOW_EXIT_DURATION).withCallback(
      getCallback(tracked, Phase.EXITING, box)
    );
  const layout = (box: Box) =>
    LinearTransition.springify().withCallback(
      getCallback(tracked, Phase.LAYOUT, box)
    );

  return (
    <View style={styles.container}>
      {/*
        Kept unflattened so the layout animation frames are reported relative
        to this container. A plain View with only layout styles would be
        flattened by Fabric and the frames would be relative to the nearest
        host ancestor instead.
      */}
      <View
        collapsable={false}
        style={[styles.flexWrap, { height: containerHeight }]}>
        {show && (
          <View collapsable={false}>
            <Animated.View
              ref={refOne}
              entering={entering(Box.ONE)}
              exiting={exiting(Box.ONE)}
              layout={layout(Box.ONE)}
              style={styles.box}
            />
          </View>
        )}
        {show && (
          <Animated.View
            ref={refTwo}
            entering={entering(Box.TWO)}
            exiting={exiting(Box.TWO)}
            layout={layout(Box.TWO)}
            style={styles.box}
          />
        )}
        {show && (
          <Animated.View
            ref={refThree}
            entering={entering(Box.THREE)}
            exiting={exiting(Box.THREE)}
            layout={layout(Box.THREE)}>
            <Animated.View style={styles.box} />
          </Animated.View>
        )}
        {show && (
          <Animated.View
            ref={refFour}
            entering={entering(Box.FOUR)}
            exiting={exiting(Box.FOUR)}
            layout={layout(Box.FOUR)}>
            <Animated.View
              ref={refFourChild}
              entering={entering(Box.FOUR_CHILD)}
              exiting={exiting(Box.FOUR_CHILD)}
              style={styles.box}
            />
          </Animated.View>
        )}
        {show && (
          <Animated.View
            ref={refFive}
            entering={entering(Box.FIVE)}
            exiting={slowExiting(Box.FIVE)}
            layout={layout(Box.FIVE)}>
            <Animated.View
              ref={refFiveChild}
              entering={entering(Box.FIVE_CHILD)}
              exiting={exiting(Box.FIVE_CHILD)}
              style={styles.box}
            />
          </Animated.View>
        )}
        {show && (
          <Animated.View
            ref={refSix}
            entering={entering(Box.SIX)}
            exiting={exiting(Box.SIX)}
            layout={layout(Box.SIX)}>
            <Animated.View
              ref={refSixChild}
              entering={entering(Box.SIX_CHILD)}
              exiting={slowExiting(Box.SIX_CHILD)}
              style={styles.box}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type UpdatesContainer = Awaited<ReturnType<typeof recordAnimationUpdates>>;
type RecordedFrame = Record<string, number>;
type ViewTags = Record<string, number>;

async function startRecording() {
  await mockAnimationTimer();
  return recordAnimationUpdates();
}

async function renderBoxes(
  tracked: TrackedCallbacks,
  show: boolean,
  containerHeight: number
) {
  await render(
    <CombinedComponent
      show={show}
      containerHeight={containerHeight}
      tracked={tracked}
    />
  );
}

async function mountAndWaitForEntering(
  tracked: TrackedCallbacks,
  containerHeight: number
) {
  await renderBoxes(tracked, true, containerHeight);
  await waitForNotifications(trackers(tracked, Phase.ENTERING, ANIMATED_BOXES));
  const tags = captureViewTags();
  return tags;
}

/** Native view tags, captured while the refs are alive. */
function captureViewTags(): ViewTags {
  const tags: ViewTags = {};
  for (const box of ANIMATED_BOXES) {
    tags[box] = getTestComponent(box).getTag();
  }
  return tags;
}

/**
 * Unmount the boxes and wait until every exiting animation (including the
 * 2000ms ones) has finished so nothing is still animating when the next test
 * starts.
 */
async function unmountAndWaitForExits(
  tracked: TrackedCallbacks,
  containerHeight: number
) {
  await renderBoxes(tracked, false, containerHeight);
  await waitForNotifications(trackers(tracked, Phase.EXITING, ANIMATED_BOXES));
}

async function recordedFrames(
  updates: UpdatesContainer,
  tag: number
): Promise<RecordedFrame[]> {
  try {
    return (await updates.getUpdates(tag)) as RecordedFrame[];
  } catch {
    // No animation update was ever recorded for this view.
    return [];
  }
}

function opacityFrames(frames: RecordedFrame[]) {
  return frames
    .filter((frame) => typeof frame.opacity === 'number')
    .map((frame) => frame.opacity);
}

function positionFrames(frames: RecordedFrame[]) {
  return frames.filter(
    (frame) =>
      typeof frame.originX === 'number' && typeof frame.originY === 'number'
  );
}

function isMonotonic(values: number[], direction: 'up' | 'down') {
  for (let i = 1; i < values.length; i++) {
    if (
      direction === 'up' ? values[i] < values[i - 1] : values[i] > values[i - 1]
    ) {
      return false;
    }
  }
  return true;
}

async function expectCalled(
  tracked: TrackedCallbacks,
  names: string[],
  times: number,
  finished: boolean
) {
  for (const name of names) {
    const callCount = await getTrackerCallCount(name);
    expect(callCount).toBeCalled(times);
    expect(callCount).toBeCalledUI(times);
    expect(tracked.callbacks[name].finished.value).toBe(finished);
  }
}

async function expectNotCalled(names: string[]) {
  for (const name of names) {
    expect(await getTrackerCallCount(name)).toBeCalled(0);
  }
}

/**
 * Opacity moved monotonically from one end to the other and reached the target
 * exactly after roughly the expected number of frames. Frames recorded after
 * the target was reached (e.g. a layout transition that keeps running after a
 * fade finished) must keep the target value.
 */
function expectFade(
  frames: RecordedFrame[],
  direction: 'in' | 'out',
  expectedFrames: { min: number; max: number }
) {
  const opacity = opacityFrames(frames);
  const target = direction === 'in' ? 1 : 0;
  const settledAt = opacity.findIndex((value) => value === target);
  expect(settledAt).toBeWithinRange(expectedFrames.min, expectedFrames.max);
  if (direction === 'in') {
    expect(opacity[0]).toBeWithinRange(0, 0.5);
  } else {
    expect(opacity[0]).toBeWithinRange(0.5, 1);
  }
  expect(isMonotonic(opacity, direction === 'in' ? 'up' : 'down')).toBe(true);
  expect(
    opacity.every((value, index) => index < settledAt || value === target)
  ).toBe(true);
}

/** Opacity went from (almost) 0 to exactly 1 in the default 300ms. */
function expectFadeIn(frames: RecordedFrame[]) {
  expectFade(frames, 'in', FAST_FADE_FRAMES);
}

/** Opacity went from (almost) 1 down to exactly 0, i.e. the box faded out fully. */
function expectFadeOutFinished(
  frames: RecordedFrame[],
  expectedFrames: { min: number; max: number }
) {
  expectFade(frames, 'out', expectedFrames);
}

/** Number of frames recorded so far for every box; used to isolate a phase. */
async function frameCounts(updates: UpdatesContainer, tags: ViewTags) {
  const counts: Record<string, number> = {};
  for (const box of ANIMATED_BOXES) {
    counts[box] = (await recordedFrames(updates, tags[box])).length;
  }
  return counts;
}

/** The fade out stopped early: the last drawn frame was still clearly visible. */
function expectFadeOutCancelled(frames: RecordedFrame[]) {
  const opacity = opacityFrames(frames);
  expect(opacity.length).toBeWithinRange(1, SLOW_FADE_FRAMES.min - 1);
  expect(opacity[opacity.length - 1]).toBeWithinRange(0.5, 1);
}

/** Position frames start at `from` and settle exactly at `to`. */
function expectTransitionFrames(
  frames: RecordedFrame[],
  from: Frame,
  to: Frame
) {
  const positions = positionFrames(frames);
  expect(positions.length).toBeWithinRange(MIN_TRANSITION_FRAMES, 10_000);
  const first = positions[0];
  const last = positions[positions.length - 1];
  // The first recorded frame is the first spring step, still next to `from`.
  expect(first.originX).toBeWithinRange(from.x - 5, from.x + 5);
  expect(first.originY).toBeWithinRange(from.y - 5, from.y + 5);
  expect(last.originX).toBe(to.x, ComparisonMode.PIXEL);
  expect(last.originY).toBe(to.y, ComparisonMode.PIXEL);
  expect(last.width).toBe(to.width, ComparisonMode.PIXEL);
  expect(last.height).toBe(to.height, ComparisonMode.PIXEL);
}

/** The layout committed to the shadow tree matches the expected frame. */
async function expectShadowFrame(box: Box, frame: Frame) {
  const component = getTestComponent(box);
  expect(Number(await component.getAnimatedStyle('left'))).toBe(
    frame.x,
    ComparisonMode.PIXEL
  );
  expect(Number(await component.getAnimatedStyle('top'))).toBe(
    frame.y,
    ComparisonMode.PIXEL
  );
  expect(Number(await component.getAnimatedStyle('width'))).toBe(
    frame.width,
    ComparisonMode.PIXEL
  );
  expect(Number(await component.getAnimatedStyle('height'))).toBe(
    frame.height,
    ComparisonMode.PIXEL
  );
}

async function expectShadowLayout(containerHeight: number) {
  for (const box of OUTER_BOXES) {
    await expectShadowFrame(box, expectedFrame(box, containerHeight));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Entering and exiting combined with layout transitions', () => {
  test('entering animations of all boxes fade in to full opacity on mount', async () => {
    const tracked = createTrackedCallbacks();
    const updates = await startRecording();

    const tags = await mountAndWaitForEntering(tracked, TALL_CONTAINER);

    await expectCalled(
      tracked,
      trackers(tracked, Phase.ENTERING, ANIMATED_BOXES),
      1,
      true
    );
    await expectNotCalled(trackers(tracked, Phase.LAYOUT, ANIMATED_BOXES));
    await expectNotCalled(trackers(tracked, Phase.EXITING, ANIMATED_BOXES));

    for (const box of ANIMATED_BOXES) {
      const frames = await recordedFrames(updates, tags[box]);
      expectFadeIn(frames);
      // Entering does not move anything.
      expect(positionFrames(frames).length).toBe(0);
    }
    await expectShadowLayout(TALL_CONTAINER);

    await unmountAndWaitForExits(tracked, TALL_CONTAINER);
  });

  test.each(HEIGHT_PAIRS)(
    'layout transition when the container height changes from ${0} to ${1}',
    async ([fromHeight, toHeight]) => {
      const tracked = createTrackedCallbacks();
      const updates = await startRecording();

      const tags = await mountAndWaitForEntering(tracked, fromHeight);
      await expectShadowLayout(fromHeight);

      await renderBoxes(tracked, true, toHeight);

      const moving = movingBoxes(fromHeight, toHeight);
      const movingTrackers = trackers(tracked, Phase.LAYOUT, moving);
      await waitForNotifications(movingTrackers);

      await expectCalled(tracked, movingTrackers, 1, true);
      await expectNotCalled(
        trackers(tracked, Phase.LAYOUT, staticBoxes(fromHeight, toHeight))
      );
      await expectNotCalled(trackers(tracked, Phase.EXITING, ANIMATED_BOXES));

      for (const box of moving) {
        expectTransitionFrames(
          await recordedFrames(updates, tags[box]),
          expectedFrame(box, fromHeight),
          expectedFrame(box, toHeight)
        );
      }
      for (const box of staticBoxes(fromHeight, toHeight)) {
        const frames = await recordedFrames(updates, tags[box]);
        expect(positionFrames(frames).length).toBe(0);
      }
      await expectShadowLayout(toHeight);

      await unmountAndWaitForExits(tracked, toHeight);
    }
  );

  test('entering combined with a layout transition ends fully visible at the new position', async () => {
    const tracked = createTrackedCallbacks();
    const updates = await startRecording();

    await renderBoxes(tracked, true, TALL_CONTAINER);
    // Change layout while entering animations are still running.
    await renderBoxes(tracked, true, SHORT_CONTAINER);

    const moving = movingBoxes(TALL_CONTAINER, SHORT_CONTAINER);
    const enteringTrackers = trackers(tracked, Phase.ENTERING, ANIMATED_BOXES);
    const movingTrackers = trackers(tracked, Phase.LAYOUT, moving);
    await waitForNotifications([...enteringTrackers, ...movingTrackers]);
    const tags = captureViewTags();

    for (const name of enteringTrackers) {
      const callCount = await getTrackerCallCount(name);
      expect(callCount).toBeCalled(1);
      expect(callCount).toBeCalledUI(1);
    }
    await expectCalled(tracked, movingTrackers, 1, true);
    await expectNotCalled(
      trackers(
        tracked,
        Phase.LAYOUT,
        staticBoxes(TALL_CONTAINER, SHORT_CONTAINER)
      )
    );
    await expectNotCalled(trackers(tracked, Phase.EXITING, ANIMATED_BOXES));

    for (const box of ANIMATED_BOXES) {
      const frames = await recordedFrames(updates, tags[box]);
      const opacity = opacityFrames(frames);
      expect(opacity.length).toBeWithinRange(1, 10_000);
      expect(opacity[opacity.length - 1]).toBe(1, ComparisonMode.NUMBER);
    }
    for (const box of moving) {
      const positions = positionFrames(
        await recordedFrames(updates, tags[box])
      );
      const last = positions[positions.length - 1];
      const target = expectedFrame(box, SHORT_CONTAINER);
      expect(positions.length).toBeWithinRange(MIN_TRANSITION_FRAMES, 10_000);
      expect(last.originX).toBe(target.x, ComparisonMode.PIXEL);
      expect(last.originY).toBe(target.y, ComparisonMode.PIXEL);
    }
    await expectShadowLayout(SHORT_CONTAINER);

    await unmountAndWaitForExits(tracked, SHORT_CONTAINER);
  });

  test('a layout change during a running transition retargets it and ends at the final position', async () => {
    const tracked = createTrackedCallbacks();
    const updates = await startRecording();

    const [first, second, third] = CONTAINER_HEIGHTS;
    const tags = await mountAndWaitForEntering(tracked, first);

    // Change the height twice, the second time before the spring can settle,
    // like the example's one second interval does.
    await renderBoxes(tracked, true, second);
    // Let the first spring run for a few frames before retargeting it.
    await wait(100);
    await renderBoxes(tracked, true, third);

    const movingFirst = movingBoxes(first, second);
    const movingSecond = movingBoxes(second, third);
    const movingAny = LAYOUT_CANDIDATES.filter(
      (box) => movingFirst.includes(box) || movingSecond.includes(box)
    );
    await waitForNotifications(trackers(tracked, Phase.LAYOUT, movingAny));

    for (const box of movingAny) {
      // The first transition is cancelled by the second one (a callback with
      // `false`), the second one finishes (`true`).
      const expectedCalls =
        (movingFirst.includes(box) ? 1 : 0) +
        (movingSecond.includes(box) ? 1 : 0);
      const name = trackerName(tracked, Phase.LAYOUT, box);
      await expectEventually(() => getTrackerCallCount(name)).toBeCalled(
        expectedCalls
      );
      expect(await getTrackerCallCount(name)).toBeCalledUI(expectedCalls);
      expect(tracked.callbacks[name].finished.value).toBe(true);
    }
    await expectNotCalled(
      trackers(
        tracked,
        Phase.LAYOUT,
        OUTER_BOXES.filter((box) => !movingAny.includes(box))
      )
    );

    for (const box of movingAny) {
      const positions = positionFrames(
        await recordedFrames(updates, tags[box])
      );
      const last = positions[positions.length - 1];
      const target = expectedFrame(box, third);
      expect(positions.length).toBeWithinRange(MIN_TRANSITION_FRAMES, 10_000);
      expect(last.originX).toBe(target.x, ComparisonMode.PIXEL);
      expect(last.originY).toBe(target.y, ComparisonMode.PIXEL);
    }
    await expectShadowLayout(third);

    await unmountAndWaitForExits(tracked, third);
  });

  test('exiting during a layout transition keeps moving boxes to their new layout while fading them out', async () => {
    const tracked = createTrackedCallbacks();
    const updates = await startRecording();

    const tags = await mountAndWaitForEntering(tracked, TALL_CONTAINER);

    // Frames recorded so far belong to the entering phase; everything after
    // this index is the layout transition and the exiting animation.
    const enteredFrames = await frameCounts(updates, tags);
    const exitFrames = async (box: Box) =>
      (await recordedFrames(updates, tags[box])).slice(enteredFrames[box]);

    // Start layout transitions and unmount before they can finish.
    await renderBoxes(tracked, true, SHORT_CONTAINER);
    await renderBoxes(tracked, false, SHORT_CONTAINER);

    const moving = movingBoxes(TALL_CONTAINER, SHORT_CONTAINER);
    const fastExitTrackers = trackers(
      tracked,
      Phase.EXITING,
      FAST_EXITING_BOXES
    );
    const slowExitTrackers = trackers(
      tracked,
      Phase.EXITING,
      SLOW_EXITING_BOXES
    );
    const cancelledExitTrackers = trackers(
      tracked,
      Phase.EXITING,
      CANCELLED_EXITING_BOXES
    );

    await waitForNotifications([...fastExitTrackers, ...cancelledExitTrackers]);
    await expectCalled(tracked, fastExitTrackers, 1, true);
    // The child's 2000ms exiting is cancelled as soon as its parent's 300ms
    // exiting finishes and the parent subtree is removed.
    await expectCalled(tracked, cancelledExitTrackers, 1, false);
    // An outer box with FadeOut.duration(2000) must still be running when the
    // default 300ms exiting animations have finished.
    await expectNotCalled(slowExitTrackers);

    await waitForNotifications(slowExitTrackers);
    await expectCalled(tracked, slowExitTrackers, 1, true);

    // The layout transitions that were in flight report `finished=false`:
    // their animation objects were replaced by the merged exiting animation.
    await expectCalled(
      tracked,
      trackers(tracked, Phase.LAYOUT, moving),
      1,
      false
    );
    await expectNotCalled(
      trackers(
        tracked,
        Phase.LAYOUT,
        staticBoxes(TALL_CONTAINER, SHORT_CONTAINER)
      )
    );

    // What was drawn: fast boxes faded to 0 in ~300ms, the slow outer box in
    // ~2000ms, and the cancelled child never got close to 0.
    for (const box of FAST_EXITING_BOXES) {
      expectFadeOutFinished(await exitFrames(box), FAST_FADE_FRAMES);
    }
    for (const box of SLOW_EXITING_BOXES) {
      expectFadeOutFinished(await exitFrames(box), SLOW_FADE_FRAMES);
    }
    for (const box of CANCELLED_EXITING_BOXES) {
      expectFadeOutCancelled(await exitFrames(box));
    }
    // Exiting does not stop the running layout transition: the exiting
    // animation is merged into it, so every moving box keeps sliding to its
    // new layout position while it fades out, and its exiting callback fires
    // only once both the fade and the spring have settled.
    for (const box of moving) {
      const frames = await exitFrames(box);
      const positions = positionFrames(frames);
      const target = expectedFrame(box, SHORT_CONTAINER);
      const last = positions[positions.length - 1];
      expect(positions.length).toBeWithinRange(MIN_TRANSITION_FRAMES, 10_000);
      expect(last.originX).toBe(target.x, ComparisonMode.PIXEL);
      expect(last.originY).toBe(target.y, ComparisonMode.PIXEL);
      expect(last.opacity).toBe(0, ComparisonMode.NUMBER);
    }
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    marginTop: 60,
  },
  flexWrap: {
    flexWrap: 'wrap',
  },
  box: {
    width: BOX.width,
    height: BOX.height,
    backgroundColor: 'black',
    margin: BOX.margin,
  },
});
