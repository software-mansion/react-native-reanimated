/*
 * Method: a test that plays a case (`playCase`) has statements A and B of `native layout reference`: each
 * sample of the native box is on the declared timeline of its key at its own sample time from the origin of
 * its command, and each frame of the frame driver is on a replay of the declared timeline. A test with its
 * own scene has statement A for its planned reads (`expectNativeOnTimeline`: a read with no check is a
 * `READ-UNCHECKED` row, and each target has a `TIMELINE` row) and statement B for its frame records
 * (`expectFramesOnTimeline`). An end report and a callback have a lower bound: one display frame before
 * the declared end. A test of the first frames (`isOnTimeline`) has a value check of one read with its own
 * band of two display frames. Each other statement is a state check or a trace check at a planned time.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, one common start
 * of the two boxes, how late an end report or a callback comes, the gap of two callbacks, a native value
 * in the first 18 ms of a track that starts at a value that the view did not show, the count of checked
 * planned reads. Within the read band, the platform edge hold and a native segment that keeps its start
 * value or shows its end value early are not distinguished. Pixels, a device, and 120 Hz are not tested.
 *
 * A test of `native layout entering and a clip of its view` plays a case with a clip: statement A to the
 * scroll call, statement B for the two boxes, and statement M after the frame driver took the native box
 * (its model is on its own recorded frames). Its value checks at the planned parts use the first row at or
 * after the part, with the declared value of the time of that row. Two claims of that block stay on the
 * wall clock: the gap of the two callbacks, and the time from the removal report to the first frame of the
 * frame driver. The shared transition test waits for its callback and has the lower bound only.
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Dimensions, Modal, ScrollView, StyleSheet, View } from 'react-native';
import type {
  ComplexAnimationBuilder,
  EasingFunction,
  EntryAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  getStaticFeatureFlag,
  LinearTransition,
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
  SlideInLeft,
  withDelay,
  withTiming,
  ZoomIn,
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
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import type {
  BuiltKey,
  ModelTarget,
  Place,
  Played,
  PlannedRead,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  buildsOf,
  expectTimelineRows,
  expectFrameRecords,
  expectModelOnFrames,
  expectNoKeyAfterTransfer,
  expectReference,
  frameChecksOf,
  MATRIX_TOLERANCE,
  play,
  sampleTargets,
} from './nativeLayoutReferencePlay';
import type {
  AnimationSource,
  Band,
  DeclaredKey,
  Leaf,
  PlayedTrack,
  ScalarKey,
  TargetSample,
  TraceEvent,
  Track,
  TrackReading,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbackOf,
  callbacks,
  callbackTimeOf,
  callbackTimes,
  capturesOf,
  centerOf,
  ClippingScrollView,
  countedOf,
  CURVED_EASINGS,
  declaredBandOf,
  describeLeaf,
  expectCapturedStart,
  expectNativeReadRows,
  FIRST_FRAMES_MS,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutRoute,
  hasNativeAnimationHost,
  isHostEvent,
  middleOf,
  narrowClockOffset,
  namedBuilderCalls,
  nativeOriginOf,
  playedTracksOf,
  POSITION_TOLERANCE,
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
  takeTrace,
  waitForCallbacks,
} from './nativeLayoutTestKit';

type AnimatedViewProps = React.ComponentProps<typeof Animated.View>;
type BoxAnimations = Pick<AnimatedViewProps, 'entering' | 'layout' | 'exiting'>;
type Timing = { durationMs?: number; delayMs?: number };
type Pair = { native: BoxAnimations; frame: BoxAnimations };
type Declared = Pick<ReferenceCase, 'leaves' | 'operations'>;

type EnteringCase = {
  pairOf: (timing?: Timing) => Pair;
  tracks: Track[];
  /** The preset of the two boxes. A case with none has a custom function. */
  create?: () => ComplexAnimationBuilder;
  /** What the animation declares for a timing. */
  declaredOf: (leaf: Leaf) => Declared;
  easing?: Leaf['easing'];
};

const CLOCK_REF = 'NativeLayoutEnteringClock';
const ENTER_DURATION = 2000;
const BOX_LEFT = 20;
const MOVED_LEFT = 120;
const WINDOW_WIDTH = Dimensions.get('window').width;
const CUSTOM_OPACITY = 0.2;
const CUSTOM_OFFSET = -80;
const VALUE_TOLERANCE = 0.01;

const OPACITY: Track = {
  sampleTarget: 'Opacity',
  traceTarget: 'Opacity',
  from: 0,
  to: 1,
};
const SLIDE: Track = {
  sampleTarget: 'Position',
  traceTarget: 'PositionX',
  from: centerOf(BOX_LEFT) - WINDOW_WIDTH,
  to: centerOf(BOX_LEFT),
};
const SCALE: Track = {
  sampleTarget: 'Transform',
  traceTarget: 'Transform',
  from: 0,
  to: 1,
};

const timed = (
  builder: ComplexAnimationBuilder,
  { durationMs = ENTER_DURATION, delayMs }: Timing
) =>
  delayMs === undefined
    ? builder.duration(durationMs)
    : builder.duration(durationMs).delay(delayMs);

/**
 * The native box has a linear easing, or the default easing when
 * `hasDefaultEasing` is set. Its twin is frame-driven on the same curve.
 */
const presetPairOf =
  (create: () => ComplexAnimationBuilder, hasDefaultEasing = false) =>
  (timing: Timing = {}): Pair => {
    const native = timed(create(), timing).withCallback(callbackOf('native'));
    const frame = timed(create(), timing).withCallback(callbackOf('frame'));
    return {
      native: {
        entering: hasDefaultEasing ? native : native.easing(Easing.linear),
      },
      frame: {
        entering: frameDrivenOf(
          hasDefaultEasing ? frame : frame.easing(Easing.linear)
        ),
      },
    };
  };

const customEnteringOf = (
  name: string,
  easing: EasingFunction,
  { durationMs = ENTER_DURATION, delayMs }: Timing
) => {
  const callback = callbackOf(name);
  return (values: EntryAnimationsValues) => {
    'worklet';
    const animate = (toValue: number) => {
      'worklet';
      const timing = withTiming(toValue, { duration: durationMs, easing });
      return delayMs === undefined ? timing : withDelay(delayMs, timing);
    };
    return {
      initialValues: {
        opacity: CUSTOM_OPACITY,
        originX: values.targetOriginX + CUSTOM_OFFSET,
      },
      animations: {
        opacity: animate(1),
        originX: animate(values.targetOriginX),
      },
      callback,
    };
  };
};

const customPairOf = (timing: Timing = {}): Pair => ({
  native: { entering: customEnteringOf('native', Easing.linear, timing) },
  frame: {
    entering: frameDrivenOf(customEnteringOf('frame', Easing.linear, timing)),
  },
});

const fadePairOf = presetPairOf(() => new FadeIn());

const HOLD = { from: 0.25, to: 0.75, value: 0.5 };

/** No change from 25 % to 75 % of the time. */
function easingWithHold(time: number) {
  'worklet';
  if (time < HOLD.from) {
    return 2 * time;
  }
  return time < HOLD.to ? HOLD.value : 2 * time - 1;
}

const FADE: EnteringCase = {
  pairOf: fadePairOf,
  tracks: [OPACITY],
  create: () => new FadeIn(),
  declaredOf: (leaf) => ({
    leaves: { opacity: { ...leaf, initial: 0, to: 1 } },
  }),
};
const SLIDE_IN_LEFT: EnteringCase = {
  pairOf: presetPairOf(() => new SlideInLeft()),
  tracks: [SLIDE],
  create: () => new SlideInLeft(),
  declaredOf: (leaf) => ({
    leaves: { originX: { ...leaf, initial: -WINDOW_WIDTH } },
  }),
};
const ZOOM: EnteringCase = {
  pairOf: presetPairOf(() => new ZoomIn()),
  tracks: [SCALE],
  create: () => new ZoomIn(),
  declaredOf: (leaf) => ({ leaves: {}, operations: [['scale', 0, 1, leaf]] }),
};

const CASES: Record<string, EnteringCase> = {
  FadeIn: FADE,
  SlideInLeft: SLIDE_IN_LEFT,
  ZoomIn: ZOOM,
  'a custom function': {
    pairOf: customPairOf,
    tracks: [
      { ...OPACITY, from: CUSTOM_OPACITY },
      { ...SLIDE, from: centerOf(BOX_LEFT) + CUSTOM_OFFSET },
    ],
    declaredOf: (leaf) => ({
      leaves: {
        opacity: { ...leaf, initial: CUSTOM_OPACITY, to: 1 },
        originX: { ...leaf, initial: CUSTOM_OFFSET },
      },
    }),
  },
};

/** The cases whose native box has the tracks of the default easing. */
const DEFAULT_EASING_CASES: Record<string, EnteringCase> = {
  'FadeIn with the default easing': {
    ...FADE,
    pairOf: presetPairOf(() => new FadeIn(), true),
    tracks: [{ ...OPACITY, easing: DEFAULT_EASING }],
    easing: 'default',
  },
  'SlideInLeft with the default easing': {
    ...SLIDE_IN_LEFT,
    pairOf: presetPairOf(() => new SlideInLeft(), true),
    tracks: [{ ...SLIDE, easing: DEFAULT_EASING }],
    easing: 'default',
  },
  'ZoomIn with the default easing': {
    ...ZOOM,
    pairOf: presetPairOf(() => new ZoomIn(), true),
    tracks: [{ ...SCALE, easing: DEFAULT_EASING }],
    easing: 'default',
  },
};

const TIMELINE_CASES = { ...CASES, ...DEFAULT_EASING_CASES };

const PLACE: Place = { left: BOX_LEFT, top: 0 };

const FADE_KEY: ScalarKey = {
  key: 'opacity',
  target: 'Opacity',
  tolerance: VALUE_TOLERANCE,
  leaf: { duration: ENTER_DURATION },
  from: 0,
  to: 1,
  startsOnScreen: false,
};
const SLIDE_KEY: ScalarKey = {
  key: 'originX',
  target: 'PositionX',
  tolerance: POSITION_TOLERANCE,
  leaf: { duration: ENTER_DURATION },
  from: BOX_LEFT - WINDOW_WIDTH,
  to: BOX_LEFT,
  base: BOX_LEFT,
  startsOnScreen: false,
  size: { key: 'width', rest: BOX_SIZE },
};

/** The case of `native layout reference` of an entering case with a timing. */
function referenceOf(
  { create, declaredOf, easing: easingOfCase }: EnteringCase,
  timing: Timing & Pick<Leaf, 'easing'> = {}
): ReferenceCase {
  const {
    durationMs = ENTER_DURATION,
    delayMs,
    easing = easingOfCase,
  } = timing;
  return {
    flow: 'entering',
    ...declaredOf({ duration: durationMs, delay: delayMs, easing }),
    places: [undefined, PLACE],
    totalMs: Math.max(0, delayMs ?? 0) + durationMs,
    builder:
      create &&
      (() => {
        const builder = timed(create(), timing);
        return easing === 'default'
          ? builder
          : builder.easing(easing ?? Easing.linear);
      }),
  };
}

type BoxProps = BoxAnimations & {
  refName: string;
  left?: number;
  style?: StyleProp<ViewStyle>;
};

function EnteringBox({
  refName,
  left = BOX_LEFT,
  style,
  ...animations
}: BoxProps) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[styles.box, { marginLeft: left }, style]}
    />
  );
}

type PairProps = Pair & {
  isMounted?: boolean;
  left?: number;
  style?: StyleProp<ViewStyle>;
  /** Each box is in two views that React flattens. */
  isInFlattenedViews?: boolean;
};

function Clock() {
  const clockRef = useTestRef(CLOCK_REF);
  return <View ref={clockRef} collapsable={false} />;
}

function PairCells({
  native,
  frame,
  isMounted = false,
  isInFlattenedViews = false,
  ...box
}: PairProps) {
  const cellOf = (animations: BoxAnimations, refName: string) => {
    const mountedBox = isMounted && (
      <EnteringBox {...box} {...animations} refName={refName} />
    );
    return (
      <View style={styles.pairCell}>
        {isInFlattenedViews ? (
          <View>
            <View>{mountedBox}</View>
          </View>
        ) : (
          mountedBox
        )}
      </View>
    );
  };
  return (
    <>
      {cellOf(native, BOX_REF)}
      {cellOf(frame, FRAME_BOX_REF)}
    </>
  );
}

function EnteringPair(pair: PairProps) {
  return (
    <View>
      <Clock />
      <PairCells {...pair} />
    </View>
  );
}

function ModalPair(pair: PairProps) {
  return (
    <Modal visible transparent animationType="none">
      <EnteringPair {...pair} />
    </Modal>
  );
}

type Ancestors = React.ComponentType<React.PropsWithChildren>;

/** The ancestors mount in the commit that mounts the two boxes. */
const pairInNewAncestorsOf = (NewAncestors: Ancestors) =>
  function PairInNewAncestors(pair: PairProps) {
    return (
      <View>
        <Clock />
        {pair.isMounted && (
          <NewAncestors>
            <PairCells {...pair} />
          </NewAncestors>
        )}
      </View>
    );
  };

const PairInNewModal = pairInNewAncestorsOf(({ children }) => (
  <Modal visible transparent animationType="none">
    {children}
  </Modal>
));

const PairInNewViews = pairInNewAncestorsOf(({ children }) => (
  <View collapsable={false}>
    <View collapsable={false}>{children}</View>
  </View>
));

const PairInNewScrollView = pairInNewAncestorsOf(({ children }) => (
  <ScrollView style={localStyles.scroll}>{children}</ScrollView>
));

/**
 * The boxes mount in a view that the scroll view clipped, so that view is in no
 * window.
 */
function PairInClippedView(pair: PairProps) {
  return (
    <View>
      <Clock />
      <ClippingScrollView style={localStyles.scroll}>
        <View style={localStyles.scrollFiller} />
        <View collapsable={false} style={localStyles.clippedView}>
          <PairCells {...pair} />
        </View>
      </ClippingScrollView>
    </View>
  );
}

type ClippingViewForm = {
  /** The view mounts in the commit that mounts the two boxes. */
  isNew: boolean;
  /** The boxes are out of the clip rectangle of the scroll view. */
  areBoxesClipped: boolean;
};

/**
 * The boxes are in a view that removes its clipped subviews. React Native puts
 * such a box in the view tree only when it is in the clip rectangle.
 */
const pairInClippingViewOf = ({ isNew, areBoxesClipped }: ClippingViewForm) =>
  function PairInClippingView(pair: PairProps) {
    return (
      <View>
        <Clock />
        <ClippingScrollView style={localStyles.scroll}>
          {(!isNew || pair.isMounted) && (
            <View
              removeClippedSubviews
              collapsable={false}
              style={localStyles.scrollFiller}>
              {areBoxesClipped && <View style={localStyles.clippedOffset} />}
              <PairCells {...pair} />
            </View>
          )}
        </ClippingScrollView>
      </View>
    );
  };

type Counted = Parameters<typeof countedOf>[1];

const countedPairOf = ({ native, frame }: Pair): Pair => ({
  native: { entering: countedOf('native', native.entering as Counted) },
  frame: { entering: countedOf('frame', frame.entering as Counted) },
});

type Entered = {
  nativeTag: number;
  frameTag: number;
  clock: Band;
  startMs: number;
};

const recordedOf = (
  box: string,
  { entering, ...animations }: BoxAnimations
) => ({
  ...animations,
  entering: frameRecordedOf(box, entering as AnimationSource),
});

/** Mounts the scene with no box, then the two boxes in one commit. */
async function enter(
  pair: PairProps,
  Scene: React.ComponentType<PairProps> = EnteringPair
): Promise<Entered> {
  const recorded = {
    ...pair,
    native: recordedOf('native', pair.native),
    frame: recordedOf('frame', pair.frame),
  };
  resetFrameRecords();
  await render(<Scene {...recorded} />);
  await wait(300);
  const clock = await narrowClockOffset(getTestComponent(CLOCK_REF).getTag());
  await takeTrace();
  resetCallbacks();
  namedBuilderCalls.length = 0;
  const startMs = performance.now();
  await render(<Scene {...recorded} isMounted />);
  return {
    nativeTag: getTestComponent(BOX_REF).getTag(),
    frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
    clock,
    startMs,
  };
}

/** The samples of the native box for `keys` at each time from the mount. */
async function sampleAt(
  entered: Pick<Entered, 'nativeTag' | 'startMs'>,
  keys: ScalarKey[],
  timesMs: number[]
) {
  const reads: PlannedRead[] = [];
  for (const plannedMs of timesMs) {
    await waitUntil(entered, plannedMs);
    reads.push({
      samples: await sampleTargets(
        entered.nativeTag,
        keys.map(({ target }) => target)
      ),
      opensCycle: true,
    });
  }
  return reads;
}

/**
 * Statement A of `native layout reference` for reads of the native box at
 * planned times, from the origin of the first native command of `events`: each
 * read in the checked time of a track of `keys` is on the declared timeline at
 * its own sample time, and one read or more of each target has the check.
 */
function expectNativeOnTimeline(
  name: string,
  events: TraceEvent[],
  { clock }: Pick<Entered, 'clock'>,
  keys: ScalarKey[],
  reads: PlannedRead[],
  replaced: PlayedTrack[] = []
) {
  const tracks = playedTracksOf(
    events,
    pendingStartOf(events),
    clock,
    keys,
    replaced
  );
  const checked = expectNativeReadRows(
    reads.map(({ samples }) => samples),
    tracks,
    MATRIX_TOLERANCE
  ).flat();
  expectTimelineRows(name, tracks, reads, checked);
  return tracks;
}

const builtOf = (keys: DeclaredKey[]): BuiltKey[] =>
  keys.map((declared) => ({
    declared,
    twinEnds: declared,
    continuesTrack: false,
  }));

const builtKeysOf = (enteringCase: EnteringCase, timing: Timing = {}) =>
  buildsOf(referenceOf(enteringCase, timing)).flat();

/**
 * Statement B of `native layout reference` for the frame driver on `boxes`:
 * build n of a leaf of a box is declaration n of the leaf in `builtKeys`, and
 * each declaration has a record with frames. It gives the residual of each
 * record.
 */
function expectFramesOnTimeline(
  boxes: string[],
  builtKeys: BuiltKey[],
  tracks: PlayedTrack[] = []
) {
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
  return expectFrameRecords({ frameChecks, tracks });
}

/** The computed start of the frame driver on a box, on the animation clock. */
function frameStartOf(
  residuals: ReturnType<typeof expectFrameRecords>,
  box: string
) {
  for (const [{ record }, { startMs }] of residuals) {
    if (record.box === box) {
      return startMs;
    }
  }
  throw new Error(`The frame driver has no record of the box ${box}.`);
}

const waitUntil = ({ startMs }: Pick<Entered, 'startMs'>, elapsedMs: number) =>
  wait(Math.max(0, startMs + elapsedMs - performance.now()));

type EnteredTags = Pick<Entered, 'nativeTag' | 'frameTag'>;

async function readPair({ nativeTag, frameTag }: EnteredTags, track: Track) {
  const [native, frame] = await Promise.all([
    readTrack(nativeTag, track),
    readTrack(frameTag, track),
  ]);
  return { native, frame };
}

async function takeTraceOfPair({ nativeTag, frameTag }: EnteredTags) {
  const events = await takeTrace();
  const eventsOf = (tag: number) =>
    events.filter(
      (event) => event.tag === tag && event.event !== 'FrameUpdateMounted'
    );
  return { native: eventsOf(nativeTag), frame: eventsOf(frameTag) };
}

const startOf = (tracks: Track[]) =>
  [
    'LayoutStartPending',
    'LayoutStartMounted',
    'Received',
    ...tracks.map(({ traceTarget }) => `TrackStarted:${traceTarget}`),
    'Admitted',
  ].join(' > ');

const endOf = (tracks: Track[], finished = true) =>
  [
    ...tracks.map(({ traceTarget }) => `TrackEnded:${traceTarget}:${finished}`),
    finished ? 'Ended:Finished:None' : 'Ended:Cancelled:None',
  ].join(' > ');

/** `summarizeEnd` of a native command that played each track to its end. */
const startAndEndOf = (tracks: Track[]) =>
  [
    ...tracks.map(({ traceTarget }) => `TrackEnded:${traceTarget}:true`),
    startOf(tracks),
    'Ended:Finished:None',
  ].join(' > ');

const pendingStartOf = (events: TraceEvent[]) =>
  events.find(({ event }) => event === 'LayoutStartPending')!;

// The default easing moves by no more than two times its mean speed.
const rangeOf = ({ from, to, easing }: Track) =>
  Math.abs(to - from) * (easing ? 2 : 1);

/** The change of the value of a track in two display frames. */
const twoFramesOf = (track: Track, durationMs = ENTER_DURATION) =>
  VALUE_TOLERANCE + (2 * FRAME_MS * rangeOf(track)) / durationMs;

/** The part of the duration at which the track has the value. */
const progressOf = ({ from, to, easing }: Track, value: number) => {
  const progress = (value - from) / (to - from);
  return easing ? easing.timeOf(progress) : progress;
};

const valueAt = ({ from, to, easing }: Track, progress: number) => {
  const time = Math.min(1, Math.max(0, progress));
  return from + (to - from) * (easing ? easing.curve(time) : time);
};

const isNear = (value: number, expected: number, tolerance = VALUE_TOLERANCE) =>
  Math.abs(value - expected) < tolerance;

/**
 * True when the native value is on the timeline that starts at `startMs` of the
 * sample clock.
 */
const isOnTimeline = (
  track: Track,
  { shown, timeMs }: TrackReading,
  startMs: number,
  durationMs = ENTER_DURATION
) =>
  isNear(
    shown,
    valueAt(track, (timeMs - startMs) / durationMs),
    twoFramesOf(track, durationMs)
  );

const sortedCallbacks = () => callbacks.slice().sort().join();

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference`. At the end the native box shows its
 * model, and the twin has the model of the native box.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  for (const [target, { presentation, model }] of Object.entries(
    played.end!.native
  )) {
    model.forEach((value, index) => {
      expect(isNear(presentation[index], value)).toBe(true);
      expect(isNear(played.end!.frame[target].model[index], value)).toBe(true);
    });
  }
  return { ...played, reads };
}

/**
 * The native command of the tracks starts and plays each track to its end. The
 * end report of each track comes no more than one display frame before the
 * declared end, from the origin of the command, and so does each callback.
 */
function expectPlayedToEnd(played: Played, tracks: Track[], totalMs: number) {
  const { events, tracks: playedTracks } = played;
  expect(summarizeEnd(events)).toBe(startAndEndOf(tracks));
  const originMs = middleOf(playedTracks[0].origin);
  for (const track of playedTracks) {
    expect(track.played.to - originMs > totalMs - FRAME_MS).toBe(true);
  }
  expectNoEarlyCallback(played, totalMs);
}

/**
 * The callback of the native box comes no more than one display frame before
 * the declared end, from the origin of its command. The callback of the twin
 * has that bound from the computed start of its frame record.
 */
function expectNoEarlyCallback(played: Played, totalMs: number) {
  const { tracks, clockOffset } = played;
  const earliestMs = totalMs - FRAME_MS;
  const nativeMs =
    callbackTimeOf('native').emittedMs +
    middleOf(clockOffset) -
    middleOf(tracks[0].origin);
  expect(
    nativeMs > earliestMs
      ? ''
      : `no early callback: the callback of the native box was emitted ${nativeMs.toFixed(3)} ms after the origin of its command, not after ${earliestMs.toFixed(3)} ms`
  ).toBe('');
  const frameMs =
    callbackTimeOf('frame').emittedMs -
    frameStartOf(expectFrameRecords(played), 'frame');
  expect(
    frameMs > earliestMs
      ? ''
      : `no early callback: the callback of the twin was emitted ${frameMs.toFixed(3)} ms after the computed start of its frame record, not after ${earliestMs.toFixed(3)} ms`
  ).toBe('');
}

/** The React Native runtime got no callback before a time from the first commit. */
function expectNoCallbackBefore({ startMs }: Played, plannedMs: number) {
  for (const box of ['native', 'frame']) {
    const receivedMs = callbackTimeOf(box).receivedMs - startMs;
    expect(
      receivedMs > plannedMs
        ? ''
        : `no callback before ${plannedMs.toFixed(3)} ms: the React Native runtime got the callback of the ${box} box ${receivedMs.toFixed(3)} ms after the first commit`
    ).toBe('');
  }
}

/** The case with a checkpoint at which the React Native runtime has no callback. */
const withNoCallbackAt = (
  referenceCase: ReferenceCase,
  atMs: number
): ReferenceCase => ({
  ...referenceCase,
  checkpoint: { atMs, run: () => expect(callbacks.length).toBe(0) },
});

const START_REFUSED = 'LayoutStartRefused:Rejected:TargetUnavailable';

const localStyles = StyleSheet.create({
  scroll: {
    height: 300,
  },
  scrollFiller: {
    height: 2000,
  },
  clippedView: {
    height: 300,
  },
  clippedOffset: {
    height: 1500,
  },
  parent: {
    width: 150,
    height: 100,
    backgroundColor: 'navy',
  },
  sharedScreens: {
    width: 300,
    height: 220,
  },
  sharedTarget: {
    marginLeft: 150,
    marginTop: 100,
  },
});

describe('native layout entering', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, enteringCase] of Object.entries(TIMELINE_CASES)) {
    const { pairOf, tracks } = enteringCase;
    test(`${caseName} starts natively on the mounted final state, and a sample after its first display frames is on the timeline from the initial value`, async () => {
      const entered = await enter(pairOf());
      await wait(FIRST_FRAMES_MS);
      const first = await Promise.all(
        tracks.map((track) => readPair(entered, track))
      );
      await wait(100);
      const events = await takeTraceOfPair(entered);

      expect(summarize(events.native.filter(isHostEvent))).toBe(
        startOf(tracks)
      );
      const pendingStart = pendingStartOf(events.native);
      expect(pendingStart.layoutAnimationType).toBe('Entering');
      expect(summarize(events.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );
      expect(events.frame[0].layoutAnimationType).toBe('Entering');

      tracks.forEach((track, index) => {
        const { native, frame } = first[index];
        expect(isNear(native.model, track.to)).toBe(true);
        expect(native.keys >= tracks.length).toBe(true);
        expect(isOnTimeline(track, native, pendingStart.monotonicTimeMs)).toBe(
          true
        );
        expect(progressOf(track, native.shown) < 0.15).toBe(true);
        expect(progressOf(track, frame.model) < 0.15).toBe(true);
      });
      await render(null);
    });

    test(`${caseName} agrees with the frame driver, ends at the model, and gives its callback true one time`, async () => {
      const played = await playCase(
        caseName,
        withNoCallbackAt(referenceOf(enteringCase), 0.75 * ENTER_DURATION)
      );
      expect(
        played.reads
          .filter(
            ({ sampled, timeMs, tracks: [{ origin }] }) =>
              sampled.playbacks.length < tracks.length &&
              timeMs < middleOf(origin) + ENTER_DURATION - FRAME_MS
          )
          .map(
            ({ target, sampled, timeMs, tracks: [{ origin }] }) =>
              `${sampled.playbacks.length} keys of ${target} at ${timeMs - middleOf(origin)} ms`
          )
          .join()
      ).toBe('');
      expectNoCallbackBefore(played, 0.75 * ENTER_DURATION);
      expectPlayedToEnd(played, tracks, ENTER_DURATION);
      await render(null);
    });

    test(`${caseName} holds its initial value through a delay of 1000 ms, then plays`, async () => {
      const timing = { durationMs: 600, delayMs: 1000 };
      const played = await playCase(
        `${caseName} after a delay`,
        withNoCallbackAt(
          referenceOf(enteringCase, timing),
          timing.delayMs + timing.durationMs / 2
        )
      );
      for (const { row } of played.rows) {
        for (const [target, { model }] of Object.entries(row.native)) {
          expect(model.join()).toBe(played.end!.native[target].model.join());
        }
      }
      expectNoCallbackBefore(played, timing.delayMs + timing.durationMs / 2);
      expectPlayedToEnd(played, tracks, timing.delayMs + timing.durationMs);
      await render(null);
    });
  }

  test('the removal of the view at 30 % gives the callback false one time', async () => {
    const pair = fadePairOf();
    const entered = await enter(pair);
    await waitUntil(entered, 0.3 * ENTER_DURATION);
    await takeTrace();

    await render(<EnteringPair {...pair} />);
    await wait(300);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      endOf([OPACITY], false)
    );
    expect(sortedCallbacks()).toBe('frame:false,native:false');

    await wait(ENTER_DURATION);
    expect(callbacks.length).toBe(2);
    expect((await takeTraceOfPair(entered)).native.length).toBe(0);
    await render(null);
  });

  test('an exit at 30 % ends the native entering group with false and starts natively at its own initial value', async () => {
    const exitDurationMs = 1000;
    const exitKey = {
      ...FADE_KEY,
      leaf: { duration: exitDurationMs },
      from: 1,
      to: 0,
    };
    const exitingOf = (name: string) =>
      new FadeOut()
        .duration(exitDurationMs)
        .easing(Easing.linear)
        .withCallback(callbackOf(name));
    const { native, frame } = fadePairOf();
    const pair = {
      native: { ...native, exiting: exitingOf('nativeExit') },
      frame: {
        ...frame,
        exiting: frameRecordedOf('frame', exitingOf('frameExit')),
      },
    };
    const entered = await enter(pair);
    await waitUntil(entered, 0.3 * ENTER_DURATION);
    const beforeExit = await sampleTargets(entered.nativeTag, ['Opacity']);
    const enterEvents = await takeTraceOfPair(entered);
    expectNativeOnTimeline(
      'an exit at 30 %, the entering track',
      enterEvents.native,
      entered,
      [FADE_KEY],
      [{ samples: beforeExit, opensCycle: true }]
    );

    const exitStartMs = performance.now();
    await render(<EnteringPair {...pair} />);
    await wait(Math.max(0, exitStartMs + 200 - performance.now()));
    const exiting = await sampleTargets(entered.nativeTag, ['Opacity']);
    const twin = await readTrack(entered.frameTag, OPACITY);
    expect(exiting.Opacity.playbacks.length).toBe(1);
    expect(twin.keys).toBe(0);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Opacity:false > Ended:Interrupted:None > TrackStarted:Opacity > Admitted'
    );
    expect(pendingStartOf(events.native).layoutAnimationType).toBe('Exiting');
    expectNativeOnTimeline(
      'an exit at 30 %, the exiting track',
      events.native,
      entered,
      [exitKey],
      [{ samples: exiting, opensCycle: true }]
    );
    expect(sortedCallbacks()).toBe('frame:false,native:false');

    await wait(exitDurationMs + 200);
    expect(sortedCallbacks()).toBe(
      'frame:false,frameExit:true,native:false,nativeExit:true'
    );
    expectFramesOnTimeline(['frame'], builtOf([FADE_KEY, exitKey]));
    let hasView = true;
    await readTrack(entered.nativeTag, OPACITY).catch(() => {
      hasView = false;
    });
    expect(hasView).toBe(false);
    await render(null);
  });

  const mismatches = {
    'FadeIn on a view with the style opacity 0.5': {
      enteringCase: FADE,
      style: { opacity: 0.5 },
    },
    'ZoomIn on a view with a style transform': {
      enteringCase: ZOOM,
      style: { transform: [{ scale: 0.8 }] },
    },
  };
  for (const [caseName, { enteringCase, style }] of Object.entries(
    mismatches
  )) {
    const {
      pairOf,
      tracks: [track],
    } = enteringCase;
    test(`${caseName} stays frame-driven and ends at the end value of its leaf: EndpointMismatch`, async () => {
      const entered = await enter({ ...pairOf(), style });
      await waitUntil(entered, 0.5 * ENTER_DURATION);
      const events = await takeTraceOfPair(entered);
      expect(summarize(events.native)).toBe(
        'LayoutBuildFailed:EndpointMismatch'
      );
      expect(events.native[0].layoutAnimationType).toBe('Entering');
      expect((await readTrack(entered.nativeTag, track)).keys).toBe(0);

      await waitUntil(entered, ENTER_DURATION + 300);
      const end = await readPair(entered, track);
      expect(isNear(end.native.model, track.to)).toBe(true);
      expect(isNear(end.frame.model, track.to)).toBe(true);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expectFramesOnTimeline(['native', 'frame'], builtKeysOf(enteringCase));
      await render(null);
    });
  }

  for (const [easingName, easing] of Object.entries(CURVED_EASINGS)) {
    test(`FadeIn with ${easingName} plays natively on the curve of the frame driver`, async () => {
      const played = await playCase(
        `FadeIn with ${easingName}`,
        referenceOf(FADE, { easing })
      );
      expectPlayedToEnd(played, [OPACITY], ENTER_DURATION);
      await render(null);
    });
  }

  test('FadeIn with an easing that has no change from 25 % to 75 % of its time plays natively and holds the value of that part with no step', async () => {
    const played = await playCase(
      'FadeIn with a hold',
      referenceOf(FADE, { easing: easingWithHold })
    );
    expectPlayedToEnd(played, [OPACITY], ENTER_DURATION);
    const checked = played.reads.filter(({ isChecked }) => isChecked);
    const { members } = checked[Math.floor(checked.length / 2)].sampled;
    expect(members[0].values.map(([value]) => value).join()).toBe(
      '0,0.5,0.5,0.5,1'
    );
    const held = checked.filter(({ tracks: [track], timeMs }) => {
      const { from, to } = declaredBandOf(track, timeMs);
      return from === HOLD.value && to === HOLD.value;
    });
    for (const { values } of held) {
      expect(values[0]).toBe(HOLD.value);
    }
    expect(held.length >= 20).toBe(true);
    const twin = played.frameChecks.find(
      ({ record }) => record.box === 'frame'
    )!;
    const twinStartMs = frameStartOf(expectFrameRecords(played), 'frame');
    const twoFramesMs = 2 * FRAME_MS;
    const heldFrames = twin.record.frames.filter(({ timeMs }) => {
      const elapsedMs = timeMs - twinStartMs;
      return (
        elapsedMs >= HOLD.from * ENTER_DURATION + twoFramesMs &&
        elapsedMs <= HOLD.to * ENTER_DURATION - twoFramesMs
      );
    });
    for (const { value } of heldFrames) {
      expect(value === HOLD.value).toBe(true);
    }
    expect(heldFrames.length >= 20).toBe(true);
    await render(null);
  });

  const customTracks = CASES['a custom function'].tracks;

  test('no duration with a delay holds the initial values, then the model shows and the callback gets true', async () => {
    const delayMs = 600;
    const entered = await enter(customPairOf({ durationMs: 0, delayMs }));
    await waitUntil(entered, delayMs / 2);
    for (const track of customTracks) {
      const { native, frame } = await readPair(entered, track);
      expect(isNear(native.shown, track.from)).toBe(true);
      expect(isNear(frame.model, track.from)).toBe(true);
      expect(native.keys).toBe(customTracks.length);
    }
    expect(callbacks.length).toBe(0);
    const startEvents = await takeTraceOfPair(entered);
    expect(summarize(startEvents.native.filter(isHostEvent))).toBe(
      startOf(customTracks)
    );

    await waitUntil(entered, delayMs + 300);
    for (const track of customTracks) {
      const { native, frame } = await readPair(entered, track);
      expect(isNear(native.shown, track.to)).toBe(true);
      expect(isNear(frame.model, track.to)).toBe(true);
      expect(native.keys).toBe(0);
    }
    const endEvents = await takeTraceOfPair(entered);
    expect(summarizeEnd(endEvents.native)).toBe(endOf(customTracks));
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  test('no duration and no delay ends each track with the admission and shows the model', async () => {
    const entered = await enter(customPairOf({ durationMs: 0 }));
    await wait(200);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      `${startOf(customTracks)} > ${endOf(customTracks)}`
    );
    for (const track of customTracks) {
      const { native, frame } = await readPair(entered, track);
      expect(isNear(native.shown, track.to)).toBe(true);
      expect(isNear(frame.model, track.to)).toBe(true);
      expect(native.keys).toBe(0);
    }
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  test('a negative delay starts the track at once', async () => {
    const played = await playCase(
      'FadeIn with a negative delay',
      referenceOf(FADE, { delayMs: -500 })
    );
    expectPlayedToEnd(played, [OPACITY], ENTER_DURATION);
    await render(null);
  });

  test('a view in views that React flattens starts natively on its own tag', async () => {
    const { pairOf, tracks } = CASES.SlideInLeft;
    const entered = await enter({ ...pairOf(), isInFlattenedViews: true });
    const reads = await sampleAt(
      entered,
      [SLIDE_KEY],
      [FIRST_FRAMES_MS, 0.5 * ENTER_DURATION]
    );
    await waitUntil(entered, ENTER_DURATION + 300);
    const events = await takeTraceOfPair(entered);
    expect(summarizeEnd(events.native)).toBe(startAndEndOf(tracks));
    expectNativeOnTimeline(
      'a view in views that React flattens',
      events.native,
      entered,
      [SLIDE_KEY],
      reads
    );
    expectFramesOnTimeline(['frame'], builtOf([SLIDE_KEY]));
    await render(null);
  });

  test('reduced motion on the builder starts no native command', async () => {
    const reducedMotion = (name: string) => ({
      entering: new FadeIn()
        .duration(ENTER_DURATION)
        .easing(Easing.linear)
        .reduceMotion(ReduceMotion.Always)
        .withCallback(callbackOf(name)),
    });
    const entered = await enter({
      native: reducedMotion('native'),
      frame: reducedMotion('frame'),
    });
    const first = await readTrack(entered.nativeTag, OPACITY);
    await wait(200);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native)).toBe(
      'LayoutBuildFailed:UnsupportedTiming'
    );
    expect(first.keys).toBe(0);
    expect(isNear(first.shown, 1)).toBe(true);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  test('a view that enters in a Modal on screen starts natively and agrees with the frame driver', async () => {
    const entered = await enter(fadePairOf(), ModalPair);
    const reads = await sampleAt(entered, [FADE_KEY], [0.5 * ENTER_DURATION]);
    await waitUntil(entered, ENTER_DURATION + 300);
    const events = await takeTraceOfPair(entered);
    expect(summarizeEnd(events.native)).toBe(startAndEndOf([OPACITY]));
    expectNativeOnTimeline(
      'a view that enters in a Modal on screen',
      events.native,
      entered,
      [FADE_KEY],
      reads
    );
    expectFramesOnTimeline(['frame'], builtOf([FADE_KEY]));
    expect(isNear((await readTrack(entered.nativeTag, OPACITY)).shown, 1)).toBe(
      true
    );
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
    await wait(300);
  });
});

describe('native layout entering in new ancestors', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const DURATION = 1000;

  /**
   * Both boxes are frame-driven, and the native route made no build: each frame
   * of the two boxes is on the declared timeline, and each callback comes no
   * more than one display frame before the declared end, from the computed
   * start of its box.
   */
  async function expectFrameDrivenPair(
    entered: Entered,
    enteringCase: EnteringCase,
    timing: Timing = {}
  ) {
    const { tracks } = enteringCase;
    const { durationMs = DURATION, delayMs = 0 } = timing;
    if (delayMs > 0) {
      await waitUntil(entered, delayMs / 2);
      for (const track of tracks) {
        const { native, frame } = await readPair(entered, track);
        expect(isNear(native.model, track.from)).toBe(true);
        expect(isNear(frame.model, track.from)).toBe(true);
      }
    }
    await waitUntil(entered, delayMs + durationMs / 2);
    for (const track of tracks) {
      expect((await readTrack(entered.nativeTag, track)).keys).toBe(0);
    }

    expect(await waitForCallbacks(['frame:true', 'native:true'])).toBe('');
    for (const track of tracks) {
      const { native, frame } = await readPair(entered, track);
      expect(isNear(native.model, track.to)).toBe(true);
      expect(isNear(frame.model, track.to)).toBe(true);
      expect(native.keys).toBe(0);
    }
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native)).toBe(START_REFUSED);
    expect(events.native[0].layoutAnimationType).toBe('Entering');
    expect(summarize(events.frame)).toBe(START_REFUSED);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    const boxes = ['native', 'frame'];
    const residuals = expectFramesOnTimeline(
      boxes,
      builtKeysOf(enteringCase, { durationMs, delayMs })
    );
    for (const box of boxes) {
      expect(
        callbackTimeOf(box).emittedMs - frameStartOf(residuals, box) >
          delayMs + durationMs - FRAME_MS
      ).toBe(true);
    }
  }

  for (const [caseName, enteringCase] of Object.entries(CASES)) {
    for (const timing of [
      { durationMs: DURATION },
      { durationMs: 600, delayMs: 500 },
    ]) {
      const delay =
        timing.delayMs === undefined
          ? 'no delay'
          : `a delay of ${timing.delayMs} ms`;
      test(`${caseName} with ${delay} in a Modal that mounts in the same commit is frame-driven: TargetUnavailable`, async () => {
        const entered = await enter(
          countedPairOf(enteringCase.pairOf(timing)),
          PairInNewModal
        );
        await expectFrameDrivenPair(entered, enteringCase, timing);
        expect(namedBuilderCalls.slice().sort().join()).toBe('frame,native');
        await render(null);
        await wait(300);
      });
    }
  }

  test('a view under two new views starts natively and agrees with the frame driver', async () => {
    const entered = await enter(fadePairOf(), PairInNewViews);
    const reads = await sampleAt(
      entered,
      [FADE_KEY],
      [FIRST_FRAMES_MS, 0.5 * ENTER_DURATION]
    );
    await waitUntil(entered, ENTER_DURATION + 300);
    const events = await takeTraceOfPair(entered);
    expect(summarizeEnd(events.native)).toBe(startAndEndOf([OPACITY]));
    expectNativeOnTimeline(
      'a view under two new views',
      events.native,
      entered,
      [FADE_KEY],
      reads
    );
    expectFramesOnTimeline(['frame'], builtOf([FADE_KEY]));
    const end = await readTrack(entered.nativeTag, OPACITY);
    expect(isNear(end.shown, 1)).toBe(true);
    expect(end.keys).toBe(0);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  test('a view in a new ScrollView is frame-driven: TargetUnavailable', async () => {
    const timing = { durationMs: DURATION };
    const entered = await enter(fadePairOf(timing), PairInNewScrollView);
    await expectFrameDrivenPair(entered, FADE, timing);
    await render(null);
  });

  test('a view that enters in a mounted view with no window is frame-driven: TargetUnavailable', async () => {
    const timing = { durationMs: DURATION };
    const entered = await enter(fadePairOf(timing), PairInClippedView);
    await expectFrameDrivenPair(entered, FADE, timing);
    await render(null);
  });

  for (const isNew of [false, true]) {
    for (const areBoxesClipped of [false, true]) {
      const place = areBoxesClipped ? 'out of' : 'in';
      const view = isNew ? 'a new view' : 'a mounted view';
      test(`a view ${place} the clip rectangle of ${view} that removes its clipped subviews is frame-driven: TargetUnavailable`, async () => {
        const timing = { durationMs: DURATION };
        const entered = await enter(
          fadePairOf(timing),
          pairInClippingViewOf({ isNew, areBoxesClipped })
        );
        await expectFrameDrivenPair(entered, FADE, timing);
        await render(null);
      });
    }
  }
});

describe('native layout entering and a later change of the view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const LAYOUT_DURATION = 1000;
  const CHANGE_AT = 0.3 * ENTER_DURATION;
  const MOVE: Track = {
    sampleTarget: 'Position',
    traceTarget: 'PositionX',
    from: centerOf(BOX_LEFT),
    to: centerOf(MOVED_LEFT),
  };
  const layoutOf = (name: string) =>
    new LinearTransition()
      .duration(LAYOUT_DURATION)
      .easing(Easing.linear)
      .withCallback(callbackOf(name));
  const withLayout = ({ native, frame }: Pair): Pair => ({
    native: { ...native, layout: layoutOf('nativeLayout') },
    frame: { ...frame, layout: layoutOf('frameLayout') },
  });
  const LAYOUT_START =
    'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:PositionY > TrackStarted:Width > TrackStarted:Height > Admitted';

  const MOVE_KEY: ScalarKey = {
    ...SLIDE_KEY,
    leaf: { duration: LAYOUT_DURATION },
    from: BOX_LEFT,
    to: MOVED_LEFT,
    base: MOVED_LEFT,
    startsOnScreen: true,
  };

  /** The planned reads of the native box of `keys` in the layout animation. */
  async function moveAt30Percent(
    { native, frame }: Pair,
    keys: ScalarKey[] = [],
    fractions: number[] = []
  ) {
    const pair = {
      native,
      frame: {
        ...frame,
        layout:
          frame.layout &&
          frameRecordedOf('frame', frame.layout as AnimationSource),
      },
    };
    const entered = await enter(pair);
    await waitUntil(entered, CHANGE_AT);
    const enterEvents = (await takeTraceOfPair(entered)).native;
    const moveStartMs = performance.now();
    await render(<EnteringPair {...pair} isMounted left={MOVED_LEFT} />);
    const moved = { ...entered, startMs: moveStartMs };
    const reads = await sampleAt(
      moved,
      keys,
      fractions.map((fraction) => fraction * LAYOUT_DURATION)
    );
    return { entered, moved, enterEvents, reads };
  }

  test('a layout change at 30 % of FadeIn replaces the entering group, and the opacity track continues on its timeline', async () => {
    const { entered, enterEvents, reads } = await moveAt30Percent(
      withLayout(fadePairOf()),
      [FADE_KEY, MOVE_KEY],
      [0.1, 0.25, 0.5, 0.75]
    );
    expect(sortedCallbacks()).toBe('frame:false,native:false');

    await waitUntil(entered, ENTER_DURATION + 300);
    const events = (await takeTraceOfPair(entered)).native;
    expect(
      summarize(
        events
          .filter(isHostEvent)
          .filter(({ event }) => event !== 'TrackEnded' && event !== 'Ended')
      )
    ).toBe(LAYOUT_START);
    expect(pendingStartOf(events).layoutAnimationType).toBe('Layout');
    expectNativeOnTimeline(
      'a layout change at 30 % of FadeIn',
      [...enterEvents, ...events],
      entered,
      [FADE_KEY],
      reads
    );
    expectNativeOnTimeline(
      'a layout change at 30 % of FadeIn',
      events,
      entered,
      [MOVE_KEY],
      reads
    );
    expectFramesOnTimeline(['frame'], builtOf([FADE_KEY, MOVE_KEY]));
    const opacity = await readPair(entered, OPACITY);
    expect(isNear(opacity.native.shown, 1)).toBe(true);
    expect(isNear(opacity.frame.model, 1)).toBe(true);
    const position = await readPair(entered, MOVE);
    expect(isNear(position.native.shown, MOVE.to)).toBe(true);
    expect(position.native.keys).toBe(0);
    expect(sortedCallbacks()).toBe(
      'frame:false,frameLayout:true,native:false,nativeLayout:true'
    );
    await render(null);
  });

  test('a layout change at 30 % of SlideInLeft continues the left edge from the value on screen', async () => {
    const { entered, moved, enterEvents, reads } = await moveAt30Percent(
      withLayout(CASES.SlideInLeft.pairOf()),
      [MOVE_KEY],
      [0.1, 0.25, 0.5, 0.75]
    );
    await waitUntil(moved, LAYOUT_DURATION + 300);
    const events = (await takeTraceOfPair(entered)).native;
    expect(
      summarize(
        events
          .filter(isHostEvent)
          .filter(({ event }) => event !== 'TrackEnded' && event !== 'Ended')
      )
    ).toBe(LAYOUT_START);
    const slide = playedTracksOf(
      [...enterEvents, ...events],
      pendingStartOf(enterEvents),
      entered.clock,
      [SLIDE_KEY]
    );
    expectNativeOnTimeline(
      'a layout change at 30 % of SlideInLeft',
      events,
      entered,
      [MOVE_KEY],
      reads,
      slide
    );
    const captures = capturesOf(events, slide, entered.clock, () => {
      throw new Error('The build of the layout change started no command.');
    });
    expect(captures.length).toBe(1);
    captures.forEach(expectCapturedStart);
    expectFramesOnTimeline(['frame'], builtOf([SLIDE_KEY, MOVE_KEY]));

    const end = await readPair(entered, MOVE);
    expect(isNear(end.native.shown, MOVE.to)).toBe(true);
    expect(isNear(end.frame.model, MOVE.to)).toBe(true);
    expect(end.native.keys).toBe(0);
    expect(sortedCallbacks()).toBe(
      'frame:false,frameLayout:true,native:false,nativeLayout:true'
    );
    await render(null);
  });

  test('a frame change at 30 % of FadeIn on a view with no layout animation shows at once and keeps the entering track', async () => {
    const { entered, moved, enterEvents } = await moveAt30Percent(fadePairOf());
    await waitUntil(moved, 150);
    const position = await readPair(entered, MOVE);
    expect(isNear(position.native.shown, MOVE.to)).toBe(true);
    expect(isNear(position.frame.model, MOVE.to)).toBe(true);
    const opacity = await sampleTargets(entered.nativeTag, ['Opacity']);
    expect((await takeTraceOfPair(entered)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    await waitUntil(entered, ENTER_DURATION + 300);
    const events = (await takeTraceOfPair(entered)).native;
    expectNativeOnTimeline(
      'a frame change at 30 % of FadeIn',
      [...enterEvents, ...events],
      entered,
      [FADE_KEY],
      [{ samples: opacity, opensCycle: true }]
    );
    expectFramesOnTimeline(['frame'], builtOf([FADE_KEY]));
    expect(isNear((await readTrack(entered.nativeTag, OPACITY)).shown, 1)).toBe(
      true
    );
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  test('a commit of the opacity prop during a FadeIn keeps the native track: the native view shows the committed value at its end, and the frame-driven view shows the end value of the animation', async () => {
    const committedOpacity = 0.6;
    const pair = fadePairOf();
    const entered = await enter(pair);
    await waitUntil(entered, 0.2 * ENTER_DURATION);
    const startMs = pendingStartOf(
      (await takeTraceOfPair(entered)).native
    ).monotonicTimeMs;
    await render(
      <EnteringPair {...pair} isMounted style={{ opacity: committedOpacity }} />
    );
    await waitUntil(entered, 0.8 * ENTER_DURATION);
    const playing = await readPair(entered, OPACITY);
    expect(isNear(playing.native.model, committedOpacity)).toBe(true);
    expect(isNear(playing.native.shown, 0.8, 0.06)).toBe(true);
    expect(playing.native.keys).toBe(1);

    await waitUntil(entered, ENTER_DURATION + 300);
    const { native: end, frame: twinEnd } = await readPair(entered, OPACITY);
    expect(end.timeMs - startMs > ENTER_DURATION + 200).toBe(true);
    expect(isNear(end.shown, committedOpacity)).toBe(true);
    expect(end.keys).toBe(0);
    expect(isNear(twinEnd.shown, 1)).toBe(true);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(endOf([OPACITY]));
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });
});

describe('native layout entering and a clip of its view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  /** The times of a clip test, from the first commit. */
  type ClipTimes = { clipMs: number; hiddenMs: number; shownMs: number };

  /**
   * Plays a case whose boxes a scroll clips at `clipMs` and brings back at
   * `hiddenMs`. The React Native runtime has no callback at `shownMs`.
   */
  async function playClip(
    caseName: string,
    referenceCase: ReferenceCase,
    { clipMs, hiddenMs, shownMs }: ClipTimes
  ) {
    const played = await playCase(
      caseName,
      withNoCallbackAt(
        { ...referenceCase, clip: { atMs: clipMs, backAtMs: hiddenMs } },
        shownMs
      )
    );
    expectNoCallbackBefore(played, shownMs);
    return played;
  }

  /** The row of a value that is not near its expected value. */
  const farRow = (
    statement: string,
    value: number,
    expected: number,
    tolerance = VALUE_TOLERANCE
  ) =>
    `${statement}: ${value} is ${Math.abs(value - expected)} from ${expected}, tolerance ${tolerance}`;

  /** The computed start of each record of the frame driver on the native box. */
  const nativeStartsOf = (played: Played) =>
    [...expectFrameRecords(played)].flatMap(([{ record }, { startMs }]) =>
      record.box === 'native' ? [startMs] : []
    );

  /**
   * The platform removed the track of the native box, and the frame driver
   * plays the box to the declared end: the box has no playback key, its model
   * is on the frames of the frame driver (statement M), and those frames are on
   * the timeline that starts less than one display frame from the origin of the
   * native command. Each builder ran one time.
   */
  function expectHandOver(
    caseName: string,
    played: Played,
    track: Track,
    target: ModelTarget,
    totalMs: number
  ) {
    const { events, tracks, clockOffset, frameRecords, endKeys } = played;
    expect(
      summarize(
        events.filter(
          (event) => event.event !== 'FrameUpdateMounted' && isHostEvent(event)
        )
      )
    ).toBe(
      `${startOf([track])} > TrackEnded:${target}:false > Ended:Interrupted:PlatformRemoved`
    );
    expectNoKeyAfterTransfer(played, target);
    expectModelOnFrames(caseName, played, target);
    const originMs = middleOf(tracks[0].origin) - middleOf(clockOffset);
    const starts = nativeStartsOf(played);
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
    expectNoEarlyCallback(played, totalMs);
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
        ? ''
        : `callback gap: the React Native runtime got the callback of the native box at ${callbackTimes.native.toFixed(3)} ms and the callback of the twin at ${callbackTimes.frame.toFixed(3)} ms, ${(callbackTimes.native - callbackTimes.frame).toFixed(3)} ms later, bound ${(4 * FRAME_MS).toFixed(3)} ms`
    ).toBe('');
    for (const box of ['native', 'frame']) {
      expect(frameRecords.filter((record) => record.box === box).length).toBe(
        endKeys.length
      );
    }
  }

  /**
   * The first sample of a target of the native box at or after a time from the
   * origin of its command, with its own time from that origin.
   */
  function sampleFrom(
    { rows, tracks: [{ origin }] }: Played,
    target: ModelTarget,
    fromMs: number
  ) {
    const elapsedOf = ({ monotonicTimeMs }: TargetSample) =>
      monotonicTimeMs - middleOf(origin);
    const taken = rows
      .map(({ row }) => row.native[target])
      .find((each) => elapsedOf(each) >= fromMs);
    if (!taken) {
      throw new Error(
        `The case has no row from ${fromMs} ms after its origin.`
      );
    }
    return { ...taken, elapsedMs: elapsedOf(taken) };
  }

  /** The trace of the native box has only frame updates after a sample. */
  function expectOnlyFrameUpdatesAfter(
    { events }: Played,
    { monotonicTimeMs }: TargetSample
  ) {
    expect(
      summarize(
        events.filter(
          (event) =>
            event.event !== 'FrameUpdateMounted' &&
            event.monotonicTimeMs > monotonicTimeMs
        )
      )
    ).toBe('');
  }

  /**
   * After the transfer, a sample of the native box shows its model: each cell
   * of the presentation is near that cell of the model of the same sample.
   */
  function expectShowsModel(
    { presentation, model, elapsedMs }: ReturnType<typeof sampleFrom>,
    fromMs: number,
    tolerance: number,
    cells = [0]
  ) {
    for (const cell of cells) {
      expect(
        isNear(presentation[cell], model[cell], tolerance)
          ? ''
          : farRow(
              `presentation cell ${cell} against the model of the same sample ${elapsedMs.toFixed(3)} ms after the origin (first row from ${fromMs} ms)`,
              presentation[cell],
              model[cell],
              tolerance
            )
      ).toBe('');
    }
  }

  type ClippedTrack = {
    trackName: string;
    referenceCase: ReferenceCase;
    segments: number;
    /** The parts of the duration at which the clip and the two readings are. */
    clipAt: number;
    hiddenAt: number;
    shownAt: number;
  };
  const clippedTracks: ClippedTrack[] = [
    {
      trackName: 'one segment',
      referenceCase: referenceOf(FADE),
      segments: 1,
      clipAt: 0.15,
      hiddenAt: 0.3,
      shownAt: 0.6,
    },
    {
      trackName: 'the two segments of the default easing',
      referenceCase: referenceOf(
        DEFAULT_EASING_CASES['FadeIn with the default easing']
      ),
      segments: 2,
      clipAt: 0.15,
      hiddenAt: 0.3,
      shownAt: 0.6,
    },
    // Easing.bounce moves slower than its mean speed at the times of the two readings.
    {
      trackName: 'the 22 segments of Easing.bounce',
      referenceCase: referenceOf(FADE, { easing: Easing.bounce }),
      segments: 22,
      clipAt: 0.4,
      hiddenAt: 0.55,
      shownAt: 0.8,
    },
  ];
  for (const track of clippedTracks) {
    const { trackName, referenceCase, segments } = track;
    const testName = `a clip of the view gives its native entering group of ${trackName} to the frame driver: the view shows the value of the frame driver after a scroll back, and the callback gets true one time at the natural end`;
    test(testName, async () => {
      const [clipMs, hiddenMs, shownMs] = [
        track.clipAt,
        track.hiddenAt,
        track.shownAt,
      ].map((part) => part * ENTER_DURATION);
      const played = await playClip(testName, referenceCase, {
        clipMs,
        hiddenMs,
        shownMs,
      });
      expectHandOver(testName, played, OPACITY, 'Opacity', ENTER_DURATION);
      const animated = played.rows
        .map(({ row }) => row.native.Opacity.members)
        .filter((members) => members.length > 0);
      expect(
        animated.length > 0
          ? ''
          : `rows in which the native opacity has an animation: ${animated.length}, not more than 0`
      ).toBe('');
      for (const [{ values }] of animated) {
        expect(values.length - 1).toBe(segments);
      }
      const hidden = sampleFrom(played, 'Opacity', hiddenMs);
      expectOnlyFrameUpdatesAfter(played, hidden);
      expectShowsModel(hidden, hiddenMs, twoFramesOf(OPACITY));
      expectShowsModel(
        sampleFrom(played, 'Opacity', shownMs),
        shownMs,
        twoFramesOf(OPACITY)
      );
      await render(null);
    });
  }

  const SHORT_PART = 0.3;
  const SMALL = 0.4;
  /** The two scales commute, so the value on screen is valid for the two. */
  const TWO_SCALES: ReferenceCase = {
    flow: 'entering',
    leaves: {},
    operations: [
      ['scaleX', SMALL, 1, { duration: SHORT_PART * ENTER_DURATION }],
      ['scaleY', SMALL, 1, { duration: ENTER_DURATION }],
    ],
    places: [undefined, PLACE],
    totalMs: ENTER_DURATION,
  };
  /**
   * The frames that the frame driver gave to an operation of the native box
   * between its start value and its end value.
   */
  const movingFramesOf = ({ frameRecords }: Played, kind: string) =>
    frameRecords
      .filter(({ box, key }) => box === 'native' && key === kind)
      .flatMap(({ frames }) => frames)
      .filter(({ value }) => value !== SMALL && value !== 1);
  const TWO_FRAMES_OF_SCALE =
    0.01 + (2 * FRAME_MS * (1 - SMALL)) / (SHORT_PART * ENTER_DURATION);
  // The frame driver gives its first frame in a display frame after the platform reports the removal.
  const HAND_OVER_FRAMES = 2;
  // The start that a frame gives has the rounding of its progress.
  const SAME_START_MS = 0.01;

  const clipsOfTwoTimelines: [string, number][] = [
    ['while the two operations move', 0.1],
    ['after the end of the shorter operation', 0.45],
  ];
  for (const [caseName, clipAt] of clipsOfTwoTimelines) {
    const testName = `a clip ${caseName} of a transform with two operation timelines gives the track to the frame driver: from the first frame of the frame driver, each operation continues on its own timeline, and the callback gets true one time at the natural end`;
    test(testName, async () => {
      const hiddenMs = (clipAt + 0.12) * ENTER_DURATION;
      const shownMs = (clipAt + 0.3) * ENTER_DURATION;
      const played = await playClip(testName, TWO_SCALES, {
        clipMs: clipAt * ENTER_DURATION,
        hiddenMs,
        shownMs,
      });
      expectHandOver(testName, played, SCALE, 'Transform', ENTER_DURATION);

      const { events, clockOffset } = played;
      const removedAt =
        events.find(({ event }) => event === 'TrackEnded')!.monotonicTimeMs -
        middleOf(clockOffset);
      const moving = movingFramesOf(played, 'scaleY');
      expect(
        moving.length > 0
          ? ''
          : `frames of the frame driver for scaleY of the native box between ${SMALL} and 1: ${moving.length}, not more than 0`
      ).toBe('');
      const firstTime = moving[0].timeMs;
      const firstFrameRow = `first-frame window: the first frame of the frame driver for scaleY is at ${firstTime.toFixed(3)} ms, ${(firstTime - removedAt).toFixed(3)} ms after the removal report at ${removedAt.toFixed(3)} ms, window from ${(-FRAME_MS).toFixed(3)} ms to ${(HAND_OVER_FRAMES * FRAME_MS).toFixed(3)} ms`;
      expect(firstTime > removedAt - FRAME_MS ? '' : firstFrameRow).toBe('');
      expect(
        firstTime < removedAt + HAND_OVER_FRAMES * FRAME_MS ? '' : firstFrameRow
      ).toBe('');
      const starts = nativeStartsOf(played);
      expect(
        Math.max(...starts) - Math.min(...starts) < SAME_START_MS
          ? ''
          : `one start of the two operations: the computed starts of the frame records of the native box are from ${Math.min(...starts)} ms to ${Math.max(...starts)} ms, ${Math.max(...starts) - Math.min(...starts)} ms apart, bound ${SAME_START_MS} ms`
      ).toBe('');
      const movingX = movingFramesOf(played, 'scaleX').length;
      expect(
        movingX > 0 === clipAt < SHORT_PART
          ? ''
          : `frames of the frame driver for scaleX of the native box between ${SMALL} and 1: ${movingX}; the clip is at the part ${clipAt}, the operation ends at the part ${SHORT_PART}`
      ).toBe('');

      expectOnlyFrameUpdatesAfter(
        played,
        sampleFrom(played, 'Transform', hiddenMs)
      );
      for (const fromMs of [hiddenMs, shownMs]) {
        expectShowsModel(
          sampleFrom(played, 'Transform', fromMs),
          fromMs,
          TWO_FRAMES_OF_SCALE,
          [0, 5]
        );
      }
      const end = played.end!.native.Transform;
      expect(end.model[0]).toBe(1);
      expect(end.model[5]).toBe(1);
      await render(null);
    });
  }

  const afterDelayName =
    'a clip of the view after the delay of its native entering group ended: the frame driver continues the animation at the value of its timeline';
  test(afterDelayName, async () => {
    const timing = { durationMs: 1000, delayMs: 500 };
    const played = await playClip(afterDelayName, referenceOf(FADE, timing), {
      clipMs: 800,
      hiddenMs: 1000,
      shownMs: 1250,
    });
    expectHandOver(afterDelayName, played, OPACITY, 'Opacity', 1500);
    const hidden = sampleFrom(played, 'Opacity', 1000);
    expectOnlyFrameUpdatesAfter(played, hidden);
    for (const [sample, fromMs] of [
      [hidden, 1000],
      [sampleFrom(played, 'Opacity', 1250), 1250],
    ] as const) {
      expectShowsModel(sample, fromMs, twoFramesOf(OPACITY, timing.durationMs));
    }
    await render(null);
  });

  const inDelayName =
    'a clip of the view in the delay of its native entering group: the view shows the initial value after a scroll back until the delay ends, then the frame driver plays the animation';
  test(inDelayName, async () => {
    const timing = { durationMs: 1000, delayMs: 1000 };
    const played = await playClip(inDelayName, referenceOf(FADE, timing), {
      clipMs: 200,
      hiddenMs: 400,
      shownMs: 1500,
    });
    expectHandOver(inDelayName, played, OPACITY, 'Opacity', 2000);
    expectOnlyFrameUpdatesAfter(played, sampleFrom(played, 'Opacity', 400));
    for (const elapsedMs of [500, 700, 900]) {
      const delayed = sampleFrom(played, 'Opacity', elapsedMs);
      expect(
        isNear(delayed.presentation[0], 0)
          ? ''
          : farRow(
              `presentation in the delay ${delayed.elapsedMs.toFixed(3)} ms after the origin (first row from ${elapsedMs} ms)`,
              delayed.presentation[0],
              0
            )
      ).toBe('');
    }
    expectShowsModel(
      sampleFrom(played, 'Opacity', 1500),
      1500,
      twoFramesOf(OPACITY, timing.durationMs)
    );
    await render(null);
  });
});

const FIRST_COMMIT_PAIR = {
  native: recordedOf('native', fadePairOf().native),
  frame: recordedOf('frame', fadePairOf().frame),
};

/** The two boxes are in the first render of their surface. */
function FirstCommitPair() {
  return <PairCells {...FIRST_COMMIT_PAIR} isMounted />;
}

describe('native layout entering in the first commit of a surface', () => {
  if (!hasNativeLayoutRoute || !isSecondSurfaceAvailable()) {
    return;
  }

  test('a view in the first commit of a surface whose root view is in a window starts natively and agrees with the frame driver', async () => {
    await takeTrace();
    resetCallbacks();
    resetFrameRecords();
    const startMs = performance.now();
    const surfaceId = await startSecondSurface(FirstCommitPair);
    const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
    const entered = {
      nativeTag: getTestComponent(BOX_REF).getTag(),
      frameTag,
      startMs,
      clock: await narrowClockOffset(frameTag),
    };
    const reads = await sampleAt(
      entered,
      [FADE_KEY],
      [0.25, 0.5, 0.75].map((fraction) => fraction * ENTER_DURATION)
    );
    for (const { samples } of reads) {
      expect(samples.Opacity.playbacks.length).toBe(1);
    }
    expect(callbacks.length).toBe(0);

    await waitUntil(entered, ENTER_DURATION + 300);
    const end = await readTrack(entered.nativeTag, OPACITY);
    expect(isNear(end.shown, 1)).toBe(true);
    expect(end.keys).toBe(0);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      `${startOf([OPACITY])} > ${endOf([OPACITY])}`
    );
    expect(pendingStartOf(events.native).surfaceId).toBe(surfaceId);
    expect(pendingStartOf(events.native).transactionNumber).toBe(1);
    // The twin has no refusal: its start also passed the window rule.
    expect(summarize(events.frame)).toBe('LayoutBuildFailed:UnsupportedTiming');
    expectNativeOnTimeline(
      'a view in the first commit of a surface',
      events.native,
      entered,
      [FADE_KEY],
      reads
    );
    expectFramesOnTimeline(['frame'], builtOf([FADE_KEY]));
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await stopSecondSurface(surfaceId);
    await wait(300);
  });
});

const SHARED_SOURCE_REF = 'NativeLayoutEnteringSharedSource';
const SHARED_TRANSITION = SharedTransition.duration(600);

function SharedSource({ entering }: Pick<AnimatedViewProps, 'entering'>) {
  const ref = useTestRef(SHARED_SOURCE_REF);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag="native-layout-entering"
      sharedTransitionStyle={SHARED_TRANSITION}
      entering={entering}
      style={styles.box}
    />
  );
}

/** The commit that shows the target hides the source, which stays mounted. */
function SharedScreens({
  entering,
  hasSource,
  showsTarget,
}: Pick<AnimatedViewProps, 'entering'> & {
  hasSource: boolean;
  showsTarget: boolean;
}) {
  return (
    <View style={localStyles.sharedScreens}>
      <Clock />
      <SharedTransitionBoundary isActive={!showsTarget}>
        {hasSource && <SharedSource entering={entering} />}
      </SharedTransitionBoundary>
      {showsTarget && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="native-layout-entering"
            sharedTransitionStyle={SHARED_TRANSITION}
            style={[styles.box, localStyles.sharedTarget]}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

describe('native layout entering of a view that a shared transition hides', () => {
  if (
    !hasNativeLayoutRoute ||
    !getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')
  ) {
    return;
  }

  test('a shared transition that hides a view at 30 % of FadeIn ends the native track, the view shows no opacity, and the callback comes at the end of the entering animation', async () => {
    const { native, frame } = fadePairOf();
    const pair = { native, frame: recordedOf('frame', frame) };
    for (const route of ['native', 'frame'] as const) {
      const { entering } = pair[route];
      const screens = (hasSource: boolean, showsTarget: boolean) => (
        <SharedScreens
          entering={entering}
          hasSource={hasSource}
          showsTarget={showsTarget}
        />
      );
      resetFrameRecords();
      await render(screens(false, false));
      await wait(300);
      const clock = await narrowClockOffset(
        getTestComponent(CLOCK_REF).getTag()
      );
      await takeTrace();
      resetCallbacks();
      const startMs = performance.now();
      await render(screens(true, false));
      const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
      await waitUntil({ startMs }, 0.3 * ENTER_DURATION);
      const before = await readTrack(tag, OPACITY);
      expect(before.keys).toBe(route === 'native' ? 1 : 0);
      expect(isNear(before.shown, 0.3, 0.1)).toBe(true);
      const startEvents = (await takeTrace()).filter(
        (event) => event.tag === tag
      );
      await render(screens(true, true));

      for (const fraction of [0.4, 0.5, 0.7, 0.9]) {
        await waitUntil({ startMs }, fraction * ENTER_DURATION);
        const opacity = await readTrack(tag, OPACITY);
        expect(opacity.shown).toBe(0);
        expect(opacity.keys).toBe(0);
      }
      expect(callbacks.length).toBe(0);
      const playbackEvents = (await takeTrace()).filter(
        ({ tag: eventTag, event }) =>
          eventTag === tag && ['TrackEnded', 'Ended'].includes(event)
      );
      expect(summarize(playbackEvents)).toBe(
        route === 'native' ? endOf([OPACITY], false) : ''
      );

      expect(await waitForCallbacks([`${route}:true`])).toBe('');
      expect(callbacks.join()).toBe(`${route}:true`);
      const end = await readTrack(tag, OPACITY);
      expect(end.shown).toBe(0);
      expect(end.keys).toBe(0);
      const animationStartMs =
        route === 'native'
          ? middleOf(
              nativeOriginOf(startEvents, pendingStartOf(startEvents), clock)
            ) - middleOf(clock)
          : frameStartOf(
              expectFramesOnTimeline(['frame'], builtKeysOf(FADE)),
              'frame'
            );
      expect(
        callbackTimeOf(route).emittedMs - animationStartMs >
          ENTER_DURATION - FRAME_MS
      ).toBe(true);
      await render(null);
      await wait(100);
    }
  });
});

describe('entering of a parent and its child in one commit', () => {
  if (!hasNativeAnimationHost) {
    return;
  }

  const DURATION = 1000;
  const PARENT_REF = 'NativeLayoutEnteringParent';
  const CHILD_REF = 'NativeLayoutEnteringChild';

  type Family = { parent: BoxAnimations; child: BoxAnimations };

  const familyOf = (isNative: boolean): Family => {
    const enteringOf = (name: string) => {
      const entering = new FadeIn()
        .duration(DURATION)
        .easing(Easing.linear)
        .withCallback(callbackOf(name));
      return frameRecordedOf(
        name,
        isNative ? entering : frameDrivenOf(entering)
      );
    };
    return {
      parent: { entering: enteringOf('parent') },
      child: { entering: enteringOf('child') },
    };
  };

  function FamilyBoxes({ parent, child }: Family) {
    const parentRef = useTestRef(PARENT_REF);
    const childRef = useTestRef(CHILD_REF);
    return (
      <Animated.View ref={parentRef} {...parent} style={localStyles.parent}>
        <Animated.View ref={childRef} {...child} style={styles.box} />
      </Animated.View>
    );
  }

  function FamilyScene({
    isMounted = false,
    ...family
  }: Family & { isMounted?: boolean }) {
    return (
      <View style={styles.container}>
        {isMounted && <FamilyBoxes {...family} />}
      </View>
    );
  }

  const FAMILY_KEY = { ...FADE_KEY, leaf: { duration: DURATION } };
  const BOXES = { parent: PARENT_REF, child: CHILD_REF };
  const families = {
    'with a linear easing': true,
    'with no native description': false,
  };
  for (const [caseName, isNative] of Object.entries(families)) {
    test(`a parent and its child that enter in one commit ${caseName} both show their initial value first and end at the model`, async () => {
      const family = familyOf(isNative);
      resetFrameRecords();
      await render(<FamilyScene {...family} />);
      await wait(300);
      await takeTrace();
      resetCallbacks();
      const startMs = performance.now();
      await render(<FamilyScene {...family} isMounted />);
      const tags = Object.values(BOXES).map((refName) =>
        getTestComponent(refName).getTag()
      );
      const reads: PlannedRead[][] = tags.map(() => []);
      for (const elapsedMs of [FIRST_FRAMES_MS, 0.5 * DURATION]) {
        await waitUntil({ startMs }, elapsedMs);
        for (const [index, tag] of tags.entries()) {
          reads[index].push({
            samples: await sampleTargets(tag, ['Opacity']),
            opensCycle: true,
          });
        }
      }
      expect(callbacks.length).toBe(0);

      await waitUntil({ startMs }, DURATION + 300);
      for (const tag of tags) {
        const { shown, model, keys } = await readTrack(tag, OPACITY);
        expect(isNear(shown, 1)).toBe(true);
        expect(isNear(model, 1)).toBe(true);
        expect(keys).toBe(0);
      }
      expect(sortedCallbacks()).toBe('child:true,parent:true');
      if (isNative && hasNativeLayoutRoute) {
        const clock = await narrowClockOffset(tags[0]);
        const events = await takeTrace();
        tags.forEach((tag, index) => {
          expectNativeOnTimeline(
            `a parent and its child, the ${Object.keys(BOXES)[index]}`,
            events.filter((event) => event.tag === tag),
            { clock },
            [FAMILY_KEY],
            reads[index]
          );
        });
      } else {
        expectFramesOnTimeline(Object.keys(BOXES), builtOf([FAMILY_KEY]));
      }
      await render(null);
    });
  }
});
