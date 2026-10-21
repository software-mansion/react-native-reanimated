/*
 * Method: a test that reads an exit in flight has statement A of `native layout reference` for the reads
 * of the native box (`expectOnTimeline`: each read is on the declared timeline of its key at its own sample
 * time from the origin of its command; a read with no check is a `READ-UNCHECKED` row, and each target has
 * a `TIMELINE` row) and statement B for the frame records of the twin (`expectFramesOnTimeline`). The reads
 * go on to the time at which the view leaves. A callback set has a wait on the callbacks. Each other
 * statement is a state check or a trace check at a planned time.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, one common start
 * of the two boxes, how late an end report, a callback, or the removal of a view comes, the last read
 * before the removal, the count of checked reads. Pixels, a device, and 120 Hz are not tested.
 *
 * The test of a clip of the view plays a case of the player with its clip: it has statements A and B, and
 * statement M for the model of the native box while the frame driver has it.
 *
 * Not converted (the old pair comparison of the models while the frame driver has the two boxes): two tests
 * of `native layout exiting and the stop of its tracks` in which the platform removes the tracks of the
 * pair (a Modal that goes hidden, a clip with a track of a layout animation).
 */
import type { ComponentRef } from 'react';
import React, { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Dimensions, Modal, ScrollView, StyleSheet, View } from 'react-native';
import type {
  ComplexAnimationBuilder,
  EasingFunction,
  EasingFunctionFactory,
  ExitAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeOut,
  getStaticFeatureFlag,
  LinearTransition,
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomOut,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import type { DrawnSample, RecordedProperty } from '../viewSampler';
import {
  drawnPointOf,
  isViewSamplerAvailable,
  logDrawnValues,
  recordDrawnValues,
} from '../viewSampler';
import type {
  BuiltKey,
  PlannedRead,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  buildsOf,
  expectFrameRecords,
  expectModelOnFrames,
  expectNoKeyAfterTransfer,
  expectReference,
  expectTimelineRows,
  frameChecksOf,
  MATRIX_TOLERANCE,
  play,
  sampleTargets,
} from './nativeLayoutReferencePlay';
import type {
  AnimationSource,
  Band,
  Leaf,
  PlayedTrack,
  SizeBoxProps,
  TraceEvent,
  Track,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbackOf,
  callbacks,
  callbackTimeOf,
  callbackTimes,
  centerOf,
  ClippingScrollView,
  CURVED_EASINGS,
  describeLeaf,
  expectNativeReadRows,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutRoute,
  isHostEvent,
  isNoView,
  middleOf,
  narrowClockOffset,
  nativeOriginOf,
  playbackIdsOf,
  playedTracksOf,
  POSITION_TOLERANCE,
  readFrameRecords,
  readTrack,
  REMOVES_TRACKS_OUT_OF_WINDOW,
  resetCallbacks,
  resetFrameRecords,
  sample,
  frameDrivenOf,
  frameRecordedOf,
  recordedLinearOf,
  DEFAULT_EASING,
  endToleranceOf,
  SECOND_BOX_REF,
  SizeBox,
  styles,
  summarize,
  summarizeEnd,
  takeRows,
  takeTrace,
  takeTraceUntilSurfaceClosed,
  waitForCallbacks,
  geometryTrackOf,
  nativeCasesOf,
  testOfTracks,
  movingGeometryTest,
} from './nativeLayoutTestKit';

type AnimatedViewProps = React.ComponentProps<typeof Animated.View>;
type BoxAnimations = Pick<AnimatedViewProps, 'entering' | 'layout' | 'exiting'>;
type Timing = { durationMs?: number; delayMs?: number };
type Pair = { native: BoxAnimations; frame: BoxAnimations };
type Declared = Pick<ReferenceCase, 'leaves' | 'operations'>;

type ExitingCase = {
  pairOf: (timing?: Timing) => Pair;
  tracks: Track[];
  /** What the animation declares for a timing. */
  declaredOf: (leaf: Leaf) => Declared;
  easing?: Leaf['easing'];
};

const CLOCK_REF = 'NativeLayoutExitingClock';
const EXIT_DURATION = 2000;
const BOX_LEFT = 20;
const MOVED_LEFT = 120;
const WINDOW_WIDTH = Dimensions.get('window').width;
const CUSTOM_OPACITY = 0.2;
const CUSTOM_OFFSET = 80;
const VALUE_TOLERANCE = 0.01;
const NO_VIEW_POLL_MS = 4;

const OPACITY: Track = {
  sampleTarget: 'Opacity',
  traceTarget: 'Opacity',
  from: 1,
  to: 0,
};
const SLIDE: Track = {
  sampleTarget: 'Position',
  traceTarget: 'PositionX',
  from: centerOf(BOX_LEFT),
  to: centerOf(BOX_LEFT) + WINDOW_WIDTH,
};
const SCALE: Track = {
  sampleTarget: 'Transform',
  traceTarget: 'Transform',
  from: 1,
  to: 0,
};

const timed = (
  builder: ComplexAnimationBuilder,
  { durationMs = EXIT_DURATION, delayMs }: Timing
) =>
  delayMs === undefined
    ? builder.duration(durationMs)
    : builder.duration(durationMs).delay(delayMs);

/**
 * The pair of one animation of a flow: the twin is frame-driven, and each
 * animation has a frame record under the name of its box.
 */
const recordedPairOf = (
  flow: keyof BoxAnimations,
  native: AnimationSource,
  frame: AnimationSource
): Pair => ({
  native: { [flow]: frameRecordedOf('native', native) },
  frame: { [flow]: frameRecordedOf('frame', frameDrivenOf(frame)) },
});

/**
 * The two boxes have a linear easing, or the default easing when
 * `hasDefaultEasing` is set.
 */
const presetPairOf =
  (create: () => ComplexAnimationBuilder, hasDefaultEasing = false) =>
  (timing: Timing = {}): Pair => {
    const exitingOf = (name: string) => {
      const exiting = timed(create(), timing).withCallback(callbackOf(name));
      return hasDefaultEasing ? exiting : exiting.easing(Easing.linear);
    };
    return recordedPairOf('exiting', exitingOf('native'), exitingOf('frame'));
  };

const customExitingOf = (
  name: string,
  easing: EasingFunction,
  { durationMs = EXIT_DURATION, delayMs }: Timing
) => {
  const callback = callbackOf(name);
  return (values: ExitAnimationsValues) => {
    'worklet';
    const animate = (toValue: number) => {
      'worklet';
      const timing = withTiming(toValue, { duration: durationMs, easing });
      return delayMs === undefined ? timing : withDelay(delayMs, timing);
    };
    return {
      initialValues: { opacity: 1, originX: values.currentOriginX },
      animations: {
        opacity: animate(CUSTOM_OPACITY),
        originX: animate(values.currentOriginX + CUSTOM_OFFSET),
      },
      callback,
    };
  };
};

const UNEQUAL_OPACITY: Track = { ...OPACITY, to: CUSTOM_OPACITY };
const UNEQUAL_SLIDE: Track = {
  ...SLIDE,
  to: centerOf(BOX_LEFT) + CUSTOM_OFFSET,
};

type LeafDurations = { opacityMs: number; originXMs: number };

/** The leaves of `customExitingOf`, each with its own duration. */
const unequalExitingOf = (
  name: string,
  easing: EasingFunction,
  { opacityMs, originXMs }: LeafDurations
) => {
  const callback = callbackOf(name);
  return (values: ExitAnimationsValues) => {
    'worklet';
    return {
      initialValues: { opacity: 1, originX: values.currentOriginX },
      animations: {
        opacity: withTiming(CUSTOM_OPACITY, { duration: opacityMs, easing }),
        originX: withTiming(values.currentOriginX + CUSTOM_OFFSET, {
          duration: originXMs,
          easing,
        }),
      },
      callback,
    };
  };
};

const unequalDeclaredOf = (
  easing: EasingFunction,
  { opacityMs, originXMs }: LeafDurations
): Declared => ({
  leaves: {
    opacity: { initial: 1, to: CUSTOM_OPACITY, duration: opacityMs, easing },
    originX: { to: CUSTOM_OFFSET, duration: originXMs, easing },
  },
});

const HELD_SCALE = 0.5;
const UNEQUAL_SCALE: Track = { ...SCALE, to: HELD_SCALE };

type OperationDurations = { scaleMs: number; translateXMs: number };

/**
 * A `transform` leaf whose operations have two durations. The translation does
 * not change the first cell of the matrix, which is the scale.
 */
const unequalTransformExitingOf = (
  name: string,
  easing: EasingFunction,
  { scaleMs, translateXMs }: OperationDurations
) => {
  const callback = callbackOf(name);
  return () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateX: 0 }, { scale: 1 }] },
      animations: {
        transform: [
          {
            translateX: withTiming(CUSTOM_OFFSET, {
              duration: translateXMs,
              easing,
            }),
          },
          { scale: withTiming(HELD_SCALE, { duration: scaleMs, easing }) },
        ],
      },
      callback,
    };
  };
};

const unequalTransformDeclaredOf = ({
  scaleMs,
  translateXMs,
}: OperationDurations): Declared => ({
  leaves: {},
  operations: [
    ['translateX', 0, CUSTOM_OFFSET, { duration: translateXMs }],
    ['scale', 1, HELD_SCALE, { duration: scaleMs }],
  ],
});

const unequalTransformPairOfDurations = (durations: OperationDurations) =>
  recordedPairOf(
    'exiting',
    unequalTransformExitingOf('native', Easing.linear, durations),
    unequalTransformExitingOf('frame', Easing.linear, durations)
  );

/** The scale ends with the exit, and the translation at half of its time. */
const unequalTransformPairOf = ({
  durationMs = EXIT_DURATION,
}: Timing = {}): Pair =>
  unequalTransformPairOfDurations({
    scaleMs: durationMs,
    translateXMs: durationMs / 2,
  });

const customPairOf = (timing: Timing = {}): Pair =>
  recordedPairOf(
    'exiting',
    customExitingOf('native', Easing.linear, timing),
    customExitingOf('frame', Easing.linear, timing)
  );

const fadePairOf = presetPairOf(() => new FadeOut());

const easedFadePairOf = (
  easing: EasingFunction | EasingFunctionFactory
): Pair => {
  const exitingOf = (name: string) =>
    new FadeOut()
      .duration(EXIT_DURATION)
      .easing(easing)
      .withCallback(callbackOf(name));
  return recordedPairOf('exiting', exitingOf('native'), exitingOf('frame'));
};

const zoomPairOf = presetPairOf(() => new ZoomOut());

const FADE: ExitingCase = {
  pairOf: fadePairOf,
  tracks: [OPACITY],
  declaredOf: (leaf) => ({
    leaves: { opacity: { ...leaf, initial: 1, to: 0 } },
  }),
};
const SLIDE_OUT_RIGHT: ExitingCase = {
  pairOf: presetPairOf(() => new SlideOutRight()),
  tracks: [SLIDE],
  declaredOf: (leaf) => ({
    leaves: { originX: { ...leaf, to: WINDOW_WIDTH } },
  }),
};
const ZOOM: ExitingCase = {
  pairOf: zoomPairOf,
  tracks: [SCALE],
  declaredOf: (leaf) => ({ leaves: {}, operations: [['scale', 1, 0, leaf]] }),
};

const CASES: Record<string, ExitingCase> = {
  FadeOut: FADE,
  SlideOutRight: SLIDE_OUT_RIGHT,
  ZoomOut: ZOOM,
  'a custom function': {
    pairOf: customPairOf,
    tracks: [
      { ...OPACITY, to: CUSTOM_OPACITY },
      { ...SLIDE, to: centerOf(BOX_LEFT) + CUSTOM_OFFSET },
    ],
    declaredOf: (leaf) => ({
      leaves: {
        opacity: { ...leaf, initial: 1, to: CUSTOM_OPACITY },
        originX: { ...leaf, to: CUSTOM_OFFSET },
      },
    }),
  },
};

/** The cases whose native box has the tracks of the default easing. */
const DEFAULT_EASING_CASES: Record<string, ExitingCase> = {
  'FadeOut with the default easing': {
    ...FADE,
    pairOf: presetPairOf(() => new FadeOut(), true),
    tracks: [{ ...OPACITY, easing: DEFAULT_EASING }],
    easing: 'default',
  },
  'SlideOutRight with the default easing': {
    ...SLIDE_OUT_RIGHT,
    pairOf: presetPairOf(() => new SlideOutRight(), true),
    tracks: [{ ...SLIDE, easing: DEFAULT_EASING }],
    easing: 'default',
  },
  'ZoomOut with the default easing': {
    ...ZOOM,
    pairOf: presetPairOf(() => new ZoomOut(), true),
    tracks: [{ ...SCALE, easing: DEFAULT_EASING }],
    easing: 'default',
  },
};

const TIMELINE_CASES = { ...CASES, ...DEFAULT_EASING_CASES };

/** The keys that the builder of an exit of a box at `left` makes. */
const builtOf = (declared: Declared, left = BOX_LEFT) =>
  buildsOf({
    flow: 'exiting',
    ...declared,
    places: [{ left, top: 0 }, undefined],
    totalMs: 0,
  }).flat();

const builtKeysOf = (
  { declaredOf, easing: easingOfCase }: ExitingCase,
  timing: Timing & Pick<Leaf, 'easing'> = {}
) => {
  const { durationMs = EXIT_DURATION, delayMs, easing = easingOfCase } = timing;
  return builtOf(declaredOf({ duration: durationMs, delay: delayMs, easing }));
};

const targetsOf = (builtKeys: BuiltKey[]) => [
  ...new Set(builtKeys.map(({ declared }) => declared.target)),
];

type BoxProps = BoxAnimations & {
  refName: string;
  left?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

function ExitingBox({
  refName,
  left = BOX_LEFT,
  style,
  children,
  ...animations
}: BoxProps) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[styles.box, { marginLeft: left }, style]}>
      {children}
    </Animated.View>
  );
}

type PairProps = Pair & {
  isMounted?: boolean;
  left?: number;
  style?: StyleProp<ViewStyle>;
  /** The key of the two boxes. A new key mounts new views. */
  boxKey?: string;
};

function ExitingPair({
  native,
  frame,
  isMounted = true,
  boxKey = 'box',
  ...box
}: PairProps) {
  const clockRef = useTestRef(CLOCK_REF);
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      <View style={styles.pairCell}>
        {isMounted && (
          <ExitingBox key={boxKey} {...box} {...native} refName={BOX_REF} />
        )}
      </View>
      <View style={styles.pairCell}>
        {isMounted && (
          <ExitingBox
            key={boxKey}
            {...box}
            {...frame}
            refName={FRAME_BOX_REF}
          />
        )}
      </View>
    </View>
  );
}

type Scene = Parameters<typeof render>[0];
type PairEvents = { native: TraceEvent[]; frame: TraceEvent[] };

type Exited = {
  nativeTag: number;
  frameTag: number;
  /** The time of the sample clock minus the time of the animation clock. */
  clock: Band;
  startMs: number;
  /** The trace of the two boxes before the commit that removes them. */
  earlier: PairEvents;
};

const pairTags = () => ({
  nativeTag: getTestComponent(BOX_REF).getTag(),
  frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
});

/** The first render of the scene of a test, with no frame record. */
async function mount(scene: Scene, settleMs = 300) {
  resetFrameRecords();
  await render(scene);
  await wait(settleMs);
}

/** Renders `removed` on the mounted scene and gives the views that exit. */
async function exitTo(removed: Scene): Promise<Exited> {
  const clock = await narrowClockOffset(getTestComponent(CLOCK_REF).getTag());
  const tags = pairTags();
  const earlier = await takeTraceOfPair(tags);
  resetCallbacks();
  const startMs = performance.now();
  await render(removed);
  return { ...tags, clock, startMs, earlier };
}

/** Mounts `mounted`, then renders `removed` and gives the views that exit. */
async function exitOf(mounted: Scene, removed: Scene, settleMs = 300) {
  await mount(mounted, settleMs);
  return exitTo(removed);
}

const exit = (pair: PairProps) =>
  exitOf(
    <ExitingPair {...pair} />,
    <ExitingPair {...pair} isMounted={false} />
  );

const waitUntil = ({ startMs }: { startMs: number }, elapsedMs: number) =>
  wait(Math.max(0, startMs + elapsedMs - performance.now()));

/** No reading when the view left. */
const readIfMounted = (tag: number, track: Track) =>
  readTrack(tag, track).catch(() => undefined);

type ExitedTags = Pick<Exited, 'nativeTag' | 'frameTag'>;

async function readPair({ nativeTag, frameTag }: ExitedTags, track: Track) {
  const [native, frame] = await Promise.all([
    readTrack(nativeTag, track),
    readTrack(frameTag, track),
  ]);
  return { native, frame };
}

const hasView = async (tag: number) =>
  (await readIfMounted(tag, OPACITY)) !== undefined;

/** Waits until the view left. It gives false at its timeout. */
async function leaves(tag: number, timeoutMs = 1000) {
  const untilMs = performance.now() + timeoutMs;
  while (await hasView(tag)) {
    if (performance.now() > untilMs) {
      return false;
    }
    await wait(NO_VIEW_POLL_MS);
  }
  return true;
}

async function takeTraceOfPair({
  nativeTag,
  frameTag,
}: ExitedTags): Promise<PairEvents> {
  const events = await takeTrace();
  const eventsOf = (tag: number) =>
    events.filter(
      (event) => event.tag === tag && event.event !== 'FrameUpdateMounted'
    );
  return { native: eventsOf(nativeTag), frame: eventsOf(frameTag) };
}

/**
 * The reads of a view for `targets`, to a time from the exit or to the time at
 * which the view leaves.
 */
async function readsUntil(
  tag: number,
  targets: string[],
  { startMs }: Pick<Exited, 'startMs'>,
  elapsedMs: number
): Promise<PlannedRead[]> {
  const rows = await takeRows(
    () => sampleTargets(tag, targets),
    (row) => row[targets[0]],
    startMs + elapsedMs
  );
  return rows.map(({ row, opensCycle }) => ({ samples: row, opensCycle }));
}

/** The reads of a view to the time at which it leaves. */
const readsUntilRemoved = (
  tag: number,
  targets: string[],
  exited: Pick<Exited, 'startMs'>,
  totalMs: number
) => readsUntil(tag, targets, exited, totalMs + 1000);

const pendingStartOf = (events: TraceEvent[], type = 'Exiting') =>
  events.find(
    ({ event, layoutAnimationType }) =>
      event === 'LayoutStartPending' && layoutAnimationType === type
  )!;

/** The tracks of the native command of `type` in the trace of one view. */
const tracksOf = (
  events: TraceEvent[],
  { clock }: Pick<Exited, 'clock'>,
  builtKeys: BuiltKey[],
  type?: string
) =>
  playedTracksOf(
    events,
    pendingStartOf(events, type),
    clock,
    builtKeys.map(({ declared }) => declared)
  );

/**
 * Statement A of `native layout reference` for reads of one view: each read in
 * the checked time of a track is on the declared timeline at its own sample
 * time.
 */
function expectOnTimeline(
  name: string,
  tracks: PlayedTrack[],
  reads: PlannedRead[]
) {
  const checked = expectNativeReadRows(
    reads.map(({ samples }) => samples),
    tracks,
    MATRIX_TOLERANCE
  ).flat();
  expectTimelineRows(name, tracks, reads, checked);
}

/**
 * Statement B of `native layout reference` for the frame driver on `boxes`:
 * build n of a leaf of a box is declaration n of the leaf in `builtKeys`, and
 * each declaration has a record with frames.
 */
function expectFramesOnTimeline(boxes: string[], builtKeys: BuiltKey[]) {
  const records = readFrameRecords().filter(({ box }) => boxes.includes(box));
  const declaredLeaves = boxes.flatMap((box) =>
    builtKeys.map(({ declared }) => `${box} ${describeLeaf(declared)}`)
  );
  const recordedLeaves = records
    .filter(({ frames }) => frames.length > 0)
    .map((record) => `${record.box} ${describeLeaf(record)}`)
    .filter((leaf) => declaredLeaves.includes(leaf));
  const describeLeaves = (leaves: string[]) => leaves.sort().join();
  expect(describeLeaves(recordedLeaves)).toBe(describeLeaves(declaredLeaves));
  const frameChecks = frameChecksOf(builtKeys, records, true);
  expect(
    describeLeaves(
      frameChecks.map(
        ({ record, declared }) => `${record.box} ${describeLeaf(declared)}`
      )
    )
  ).toBe(describeLeaves(declaredLeaves));
  expectFrameRecords({ frameChecks, tracks: [] });
}

/**
 * Each read of a target in the time of its track, to one display frame before
 * its declared end, has `count` platform keys on the view.
 */
function expectKeysWhilePlaying(
  reads: PlannedRead[],
  tracks: PlayedTrack[],
  totalMs: number,
  hasCount: (count: number) => boolean
) {
  const offCount = reads.flatMap(({ samples }) =>
    tracks.flatMap(({ target, origin, played }) => {
      const { monotonicTimeMs, playbacks } = samples[target];
      return monotonicTimeMs >= played.from &&
        monotonicTimeMs < middleOf(origin) + totalMs - FRAME_MS &&
        !hasCount(playbacks.length)
        ? [
            `${playbacks.length} keys of ${target} at ${monotonicTimeMs - middleOf(origin)} ms`,
          ]
        : [];
    })
  );
  expect(offCount.join()).toBe('');
}

const startOf = (tracks: Track[]) =>
  [
    'LayoutStartPending',
    'LayoutStartMounted',
    'Received',
    ...tracks.map(({ traceTarget }) => `TrackStarted:${traceTarget}`),
    'Admitted',
  ].join(' > ');

/**
 * The host events of an exit that played to its end and then left with its
 * view.
 */
const playedAndRemoved = (tracks: Track[]) =>
  [
    ...tracks.map(({ traceTarget }) => `TrackEnded:${traceTarget}:true`),
    'Ended:Cancelled:None',
  ].join(' > ');

// The default easing moves by no more than two times its mean speed.
const rangeOf = ({ from, to, easing }: Track) =>
  Math.abs(to - from) * (easing ? 2 : 1);

/** The change of the value of a track in two display frames. */
const twoFramesOf = (track: Track, durationMs = EXIT_DURATION) =>
  VALUE_TOLERANCE + (2 * FRAME_MS * rangeOf(track)) / durationMs;

/** The part of the duration at which the track has the value. */
const progressOf = ({ from, to, easing }: Track, value: number) => {
  const progress = (value - from) / (to - from);
  return easing ? easing.timeOf(progress) : progress;
};

const isNear = (value: number, expected: number, tolerance = VALUE_TOLERANCE) =>
  Math.abs(value - expected) < tolerance;

type TargetReads = Pick<PlannedRead, 'samples'>[];

/**
 * Reads a view for `targets` with no wait between two reads, until the view
 * leaves or until `stop`.
 */
function readWhileMounted(tag: number, targets: string[]) {
  let isStopped = false;
  const reads: TargetReads = [];
  const taken = (async () => {
    try {
      while (!isStopped) {
        reads.push({ samples: await sampleTargets(tag, targets) });
      }
    } catch (error) {
      if (!isNoView(error)) {
        throw error;
      }
    }
    return reads;
  })();
  return {
    stop() {
      isStopped = true;
      return taken;
    },
  };
}

/**
 * Each read of a target from the end report of its track to the time at which
 * the view leaves shows the end value of the track. The existence gate: each
 * target has such a read.
 */
function expectEndHeld(
  name: string,
  tracks: Track[],
  playedTracks: PlayedTrack[],
  reads: TargetReads
) {
  const heldOf = tracks.map((track) => {
    const { traceTarget } = track;
    const endedMs = Math.max(
      ...playedTracks
        .filter(({ target }) => target === traceTarget)
        .map(({ played }) => played.to)
    );
    const held = reads
      .map(({ samples }) => samples[traceTarget])
      .filter(({ monotonicTimeMs }) => monotonicTimeMs >= endedMs);
    const off = held
      .filter(
        ({ presentation }) =>
          !isNear(
            progressOf(track, presentation[0]),
            1,
            heldProgressToleranceOf(track)
          )
      )
      .map(
        ({ presentation, monotonicTimeMs }) =>
          `${presentation[0]} at ${monotonicTimeMs - endedMs} ms after the end report`
      );
    return { track, held, off };
  });
  const row = `HELD-END | ${name} | ${heldOf
    .map(
      ({ track, held, off }) =>
        `${track.traceTarget}: ${held.length} reads from the end report to the removal, ${off.length} off the end value ${track.to}`
    )
    .join(' | ')}`;
  console.log(row);
  for (const { held, off } of heldOf) {
    expect(held.length > 0 ? '' : row).toBe('');
    expect(off.join()).toBe('');
  }
}

/**
 * The reads whose model of a track is not the start value of the track, at most
 * `MODEL_FAULTS` of them.
 */
function modelFaultsOf(reads: TargetReads, tracks: Track[]) {
  return reads
    .flatMap(({ samples }) =>
      tracks
        .filter(
          (track) =>
            !isNear(
              samples[track.traceTarget].model[0],
              track.from,
              endToleranceOf(track)
            )
        )
        .map(
          ({ traceTarget, from }) =>
            `${traceTarget} model ${samples[traceTarget].model[0]} at ${samples[traceTarget].monotonicTimeMs} ms, not ${from}`
        )
    )
    .slice(0, MODEL_FAULTS);
}

const MODEL_FAULTS = 3;

/**
 * A held end value is at the progress 1 of its track to 0.001, and a position
 * also to `endToleranceOf`: Android lays out the end on the pixel grid
 * (measured: 125.14285659790039 for 125).
 */
const heldProgressToleranceOf = (track: Track) =>
  Math.max(
    0.001,
    track.sampleTarget === 'Position'
      ? endToleranceOf(track) / Math.abs(track.to - track.from)
      : 0
  );

const sortedCallbacks = () => callbacks.slice().sort().join();

const EXIT_CALLBACKS = ['native:true', 'frame:true'];

describe('native layout exiting', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, exitingCase] of nativeCasesOf(TIMELINE_CASES)) {
    const { pairOf, tracks } = exitingCase;
    test(`${caseName} plays natively from its initial value, agrees with the frame driver, and holds its end value until the view leaves`, async () => {
      const builtKeys = builtKeysOf(exitingCase);
      const targets = targetsOf(builtKeys);
      const exited = await exit(pairOf());
      const untilRemoved = readWhileMounted(exited.nativeTag, targets);
      const reads = await readsUntil(exited.nativeTag, targets, exited, 100);
      const started = await takeTraceOfPair(exited);
      const hostEvents = started.native.filter(isHostEvent);
      expect(summarize(hostEvents)).toBe(startOf(tracks));
      expect(hostEvents[0].layoutAnimationType).toBe('Exiting');
      expect(
        hostEvents
          .filter(({ event }) => event === 'TrackStarted')
          .every(({ endpointPolicy }) => endpointPolicy === 'HoldWithoutCommit')
      ).toBe(true);
      expect(summarize(started.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );
      expect(started.frame[0].layoutAnimationType).toBe('Exiting');

      reads.push(
        ...(await readsUntil(
          exited.nativeTag,
          targets,
          exited,
          0.75 * EXIT_DURATION
        ))
      );
      expect(callbacks.length).toBe(0);
      reads.push(
        ...(await readsUntilRemoved(
          exited.nativeTag,
          targets,
          exited,
          EXIT_DURATION
        ))
      );
      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.nativeTag)).toBe(false);
      const readsToRemoval = await untilRemoved.stop();
      expect(await leaves(exited.frameTag)).toBe(true);
      const ended = await takeTraceOfPair(exited);
      expect(summarizeEnd(ended.native)).toBe(playedAndRemoved(tracks));

      const playedTracks = tracksOf(
        [...started.native, ...ended.native],
        exited,
        builtKeys
      );
      expectOnTimeline(caseName, playedTracks, reads);
      expectEndHeld(caseName, tracks, playedTracks, readsToRemoval);
      expectKeysWhilePlaying(
        reads,
        playedTracks,
        EXIT_DURATION,
        (count) => count >= tracks.length
      );
      expect(modelFaultsOf(reads, tracks).join('; ')).toBe('');
      expectFramesOnTimeline(['frame'], builtKeys);
      await render(null);
    });

    test(`${caseName} holds its initial value through a delay of 500 ms, then plays`, async () => {
      const timing = { durationMs: 600, delayMs: 500 };
      const totalMs = timing.delayMs + timing.durationMs;
      const builtKeys = builtKeysOf(exitingCase, timing);
      const targets = targetsOf(builtKeys);
      const exited = await exit(pairOf(timing));
      const reads = await readsUntil(
        exited.nativeTag,
        targets,
        exited,
        timing.delayMs + timing.durationMs / 2
      );
      expect(callbacks.length).toBe(0);
      reads.push(
        ...(await readsUntilRemoved(exited.nativeTag, targets, exited, totalMs))
      );
      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.nativeTag)).toBe(false);

      const events = await takeTraceOfPair(exited);
      const playedTracks = tracksOf(events.native, exited, builtKeys);
      expectOnTimeline(`${caseName} after a delay`, playedTracks, reads);
      expectKeysWhilePlaying(
        reads,
        playedTracks,
        totalMs,
        (count) => count >= tracks.length
      );
      expectFramesOnTimeline(['frame'], builtKeys);
      await render(null);
    });
  }

  const unequalTracks: [string, EasingFunction][] = [
    ['one segment', Easing.linear],
    ['the two segments of the default easing', DEFAULT_EASING.curve],
  ];
  for (const [trackName, easing] of unequalTracks) {
    movingGeometryTest(
      `an exit whose leaves have unequal durations and tracks of ${trackName} gets its callback at the end of the last leaf, and no track stays`,
      async () => {
        const durations = { opacityMs: 400, originXMs: 1200 };
        const builtKeys = builtOf(unequalDeclaredOf(easing, durations));
        const targets = targetsOf(builtKeys);
        const exited = await exit(
          recordedPairOf(
            'exiting',
            unequalExitingOf('native', easing, durations),
            unequalExitingOf('frame', easing, durations)
          )
        );
        const reads = await readsUntil(exited.nativeTag, targets, exited, 800);
        const started = await takeTraceOfPair(exited);
        expect(summarize(started.native.filter(isHostEvent))).toBe(
          `${startOf([UNEQUAL_OPACITY, UNEQUAL_SLIDE])} > TrackEnded:Opacity:true`
        );
        const opacity = await readPair(exited, UNEQUAL_OPACITY);
        expect(isNear(opacity.native.shown, CUSTOM_OPACITY)).toBe(true);
        expect(isNear(opacity.frame.model, CUSTOM_OPACITY)).toBe(true);
        expect(callbacks.length).toBe(0);

        reads.push(
          ...(await readsUntilRemoved(
            exited.nativeTag,
            targets,
            exited,
            durations.originXMs
          ))
        );
        expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
        expect(sortedCallbacks()).toBe('frame:true,native:true');
        expect(
          Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
        ).toBe(true);
        expect(
          callbackTimes.native - exited.startMs > durations.originXMs - FRAME_MS
        ).toBe(true);
        expect(await hasView(exited.nativeTag)).toBe(false);
        expect(await leaves(exited.frameTag)).toBe(true);
        const ended = await takeTraceOfPair(exited);
        expect(summarizeEnd(ended.native)).toBe(
          'TrackEnded:PositionX:true > Ended:Cancelled:None'
        );

        expectOnTimeline(
          `an exit with unequal leaves of ${trackName}`,
          tracksOf([...started.native, ...ended.native], exited, builtKeys),
          reads
        );
        expectFramesOnTimeline(['frame'], builtKeys);
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'an exit whose operations have unequal durations is one track: the shorter operation holds its end value until the view leaves, and the callback comes at the end of the longer operation',
    async () => {
      const durations = { scaleMs: 400, translateXMs: 1200 };
      const HELD_FROM_MS = 600;
      const builtKeys = builtOf(unequalTransformDeclaredOf(durations));
      const targets = targetsOf(builtKeys);
      const exited = await exit(unequalTransformPairOfDurations(durations));
      const reads = await readsUntil(exited.nativeTag, targets, exited, 1050);
      const started = await takeTraceOfPair(exited);
      expect(summarize(started.native.filter(isHostEvent))).toBe(
        startOf([UNEQUAL_SCALE])
      );
      expect(callbacks.length).toBe(0);

      reads.push(
        ...(await readsUntilRemoved(
          exited.nativeTag,
          targets,
          exited,
          durations.translateXMs
        ))
      );
      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
      ).toBe(true);
      expect(
        callbackTimes.native - exited.startMs >
          durations.translateXMs - FRAME_MS
      ).toBe(true);
      expect(await leaves(exited.frameTag)).toBe(true);
      const ended = await takeTraceOfPair(exited);
      expect(summarizeEnd(ended.native)).toBe(
        playedAndRemoved([UNEQUAL_SCALE])
      );

      const playedTracks = tracksOf(
        [...started.native, ...ended.native],
        exited,
        builtKeys
      );
      expectOnTimeline('an exit with unequal operations', playedTracks, reads);
      expectKeysWhilePlaying(
        reads,
        playedTracks,
        durations.translateXMs,
        (count) => count === 1
      );
      const originMs = middleOf(playedTracks[0].origin);
      for (const { samples } of reads) {
        const { monotonicTimeMs, presentation } = samples.Transform;
        if (monotonicTimeMs - originMs >= HELD_FROM_MS) {
          expect(isNear(presentation[0], HELD_SCALE, 0.0001)).toBe(true);
        }
      }
      expectFramesOnTimeline(['frame'], builtKeys);
      await render(null);
    }
  );

  for (const [easingName, easing] of Object.entries(CURVED_EASINGS)) {
    test(`FadeOut with ${easingName} plays natively on the curve of the frame driver`, async () => {
      const builtKeys = builtKeysOf(FADE, { easing });
      const targets = targetsOf(builtKeys);
      const exited = await exit(easedFadePairOf(easing));
      const reads = await readsUntil(exited.nativeTag, targets, exited, 100);
      const started = await takeTraceOfPair(exited);
      expect(summarize(started.native.filter(isHostEvent))).toBe(
        startOf([OPACITY])
      );
      expect(summarize(started.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );

      reads.push(
        ...(await readsUntilRemoved(
          exited.nativeTag,
          targets,
          exited,
          EXIT_DURATION
        ))
      );
      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.nativeTag)).toBe(false);
      const ended = await takeTraceOfPair(exited);
      expectOnTimeline(
        `FadeOut with ${easingName}`,
        tracksOf([...started.native, ...ended.native], exited, builtKeys),
        reads
      );
      expectFramesOnTimeline(['frame'], builtKeys);
      await render(null);
    });
  }

  for (const delayMs of [undefined, 400]) {
    test(`no duration ${delayMs === undefined ? 'and no delay' : 'with a delay'} stays frame-driven: UnsupportedTrackForm`, async () => {
      const exited = await exit(customPairOf({ durationMs: 0, delayMs }));
      await waitUntil(exited, (delayMs ?? 100) / 2);
      const events = await takeTraceOfPair(exited);
      expect(summarize(events.native)).toBe(
        'LayoutBuildFailed:UnsupportedTrackForm'
      );
      expect(events.native[0].layoutAnimationType).toBe('Exiting');
      if (delayMs !== undefined) {
        const held = await readTrack(exited.nativeTag, OPACITY);
        expect(held.keys).toBe(0);
        expect(isNear(held.model, 1)).toBe(true);
      }

      await waitUntil(exited, (delayMs ?? 0) + 300);
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  test('reduced motion on the builder starts no native command', async () => {
    const reducedMotion = (name: string) => ({
      exiting: new FadeOut()
        .duration(EXIT_DURATION)
        .easing(Easing.linear)
        .reduceMotion(ReduceMotion.Always)
        .withCallback(callbackOf(name)),
    });
    const exited = await exit({
      native: reducedMotion('native'),
      frame: reducedMotion('frame'),
    });
    await wait(200);
    const events = await takeTraceOfPair(exited);
    expect(summarize(events.native)).toBe(
      'LayoutBuildFailed:UnsupportedTiming'
    );
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  for (const [caseName, exitingCase] of Object.entries({
    FadeOut: CASES.FadeOut,
    ZoomOut: CASES.ZoomOut,
  })) {
    const { pairOf } = exitingCase;
    const mountTest = testOfTracks(exitingCase.tracks.map(geometryTrackOf));
    mountTest(
      `a view that mounts after a native ${caseName} shows its own props and has no track`,
      async () => {
        const timing = { durationMs: 400 };
        const pair = pairOf(timing);
        const exited = await exit(pair);
        await waitUntil(exited, 0.8 * timing.durationMs);
        expect(await leaves(exited.nativeTag)).toBe(true);

        await render(<ExitingPair {...pair} boxKey="next" />);
        const mounted = pairTags();
        expect(mounted.nativeTag !== exited.nativeTag).toBe(true);
        for (const waitMs of [0, 100]) {
          await wait(waitMs);
          for (const track of [OPACITY, SCALE]) {
            const reading = await readTrack(mounted.nativeTag, track);
            expect(isNear(reading.shown, 1)).toBe(true);
            expect(isNear(reading.model, 1)).toBe(true);
            expect(reading.keys).toBe(0);
          }
        }
        await render(null);
        await wait(timing.durationMs + 300);
      }
    );
  }

  test('the same key that mounts again at 15 % does not stop the exit of the old view', async () => {
    const durationMs = 1000;
    const pair = fadePairOf({ durationMs });
    const builtKeys = builtKeysOf(FADE, { durationMs });
    const targets = targetsOf(builtKeys);
    const exited = await exit(pair);
    const reads = await readsUntil(
      exited.nativeTag,
      targets,
      exited,
      0.15 * durationMs
    );
    const started = await takeTraceOfPair(exited);
    await render(<ExitingPair {...pair} />);
    const mounted = pairTags();
    expect(mounted.nativeTag !== exited.nativeTag).toBe(true);
    await wait(100);
    const next = await readTrack(mounted.nativeTag, OPACITY);
    expect(isNear(next.shown, 1)).toBe(true);
    expect(next.keys).toBe(0);

    reads.push(
      ...(await readsUntil(exited.nativeTag, targets, exited, 0.5 * durationMs))
    );
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    reads.push(
      ...(await readsUntilRemoved(
        exited.nativeTag,
        targets,
        exited,
        durationMs
      ))
    );
    expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(mounted.nativeTag)).toBe(true);
    const ended = await takeTraceOfPair(exited);
    expectOnTimeline(
      'the same key that mounts again at 15 %',
      tracksOf([...started.native, ...ended.native], exited, builtKeys),
      reads
    );
    expectFramesOnTimeline(['frame'], builtKeys);
    await render(null);
    await wait(durationMs + 300);
  });
});

/** The parent of each box of the pair is a view that React flattens or not. */
function PairInParents({
  isFlat,
  isMounted = true,
  native,
  frame,
}: Pair & { isFlat: boolean; isMounted?: boolean }) {
  const clockRef = useTestRef(CLOCK_REF);
  const cellOf = (animations: BoxAnimations, refName: string) => (
    <View style={styles.pairCell}>
      <View style={isFlat ? undefined : localStyles.unflattened}>
        {isMounted && <ExitingBox {...animations} refName={refName} />}
      </View>
    </View>
  );
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      {cellOf(native, BOX_REF)}
      {cellOf(frame, FRAME_BOX_REF)}
    </View>
  );
}

const STYLE_WRITE_FROM = 0.9;

/** An animated style writes the opacity of the box from its mount. */
function StyledBox({ refName, ...animations }: BoxProps) {
  const ref = useTestRef(refName);
  const opacity = useSharedValue(STYLE_WRITE_FROM);
  useEffect(() => {
    opacity.value = withTiming(0.3, {
      duration: 2 * EXIT_DURATION,
      easing: Easing.linear,
    });
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[styles.box, animatedStyle]}
    />
  );
}

function StyledPair({
  native,
  frame,
  isMounted = true,
}: Pair & { isMounted?: boolean }) {
  const clockRef = useTestRef(CLOCK_REF);
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      <View style={styles.pairCell}>
        {isMounted && <StyledBox {...native} refName={BOX_REF} />}
      </View>
      <View style={styles.pairCell}>
        {isMounted && <StyledBox {...frame} refName={FRAME_BOX_REF} />}
      </View>
    </View>
  );
}

const MOVE: Track = {
  sampleTarget: 'Position',
  traceTarget: 'PositionX',
  from: centerOf(BOX_LEFT),
  to: centerOf(MOVED_LEFT),
};

const layoutPairOf = (durationMs: number, hasDefaultEasing = false): Pair => {
  const transitionOf = (name: string) => {
    const transition = new LinearTransition()
      .duration(durationMs)
      .withCallback(callbackOf(name));
    return hasDefaultEasing ? transition : transition.easing(Easing.linear);
  };
  return recordedPairOf(
    'layout',
    transitionOf('nativeLayout'),
    transitionOf('frameLayout')
  );
};

/** The key of the X of a linear layout animation of the pair to `MOVED_LEFT`. */
const moveBuiltOf = (durationMs: number) =>
  buildsOf({
    flow: 'layout',
    leaves: { originX: { duration: durationMs } },
    places: [
      { left: BOX_LEFT, top: 0 },
      { left: MOVED_LEFT, top: 0 },
    ],
    totalMs: durationMs,
  }).flat();

const merged = (first: Pair, second: Pair): Pair => ({
  native: { ...first.native, ...second.native },
  frame: { ...first.frame, ...second.frame },
});

describe('native layout exiting and the other animations of the view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const LAYOUT_DURATION = 1000;
  const SHORT_EXIT = 1000;
  const layoutPair = () => layoutPairOf(LAYOUT_DURATION);

  movingGeometryTest(
    'an exit at 40 % of a native layout animation starts the opacity at 1, and the position track continues',
    async () => {
      const pair = merged(layoutPair(), fadePairOf({ durationMs: SHORT_EXIT }));
      const exitKeys = builtKeysOf(FADE, { durationMs: SHORT_EXIT });
      const moveKeys = moveBuiltOf(LAYOUT_DURATION);
      const targets = targetsOf([...exitKeys, ...moveKeys]);
      await mount(<ExitingPair {...pair} />);
      await render(<ExitingPair {...pair} left={MOVED_LEFT} />);
      await wait(0.4 * LAYOUT_DURATION);
      const exited = await exitTo(
        <ExitingPair {...pair} left={MOVED_LEFT} isMounted={false} />
      );
      const reads = await readsUntil(exited.nativeTag, targets, exited, 100);
      const started = await takeTraceOfPair(exited);
      const hostEvents = started.native.filter(isHostEvent);
      expect(summarize(hostEvents)).toBe(startOf([OPACITY]));
      expect(hostEvents[0].layoutAnimationType).toBe('Exiting');
      expect(sortedCallbacks()).toBe('frameLayout:false,nativeLayout:false');

      reads.push(...(await readsUntil(exited.nativeTag, targets, exited, 800)));
      const position = await readPair(exited, MOVE);
      expect(isNear(position.native.shown, MOVE.to, endToleranceOf(MOVE))).toBe(
        true
      );
      expect(isNear(position.frame.model, MOVE.to, endToleranceOf(MOVE))).toBe(
        true
      );
      expect(callbacks.length).toBe(2);

      reads.push(
        ...(await readsUntilRemoved(
          exited.nativeTag,
          targets,
          exited,
          SHORT_EXIT
        ))
      );
      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(sortedCallbacks()).toBe(
        'frame:true,frameLayout:false,native:true,nativeLayout:false'
      );
      const ended = await takeTraceOfPair(exited);
      const events = [
        ...exited.earlier.native,
        ...started.native,
        ...ended.native,
      ];
      expectOnTimeline(
        'an exit at 40 % of a native layout animation',
        [
          ...tracksOf(events, exited, moveKeys, 'Layout'),
          ...tracksOf(events, exited, exitKeys),
        ],
        reads
      );
      for (const { samples } of reads) {
        expect(
          isNear(samples.PositionX.model[0], MOVE.to, endToleranceOf(MOVE))
        ).toBe(true);
      }
      expectFramesOnTimeline(['frame'], [...moveKeys, ...exitKeys]);
      await render(null);
    }
  );

  const joinedTracks: [string, boolean, ExitingCase['pairOf'], Track][] = [
    ['one segment', false, fadePairOf, OPACITY],
    [
      'the two segments of the default easing',
      true,
      DEFAULT_EASING_CASES['FadeOut with the default easing'].pairOf,
      OPACITY,
    ],
    [
      'a transform whose operations have two timelines',
      false,
      unequalTransformPairOf,
      UNEQUAL_SCALE,
    ],
  ];
  for (const [
    trackName,
    hasDefaultEasing,
    exitPairOf,
    exitTrack,
  ] of joinedTracks) {
    movingGeometryTest(
      `an exit that is shorter than the native layout track of ${trackName} that it joins holds its end value, and the callback comes at the end of that track`,
      async () => {
        const layoutDuration = 2000;
        const exitDuration = 500;
        const layoutLeftMs = 0.6 * layoutDuration;
        const pair = merged(
          layoutPairOf(layoutDuration, hasDefaultEasing),
          exitPairOf({ durationMs: exitDuration })
        );
        await render(<ExitingPair {...pair} />);
        await wait(300);
        await render(<ExitingPair {...pair} left={MOVED_LEFT} />);
        await wait(layoutDuration - layoutLeftMs);
        const exited = await exitOf(
          <ExitingPair {...pair} left={MOVED_LEFT} />,
          <ExitingPair {...pair} left={MOVED_LEFT} isMounted={false} />,
          0
        );
        await waitUntil(exited, exitDuration + 200);
        expect(sortedCallbacks()).toBe('frameLayout:false,nativeLayout:false');
        const { native, frame } = await readPair(exited, exitTrack);
        expect(
          isNear(native.shown, exitTrack.to, endToleranceOf(exitTrack))
        ).toBe(true);
        expect(
          isNear(frame.model, exitTrack.to, endToleranceOf(exitTrack))
        ).toBe(true);

        await waitUntil(exited, layoutLeftMs + 300);
        expect(sortedCallbacks()).toBe(
          'frame:true,frameLayout:false,native:true,nativeLayout:false'
        );
        expect(
          Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
        ).toBe(true);
        expect(
          callbackTimes.native - exited.startMs > layoutLeftMs - 6 * FRAME_MS
        ).toBe(true);
        expect(await hasView(exited.nativeTag)).toBe(false);
        expect(await hasView(exited.frameTag)).toBe(false);
        await render(null);
      }
    );
  }

  for (const startsFlat of [false, true]) {
    test(`a parent that ${startsFlat ? 'unflattens' : 'flattens'} during a native exit of its child changes nothing on the exit`, async () => {
      const pair = fadePairOf();
      const builtKeys = builtKeysOf(FADE);
      const targets = targetsOf(builtKeys);
      const exited = await exitOf(
        <PairInParents {...pair} isFlat={startsFlat} />,
        <PairInParents {...pair} isFlat={startsFlat} isMounted={false} />
      );
      const reads = await readsUntil(
        exited.nativeTag,
        targets,
        exited,
        0.3 * EXIT_DURATION
      );
      const started = await takeTraceOfPair(exited);
      await render(
        <PairInParents {...pair} isFlat={!startsFlat} isMounted={false} />
      );
      reads.push(
        ...(await readsUntil(
          exited.nativeTag,
          targets,
          exited,
          0.6 * EXIT_DURATION
        ))
      );
      expect((await takeTraceOfPair(exited)).native.length).toBe(0);
      expect(callbacks.length).toBe(0);

      reads.push(
        ...(await readsUntilRemoved(
          exited.nativeTag,
          targets,
          exited,
          EXIT_DURATION
        ))
      );
      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await leaves(exited.frameTag)).toBe(true);
      const ended = await takeTraceOfPair(exited);
      const playedTracks = tracksOf(
        [...started.native, ...ended.native],
        exited,
        builtKeys
      );
      expectOnTimeline(
        `a parent that ${startsFlat ? 'unflattens' : 'flattens'}`,
        playedTracks,
        reads
      );
      expectKeysWhilePlaying(
        reads,
        playedTracks,
        EXIT_DURATION,
        (count) => count === 1
      );
      expectFramesOnTimeline(['frame'], builtKeys);
      await render(null);
    });
  }

  test('an animated style that writes the opacity does not show during a native exit', async () => {
    const pair = fadePairOf();
    // The exit starts at 1, and the style had another opacity on the view.
    const builtKeys = builtKeysOf(FADE).map(
      (built): BuiltKey => ({
        ...built,
        declared: { ...built.declared, startsOnScreen: false },
      })
    );
    const targets = targetsOf(builtKeys);
    const exited = await exitOf(
      <StyledPair {...pair} />,
      <StyledPair {...pair} isMounted={false} />,
      100
    );
    const reads = await readsUntil(
      exited.nativeTag,
      targets,
      exited,
      0.75 * EXIT_DURATION
    );
    expect(callbacks.length).toBe(0);

    reads.push(
      ...(await readsUntilRemoved(
        exited.nativeTag,
        targets,
        exited,
        EXIT_DURATION
      ))
    );
    expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
    const events = await takeTraceOfPair(exited);
    const playedTracks = tracksOf(events.native, exited, builtKeys);
    expectOnTimeline(
      'an animated style that writes the opacity',
      playedTracks,
      reads
    );
    expectKeysWhilePlaying(
      reads,
      playedTracks,
      EXIT_DURATION,
      (count) => count === 1
    );
    for (const { samples } of reads) {
      const [model] = samples.Opacity.model;
      expect(model < STYLE_WRITE_FROM && model > 0.8).toBe(true);
    }
    expectFramesOnTimeline(['frame'], builtKeys);
    await render(null);
  });

  test('a later frame change of the siblings starts nothing on an exiting view', async () => {
    const pair = merged(layoutPair(), fadePairOf());
    const builtKeys = builtKeysOf(FADE);
    const targets = targetsOf(builtKeys);
    const scene = (hasSibling: boolean, isMounted: boolean) => (
      <View>
        {hasSibling && <View style={localStyles.sibling} collapsable={false} />}
        <ExitingPair {...pair} isMounted={isMounted} />
      </View>
    );
    const exited = await exitOf(scene(true, true), scene(true, false));
    const reads = await readsUntil(
      exited.nativeTag,
      targets,
      exited,
      0.15 * EXIT_DURATION
    );
    const before = await readPair(exited, MOVE);
    const started = await takeTraceOfPair(exited);

    await render(scene(false, false));
    reads.push(
      ...(await readsUntil(
        exited.nativeTag,
        targets,
        exited,
        0.5 * EXIT_DURATION
      ))
    );
    const events = await takeTraceOfPair(exited);
    expect(events.native.length).toBe(0);
    expect(events.frame.length).toBe(0);
    expect(callbacks.length).toBe(0);
    const after = await readPair(exited, MOVE);
    expect(after.native.shown).toBe(before.native.shown);
    expect(after.frame.model).toBe(before.frame.model);

    reads.push(
      ...(await readsUntilRemoved(
        exited.nativeTag,
        targets,
        exited,
        EXIT_DURATION
      ))
    );
    expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    const ended = await takeTraceOfPair(exited);
    expectOnTimeline(
      'a later frame change of the siblings',
      tracksOf([...started.native, ...ended.native], exited, builtKeys),
      reads
    );
    expectFramesOnTimeline(['frame'], builtKeys);
    await render(null);
  });
});

const PARENT_REF = 'NativeLayoutExitingParent';
const FRAME_PARENT_REF = 'NativeLayoutExitingFrameParent';

type FamilyExits = { parent?: BoxAnimations; child: BoxAnimations };

type FamilyProps = {
  native: FamilyExits;
  frame: FamilyExits;
  hasParents?: boolean;
  hasChildren?: boolean;
};

function Family({
  native,
  frame,
  hasParents = true,
  hasChildren = true,
}: FamilyProps) {
  const clockRef = useTestRef(CLOCK_REF);
  const familyOf = (
    { parent, child }: FamilyExits,
    parentRef: string,
    childRef: string
  ) => (
    <View style={styles.pairCell}>
      {hasParents && (
        <ExitingBox
          {...parent}
          refName={parentRef}
          left={0}
          style={localStyles.parent}>
          {hasChildren && <ExitingBox {...child} refName={childRef} />}
        </ExitingBox>
      )}
    </View>
  );
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      {familyOf(native, PARENT_REF, BOX_REF)}
      {familyOf(frame, FRAME_PARENT_REF, FRAME_BOX_REF)}
    </View>
  );
}

/** A linear exit with a frame record under `name`, the name of its callback. */
const familyExitingOf = (
  create: () => ComplexAnimationBuilder,
  durationMs: number,
  name: string,
  isNative: boolean
) => {
  const exiting = create()
    .duration(durationMs)
    .easing(Easing.linear)
    .withCallback(callbackOf(name));
  return frameRecordedOf(name, isNative ? exiting : frameDrivenOf(exiting));
};

const familiesOf = (
  parent: [() => ComplexAnimationBuilder, number] | undefined,
  child: [() => ComplexAnimationBuilder, number]
) => {
  const exitsOf = (route: 'native' | 'frame'): FamilyExits => ({
    parent: parent && {
      exiting: familyExitingOf(...parent, `${route}Parent`, route === 'native'),
    },
    child: {
      exiting: familyExitingOf(...child, `${route}Child`, route === 'native'),
    },
  });
  return { native: exitsOf('native'), frame: exitsOf('frame') };
};

const parentTags = () => ({
  nativeTag: getTestComponent(PARENT_REF).getTag(),
  frameTag: getTestComponent(FRAME_PARENT_REF).getTag(),
});

describe('native layout exiting of a parent and its child', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'the end of the exit of a parent ends the longer exit of its child with false, and both leave together',
    async () => {
      const families = familiesOf(
        [() => new FadeOut(), 1000],
        [() => new ZoomOut(), 1500]
      );
      const childKeys = builtKeysOf(ZOOM, { durationMs: 1500 });
      const parentKeys = builtKeysOf(FADE, { durationMs: 1000 });
      await mount(<Family {...families} />);
      const parents = parentTags();
      const exited = await exitTo(<Family {...families} hasParents={false} />);
      const reads: Record<'child' | 'parent', PlannedRead[]> = {
        child: [],
        parent: [],
      };
      const readUntil = async (elapsedMs: number) => {
        const [child, parent] = await Promise.all([
          readsUntil(exited.nativeTag, targetsOf(childKeys), exited, elapsedMs),
          readsUntil(
            parents.nativeTag,
            targetsOf(parentKeys),
            exited,
            elapsedMs
          ),
        ]);
        reads.child.push(...child);
        reads.parent.push(...parent);
      };
      await readUntil(500);
      expect(callbacks.length).toBe(0);

      await readUntil(2000);
      expect(
        await waitForCallbacks([
          'frameChild:false',
          'frameParent:true',
          'nativeChild:false',
          'nativeParent:true',
        ])
      ).toBe('');
      expect(sortedCallbacks()).toBe(
        'frameChild:false,frameParent:true,nativeChild:false,nativeParent:true'
      );
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(parents.nativeTag)).toBe(false);
      expect(await leaves(parents.frameTag)).toBe(true);
      const events = await takeTrace();
      const eventsOf = (ofTag: number) =>
        events.filter(({ tag }) => tag === ofTag);
      expectOnTimeline(
        'the end of the exit of a parent, the child',
        tracksOf(eventsOf(exited.nativeTag), exited, childKeys),
        reads.child
      );
      expectOnTimeline(
        'the end of the exit of a parent, the parent',
        tracksOf(eventsOf(parents.nativeTag), exited, parentKeys),
        reads.parent
      );
      expectFramesOnTimeline(['frameChild'], childKeys);
      expectFramesOnTimeline(['frameParent'], parentKeys);

      await waitUntil(exited, 1800);
      expect(callbacks.length).toBe(4);
      await render(null);
    }
  );

  movingGeometryTest(
    'a child with the shorter exit leaves first, and its parent plays to its end',
    async () => {
      const families = familiesOf(
        [() => new SlideOutRight(), 1500],
        [() => new FadeOut(), 500]
      );
      await render(<Family {...families} />);
      await wait(300);
      const parents = parentTags();
      const exited = await exitOf(
        <Family {...families} />,
        <Family {...families} hasParents={false} />,
        0
      );
      await waitUntil(exited, 800);
      expect(sortedCallbacks()).toBe('frameChild:true,nativeChild:true');
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(exited.frameTag)).toBe(false);
      expect(await hasView(parents.nativeTag)).toBe(true);
      expect(await hasView(parents.frameTag)).toBe(true);

      await waitUntil(exited, 1800);
      expect(sortedCallbacks()).toBe(
        'frameChild:true,frameParent:true,nativeChild:true,nativeParent:true'
      );
      expect(await hasView(parents.nativeTag)).toBe(false);
      expect(await hasView(parents.frameTag)).toBe(false);
      await render(null);
    }
  );

  movingGeometryTest(
    'a parent and its child whose exits end in one frame get the callbacks of the frame driver, and both leave',
    async () => {
      const families = familiesOf(
        [() => new FadeOut(), 600],
        [() => new ZoomOut(), 600]
      );
      await render(<Family {...families} />);
      await wait(300);
      const parents = parentTags();
      const exited = await exitOf(
        <Family {...families} />,
        <Family {...families} hasParents={false} />,
        0
      );
      await waitUntil(exited, 1000);
      const resultOf = (name: string) =>
        callbacks.find((callback) => callback.startsWith(`${name}:`));
      expect(callbacks.length).toBe(4);
      expect(resultOf('nativeParent')).toBe('nativeParent:true');
      expect(resultOf('frameParent')).toBe('frameParent:true');
      expect(resultOf('nativeChild')?.split(':')[1]).toBe(
        resultOf('frameChild')?.split(':')[1]
      );
      for (const tag of [
        exited.nativeTag,
        exited.frameTag,
        parents.nativeTag,
        parents.frameTag,
      ]) {
        expect(await hasView(tag)).toBe(false);
      }
      await wait(500);
      expect(callbacks.length).toBe(4);
      await render(null);
    }
  );

  type HeldAndPlaying = {
    trackName: string;
    easing: EasingFunction;
    childOf: (
      name: string,
      easing: EasingFunction
    ) =>
      | ReturnType<typeof unequalExitingOf>
      | ReturnType<typeof unequalTransformExitingOf>;
    /** The host events to the end of the held leaf or operation. */
    startAndHold: string;
    held: Track;
    removal: string;
  };
  const leavesOf = (name: string, childEasing: EasingFunction) =>
    unequalExitingOf(name, childEasing, { opacityMs: 300, originXMs: 2000 });
  const HELD_LEAF = {
    childOf: leavesOf,
    startAndHold: `${startOf([UNEQUAL_OPACITY, UNEQUAL_SLIDE])} > TrackEnded:Opacity:true`,
    held: UNEQUAL_OPACITY,
    removal: 'TrackEnded:PositionX:false > Ended:Cancelled:None',
  };
  const heldAndPlaying: HeldAndPlaying[] = [
    { trackName: 'one segment', easing: Easing.linear, ...HELD_LEAF },
    {
      trackName: 'the two segments of the default easing',
      easing: DEFAULT_EASING.curve,
      ...HELD_LEAF,
    },
    {
      trackName: 'one transform whose first operation holds',
      easing: Easing.linear,
      childOf: (name, childEasing) =>
        unequalTransformExitingOf(name, childEasing, {
          scaleMs: 300,
          translateXMs: 2000,
        }),
      startAndHold: startOf([UNEQUAL_SCALE]),
      held: UNEQUAL_SCALE,
      removal: 'TrackEnded:Transform:false > Ended:Cancelled:None',
    },
  ];
  for (const each of heldAndPlaying) {
    const { trackName, easing, childOf } = each;
    movingGeometryTest(
      `the end of the exit of a parent removes a child whose exit holds one leaf and plays one leaf, with tracks of ${trackName}: false one time`,
      async () => {
        const families = {
          native: {
            ...familiesOf([() => new FadeOut(), 1000], [() => new ZoomOut(), 1])
              .native,
            child: { exiting: childOf('nativeChild', easing) },
          },
          frame: {
            ...familiesOf([() => new FadeOut(), 1000], [() => new ZoomOut(), 1])
              .frame,
            child: { exiting: frameDrivenOf(childOf('frameChild', easing)) },
          },
        };
        await render(<Family {...families} />);
        await wait(300);
        const parents = parentTags();
        const exited = await exitOf(
          <Family {...families} />,
          <Family {...families} hasParents={false} />,
          0
        );
        await waitUntil(exited, 600);
        const events = await takeTraceOfPair(exited);
        expect(summarize(events.native.filter(isHostEvent))).toBe(
          each.startAndHold
        );
        const held = await readTrack(exited.nativeTag, each.held);
        expect(isNear(held.shown, each.held.to)).toBe(true);
        expect(callbacks.length).toBe(0);

        await waitUntil(exited, 1300);
        expect(sortedCallbacks()).toBe(
          'frameChild:false,frameParent:true,nativeChild:false,nativeParent:true'
        );
        expect(await hasView(exited.nativeTag)).toBe(false);
        expect(await hasView(parents.nativeTag)).toBe(false);
        expect(summarizeEnd((await takeTraceOfPair(exited)).native)).toBe(
          each.removal
        );

        await waitUntil(exited, 2400);
        expect(callbacks.length).toBe(4);
        expect((await takeTraceOfPair(exited)).native.length).toBe(0);
        await render(null);
      }
    );
  }

  test('the removal of a parent with no exit does not stop the exit of its child, and the parent stays until the child leaves', async () => {
    const families = familiesOf(undefined, [() => new FadeOut(), 1200]);
    const builtKeys = builtKeysOf(FADE, { durationMs: 1200 });
    const targets = targetsOf(builtKeys);
    await mount(<Family {...families} />);
    const parents = parentTags();
    const exited = await exitTo(<Family {...families} hasChildren={false} />);
    const reads = await readsUntil(exited.nativeTag, targets, exited, 300);
    const started = await takeTraceOfPair(exited);
    await render(<Family {...families} hasParents={false} />);
    reads.push(...(await readsUntil(exited.nativeTag, targets, exited, 700)));
    expect(await hasView(parents.nativeTag)).toBe(true);
    expect(await hasView(parents.frameTag)).toBe(true);
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    reads.push(
      ...(await readsUntilRemoved(exited.nativeTag, targets, exited, 1200))
    );
    expect(
      await waitForCallbacks(['frameChild:true', 'nativeChild:true'])
    ).toBe('');
    expect(sortedCallbacks()).toBe('frameChild:true,nativeChild:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await leaves(parents.nativeTag)).toBe(true);
    expect(await leaves(parents.frameTag)).toBe(true);
    const ended = await takeTraceOfPair(exited);
    expectOnTimeline(
      'the removal of a parent with no exit',
      tracksOf([...started.native, ...ended.native], exited, builtKeys),
      reads
    );
    expectFramesOnTimeline(['frameChild'], builtKeys);
    await render(null);
  });
});

let setSurfaceBoxMounted: (isMounted: boolean) => void = () => {};

function SurfaceBox() {
  const [isMounted, setMounted] = useState(true);
  setSurfaceBoxMounted = setMounted;
  return (
    <View style={styles.container}>
      {isMounted && (
        <ExitingBox
          refName={SECOND_BOX_REF}
          exiting={new FadeOut()
            .duration(EXIT_DURATION)
            .easing(Easing.linear)
            .withCallback(callbackOf('surface'))}
        />
      )}
    </View>
  );
}

const scrollRef = React.createRef<ComponentRef<typeof ScrollView>>();

/** A scroll to `CLIPPED_OFFSET` takes `children` out of the window. */
function Clipped({ children }: React.PropsWithChildren) {
  return (
    <ClippingScrollView scrollRef={scrollRef} style={localStyles.scroll}>
      {children}
      <View style={localStyles.scrollFiller} />
    </ClippingScrollView>
  );
}

const CLIPPED_OFFSET = 1500;
const scrollTo = (y: number) =>
  scrollRef.current?.scrollTo({ y, animated: false });

function ClippedSurfaceBox() {
  return (
    <Clipped>
      <SurfaceBox />
    </Clipped>
  );
}

function ClippedFamily(family: FamilyProps) {
  return (
    <Clipped>
      <Family {...family} />
    </Clipped>
  );
}

const builderCalls: string[] = [];
function recordBuilderCall(name: string) {
  builderCalls.push(name);
}

/** The leaf of `FadeOut`, from a builder that records each of its calls. */
const countedFadeOf = (name: string, easing: EasingFunction) => {
  const callback = callbackOf(name);
  return () => {
    'worklet';
    scheduleOnRN(recordBuilderCall, name);
    return {
      initialValues: { opacity: 1 },
      animations: {
        opacity: withTiming(0, { duration: EXIT_DURATION, easing }),
      },
      callback,
    };
  };
};

const countedFadePair = (): Pair => ({
  native: { exiting: countedFadeOf('native', Easing.linear) },
  frame: {
    exiting: frameDrivenOf(
      countedFadeOf('frame', recordedLinearOf(EXIT_DURATION))
    ),
  },
});

function ModalPair({
  isVisible = true,
  ...pair
}: PairProps & { isVisible?: boolean }) {
  return (
    <Modal visible={isVisible} transparent animationType="none">
      <ExitingPair {...pair} />
    </Modal>
  );
}

function ClippedPair(pair: PairProps) {
  return (
    <Clipped>
      <ExitingPair {...pair} />
    </Clipped>
  );
}

function ModalScene({
  hasModal = true,
  ...pair
}: PairProps & { hasModal?: boolean }) {
  return hasModal ? <ModalPair {...pair} /> : <View />;
}

const playedTags: Record<string, number> = {};

/** The box of a played case, with a record of the tag of its view. */
function TaggedBox(props: SizeBoxProps) {
  const { refName = BOX_REF } = props;
  useEffect(() => {
    playedTags[refName] = getTestComponent(refName).getTag();
  }, [refName]);
  return <SizeBox {...props} />;
}

describe('native layout exiting and the stop of its tracks', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const PLATFORM_REMOVED =
    'TrackEnded:Opacity:false > Ended:Interrupted:PlatformRemoved';
  const STOP_AT = 0.15 * EXIT_DURATION;

  async function exitUntilStop(
    Scene: React.ComponentType<PairProps>,
    pair = fadePairOf()
  ) {
    builderCalls.length = 0;
    const exited = await exitOf(
      <Scene {...pair} />,
      <Scene {...pair} isMounted={false} />,
      600
    );
    await waitUntil(exited, STOP_AT);
    await takeTrace();
    return { pair, exited };
  }

  const isFrameUpdate = ({ event }: { event: string }) =>
    event === 'FrameUpdateMounted';

  async function takeTransferTrace(tag: number) {
    const events = (await takeTrace()).filter((event) => event.tag === tag);
    return {
      host: summarizeEnd(events.filter((event) => !isFrameUpdate(event))),
      hasFrameUpdate: events.some(isFrameUpdate),
    };
  }

  /**
   * The platform removed the tracks of the native box at `STOP_AT`. The frame
   * driver then plays the same build on its timeline, as it plays the twin.
   */
  async function expectFrameDriverTakesExit(exited: Exited) {
    const readModels = async () => {
      const { native, frame } = await readPair(exited, OPACITY);
      expect(native.keys).toBe(0);
      expect(isNear(native.model, frame.model, twoFramesOf(OPACITY))).toBe(
        true
      );
      return native;
    };

    await waitUntil(exited, 0.3 * EXIT_DURATION);
    const transfer = await takeTransferTrace(exited.nativeTag);
    expect(transfer.host).toBe(PLATFORM_REMOVED);
    expect(transfer.hasFrameUpdate).toBe(true);
    expect(callbacks.length).toBe(0);
    expect(isNear((await readModels()).model, 0.7, 0.08)).toBe(true);

    await waitUntil(exited, 0.6 * EXIT_DURATION);
    expect(isNear((await readModels()).model, 0.4, 0.08)).toBe(true);
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, EXIT_DURATION + 400);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
    ).toBe(true);
    expect(builderCalls.slice().sort().join()).toBe('frame,native');
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(exited.frameTag)).toBe(false);
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    await render(null);
    await wait(300);
  }

  type PairReading = Awaited<ReturnType<typeof readPair>>;

  /** The native box shows the model of the twin, to two display frames. */
  function expectShowsTwin(
    statement: string,
    { native, frame }: PairReading,
    track: Track,
    durationMs = EXIT_DURATION
  ) {
    const tolerance = twoFramesOf(track, durationMs);
    expect(
      isNear(native.shown, frame.model, tolerance)
        ? ''
        : `${statement}: the native box shows ${native.shown}, ${Math.abs(native.shown - frame.model)} from the model ${frame.model} of the twin, tolerance ${tolerance}`
    ).toBe('');
  }

  /**
   * The native box left the window at `STOP_AT`. Its native track plays on to
   * its natural end, as the twin plays.
   */
  async function expectNativeTrackPlaysExit(exited: Exited) {
    await waitUntil(exited, 0.3 * EXIT_DURATION);
    const outOfWindow = await takeTransferTrace(exited.nativeTag);
    expect(outOfWindow.host).toBe('');
    expect(outOfWindow.hasFrameUpdate).toBe(false);
    expect(callbacks.length).toBe(0);
    expectShowsTwin(
      'out of the window at 0.3 of the exit',
      await readPair(exited, OPACITY),
      OPACITY
    );

    await waitUntil(exited, 0.6 * EXIT_DURATION);
    expectShowsTwin(
      'out of the window at 0.6 of the exit',
      await readPair(exited, OPACITY),
      OPACITY
    );
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, EXIT_DURATION + 400);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
    ).toBe(true);
    expect(builderCalls.slice().sort().join()).toBe('frame,native');
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(exited.frameTag)).toBe(false);
    expect((await takeTransferTrace(exited.nativeTag)).host).toBe(
      playedAndRemoved([OPACITY])
    );
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    await render(null);
    await wait(300);
  }

  const hiddenModalResult = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'removes the native tracks: the frame driver plays the exit to its end'
    : 'keeps the native track: the track plays the exit to its natural end';
  test(`a Modal that goes hidden ${hiddenModalResult}`, async () => {
    const { pair, exited } = await exitUntilStop(ModalPair, countedFadePair());
    await render(<ModalPair {...pair} isMounted={false} isVisible={false} />);
    await (REMOVES_TRACKS_OUT_OF_WINDOW
      ? expectFrameDriverTakesExit(exited)
      : expectNativeTrackPlaysExit(exited));
  });

  const HIDDEN_AT = 0.3 * EXIT_DURATION;
  const SHOWN_AT = 0.6 * EXIT_DURATION;
  /**
   * `FadeOut` of the boxes of the player. A scroll clips them at `STOP_AT` and
   * brings them back at `HIDDEN_AT`. The React Native runtime has no callback
   * at `SHOWN_AT`.
   */
  const CLIPPED_FADE: ReferenceCase = {
    flow: 'exiting',
    ...FADE.declaredOf({ duration: EXIT_DURATION }),
    places: [{ left: BOX_LEFT, top: 0 }, undefined],
    totalMs: EXIT_DURATION,
    box: { Box: TaggedBox },
    clip: { atMs: STOP_AT, backAtMs: HIDDEN_AT },
    checkpoint: {
      atMs: SHOWN_AT,
      run: () => expect(callbacks.length).toBe(0),
    },
  };

  /**
   * The opacity samples of the two boxes in the first row at or after a time
   * from the origin of the command of the native box, with the time of the
   * native sample from that origin.
   */
  function opacitiesFrom(
    { rows, tracks: [{ origin }] }: Played,
    fromMs: number
  ) {
    const elapsedOf = (monotonicTimeMs: number) =>
      monotonicTimeMs - middleOf(origin);
    const taken = rows.find(
      ({ row }) => elapsedOf(row.native.Opacity.monotonicTimeMs) >= fromMs
    );
    if (!taken) {
      throw new Error(
        `The case has no row from ${fromMs} ms after its origin.`
      );
    }
    const { native, frame } = taken.row;
    return {
      native: native.Opacity,
      frame: frame.Opacity,
      elapsedMs: elapsedOf(native.Opacity.monotonicTimeMs),
    };
  }

  /**
   * The first sample of the opacity of the native box at or after a time from
   * the origin of its command, with its own time from that origin.
   */
  function opacityFrom(played: Played, fromMs: number) {
    const { native, elapsedMs } = opacitiesFrom(played, fromMs);
    return { ...native, elapsedMs };
  }

  const clipName = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'a clip of the view removes the native tracks: the frame driver plays the exit, and the view shows again after a scroll back'
    : 'a clip of the view keeps the native track: the track plays the exit to its natural end, and the view shows the value of the twin after a scroll back';
  test(clipName, async () => {
    const played = await play(CLIPPED_FADE);
    expectReference(clipName, CLIPPED_FADE, played);
    if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
      await expectClippedFadePlayedToEnd(played);
      return;
    }
    const { events, tracks, clockOffset, frameRecords, endKeys } = played;
    expect(
      summarize(
        events.filter((event) => !isFrameUpdate(event) && isHostEvent(event))
      )
    ).toBe(`${startOf([OPACITY])} > ${PLATFORM_REMOVED}`);
    expectNoKeyAfterTransfer(played, 'Opacity');
    expectModelOnFrames(clipName, played, 'Opacity');

    const originMs = middleOf(tracks[0].origin) - middleOf(clockOffset);
    const starts = [...expectFrameRecords(played)].flatMap(
      ([{ record }, { startMs }]) => (record.box === 'native' ? [startMs] : [])
    );
    expect(
      starts.length > 0
        ? ''
        : `frame records of the native box: ${starts.length}, not more than 0`
    ).toBe('');
    for (const startMs of starts) {
      expect(
        Math.abs(startMs - originMs) < FRAME_MS
          ? ''
          : `start of a frame record of the native box: the computed start ${startMs.toFixed(3)} ms is ${(startMs - originMs).toFixed(3)} ms after the origin ${originMs.toFixed(3)} ms of the native command, bound ${FRAME_MS.toFixed(3)} ms`
      ).toBe('');
    }
    for (const box of ['native', 'frame']) {
      const receivedMs = callbackTimeOf(box).receivedMs - played.startMs;
      expect(
        receivedMs > SHOWN_AT
          ? ''
          : `no callback before ${SHOWN_AT.toFixed(3)} ms: the React Native runtime got the callback of the ${box} box ${receivedMs.toFixed(3)} ms after the first commit`
      ).toBe('');
      expect(frameRecords.filter((record) => record.box === box).length).toBe(
        endKeys.length
      );
    }
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
        ? ''
        : `callback gap: the React Native runtime got the callback of the native box at ${callbackTimes.native.toFixed(3)} ms and the callback of the twin at ${callbackTimes.frame.toFixed(3)} ms, ${(callbackTimes.native - callbackTimes.frame).toFixed(3)} ms later, bound ${(4 * FRAME_MS).toFixed(3)} ms`
    ).toBe('');

    const farRow = (
      statement: string,
      value: number,
      expected: number,
      tolerance: number
    ) =>
      `${statement}: ${value} is ${Math.abs(value - expected)} from ${expected}, tolerance ${tolerance}`;
    const hidden = opacityFrom(played, HIDDEN_AT);
    expect(
      events.filter(
        (event) =>
          !isFrameUpdate(event) &&
          event.monotonicTimeMs > hidden.monotonicTimeMs
      ).length
    ).toBe(0);
    for (const [{ presentation, model, elapsedMs }, fromMs] of [
      [hidden, HIDDEN_AT],
      [opacityFrom(played, SHOWN_AT), SHOWN_AT],
    ] as const) {
      expect(
        isNear(presentation[0], model[0], twoFramesOf(OPACITY))
          ? ''
          : farRow(
              `presentation against the model of the same sample ${elapsedMs.toFixed(3)} ms after the origin (first row from ${fromMs} ms)`,
              presentation[0],
              model[0],
              twoFramesOf(OPACITY)
            )
      ).toBe('');
    }

    const exitedTags = {
      nativeTag: playedTags[BOX_REF],
      frameTag: playedTags[FRAME_BOX_REF],
    };
    expect(exitedTags.nativeTag).toBe(events[0].tag);
    expect(
      exitedTags.frameTag > 0
        ? ''
        : `tag of the twin: ${exitedTags.frameTag}, not more than 0`
    ).toBe('');
    for (const [box, tag] of Object.entries(exitedTags)) {
      expect(
        (await leaves(tag))
          ? ''
          : `the view ${tag} (${box}) did not leave in 1000 ms after the end of the play`
      ).toBe('');
    }
    expect((await takeTraceOfPair(exitedTags)).native.length).toBe(0);
    await render(null);
    await wait(300);
  });

  /**
   * The native track of `CLIPPED_FADE` played on out of the window to its
   * natural end, and the view left after the end of its exit.
   */
  async function expectClippedFadePlayedToEnd(played: Played) {
    const { events, frameRecords, endKeys } = played;
    const hostEventsOf = (taken: TraceEvent[]) =>
      taken.filter((event) => !isFrameUpdate(event) && isHostEvent(event));
    expect(events.some(isFrameUpdate)).toBe(false);
    // A build makes its records before a start (`frameRecordedOf`): the native box has one with no frame.
    expect(
      frameRecords.filter(
        ({ box, frames }) => box === 'native' && frames.length > 0
      ).length
    ).toBe(0);
    expect(frameRecords.filter(({ box }) => box === 'frame').length).toBe(
      endKeys.length
    );

    for (const fromMs of [HIDDEN_AT, SHOWN_AT]) {
      const { native, frame, elapsedMs } = opacitiesFrom(played, fromMs);
      const tolerance = twoFramesOf(OPACITY);
      expect(
        isNear(native.presentation[0], frame.model[0], tolerance)
          ? ''
          : `after the scroll back, ${elapsedMs.toFixed(3)} ms after the origin (first row from ${fromMs} ms): the native box shows ${native.presentation[0]}, ${Math.abs(native.presentation[0] - frame.model[0])} from the model ${frame.model[0]} of the twin, tolerance ${tolerance}`
      ).toBe('');
    }

    expect(sortedCallbacks()).toBe('frame:true,native:true');
    for (const box of ['native', 'frame']) {
      const receivedMs = callbackTimeOf(box).receivedMs - played.startMs;
      expect(
        receivedMs > SHOWN_AT
          ? ''
          : `no callback before ${SHOWN_AT.toFixed(3)} ms: the React Native runtime got the callback of the ${box} box ${receivedMs.toFixed(3)} ms after the first commit`
      ).toBe('');
    }
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
        ? ''
        : `callback gap: the React Native runtime got the callback of the native box at ${callbackTimes.native.toFixed(3)} ms and the callback of the twin at ${callbackTimes.frame.toFixed(3)} ms, ${(callbackTimes.native - callbackTimes.frame).toFixed(3)} ms later, bound ${(4 * FRAME_MS).toFixed(3)} ms`
    ).toBe('');

    const exitedTags = {
      nativeTag: playedTags[BOX_REF],
      frameTag: playedTags[FRAME_BOX_REF],
    };
    for (const [box, tag] of Object.entries(exitedTags)) {
      expect(
        (await leaves(tag))
          ? ''
          : `the view ${tag} (${box}) did not leave in 1000 ms after the end of the play`
      ).toBe('');
    }
    const hostEvents = [
      ...hostEventsOf(events),
      ...hostEventsOf((await takeTraceOfPair(exitedTags)).native),
    ];
    const isEnd = ({ event }: TraceEvent) => event === 'Ended';
    expect(summarize(hostEvents.filter((event) => !isEnd(event)))).toBe(
      `${startOf([OPACITY])} > TrackEnded:Opacity:true`
    );
    expect(summarize(hostEvents.filter(isEnd))).toBe('Ended:Cancelled:None');
    expect((await takeTraceOfPair(exitedTags)).native.length).toBe(0);
    await render(null);
    await wait(300);
  }

  const layoutClipResult = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'the frame driver continues the two'
    : 'the native tracks of the two play on';
  movingGeometryTest(
    `a clip of an exiting view that has a track of a native layout animation: ${layoutClipResult}`,
    async () => {
      // The exit merges into the running layout animation, so it ends and leaves at the layout end.
      const layoutDuration = 3000;
      const exitDuration = 1500;
      const layoutEndAfterExitMs = 0.8 * layoutDuration;
      const pair = merged(
        layoutPairOf(layoutDuration),
        fadePairOf({ durationMs: exitDuration })
      );
      await render(<ClippedPair {...pair} />);
      await wait(600);
      await render(<ClippedPair {...pair} left={MOVED_LEFT} />);
      await wait(0.2 * layoutDuration);
      const exited = await exitOf(
        <ClippedPair {...pair} left={MOVED_LEFT} />,
        <ClippedPair {...pair} left={MOVED_LEFT} isMounted={false} />,
        0
      );
      await waitUntil(exited, 150);
      await takeTrace();
      scrollTo(CLIPPED_OFFSET);
      await waitUntil(exited, 350);
      const exitCallbacks = () =>
        callbacks.filter((name) => /^(native|frame):/.test(name));
      const transfer = await takeTransferTrace(exited.nativeTag);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(transfer.host).toBe(
          'TrackEnded:Height:false > TrackEnded:Opacity:false > TrackEnded:PositionX:false > TrackEnded:PositionY:false > TrackEnded:Width:false > Ended:Interrupted:PlatformRemoved > Ended:Interrupted:PlatformRemoved'
        );
        expect(transfer.hasFrameUpdate).toBe(true);
        expect(sortedCallbacks()).toBe('frameLayout:false,nativeLayout:false');
      } else {
        expect(transfer.host).toBe('');
        expect(transfer.hasFrameUpdate).toBe(false);
        expect(exitCallbacks().join()).toBe('');
      }

      scrollTo(0);
      await waitUntil(exited, 600);
      const opacity = await readPair(exited, OPACITY);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(opacity.native.keys).toBe(0);
      }
      expect(
        isNear(
          opacity.native.shown,
          opacity.frame.model,
          twoFramesOf(OPACITY, exitDuration)
        )
      ).toBe(true);
      expect(isNear(opacity.native.shown, 1 - 600 / exitDuration, 0.08)).toBe(
        true
      );
      const position = await readPair(exited, MOVE);
      expect(
        isNear(
          position.native.shown,
          position.frame.model,
          twoFramesOf(MOVE, layoutDuration)
        )
      ).toBe(true);
      expect(position.native.shown > MOVE.from).toBe(true);
      expect(position.native.shown < MOVE.to).toBe(true);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(callbacks.length).toBe(2);
      } else {
        expect(exitCallbacks().join()).toBe('');
      }

      await waitUntil(exited, layoutEndAfterExitMs + 400);
      expect(sortedCallbacks()).toBe(
        'frame:true,frameLayout:false,native:true,nativeLayout:false'
      );
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(exited.frameTag)).toBe(false);
      if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
        const ended = (await takeTraceOfPair(exited)).native;
        const isExitTrackEnd = (event: TraceEvent) =>
          event.event === 'TrackEnded' && event.target === OPACITY.traceTarget;
        const isLayoutTrackEnd = (event: TraceEvent) =>
          event.event === 'TrackEnded' && !isExitTrackEnd(event);
        expect(summarizeEnd(ended.filter(isExitTrackEnd))).toBe(
          'TrackEnded:Opacity:true'
        );
        expect(summarizeEnd(ended.filter(isLayoutTrackEnd))).toBe(
          'TrackEnded:Height:true > TrackEnded:PositionX:true > TrackEnded:PositionY:true > TrackEnded:Width:true'
        );
        expect(
          summarize(
            ended.filter(
              (event) => isHostEvent(event) && event.event !== 'TrackEnded'
            )
          )
        ).toBe('Ended:Finished:None > Ended:Cancelled:None');
      }
      await render(null);
      await wait(300);
    }
  );

  const parentClipResult = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'after the platform removed the tracks'
    : 'out of the window, at the natural end of its native track,';
  movingGeometryTest(
    `the end of the exit of a parent ${parentClipResult} ends the exit of its child with false one time`,
    async () => {
      const families = familiesOf(
        [() => new FadeOut(), 1000],
        [() => new ZoomOut(), 1500]
      );
      await render(<ClippedFamily {...families} />);
      await wait(600);
      const parents = parentTags();
      const exited = await exitOf(
        <ClippedFamily {...families} />,
        <ClippedFamily {...families} hasParents={false} />,
        0
      );
      await waitUntil(exited, 150);
      await takeTrace();
      scrollTo(CLIPPED_OFFSET);
      await waitUntil(exited, 400);
      const transfer = await takeTransferTrace(exited.nativeTag);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(transfer.host).toBe(
          'TrackEnded:Transform:false > Ended:Interrupted:PlatformRemoved'
        );
      } else {
        expect(transfer.host).toBe('');
        expect(transfer.hasFrameUpdate).toBe(false);
      }
      expect(callbacks.length).toBe(0);

      await waitUntil(exited, 1300);
      expect(sortedCallbacks()).toBe(
        'frameChild:false,frameParent:true,nativeChild:false,nativeParent:true'
      );
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(parents.nativeTag)).toBe(false);
      expect(await hasView(parents.frameTag)).toBe(false);
      if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
        const ended = await takeTrace();
        const hostEventsOf = (tag: number, event: string) =>
          summarize(
            ended.filter(
              (each) =>
                each.tag === tag && isHostEvent(each) && each.event === event
            )
          );
        expect(hostEventsOf(parents.nativeTag, 'TrackEnded')).toBe(
          'TrackEnded:Opacity:true'
        );
        expect(hostEventsOf(parents.nativeTag, 'Ended')).toBe(
          'Ended:Cancelled:None'
        );
        expect(
          summarizeEnd(ended.filter(({ tag }) => tag === exited.nativeTag))
        ).toBe('TrackEnded:Transform:false > Ended:Cancelled:None');
      }

      await waitUntil(exited, 1900);
      expect(callbacks.length).toBe(4);
      const lateEvents = (await takeTrace()).filter(
        ({ tag }) => tag === exited.nativeTag || tag === parents.nativeTag
      );
      expect(lateEvents.length).toBe(0);
      await render(null);
      await wait(300);
    }
  );

  test('the unmount of a Modal does not stop a native exit', async () => {
    const pair = fadePairOf();
    const builtKeys = builtKeysOf(FADE);
    const targets = targetsOf(builtKeys);
    const exited = await exitOf(
      <ModalScene {...pair} />,
      <ModalScene {...pair} isMounted={false} />,
      600
    );
    const reads = await readsUntil(exited.nativeTag, targets, exited, STOP_AT);
    const started = await takeTraceOfPair(exited);
    await render(<ModalScene {...pair} isMounted={false} hasModal={false} />);
    reads.push(
      ...(await readsUntil(
        exited.nativeTag,
        targets,
        exited,
        0.5 * EXIT_DURATION
      ))
    );
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    reads.push(
      ...(await readsUntilRemoved(
        exited.nativeTag,
        targets,
        exited,
        EXIT_DURATION
      ))
    );
    expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
    const ended = await takeTraceOfPair(exited);
    expectOnTimeline(
      'the unmount of a Modal',
      tracksOf([...started.native, ...ended.native], exited, builtKeys),
      reads
    );
    expectFramesOnTimeline(['frame'], builtKeys);
    await render(null);
    await wait(300);
  });

  test('the stop of the surface during a native exit gives the callback false one time', async () => {
    if (!isSecondSurfaceAvailable()) {
      return;
    }
    const surfaceId = await startSecondSurface(SurfaceBox);
    await wait(300);
    const tag = getTestComponent(SECOND_BOX_REF).getTag();
    await takeTrace();
    callbacks.length = 0;
    setSurfaceBoxMounted(false);
    await wait(0.15 * EXIT_DURATION);
    const exiting = await readTrack(tag, OPACITY);
    expect(exiting.keys).toBe(1);
    expect(exiting.shown < 1).toBe(true);
    await takeTrace();

    await stopSecondSurface(surfaceId);
    const events = await takeTraceUntilSurfaceClosed(surfaceId);
    await wait(500);
    expect(callbacks.join()).toBe('surface:false');
    expect(
      summarize(events.filter((event) => event.tag === tag).filter(isHostEvent))
    ).toBe('TrackEnded:Opacity:false > Ended:SurfaceDestroyed:None');
    await wait(EXIT_DURATION);
    expect(callbacks.join()).toBe('surface:false');
    expect(
      (await takeTrace()).filter((event) => event.tag === tag).length
    ).toBe(0);
  });

  const surfaceClipResult = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'after the platform removed the tracks'
    : 'while the native track plays out of the window';
  movingGeometryTest(
    `the stop of the surface ${surfaceClipResult} gives the callback false one time`,
    async () => {
      if (!isSecondSurfaceAvailable()) {
        return;
      }
      const surfaceId = await startSecondSurface(ClippedSurfaceBox);
      await wait(300);
      const tag = getTestComponent(SECOND_BOX_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      setSurfaceBoxMounted(false);
      await wait(STOP_AT);
      await takeTrace();
      scrollTo(CLIPPED_OFFSET);
      await wait(STOP_AT);
      const transfer = await takeTransferTrace(tag);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(transfer.host).toBe(PLATFORM_REMOVED);
        expect(transfer.hasFrameUpdate).toBe(true);
      } else {
        expect(transfer.host).toBe('');
        expect(transfer.hasFrameUpdate).toBe(false);
      }
      expect(callbacks.length).toBe(0);

      await stopSecondSurface(surfaceId);
      const events = await takeTraceUntilSurfaceClosed(surfaceId);
      if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(
          summarize(
            events.filter((event) => event.tag === tag).filter(isHostEvent)
          )
        ).toBe('TrackEnded:Opacity:false > Ended:SurfaceDestroyed:None');
      }
      await wait(500);
      expect(callbacks.join()).toBe('surface:false');
      await wait(EXIT_DURATION);
      expect(callbacks.join()).toBe('surface:false');
      expect(
        (await takeTrace()).filter((event) => event.tag === tag).length
      ).toBe(0);
    }
  );
});

/**
 * A draw has its time in whole milliseconds, so a draw in the millisecond of
 * the removal counts as after it (measured on Android: such a draw shows the
 * view with no animation matrix).
 */
const isBeforeRemoval = (drawMs: number, removedMs: number) =>
  drawMs < Math.floor(removedMs);

// The draw of a frame comes 1.2 to 21.7 ms after its frame time (the measured frame callback lag on
// Android), and a draw has its time in whole milliseconds. A start
// value for Android: the first run measures it (the `RuntimeTestsHeldExit` rows and the draws of each case).
const DRAW_AGE_MS: Band = { from: 0.2, to: 22.7 };
const DRAWN_OPACITY_TOLERANCE = 0.001;
const HELD_DURATIONS: LeafDurations = { opacityMs: 400, originXMs: 1200 };

/** The opacity holds its end value while the X plays. */
const heldPairOf = () =>
  recordedPairOf(
    'exiting',
    unequalExitingOf('native', Easing.linear, HELD_DURATIONS),
    unequalExitingOf('frame', Easing.linear, HELD_DURATIONS)
  );

const HELD_START = `${startOf([UNEQUAL_OPACITY, UNEQUAL_SLIDE])} > TrackEnded:Opacity:true`;

/**
 * The times of the frame of a draw at `timeMs`, from an origin on the sample
 * clock.
 */
const frameElapsedOf = (timeMs: number, origin: Band): Band => ({
  from: timeMs - DRAW_AGE_MS.to - origin.to,
  to: timeMs - DRAW_AGE_MS.from - origin.from,
});

/** The values that a linear track shows in the frames of `elapsed`. */
function linearBandOf(
  { from, to }: Track,
  durationMs: number,
  elapsed: Band,
  tolerance: number
): Band {
  const valueAt = (elapsedMs: number) =>
    from + (to - from) * Math.min(1, Math.max(0, elapsedMs / durationMs));
  const ends = [valueAt(elapsed.from), valueAt(elapsed.to)];
  return {
    from: Math.min(...ends) - tolerance,
    to: Math.max(...ends) + tolerance,
  };
}

const isIn = (value: number, { from, to }: Band) =>
  value >= from && value <= to;

/** The time of the first event of a trace with this summary. */
function timeOfEvent(events: TraceEvent[], summary: string) {
  const found = events.find((event) => summarize([event]) === summary);
  if (!found) {
    throw new Error(`The trace has no ${summary} event: ${summarize(events)}`);
  }
  return found.monotonicTimeMs;
}

/**
 * Renders `removed` on the mounted scene and waits until the two views of the
 * pair leave. It reads `targets` of the native view while the view is mounted,
 * and records the draws of `properties` of it where the view sampler exists.
 */
async function exitUntilRemoved(
  removed: Scene,
  targets: string[],
  properties: RecordedProperty[]
) {
  const tag = getTestComponent(BOX_REF).getTag();
  let removal: { exited: Exited; reads: TargetReads } | undefined;
  const run = async () => {
    const exited = await exitTo(removed);
    const untilRemoved = readWhileMounted(exited.nativeTag, targets);
    expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
    expect(await leaves(exited.nativeTag)).toBe(true);
    const reads = await untilRemoved.stop();
    expect(await leaves(exited.frameTag)).toBe(true);
    removal = { exited, reads };
  };
  let draws: DrawnSample[] | undefined;
  if (isViewSamplerAvailable()) {
    draws = await recordDrawnValues(tag, properties, run);
  } else {
    await run();
  }
  const { exited, reads } = removal!;
  const events = (await takeTraceOfPair(exited)).native;
  return {
    exited,
    reads,
    draws,
    events,
    origin: nativeOriginOf(events, pendingStartOf(events), exited.clock),
    removedMs: timeOfEvent(events, 'Ended:Cancelled:None'),
  };
}

const describeDraws = (draws: DrawnSample[]) =>
  draws.map(({ timeMs, values }) => `${values.join(' ')} at ${timeMs}`).join();

let setHeldSurfaceBoxMounted: (isMounted: boolean) => void = () => {};

function HeldSurfaceBox() {
  const [isMounted, setMounted] = useState(true);
  setHeldSurfaceBoxMounted = setMounted;
  return (
    <View style={styles.container}>
      {isMounted && (
        <ExitingBox
          refName={SECOND_BOX_REF}
          exiting={unequalExitingOf('surface', Easing.linear, HELD_DURATIONS)}
        />
      )}
    </View>
  );
}

describe('native layout held exits', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a SlideOutRight exit draws at its track value from the start, in motion, and in the held interval',
    async () => {
      if (!isViewSamplerAvailable()) {
        return;
      }
      const caseName = 'a SlideOutRight exit draws at its track value';
      const pair = SLIDE_OUT_RIGHT.pairOf();
      await mount(<ExitingPair {...pair} />);
      const { draws, events, origin, removedMs } = await exitUntilRemoved(
        <ExitingPair {...pair} isMounted={false} />,
        ['PositionX'],
        ['frame', 'drawnMatrix']
      );
      expect(summarize(events.filter(isHostEvent))).toBe(
        `${startOf([SLIDE])} > ${playedAndRemoved([SLIDE])}`
      );
      const endedMs = timeOfEvent(events, 'TrackEnded:PositionX:true');
      const centreOf = ({ values }: DrawnSample) =>
        drawnPointOf(values.slice(0, 4), values.slice(4), [
          BOX_SIZE / 2,
          BOX_SIZE / 2,
        ])[0];
      const mounted = draws!.filter(({ timeMs }) =>
        isBeforeRemoval(timeMs, removedMs)
      );
      const off = mounted.flatMap((draw) => {
        const elapsed = frameElapsedOf(draw.timeMs, origin);
        const band = linearBandOf(
          SLIDE,
          EXIT_DURATION,
          elapsed,
          POSITION_TOLERANCE
        );
        const centre = centreOf(draw);
        return isIn(centre, band)
          ? []
          : [
              `${centre} in the frames of ${elapsed.from.toFixed(1)}..${elapsed.to.toFixed(1)} ms of the track, band ${band.from.toFixed(2)}..${band.to.toFixed(2)}`,
            ];
      });
      const held = mounted.filter(({ timeMs }) => timeMs >= endedMs);
      const inPartOf = (fromMs: number, toMs: number) =>
        mounted.filter(({ timeMs }) => {
          const elapsed = frameElapsedOf(timeMs, origin);
          return elapsed.from >= fromMs && elapsed.to <= toMs;
        }).length;
      const hasHeldFrames = removedMs - endedMs >= 2 * FRAME_MS;
      const parts = {
        start: inPartOf(-Infinity, 0.1 * EXIT_DURATION),
        motion: inPartOf(0.1 * EXIT_DURATION, 0.9 * EXIT_DURATION),
        ...(hasHeldFrames ? { held: held.length } : {}),
      };
      logDrawnValues(caseName, draws!);
      console.log(
        `RuntimeTestsHeldExit ${JSON.stringify({ caseName, origin, endedMs, removedMs, parts, off: off.length })}`
      );
      expect(off.join()).toBe('');
      expect(
        Object.entries(parts)
          .filter(([, count]) => count === 0)
          .map(([part]) => `no draw in the ${part} part`)
          .join()
      ).toBe('');
      expect(
        describeDraws(
          held.filter(
            (draw) => !isNear(centreOf(draw), SLIDE.to, POSITION_TOLERANCE)
          )
        )
      ).toBe('');
      await render(null);
    }
  );

  movingGeometryTest(
    'the held end value shows from the track end to the removal',
    async () => {
      const caseName = 'the held end value to the removal';
      const builtKeys = builtOf(
        unequalDeclaredOf(Easing.linear, HELD_DURATIONS)
      );
      const pair = heldPairOf();
      await mount(<ExitingPair {...pair} />);
      const { exited, reads, draws, events, removedMs } =
        await exitUntilRemoved(
          <ExitingPair {...pair} isMounted={false} />,
          targetsOf(builtKeys),
          ['opacity']
        );
      expect(summarize(events.filter(isHostEvent))).toBe(
        `${HELD_START} > ${playedAndRemoved([UNEQUAL_SLIDE])}`
      );
      expectEndHeld(
        caseName,
        [UNEQUAL_OPACITY],
        tracksOf(events, exited, builtKeys),
        reads
      );
      if (draws) {
        const endedMs = timeOfEvent(events, 'TrackEnded:Opacity:true');
        const held = draws.filter(
          ({ timeMs }) => timeMs >= endedMs && timeMs < removedMs
        );
        logDrawnValues(caseName, draws);
        expect(held.length > 0).toBe(true);
        expect(
          describeDraws(
            held.filter(
              ({ values: [opacity] }) =>
                !isNear(opacity, CUSTOM_OPACITY, DRAWN_OPACITY_TOLERANCE)
            )
          )
        ).toBe('');
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a sibling change during a held exit starts nothing on the exiting view',
    async () => {
      const pair = merged(layoutPairOf(1000), heldPairOf());
      const scene = (hasSibling: boolean, isMounted: boolean) => (
        <View>
          {hasSibling && (
            <View style={localStyles.sibling} collapsable={false} />
          )}
          <ExitingPair {...pair} isMounted={isMounted} />
        </View>
      );
      const exited = await exitOf(scene(true, true), scene(true, false));
      const heldAtMs = HELD_DURATIONS.opacityMs + 200;
      await waitUntil(exited, heldAtMs);
      const before = await sample(exited.nativeTag, 'Opacity');
      await takeTraceOfPair(exited);

      await render(scene(false, false));
      await waitUntil(exited, heldAtMs + 300);
      const events = await takeTraceOfPair(exited);
      const after = await sample(exited.nativeTag, 'Opacity');
      expect(summarize(events.native.filter(isHostEvent))).toBe('');
      expect(playbackIdsOf(after).join()).toBe(playbackIdsOf(before).join());
      expect(isNear(after.presentation[0], CUSTOM_OPACITY)).toBe(true);
      expect(callbacks.length).toBe(0);

      expect(await waitForCallbacks(EXIT_CALLBACKS)).toBe('');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(
        callbackTimes.native - exited.startMs >
          HELD_DURATIONS.originXMs - FRAME_MS
      ).toBe(true);
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
      ).toBe(true);
      expect(await leaves(exited.nativeTag)).toBe(true);
      expect(await leaves(exited.frameTag)).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest('a cancel of a held exit', async () => {
    if (!isSecondSurfaceAvailable()) {
      return;
    }
    const surfaceId = await startSecondSurface(HeldSurfaceBox);
    await wait(300);
    const tag = getTestComponent(SECOND_BOX_REF).getTag();
    const hostEventsOf = (events: TraceEvent[]) =>
      events.filter((event) => event.tag === tag && isHostEvent(event));
    await takeTrace();
    callbacks.length = 0;
    setHeldSurfaceBoxMounted(false);
    await wait(HELD_DURATIONS.opacityMs + 300);
    const held = await readTrack(tag, UNEQUAL_OPACITY);
    expect(isNear(held.shown, CUSTOM_OPACITY)).toBe(true);
    expect(summarize(hostEventsOf(await takeTrace()))).toBe(HELD_START);
    expect(callbacks.length).toBe(0);

    await stopSecondSurface(surfaceId);
    const events = await takeTraceUntilSurfaceClosed(surfaceId);
    await wait(500);
    expect(callbacks.join()).toBe('surface:false');
    // The host reports the end of a track one time: the held opacity has no second end.
    expect(summarize(hostEventsOf(events))).toBe(
      'TrackEnded:PositionX:false > Ended:SurfaceDestroyed:None'
    );
    await wait(HELD_DURATIONS.originXMs);
    expect(callbacks.join()).toBe('surface:false');
    expect(
      (await takeTrace()).filter((event) => event.tag === tag).length
    ).toBe(0);
  });

  movingGeometryTest(
    'the removal mount ends the hold: no playback key and no view after it',
    async () => {
      const caseName = 'the removal mount ends the hold';
      const pair = heldPairOf();
      await mount(<ExitingPair {...pair} />);
      const { exited, reads, draws, events, removedMs } =
        await exitUntilRemoved(
          <ExitingPair {...pair} isMounted={false} />,
          ['Opacity'],
          ['opacity', 'animationMatrix']
        );
      expect(summarize(events.filter(isHostEvent))).toBe(
        `${HELD_START} > ${playedAndRemoved([UNEQUAL_SLIDE])}`
      );
      const lastRead = reads[reads.length - 1];
      expect(lastRead.samples.Opacity.playbacks.length > 0).toBe(true);
      expect(
        await sample(exited.nativeTag, 'Opacity').then(
          () => 'a sample of the removed view',
          (error: unknown) => (isNoView(error) ? '' : String(error))
        )
      ).toBe('');
      await wait(300);
      expect((await takeTraceOfPair(exited)).native.length).toBe(0);
      if (draws) {
        // The draws after the removal read the view object that left: the writer took its animation matrix off.
        const afterRemoval = draws.filter(
          ({ timeMs }) => !isBeforeRemoval(timeMs, removedMs)
        );
        logDrawnValues(caseName, draws);
        expect(afterRemoval.length > 0).toBe(true);
        expect(
          describeDraws(
            afterRemoval.filter(
              ({ values: [, ...matrix] }) => !matrix.every(Number.isNaN)
            )
          )
        ).toBe('');
      }
      await render(null);
    }
  );

  test('a Fabric opacity write to an exiting view', async () => {
    if (!isViewSamplerAvailable()) {
      return;
    }
    const caseName = 'a Fabric opacity write to an exiting view';
    const pair = fadePairOf();
    await mount(<StyledPair {...pair} />, 100);
    const { draws, events, origin, removedMs } = await exitUntilRemoved(
      <StyledPair {...pair} isMounted={false} />,
      ['Opacity'],
      ['opacity']
    );
    expect(summarize(events.filter(isHostEvent))).toBe(
      `${startOf([OPACITY])} > ${playedAndRemoved([OPACITY])}`
    );
    const checked = draws!.filter(
      ({ timeMs }) =>
        frameElapsedOf(timeMs, origin).from >= 0 && timeMs < removedMs
    );
    const off = checked.filter(({ timeMs, values: [opacity] }) => {
      const band = linearBandOf(
        OPACITY,
        EXIT_DURATION,
        frameElapsedOf(timeMs, origin),
        VALUE_TOLERANCE
      );
      return !isIn(opacity, band);
    });
    logDrawnValues(caseName, draws!);
    expect(checked.length > 0).toBe(true);
    expect(describeDraws(off)).toBe('');
    await render(null);
  });
});

const SHARED_SOURCE_REF = 'NativeLayoutExitingSharedSource';
const SHARED_TRANSITION = SharedTransition.duration(600);

function SharedSource({ exiting }: Pick<AnimatedViewProps, 'exiting'>) {
  const ref = useTestRef(SHARED_SOURCE_REF);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag="native-layout-exiting"
      sharedTransitionStyle={SHARED_TRANSITION}
      exiting={exiting}
      style={localStyles.sharedBox}
    />
  );
}

/** The commit that shows the target removes the source. */
function SharedScreens({
  exiting,
  showsTarget,
}: Pick<AnimatedViewProps, 'exiting'> & { showsTarget: boolean }) {
  return (
    <View style={localStyles.sharedScreens}>
      <SharedTransitionBoundary isActive={!showsTarget}>
        {!showsTarget && <SharedSource exiting={exiting} />}
      </SharedTransitionBoundary>
      {showsTarget && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="native-layout-exiting"
            sharedTransitionStyle={SHARED_TRANSITION}
            style={[localStyles.sharedBox, localStyles.sharedTarget]}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

describe('native layout exiting of a view that a shared transition hides', () => {
  if (
    !hasNativeLayoutRoute ||
    !getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')
  ) {
    return;
  }

  const hiddenCases: [string, ExitingCase['pairOf']][] = [
    ['FadeOut', fadePairOf],
    ['SlideOutRight', presetPairOf(() => new SlideOutRight())],
  ];
  for (const [caseName, pairOf] of hiddenCases) {
    test(`${caseName} of a source that leaves in the commit that shows its shared target does not show the source, and the callback comes at the end of the exit`, async () => {
      const pair = pairOf();
      for (const route of ['native', 'frame'] as const) {
        const { exiting } = pair[route];
        await render(<SharedScreens exiting={exiting} showsTarget={false} />);
        await wait(300);
        const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
        await takeTrace();
        callbacks.length = 0;
        const startMs = performance.now();
        await render(<SharedScreens exiting={exiting} showsTarget />);

        for (const elapsedMs of [40, 440, 1000, 1800]) {
          await waitUntil({ startMs }, elapsedMs);
          const opacity = await readTrack(tag, OPACITY);
          expect(opacity.shown).toBe(0);
          expect(opacity.keys).toBe(0);
        }
        expect(callbacks.length).toBe(0);
        // A hidden view admits no native start.
        const events = (await takeTrace()).filter((event) => event.tag === tag);
        expect(summarize(events)).toBe('');

        expect(await waitForCallbacks([`${route}:true`])).toBe('');
        expect(await leaves(tag)).toBe(true);
        expect(callbacks.join()).toBe(`${route}:true`);
        expect(callbackTimes[route] - startMs > EXIT_DURATION).toBe(true);
        await render(null);
        await wait(100);
      }
    });
  }
});

const localStyles = StyleSheet.create({
  sharedScreens: {
    width: 300,
    height: 220,
  },
  sharedBox: {
    width: 50,
    height: 50,
    backgroundColor: 'teal',
  },
  sharedTarget: {
    marginLeft: 150,
    marginTop: 100,
  },
  sibling: {
    height: 40,
  },
  parent: {
    width: 150,
    height: 80,
    backgroundColor: 'orange',
  },
  scroll: {
    height: 300,
  },
  unflattened: {
    opacity: 0.9,
  },
  scrollFiller: {
    height: 3000,
  },
});
