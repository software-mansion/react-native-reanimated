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

import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Dimensions, View } from 'react-native';
import type {
  ComplexAnimationBuilder,
  EasingFunction,
  ExitAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeOut,
  SlideOutRight,
  withDelay,
  withTiming,
  ZoomOut,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  BuiltKey,
  PlannedRead,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  buildsOf,
  expectFrameRecords,
  expectTimelineRows,
  frameChecksOf,
  MATRIX_TOLERANCE,
  sampleTargets,
} from './nativeLayoutReferencePlay';
import type {
  AnimationSource,
  Band,
  Leaf,
  PlayedTrack,
  TraceEvent,
  Track,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  centerOf,
  describeLeaf,
  expectNativeReadRows,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutRoute,
  isHostEvent,
  isNoView,
  middleOf,
  narrowClockOffset,
  playedTracksOf,
  readFrameRecords,
  readTrack,
  resetCallbacks,
  resetFrameRecords,
  frameDrivenOf,
  frameRecordedOf,
  DEFAULT_EASING,
  styles,
  summarize,
  summarizeEnd,
  takeRows,
  takeTrace,
  waitForCallbacks,
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

const customPairOf = (timing: Timing = {}): Pair =>
  recordedPairOf(
    'exiting',
    customExitingOf('native', Easing.linear, timing),
    customExitingOf('frame', Easing.linear, timing)
  );

const fadePairOf = presetPairOf(() => new FadeOut());

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

/** No reading when the view left. */
const readIfMounted = (tag: number, track: Track) =>
  readTrack(tag, track).catch(() => undefined);

type ExitedTags = Pick<Exited, 'nativeTag' | 'frameTag'>;

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
  const frameChecks = frameChecksOf(builtKeys, records);
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
          !isNear(progressOf(track, presentation[0]), 1, 0.001)
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

const sortedCallbacks = () => callbacks.slice().sort().join();

const EXIT_CALLBACKS = ['native:true', 'frame:true'];

describe('native layout exiting', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, exitingCase] of Object.entries(TIMELINE_CASES)) {
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
      for (const { samples } of reads) {
        for (const { traceTarget, from } of tracks) {
          expect(isNear(samples[traceTarget].model[0], from)).toBe(true);
        }
      }
      expectFramesOnTimeline(['frame'], builtKeys);
      await render(null);
    });
  }
});
