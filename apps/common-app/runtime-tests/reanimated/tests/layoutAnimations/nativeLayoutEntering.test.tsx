import type { ComponentRef } from 'react';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
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
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { TraceEvent, Track } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  callbackTimes,
  centerOf,
  ClippingScrollView,
  countedOf,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutStarts,
  isHostEvent,
  namedBuilderCalls,
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

type EnteringCase = {
  pairOf: (timing?: Timing) => Pair;
  tracks: Track[];
};

const CLOCK_REF = 'NativeLayoutEnteringClock';
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
    const durationMs = timing.durationMs ?? ENTER_DURATION;
    const native = timed(create(), timing).withCallback(callbackOf('native'));
    const frame = timed(create(), timing).withCallback(callbackOf('frame'));
    return {
      native: {
        entering: hasDefaultEasing ? native : native.easing(Easing.linear),
      },
      frame: {
        entering: frameDrivenOf(
          frame.easing(
            hasDefaultEasing
              ? recordedCurveOf(DEFAULT_EASING.curve, durationMs)
              : recordedLinearOf(durationMs)
          )
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
    entering: frameDrivenOf(
      customEnteringOf(
        'frame',
        recordedLinearOf(timing.durationMs ?? ENTER_DURATION),
        timing
      )
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

/** The cases whose native box has the tracks of the default easing. */
const DEFAULT_EASING_CASES: Record<string, EnteringCase> = {
  'FadeIn with the default easing': {
    pairOf: presetPairOf(() => new FadeIn(), true),
    tracks: [{ ...OPACITY, easing: DEFAULT_EASING }],
  },
  'SlideInLeft with the default easing': {
    pairOf: presetPairOf(() => new SlideInLeft(), true),
    tracks: [{ ...SLIDE, easing: DEFAULT_EASING }],
  },
  'ZoomIn with the default easing': {
    pairOf: presetPairOf(() => new ZoomIn(), true),
    tracks: [{ ...SCALE, easing: DEFAULT_EASING }],
  },
};

const TIMELINE_CASES = { ...CASES, ...DEFAULT_EASING_CASES };

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

type Counted = Parameters<typeof countedOf>[1];

const countedPairOf = ({ native, frame }: Pair): Pair => ({
  native: { entering: countedOf('native', native.entering as Counted) },
  frame: { entering: countedOf('frame', frame.entering as Counted) },
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
  namedBuilderCalls.length = 0;
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

const isNear = (value: number, expected: number, tolerance = VALUE_TOLERANCE) =>
  Math.abs(value - expected) < tolerance;

const sortedCallbacks = () => callbacks.slice().sort().join();

const localStyles = StyleSheet.create({
  scroll: {
    height: 300,
  },
  scrollFiller: {
    height: 2000,
  },
});

describe('native layout entering', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, { pairOf, tracks }] of Object.entries(TIMELINE_CASES)) {
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
  }
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
    expect(namedBuilderCalls.slice().sort().join()).toBe('frame,native');
    const end = await readTrack(entered.nativeTag, OPACITY);
    expect(isNear(end.shown, 1)).toBe(true);
    expect(end.keys).toBe(0);
    expect((await takeTraceOfPair(entered)).native.length).toBe(0);
    await render(null);
  }

  test('a clip of the view after the delay of its native entering group ended: the frame driver continues the animation at the value of its timeline', async () => {
    const timing = { durationMs: 1000, delayMs: 500 };
    const entered = await enter(
      countedPairOf(fadePairOf(timing)),
      PairInViewToClip
    );
    await waitUntil(entered, 800);
    const start = await takeTraceOfPair(entered);
    expect(summarize(start.native.filter(isHostEvent))).toBe(
      startOf([OPACITY])
    );
    scrollTo(CLIPPED_OFFSET);
    await waitUntil(entered, 1000);
    const transfer = await takeTransferTrace(entered.nativeTag);
    expect(transfer.host).toBe(PLATFORM_REMOVED);
    expect(callbacks.length).toBe(0);
    const hidden = await readOnFrameDriver(entered, timing.durationMs);
    expect(isNear(hidden.model, 0.5, 0.1)).toBe(true);

    scrollTo(0);
    await waitUntil(entered, 1250);
    const shown = await readOnFrameDriver(entered, timing.durationMs);
    expect(isNear(shown.shown, 0.75, 0.1)).toBe(true);
    expect(callbacks.length).toBe(0);
    await expectTrueAtNaturalEnd(entered, 1500);
  });
});
