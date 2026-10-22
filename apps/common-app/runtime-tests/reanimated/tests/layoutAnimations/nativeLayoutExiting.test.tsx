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
import type { Track } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  callbackTimes,
  centerOf,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutStarts,
  isHostEvent,
  readTrack,
  frameDrivenOf,
  recordedCurveOf,
  recordedLinearOf,
  DEFAULT_EASING,
  sampleClockOffset,
  styles,
  summarize,
  summarizeEnd,
  takeTrace,
  twinStartTime,
} from './nativeLayoutTestKit';

type AnimatedViewProps = React.ComponentProps<typeof Animated.View>;
type BoxAnimations = Pick<AnimatedViewProps, 'entering' | 'layout' | 'exiting'>;
type Timing = { durationMs?: number; delayMs?: number };
type Pair = { native: BoxAnimations; frame: BoxAnimations };

type ExitingCase = {
  pairOf: (timing?: Timing) => Pair;
  tracks: Track[];
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
 * The native box has a linear easing, or the default easing when
 * `hasDefaultEasing` is set. Its twin is frame-driven on the same curve.
 */
const presetPairOf =
  (create: () => ComplexAnimationBuilder, hasDefaultEasing = false) =>
  (timing: Timing = {}): Pair => {
    const durationMs = timing.durationMs ?? EXIT_DURATION;
    const native = timed(create(), timing).withCallback(callbackOf('native'));
    const frame = timed(create(), timing).withCallback(callbackOf('frame'));
    return {
      native: {
        exiting: hasDefaultEasing ? native : native.easing(Easing.linear),
      },
      frame: {
        exiting: frameDrivenOf(
          frame.easing(
            hasDefaultEasing
              ? recordedCurveOf(DEFAULT_EASING.curve, durationMs)
              : recordedLinearOf(durationMs)
          )
        ),
      },
    };
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

const customPairOf = (timing: Timing = {}): Pair => ({
  native: { exiting: customExitingOf('native', Easing.linear, timing) },
  frame: {
    exiting: frameDrivenOf(
      customExitingOf(
        'frame',
        recordedLinearOf(timing.durationMs ?? EXIT_DURATION),
        timing
      )
    ),
  },
});

const fadePairOf = presetPairOf(() => new FadeOut());

const zoomPairOf = presetPairOf(() => new ZoomOut());

const CASES: Record<string, ExitingCase> = {
  FadeOut: { pairOf: fadePairOf, tracks: [OPACITY] },
  SlideOutRight: {
    pairOf: presetPairOf(() => new SlideOutRight()),
    tracks: [SLIDE],
  },
  ZoomOut: { pairOf: zoomPairOf, tracks: [SCALE] },
  'a custom function': {
    pairOf: customPairOf,
    tracks: [
      { ...OPACITY, to: CUSTOM_OPACITY },
      { ...SLIDE, to: centerOf(BOX_LEFT) + CUSTOM_OFFSET },
    ],
  },
};

/** The cases whose native box has the tracks of the default easing. */
const DEFAULT_EASING_CASES: Record<string, ExitingCase> = {
  'FadeOut with the default easing': {
    pairOf: presetPairOf(() => new FadeOut(), true),
    tracks: [{ ...OPACITY, easing: DEFAULT_EASING }],
  },
  'SlideOutRight with the default easing': {
    pairOf: presetPairOf(() => new SlideOutRight(), true),
    tracks: [{ ...SLIDE, easing: DEFAULT_EASING }],
  },
  'ZoomOut with the default easing': {
    pairOf: presetPairOf(() => new ZoomOut(), true),
    tracks: [{ ...SCALE, easing: DEFAULT_EASING }],
  },
};

const TIMELINE_CASES = { ...CASES, ...DEFAULT_EASING_CASES };

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

type Exited = {
  nativeTag: number;
  frameTag: number;
  /** The time of the sample clock minus the time of the animation clock. */
  clockOffset: number;
  startMs: number;
};

const pairTags = () => ({
  nativeTag: getTestComponent(BOX_REF).getTag(),
  frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
});

/** Mounts `mounted`, then renders `removed` and gives the views that exit. */
async function exitOf(
  mounted: Scene,
  removed: Scene,
  settleMs = 300
): Promise<Exited> {
  await render(mounted);
  await wait(settleMs);
  const clock = await sampleClockOffset(getTestComponent(CLOCK_REF).getTag());
  const tags = pairTags();
  await takeTrace();
  callbacks.length = 0;
  const startMs = performance.now();
  await render(removed);
  return { ...tags, clockOffset: clock.offset, startMs };
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

async function readPair({ nativeTag, frameTag }: Exited, track: Track) {
  const [native, frame] = await Promise.all([
    readTrack(nativeTag, track),
    readTrack(frameTag, track),
  ]);
  return { native, frame };
}

const hasView = async (tag: number) =>
  (await readIfMounted(tag, OPACITY)) !== undefined;

async function takeTraceOfPair({ nativeTag, frameTag }: Exited) {
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

const sortedCallbacks = () => callbacks.slice().sort().join();

/**
 * Reads the native box until its view left. Gives the progress that each
 * reading showed, with the time of the reading on the sample clock, and the
 * time at which the view was not there.
 */
async function watchUntilRemoved(tag: number, tracks: Track[]) {
  const shown: { progress: number; timeMs: number }[] = [];
  for (;;) {
    const readings = await Promise.all(
      tracks.map((track) => readIfMounted(tag, track))
    );
    if (readings.includes(undefined)) {
      return { shown, removedAtMs: performance.now() };
    }
    tracks.forEach((track, index) => {
      const { shown: value, timeMs } = readings[index]!;
      shown.push({ progress: progressOf(track, value), timeMs });
    });
    await wait(NO_VIEW_POLL_MS);
  }
}

describe('native layout exiting', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, { pairOf, tracks }] of Object.entries(TIMELINE_CASES)) {
    test(`${caseName} plays natively from its initial value, agrees with the frame driver, and holds its end value until the view leaves`, async () => {
      const exited = await exit(pairOf());
      await waitUntil(exited, 100);
      const events = await takeTraceOfPair(exited);
      const hostEvents = events.native.filter(isHostEvent);
      expect(summarize(hostEvents)).toBe(startOf(tracks));
      expect(hostEvents[0].layoutAnimationType).toBe('Exiting');
      expect(
        hostEvents
          .filter(({ event }) => event === 'TrackStarted')
          .every(({ endpointPolicy }) => endpointPolicy === 'HoldWithoutCommit')
      ).toBe(true);
      expect(summarize(events.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );
      expect(events.frame[0].layoutAnimationType).toBe('Exiting');

      for (const fraction of [0.25, 0.5, 0.75]) {
        await waitUntil(exited, fraction * EXIT_DURATION);
        for (const track of tracks) {
          const { native, frame } = await readPair(exited, track);
          const twinProgress =
            (native.timeMs - exited.clockOffset - twinStartTime.value) /
            EXIT_DURATION;
          expect(
            Math.abs(progressOf(track, native.shown) - twinProgress) *
              EXIT_DURATION <
              FRAME_MS
          ).toBe(true);
          expect(isNear(native.shown, frame.model, twoFramesOf(track))).toBe(
            true
          );
          expect(isNear(native.model, track.from)).toBe(true);
          expect(native.keys >= tracks.length).toBe(true);
        }
      }
      expect(callbacks.length).toBe(0);

      await waitUntil(exited, 0.9 * EXIT_DURATION);
      const { shown, removedAtMs } = await watchUntilRemoved(
        exited.nativeTag,
        tracks
      );
      expect(shown.every(({ progress }) => progress > 0.85)).toBe(true);
      expect(
        removedAtMs - callbackTimes.native < 2 * FRAME_MS + NO_VIEW_POLL_MS
      ).toBe(true);
      await wait(200);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.frameTag)).toBe(false);
      const endEvents = await takeTraceOfPair(exited);
      expect(summarizeEnd(endEvents.native)).toBe(playedAndRemoved(tracks));
      const timelineEndMs = Math.max(
        ...endEvents.native
          .filter(({ event }) => event === 'TrackEnded')
          .map(({ monotonicTimeMs }) => monotonicTimeMs)
      );
      // The last display frame before the removal has the report of the timeline end.
      const lastShown = shown.slice(-tracks.length);
      expect(
        lastShown.every(
          ({ progress, timeMs }) =>
            isNear(progress, 1, 0.001) &&
            Math.abs(timeMs - timelineEndMs) < FRAME_MS
        )
      ).toBe(true);
      await render(null);
    });
  }
});
