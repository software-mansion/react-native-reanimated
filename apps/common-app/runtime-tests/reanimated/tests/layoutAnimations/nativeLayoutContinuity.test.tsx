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
  Easing,
  getStaticFeatureFlag,
  LinearTransition,
  SharedTransition,
  SharedTransitionBoundary,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import type { DrawnSample } from '../viewSampler';
import {
  failNextViewLookup,
  isViewSamplerAvailable,
  logDrawnValues,
  recordDrawnValues,
  takeViewLookupFailure,
  uptimeMs,
} from '../viewSampler';
import type {
  CallbackBuilder,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type {
  Band,
  Frame,
  Key,
  Leaf,
  Leaves,
  PairLayouts,
  PairProps,
  SizePairProps,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbacks,
  callbackTimes,
  centerOf,
  END_LEFT,
  END_OPACITY,
  FRAME_BOX_REF,
  FRAME_MS,
  Pair,
  PAIR_DURATION,
  PAIR_CELL_HEIGHT,
  PAIR_LEFT,
  PAIR_TOP,
  LAID_OUT_TOLERANCE,
  POSITION_TOLERANCE,
  START_OPACITY,
  takeTraceUntilSurfaceClosed,
  hasNativeLayoutRoute,
  LAYOUT_DURATION,
  layoutOf,
  LONG_MOVE,
  mountScene,
  pairLayoutsOf,
  renderBox,
  sample,
  Scene,
  SECOND_BOX_REF,
  secondSurfaceSceneOf,
  setSecondSurfaceBox,
  START_LEFT,
  takeTrace,
  takeTraceOf,
  summarize,
  summarizeEnd,
  SizePair,
  PAIR_IN_ROW,
  sampleFramePair,
  sampleFramePairAt,
  framePairDistances,
  isHostEvent,
  sampleFrame,
  frameDistance,
  isClientReport,
  middleOf,
  NATIVE_ANIMATION_ROUTES,
  narrowClockOffset,
  nativeOriginOf,
  opacities,
  PairOf,
  playbackCountOf,
  playbackIdOf,
  playbackIdsOf,
  KEEPS_OPACITY_MODEL_IN_RECORD,
  PLAYS_SIZE_CHANGE,
  PRESENTATION_STAY_MS,
  isNear,
  requireEvent,
  routeOf,
  SizeBox,
  takeTraceUntil,
  waitForCallbacks,
  waitForModel,
  WriterBox,
  PLAYS_MOVING_GEOMETRY,
  movingGeometryTest,
  MOUNTS_IN_DISPATCHES,
} from './nativeLayoutTestKit';

const REST_TOLERANCE = 0.01;

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference` and the end of the two boxes.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  expectAtRest(played);
  return { ...played, reads };
}

/**
 * At the end the native box shows its model, and the twin has the model of the
 * native box.
 */
function expectAtRest({ end }: Played) {
  for (const [target, { presentation, model }] of Object.entries(
    end?.native ?? {}
  )) {
    model.forEach((value, index) => {
      expect(Math.abs(presentation[index] - value) < REST_TOLERANCE).toBe(true);
      expect(
        Math.abs(end!.frame[target].model[index] - value) < REST_TOLERANCE
      ).toBe(true);
    });
  }
}

/** The reads of a target of the native box in a time of the sample clock. */
const readsIn = (
  { rows }: Played,
  target: string,
  fromMs: number,
  toMs = Infinity
) =>
  rows
    .map(({ row }) => row.native[target])
    .filter(
      ({ monotonicTimeMs }) =>
        monotonicTimeMs >= fromMs && monotonicTimeMs < toMs
    );

const isRouteEvent = ({ event }: TraceEvent) => event !== 'FrameUpdateMounted';

const SHARED_SOURCE_REF = 'NativeLayoutContinuitySharedSource';
const SHARED_PARENT_REF = 'NativeLayoutContinuitySharedParent';
const SHARED_TRANSITION = SharedTransition.duration(PAIR_DURATION / 3);
// React Native gives no tag in this range, and each shared container takes the next even number.
const FIRST_SHARED_CONTAINER_TAG = 10000002;
const SHARED_CONTAINER_TAGS = 300;

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

async function findSharedContainerTag() {
  const tags = Array.from(
    { length: SHARED_CONTAINER_TAGS },
    (_, index) => FIRST_SHARED_CONTAINER_TAG + 2 * index
  );
  const samples = await Promise.all(
    tags.map((tag) => sample(tag, 'PositionX').catch(() => undefined))
  );
  return tags.find((_, index) => samples[index] !== undefined);
}

async function sampleSharedContainer(target = 'PositionX') {
  const samples = await Promise.all(
    Array.from({ length: SHARED_CONTAINER_TAGS }, (_, index) =>
      sample(FIRST_SHARED_CONTAINER_TAG + 2 * index, target).catch(
        () => undefined
      )
    )
  );
  return samples.find((containerSample) => containerSample !== undefined);
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

  const pairOf = (leaves: Leaves, frameKey: Key = 'originX') =>
    pairLayoutsOf((hasCallback) => ({
      ...leaves,
      [frameKey]: { ...leaves[frameKey], hasCallback },
    }));

  // The tolerance of the semantic contract: 0.5 pt and one display frame of the leaf with the given duration.
  const oneFrame = (durationMs = PAIR_DURATION) =>
    POSITION_TOLERANCE + (FRAME_MS * PAIR_LEFT) / durationMs;
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

  const AT_START: Place = { left: START_LEFT, top: 0 };
  const MOVED: Place = { left: PAIR_LEFT, top: 0 };
  const MOVED_DOWN: Place = { left: PAIR_LEFT, top: PAIR_TOP };

  /** The second commit comes at `commitMs`, during the animation of the first. */
  const replacedCase = (
    leaves: Leaves,
    last: Place,
    commitMs: number,
    totalMs: number,
    replacement?: ReferenceCase['replacement']
  ): ReferenceCase => ({
    flow: 'layout',
    leaves,
    places: [AT_START, MOVED, last],
    commitTimesMs: [commitMs],
    totalMs,
    replacement,
  });

  const expectCallbacksInOneFrameTime = () =>
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 3 * FRAME_MS
    ).toBe(true);

  movingGeometryTest(
    'a spring Y during a long native X keeps X on its timeline',
    async () => {
      const layouts = pairOf({
        originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
        originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
      });
      await renderPair(layouts);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
      await wait(PAIR_DURATION / 3);
      await render(
        <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
      );
      await expectPairParity(10, PAIR_DURATION / 15, oneFrame());
      await wait(PAIR_DURATION / 3);
      const end = await samplePair();
      expect(end.playbacks.length).toBe(0);
      expect(Math.abs(end.x - end.frameX) <= LAID_OUT_TOLERANCE).toBe(true);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 3 * FRAME_MS
      ).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest(
    'a new timing with the same end value keeps the old start time and start value',
    async () => {
      const first = pairOf({
        originX: { duration: PAIR_DURATION },
        originY: { duration: PAIR_DURATION },
      });
      // Each variant has the duration of its fastest part for the bound of one display frame.
      const variants: [Leaf, number][] = [
        [{ duration: PAIR_DURATION / 2 }, PAIR_DURATION / 2],
        [{ duration: 1.5 * PAIR_DURATION }, 1.5 * PAIR_DURATION],
        [
          {
            duration: PAIR_DURATION,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          },
          PAIR_DURATION / 2,
        ],
      ];
      for (const [leaf, fastestDuration] of variants) {
        const second = pairOf({ originX: leaf, originY: leaf });
        await renderPair(first);
        await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
        await wait(PAIR_DURATION / 4);
        await render(
          <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...second} />
        );
        await expectPairParity(
          6,
          PAIR_DURATION / 20,
          oneFrame(fastestDuration)
        );
        await wait(1.5 * PAIR_DURATION);
        expect([...callbacks].sort().join()).toBe(
          'frame:false,frame:true,native:false,native:true'
        );
        await render(null);
      }
    }
  );

  movingGeometryTest(
    'the old track continues through the delay of its replacement',
    async () => {
      const first = pairOf({ originX: { duration: PAIR_DURATION } });
      const second = pairOf({
        originX: { duration: PAIR_DURATION / 3, delays: [PAIR_DURATION / 5] },
      });
      await renderPair(first);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
      await wait(PAIR_DURATION / 4);
      await render(
        <Pair left={PAIR_LEFT / 4} top={0} opacity={1} {...second} />
      );
      await expectPairParity(
        8,
        PAIR_DURATION / 15,
        oneFrame(PAIR_DURATION / 3)
      );
      await wait(PAIR_DURATION / 3);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    }
  );

  movingGeometryTest(
    'a replacement with position and opacity continues both drivers from one value',
    async () => {
      await playCase('a replacement with position and opacity', {
        flow: 'layout',
        leaves: {
          originX: { duration: PAIR_DURATION },
          opacity: {
            duration: PAIR_DURATION,
            initial: START_OPACITY,
            to: END_OPACITY,
          },
        },
        places: [
          { ...AT_START, opacity: START_OPACITY },
          { ...MOVED, opacity: END_OPACITY },
          { left: PAIR_LEFT / 4, top: 0, opacity: END_OPACITY },
        ],
        commitTimesMs: [PAIR_DURATION / 3],
        totalMs: PAIR_DURATION,
      });
      await render(null);
    }
  );

  movingGeometryTest(
    'a replacement during the part of an overshoot curve that is below its start',
    async () => {
      await playCase(
        'a replacement below the start of an overshoot curve',
        replacedCase(
          {
            originX: {
              duration: PAIR_DURATION,
              easing: Easing.bezier(0.3, -0.4, 0.7, 1.6),
            },
          },
          { left: PAIR_LEFT / 2, top: 0 },
          PAIR_DURATION / 10,
          PAIR_DURATION,
          { leaves: { originX: { duration: PAIR_DURATION } } }
        )
      );
      await render(null);
    }
  );

  movingGeometryTest(
    'an exit during a native X continues X and fades',
    async () => {
      const layouts = pairOf({ originX: { duration: PAIR_DURATION } });
      const exiting = ((values: { currentOriginX: number }) => {
        'worklet';
        return {
          initialValues: { originX: values.currentOriginX, opacity: 1 },
          animations: {
            opacity: withTiming(0, {
              duration: PAIR_DURATION / 2,
              easing: Easing.linear,
            }),
          },
        };
      }) as PairProps['exiting'];
      await renderPair(layouts);
      await render(
        <Pair
          left={PAIR_LEFT}
          top={0}
          opacity={1}
          exiting={exiting}
          {...layouts}
        />
      );
      await wait(PAIR_DURATION / 3);
      const tags = pairTags();
      await render(
        <Pair
          left={PAIR_LEFT}
          top={0}
          opacity={1}
          exiting={exiting}
          isMounted={false}
          {...layouts}
        />
      );
      await expectPairParity(6, PAIR_DURATION / 15, oneFrame(), tags);
      await wait(PAIR_DURATION / 2);
      expect([...callbacks].sort().join()).toBe('frame:false,native:false');
      await render(null);
    }
  );

  movingGeometryTest('a new Y during a delayed native X', async () => {
    const layouts = pairOf({
      originX: {
        duration: PAIR_DURATION / 2,
        delays: [PAIR_DURATION / 4],
        onlyWhenChanged: true,
      },
      originY: { duration: PAIR_DURATION / 3, onlyWhenChanged: true },
    });
    // The first time is in the delay of X. The second time is after it.
    for (const waitMs of [PAIR_DURATION / 8, PAIR_DURATION / 2]) {
      await renderPair(layouts);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
      await wait(waitMs);
      await render(
        <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
      );
      await expectPairParity(
        8,
        PAIR_DURATION / 10,
        oneFrame(PAIR_DURATION / 2)
      );
      await wait(PAIR_DURATION / 2);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    }
  });

  movingGeometryTest(
    'a commit that changes no end value of the builder keeps X on its timeline',
    async () => {
      await playCase(
        'a commit that changes no end value of the builder',
        replacedCase(
          { originX: { duration: PAIR_DURATION } },
          MOVED_DOWN,
          PAIR_DURATION / 3,
          (2 * PAIR_DURATION) / 3
        )
      );
      await render(null);
    }
  );

  movingGeometryTest(
    'a native replacement and then a frame-driven start',
    async () => {
      const timing = pairOf({
        originX: { duration: PAIR_DURATION },
        originY: { duration: PAIR_DURATION },
      });
      const spring = pairOf({
        originX: { duration: PAIR_DURATION },
        originY: { isFrameDrivenSpring: true },
      });
      await renderPair(timing);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...timing} />);
      await wait(PAIR_DURATION / 4);
      await render(
        <Pair left={PAIR_LEFT / 2} top={0} opacity={1} {...timing} />
      );
      await wait(PAIR_DURATION / 4);
      const { nativeTag } = pairTags();
      const native = await sample(nativeTag, 'PositionX');
      expect(native.playbacks.length).toBe(2);
      await takeTrace();
      await render(
        <Pair left={PAIR_LEFT / 2} top={PAIR_TOP} opacity={1} {...spring} />
      );
      await expectPairParity(8, PAIR_DURATION / 12, oneFrame());
      expect((await sample(nativeTag, 'PositionX')).playbacks.length).toBe(0);
      await wait(PAIR_DURATION / 2);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:false,frame:true,native:false,native:false,native:true'
      );
      await render(null);
    }
  );

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

  movingGeometryTest(
    'the removal of the view after a frame-driven start took its native tracks',
    async () => {
      const layouts = pairOf({
        originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
        originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
      });
      await renderPair(layouts);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
      await wait(PAIR_DURATION / 4);
      await render(
        <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
      );
      await wait(PAIR_DURATION / 4);
      await render(null);
      await wait(200);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:false,native:false,native:false'
      );
      expect(
        (await takeTrace()).filter((event) => event.event === 'Ended').length
      ).toBe(1);
    }
  );

  movingGeometryTest(
    'a React commit that changes the opacity prop during a native opacity track',
    async () => {
      const layouts = pairOf({
        originX: { duration: PAIR_DURATION },
        opacity: {
          duration: PAIR_DURATION,
          initial: START_OPACITY,
          to: END_OPACITY,
        },
      });
      await renderPair(layouts, START_OPACITY);
      await render(
        <Pair left={PAIR_LEFT} top={0} opacity={END_OPACITY} {...layouts} />
      );
      await wait(PAIR_DURATION / 3);
      await render(
        <Pair left={PAIR_LEFT} top={0} opacity={0.6} {...layouts} />
      );
      if (KEEPS_OPACITY_MODEL_IN_RECORD) {
        const { reads } = await waitForModel(
          pairTags().nativeTag,
          'Opacity',
          ([model]) => Math.abs(model - 0.6) < 0.01
        );
        expect(reads[reads.length - 1].playbacks.length).toBe(2);
      }
      await expectPairParity(5, PAIR_DURATION / 10, oneFrame());
      await wait(PAIR_DURATION / 4);
      // The native box shows the committed prop when its track ends.
      const end = await samplePair();
      expect(end.playbacks.length).toBe(0);
      expect(Math.abs(end.opacity - 0.6) < 0.01).toBe(true);
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a new native Y keeps the long native X, and the callbacks agree with the frame driver',
    async () => {
      const played = await playCase(
        'a new native Y during a long native X',
        replacedCase(
          {
            originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
            originY: { duration: PAIR_DURATION / 4, onlyWhenChanged: true },
          },
          MOVED_DOWN,
          PAIR_DURATION / 4,
          (3 * PAIR_DURATION) / 4
        )
      );
      const [firstX, secondY] = played.tracks;
      expect(firstX.target).toBe('PositionX');
      expect(secondY.target).toBe('PositionY');
      const afterTheEndOfY = readsIn(
        played,
        'PositionX',
        secondY.played.to + PRESENTATION_STAY_MS,
        middleOf(firstX.origin) + PAIR_DURATION - FRAME_MS
      );
      expect(afterTheEndOfY.length > 0).toBe(true);
      for (const read of afterTheEndOfY) {
        expect(read.playbacks.length).toBe(1);
        expect(playbackCountOf(read, firstX.generation)).toBe(1);
      }
      expect(callbacks.filter((name) => name.startsWith('native')).join()).toBe(
        'native:false,native:true'
      );
      expectCallbacksInOneFrameTime();
      await render(null);
    }
  );

  movingGeometryTest(
    'a new initial value is the start value of a native replacement and of a frame-driven start',
    async () => {
      const first = pairOf({ originX: { duration: PAIR_DURATION } });
      const offset = pairOf({
        originX: { duration: PAIR_DURATION, initial: 40 },
      });
      const offsetSpring = pairOf({
        originX: { duration: PAIR_DURATION, initial: 40 },
        originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
      });
      for (const [second, top] of [
        [offset, 0],
        [offsetSpring, PAIR_TOP],
      ] as const) {
        await renderPair(first);
        await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
        await wait(PAIR_DURATION / 4);
        await render(
          <Pair left={PAIR_LEFT / 2} top={top} opacity={1} {...second} />
        );
        await expectPairParity(5, PAIR_DURATION / 10, oneFrame());
        await render(null);
      }
    }
  );

  for (const { gapName, waitForGap, mayShareAPull } of [
    {
      gapName: 'in the next commit',
      waitForGap: async () => {},
      mayShareAPull: true,
    },
    {
      gapName: 'one frame',
      waitForGap: () => waitForFrames(1),
      mayShareAPull: false,
    },
  ]) {
    movingGeometryTest(
      `the removal of the view ${gapName} after a frame-driven start took its native tracks`,
      async () => {
        const layouts = pairOf({
          originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
          originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
        });
        await renderPair(layouts);
        await render(
          <Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />
        );
        await wait(PAIR_DURATION / 4);
        const { nativeTag } = pairTags();
        await takeTrace();
        await render(
          <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
        );
        await waitForGap();
        await render(null);
        await wait(200);
        const events = (await takeTrace()).filter(
          (event) => event.tag === nativeTag
        );
        // On Android the two commits can come in one pull (the mounting coordinator keeps the newest revision):
        // then no build of the frame-driven start runs, and each box gets one false.
        const isOnePull =
          mayShareAPull &&
          MOUNTS_IN_DISPATCHES &&
          !events.some(({ event }) => event === 'LayoutBuildFailed');
        console.log(`RuntimeTestsRemovalAfterTakeOver one pull: ${isOnePull}`);
        expect([...callbacks].sort().join()).toBe(
          isOnePull
            ? 'frame:false,native:false'
            : 'frame:false,frame:false,native:false,native:false'
        );
        expect(events.filter((event) => event.event === 'Ended').length).toBe(
          1
        );
        expect(
          events.filter((event) => event.event === 'TrackEnded').length
        ).toBe(1);
      }
    );
  }

  movingGeometryTest(
    'a shared transition from a view with a native X track starts at the value on screen',
    async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      for (const hasCallback of [false, true]) {
        const layout = layoutOf({
          originX: { duration: PAIR_DURATION, hasCallback },
        });
        await render(
          <SharedScreens left={START_LEFT} showTarget={false} layout={layout} />
        );
        await wait(50);
        const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
        await render(
          <SharedScreens left={PAIR_LEFT} showTarget={false} layout={layout} />
        );
        await wait(PAIR_DURATION / 3);
        const source = await sample(tag, 'PositionX');
        expect(source.playbacks.length).toBe(hasCallback ? 0 : 1);
        await render(
          <SharedScreens left={PAIR_LEFT} showTarget layout={layout} />
        );
        await wait(2 * FRAME_MS);
        const container = await sampleSharedContainer();
        // The container moves to the target for two frames after its start.
        const distance = Math.abs(container!.model[0] - source.presentation[0]);
        expect(
          distance < oneFrame()
            ? ''
            : `the container is at ${container!.model[0]}, ${distance} from the source ${source.presentation[0]}, bound ${oneFrame()}`
        ).toBe('');
        await wait(PAIR_DURATION / 2);
        await render(null);
      }
    }
  );

  type SharedFrame = { left: number; width: number; height: number };
  const SHARED_START: SharedFrame = {
    left: START_LEFT,
    width: BOX_SIZE,
    height: BOX_SIZE,
  };
  const sharedSizeCases: [string, Key[], SharedFrame][] = [
    ['width track', ['width'], { ...SHARED_START, width: 3 * BOX_SIZE }],
    ['height track', ['height'], { ...SHARED_START, height: 3 * BOX_SIZE }],
    [
      'position and size group',
      ['originX', 'width', 'height'],
      { left: PAIR_LEFT / 2, width: 3 * BOX_SIZE, height: 2 * BOX_SIZE },
    ],
  ];
  for (const [caseName, keys, end] of sharedSizeCases) {
    test(`a shared transition from a view with a native ${caseName} starts at the frame on screen`, async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      const firstFrames: Frame[] = [];
      for (const hasCallback of [false, true]) {
        const layout = layoutOf(
          Object.fromEntries(
            keys.map((key, index) => [
              key,
              {
                duration: PAIR_DURATION,
                hasCallback: hasCallback && index === 0,
              },
            ])
          )
        );
        const screens = (frame: SharedFrame, showTarget: boolean) => (
          <SharedScreens {...frame} showTarget={showTarget} layout={layout} />
        );
        await render(screens(SHARED_START, false));
        await wait(50);
        const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
        await takeTraceOf(tag);
        await render(screens(end, false));
        await wait(PAIR_DURATION / 3);
        const source = await sampleFrame(tag);
        const isNative = PLAYS_SIZE_CHANGE && !hasCallback;
        expect(source.playbacks.length).toBe(isNative ? keys.length : 0);
        expect(
          frameDistance(source.presentation, source.model) > BOX_SIZE / 2
        ).toBe(isNative);
        if (!PLAYS_SIZE_CHANGE && !hasCallback) {
          expect(summarize((await takeTraceOf(tag)).filter(isRouteEvent))).toBe(
            'LayoutBuildFailed:UnsupportedTarget'
          );
        }
        await render(screens(end, true));
        await wait(2 * FRAME_MS);
        const containerTag = await findSharedContainerTag();
        const container = await sampleFrame(containerTag!);
        // The container changes to the frame of the target for two frames after its start.
        for (const dimension of ['x', 'width', 'height'] as const) {
          expect(
            Math.abs(
              container.model[dimension] - source.presentation[dimension]
            ) < oneFrame()
          ).toBe(true);
        }
        firstFrames.push(container.model);
        await wait(PAIR_DURATION / 2);
        await render(null);
      }
      // The container of the native source starts where the container of the frame-driven source starts.
      expect(frameDistance(firstFrames[0], firstFrames[1]) < oneFrame()).toBe(
        true
      );
    });
  }

  movingGeometryTest(
    'a shared transition from a child of a view with a native X track starts at the value on screen',
    async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      for (const hasCallback of [false, true]) {
        const layout = layoutOf({
          originX: { duration: PAIR_DURATION, hasCallback },
        });
        const screens = (left: number, showTarget: boolean) => (
          <SharedScreens
            left={left}
            showTarget={showTarget}
            layout={layout}
            movesParent
          />
        );
        await render(screens(START_LEFT, false));
        await wait(50);
        const parentTag = getTestComponent(SHARED_PARENT_REF).getTag();
        await render(screens(PAIR_LEFT, false));
        await wait(PAIR_DURATION / 3);
        const parent = await sample(parentTag, 'PositionX');
        expect(parent.playbacks.length).toBe(hasCallback ? 0 : 1);
        await render(screens(PAIR_LEFT, true));
        await wait(2 * FRAME_MS);
        const container = await sampleSharedContainer();
        expect(
          Math.abs(container!.model[0] - parent.presentation[0]) < oneFrame()
        ).toBe(true);
        await wait(PAIR_DURATION / 2);
        await render(null);
      }
    }
  );

  const sharedTransformCases: [string, boolean][] = [
    ['a view', false],
    ['a child of a view', true],
  ];
  for (const [caseName, movesParent] of sharedTransformCases) {
    movingGeometryTest(
      `a shared transition from ${caseName} with a native transform track starts at the place on screen`,
      async () => {
        if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
          return;
        }
        const TRAVEL = 90;
        const containerStarts: number[] = [];
        for (const hasCallback of [false, true]) {
          const layout = layoutOf(
            {},
            {
              transform: {
                operations: [['translateX', 0, TRAVEL]],
                shared: { duration: PAIR_DURATION, hasCallback },
              },
            }
          );
          const screens = (left: number, showTarget: boolean) => (
            <SharedScreens
              left={left}
              showTarget={showTarget}
              layout={layout}
              movesParent={movesParent}
              transform={[{ translateX: TRAVEL }]}
            />
          );
          await render(screens(START_LEFT, false));
          await wait(50);
          const tag = getTestComponent(
            movesParent ? SHARED_PARENT_REF : SHARED_SOURCE_REF
          ).getTag();
          await render(screens(START_LEFT + 2, false));
          await wait(PAIR_DURATION / 3);
          const moving = await sample(tag, 'Transform');
          expect(moving.playbacks.length).toBe(hasCallback ? 0 : 1);
          const shown = (hasCallback ? moving.model : moving.presentation)[12];
          expect(shown > TRAVEL / 6 && shown < TRAVEL / 2).toBe(true);
          await render(screens(START_LEFT + 2, true));
          await wait(2 * FRAME_MS);
          const containerTag = await findSharedContainerTag();
          const [position, transform] = await Promise.all([
            sample(containerTag!, 'PositionX'),
            sample(containerTag!, 'Transform'),
          ]);
          containerStarts.push(position.model[0] + transform.model[12] - shown);
          await wait(PAIR_DURATION / 2);
          await render(null);
        }
        // The container moves to the target for two frames after its start.
        expect(
          Math.abs(containerStarts[0] - containerStarts[1]) <
            2 * oneFrame() + (3 * FRAME_MS * TRAVEL) / PAIR_DURATION
        ).toBe(true);
      }
    );
  }

  const HIDDEN_OPACITY: Leaves = {
    opacity: { duration: PAIR_DURATION, initial: 1, to: 0.5 },
  };
  // The callback of the X leaf keeps the layout animation of the second route on the frame driver.
  const HIDDEN_ROUTES = [false, true];

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

  type HiddenRoute = { shownX: number[]; callbackMs: number };

  // The native route and the frame driver show the same X, and the callback comes at the end of the animation.
  function expectHiddenRoutesAgree([native, frame]: HiddenRoute[]) {
    native.shownX.forEach((x, index) => {
      expect(Math.abs(x - frame.shownX[index]) < 2 * oneFrame() + 0.5).toBe(
        true
      );
    });
    expect(Math.abs(native.callbackMs - frame.callbackMs) < 4 * FRAME_MS).toBe(
      true
    );
    expect(
      native.callbackMs > PAIR_DURATION &&
        native.callbackMs < PAIR_DURATION + 6 * FRAME_MS
    ).toBe(true);
  }

  const hiddenSourceCases: [string, Leaves, number][] = [
    ['opacity track', HIDDEN_OPACITY, 0.5],
    ['X track only', {}, 1],
  ];
  for (const [caseName, extraLeaves, endOpacity] of hiddenSourceCases) {
    movingGeometryTest(
      `a shared transition hides a source view whose native ${caseName} plays, and the layout animation ends as on the frame driver`,
      async () => {
        if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
          return;
        }
        const nativeKeys = Object.keys(extraLeaves).length + 1;
        const routes: HiddenRoute[] = [];
        for (const hasCallback of HIDDEN_ROUTES) {
          const { tag, screens } = await mountSharedSource(
            hasCallback,
            extraLeaves
          );
          const waitUntil = (elapsedMs: number) =>
            wait(Math.max(0, startMs + elapsedMs - performance.now()));
          const startMs = performance.now();
          await render(screens(PAIR_LEFT, endOpacity, false));
          await waitUntil(PAIR_DURATION / 3);
          const before = await sample(tag, 'Opacity');
          expect(before.playbacks.length).toBe(hasCallback ? 0 : nativeKeys);
          await render(screens(PAIR_LEFT, endOpacity, true));
          await wait(2 * FRAME_MS);
          const containerTag = await findSharedContainerTag();
          const container = await sample(containerTag!, 'Opacity');
          // The container starts at the opacity that the source showed.
          expect(
            Math.abs(container.model[0] - before.presentation[0]) < 0.02
          ).toBe(true);

          const shownX = [];
          for (const fraction of [0.4, 0.5, 0.7, 0.9]) {
            await waitUntil(fraction * PAIR_DURATION);
            // The frame driver took the group with the opacity track; the X track alone continues natively.
            shownX.push(
              await sampleHiddenX(tag, hasCallback || nativeKeys > 1 ? 0 : 1)
            );
          }
          expect(callbacks.length).toBe(0);

          await waitUntil(PAIR_DURATION + 150);
          expect(callbacks.join()).toBe('hidden:true');
          await sampleHiddenX(tag);
          routes.push({ shownX, callbackMs: callbackTimes.hidden - startMs });
          await render(null);
          await wait(100);
        }

        expectHiddenRoutesAgree(routes);
        const [native] = routes;
        expect(
          native.shownX[3] > native.shownX[0] + 0.4 * (PAIR_LEFT - START_LEFT)
        ).toBe(true);
      }
    );
  }

  movingGeometryTest(
    'a move of a source view in the commit in which a shared transition hides it ends its native tracks, and X continues from the value on screen as on the frame driver',
    async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      const routes: HiddenRoute[] = [];
      for (const hasCallback of HIDDEN_ROUTES) {
        const { tag, screens } = await mountSharedSource(
          hasCallback,
          HIDDEN_OPACITY
        );
        await render(screens(PAIR_LEFT, 0.5, false));
        await wait(PAIR_DURATION / 3);
        const before = await sample(tag, 'Position');
        expect(before.playbacks.length).toBe(hasCallback ? 0 : 2);
        await takeTraceOf(tag);
        const hideMs = performance.now();
        const waitUntil = (elapsedMs: number) =>
          wait(Math.max(0, hideMs + elapsedMs - performance.now()));
        await render(screens(PAIR_LEFT / 2, 0.5, true));

        await wait(2 * FRAME_MS);
        const shownX = [await sampleHiddenX(tag)];
        expect(
          Math.abs(shownX[0] - before.presentation[0]) < 3 * oneFrame()
        ).toBe(true);
        expect(callbacks.join()).toBe('hidden:false');
        // A hidden view admits no native start, so the frame driver plays the second animation on each route.
        const playbackEvents = (await takeTraceOf(tag)).filter(({ event }) =>
          ['TrackStarted', 'TrackEnded', 'Ended'].includes(event)
        );
        expect(summarize(playbackEvents)).toBe(
          hasCallback
            ? ''
            : 'TrackEnded:PositionX:false > TrackEnded:Opacity:false > Ended:Cancelled:None'
        );
        for (const fraction of [0.25, 0.5, 0.75]) {
          await waitUntil(fraction * PAIR_DURATION);
          shownX.push(await sampleHiddenX(tag));
        }
        expect(callbacks.join()).toBe('hidden:false');

        await waitUntil(PAIR_DURATION + 150);
        expect(callbacks.join()).toBe('hidden:false,hidden:true');
        expect(
          Math.abs((await sampleHiddenX(tag)) - centerOf(PAIR_LEFT / 2)) <=
            LAID_OUT_TOLERANCE
        ).toBe(true);
        routes.push({ shownX, callbackMs: callbackTimes.hidden - hideMs });
        await render(null);
        await wait(100);
      }
      expectHiddenRoutesAgree(routes);
    }
  );

  movingGeometryTest(
    'a layout animation with an opacity leaf that starts in the commit in which a shared transition hides its view starts no native track and ends as on the frame driver',
    async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      const routes: HiddenRoute[] = [];
      for (const hasCallback of HIDDEN_ROUTES) {
        const { tag, screens } = await mountSharedSource(
          hasCallback,
          HIDDEN_OPACITY
        );
        const startMs = performance.now();
        const waitUntil = (elapsedMs: number) =>
          wait(Math.max(0, startMs + elapsedMs - performance.now()));
        await render(screens(PAIR_LEFT, 0.5, true));

        const shownX = [];
        for (const fraction of [0.1, 0.4, 0.7, 0.9]) {
          await waitUntil(fraction * PAIR_DURATION);
          shownX.push(await sampleHiddenX(tag));
        }
        expect(callbacks.length).toBe(0);
        expect(shownX[3] > shownX[0] + 0.6 * (PAIR_LEFT - START_LEFT)).toBe(
          true
        );

        await waitUntil(PAIR_DURATION + 150);
        expect(callbacks.join()).toBe('hidden:true');
        expect(
          Math.abs((await sampleHiddenX(tag)) - centerOf(PAIR_LEFT)) <=
            LAID_OUT_TOLERANCE
        ).toBe(true);
        // The native route makes no build for a hidden view.
        expect(summarize(await takeTraceOf(tag))).toBe('');
        routes.push({ shownX, callbackMs: callbackTimes.hidden - startMs });
        await render(null);
        await wait(100);
      }
      expectHiddenRoutesAgree(routes);
    }
  );
});

const TransferSurfaceScene = secondSurfaceSceneOf({
  layout: layoutOf(
    {
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
      originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
    },
    { name: 'surface' }
  ),
});

describe('native layout continuity on a second surface', () => {
  if (!hasNativeLayoutRoute || !isSecondSurfaceAvailable()) {
    return;
  }

  movingGeometryTest(
    'the stop of a surface after a frame-driven start took a native track gives each callback one result',
    async () => {
      const surfaceId = await startSecondSurface(TransferSurfaceScene);
      const tag = getTestComponent(SECOND_BOX_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      setSecondSurfaceBox({ left: PAIR_LEFT, top: 0 });
      await wait(PAIR_DURATION / 4);
      setSecondSurfaceBox({ left: PAIR_LEFT, top: PAIR_TOP });
      expect(await waitForCallbacks(['surface:false'])).toBe('');
      expect(callbacks.join()).toBe('surface:false');
      await stopSecondSurface(surfaceId);
      const events = await takeTraceUntilSurfaceClosed(surfaceId);
      await wait(500);
      expect(callbacks.join()).toBe('surface:false,surface:false');
      expect(
        events.filter((event) => event.tag === tag && event.event === 'Ended')
          .length
      ).toBe(1);
      expect(
        (await takeTrace()).filter((event) => event.tag === tag).length
      ).toBe(0);
    }
  );
});

describe('native layout size continuity', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const START = { left: 0, top: 0, width: 50 };
  const FIRST = { left: 120, top: 0, width: 150 };
  const MOVED = { left: 120, top: 0, width: 50 };
  const TOLERANCE = POSITION_TOLERANCE + (FRAME_MS * 120) / PAIR_DURATION;

  const customPair = pairLayoutsOf((hasCallback) => ({
    originX: { duration: PAIR_DURATION, hasCallback },
    width: { duration: PAIR_DURATION },
  }));

  type Declaration = Pick<ReferenceCase, 'leaves' | 'builder'>;
  const LEAF: Leaf = { duration: PAIR_DURATION };
  const SIZE_GROUP: Declaration = { leaves: { originX: LEAF, width: LEAF } };
  const LINEAR: Declaration = {
    leaves: { originX: LEAF, originY: LEAF, width: LEAF, height: LEAF },
    builder: () =>
      LinearTransition.duration(PAIR_DURATION).easing(
        Easing.linear
      ) as unknown as CallbackBuilder,
  };
  const CHANGE_MS = PAIR_DURATION / 3;

  type SizeChange = { target: 'Width' | 'Height'; from: number; to: number };
  const WIDTH_CHANGE: SizeChange = {
    target: 'Width',
    from: START.width,
    to: FIRST.width,
  };
  const changesSize = (places: Place[]) =>
    places.some(
      ({ width, height }) =>
        width !== places[0].width || height !== places[0].height
    );
  /** The trace and the samples of the size of the native box in the first third. */
  type FirstThird = {
    tag: number;
    events: TraceEvent[];
    samples: TargetSample[];
  };
  const FIRST_THIRD_PARTS = [0.1, 0.2, 0.3];
  // The lag of the frame driver from the refusal, measured on iOS: a start value for Android.
  const FRAME_DRIVER_LAG_MS: Band = { from: -2 * FRAME_MS, to: 5 * FRAME_MS };

  /**
   * The wait of the first third of the animation. With no native size change it
   * samples the changed size of the native box, and it takes the trace after
   * the wait: the evidence of the route.
   */
  async function waitFirstThird(
    tag: number,
    { target }: SizeChange
  ): Promise<FirstThird | undefined> {
    if (PLAYS_SIZE_CHANGE) {
      await wait(PAIR_DURATION / 3);
      return undefined;
    }
    const startMs = performance.now();
    const samples: TargetSample[] = [];
    for (const part of FIRST_THIRD_PARTS) {
      await wait(
        Math.max(0, startMs + part * PAIR_DURATION - performance.now())
      );
      samples.push(await sample(tag, target));
    }
    await wait(Math.max(0, startMs + CHANGE_MS - performance.now()));
    return { tag, samples, events: await takeTraceOf(tag) };
  }

  function firstThirdOf(
    { events, rows }: Played,
    { target }: SizeChange
  ): FirstThird {
    const refusalMs =
      events.find(({ event }) => event === 'LayoutBuildFailed')
        ?.monotonicTimeMs ?? Infinity;
    const samples = rows.map(({ row }) => row.native[target]);
    return {
      tag: getTestComponent(BOX_REF).getTag(),
      events,
      samples: FIRST_THIRD_PARTS.flatMap(
        (part) =>
          samples.find(
            ({ monotonicTimeMs }) =>
              monotonicTimeMs >= refusalMs + part * PAIR_DURATION
          ) ?? []
      ),
    };
  }

  const isOnFrameDriverLineOf =
    ({ from, to }: SizeChange) =>
    ({ model: [value] }: { model: number[] }, sinceRefusalMs: number) => {
      const valueAt = (elapsedMs: number) =>
        from +
        (to - from) * Math.min(1, Math.max(0, elapsedMs / PAIR_DURATION));
      const ends = [
        valueAt(sinceRefusalMs - FRAME_DRIVER_LAG_MS.to),
        valueAt(sinceRefusalMs - FRAME_DRIVER_LAG_MS.from),
      ];
      return (
        value >= Math.min(...ends) - POSITION_TOLERANCE &&
        value <= Math.max(...ends) + POSITION_TOLERANCE
      );
    };

  /**
   * The Android form: the size change keeps the whole animation of the native
   * box on the frame driver (`AndroidNativeAnimationPlatform::playsTarget`),
   * and a later commit starts nothing native on a view with frame-driven state
   * (`LayoutAnimationsProxy::admitsNativeStart`).
   */
  function expectFrameDrivenGroup(
    { tag, events, samples }: FirstThird,
    change: SizeChange
  ) {
    expect(summarize(events.filter(isRouteEvent))).toBe(
      'LayoutBuildFailed:UnsupportedTarget'
    );
    const route = routeOf(
      events,
      tag,
      change.target,
      samples,
      isOnFrameDriverLineOf(change)
    );
    expect(route.kind).toBe('frame-driven');
  }

  /** The native box gets the callbacks of its frame-driven twin. */
  function expectCallbacksOfTwin() {
    const resultsOf = (box: string) =>
      callbacks
        .filter((callback) => callback.startsWith(`${box}:`))
        .map((callback) => callback.slice(box.length + 1))
        .sort()
        .join();
    expect(resultsOf('frame').length > 0).toBe(true);
    expect(resultsOf('native')).toBe(resultsOf('frame'));
  }

  /**
   * A second commit to the place `last` comes after one third of the first
   * animation.
   */
  const playReplacement = (
    caseName: string,
    declaration: Declaration,
    last: Place,
    first: Place = FIRST
  ) =>
    playCase(caseName, {
      flow: 'layout',
      ...declaration,
      isFrameDriven: !PLAYS_SIZE_CHANGE && changesSize([START, first, last]),
      places: [START, first, last],
      commitTimesMs: [CHANGE_MS],
      totalMs: PAIR_DURATION,
    });

  const CHECKPOINTS = [0.05, 0.15, 0.3, 0.45, 0.6, 0.8];

  // The second commit comes after one third of the first animation.
  async function replaceDuringSizeGroup(
    layouts: PairLayouts,
    second: Partial<SizePairProps>,
    first = FIRST
  ) {
    const tag = await mountScene(<SizePair {...START} {...layouts} />);
    await render(<SizePair {...first} {...layouts} />);
    const firstThird = await waitFirstThird(tag, WIDTH_CHANGE);
    const firstEvents = firstThird?.events ?? (await takeTraceOf(tag));
    const before = await sampleFramePair();
    await render(<SizePair {...first} {...second} {...layouts} />);
    const rows = await sampleFramePairAt(PAIR_DURATION, CHECKPOINTS);
    const events = await takeTraceOf(tag);
    return {
      firstThird,
      firstPending: firstEvents[0],
      before,
      rows,
      events,
      distances: framePairDistances(rows),
    };
  }

  /** The events from the second `event` of the trace. */
  const fromSecond = (events: TraceEvent[], name: string) =>
    events.slice(
      events.findIndex(
        ({ event }, index) =>
          event === name &&
          events.slice(0, index).some((earlier) => earlier.event === name)
      )
    );

  const targetsOf = (events: TraceEvent[], name: string) =>
    events
      .filter(({ event }) => event === name)
      .map(({ target }) => target)
      .join();

  // Each playback of `before` is in `after`, but one: a playback with a new generation has its target.
  function expectOneTrackReplaced(
    before: Pick<TargetSample, 'playbacks'>,
    after: Pick<TargetSample, 'playbacks'>
  ) {
    const beforeIds = playbackIdsOf(before);
    const afterIds = playbackIdsOf(after);
    const ended = before.playbacks.filter(
      (playback) => !afterIds.includes(playbackIdOf(playback))
    );
    const started = after.playbacks.filter(
      (playback) => !beforeIds.includes(playbackIdOf(playback))
    );
    expect(afterIds.length).toBe(beforeIds.length);
    expect(ended.length).toBe(1);
    expect(started.length).toBe(1);
    expect(started[0].target).toBe(ended[0].target);
  }

  // The old track of `replaced` ends first. Each track on the view then ends one time, and the result comes last.
  function expectOneEndForEachTrack(
    events: TraceEvent[],
    replaced: string,
    kept: string[]
  ) {
    const hostEvents = events.filter(isHostEvent);
    const trackEnds = hostEvents
      .filter(({ event }) => event === 'TrackEnded')
      .map(({ target, finished }) => `${target}:${finished}`);
    expect(trackEnds[0]).toBe(`${replaced}:false`);
    expect(trackEnds.slice(1).sort().join()).toBe(
      [replaced, ...kept]
        .map((target) => `${target}:true`)
        .sort()
        .join()
    );
    expect(summarize(hostEvents.filter(({ event }) => event === 'Ended'))).toBe(
      'Ended:Interrupted:None > Ended:Finished:None'
    );
    expect(summarize(hostEvents.slice(-1))).toBe('Ended:Finished:None');
  }

  /**
   * Each read of a target of the first command, from the start of its track to
   * one display frame before `toMs`, has `count` playback keys. It gives the
   * reads.
   */
  function expectKeysOfFirstCommand(
    played: Played,
    count: number,
    toMs: number
  ) {
    const [first] = played.tracks;
    const reads = readsIn(
      played,
      first.target,
      first.played.from + PRESENTATION_STAY_MS,
      toMs - FRAME_MS
    );
    expect(reads.length > 0).toBe(true);
    for (const { playbacks } of reads) {
      expect(playbacks.length).toBe(count);
    }
    return reads;
  }

  /**
   * One track of `replaced` replaces its old track at the second commit, and
   * each other track stays.
   */
  function expectReplacement(played: Played, replaced: string, kept: string[]) {
    const second = fromSecond(played.events, 'LayoutStartPending');
    expect(targetsOf(second, 'TrackStarted')).toBe(replaced);
    const count = kept.length + 1;
    const newTrack = played.tracks[count];
    expect(newTrack.target).toBe(replaced);
    const before = expectKeysOfFirstCommand(
      played,
      count,
      second[0].monotonicTimeMs
    );
    const [after] = readsIn(
      played,
      replaced,
      newTrack.played.from + PRESENTATION_STAY_MS
    );
    expectOneTrackReplaced(before[before.length - 1], after);
    expectOneEndForEachTrack(second, replaced, kept);
  }

  test('a new X during a native size group replaces the X track and keeps the width track', async () => {
    const played = await playReplacement(
      'a new X during a native size group',
      SIZE_GROUP,
      { ...FIRST, left: 0 }
    );
    if (PLAYS_SIZE_CHANGE) {
      expectReplacement(played, 'PositionX', ['Width']);
    } else {
      expectFrameDrivenGroup(firstThirdOf(played, WIDTH_CHANGE), WIDTH_CHANGE);
    }
    await render(null);
  });

  test('a new width during a native size group replaces the width track and keeps the X track', async () => {
    const played = await playReplacement(
      'a new width during a native size group',
      SIZE_GROUP,
      { ...FIRST, width: 100 }
    );
    if (PLAYS_SIZE_CHANGE) {
      expectReplacement(played, 'Width', ['PositionX']);
    } else {
      expectFrameDrivenGroup(firstThirdOf(played, WIDTH_CHANGE), WIDTH_CHANGE);
    }
    await render(null);
  });

  test('a commit with the same end values during a native size group starts no track, and the frame driver takes the group on its timeline', async () => {
    const { firstThird, firstPending, before, rows, events, distances } =
      await replaceDuringSizeGroup(customPair, { top: 40 });
    if (firstThird) {
      expectFrameDrivenGroup(firstThird, WIDTH_CHANGE);
      expect(summarize(events.filter(isRouteEvent))).toBe('');
      expect(before.playbacks.length).toBe(0);
      expect(rows[0].playbacks.length).toBe(0);
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
      expectCallbacksOfTwin();
      await render(null);
      return;
    }
    expect(summarize(events)).toBe(
      'LayoutLeafCaptured:PositionX > LayoutLeafCaptured:Width > LayoutBuildFailed:UnsupportedContinuation > FrameUpdateMounted:PositionX > FrameUpdateMounted:Width > TrackEnded:PositionX:false > TrackEnded:Width:false > Ended:Cancelled:None > ClientEnded:Cancelled:None'
    );
    // Each captured value is the value of its track at the pull.
    const [capturedX, capturedWidth] = events;
    const progress =
      (capturedX.monotonicTimeMs - firstPending.monotonicTimeMs) /
      PAIR_DURATION;
    expect(
      Math.abs(capturedX.leafValue! - progress * FIRST.left) < TOLERANCE
    ).toBe(true);
    expect(
      Math.abs(
        capturedWidth.leafValue! -
          (START.width + progress * (FIRST.width - START.width))
      ) < TOLERANCE
    ).toBe(true);
    expect(before.playbacks.length).toBe(2);
    expect(rows[0].playbacks.length).toBe(0);
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  const NO_LAYOUT: PairLayouts = {
    nativeLayout: undefined,
    frameLayout: undefined,
  };

  test('a native size group plays to its end after the removal of the layout prop', async () => {
    const tag = await mountScene(<SizePair {...START} {...customPair} />);
    await render(<SizePair {...FIRST} {...customPair} />);
    const firstThird = await waitFirstThird(tag, WIDTH_CHANGE);
    await takeTraceOf(tag);
    await render(<SizePair {...FIRST} {...NO_LAYOUT} />);
    const rows = await sampleFramePairAt(
      (2 * PAIR_DURATION) / 3,
      [0.1, 0.4, 0.7]
    );
    const events = await takeTraceOf(tag);
    if (firstThird) {
      expectFrameDrivenGroup(firstThird, WIDTH_CHANGE);
      expect(summarize(events.filter(isRouteEvent))).toBe('');
    } else {
      expect(summarizeEnd(events)).toBe(
        'TrackEnded:PositionX:true > TrackEnded:Width:true > Ended:Finished:None'
      );
    }
    expect(
      rows
        .slice(0, -1)
        .map((row) => row.playbacks.length)
        .join()
    ).toBe(firstThird ? '0,0,0' : '2,2,2');
    expect(framePairDistances(rows).during < TOLERANCE).toBe(true);
    expect(framePairDistances(rows).atEnd <= LAID_OUT_TOLERANCE).toBe(true);
    expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  type GroupFrame = typeof FIRST & { height?: number };
  type StyleChange = {
    host?: SizePairProps['host'];
    /** The commit that changes the style gives this frame also. */
    frameAfter?: GroupFrame;
    sizeChange?: SizeChange;
  };

  // One commit changes the style after one third of the animation. The frame changes only with `frameAfter`.
  async function changeStyleDuringAnimation(
    layouts: PairLayouts,
    end: GroupFrame,
    styleBefore: ViewStyle | undefined,
    styleAfter: ViewStyle | undefined,
    { host, frameAfter, sizeChange = WIDTH_CHANGE }: StyleChange = {}
  ) {
    const pairOf = (frame: GroupFrame, style: ViewStyle | undefined) => (
      <SizePair {...frame} host={host} style={style} {...layouts} inRow />
    );
    const tag = await mountScene(pairOf(START, styleBefore));
    await render(pairOf(end, styleBefore));
    const firstThird = await waitFirstThird(tag, sizeChange);
    const startEvents = firstThird?.events ?? (await takeTraceOf(tag));
    const before = await sampleFramePair(PAIR_IN_ROW);
    await render(pairOf(frameAfter ?? end, styleAfter));
    await wait(4 * FRAME_MS);
    const commitEvents = await takeTraceOf(tag);
    // A new frame starts the animation again.
    const rows = await sampleFramePairAt(
      frameAfter ? PAIR_DURATION : (2 * PAIR_DURATION) / 3,
      [0.1, 0.4, 0.7],
      PAIR_IN_ROW
    );
    const endEvents = await takeTraceOf(tag);
    return {
      firstThird,
      startEvents,
      before,
      commitEvents,
      rows,
      endEvents,
      distances: framePairDistances(rows),
    };
  }

  const BORDER: ViewStyle = { borderWidth: 3, borderColor: 'black' };
  const stylesWithNoNativeSizeChange: [string, ViewStyle][] = [
    ['a border', BORDER],
    [
      'a transform origin',
      { transformOrigin: 'top left', transform: [{ rotate: '20deg' }] },
    ],
    [
      'a legacy shadow',
      {
        shadowColor: 'black',
        shadowOpacity: 0.8,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
      },
    ],
  ];
  const TRANSFER_OF_X_AND_WIDTH =
    'LayoutBuildFailed:UnsupportedTarget > FrameUpdateMounted:PositionX > FrameUpdateMounted:Width > TrackEnded:PositionX:false > TrackEnded:Width:false > Ended:Cancelled:None';
  /** One commit changes the style after one third of the animation. */
  const playStyleChange = (
    caseName: string,
    declaration: Declaration,
    end: Place,
    style: ViewStyle,
    options: Pick<ReferenceCase, 'box'> = {}
  ) =>
    playCase(caseName, {
      flow: 'layout',
      ...declaration,
      isFrameDriven: !PLAYS_SIZE_CHANGE && changesSize([START, end]),
      places: [START, end],
      totalMs: PAIR_DURATION,
      box: options.box,
      restyle: { atMs: CHANGE_MS, style },
    });

  const TALLER: GroupFrame = { left: 0, top: 40, width: 50, height: 110 };
  const heightPair = pairLayoutsOf((hasCallback) => ({
    originY: { duration: PAIR_DURATION, hasCallback },
    height: { duration: PAIR_DURATION },
  }));
  const HEIGHT_CHANGE: SizeChange = {
    target: 'Height',
    from: BOX_SIZE,
    to: TALLER.height!,
  };
  const groupsWithASizeTrack: [
    string,
    PairLayouts,
    GroupFrame,
    string,
    SizeChange,
  ][] = [
    ['size', customPair, FIRST, TRANSFER_OF_X_AND_WIDTH, WIDTH_CHANGE],
    [
      'height',
      heightPair,
      TALLER,
      'LayoutBuildFailed:UnsupportedTarget > FrameUpdateMounted:PositionY > FrameUpdateMounted:Height > TrackEnded:PositionY:false > TrackEnded:Height:false > Ended:Cancelled:None',
      HEIGHT_CHANGE,
    ],
  ];
  for (const [
    groupName,
    layouts,
    end,
    transfer,
    sizeChange,
  ] of groupsWithASizeTrack) {
    for (const [styleName, style] of stylesWithNoNativeSizeChange) {
      test(`${styleName} that comes during a native ${groupName} group gives the group to the frame driver`, async () => {
        const { firstThird, before, commitEvents, rows, endEvents, distances } =
          await changeStyleDuringAnimation(layouts, end, undefined, style, {
            sizeChange,
          });
        if (firstThird) {
          expectFrameDrivenGroup(firstThird, sizeChange);
          expect(before.playbacks.length).toBe(0);
          expect(summarize(commitEvents.filter(isRouteEvent))).toBe('');
        } else {
          expect(before.playbacks.length).toBe(2);
          expect(summarize(commitEvents.filter(isHostEvent))).toBe(transfer);
        }
        expect(rows[0].playbacks.length).toBe(0);
        expect(summarize(endEvents.filter(isHostEvent))).toBe('');
        expect(distances.during < TOLERANCE).toBe(true);
        expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
        if (firstThird) {
          expectCallbacksOfTwin();
        } else {
          expect([...callbacks].sort().join()).toBe(
            'frame:true,native:false,native:true'
          );
        }
        await render(null);
      });
    }
  }

  test('a border and a new width in one commit during a native size group give the group to the frame driver', async () => {
    const { firstThird, before, commitEvents, rows, endEvents, distances } =
      await changeStyleDuringAnimation(customPair, FIRST, undefined, BORDER, {
        frameAfter: { ...FIRST, width: 100 },
      });
    if (firstThird) {
      expectFrameDrivenGroup(firstThird, WIDTH_CHANGE);
      expect(before.playbacks.length).toBe(0);
      expect(summarize(commitEvents.filter(isRouteEvent))).toBe('');
    } else {
      expect(before.playbacks.length).toBe(2);
      expect(summarize(commitEvents.filter(isHostEvent))).toBe(
        TRANSFER_OF_X_AND_WIDTH
      );
    }
    expect(rows[0].playbacks.length).toBe(0);
    expect(summarize(endEvents.filter(isHostEvent))).toBe('');
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  const stylesWithANativeSizeChange: [string, ViewStyle][] = [
    ['a new background color', { backgroundColor: 'navy' }],
    ['a new opacity', { opacity: 0.5 }],
  ];
  /**
   * No event of the route after the start, each track ends with true, and each
   * read has the keys of the start.
   */
  function expectTracksKept(played: Played, ends: string) {
    const { events, tracks } = played;
    const afterStart = events.slice(
      events.findIndex(({ event }) => event === 'Admitted') + 1
    );
    expect(
      summarize(
        afterStart.filter(
          (event) => !isHostEvent(event) && !isClientReport(event)
        )
      )
    ).toBe('');
    expect(summarizeEnd(afterStart)).toBe(ends);
    const reads = expectKeysOfFirstCommand(
      played,
      tracks.length,
      middleOf(tracks[0].origin) + PAIR_DURATION
    );
    expect(new Set(reads.map((read) => playbackIdsOf(read).join())).size).toBe(
      1
    );
  }

  for (const [styleName, style] of stylesWithANativeSizeChange) {
    test(`${styleName} during a native size group keeps the native tracks`, async () => {
      const played = await playStyleChange(
        `${styleName} during a native size group`,
        SIZE_GROUP,
        FIRST,
        style
      );
      if (PLAYS_SIZE_CHANGE) {
        expectTracksKept(
          played,
          'TrackEnded:PositionX:true > TrackEnded:Width:true > Ended:Finished:None'
        );
      } else {
        expectFrameDrivenGroup(
          firstThirdOf(played, WIDTH_CHANGE),
          WIDTH_CHANGE
        );
      }
      await render(null);
    });
  }

  const hostsWithNoNativeSizeChange: [string, SizePairProps['host']][] = [
    ['a Text', 'Text'],
    ['an Image', 'Image'],
  ];
  const lateBorderOnPositionTracks: [string, SizePairProps['host']][] = [
    ['native position tracks with size leaves that do not change', undefined],
    ...hostsWithNoNativeSizeChange.map(
      ([hostName, host]): [string, SizePairProps['host']] => [
        `the native position tracks of ${hostName}`,
        host,
      ]
    ),
  ];
  for (const [caseName, host] of lateBorderOnPositionTracks) {
    test(`a border that comes during ${caseName} keeps the native tracks`, async () => {
      const played = await playStyleChange(
        `a border during ${caseName}`,
        LINEAR,
        MOVED,
        BORDER,
        { box: { host } }
      );
      expectTracksKept(
        played,
        'TrackEnded:Height:true > TrackEnded:PositionX:true > TrackEnded:PositionY:true > TrackEnded:Width:true > Ended:Finished:None'
      );
      await render(null);
    });
  }

  test('the removal of a border during a frame-driven size animation starts no native track', async () => {
    const { startEvents, commitEvents, rows, endEvents, distances } =
      await changeStyleDuringAnimation(customPair, FIRST, BORDER, undefined);
    expect(summarize(startEvents.filter(isRouteEvent))).toBe(
      'LayoutBuildFailed:UnsupportedTarget'
    );
    expect(summarize(commitEvents.filter(isRouteEvent))).toBe('');
    expect(summarize(endEvents.filter(isRouteEvent))).toBe('');
    expect(rows.map((row) => row.playbacks.length).join()).toBe('0,0,0,0');
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
    expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  type FrameKey = 'left' | 'top' | 'width' | 'height';
  type TrackLeaf = 'originX' | 'originY' | 'width' | 'height';
  const WRITE_START = { left: 0, top: 0, width: 50, height: 50 };
  const TRACK_END: Record<TrackLeaf, Partial<typeof WRITE_START>> = {
    originX: { left: 120 },
    originY: { top: 60 },
    width: { width: 150 },
    height: { height: 110 },
  };
  const WRITE_OFFSET: Record<FrameKey, number> = {
    left: 30,
    top: 30,
    width: 40,
    height: 40,
  };
  const WRITE_CHECKPOINTS = [0.05, 0.25, 0.5, 0.75, 0.95];
  const TRACK_SIZE_CHANGE: Partial<Record<TrackLeaf, SizeChange>> = {
    width: WIDTH_CHANGE,
    height: {
      target: 'Height',
      from: WRITE_START.height,
      to: TRACK_END.height.height!,
    },
  };

  // The layout prop goes away during the track. A later commit with no layout prop writes one frame value.
  // The boxes are in a row: in a column the layout gives them heights that differ by a float error.
  async function writeDuringTrack(trackLeaf: TrackLeaf, writeKey: FrameKey) {
    const layouts = pairLayoutsOf((hasCallback) => ({
      [trackLeaf]: { duration: PAIR_DURATION, hasCallback },
    }));
    const first = { ...WRITE_START, ...TRACK_END[trackLeaf] };
    const written = {
      ...first,
      [writeKey]: first[writeKey] + WRITE_OFFSET[writeKey],
    };
    const tag = await mountScene(
      <SizePair {...WRITE_START} {...layouts} inRow />
    );
    await render(<SizePair {...first} {...layouts} inRow />);
    const sizeChange = TRACK_SIZE_CHANGE[trackLeaf];
    let firstThird: (FirstThird & { sizeChange: SizeChange }) | undefined;
    if (sizeChange) {
      const taken = await waitFirstThird(tag, sizeChange);
      firstThird = taken && { ...taken, sizeChange };
    } else {
      await wait(PAIR_DURATION / 3);
    }
    await render(<SizePair {...first} {...NO_LAYOUT} inRow />);
    await wait(150);
    await takeTraceOf(tag);
    callbacks.length = 0;
    await render(<SizePair {...written} {...NO_LAYOUT} inRow />);
    const rows = await sampleFramePairAt(
      PAIR_DURATION,
      WRITE_CHECKPOINTS,
      PAIR_IN_ROW
    );
    const events = await takeTraceOf(tag);
    return {
      firstThird,
      rows,
      events,
      distances: framePairDistances(rows),
    };
  }

  // A write of the value of the track starts a native track. A write of a different value gives the track to the frame driver.
  const competingWrites: [TrackLeaf, FrameKey, string][] = [
    ['originX', 'left', 'PositionX'],
    ['originX', 'width', ''],
    ['width', 'left', ''],
    ['width', 'width', 'Width'],
    ['originY', 'top', 'PositionY'],
    ['originY', 'height', ''],
    ['height', 'top', ''],
    ['height', 'height', 'Height'],
  ];
  for (const [trackLeaf, writeKey, startedTrack] of competingWrites) {
    test(`a write of ${writeKey} with no layout prop during a native ${trackLeaf} track agrees with the frame driver`, async () => {
      const { firstThird, rows, events, distances } = await writeDuringTrack(
        trackLeaf,
        writeKey
      );
      if (firstThird) {
        expectFrameDrivenGroup(firstThird, firstThird.sizeChange);
        expect(summarize(events.filter(isRouteEvent))).toBe('');
      } else {
        expect(targetsOf(events, 'TrackStarted')).toBe(startedTrack);
        expect(
          events.some(
            ({ buildFailure }) => buildFailure === 'UnsupportedContinuation'
          )
        ).toBe(startedTrack === '');
      }
      const isNative = !firstThird && startedTrack !== '';
      expect(rows[0].playbacks.length).toBe(isNative ? 1 : 0);
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
      expect(distances.keysAtEnd).toBe(0);
      if (firstThird) {
        expectCallbacksOfTwin();
      } else {
        expect([...callbacks].sort().join()).toBe(
          'frame:false,frame:true,native:false,native:true'
        );
      }
      await render(null);
    });
  }

  for (const [hostName, host] of hostsWithNoNativeSizeChange) {
    test(`a write of width with no layout prop during the native tracks of ${hostName} gives the tracks to the frame driver`, async () => {
      const layouts = pairLayoutsOf((hasCallback) => ({
        originX: { duration: PAIR_DURATION, hasCallback },
        originY: { duration: PAIR_DURATION },
        width: { duration: PAIR_DURATION },
        height: { duration: PAIR_DURATION },
      }));
      const first = { ...WRITE_START, ...TRACK_END.originX, host };
      const tag = await mountScene(
        <SizePair {...WRITE_START} host={host} {...layouts} inRow />
      );
      await render(<SizePair {...first} {...layouts} inRow />);
      await wait(PAIR_DURATION / 3);
      await render(<SizePair {...first} {...NO_LAYOUT} inRow />);
      await wait(150);
      const before = await sampleFramePair(PAIR_IN_ROW);
      await takeTraceOf(tag);
      callbacks.length = 0;
      await render(
        <SizePair
          {...first}
          width={first.width + WRITE_OFFSET.width}
          {...NO_LAYOUT}
          inRow
        />
      );
      const rows = await sampleFramePairAt(
        PAIR_DURATION,
        WRITE_CHECKPOINTS,
        PAIR_IN_ROW
      );
      const events = await takeTraceOf(tag);
      const distances = framePairDistances(rows);
      expect(before.playbacks.length).toBe(4);
      expect(targetsOf(events, 'TrackStarted')).toBe('');
      expect(
        events.some(({ buildFailure }) => buildFailure === 'UnsupportedTarget')
      ).toBe(true);
      expect(rows[0].playbacks.length).toBe(0);
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd <= LAID_OUT_TOLERANCE).toBe(true);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    });
  }

  for (const startsFlat of [false, true]) {
    test(`a flattening change of the parent with a new width after the removal of the layout prop replaces the width track (${startsFlat ? 'the parent unflattens' : 'the parent flattens'})`, async () => {
      const scene = (
        box: Partial<SizePairProps>,
        isFlat: boolean,
        layouts: PairLayouts
      ) => (
        <View>
          <View style={isFlat ? undefined : styles.notFlat}>
            <SizePair {...box} {...layouts} inRow />
          </View>
        </View>
      );
      const tag = await mountScene(scene(START, startsFlat, customPair));
      await render(scene(FIRST, startsFlat, customPair));
      const firstThird = await waitFirstThird(tag, WIDTH_CHANGE);
      await render(scene(FIRST, startsFlat, NO_LAYOUT));
      await wait(150);
      const before = await sampleFramePair(PAIR_IN_ROW);
      await takeTraceOf(tag);
      callbacks.length = 0;
      await render(
        scene(
          { ...FIRST, width: FIRST.width + WRITE_OFFSET.width },
          !startsFlat,
          NO_LAYOUT
        )
      );
      const rows = await sampleFramePairAt(
        PAIR_DURATION,
        WRITE_CHECKPOINTS,
        PAIR_IN_ROW
      );
      const events = await takeTraceOf(tag);
      const distances = framePairDistances(rows);
      expect(getTestComponent(BOX_REF).getTag()).toBe(tag);
      if (firstThird) {
        expectFrameDrivenGroup(firstThird, WIDTH_CHANGE);
        expect(summarize(events.filter(isRouteEvent))).toBe('');
        expect(before.playbacks.length).toBe(0);
        expect(rows[0].playbacks.length).toBe(0);
      } else {
        expect(targetsOf(events, 'TrackStarted')).toBe('Width');
        expectOneTrackReplaced(before, rows[0]);
        expectOneEndForEachTrack(events, 'Width', ['PositionX']);
      }
      expect(distances.during).toBeWithinRange(0, TOLERANCE);
      expect(distances.atEnd).toBeWithinRange(0, 0.01);
      expect(distances.keysAtEnd).toBe(0);
      if (firstThird) {
        expectCallbacksOfTwin();
      } else {
        expect([...callbacks].sort().join()).toBe(
          'frame:false,frame:true,native:false,native:true'
        );
      }
      await render(null);
    });
  }

  test('a new X during a LinearTransition replaces the X track and keeps the other tracks', async () => {
    const played = await playReplacement(
      'a new X during a LinearTransition',
      LINEAR,
      { ...MOVED, left: 0 },
      MOVED
    );
    expectReplacement(played, 'PositionX', ['PositionY', 'Width', 'Height']);
    await render(null);
  });
});

const MODEL_DURATION = 1200;
const MODEL_TRACK_END = 0.5;
// Outside the values of the opacity track, from 1 to `MODEL_TRACK_END`.
const MODEL_WRITE = 0.2;
const DRAWN_OPACITY_TOLERANCE = 0.001;
// `AnimationTarget::Opacity`, `TrackEncoding.TARGET_OPACITY`.
const OPACITY_TARGET = 0;

type ModelSceneProps = {
  left: number;
  opacity: number;
  layout?: LayoutAnimationFunction;
  style?: ViewStyle;
};

function ModelScene({ left, opacity, layout, style }: ModelSceneProps) {
  return (
    <View style={styles.modelScene}>
      <SizeBox left={left} layout={layout} style={[style, { opacity }]} />
    </View>
  );
}

/**
 * The X leaf of a scene of the opacity model. Below API 29 a moving X keeps the
 * whole build on the frame driver, so the scenes there have no X leaf.
 */
const modelXOf = (originX: Leaf = {}) =>
  PLAYS_MOVING_GEOMETRY
    ? { originX: { duration: MODEL_DURATION, ...originX } }
    : {};

/**
 * The X leaf of `modelXOf` and an opacity leaf with the name `model`: the
 * opacity goes from 1 to `MODEL_TRACK_END`.
 */
const modelLayoutOf = (opacity: Leaf = {}, originX: Leaf = {}) =>
  layoutOf(
    {
      ...modelXOf(originX),
      opacity: {
        duration: MODEL_DURATION,
        initial: 1,
        to: MODEL_TRACK_END,
        ...opacity,
      },
    },
    { name: 'model' }
  );

const isModelOf =
  (value: number) =>
  ([model]: number[]) =>
    Math.abs(model - value) < 0.01;

const opacityPlaybacksOf = ({ playbacks }: Pick<TargetSample, 'playbacks'>) =>
  playbacks.filter(({ target }) => target === 'Opacity');

const waitFrom = (startMs: number, elapsedMs: number) =>
  wait(Math.max(0, startMs + elapsedMs - performance.now()));

const describeDraws = (draws: DrawnSample[]) =>
  draws.map(({ timeMs, values }) => `${values.join(' ')} at ${timeMs}`).join();

const isShowingOpacity =
  (opacity: number) =>
  ({ values: [drawn] }: DrawnSample) =>
    Math.abs(drawn - opacity) <= DRAWN_OPACITY_TOLERANCE;

/** The index from which each draw shows `opacity`. */
function shownFromOf(draws: DrawnSample[], opacity: number) {
  let index = draws.length;
  while (index > 0 && isShowingOpacity(opacity)(draws[index - 1])) {
    index--;
  }
  return index;
}

describe('native layout opacity model', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const commitModel = (
    opacity: number,
    layout: LayoutAnimationFunction,
    style?: ViewStyle
  ) =>
    render(
      <ModelScene
        left={END_LEFT}
        opacity={opacity}
        layout={layout}
        style={style}
      />
    );

  /**
   * Mounts the box, then moves it with the native tracks of `layout`. It gives
   * the time of the commit and the origin of the command on the sample clock.
   */
  async function startModelTracks(
    layout: LayoutAnimationFunction,
    style?: ViewStyle
  ) {
    const tag = await mountScene(
      <ModelScene left={START_LEFT} opacity={1} layout={layout} style={style} />
    );
    const clock = await narrowClockOffset(tag);
    await commitModel(MODEL_TRACK_END, layout, style);
    const startMs = performance.now();
    const events = (
      await takeTraceUntil((taken) =>
        taken.some((event) => event.tag === tag && event.event === 'Admitted')
      )
    ).filter((event) => event.tag === tag);
    const pending = events.find(({ event }) => event === 'LayoutStartPending');
    if (!pending) {
      throw new Error(
        `The layout animation has no native command: ${summarize(events)}`
      );
    }
    requireEvent(events, pending, 'Admitted');
    expect(
      events.some(
        ({ event, target }) => event === 'TrackStarted' && target === 'Opacity'
      )
    ).toBe(true);
    return { tag, startMs, origin: nativeOriginOf(events, pending, clock) };
  }

  movingGeometryTest(
    'a posted stop of a live view settles the opacity to its committed value',
    async () => {
      if (!isViewSamplerAvailable()) {
        return;
      }
      const first = modelLayoutOf(
        { duration: PAIR_DURATION },
        { duration: PAIR_DURATION }
      );
      const second = layoutOf(
        { originX: { duration: PAIR_DURATION } },
        { name: 'replacement' }
      );
      const { tag, startMs } = await startModelTracks(first);
      await waitFrom(startMs, PAIR_DURATION / 3);
      const before = await sample(tag, 'Opacity');
      expect(before.playbacks.some(({ target }) => target === 'Opacity')).toBe(
        true
      );
      await takeTraceOf(tag);
      await failNextViewLookup(tag);
      await render(
        <ModelScene
          left={START_LEFT}
          opacity={MODEL_TRACK_END}
          layout={second}
        />
      );
      const isRejection = ({ event, outcome }: TraceEvent) =>
        event === 'Ended' && outcome === 'Rejected';
      const events = (
        await takeTraceUntil((taken) =>
          taken.some((event) => event.tag === tag && isRejection(event))
        )
      ).filter((event) => event.tag === tag);
      const failure = await takeViewLookupFailure();
      await wait(6 * FRAME_MS);
      const settled = await sample(tag, 'Opacity');
      console.log(
        `RuntimeTestsPostedStop ${JSON.stringify({ events: summarize(events), failure, callbacks, before: before.presentation, settled })}`
      );
      expect(
        (failure ?? []).some(([, , , , target]) => target === OPACITY_TARGET)
      ).toBe(true);
      expect(
        summarize(events.filter(isRejection)).startsWith(
          'Ended:Rejected:TargetUnavailable'
        )
      ).toBe(true);
      expect(settled.playbacks.length).toBe(0);
      expect(isNear(settled.presentation[0], MODEL_TRACK_END)).toBe(true);
      expect(isNear(settled.model[0], MODEL_TRACK_END)).toBe(true);
      await render(null);
    }
  );

  test('a Fabric opacity write during a native opacity track, then the natural end: the written value from the first drawn frame after the end', async () => {
    if (!isViewSamplerAvailable()) {
      return;
    }
    const caseName = 'a Fabric opacity write, then the natural end';
    const layout = modelLayoutOf();
    const { tag, startMs, origin } = await startModelTracks(layout);
    let writtenAtMs = 0;
    const draws = await recordDrawnValues(tag, ['opacity'], async () => {
      await waitFrom(startMs, MODEL_DURATION / 3);
      writtenAtMs = await uptimeMs();
      await commitModel(MODEL_WRITE, layout);
      const { reads } = await waitForModel(
        tag,
        'Opacity',
        isModelOf(MODEL_WRITE)
      );
      expect(opacityPlaybacksOf(reads[reads.length - 1]).length).toBe(1);
      await waitFrom(startMs, MODEL_DURATION + 300);
    });
    expect(await waitForCallbacks(['model:true'])).toBe('');
    const afterWrite = draws.filter(({ timeMs }) => timeMs >= writtenAtMs);
    const shownFrom = shownFromOf(afterWrite, MODEL_WRITE);
    const playing = afterWrite.slice(0, shownFrom);
    const shown = afterWrite.slice(shownFrom);
    logDrawnValues(caseName, draws);
    console.log(
      `RuntimeTestsOpacityModel ${JSON.stringify({ caseName, origin, writtenAtMs, firstWrittenDrawMs: shown[0]?.timeMs })}`
    );
    expect(shown.length > 0).toBe(true);
    // A draw has its time in whole milliseconds.
    expect(shown[0].timeMs >= origin.from + MODEL_DURATION - 1).toBe(true);
    expect(shown[shown.length - 1].timeMs > origin.to + MODEL_DURATION).toBe(
      true
    );
    expect(
      describeDraws(
        playing.filter(
          ({ values: [opacity] }) =>
            opacity <= MODEL_TRACK_END || opacity > 1 + DRAWN_OPACITY_TOLERANCE
        )
      )
    ).toBe('');
    await render(null);
  });

  test('a Fabric opacity write of the value that a constant segment of the track shows', async () => {
    const constant = 0.75;
    const parts = { first: 400, constant: 600, last: 400 };
    const durationMs = parts.first + parts.constant + parts.last;
    const layout = modelLayoutOf(
      {
        duration: parts.last,
        via: [
          { to: constant, duration: parts.first },
          { to: constant, duration: parts.constant },
        ],
      },
      { duration: durationMs }
    );
    const { tag, startMs } = await startModelTracks(layout);
    await waitFrom(startMs, parts.first + parts.constant / 2);
    const inSegment = await sample(tag, 'Opacity');
    await commitModel(constant, layout);
    await waitForModel(tag, 'Opacity', isModelOf(constant));
    await waitFrom(startMs, parts.first + parts.constant + parts.last / 2);
    const inLastSegment = await sample(tag, 'Opacity');
    await waitFrom(startMs, durationMs + 300);
    expect(await waitForCallbacks(['model:true'])).toBe('');
    const end = await sample(tag, 'Opacity');
    expect(isNear(inSegment.presentation[0], constant)).toBe(true);
    expect(inLastSegment.presentation[0] < constant - 0.05).toBe(true);
    expect(end.playbacks.length).toBe(0);
    expect(isNear(end.presentation[0], constant)).toBe(true);
    expect(isNear(end.model[0], constant)).toBe(true);
    await render(null);
  });

  test('a backface-hidden view that a transform commit turns away during a native opacity track, a Fabric opacity write while it is turned away, and a commit that turns it back after the end', async () => {
    const layout = modelLayoutOf({}, { duration: 200 });
    const facing = (degrees: number): ViewStyle => ({
      backfaceVisibility: 'hidden',
      transform: [{ rotateY: `${degrees}deg` }],
    });
    const { tag, startMs } = await startModelTracks(layout, facing(0));
    await waitFrom(startMs, MODEL_DURATION / 4);
    await commitModel(MODEL_TRACK_END, layout, facing(180));
    await waitFrom(startMs, MODEL_DURATION / 2);
    await commitModel(MODEL_WRITE, layout, facing(180));
    await wait(4 * FRAME_MS);
    const turnedAway = await sample(tag, 'Opacity');
    await waitFrom(startMs, MODEL_DURATION + 300);
    expect(await waitForCallbacks(['model:true'])).toBe('');
    const afterEnd = await sample(tag, 'Opacity');
    await commitModel(MODEL_WRITE, layout, facing(0));
    await wait(4 * FRAME_MS);
    const turnedBack = await sample(tag, 'Opacity');
    console.log(
      `RuntimeTestsOpacityModel ${JSON.stringify({ caseName: 'a backface-hidden view turned away during the track', turnedAway, afterEnd, turnedBack })}`
    );
    expect(turnedBack.playbacks.length).toBe(0);
    expect(isNear(turnedBack.presentation[0], MODEL_WRITE)).toBe(true);
    expect(isNear(turnedBack.model[0], MODEL_WRITE)).toBe(true);
    await render(null);
  });

  test('a backface-hidden view that is turned away at the start of a native opacity track', async () => {
    const style: ViewStyle = {
      backfaceVisibility: 'hidden',
      transform: [{ rotateY: '180deg' }],
    };
    const layouts = pairLayoutsOf((hasCallback) => ({
      ...modelXOf({ hasCallback }),
      opacity: {
        duration: MODEL_DURATION,
        initial: 1,
        to: MODEL_TRACK_END,
        hasCallback: hasCallback && !PLAYS_MOVING_GEOMETRY,
      },
    }));
    const pairOf = (left: number, opacity: number) => (
      <PairOf
        BoxComponent={SizeBox}
        box={{ left, style: [style, { opacity }] }}
        {...layouts}
      />
    );
    const tag = await mountScene(pairOf(START_LEFT, 1));
    const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
    const samples: Record<string, unknown>[] = [];
    let missingCallbacks = '';
    const run = async () => {
      await render(pairOf(END_LEFT, MODEL_TRACK_END));
      const startMs = performance.now();
      for (const part of [0.25, 0.5, 0.75, 1.2]) {
        await waitFrom(startMs, part * MODEL_DURATION);
        const [native, frame] = await Promise.all([
          sample(tag, 'Opacity'),
          sample(frameTag, 'Opacity'),
        ]);
        samples.push({ part, native, frame });
      }
      missingCallbacks = await waitForCallbacks(2);
    };
    let draws: DrawnSample[] | undefined;
    if (isViewSamplerAvailable()) {
      draws = await recordDrawnValues([tag, frameTag], ['opacity'], run);
    } else {
      await run();
    }
    console.log(
      `RuntimeTestsBackfaceStart ${JSON.stringify({ events: summarize(await takeTraceOf(tag)), callbacks: [...callbacks].sort(), missingCallbacks, samples, draws })}`
    );
    await render(null);
  });

  test('a synchronous opacity write during a native opacity track, then the end', async () => {
    if (!NATIVE_ANIMATION_ROUTES.synchronousProps) {
      return;
    }
    const layout = modelLayoutOf();
    const scene = (left: number) => (
      <View style={styles.modelScene}>
        <WriterBox
          left={left}
          layout={layout}
          initialOpacity={MODEL_TRACK_END}
        />
      </View>
    );
    const tag = await mountScene(scene(START_LEFT));
    await render(scene(END_LEFT));
    const startMs = performance.now();
    await waitFrom(startMs, MODEL_DURATION / 3);
    expect(opacityPlaybacksOf(await sample(tag, 'Opacity')).length).toBe(1);
    opacities[BOX_REF].value = MODEL_WRITE;
    const { reads } = await waitForModel(
      tag,
      'Opacity',
      isModelOf(MODEL_WRITE)
    );
    expect(opacityPlaybacksOf(reads[reads.length - 1]).length).toBe(1);
    await waitFrom(startMs, MODEL_DURATION + 300);
    expect(await waitForCallbacks(['model:true'])).toBe('');
    const end = await sample(tag, 'Opacity');
    expect(end.playbacks.length).toBe(0);
    expect(isNear(end.presentation[0], MODEL_WRITE)).toBe(true);
    expect(isNear(end.model[0], MODEL_WRITE)).toBe(true);
    await render(null);
  });
});

const styles = StyleSheet.create({
  // A view with an opacity is not flattened.
  notFlat: {
    opacity: 0.9,
  },
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
  modelScene: {
    width: 300,
    height: 120,
  },
});
