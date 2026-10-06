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
import type { Track } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  callbackTimes,
  centerOf,
  ClippingScrollView,
  CURVED_EASINGS,
  curveOf,
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
  SECOND_BOX_REF,
  styles,
  summarize,
  summarizeEnd,
  takeTrace,
  takeTraceUntilSurfaceClosed,
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

const UNEQUAL_OPACITY: Track = { ...OPACITY, to: CUSTOM_OPACITY };
const UNEQUAL_SLIDE: Track = {
  ...SLIDE,
  to: centerOf(BOX_LEFT) + CUSTOM_OFFSET,
};

/** The leaves of `customExitingOf`, each with its own duration. */
const unequalExitingOf = (
  name: string,
  easing: EasingFunction,
  { opacityMs, originXMs }: { opacityMs: number; originXMs: number }
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

const easedFadePairOf = (
  easing: EasingFunction | EasingFunctionFactory
): Pair => ({
  native: {
    exiting: new FadeOut()
      .duration(EXIT_DURATION)
      .easing(easing)
      .withCallback(callbackOf('native')),
  },
  frame: {
    exiting: frameDrivenOf(
      new FadeOut()
        .duration(EXIT_DURATION)
        .easing(recordedCurveOf(easing, EXIT_DURATION))
        .withCallback(callbackOf('frame'))
    ),
  },
});

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

    test(`${caseName} holds its initial value through a delay of 500 ms, then plays`, async () => {
      const timing = { durationMs: 600, delayMs: 500 };
      const exited = await exit(pairOf(timing));
      for (const elapsedMs of [150, 300, 450]) {
        await waitUntil(exited, elapsedMs);
        for (const track of tracks) {
          const { native, frame } = await readPair(exited, track);
          expect(isNear(native.shown, track.from)).toBe(true);
          expect(isNear(frame.model, track.from)).toBe(true);
          expect(native.keys >= tracks.length).toBe(true);
        }
      }
      expect(callbacks.length).toBe(0);

      await waitUntil(exited, timing.delayMs + timing.durationMs / 2);
      for (const track of tracks) {
        const { native, frame } = await readPair(exited, track);
        expect(
          isNear(
            native.shown,
            frame.model,
            twoFramesOf(track, timing.durationMs)
          )
        ).toBe(true);
        expect(isNear(progressOf(track, native.shown), 0.5, 0.15)).toBe(true);
      }

      await waitUntil(exited, timing.delayMs + timing.durationMs + 300);
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  const unequalTracks: [string, EasingFunction, Track][] = [
    ['one segment', Easing.linear, UNEQUAL_SLIDE],
    [
      'the two segments of the default easing',
      DEFAULT_EASING.curve,
      { ...UNEQUAL_SLIDE, easing: DEFAULT_EASING },
    ],
  ];
  for (const [trackName, easing, slideTrack] of unequalTracks) {
    test(`an exit whose leaves have unequal durations and tracks of ${trackName} gets its callback at the end of the last leaf, and no track stays`, async () => {
      const durations = { opacityMs: 400, originXMs: 1200 };
      const exited = await exit({
        native: { exiting: unequalExitingOf('native', easing, durations) },
        frame: {
          exiting: frameDrivenOf(
            unequalExitingOf(
              'frame',
              recordedCurveOf(easing, durations.originXMs),
              durations
            )
          ),
        },
      });
      await waitUntil(exited, 800);
      const events = await takeTraceOfPair(exited);
      expect(summarize(events.native.filter(isHostEvent))).toBe(
        `${startOf([UNEQUAL_OPACITY, UNEQUAL_SLIDE])} > TrackEnded:Opacity:true`
      );
      const opacity = await readPair(exited, UNEQUAL_OPACITY);
      expect(isNear(opacity.native.shown, CUSTOM_OPACITY)).toBe(true);
      expect(isNear(opacity.frame.model, CUSTOM_OPACITY)).toBe(true);
      const slide = await readPair(exited, UNEQUAL_SLIDE);
      expect(
        isNear(
          slide.native.shown,
          slide.frame.model,
          twoFramesOf(slideTrack, durations.originXMs)
        )
      ).toBe(true);
      expect(callbacks.length).toBe(0);

      await waitUntil(exited, durations.originXMs + 300);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
      ).toBe(true);
      expect(
        callbackTimes.native - exited.startMs > durations.originXMs - FRAME_MS
      ).toBe(true);
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(exited.frameTag)).toBe(false);
      expect(summarizeEnd((await takeTraceOfPair(exited)).native)).toBe(
        'TrackEnded:PositionX:true > Ended:Cancelled:None'
      );
      await render(null);
    });
  }

  for (const [easingName, easing] of Object.entries(CURVED_EASINGS)) {
    test(`FadeOut with ${easingName} plays natively on the curve of the frame driver`, async () => {
      const curve = curveOf(easing);
      const exited = await exit(easedFadePairOf(easing));
      await waitUntil(exited, 100);
      const events = await takeTraceOfPair(exited);
      expect(summarize(events.native.filter(isHostEvent))).toBe(
        startOf([OPACITY])
      );
      expect(summarize(events.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );

      for (const fraction of [0.25, 0.5, 0.75]) {
        await waitUntil(exited, fraction * EXIT_DURATION);
        const { native, frame } = await readPair(exited, OPACITY);
        const twinTime =
          (native.timeMs - exited.clockOffset - twinStartTime.value) /
          EXIT_DURATION;
        expect(isNear(native.shown, 1 - curve(twinTime), 0.02)).toBe(true);
        expect(
          isNear(native.shown, frame.model, 2 * twoFramesOf(OPACITY))
        ).toBe(true);
        expect(isNear(native.shown, 1 - fraction, 0.02)).toBe(
          isNear(curve(fraction), fraction, 0.001)
        );
      }

      await waitUntil(exited, EXIT_DURATION + 300);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.nativeTag)).toBe(false);
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

  for (const [caseName, { pairOf, tracks }] of Object.entries({
    FadeOut: CASES.FadeOut,
    ZoomOut: CASES.ZoomOut,
  })) {
    test(`a view that mounts after a native ${caseName} shows its own props and has no track`, async () => {
      const timing = { durationMs: 400 };
      const pair = pairOf(timing);
      const exited = await exit(pair);
      await waitUntil(exited, 0.8 * timing.durationMs);
      await watchUntilRemoved(exited.nativeTag, tracks);

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
    });
  }

  test('the same key that mounts again at 15 % does not stop the exit of the old view', async () => {
    const durationMs = 1000;
    const pair = fadePairOf({ durationMs });
    const exited = await exit(pair);
    await waitUntil(exited, 0.15 * durationMs);
    await takeTrace();
    await render(<ExitingPair {...pair} />);
    const mounted = pairTags();
    expect(mounted.nativeTag !== exited.nativeTag).toBe(true);
    await wait(100);
    const next = await readTrack(mounted.nativeTag, OPACITY);
    expect(isNear(next.shown, 1)).toBe(true);
    expect(next.keys).toBe(0);

    await waitUntil(exited, 0.5 * durationMs);
    const { native, frame } = await readPair(exited, OPACITY);
    expect(
      isNear(native.shown, frame.model, twoFramesOf(OPACITY, durationMs))
    ).toBe(true);
    expect(isNear(native.shown, 0.5, 0.1)).toBe(true);
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, durationMs + 300);
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(mounted.nativeTag)).toBe(true);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
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
  const transitionOf = (name: string) =>
    new LinearTransition().duration(durationMs).withCallback(callbackOf(name));
  const native = transitionOf('nativeLayout');
  return {
    native: {
      layout: hasDefaultEasing ? native : native.easing(Easing.linear),
    },
    frame: {
      layout: frameDrivenOf(
        transitionOf('frameLayout').easing(
          hasDefaultEasing
            ? recordedCurveOf(DEFAULT_EASING.curve, durationMs)
            : recordedLinearOf(durationMs)
        )
      ),
    },
  };
};

const merged = (first: Pair, second: Pair): Pair => ({
  native: { ...first.native, ...second.native },
  frame: { ...first.frame, ...second.frame },
});

describe('native layout exiting and the other animations of the view', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const LAYOUT_DURATION = 1000;
  const SHORT_EXIT = 1000;
  const layoutPair = () => layoutPairOf(LAYOUT_DURATION);

  test('an exit at 40 % of a native layout animation starts the opacity at 1, and the position track continues', async () => {
    const pair = merged(layoutPair(), fadePairOf({ durationMs: SHORT_EXIT }));
    await render(<ExitingPair {...pair} />);
    await wait(300);
    await render(<ExitingPair {...pair} left={MOVED_LEFT} />);
    await wait(0.4 * LAYOUT_DURATION);
    const exited = await exitOf(
      <ExitingPair {...pair} left={MOVED_LEFT} />,
      <ExitingPair {...pair} left={MOVED_LEFT} isMounted={false} />,
      0
    );
    await waitUntil(exited, 100);
    const events = await takeTraceOfPair(exited);
    const hostEvents = events.native.filter(isHostEvent);
    expect(summarize(hostEvents)).toBe(startOf([OPACITY]));
    expect(hostEvents[0].layoutAnimationType).toBe('Exiting');
    expect(sortedCallbacks()).toBe('frameLayout:false,nativeLayout:false');

    for (const elapsedMs of [250, 450]) {
      await waitUntil(exited, elapsedMs);
      const opacity = await readPair(exited, OPACITY);
      expect(
        isNear(
          opacity.native.shown,
          opacity.frame.model,
          twoFramesOf(OPACITY, SHORT_EXIT)
        )
      ).toBe(true);
      expect(
        isNear(opacity.native.shown, 1 - elapsedMs / SHORT_EXIT, 0.08)
      ).toBe(true);
      const position = await readPair(exited, MOVE);
      expect(
        isNear(
          position.native.shown,
          position.frame.model,
          twoFramesOf(MOVE, LAYOUT_DURATION)
        )
      ).toBe(true);
      expect(position.native.shown < MOVE.to).toBe(true);
      expect(isNear(position.native.model, MOVE.to)).toBe(true);
    }

    await waitUntil(exited, 800);
    const position = await readPair(exited, MOVE);
    expect(isNear(position.native.shown, MOVE.to)).toBe(true);
    expect(isNear(position.frame.model, MOVE.to)).toBe(true);
    expect(callbacks.length).toBe(2);

    await waitUntil(exited, SHORT_EXIT + 300);
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(sortedCallbacks()).toBe(
      'frame:true,frameLayout:false,native:true,nativeLayout:false'
    );
    await render(null);
  });

  const joinedTracks: [string, boolean, ExitingCase['pairOf']][] = [
    ['one segment', false, fadePairOf],
    [
      'the two segments of the default easing',
      true,
      DEFAULT_EASING_CASES['FadeOut with the default easing'].pairOf,
    ],
  ];
  for (const [trackName, hasDefaultEasing, exitPairOf] of joinedTracks) {
    test(`an exit that is shorter than the native layout track of ${trackName} that it joins holds its end value, and the callback comes at the end of that track`, async () => {
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
      const { native, frame } = await readPair(exited, OPACITY);
      expect(isNear(native.shown, 0)).toBe(true);
      expect(isNear(frame.model, 0)).toBe(true);

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
    });
  }

  for (const startsFlat of [false, true]) {
    test(`a parent that ${startsFlat ? 'unflattens' : 'flattens'} during a native exit of its child changes nothing on the exit`, async () => {
      const pair = fadePairOf();
      const exited = await exitOf(
        <PairInParents {...pair} isFlat={startsFlat} />,
        <PairInParents {...pair} isFlat={startsFlat} isMounted={false} />
      );
      await waitUntil(exited, 0.3 * EXIT_DURATION);
      await takeTrace();
      await render(
        <PairInParents {...pair} isFlat={!startsFlat} isMounted={false} />
      );
      await waitUntil(exited, 0.6 * EXIT_DURATION);
      expect((await takeTraceOfPair(exited)).native.length).toBe(0);
      const { native, frame } = await readPair(exited, OPACITY);
      expect(native.keys).toBe(1);
      expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(
        true
      );
      expect(isNear(native.shown, 0.4, 0.08)).toBe(true);
      expect(callbacks.length).toBe(0);

      await waitUntil(exited, EXIT_DURATION + 300);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(exited.frameTag)).toBe(false);
      await render(null);
    });
  }

  test('an animated style that writes the opacity does not show during a native exit', async () => {
    const pair = fadePairOf();
    const exited = await exitOf(
      <StyledPair {...pair} />,
      <StyledPair {...pair} isMounted={false} />,
      100
    );
    for (const fraction of [0.25, 0.5, 0.75]) {
      await waitUntil(exited, fraction * EXIT_DURATION);
      const { native, frame } = await readPair(exited, OPACITY);
      expect(native.keys).toBe(1);
      expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(
        true
      );
      expect(isNear(native.shown, 1 - fraction, 0.08)).toBe(true);
      expect(native.model < STYLE_WRITE_FROM && native.model > 0.8).toBe(true);
    }
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, EXIT_DURATION + 300);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
    await render(null);
  });

  test('a later frame change of the siblings starts nothing on an exiting view', async () => {
    const pair = merged(layoutPair(), fadePairOf());
    const scene = (hasSibling: boolean, isMounted: boolean) => (
      <View>
        {hasSibling && <View style={localStyles.sibling} collapsable={false} />}
        <ExitingPair {...pair} isMounted={isMounted} />
      </View>
    );
    const exited = await exitOf(scene(true, true), scene(true, false));
    await waitUntil(exited, 0.15 * EXIT_DURATION);
    const before = await readPair(exited, MOVE);
    await takeTrace();

    await render(scene(false, false));
    await waitUntil(exited, 0.5 * EXIT_DURATION);
    const events = await takeTraceOfPair(exited);
    expect(events.native.length).toBe(0);
    expect(events.frame.length).toBe(0);
    expect(callbacks.length).toBe(0);
    const after = await readPair(exited, MOVE);
    expect(after.native.shown).toBe(before.native.shown);
    expect(after.frame.model).toBe(before.frame.model);
    const opacity = await readPair(exited, OPACITY);
    expect(
      isNear(opacity.native.shown, opacity.frame.model, twoFramesOf(OPACITY))
    ).toBe(true);

    await waitUntil(exited, EXIT_DURATION + 300);
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
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

const familyExitingOf = (
  create: () => ComplexAnimationBuilder,
  durationMs: number,
  name: string,
  isNative: boolean
) => {
  const exiting = create().duration(durationMs).withCallback(callbackOf(name));
  return isNative
    ? exiting.easing(Easing.linear)
    : frameDrivenOf(exiting.easing(recordedLinearOf(durationMs)));
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
  if (!hasNativeLayoutStarts) {
    return;
  }

  test('the end of the exit of a parent ends the longer exit of its child with false, and both leave together', async () => {
    const families = familiesOf(
      [() => new FadeOut(), 1000],
      [() => new ZoomOut(), 1500]
    );
    await render(<Family {...families} />);
    await wait(300);
    const parents = parentTags();
    const exited = await exitOf(
      <Family {...families} />,
      <Family {...families} hasParents={false} />,
      0
    );
    await waitUntil(exited, 500);
    const child = await readPair(exited, SCALE);
    expect(isNear(child.native.shown, child.frame.model, 0.05)).toBe(true);
    expect(isNear(child.native.shown, 1 - 500 / 1500, 0.08)).toBe(true);
    const parent = await readPair({ ...exited, ...parents }, OPACITY);
    expect(isNear(parent.native.shown, parent.frame.model, 0.05)).toBe(true);
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, 1300);
    expect(sortedCallbacks()).toBe(
      'frameChild:false,frameParent:true,nativeChild:false,nativeParent:true'
    );
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(parents.nativeTag)).toBe(false);
    expect(await hasView(parents.frameTag)).toBe(false);

    await waitUntil(exited, 1800);
    expect(callbacks.length).toBe(4);
    await render(null);
  });

  test('a child with the shorter exit leaves first, and its parent plays to its end', async () => {
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
  });

  test('a parent and its child whose exits end in one frame get the callbacks of the frame driver, and both leave', async () => {
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
  });

  const heldAndPlaying: [string, EasingFunction][] = [
    ['one segment', Easing.linear],
    ['the two segments of the default easing', DEFAULT_EASING.curve],
  ];
  for (const [trackName, easing] of heldAndPlaying) {
    test(`the end of the exit of a parent removes a child whose exit holds one leaf and plays one leaf, with tracks of ${trackName}: false one time`, async () => {
      const childOf = (name: string, childEasing: EasingFunction) =>
        unequalExitingOf(name, childEasing, {
          opacityMs: 300,
          originXMs: 2000,
        });
      const families = {
        native: {
          ...familiesOf([() => new FadeOut(), 1000], [() => new ZoomOut(), 1])
            .native,
          child: { exiting: childOf('nativeChild', easing) },
        },
        frame: {
          ...familiesOf([() => new FadeOut(), 1000], [() => new ZoomOut(), 1])
            .frame,
          child: {
            exiting: frameDrivenOf(
              childOf('frameChild', recordedCurveOf(easing, 2000))
            ),
          },
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
        `${startOf([UNEQUAL_OPACITY, UNEQUAL_SLIDE])} > TrackEnded:Opacity:true`
      );
      const held = await readTrack(exited.nativeTag, UNEQUAL_OPACITY);
      expect(isNear(held.shown, CUSTOM_OPACITY)).toBe(true);
      expect(callbacks.length).toBe(0);

      await waitUntil(exited, 1300);
      expect(sortedCallbacks()).toBe(
        'frameChild:false,frameParent:true,nativeChild:false,nativeParent:true'
      );
      expect(await hasView(exited.nativeTag)).toBe(false);
      expect(await hasView(parents.nativeTag)).toBe(false);
      expect(summarizeEnd((await takeTraceOfPair(exited)).native)).toBe(
        'TrackEnded:PositionX:false > Ended:Cancelled:None'
      );

      await waitUntil(exited, 2400);
      expect(callbacks.length).toBe(4);
      expect((await takeTraceOfPair(exited)).native.length).toBe(0);
      await render(null);
    });
  }

  test('the removal of a parent with no exit does not stop the exit of its child, and the parent stays until the child leaves', async () => {
    const families = familiesOf(undefined, [() => new FadeOut(), 1200]);
    await render(<Family {...families} />);
    await wait(300);
    const parents = parentTags();
    const exited = await exitOf(
      <Family {...families} />,
      <Family {...families} hasChildren={false} />,
      0
    );
    await waitUntil(exited, 300);
    await takeTrace();
    await render(<Family {...families} hasParents={false} />);
    await waitUntil(exited, 700);
    const { native, frame } = await readPair(exited, OPACITY);
    expect(isNear(native.shown, frame.model, 0.05)).toBe(true);
    expect(isNear(native.shown, 1 - 700 / 1200, 0.08)).toBe(true);
    expect(await hasView(parents.nativeTag)).toBe(true);
    expect(await hasView(parents.frameTag)).toBe(true);
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, 1500);
    expect(sortedCallbacks()).toBe('frameChild:true,nativeChild:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(parents.nativeTag)).toBe(false);
    expect(await hasView(parents.frameTag)).toBe(false);
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

describe('native layout exiting and the stop of its tracks', () => {
  if (!hasNativeLayoutStarts) {
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
  async function expectFrameDriverTakesExit(
    exited: Exited,
    showAgain?: () => void
  ) {
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

    showAgain?.();
    await waitUntil(exited, 0.6 * EXIT_DURATION);
    const later = await readModels();
    expect(isNear(later.model, 0.4, 0.08)).toBe(true);
    if (showAgain) {
      expect(isNear(later.shown, later.model, twoFramesOf(OPACITY))).toBe(true);
    }
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

  test('a Modal that goes hidden removes the native tracks: the frame driver plays the exit to its end', async () => {
    const { pair, exited } = await exitUntilStop(ModalPair, countedFadePair());
    await render(<ModalPair {...pair} isMounted={false} isVisible={false} />);
    await expectFrameDriverTakesExit(exited);
  });

  test('a clip of the view removes the native tracks: the frame driver plays the exit, and the view shows again after a scroll back', async () => {
    const { exited } = await exitUntilStop(ClippedPair, countedFadePair());
    scrollTo(CLIPPED_OFFSET);
    await expectFrameDriverTakesExit(exited, () => scrollTo(0));
  });

  test('a clip of an exiting view that has a track of a native layout animation: the frame driver continues the two', async () => {
    const layoutDuration = 2000;
    const exitDuration = 1500;
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
    const transfer = await takeTransferTrace(exited.nativeTag);
    expect(transfer.host).toBe(
      'TrackEnded:Height:false > TrackEnded:Opacity:false > TrackEnded:PositionX:false > TrackEnded:PositionY:false > TrackEnded:Width:false > Ended:Interrupted:PlatformRemoved > Ended:Interrupted:PlatformRemoved'
    );
    expect(transfer.hasFrameUpdate).toBe(true);
    expect(sortedCallbacks()).toBe('frameLayout:false,nativeLayout:false');

    scrollTo(0);
    await waitUntil(exited, 600);
    const opacity = await readPair(exited, OPACITY);
    expect(opacity.native.keys).toBe(0);
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
    expect(callbacks.length).toBe(2);

    await waitUntil(exited, exitDuration + 400);
    expect(sortedCallbacks()).toBe(
      'frame:true,frameLayout:false,native:true,nativeLayout:false'
    );
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(exited.frameTag)).toBe(false);
    await render(null);
    await wait(300);
  });

  test('the end of the exit of a parent after the platform removed the tracks ends the exit of its child with false one time', async () => {
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
    expect((await takeTransferTrace(exited.nativeTag)).host).toBe(
      'TrackEnded:Transform:false > Ended:Interrupted:PlatformRemoved'
    );
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, 1300);
    expect(sortedCallbacks()).toBe(
      'frameChild:false,frameParent:true,nativeChild:false,nativeParent:true'
    );
    expect(await hasView(exited.nativeTag)).toBe(false);
    expect(await hasView(parents.nativeTag)).toBe(false);
    expect(await hasView(parents.frameTag)).toBe(false);

    await waitUntil(exited, 1900);
    expect(callbacks.length).toBe(4);
    const lateEvents = (await takeTrace()).filter(
      ({ tag }) => tag === exited.nativeTag || tag === parents.nativeTag
    );
    expect(lateEvents.length).toBe(0);
    await render(null);
    await wait(300);
  });

  test('the unmount of a Modal does not stop a native exit', async () => {
    const { pair, exited } = await exitUntilStop(ModalScene);
    await render(<ModalScene {...pair} isMounted={false} hasModal={false} />);
    await waitUntil(exited, 0.5 * EXIT_DURATION);
    const { native, frame } = await readPair(exited, OPACITY);
    expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(true);
    expect(isNear(native.shown, 0.5, 0.1)).toBe(true);
    expect((await takeTraceOfPair(exited)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    await waitUntil(exited, EXIT_DURATION + 400);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(await hasView(exited.nativeTag)).toBe(false);
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

  test('the stop of the surface after the platform removed the tracks gives the callback false one time', async () => {
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
    expect(transfer.host).toBe(PLATFORM_REMOVED);
    expect(transfer.hasFrameUpdate).toBe(true);
    expect(callbacks.length).toBe(0);

    await stopSecondSurface(surfaceId);
    await takeTraceUntilSurfaceClosed(surfaceId);
    await wait(500);
    expect(callbacks.join()).toBe('surface:false');
    await wait(EXIT_DURATION);
    expect(callbacks.join()).toBe('surface:false');
    expect(
      (await takeTrace()).filter((event) => event.tag === tag).length
    ).toBe(0);
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
    !hasNativeLayoutStarts ||
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

        await waitUntil({ startMs }, EXIT_DURATION + 300);
        expect(await hasView(tag)).toBe(false);
        expect(callbacks.join()).toBe(`${route}:true`);
        const callbackMs = callbackTimes[route] - startMs;
        expect(
          callbackMs > EXIT_DURATION &&
            callbackMs < EXIT_DURATION + 6 * FRAME_MS
        ).toBe(true);
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
