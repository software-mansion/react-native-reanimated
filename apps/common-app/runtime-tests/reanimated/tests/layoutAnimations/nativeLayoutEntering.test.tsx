import type { ComponentRef } from 'react';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Dimensions, Modal, ScrollView, StyleSheet, View } from 'react-native';
import type {
  ComplexAnimationBuilder,
  EasingFunction,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
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
import type { TraceEvent, Track, TrackReading } from './nativeLayoutTestKit';
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
  hasTargetSamples,
  isHostEvent,
  readTrack,
  recordedCurveOf,
  recordedLinearOf,
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

type EnteringCase = {
  pairOf: (timing?: Timing) => Pair;
  tracks: Track[];
};

const CLOCK_REF = 'NativeLayoutEnteringClock';
const ENTER_DURATION = 2000;
const BOX_LEFT = 20;
const MOVED_LEFT = 120;
const WINDOW_WIDTH = Dimensions.get('window').width;
const CUSTOM_OPACITY = 0.2;
const CUSTOM_OFFSET = -80;
const VALUE_TOLERANCE = 0.01;
// The presentation layer has a new animation only after the first display frame of its commit.
const FIRST_FRAMES_MS = 3 * FRAME_MS;

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
 * The native box has a linear easing; an easing with no native form keeps its
 * twin frame-driven.
 */
const presetPairOf =
  (create: () => ComplexAnimationBuilder) =>
  (timing: Timing = {}): Pair => ({
    native: {
      entering: timed(create(), timing)
        .easing(Easing.linear)
        .withCallback(callbackOf('native')),
    },
    frame: {
      entering: timed(create(), timing)
        .easing(recordedLinearOf(timing.durationMs ?? ENTER_DURATION))
        .withCallback(callbackOf('frame')),
    },
  });

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
    entering: customEnteringOf(
      'frame',
      recordedLinearOf(timing.durationMs ?? ENTER_DURATION),
      timing
    ),
  },
});

const fadePairOf = presetPairOf(() => new FadeIn());

const CASES: Record<string, EnteringCase> = {
  FadeIn: { pairOf: fadePairOf, tracks: [OPACITY] },
  SlideInLeft: {
    pairOf: presetPairOf(() => new SlideInLeft()),
    tracks: [SLIDE],
  },
  ZoomIn: { pairOf: presetPairOf(() => new ZoomIn()), tracks: [SCALE] },
  'a custom function': {
    pairOf: customPairOf,
    tracks: [
      { ...OPACITY, from: CUSTOM_OPACITY },
      { ...SLIDE, from: centerOf(BOX_LEFT) + CUSTOM_OFFSET },
    ],
  },
};

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

const scrollRef = React.createRef<ComponentRef<typeof ScrollView>>();
const CLIPPED_OFFSET = 1500;
const scrollTo = (y: number) =>
  scrollRef.current?.scrollTo({ y, animated: false });

/**
 * The boxes mount in a view in a window. A scroll to `CLIPPED_OFFSET` takes
 * that view out of the window.
 */
function PairInViewToClip(pair: PairProps) {
  return (
    <View>
      <Clock />
      <ClippingScrollView scrollRef={scrollRef} style={localStyles.scroll}>
        <View collapsable={false}>
          <PairCells {...pair} />
        </View>
        <View style={localStyles.scrollFiller} />
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

const builderCalls: string[] = [];
function recordBuilderCall(name: string) {
  builderCalls.push(name);
}

type EnteringFunction = (
  values: EntryAnimationsValues
) => ReturnType<EntryExitAnimationFunction>;

/** The animation of `entering`, with a record of each call of its builder. */
const countedOf = (name: string, entering: BoxAnimations['entering']) => {
  const build = (
    typeof entering === 'function'
      ? entering
      : (entering as ComplexAnimationBuilder).build()
  ) as EnteringFunction;
  return (values: EntryAnimationsValues) => {
    'worklet';
    scheduleOnRN(recordBuilderCall, name);
    return build(values);
  };
};

const countedPairOf = ({ native, frame }: Pair): Pair => ({
  native: { entering: countedOf('native', native.entering) },
  frame: { entering: countedOf('frame', frame.entering) },
});

type Entered = {
  nativeTag: number;
  frameTag: number;
  /** The time of the sample clock minus the time of the animation clock. */
  clockOffset: number;
  startMs: number;
};

/** Mounts the scene with no box, then the two boxes in one commit. */
async function enter(
  pair: PairProps,
  Scene: React.ComponentType<PairProps> = EnteringPair
): Promise<Entered> {
  await render(<Scene {...pair} />);
  await wait(300);
  const clock = await sampleClockOffset(getTestComponent(CLOCK_REF).getTag());
  await takeTrace();
  callbacks.length = 0;
  builderCalls.length = 0;
  const startMs = performance.now();
  await render(<Scene {...pair} isMounted />);
  return {
    nativeTag: getTestComponent(BOX_REF).getTag(),
    frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
    clockOffset: clock.offset,
    startMs,
  };
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

const pendingStartOf = (events: TraceEvent[]) =>
  events.find(({ event }) => event === 'LayoutStartPending')!;

const rangeOf = ({ from, to }: Track) => Math.abs(to - from);

/** The change of the value of a track in two display frames. */
const twoFramesOf = (track: Track, durationMs = ENTER_DURATION) =>
  VALUE_TOLERANCE + (2 * FRAME_MS * rangeOf(track)) / durationMs;

const progressOf = ({ from, to }: Track, value: number) =>
  (value - from) / (to - from);

const valueAt = ({ from, to }: Track, progress: number) =>
  from + (to - from) * Math.min(1, Math.max(0, progress));

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
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, { pairOf, tracks }] of Object.entries(CASES)) {
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
      const entered = await enter(pairOf());
      for (const fraction of [0.25, 0.5, 0.75]) {
        await waitUntil(entered, fraction * ENTER_DURATION);
        for (const track of tracks) {
          const { native, frame } = await readPair(entered, track);
          const twinProgress =
            (native.timeMs - entered.clockOffset - twinStartTime.value) /
            ENTER_DURATION;
          expect(
            Math.abs(progressOf(track, native.shown) - twinProgress) *
              ENTER_DURATION <
              FRAME_MS
          ).toBe(true);
          expect(isNear(native.shown, frame.model, twoFramesOf(track))).toBe(
            true
          );
          expect(native.keys >= tracks.length).toBe(true);
        }
      }
      expect(callbacks.length).toBe(0);
      await takeTrace();

      await waitUntil(entered, ENTER_DURATION + 300);
      for (const track of tracks) {
        const { native, frame } = await readPair(entered, track);
        expect(isNear(native.shown, track.to)).toBe(true);
        expect(isNear(native.model, track.to)).toBe(true);
        expect(isNear(frame.model, track.to)).toBe(true);
        expect(native.keys).toBe(0);
      }
      const events = await takeTraceOfPair(entered);
      expect(summarizeEnd(events.native)).toBe(endOf(tracks));
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      await render(null);
    });

    test(`${caseName} holds its initial value through a delay of 1000 ms, then plays`, async () => {
      const timing = { durationMs: 600, delayMs: 1000 };
      const entered = await enter(pairOf(timing));
      for (const elapsedMs of [250, 500, 750]) {
        await waitUntil(entered, elapsedMs);
        for (const track of tracks) {
          const { native, frame } = await readPair(entered, track);
          expect(isNear(native.shown, track.from)).toBe(true);
          expect(isNear(frame.model, track.from)).toBe(true);
          expect(isNear(native.model, track.to)).toBe(true);
        }
      }
      const { native: startEvents } = await takeTraceOfPair(entered);
      const playStartMs =
        pendingStartOf(startEvents).monotonicTimeMs + timing.delayMs;

      await waitUntil(entered, timing.delayMs + timing.durationMs / 2);
      for (const track of tracks) {
        const { native, frame } = await readPair(entered, track);
        expect(
          isOnTimeline(track, native, playStartMs, timing.durationMs)
        ).toBe(true);
        expect(
          isNear(
            native.shown,
            frame.model,
            twoFramesOf(track, timing.durationMs)
          )
        ).toBe(true);
      }
      expect(callbacks.length).toBe(0);

      await waitUntil(entered, timing.delayMs + timing.durationMs + 300);
      for (const track of tracks) {
        const { native } = await readPair(entered, track);
        expect(isNear(native.shown, track.to)).toBe(true);
        expect(native.keys).toBe(0);
      }
      expect(sortedCallbacks()).toBe('frame:true,native:true');
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
    const exitingOf = (name: string) =>
      new FadeOut()
        .duration(exitDurationMs)
        .easing(Easing.linear)
        .withCallback(callbackOf(name));
    const { native, frame } = fadePairOf();
    const pair = {
      native: { ...native, exiting: exitingOf('nativeExit') },
      frame: { ...frame, exiting: exitingOf('frameExit') },
    };
    const entered = await enter(pair);
    await waitUntil(entered, 0.3 * ENTER_DURATION);
    const beforeExit = await readPair(entered, OPACITY);
    expect(beforeExit.native.shown < 0.4).toBe(true);
    await takeTrace();

    const exitStartMs = performance.now();
    await render(<EnteringPair {...pair} />);
    await wait(Math.max(0, exitStartMs + 200 - performance.now()));
    const exiting = await readPair(entered, OPACITY);
    for (const shown of [exiting.native.shown, exiting.frame.model]) {
      expect(shown > 0.6 && shown < 0.95).toBe(true);
    }
    expect(exiting.native.keys).toBe(1);
    expect(exiting.frame.keys).toBe(0);
    expect(isNear(exiting.native.shown, exiting.frame.model, 0.05)).toBe(true);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Opacity:false > Ended:Interrupted:None > TrackStarted:Opacity > Admitted'
    );
    expect(pendingStartOf(events.native).layoutAnimationType).toBe('Exiting');
    expect(sortedCallbacks()).toBe('frame:false,native:false');

    await wait(exitDurationMs + 200);
    expect(sortedCallbacks()).toBe(
      'frame:false,frameExit:true,native:false,nativeExit:true'
    );
    let hasView = true;
    await readTrack(entered.nativeTag, OPACITY).catch(() => {
      hasView = false;
    });
    expect(hasView).toBe(false);
    await render(null);
  });

  const mismatches = {
    'FadeIn on a view with the style opacity 0.5': {
      pairOf: fadePairOf,
      track: OPACITY,
      style: { opacity: 0.5 },
    },
    'ZoomIn on a view with a style transform': {
      pairOf: CASES.ZoomIn.pairOf,
      track: SCALE,
      style: { transform: [{ scale: 0.8 }] },
    },
  };
  for (const [caseName, { pairOf, track, style }] of Object.entries(
    mismatches
  )) {
    test(`${caseName} stays frame-driven and ends at the end value of its leaf: EndpointMismatch`, async () => {
      const entered = await enter({ ...pairOf(), style });
      await waitUntil(entered, 0.5 * ENTER_DURATION);
      const events = await takeTraceOfPair(entered);
      expect(summarize(events.native)).toBe(
        'LayoutBuildFailed:EndpointMismatch'
      );
      expect(events.native[0].layoutAnimationType).toBe('Entering');
      const middle = await readPair(entered, track);
      expect(middle.native.keys).toBe(0);
      expect(
        isNear(middle.native.model, middle.frame.model, twoFramesOf(track))
      ).toBe(true);
      expect(isNear(middle.native.model, 0.5, 0.1)).toBe(true);

      await waitUntil(entered, ENTER_DURATION + 300);
      const end = await readPair(entered, track);
      expect(isNear(end.native.model, track.to)).toBe(true);
      expect(isNear(end.frame.model, track.to)).toBe(true);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  for (const [easingName, easing] of Object.entries(CURVED_EASINGS)) {
    test(`FadeIn with ${easingName} plays natively on the curve of the frame driver`, async () => {
      const curve = curveOf(easing);
      const entered = await enter({
        native: {
          entering: new FadeIn()
            .duration(ENTER_DURATION)
            .easing(easing)
            .withCallback(callbackOf('native')),
        },
        frame: {
          entering: new FadeIn()
            .duration(ENTER_DURATION)
            .easing(recordedCurveOf(easing, ENTER_DURATION))
            .withCallback(callbackOf('frame')),
        },
      });
      await waitUntil(entered, 100);
      const events = await takeTraceOfPair(entered);
      expect(summarize(events.native.filter(isHostEvent))).toBe(
        startOf([OPACITY])
      );
      expect(summarize(events.frame)).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );

      for (const fraction of [0.25, 0.5, 0.75]) {
        await waitUntil(entered, fraction * ENTER_DURATION);
        const { native, frame } = await readPair(entered, OPACITY);
        const twinTime =
          (native.timeMs - entered.clockOffset - twinStartTime.value) /
          ENTER_DURATION;
        expect(isNear(native.shown, curve(twinTime), 0.02)).toBe(true);
        expect(
          isNear(native.shown, frame.model, 2 * twoFramesOf(OPACITY))
        ).toBe(true);
        expect(isNear(native.shown, fraction, 0.02)).toBe(
          fraction === 0.5 && easingName === 'a Bezier curve'
        );
      }

      await waitUntil(entered, ENTER_DURATION + 300);
      const end = await readTrack(entered.nativeTag, OPACITY);
      expect(isNear(end.shown, 1)).toBe(true);
      expect(end.keys).toBe(0);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  test('a preset with the default easing stays frame-driven: UnsupportedTiming', async () => {
    const durationMs = 400;
    const defaultEasing = (name: string) => ({
      entering: new FadeIn()
        .duration(durationMs)
        .withCallback(callbackOf(name)),
    });
    const entered = await enter({
      native: defaultEasing('native'),
      frame: defaultEasing('frame'),
    });
    await waitUntil(entered, durationMs / 2);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native)).toBe(
      'LayoutBuildFailed:UnsupportedTiming'
    );
    const middle = await readTrack(entered.nativeTag, OPACITY);
    expect(middle.keys).toBe(0);
    expect(middle.model > 0 && middle.model < 1).toBe(true);

    await waitUntil(entered, durationMs + 300);
    expect(isNear((await readTrack(entered.nativeTag, OPACITY)).model, 1)).toBe(
      true
    );
    expect(sortedCallbacks()).toBe('frame:true,native:true');
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
    const entered = await enter(fadePairOf({ delayMs: -500 }));
    await wait(FIRST_FRAMES_MS);
    const first = await readTrack(entered.nativeTag, OPACITY);
    await wait(100);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      startOf([OPACITY])
    );
    expect(
      isOnTimeline(
        OPACITY,
        first,
        pendingStartOf(events.native).monotonicTimeMs
      )
    ).toBe(true);

    await waitUntil(entered, 0.5 * ENTER_DURATION);
    const { native, frame } = await readPair(entered, OPACITY);
    expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(true);
    expect(isNear(native.shown, 0.5, 0.1)).toBe(true);
    await render(null);
  });

  test('a view in views that React flattens starts natively on its own tag', async () => {
    const { pairOf, tracks } = CASES.SlideInLeft;
    const entered = await enter({ ...pairOf(), isInFlattenedViews: true });
    await wait(FIRST_FRAMES_MS);
    const first = await readTrack(entered.nativeTag, SLIDE);
    await wait(100);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(startOf(tracks));
    expect(
      isOnTimeline(SLIDE, first, pendingStartOf(events.native).monotonicTimeMs)
    ).toBe(true);

    await waitUntil(entered, 0.5 * ENTER_DURATION);
    const { native, frame } = await readPair(entered, SLIDE);
    expect(isNear(native.shown, frame.model, twoFramesOf(SLIDE))).toBe(true);
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
    await waitUntil(entered, 0.5 * ENTER_DURATION);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      startOf([OPACITY])
    );
    const { native, frame } = await readPair(entered, OPACITY);
    expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(true);
    expect(isNear(native.shown, 0.5, 0.1)).toBe(true);

    await waitUntil(entered, ENTER_DURATION + 300);
    expect(isNear((await readTrack(entered.nativeTag, OPACITY)).shown, 1)).toBe(
      true
    );
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
    await wait(300);
  });
});

describe('native layout entering in new ancestors', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const DURATION = 1000;

  /** Both boxes are frame-driven, and the native route made no build. */
  async function expectFrameDrivenPair(
    entered: Entered,
    tracks: Track[],
    { durationMs = DURATION, delayMs = 0 }: Timing = {}
  ) {
    if (delayMs > 0) {
      await waitUntil(entered, delayMs / 2);
      for (const track of tracks) {
        const { native, frame } = await readPair(entered, track);
        expect(isNear(native.model, track.from)).toBe(true);
        expect(isNear(frame.model, track.from)).toBe(true);
      }
    }
    for (const fraction of [0.25, 0.5, 0.75]) {
      await waitUntil(entered, delayMs + fraction * durationMs);
      for (const track of tracks) {
        const { native, frame } = await readPair(entered, track);
        expect(native.keys).toBe(0);
        expect(
          isNear(native.model, frame.model, twoFramesOf(track, durationMs))
        ).toBe(true);
        const progress = progressOf(track, native.model);
        expect(progress > 0 && progress < 1).toBe(true);
      }
      expect(callbacks.length).toBe(0);
    }

    await waitUntil(entered, delayMs + durationMs + 300);
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
  }

  for (const [caseName, { pairOf, tracks }] of Object.entries(CASES)) {
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
          countedPairOf(pairOf(timing)),
          PairInNewModal
        );
        await expectFrameDrivenPair(entered, tracks, timing);
        expect(builderCalls.slice().sort().join()).toBe('frame,native');
        await render(null);
        await wait(300);
      });
    }
  }

  test('a view under two new views starts natively and agrees with the frame driver', async () => {
    const entered = await enter(fadePairOf(), PairInNewViews);
    await wait(FIRST_FRAMES_MS);
    const first = await readTrack(entered.nativeTag, OPACITY);
    await waitUntil(entered, 0.5 * ENTER_DURATION);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      startOf([OPACITY])
    );
    expect(
      isOnTimeline(
        OPACITY,
        first,
        pendingStartOf(events.native).monotonicTimeMs
      )
    ).toBe(true);
    const { native, frame } = await readPair(entered, OPACITY);
    expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(true);
    expect(isNear(native.shown, 0.5, 0.1)).toBe(true);

    await waitUntil(entered, ENTER_DURATION + 300);
    const end = await readTrack(entered.nativeTag, OPACITY);
    expect(isNear(end.shown, 1)).toBe(true);
    expect(end.keys).toBe(0);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });

  test('a view in a new ScrollView is frame-driven: TargetUnavailable', async () => {
    const timing = { durationMs: DURATION };
    const entered = await enter(fadePairOf(timing), PairInNewScrollView);
    await expectFrameDrivenPair(entered, [OPACITY], timing);
    await render(null);
  });

  test('a view that enters in a mounted view with no window is frame-driven: TargetUnavailable', async () => {
    const timing = { durationMs: DURATION };
    const entered = await enter(fadePairOf(timing), PairInClippedView);
    await expectFrameDrivenPair(entered, [OPACITY], timing);
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
        await expectFrameDrivenPair(entered, [OPACITY], timing);
        await render(null);
      });
    }
  }
});

describe('native layout entering and a later change of the view', () => {
  if (!hasNativeLayoutStarts) {
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

  async function moveAt30Percent(pair: Pair) {
    const entered = await enter(pair);
    await waitUntil(entered, CHANGE_AT);
    await takeTrace();
    const moveStartMs = performance.now();
    await render(<EnteringPair {...pair} isMounted left={MOVED_LEFT} />);
    return { entered, moved: { ...entered, startMs: moveStartMs } };
  }

  test('a layout change at 30 % of FadeIn replaces the entering group, and the opacity track continues on its timeline', async () => {
    const { entered, moved } = await moveAt30Percent(withLayout(fadePairOf()));
    await waitUntil(moved, 100);
    const events = await takeTraceOfPair(entered);
    expect(summarize(events.native.filter(isHostEvent))).toBe(LAYOUT_START);
    expect(pendingStartOf(events.native).layoutAnimationType).toBe('Layout');
    expect(sortedCallbacks()).toBe('frame:false,native:false');

    for (const fraction of [0.25, 0.5, 0.75]) {
      await waitUntil(moved, fraction * LAYOUT_DURATION);
      const opacity = await readPair(entered, OPACITY);
      expect(
        isNear(opacity.native.shown, opacity.frame.model, twoFramesOf(OPACITY))
      ).toBe(true);
      expect(
        isNear(
          opacity.native.shown,
          (CHANGE_AT + fraction * LAYOUT_DURATION) / ENTER_DURATION,
          0.06
        )
      ).toBe(true);
      const position = await readPair(entered, MOVE);
      expect(
        isNear(
          position.native.shown,
          position.frame.model,
          twoFramesOf(MOVE, LAYOUT_DURATION)
        )
      ).toBe(true);
    }
    expect(callbacks.length).toBe(2);

    await waitUntil(entered, ENTER_DURATION + 300);
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
    const { entered, moved } = await moveAt30Percent(
      withLayout(CASES.SlideInLeft.pairOf())
    );
    const travel: Track = { ...MOVE, from: SLIDE.from };
    for (const fraction of [0.1, 0.25, 0.5, 0.75]) {
      await waitUntil(moved, fraction * LAYOUT_DURATION);
      const { native, frame } = await readPair(entered, MOVE);
      expect(isNear(native.shown, frame.model, twoFramesOf(travel, 1000))).toBe(
        true
      );
      expect(native.shown < MOVE.to).toBe(true);
    }
    const events = await takeTraceOfPair(entered);
    expect(
      summarize(
        events.native
          .filter(isHostEvent)
          .filter(({ event }) => event !== 'TrackEnded' && event !== 'Ended')
      )
    ).toBe(LAYOUT_START);

    await waitUntil(moved, LAYOUT_DURATION + 300);
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
    const { entered, moved } = await moveAt30Percent(fadePairOf());
    await waitUntil(moved, 150);
    const position = await readPair(entered, MOVE);
    expect(isNear(position.native.shown, MOVE.to)).toBe(true);
    expect(isNear(position.frame.model, MOVE.to)).toBe(true);
    const opacity = await readPair(entered, OPACITY);
    expect(
      isNear(opacity.native.shown, opacity.frame.model, twoFramesOf(OPACITY))
    ).toBe(true);
    expect((await takeTraceOfPair(entered)).native.length).toBe(0);
    expect(callbacks.length).toBe(0);

    await waitUntil(entered, ENTER_DURATION + 300);
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
  if (!hasNativeLayoutStarts) {
    return;
  }

  const PLATFORM_REMOVED =
    'TrackEnded:Opacity:false > Ended:Interrupted:PlatformRemoved';

  async function takeTransferTrace(tag: number) {
    const events = (await takeTrace()).filter((event) => event.tag === tag);
    const isFrameUpdate = ({ event }: TraceEvent) =>
      event === 'FrameUpdateMounted';
    return {
      host: summarizeEnd(events.filter((event) => !isFrameUpdate(event))),
      hasFrameUpdate: events.some(isFrameUpdate),
    };
  }

  /**
   * The frame driver has the entering animation of the native box, as it has
   * the one of the twin.
   */
  async function readOnFrameDriver(entered: Entered, durationMs: number) {
    const { native, frame } = await readPair(entered, OPACITY);
    expect(native.keys).toBe(0);
    expect(
      isNear(native.model, frame.model, twoFramesOf(OPACITY, durationMs))
    ).toBe(true);
    return native;
  }

  async function expectTrueAtNaturalEnd(entered: Entered, endMs: number) {
    await waitUntil(entered, endMs + 400);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
    ).toBe(true);
    expect(builderCalls.slice().sort().join()).toBe('frame,native');
    const end = await readTrack(entered.nativeTag, OPACITY);
    expect(isNear(end.shown, 1)).toBe(true);
    expect(end.keys).toBe(0);
    expect((await takeTraceOfPair(entered)).native.length).toBe(0);
    await render(null);
  }

  test('a clip of the view gives its native entering group to the frame driver: the view shows the value of the frame driver after a scroll back, and the callback gets true one time at the natural end', async () => {
    const entered = await enter(countedPairOf(fadePairOf()), PairInViewToClip);
    await waitUntil(entered, 0.15 * ENTER_DURATION);
    const start = await takeTraceOfPair(entered);
    expect(summarize(start.native.filter(isHostEvent))).toBe(
      startOf([OPACITY])
    );
    scrollTo(CLIPPED_OFFSET);
    await waitUntil(entered, 0.3 * ENTER_DURATION);
    const transfer = await takeTransferTrace(entered.nativeTag);
    expect(transfer.host).toBe(PLATFORM_REMOVED);
    expect(transfer.hasFrameUpdate).toBe(true);
    expect(callbacks.length).toBe(0);
    const hidden = await readOnFrameDriver(entered, ENTER_DURATION);
    expect(isNear(hidden.model, 0.3, 0.08)).toBe(true);

    scrollTo(0);
    await waitUntil(entered, 0.6 * ENTER_DURATION);
    const shown = await readOnFrameDriver(entered, ENTER_DURATION);
    expect(isNear(shown.shown, shown.model, twoFramesOf(OPACITY))).toBe(true);
    expect(isNear(shown.shown, 0.6, 0.08)).toBe(true);
    expect(callbacks.length).toBe(0);
    await expectTrueAtNaturalEnd(entered, ENTER_DURATION);
  });

  test('a clip of the view in the delay of its native entering group: the view shows the initial value after a scroll back until the delay ends, then the frame driver plays the animation', async () => {
    const timing = { durationMs: 1000, delayMs: 1000 };
    const entered = await enter(
      countedPairOf(fadePairOf(timing)),
      PairInViewToClip
    );
    await waitUntil(entered, 200);
    const start = await takeTraceOfPair(entered);
    expect(summarize(start.native.filter(isHostEvent))).toBe(
      startOf([OPACITY])
    );
    scrollTo(CLIPPED_OFFSET);
    await waitUntil(entered, 400);
    const transfer = await takeTransferTrace(entered.nativeTag);
    expect(transfer.host).toBe(PLATFORM_REMOVED);
    expect(callbacks.length).toBe(0);

    scrollTo(0);
    await wait(4 * FRAME_MS);
    for (const elapsedMs of [500, 700, 900]) {
      await waitUntil(entered, elapsedMs);
      const delayed = await readOnFrameDriver(entered, timing.durationMs);
      expect(isNear(delayed.shown, 0)).toBe(true);
    }
    await waitUntil(entered, 1500);
    const playing = await readOnFrameDriver(entered, timing.durationMs);
    expect(
      isNear(
        playing.shown,
        playing.model,
        twoFramesOf(OPACITY, timing.durationMs)
      )
    ).toBe(true);
    expect(isNear(playing.shown, 0.5, 0.1)).toBe(true);
    expect(callbacks.length).toBe(0);
    await expectTrueAtNaturalEnd(entered, 2000);
  });
});

const FIRST_COMMIT_PAIR = fadePairOf();

/** The two boxes are in the first render of their surface. */
function FirstCommitPair() {
  return <PairCells {...FIRST_COMMIT_PAIR} isMounted />;
}

describe('native layout entering in the first commit of a surface', () => {
  if (!hasNativeLayoutStarts || !isSecondSurfaceAvailable()) {
    return;
  }

  test('a view in the first commit of a surface whose root view is in a window starts natively and agrees with the frame driver', async () => {
    await takeTrace();
    callbacks.length = 0;
    const startMs = performance.now();
    const surfaceId = await startSecondSurface(FirstCommitPair);
    const entered = {
      nativeTag: getTestComponent(BOX_REF).getTag(),
      frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
      startMs,
    };

    for (const fraction of [0.25, 0.5, 0.75]) {
      await waitUntil(entered, fraction * ENTER_DURATION);
      const { native, frame } = await readPair(entered, OPACITY);
      expect(native.keys).toBe(1);
      expect(isNear(native.shown, frame.model, twoFramesOf(OPACITY))).toBe(
        true
      );
      expect(isNear(native.shown, fraction, 0.1)).toBe(true);
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
    !hasNativeLayoutStarts ||
    !getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')
  ) {
    return;
  }

  test('a shared transition that hides a view at 30 % of FadeIn ends the native track, the view shows no opacity, and the callback comes at the end of the entering animation', async () => {
    const pair = fadePairOf();
    const callbackMs = { native: 0, frame: 0 };
    for (const route of ['native', 'frame'] as const) {
      const { entering } = pair[route];
      const screens = (hasSource: boolean, showsTarget: boolean) => (
        <SharedScreens
          entering={entering}
          hasSource={hasSource}
          showsTarget={showsTarget}
        />
      );
      await render(screens(false, false));
      await wait(300);
      callbacks.length = 0;
      const startMs = performance.now();
      await render(screens(true, false));
      const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
      await waitUntil({ startMs }, 0.3 * ENTER_DURATION);
      const before = await readTrack(tag, OPACITY);
      expect(before.keys).toBe(route === 'native' ? 1 : 0);
      expect(isNear(before.shown, 0.3, 0.1)).toBe(true);
      await takeTrace();
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

      await waitUntil({ startMs }, ENTER_DURATION + 150);
      expect(callbacks.join()).toBe(`${route}:true`);
      const end = await readTrack(tag, OPACITY);
      expect(end.shown).toBe(0);
      expect(end.keys).toBe(0);
      callbackMs[route] = callbackTimes[route] - startMs;
      await render(null);
      await wait(100);
    }
    expect(
      callbackMs.native > ENTER_DURATION &&
        callbackMs.native < ENTER_DURATION + 6 * FRAME_MS
    ).toBe(true);
    expect(Math.abs(callbackMs.native - callbackMs.frame) < 4 * FRAME_MS).toBe(
      true
    );
  });
});

describe('entering of a parent and its child in one commit', () => {
  if (!hasTargetSamples) {
    return;
  }

  const DURATION = 1000;
  const PARENT_REF = 'NativeLayoutEnteringParent';
  const CHILD_REF = 'NativeLayoutEnteringChild';

  type Family = { parent: BoxAnimations; child: BoxAnimations };

  const familyOf = (easingOf: () => EasingFunction): Family => {
    const enteringOf = (name: string) =>
      new FadeIn()
        .duration(DURATION)
        .easing(easingOf())
        .withCallback(callbackOf(name));
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

  const families = {
    'with a linear easing': familyOf(() => Easing.linear),
    'with an easing that has no native form': familyOf(() =>
      recordedLinearOf(DURATION)
    ),
  };
  for (const [caseName, family] of Object.entries(families)) {
    test(`a parent and its child that enter in one commit ${caseName} both show their initial value first and end at the model`, async () => {
      await render(<FamilyScene {...family} />);
      await wait(300);
      callbacks.length = 0;
      const startMs = performance.now();
      await render(<FamilyScene {...family} isMounted />);
      const tags = [PARENT_REF, CHILD_REF].map((refName) =>
        getTestComponent(refName).getTag()
      );
      const readFamily = () =>
        Promise.all(tags.map((tag) => readTrack(tag, OPACITY)));
      const waitUntilElapsed = (elapsedMs: number) =>
        wait(Math.max(0, startMs + elapsedMs - performance.now()));

      await wait(FIRST_FRAMES_MS);
      for (const { shown } of await readFamily()) {
        expect(shown < 0.15).toBe(true);
      }
      await waitUntilElapsed(0.5 * DURATION);
      for (const { shown } of await readFamily()) {
        expect(isNear(shown, 0.5, 0.1)).toBe(true);
      }
      expect(callbacks.length).toBe(0);

      await waitUntilElapsed(DURATION + 300);
      for (const { shown, model, keys } of await readFamily()) {
        expect(isNear(shown, 1)).toBe(true);
        expect(isNear(model, 1)).toBe(true);
        expect(keys).toBe(0);
      }
      expect(sortedCallbacks()).toBe('child:true,parent:true');
      await render(null);
    });
  }
});
