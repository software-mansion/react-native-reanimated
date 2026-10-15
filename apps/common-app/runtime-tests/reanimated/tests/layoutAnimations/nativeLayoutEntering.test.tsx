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
import { Dimensions } from 'react-native';
import type {
  ComplexAnimationBuilder,
  EasingFunction,
  EntryAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeIn,
  SlideInLeft,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  ModelTarget,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  expectFrameRecords,
  expectModelOnFrames,
  expectNoKeyAfterTransfer,
  expectReference,
  play,
} from './nativeLayoutReferencePlay';
import type { Leaf, TargetSample, Track } from './nativeLayoutTestKit';
import {
  callbackOf,
  callbacks,
  callbackTimeOf,
  callbackTimes,
  centerOf,
  FRAME_MS,
  hasNativeLayoutRoute,
  isHostEvent,
  middleOf,
  frameDrivenOf,
  DEFAULT_EASING,
  summarize,
  summarizeEnd,
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

const ENTER_DURATION = 2000;
const BOX_LEFT = 20;
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

const startOf = (tracks: Track[]) =>
  [
    'LayoutStartPending',
    'LayoutStartMounted',
    'Received',
    ...tracks.map(({ traceTarget }) => `TrackStarted:${traceTarget}`),
    'Admitted',
  ].join(' > ');

/** `summarizeEnd` of a native command that played each track to its end. */
const startAndEndOf = (tracks: Track[]) =>
  [
    ...tracks.map(({ traceTarget }) => `TrackEnded:${traceTarget}:true`),
    startOf(tracks),
    'Ended:Finished:None',
  ].join(' > ');

// The default easing moves by no more than two times its mean speed.
const rangeOf = ({ from, to, easing }: Track) =>
  Math.abs(to - from) * (easing ? 2 : 1);

/** The change of the value of a track in two display frames. */
const twoFramesOf = (track: Track, durationMs = ENTER_DURATION) =>
  VALUE_TOLERANCE + (2 * FRAME_MS * rangeOf(track)) / durationMs;

const isNear = (value: number, expected: number, tolerance = VALUE_TOLERANCE) =>
  Math.abs(value - expected) < tolerance;

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

describe('native layout entering', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, enteringCase] of Object.entries(TIMELINE_CASES)) {
    const { pairOf, tracks } = enteringCase;

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
  }
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
});
