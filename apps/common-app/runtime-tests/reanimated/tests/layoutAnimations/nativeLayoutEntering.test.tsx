import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Dimensions, View } from 'react-native';
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
import type { Track } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  centerOf,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutStarts,
  readTrack,
  recordedLinearOf,
  sampleClockOffset,
  styles,
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

const builderCalls: string[] = [];

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

const endOf = (tracks: Track[], finished = true) =>
  [
    ...tracks.map(({ traceTarget }) => `TrackEnded:${traceTarget}:${finished}`),
    finished ? 'Ended:Finished:None' : 'Ended:Cancelled:None',
  ].join(' > ');

const rangeOf = ({ from, to }: Track) => Math.abs(to - from);

/** The change of the value of a track in two display frames. */
const twoFramesOf = (track: Track, durationMs = ENTER_DURATION) =>
  VALUE_TOLERANCE + (2 * FRAME_MS * rangeOf(track)) / durationMs;

const progressOf = ({ from, to }: Track, value: number) =>
  (value - from) / (to - from);

const isNear = (value: number, expected: number, tolerance = VALUE_TOLERANCE) =>
  Math.abs(value - expected) < tolerance;

const sortedCallbacks = () => callbacks.slice().sort().join();

describe('native layout entering', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, { pairOf, tracks }] of Object.entries(CASES)) {
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
