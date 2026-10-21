/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B),
 * each captured value is on its track, and at the end the native box shows its model and the twin has the
 * same model. A check of a playback key count in such a test is for each row, by the time of the row
 * against the times of the trace. Each other test has state checks and trace checks at planned times.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, the model of the
 * native box while the frame driver has a position track or a size track (the player has statement M only
 * for the opacity and the transform), when a callback comes, that a row comes in each part of a timeline.
 * The pixels on screen, a device, and 120 Hz are not tested.
 *
 * Not converted (the old pair comparison at planned times): each test that
 * calls `expectPairParity`, `sampleFramePairAt`, or `expectHiddenRoutesAgree`, and each shared transition
 * test that compares its container with a read of the source.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { Leaves, PairProps, TraceEvent } from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbacks,
  END_LEFT,
  FRAME_BOX_REF,
  FRAME_MS,
  Pair,
  PAIR_DURATION,
  PAIR_CELL_HEIGHT,
  PAIR_LEFT,
  hasNativeLayoutRoute,
  LAYOUT_DURATION,
  layoutOf,
  LONG_MOVE,
  mountScene,
  renderBox,
  sample,
  Scene,
  START_LEFT,
  takeTrace,
  takeTraceOf,
  movingGeometryTest,
} from './nativeLayoutTestKit';

const SHARED_SOURCE_REF = 'NativeLayoutContinuitySharedSource';
const SHARED_PARENT_REF = 'NativeLayoutContinuitySharedParent';
const SHARED_TRANSITION = SharedTransition.duration(PAIR_DURATION / 3);

function SharedParent({
  left,
  layout,
  transform,
  children,
}: React.PropsWithChildren<{
  left: number;
  layout: LayoutAnimationFunction;
  transform: ViewStyle['transform'];
}>) {
  const ref = useTestRef(SHARED_PARENT_REF);
  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      layout={layout}
      style={[styles.sharedParent, { marginLeft: left, transform }]}>
      {children}
    </Animated.View>
  );
}

type SharedScreensProps = {
  left: number;
  width?: number;
  height?: number;
  opacity?: number;
  showTarget: boolean;
  layout: LayoutAnimationFunction;
  /** The parent of the source has the layout animation and the move. */
  movesParent?: boolean;
  /** For the view that has the layout animation. */
  transform?: ViewStyle['transform'];
};

function SharedScreens({
  left,
  width = BOX_SIZE,
  height = BOX_SIZE,
  opacity = 1,
  showTarget,
  layout,
  movesParent = false,
  transform,
}: SharedScreensProps) {
  const sourceRef = useTestRef(SHARED_SOURCE_REF);
  const source = (
    <Animated.View
      ref={sourceRef}
      sharedTransitionTag="native-layout-continuity"
      sharedTransitionStyle={SHARED_TRANSITION}
      layout={movesParent ? undefined : layout}
      style={[
        styles.sharedBox,
        { marginLeft: movesParent ? 0 : left, width, height, opacity },
        !movesParent && { transform },
      ]}
    />
  );
  return (
    <View style={styles.sharedScreens}>
      <SharedTransitionBoundary isActive={!showTarget}>
        {movesParent ? (
          <SharedParent left={left} layout={layout} transform={transform}>
            {source}
          </SharedParent>
        ) : (
          source
        )}
      </SharedTransitionBoundary>
      {showTarget && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="native-layout-continuity"
            sharedTransitionStyle={SHARED_TRANSITION}
            style={[styles.sharedBox, styles.sharedTarget]}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

describe('native layout continuity', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  // The native box and the frame-driven box get the same commits. The frame-driven box is the reference.
  const pairTags = () => ({
    nativeTag: getTestComponent(BOX_REF).getTag(),
    frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
  });

  async function samplePair({ nativeTag, frameTag } = pairTags()) {
    const [position, opacity, framePosition, frameOpacity] = await Promise.all([
      sample(nativeTag, 'Position'),
      sample(nativeTag, 'Opacity'),
      sample(frameTag, 'Position'),
      sample(frameTag, 'Opacity'),
    ]);
    return {
      x: position.presentation[0],
      y: position.presentation[1],
      opacity: opacity.presentation[0],
      frameX: framePosition.model[0],
      // The frame-driven box is one cell below the native box.
      frameY: framePosition.model[1] - PAIR_CELL_HEIGHT,
      frameOpacity: frameOpacity.model[0],
      playbacks: position.playbacks,
    };
  }

  async function renderPair(
    layouts: Pick<PairProps, 'nativeLayout' | 'frameLayout'>,
    opacity = 1
  ) {
    await mountScene(
      <Pair left={START_LEFT} top={0} opacity={opacity} {...layouts} />
    );
  }

  const OPACITY_TOLERANCE = 0.01 + FRAME_MS / PAIR_DURATION;

  async function expectPairParity(
    checkpoints: number,
    intervalMs: number,
    tolerance: number,
    tags = pairTags()
  ) {
    let isClose = true;
    // The presentation layer shows a change of the playback after the next display frame.
    await wait(2 * FRAME_MS);
    for (let checkpoint = 0; checkpoint < checkpoints; checkpoint++) {
      const { x, y, opacity, frameX, frameY, frameOpacity } =
        await samplePair(tags);
      isClose =
        isClose &&
        Math.abs(x - frameX) < tolerance &&
        Math.abs(y - frameY) < tolerance &&
        Math.abs(opacity - frameOpacity) < OPACITY_TOLERANCE;
      await wait(intervalMs);
    }
    expect(isClose).toBe(true);
  }

  // The order of a stop that a pull decides, from the trace only. `FrameUpdateMounted` is in the first events
  // of a mount report and `LayoutMountReported` is its last event, so a stop between them ran in the call that
  // reports the mount of that pull. The client report comes later. A removal has no first event of its report:
  // its case proves that the stop is not after the report, and not that it is in the report. These cases do
  // not prove the pixels, the number of Core Animation commits, or a Release build: a screen recording with a
  // blocked main thread proves the pixels. A hide by a shared transition has no such case.
  async function stopOrderAfter(commit: Parameters<typeof render>[0]) {
    const tag = await renderBox({ layout: LONG_MOVE });
    await render(<Scene left={END_LEFT} layout={LONG_MOVE} />);
    await wait(LAYOUT_DURATION / 4);
    const [{ surfaceId, generation }] = (await takeTraceOf(tag)).filter(
      ({ event }) => event === 'TrackStarted'
    );
    await render(commit);
    await wait(LAYOUT_DURATION / 8);
    const isOfCommand = (event: TraceEvent) =>
      event.tag === tag &&
      event.generation === generation &&
      ['FrameUpdateMounted', 'TrackEnded', 'Ended', 'ClientEnded'].includes(
        event.event
      );
    return (await takeTrace())
      .filter(
        (event) =>
          event.surfaceId === surfaceId &&
          (isOfCommand(event) || event.event === 'LayoutMountReported')
      )
      .map(({ event, target, finished, outcome, transactionNumber }) =>
        [event, target, finished, outcome, transactionNumber]
          .filter((part) => part !== undefined)
          .join(':')
      );
  }

  movingGeometryTest(
    'the mount report of the first frame-driven update of a hand-over stops the native track',
    async () => {
      const frameDriven = layoutOf({
        originX: { duration: LAYOUT_DURATION, hasCallback: true },
      });
      const order = await stopOrderAfter(
        <Scene left={END_LEFT / 2} layout={frameDriven} />
      );
      const transaction = order[0]?.split(':')[2];
      expect(order.join(' > ')).toBe(
        `FrameUpdateMounted:PositionX:${transaction} > TrackEnded:PositionX:false > Ended:Cancelled > LayoutMountReported:${transaction} > ClientEnded:Cancelled`
      );
      await render(null);
    }
  );

  movingGeometryTest(
    'the mount report of the removal of a view stops its native track',
    async () => {
      const order = await stopOrderAfter(
        <Scene left={END_LEFT} layout={LONG_MOVE} isMounted={false} />
      );
      const transaction = order[2]?.split(':')[1];
      expect(order.join(' > ')).toBe(
        `TrackEnded:PositionX:false > Ended:Cancelled > LayoutMountReported:${transaction} > ClientEnded:Cancelled`
      );
      await render(null);
    }
  );

  /**
   * Mounts the source of a shared transition with a layout animation of its X
   * and of `extraLeaves`.
   */
  async function mountSharedSource(hasCallback: boolean, extraLeaves: Leaves) {
    const layout = layoutOf(
      { originX: { duration: PAIR_DURATION, hasCallback }, ...extraLeaves },
      { name: 'hidden' }
    );
    const screens = (left: number, opacity: number, showTarget: boolean) => (
      <SharedScreens
        left={left}
        opacity={opacity}
        showTarget={showTarget}
        layout={layout}
      />
    );
    await render(screens(START_LEFT, 1, false));
    await wait(50);
    const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
    await takeTrace();
    callbacks.length = 0;
    return { tag, screens };
  }

  /**
   * The X that a hidden source shows. The source shows no opacity and has
   * `keys` playbacks.
   */
  async function sampleHiddenX(tag: number, keys = 0) {
    const opacity = await sample(tag, 'Opacity');
    expect(opacity.presentation[0]).toBe(0);
    expect(opacity.playbacks.length).toBe(keys);
    return (await sample(tag, 'Position')).presentation[0];
  }
});

const styles = StyleSheet.create({
  sharedScreens: {
    width: 300,
    height: 300,
  },
  sharedParent: {
    width: BOX_SIZE,
    height: BOX_SIZE,
  },
  sharedBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
  sharedTarget: {
    marginLeft: PAIR_LEFT / 2,
    marginTop: 150,
  },
});
