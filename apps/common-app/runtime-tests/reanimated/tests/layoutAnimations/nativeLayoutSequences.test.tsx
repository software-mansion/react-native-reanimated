/*
 * Method: each test plays its sequence as a case of the player of `native layout reference`. Each sample of
 * the native box is on the declared timeline of its key at its own sample time (statement A), and each
 * frame of the frame-driven twin and of the frame driver on the native box is on a replay of the declared
 * timeline (statement B). A test in which the frame driver takes the native box has statement M for the
 * model of its opacity or of its transform. Each other statement is a trace check, a state check at the
 * end, or a time of an end report or of a callback from the origin of the tracks.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, a row in each
 * phase and around each boundary, how late an end report or a callback of an entering sequence comes, the
 * time of a clip or of a new layout on the timeline, the model of a position that the frame driver took
 * (statement M has the opacity and the transform only). Pixels, a device, and 120 Hz are not tested.
 *
 * Not converted (the old text, `R/trace/STOPPED-TESTS.md`): the test of a new layout of the view of a
 * native sequence, and the 4 tests of a clip of a sequence of scalars. They compare the models of the boxes
 * with the twin or with the declared level at planned times, with their own scene.
 */
import type { ComponentRef } from 'react';
import React, { useEffect } from 'react';
import type { ScrollView } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimation } from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnRN } from 'react-native-worklets';

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
  ModelTarget,
  Place,
  Played as PlayedReference,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  expectModelOnFrames,
  expectNoKeyAfterTransfer,
  expectReference,
  play as playReference,
} from './nativeLayoutReferencePlay';
import type {
  Leaf,
  LeafPart,
  SizeBoxProps,
  TargetSample,
  TimedPart,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbacks,
  callbackTimeOf,
  ClippingScrollView,
  countedOf,
  declaredFrameChangeAt,
  declaredValueAt,
  FIRST_FRAMES_MS,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  frameDriverFrameTime,
  frameTimedOf,
  hasNativeLayoutRoute,
  isHostEvent,
  isNoView,
  layoutBuilderCalls,
  middleOf,
  namedBuilderCalls,
  OPACITY_TOLERANCE,
  POSITION_TOLERANCE,
  REMOVES_TRACKS_OUT_OF_WINDOW,
  recordCallback,
  sample,
  sampleClockOffset,
  SizeBox,
  summarize,
  takeTrace,
  takeTraceUntil,
  waitForCallbacks,
} from './nativeLayoutTestKit';

type BoxName = 'native' | 'frame';
type EntryExit = 'entering' | 'exiting';
type BoxAnimations = Pick<
  React.ComponentProps<typeof Animated.View>,
  EntryExit | 'layout'
>;
type Values = Record<string, number>;
type AnimationFunction = (values: Values) => LayoutAnimation;

/** One part of a sequence of levels. */
type Part = {
  to: number;
  duration: number;
  /** A `withDelay` wrapper of the part. */
  delay?: number;
  /** No value: a linear easing. */
  easing?: 'default';
  /** The part has a callback of its own. */
  hasCallback?: boolean;
};

/**
 * What has the levels of a sequence. `scalars`: the opacity of the box is its
 * level, and its Y is `Y_TRAVEL` under its place at the level 0 and at its
 * place at the level 1. `transform`: the operations `translateY` and `scale` of
 * the box, with `translateY` as that Y and with a scale of `SCALE_AT_ZERO` at
 * the level 0 and of 1 at the level 1.
 */
type Form = 'scalars' | 'transform';
type Sequence = { parts: Part[]; delay?: number; form?: Form };

/** `unit` is the change of the target for a change of 1 of its level. */
type Target = { name: string; unit: number; tolerance: number };

const X_TRAVEL = 200;
const Y_TRAVEL = 100;
const SCALE_AT_ZERO = 0.5;
const PLACE: Place = { left: 30 + X_TRAVEL, top: 10 };
const START_LEVEL: Record<EntryExit, number> = { entering: 0.2, exiting: 1 };
const BOX_SIZE = 50;
const BOX_LEFT = 30 + X_TRAVEL;
const CELL_HEIGHT = BOX_SIZE + Y_TRAVEL + 20;
const TOLERANCE = { opacity: 0.01, points: 0.5, cells: 0.005 };
const TARGETS: Record<Form, Target[]> = {
  scalars: [
    { name: 'opacity', unit: 1, tolerance: TOLERANCE.opacity },
    { name: 'y', unit: Y_TRAVEL, tolerance: TOLERANCE.points },
  ],
  transform: [
    { name: 'scale', unit: 1 - SCALE_AT_ZERO, tolerance: TOLERANCE.cells },
    { name: 'translateY', unit: Y_TRAVEL, tolerance: TOLERANCE.points },
  ],
};
const MAX_PARTS = 6;
const DEFAULT_CURVE = Easing.inOut(Easing.quad);
const CLIPPED_OFFSET = 1500;
// The times of the frame driver are equal to the times of its frames but for the rounding of a number.
const SAME_TIME_MS = 0.01;

const formOf = ({ form = 'scalars' }: Sequence) => form;

const lastOf = <TItem,>(items: TItem[]) => items[items.length - 1];

const mutablesOf = (count: number) =>
  Array.from({ length: count }, () => makeMutable(0));
/** The start of each part of a box on the animation clock, from its easing. */
const partStarts = {
  native: mutablesOf(MAX_PARTS),
  frame: mutablesOf(MAX_PARTS),
};
/**
 * The start of the animation of a box on the animation clock, from the easing
 * of its X.
 */
const origins = { native: makeMutable(0), frame: makeMutable(0) };
/** The time of each frame that the frame driver gave to the X of a box. */
const frameTimes = {
  native: makeMutable<number[]>([]),
  frame: makeMutable<number[]>([]),
};
const callbackTimes = { native: makeMutable(0), frame: makeMutable(0) };

function resetRecords() {
  runOnUISync(() => {
    'worklet';
    for (const record of [
      ...partStarts.native,
      ...partStarts.frame,
      origins.native,
      origins.frame,
      callbackTimes.native,
      callbackTimes.frame,
    ]) {
      record.value = 0;
    }
    frameTimes.native.value = [];
    frameTimes.frame.value = [];
  });
}

function readRecords() {
  return runOnUISync(() => {
    'worklet';
    return {
      frameTime: frameDriverFrameTime.value,
      /** The count of the frames that the frame driver gave to the native box. */
      nativeFrames: frameTimes.native.value.length,
      starts: {
        native: partStarts.native.map((start) => start.value),
        frame: partStarts.frame.map((start) => start.value),
      },
      origins: { native: origins.native.value, frame: origins.frame.value },
      callbackTimes: {
        native: callbackTimes.native.value,
        frame: callbackTimes.frame.value,
      },
    };
  });
}

type Records = ReturnType<typeof readRecords>;

const readNativeFrameTimes = () =>
  runOnUISync(() => {
    'worklet';
    return [...frameTimes.native.value];
  });

/**
 * An easing that writes the start of its animation at each call in a frame of
 * the frame driver. The fit of the easing and the replay of a hand-over call it
 * with no frame.
 */
function recordingOf(
  curve: (progress: number) => number,
  start: { value: number },
  durationMs: number
) {
  return (progress: number) => {
    'worklet';
    const frameTime = global.__frameTimestamp;
    if (frameTime !== undefined) {
      start.value = frameTime - progress * durationMs;
    }
    return curve(progress);
  };
}

/**
 * The linear easing of the X of a box. It writes the start of the animation and
 * the time of each frame of the frame driver. The start of an animation runs
 * one step at the progress 0, which is not a frame.
 */
function clockOf(name: BoxName, durationMs: number) {
  const origin = origins[name];
  const frames = frameTimes[name];
  return (progress: number) => {
    'worklet';
    const frameTime = global.__frameTimestamp;
    if (frameTime !== undefined && progress > 0) {
      origin.value = frameTime - progress * durationMs;
      frames.value.push(frameTime);
    }
    return progress;
  };
}

const curveOf = ({ easing }: Part) =>
  easing === 'default' ? DEFAULT_CURVE : Easing.linear;

/** The declared start of each part, from the start of the animation. */
function declaredStartsOf({ parts, delay = 0 }: Sequence) {
  const starts: number[] = [];
  let time = delay;
  for (const part of parts) {
    time += part.delay ?? 0;
    starts.push(time);
    time += part.duration;
  }
  return starts;
}

function totalOf({ parts, delay = 0 }: Sequence) {
  return parts.reduce(
    (total, part) => total + (part.delay ?? 0) + part.duration,
    delay
  );
}

/**
 * The level at a time from the start of the animation, for parts that start at
 * `starts`. A part with no start time did not start.
 */
function levelAt(
  { parts }: Sequence,
  starts: number[],
  startLevel: number,
  timeMs: number
) {
  const timedParts = parts.map(
    (part, index): TimedPart => ({
      to: part.to,
      startMs: starts[index],
      durationMs: part.duration,
      curve: curveOf(part),
    })
  );
  return declaredValueAt(startLevel, timedParts, timeMs);
}

/** The largest change of the declared level in one display frame around a time. */
function frameChangeAt(sequence: Sequence, startLevel: number, timeMs: number) {
  const starts = declaredStartsOf(sequence);
  return declaredFrameChangeAt(
    (time) => levelAt(sequence, starts, startLevel, time),
    timeMs
  );
}

/**
 * An entering or exiting animation: the targets of the form of the sequence
 * have the sequence, and the X of the box is a linear track over the time of
 * the sequence.
 */
function animationOf(
  name: BoxName,
  sequence: Sequence,
  flow: EntryExit,
  records: boolean
): AnimationFunction {
  const { parts, delay } = sequence;
  const totalMs = totalOf(sequence);
  const startLevel = START_LEVEL[flow];
  const isEntering = flow === 'entering';
  const isTransform = formOf(sequence) === 'transform';
  const hasDefaultEasing = parts.map(
    ({ easing }) => easing === 'default' && !records
  );
  const easings = parts.map((part, index) =>
    records
      ? recordingOf(curveOf(part), partStarts[name][index], part.duration)
      : curveOf(part)
  );
  const clock = records ? clockOf(name, totalMs) : Easing.linear;
  const callbackTime = callbackTimes[name];
  return (values) => {
    'worklet';
    const leafOf = (valueOf: (level: number) => number) => {
      'worklet';
      const animations = parts.map((part, index) => {
        'worklet';
        const config = hasDefaultEasing[index]
          ? { duration: part.duration }
          : { duration: part.duration, easing: easings[index] };
        const timing = part.hasCallback
          ? withTiming(valueOf(part.to), config, () => {
              'worklet';
            })
          : withTiming(valueOf(part.to), config);
        return part.delay === undefined
          ? timing
          : withDelay(part.delay, timing);
      });
      const joined = withSequence(...animations);
      return delay === undefined ? joined : withDelay(delay, joined);
    };
    const restX = isEntering ? values.targetOriginX : values.currentOriginX;
    const restY = isEntering ? values.targetOriginY : values.currentOriginY;
    const yOf = (level: number) => {
      'worklet';
      return restY + (1 - level) * Y_TRAVEL;
    };
    const opacityOf = (level: number) => {
      'worklet';
      return level;
    };
    const translationOf = (level: number) => {
      'worklet';
      return (1 - level) * Y_TRAVEL;
    };
    const scaleOf = (level: number) => {
      'worklet';
      return SCALE_AT_ZERO + level * (1 - SCALE_AT_ZERO);
    };
    return {
      initialValues: {
        ...(isTransform
          ? {
              transform: [
                { translateY: translationOf(startLevel) },
                { scale: scaleOf(startLevel) },
              ],
            }
          : { opacity: startLevel, originY: yOf(startLevel) }),
        originX: isEntering ? restX - X_TRAVEL : restX,
      },
      animations: {
        ...(isTransform
          ? {
              transform: [
                { translateY: leafOf(translationOf) },
                { scale: leafOf(scaleOf) },
              ],
            }
          : { opacity: leafOf(opacityOf), originY: leafOf(yOf) }),
        originX: withTiming(isEntering ? restX : restX - X_TRAVEL, {
          duration: totalMs,
          easing: clock,
        }),
      },
      callback: (finished: boolean) => {
        'worklet';
        callbackTime.value = global._getAnimationTimestamp();
        scheduleOnRN(recordCallback, name, finished, callbackTime.value);
      },
    };
  };
}

const offsetOf = (level: number) => (1 - level) * Y_TRAVEL;
const scaleOf = (level: number) => SCALE_AT_ZERO + level * (1 - SCALE_AT_ZERO);
const levelOf = (level: number) => level;

/** The timings of a sequence for a key that has `valueOf` each level. */
function timingsOf(
  { parts, delay }: Sequence,
  valueOf: (level: number) => number
): Leaf {
  const timings = parts.map(
    (part): LeafPart => ({ ...part, to: valueOf(part.to) })
  );
  const { duration, easing, delay: delayOfLast } = lastOf(timings);
  return {
    via: timings.slice(0, -1),
    duration,
    easing,
    delay: delayOfLast,
    delays: delay === undefined ? undefined : [delay],
  };
}

/**
 * The case of a view that enters or leaves: the targets of the form of the
 * sequence have the sequence, and the X of the box is a linear track over the
 * time of the sequence.
 */
function caseOf(
  sequence: Sequence,
  flow: EntryExit,
  more: Partial<ReferenceCase> = {}
): ReferenceCase {
  const totalMs = totalOf(sequence);
  const isEntering = flow === 'entering';
  const startLevel = START_LEVEL[flow];
  const endLevel = lastOf(sequence.parts).to;
  const endsOf = (valueOf: (level: number) => number) => ({
    initial: valueOf(startLevel),
    to: valueOf(endLevel),
  });
  const originX: Leaf = {
    [isEntering ? 'initial' : 'to']: -X_TRAVEL,
    duration: totalMs,
  };
  const declaration: Pick<ReferenceCase, 'leaves' | 'operations'> =
    formOf(sequence) === 'transform'
      ? {
          leaves: { originX },
          operations: [
            [
              'translateY',
              offsetOf(startLevel),
              offsetOf(endLevel),
              timingsOf(sequence, offsetOf),
            ],
            [
              'scale',
              scaleOf(startLevel),
              scaleOf(endLevel),
              timingsOf(sequence, scaleOf),
            ],
          ],
        }
      : {
          leaves: {
            opacity: { ...timingsOf(sequence, levelOf), ...endsOf(levelOf) },
            originY: { ...timingsOf(sequence, offsetOf), ...endsOf(offsetOf) },
            originX,
          },
        };
  return {
    flow,
    ...declaration,
    places: isEntering ? [undefined, PLACE] : [PLACE, undefined],
    totalMs,
    ...more,
  };
}

/** Plays a case with one builder call of each box for each commit. */
async function playCounted(referenceCase: ReferenceCase) {
  const builderCallsBefore = layoutBuilderCalls.length;
  const played = await playReference(referenceCase);
  const builderCalls = layoutBuilderCalls.slice(builderCallsBefore);
  for (const box of ['native', 'frame']) {
    expect(builderCalls.filter((name) => name === box).length).toBe(
      referenceCase.places.length - 1
    );
  }
  return played;
}

/** `playCounted` with the statements of `expectReference`. */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await playCounted(referenceCase);
  expectReference(caseName, referenceCase, played);
  return played;
}

const scrollRef = React.createRef<ComponentRef<typeof ScrollView>>();
const scrollTo = (y: number) =>
  scrollRef.current?.scrollTo({ y, animated: false });

function SequenceBox({
  refName,
  animations,
  place,
}: {
  refName: string;
  animations: BoxAnimations;
  place?: Place;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[
        localStyles.box,
        place && { marginLeft: place.left, marginTop: place.top },
      ]}
    />
  );
}

type Cell = { refName: string; animations: BoxAnimations };

function Cells({
  cells,
  isMounted,
  place,
}: {
  cells: Cell[];
  isMounted: boolean;
  place?: Place;
}) {
  return (
    <ClippingScrollView scrollRef={scrollRef} style={localStyles.scroll}>
      <View collapsable={false}>
        {cells.map((cell) => (
          <View key={cell.refName} collapsable={false} style={localStyles.cell}>
            {isMounted && <SequenceBox {...cell} place={place} />}
          </View>
        ))}
      </View>
      <View style={localStyles.filler} />
    </ClippingScrollView>
  );
}

type Tags = Record<BoxName, number>;

type Played = {
  sequence: Sequence;
  flow: EntryExit;
  tags: Tags;
  /** The time of the commit that starts the two animations. */
  startMs: number;
  /** For views that leave: the result of `sampleClockOffset` before the start. */
  clockOffset?: ClockOffset;
};

type ClockOffset = Awaited<ReturnType<typeof sampleClockOffset>>;

async function play(
  sequence: Sequence,
  flow: EntryExit,
  { nativeRecords = false } = {}
): Promise<Played> {
  resetRecords();
  const animationsOf = (name: BoxName, animation: AnimationFunction) => ({
    [flow]: countedOf(
      name,
      animation as Parameters<typeof countedOf>[1]
    ) as BoxAnimations[EntryExit],
  });
  const cells: Cell[] = [
    {
      refName: BOX_REF,
      // The frame driver gives frames to the native box after a hand-over, also after the end of the twin.
      animations: animationsOf(
        'native',
        frameTimedOf(
          animationOf('native', sequence, flow, nativeRecords) as Parameters<
            typeof frameTimedOf
          >[0]
        ) as unknown as AnimationFunction
      ),
    },
    {
      refName: FRAME_BOX_REF,
      animations: animationsOf(
        'frame',
        frameDrivenOf(
          animationOf('frame', sequence, flow, true) as Parameters<
            typeof frameDrivenOf
          >[0]
        ) as unknown as AnimationFunction
      ),
    },
  ];
  const tagsOf = (): Tags => ({
    native: getTestComponent(BOX_REF).getTag(),
    frame: getTestComponent(FRAME_BOX_REF).getTag(),
  });
  const isEntering = flow === 'entering';
  await render(<Cells cells={cells} isMounted={!isEntering} />);
  await wait(200);
  const tagsBefore = isEntering ? undefined : tagsOf();
  const clockOffset =
    tagsBefore && (await sampleClockOffset(tagsBefore.native));
  await takeTrace();
  callbacks.length = 0;
  namedBuilderCalls.length = 0;
  const startMs = performance.now();
  await render(<Cells cells={cells} isMounted={isEntering} />);
  return { sequence, flow, tags: tagsBefore ?? tagsOf(), startMs, clockOffset };
}

type Row = {
  position: TargetSample;
  /** The opacity or the transform, for the form of the sequence. */
  value: TargetSample;
  twinPosition: TargetSample;
  twinValue: TargetSample;
  records: Records;
  /** The frame driver had a frame during the samples. */
  isTorn: boolean;
  /** How many times the samples were taken again. */
  retakes: number;
  takenAtMs: number;
};

// The frame driver writes the values of the twin in each of its frames. Samples with such a frame between them
// are not of one instant, so they are taken again, 3 times at most. A row that is torn after that has no value of
// the twin: it has only its check against the declared curve.
const ROW_TRIES = 4;

/** No row when a view left. */
async function takeRow(
  { native, frame }: Tags,
  form: Form
): Promise<Row | undefined> {
  const valueTarget = form === 'transform' ? 'Transform' : 'Opacity';
  for (let retakes = 0; ; retakes++) {
    const records = readRecords();
    let samples: TargetSample[];
    try {
      samples = await Promise.all([
        sample(native, 'Position'),
        sample(native, valueTarget),
        sample(frame, 'Position'),
        sample(frame, valueTarget),
      ]);
    } catch {
      return undefined;
    }
    const isTorn = readRecords().frameTime !== records.frameTime;
    if (!isTorn || retakes === ROW_TRIES - 1) {
      const [position, value, twinPosition, twinValue] = samples;
      return {
        position,
        value,
        twinPosition,
        twinValue,
        records,
        isTorn,
        retakes,
        takenAtMs: performance.now(),
      };
    }
  }
}

/** The rows to a time, or to the first row that is `isLast`. */
async function takeRows(
  { tags, sequence }: Played,
  untilMs: number,
  isLast: (row: Row) => boolean = () => false
) {
  const rows: Row[] = [];
  while (performance.now() < untilMs) {
    const row = await takeRow(tags, formOf(sequence));
    if (!row) {
      break;
    }
    rows.push(row);
    if (isLast(row)) {
      break;
    }
  }
  return rows;
}

/**
 * The time of the native tracks at the sample of the position, from the linear
 * X.
 */
function trackTimeOf(
  { sequence, flow }: Played,
  { position }: Pick<Row, 'position'>
) {
  const travelled =
    flow === 'entering'
      ? position.presentation[0] - (position.model[0] - X_TRAVEL)
      : position.model[0] - position.presentation[0];
  return (totalOf(sequence) * travelled) / X_TRAVEL;
}

const SCALE_CELL = 0;
const TRANSLATE_Y_CELL = 13;

/**
 * The level of each target of a form in a layer of a box. `restY` is the Y of
 * the box at the level 1. The presentation layer of a native transform track
 * has the product of its operations in the other order: its translation has the
 * scale.
 */
function levelsOf(
  form: Form,
  position: TargetSample,
  value: TargetSample,
  layer: 'model' | 'presentation',
  restY: number
) {
  if (form === 'scalars') {
    return [value[layer][0], 1 - (position[layer][1] - restY) / Y_TRAVEL];
  }
  const scale = value[layer][SCALE_CELL];
  const translation =
    value[layer][TRANSLATE_Y_CELL] / (layer === 'presentation' ? scale : 1);
  return [
    (scale - SCALE_AT_ZERO) / (1 - SCALE_AT_ZERO),
    1 - translation / Y_TRAVEL,
  ];
}

const largestOf = (values: number[]) => Math.max(0, ...values);

/** The rows in which the native tracks play. */
function playingOf(played: Played, rows: Row[]) {
  const totalMs = totalOf(played.sequence);
  return rows.filter((row) => {
    const timeMs = trackTimeOf(played, row);
    return (
      row.takenAtMs > played.startMs + FIRST_FRAMES_MS &&
      row.position.playbacks.length > 0 &&
      timeMs > 0 &&
      timeMs < totalMs
    );
  });
}

/**
 * The start of the native tracks on the clock of the samples. The presentation
 * layer has the track time of the last display frame, so the sample time minus
 * the track time is the start for a sample at that frame, and more for each
 * later sample.
 */
function originOf(played: Played, playing: Row[]) {
  return Math.min(
    ...playing.map(
      (row) => row.position.monotonicTimeMs - trackTimeOf(played, row)
    )
  );
}

/** The targets of the native tracks, or the events of a start with no command. */
function routeOf(events: TraceEvent[]) {
  const hostEvents = events.filter(
    (event) => isHostEvent(event) && event.event !== 'FrameUpdateMounted'
  );
  const targets = hostEvents
    .filter(({ event }) => event === 'TrackStarted')
    .map(({ target }) => target);
  return hostEvents.some(({ event }) => event === 'Admitted')
    ? targets.sort().join('+')
    : summarize(hostEvents);
}

const NATIVE_ROUTES: Record<Form, string> = {
  scalars: 'Opacity+PositionX+PositionY',
  transform: 'PositionX+Transform',
};
const FINISHED_TRACKS: Record<Form, string> = {
  scalars: 'Opacity:true,PositionX:true,PositionY:true',
  transform: 'PositionX:true,Transform:true',
};

const trackEndsOf = (events: TraceEvent[]) =>
  events
    .filter(({ event }) => event === 'TrackEnded')
    .map(({ target, finished }) => `${target}:${finished}`)
    .sort()
    .join();

const CLIPPED_SEQUENCE: Sequence = {
  parts: [
    { to: 1, duration: 400 },
    { to: 0.3, duration: 600 },
    { to: 1, duration: 400 },
  ],
};
// The clip comes inside the second part, and the view is in the window again before the third part.
const ANDROID_CLIP_AT_MS = 600;
const ANDROID_CLIP_FOR_MS = 300;

const commandEndsOf = (events: TraceEvent[]) =>
  events
    .filter(({ event }) => event === 'Ended')
    .map(({ outcome, reason }) => `${outcome}:${reason}`)
    .join();

// The start of the tracks comes from samples of the linear X.
const ORIGIN_TOLERANCE_MS = 1;

/**
 * The times of the end of the native tracks and of the callbacks, from the
 * origin of the tracks, and the time of the callback of the twin from the start
 * call of its X.
 */
function completionOf({
  tracks,
  events,
  clockOffset,
  frameChecks,
}: PlayedReference) {
  const originMs = middleOf(tracks[0].origin);
  const timesOf = (name: string) =>
    events
      .filter(({ event }) => event === name)
      .map(({ monotonicTimeMs }) => monotonicTimeMs - originMs);
  const emitted = {
    native: callbackTimeOf('native').emittedMs,
    frame: callbackTimeOf('frame').emittedMs,
  };
  const twinStartMs = frameChecks.find(
    ({ record }) => record.box === 'frame' && record.key === 'originX'
  )?.record.start?.timeMs;
  return {
    trackEnds: timesOf('TrackEnded'),
    hostEnds: timesOf('Ended'),
    nativeCallback: emitted.native + middleOf(clockOffset) - originMs,
    twinCallback: emitted.frame + middleOf(clockOffset) - originMs,
    twinEnd: emitted.frame - (twinStartMs ?? NaN),
    clockWidth: clockOffset.to - clockOffset.from,
  };
}

type Completion = ReturnType<typeof completionOf>;

function logCompletion(
  caseName: string,
  totalMs: number,
  completion: Completion,
  events: TraceEvent[]
) {
  const describeTimes = (times: number[]) =>
    times.map((time) => time.toFixed(1)).join(' ');
  console.log(
    [
      'SEQUENCE-END',
      caseName,
      `declared ${totalMs} ms`,
      `track ends ${describeTimes(completion.trackEnds)}`,
      `host end ${describeTimes(completion.hostEnds)}`,
      `native callback ${completion.nativeCallback.toFixed(1)}`,
      `callback of the twin ${completion.twinCallback.toFixed(1)}, ${completion.twinEnd.toFixed(1)} ms after its start`,
      `width of the clock conversion ${completion.clockWidth.toFixed(2)} ms`,
      `events ${summarize(events.filter(isHostEvent))}`,
    ].join(' | ')
  );
}

/** The two times are from two clocks. */
const isAfterTracks = ({ nativeCallback, trackEnds, clockWidth }: Completion) =>
  nativeCallback > Math.max(...trackEnds) - clockWidth;

/**
 * The twin ends in the display frame of the native end when each of its
 * boundaries is at a frame. Its callback is then the first of the two in that
 * frame.
 */
const isNotAfterFrameOfTwin = ({ nativeCallback, twinCallback }: Completion) =>
  nativeCallback - twinCallback < FRAME_MS / 2;

const sortedCallbacks = () => [...callbacks].sort().join();
const sortedBuilderCalls = () => [...namedBuilderCalls].sort().join();

/** The level of each target and the playback keys of a box at rest. */
async function readAtRest(tag: number, form: Form = 'scalars') {
  const [position, value] = await Promise.all([
    sample(tag, 'Position'),
    sample(tag, form === 'transform' ? 'Transform' : 'Opacity'),
  ]);
  const [opacity, yLevel] = levelsOf(
    form,
    position,
    value,
    'presentation',
    position.model[1]
  );
  return {
    levels: [opacity, yLevel],
    opacity,
    yLevel,
    x: position.presentation[0] - position.model[0],
    keys: position.playbacks.length + value.playbacks.length,
  };
}

/** True when each target of a box at rest is at the level 1. */
const isAtEndLevel = (
  { levels }: Awaited<ReturnType<typeof readAtRest>>,
  form: Form
) =>
  TARGETS[form].every(
    ({ unit, tolerance }, index) =>
      Math.abs(levels[index] - 1) * unit < tolerance
  );

const hasLeft = (tag: number) =>
  sample(tag, 'Opacity').then(() => false, isNoView);

const playedTags: Record<string, number> = {};

/** The box of a played case, with a record of the tag of its view. */
function TaggedBox(props: SizeBoxProps) {
  const { refName = BOX_REF } = props;
  useEffect(() => {
    playedTags[refName] = getTestComponent(refName).getTag();
  }, [refName]);
  return <SizeBox {...props} />;
}

/** A target of a view that leaves, with its end value for a model of the view. */
type HeldTarget = {
  name: string;
  tolerance: number;
  endOf: (model: number) => number;
};

/**
 * The samples of each target of a view for a time, or to the time at which the
 * view leaves.
 */
async function sampleUntilGone(
  tag: number,
  targets: HeldTarget[],
  forMs: number
) {
  const reads: TargetSample[][] = [];
  const untilMs = performance.now() + forMs;
  try {
    while (performance.now() < untilMs) {
      reads.push(
        await Promise.all(targets.map(({ name }) => sample(tag, name)))
      );
    }
  } catch (error) {
    if (!isNoView(error)) {
      throw error;
    }
  }
  return reads;
}

/**
 * For each sample of a target from the end report of its track: the distance of
 * the presentation from the end value, in tolerances of the target.
 */
function heldDistancesOf(
  targets: HeldTarget[],
  reads: TargetSample[][],
  events: TraceEvent[]
) {
  return targets.flatMap(({ name, tolerance, endOf }, index) => {
    const ended = events.find(
      ({ event, target }) => event === 'TrackEnded' && target === name
    );
    return reads
      .map((read) => read[index])
      .filter(
        ({ monotonicTimeMs }) =>
          ended !== undefined && monotonicTimeMs >= ended.monotonicTimeMs
      )
      .map(
        ({ presentation, model }) =>
          Math.abs(presentation[0] - endOf(model[0])) / tolerance
      );
  });
}

const DIRECTION_CHANGE: Sequence = {
  parts: [
    { to: 1, duration: 300, easing: 'default' },
    { to: 0.4, duration: 225, easing: 'default' },
    { to: 1, duration: 240 },
  ],
};
const WITH_HOLD: Sequence = {
  parts: [
    { to: 0.9, duration: 260 },
    { to: 0.3, duration: 200, delay: 150, easing: 'default' },
    { to: 1, duration: 220, easing: 'default' },
  ],
};
const FIVE_PARTS_IN_A_DELAY: Sequence = {
  delay: 120,
  parts: [
    { to: 1, duration: 150, easing: 'default' },
    { to: 0.5, duration: 130 },
    { to: 0.9, duration: 225, easing: 'default' },
    { to: 0.3, duration: 110, easing: 'default' },
    { to: 1, duration: 160 },
  ],
};
const THREE_PARTS_OF_225: Sequence = {
  parts: [
    { to: 1, duration: 225 },
    { to: 0.3, duration: 225 },
    { to: 1, duration: 225 },
  ],
};
const TRANSFORM_WITH_HOLD: Sequence = {
  form: 'transform',
  parts: [
    { to: 1, duration: 310, easing: 'default' },
    { to: 0.4, duration: 245, delay: 140 },
    { to: 1, duration: 260, easing: 'default' },
  ],
};
const EXIT: Sequence = {
  parts: [
    { to: 0.5, duration: 200, easing: 'default' },
    { to: 0.9, duration: 200, easing: 'default' },
    { to: 0.1, duration: 400, easing: 'default' },
  ],
};

describe('native layout sequences', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const entering: [string, Sequence][] = [
    ['three parts with a direction change', DIRECTION_CHANGE],
    ['a part after a hold', WITH_HOLD],
    ['five parts in a delay', FIVE_PARTS_IN_A_DELAY],
    ['parts of 225 ms', THREE_PARTS_OF_225],
    [
      'a hold and a direction change on two operations of its transform',
      TRANSFORM_WITH_HOLD,
    ],
  ];
  for (const [caseName, sequence] of entering) {
    test(`an entering sequence of ${caseName} plays natively on its declared timeline: each target is on the declared curve and on the curve of its frame-driven twin in each phase and around each boundary, each track ends one display frame or less from the declared end, and the callback gets true one time, after the tracks and not after the display frame of the callback of the twin`, async () => {
      const form = formOf(sequence);
      const totalMs = totalOf(sequence);
      const played = await playCase(
        `an entering sequence of ${caseName}`,
        caseOf(sequence, 'entering')
      );
      const { events } = played;
      const completion = completionOf(played);
      logCompletion(caseName, totalMs, completion, events);

      expect(routeOf(events)).toBe(NATIVE_ROUTES[form]);
      expect(trackEndsOf(events)).toBe(FINISHED_TRACKS[form]);
      expect(commandEndsOf(events)).toBe('Finished:None');
      expect(
        [...completion.trackEnds, ...completion.hostEnds].every(
          (endMs) => endMs > totalMs - FRAME_MS
        )
      ).toBe(true);
      expect(completion.twinEnd > totalMs - 0.5).toBe(true);
      expect(isAfterTracks(completion)).toBe(true);
      expect(isNotAfterFrameOfTwin(completion)).toBe(true);
      await render(null);
    });
  }

  test('an exiting sequence plays natively on its declared timeline, ends each track one time one display frame or less from the end of its last part, gives its callback after the tracks and not after the display frame of the callback of the twin, and holds its end values to the removal', async () => {
    const totalMs = totalOf(EXIT);
    const endLevel = lastOf(EXIT.parts).to;
    const heldTargets: HeldTarget[] = [
      { name: 'Opacity', tolerance: OPACITY_TOLERANCE, endOf: () => endLevel },
      {
        name: 'PositionY',
        tolerance: POSITION_TOLERANCE,
        endOf: (model) => model + offsetOf(endLevel),
      },
      {
        name: 'PositionX',
        tolerance: POSITION_TOLERANCE,
        endOf: (model) => model - X_TRAVEL,
      },
    ];
    const lastPartStartMs = lastOf(declaredStartsOf(EXIT));
    let sampling: Promise<TargetSample[][]> | undefined;
    // The rows go on to the time at which a box leaves.
    const played = await playCase(
      'an exiting sequence',
      caseOf(EXIT, 'exiting', {
        totalMs: totalMs + 400,
        box: { Box: TaggedBox },
        // The play calls a checkpoint after its rows, and its rows stop when a box leaves.
        checkpoint: {
          atMs: lastPartStartMs,
          run: () => {
            sampling = sampleUntilGone(
              playedTags[BOX_REF],
              heldTargets,
              totalMs + 400 - lastPartStartMs
            );
          },
        },
      })
    );
    const heldReads = (await sampling) ?? [];
    const { tag } = played.events[0];
    const removal = await takeTraceUntil((taken) =>
      taken.some((event) => event.tag === tag && event.event === 'Ended')
    );
    const events = [
      ...played.events,
      ...removal.filter((event) => event.tag === tag),
    ];
    const completion = completionOf({ ...played, events });
    logCompletion('exit', totalMs, completion, events);

    expect(routeOf(events)).toBe(NATIVE_ROUTES.scalars);
    expect(trackEndsOf(events)).toBe(FINISHED_TRACKS.scalars);
    expect(
      completion.trackEnds.every(
        (endMs) => Math.abs(endMs - totalMs) < FRAME_MS
      )
    ).toBe(true);
    expect(isAfterTracks(completion)).toBe(true);
    expect(isNotAfterFrameOfTwin(completion)).toBe(true);

    // The removal of the view ends the command.
    expect(commandEndsOf(events)).toBe('Cancelled:None');
    expect(completion.hostEnds[0] >= Math.max(...completion.trackEnds)).toBe(
      true
    );
    const heldDistances = heldDistancesOf(heldTargets, heldReads, events);
    console.log(
      `SEQUENCE-HELD | samples of each target from the declared start of the last part to the removal ${heldReads.length}, samples from the end report of their track ${heldDistances.length}, samples off the end value ${heldDistances.filter((distance) => distance >= 1).length}, largest distance from the end value in tolerances ${Math.max(0, ...heldDistances).toFixed(2)}`
    );
    expect(playedTags[BOX_REF]).toBe(tag);
    expect(heldDistances.every((distance) => distance < 1)).toBe(true);
    expect(await hasLeft(tag)).toBe(true);
    await render(null);
  });

  const fallbacks: [string, Sequence, string][] = [
    [
      'a callback on a part',
      {
        parts: [
          { to: 1, duration: 200 },
          { to: 0.5, duration: 200, hasCallback: true },
          { to: 1, duration: 200 },
        ],
      },
      'LayoutBuildFailed:UnsupportedTiming',
    ],
    [
      'a part with no duration',
      {
        parts: [
          { to: 1, duration: 200 },
          { to: 0.5, duration: 0 },
          { to: 1, duration: 200 },
        ],
      },
      'LayoutBuildFailed:UnsupportedTrackForm',
    ],
    [
      'a delayed first part',
      {
        parts: [
          { to: 0.5, duration: 200, delay: 100 },
          { to: 1, duration: 200 },
        ],
      },
      'LayoutBuildFailed:UnsupportedTiming',
    ],
  ];
  for (const [caseName, sequence, route] of fallbacks) {
    test(`an entering sequence with ${caseName} stays frame-driven as a whole (${route}), with one builder call, and ends as its frame-driven twin`, async () => {
      const { events, end, missingCallbacks } = await playCounted(
        caseOf(sequence, 'entering', { isFrameDriven: true })
      );
      console.log(`SEQUENCE-FALLBACK | ${caseName} | ${routeOf(events)}`);
      expect(routeOf(events)).toBe(route);
      expect(missingCallbacks).toBe('');
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      const { native, frame } = end!;
      for (const { playbacks } of Object.values(native)) {
        expect(playbacks.length).toBe(0);
      }
      const distanceOf = (target: string) =>
        Math.abs(
          native[target].presentation[0] - frame[target].presentation[0]
        );
      expect(distanceOf('Opacity') < OPACITY_TOLERANCE).toBe(true);
      expect(distanceOf('PositionY') < POSITION_TOLERANCE).toBe(true);
      await render(null);
    });
  }
});

describe('native layout sequences and a clip of their view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }
  if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
    // An Android animator plays to its end out of the window, so no clip gives the sequence to the frame driver.
    test('a clip of a native entering sequence keeps its tracks: the sequence plays to its end, and each box gives one callback true', async () => {
      const played = await play(CLIPPED_SEQUENCE, 'entering', {
        nativeRecords: true,
      });
      const { native: nativeTag } = played.tags;
      await wait(ANDROID_CLIP_AT_MS);
      scrollTo(CLIPPED_OFFSET);
      await wait(ANDROID_CLIP_FOR_MS);
      scrollTo(0);
      expect(await waitForCallbacks(2)).toBe('');
      await wait(300);
      const events = (await takeTrace()).filter(({ tag }) => tag === nativeTag);
      expect(events.some(({ event }) => event === 'FrameUpdateMounted')).toBe(
        false
      );
      expect(commandEndsOf(events)).toBe('Finished:None');
      expect(sortedCallbacks()).toBe('frame:true,native:true');
    });
    return;
  }

  const HAND_OVER: Sequence = {
    parts: [
      { to: 1, duration: 400 },
      { to: 0.3, duration: 600 },
      { to: 0.8, duration: 400 },
      { to: 1, duration: 300 },
    ],
  };
  // The second part starts after a hold from 400 ms to 800 ms.
  const HAND_OVER_IN_A_HOLD: Sequence = {
    parts: [
      { to: 1, duration: 400 },
      { to: 0.3, duration: 400, delay: 400 },
      { to: 0.8, duration: 400 },
      { to: 1, duration: 300 },
    ],
  };
  // The part times and the easing of BounceOut with a duration of 5000 ms.
  const EXIT_HAND_OVER: Sequence = {
    parts: [
      { to: 0.8, duration: 750, easing: 'default' },
      { to: 1, duration: 750, easing: 'default' },
      { to: 0.7, duration: 750, easing: 'default' },
      { to: 0.1, duration: 2750, easing: 'default' },
    ],
  };
  const TRANSFORM_HAND_OVER: Sequence = {
    form: 'transform',
    parts: [
      { to: 1, duration: 400, easing: 'default' },
      { to: 0.3, duration: 500, delay: 200 },
      { to: 0.8, duration: 400, easing: 'default' },
      { to: 1, duration: 300 },
    ],
  };
  const TRANSFER_TIMEOUT_MS = 500;
  // The time of a clip is the time of the tracks in the first row that has it. The frame driver has its first
  // frame two display frames after that row (measured: 32.4 to 32.6 ms), so the clip at 960 ms gives that frame
  // from 7 ms before to 10 ms after the end of the second part of HAND_OVER at 1000 ms. The clip of the exit is
  // at 40 % of its time. Each sequence has a part that starts 200 ms or more after its clip.
  const clips: [string, Sequence, EntryExit, number, number?][] = [
    ['inside the second part', HAND_OVER, 'entering', 600],
    [
      'one frame or less from the end of the second part',
      HAND_OVER,
      'entering',
      960,
      1000,
    ],
    ['in a hold between two parts', HAND_OVER_IN_A_HOLD, 'entering', 550],
    ['inside the third part', EXIT_HAND_OVER, 'exiting', 2000],
  ];
  for (const [caseName, sequence, flow, clipMs, boundaryMs] of clips) {
    test(`a clip ${caseName} of a native ${flow} sequence gives it to the frame driver in its declared state: the start of the tracks, the first value, the later boundaries, the end value, and one callback`, async () => {
      const played = await play(sequence, flow, { nativeRecords: true });
      const { native: nativeTag } = played.tags;
      const form = formOf(sequence);
      const targets = TARGETS[form];
      const totalMs = totalOf(sequence);
      const declaredStarts = declaredStartsOf(sequence);
      const startLevel = START_LEVEL[flow];
      const beforeClip = await takeRows(
        played,
        played.startMs + totalMs,
        (row) =>
          playingOf(played, [row]).length > 0 &&
          trackTimeOf(played, row) >= clipMs
      );
      const before = beforeClip[beforeClip.length - 1];
      const clipTimeMs = trackTimeOf(played, before);
      const restY = before.position.model[1];
      const start = (await takeTrace()).filter(({ tag }) => tag === nativeTag);

      // The view stays out of the window until the frame driver gave it a frame.
      const isFrameDriven = ({ isTorn, records, position }: Row) =>
        !isTorn && position.playbacks.length === 0 && records.nativeFrames > 0;
      scrollTo(CLIPPED_OFFSET);
      const clipped = await takeRows(
        played,
        performance.now() + TRANSFER_TIMEOUT_MS,
        isFrameDriven
      );
      scrollTo(0);
      const rows = [
        ...clipped,
        ...(await takeRows(played, played.startMs + totalMs + 200)),
      ];
      const transfer = (await takeTrace()).filter(
        ({ tag }) => tag === nativeTag
      );
      // The view has no track and no value of the frame driver from the removal of its tracks to the first
      // frame of the frame driver.
      const timeOf = (name: string) =>
        transfer.find(({ event }) => event === name)?.monotonicTimeMs ?? NaN;
      const removedAtMs = timeOf('Ended');
      const mountedAtMs = timeOf('FrameUpdateMounted');
      const betweenLevels = clipped
        .filter(
          ({ position }) =>
            position.monotonicTimeMs > removedAtMs &&
            position.monotonicTimeMs < mountedAtMs
        )
        .map(({ position, value }) =>
          levelsOf(form, position, value, 'model', restY)
        );
      await waitForCallbacks(2);
      await wait(300);
      const end = readRecords();
      const frames = readNativeFrameTimes().map(
        (frameTime) => frameTime - end.origins.native
      );
      const [firstFrameMs] = frames;

      // A part that the frame driver did not run was over at the hand-over: its start is its declared start.
      const actualStarts = declaredStarts.map((declared, index) =>
        end.starts.native[index] > 0
          ? end.starts.native[index] - end.origins.native
          : declared
      );
      const frameDriven = rows.filter(
        (row) =>
          isFrameDriven(row) &&
          row.records.frameTime - row.records.origins.native < totalMs
      );
      const levelsOfRow = ({ position, value }: Row) =>
        levelsOf(form, position, value, 'model', restY);
      const differences = frameDriven.map((row) => {
        const { records } = row;
        const level = levelAt(
          sequence,
          actualStarts,
          startLevel,
          records.frameTime - records.origins.native
        );
        return levelsOfRow(row).map(
          (shown, index) => Math.abs(shown - level) * targets[index].unit
        );
      });
      if (frameDriven.length === 0) {
        console.log(
          `SEQUENCE-HAND-OVER | ${caseName} | no frame-driven row: rows ${rows.length}, with a frame during the samples ${rows.filter(({ isTorn }) => isTorn).length}, with playback keys ${rows.filter(({ position }) => position.playbacks.length > 0).length}`
        );
        expect(frameDriven.length).not.toBe(0);
        await render(null);
        return;
      }

      const [first] = frameDriven;
      const firstTimeMs =
        first.records.frameTime - first.records.origins.native;
      const firstDeclared = levelAt(
        sequence,
        declaredStarts,
        startLevel,
        firstTimeMs
      );
      const firstChange = frameChangeAt(sequence, startLevel, firstTimeMs);
      const firstLevels = levelsOfRow(first);

      // The start of the tracks on the animation clock, from the rows before the clip.
      const clockOffset =
        played.clockOffset ?? (await sampleClockOffset(nativeTag));
      const nativeOrigin =
        originOf(played, playingOf(played, beforeClip)) - clockOffset.offset;
      const originDifferenceMs = first.records.origins.native - nativeOrigin;

      // The replay starts a part at its declared start. The frame driver starts a part in the first frame that
      // has the end of the part before it, and a part with a delay in the first frame that has the end of that
      // delay. The delay starts as a part, or in the replay at the end of the part before it.
      const frameWith = (timeMs: number) =>
        frames.find((frameMs) => frameMs >= timeMs) ?? NaN;
      const expectedStarts = declaredStarts.map((declared, index) => {
        if (index === 0) {
          return [declared];
        }
        const { delay } = sequence.parts[index];
        const endBefore =
          actualStarts[index - 1] + sequence.parts[index - 1].duration;
        return [
          ...(declared <= firstFrameMs ? [declared] : []),
          ...(delay === undefined
            ? [frameWith(endBefore)]
            : [
                frameWith(frameWith(endBefore) + delay),
                frameWith(endBefore + delay),
              ]),
        ];
      });
      const startDifferences = actualStarts.map((actual, index) =>
        Math.min(
          ...expectedStarts[index].map((expected) =>
            Math.abs(actual - expected)
          )
        )
      );
      const laterParts = declaredStarts.filter(
        (declared) => declared > firstFrameMs
      ).length;
      console.log(
        [
          'SEQUENCE-HAND-OVER',
          caseName,
          `clip at ${clipTimeMs.toFixed(1)} ms of the track`,
          `start ${summarize(start.filter(isHostEvent))}`,
          `transfer ${summarize(transfer.filter(isHostEvent))}`,
          `first value of the frame driver ${(mountedAtMs - removedAtMs).toFixed(1)} ms after the removal of the tracks, rows between them ${betweenLevels.length} with the model at the levels ${Math.min(...betweenLevels.flat()).toFixed(4)} to ${Math.max(...betweenLevels.flat()).toFixed(4)}`,
          `first frame of the frame driver at ${firstFrameMs.toFixed(1)} ms, ${(firstFrameMs - clipTimeMs).toFixed(1)} ms after the clip${boundaryMs === undefined ? '' : `, ${(firstFrameMs - boundaryMs).toFixed(1)} ms after the boundary`}`,
          `start of the tracks of the frame driver ${originDifferenceMs.toFixed(2)} ms after the start of the native tracks, width of the clock conversion ${clockOffset.width.toFixed(2)} ms`,
          `first frame-driven row: frame ${first.records.nativeFrames} at ${firstTimeMs.toFixed(1)} ms, ${targets.map(({ name, unit }, index) => `${name} ${(firstLevels[index] * unit).toFixed(4)}`).join(' ')}, declared level ${firstDeclared.toFixed(4)}, change in one frame ${firstChange.toFixed(4)}`,
          `frame-driven rows ${frameDriven.length}: largest difference to the curve on the boundaries of the frame driver: ${targets.map(({ name }, index) => `${name} ${largestOf(differences.map((row) => row[index])).toFixed(4)}`).join(', ')}`,
          `start of each part after its declared start ${actualStarts.map((actual, index) => (actual - declaredStarts[index]).toFixed(1)).join(' ')} ms, from the frame of its rule ${startDifferences.map((difference) => difference.toFixed(3)).join(' ')} ms`,
          `frames ${frames.length}`,
          `callback of the native box ${(end.callbackTimes.native - end.origins.native).toFixed(1)} ms after its start, of the twin ${(end.callbackTimes.frame - end.origins.frame).toFixed(1)} ms`,
        ].join(' | ')
      );

      expect(routeOf(start)).toBe(NATIVE_ROUTES[form]);
      expect(
        transfer
          .filter(({ event }) => event === 'Ended')
          .map(summarizeEnded)
          .join()
      ).toBe('Interrupted:PlatformRemoved');
      expect(
        Math.abs(originDifferenceMs) < ORIGIN_TOLERANCE_MS + clockOffset.width
      ).toBe(true);
      expect(first.records.nativeFrames).toBe(1);
      if (boundaryMs !== undefined) {
        expect(Math.abs(firstFrameMs - boundaryMs) < FRAME_MS).toBe(true);
      }
      targets.forEach(({ unit, tolerance }, index) => {
        expect(
          Math.abs(firstLevels[index] - firstDeclared) * unit <
            tolerance + firstChange * unit
        ).toBe(true);
      });
      expect(frameDriven.length > 10).toBe(true);
      expect(
        differences.every((row) =>
          row.every(
            (difference, index) => difference < targets[index].tolerance
          )
        )
      ).toBe(true);
      expect(laterParts > 0).toBe(true);
      expect(
        startDifferences.every((difference) => difference < SAME_TIME_MS)
      ).toBe(true);
      expect(sortedCallbacks()).toBe('frame:true,native:true');
      expect(sortedBuilderCalls()).toBe('frame,native');
      if (flow === 'exiting') {
        expect(await takeRow(played.tags, form)).toBeUndefined();
      } else {
        const rest = await readAtRest(nativeTag, form);
        expect(rest.keys).toBe(0);
        expect(isAtEndLevel(rest, form)).toBe(true);
      }
      await render(null);
    });
  }

  const CLIPPED_FOR_MS = 400;
  const MODEL_TARGETS: Record<Form, ModelTarget> = {
    scalars: 'Opacity',
    transform: 'Transform',
  };
  // The scroll call of a clip is at a time from the commit. The sequence has a part that starts 200 ms or
  // more after its clip.
  const playedClips: [string, Sequence, EntryExit, number][] = [
    [
      'inside the second part of a sequence on two operations of the transform',
      TRANSFORM_HAND_OVER,
      'entering',
      800,
    ],
  ];
  for (const [clipName, sequence, flow, clipMs] of playedClips) {
    test(`a clip ${clipName} of a native ${flow} sequence gives it to the frame driver in its declared state: the start of the tracks, the first value, the later boundaries, the end value, and one callback`, async () => {
      const caseName = `a clip ${clipName} of a native ${flow} sequence`;
      const form = formOf(sequence);
      const played = await playCase(
        caseName,
        caseOf(sequence, flow, {
          clip: { atMs: clipMs, backAtMs: clipMs + CLIPPED_FOR_MS },
        })
      );
      const { events, tracks } = played;
      const removed = events.find(({ event }) => event === 'Ended');
      console.log(
        [
          'SEQUENCE-HAND-OVER',
          caseName,
          `the tracks leave ${((removed?.monotonicTimeMs ?? NaN) - middleOf(tracks[0].origin)).toFixed(1)} ms after their origin`,
          `events ${summarize(events.filter(isHostEvent))}`,
        ].join(' | ')
      );

      expect(routeOf(events)).toBe(NATIVE_ROUTES[form]);
      expect(commandEndsOf(events)).toBe('Interrupted:PlatformRemoved');
      expectNoKeyAfterTransfer(played, MODEL_TARGETS[form]);
      expectModelOnFrames(caseName, played, MODEL_TARGETS[form]);
      if (flow === 'exiting') {
        expect(await hasLeft(events[0].tag)).toBe(true);
      }
      await render(null);
    });
  }
});

describe('native layout sequences and a new layout of their view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const FIRST: Place = { left: 30, top: 10 };
  const SECOND: Place = { left: 230, top: 110 };
  const THIRD: Place = { left: 130, top: 10 };
  // The level of the Y is the part of its way from the place before the layout to the place after it.
  const LAYOUT: Sequence = {
    parts: [
      { to: 1.3, duration: 400 },
      { to: 0.6, duration: 300 },
      { to: 1, duration: 300 },
    ],
  };
  const TOTAL_MS = totalOf(LAYOUT);
  const REPLACED_AT_MS = 550;

  const layoutOf = (name: BoxName, records: boolean): AnimationFunction => {
    const { parts } = LAYOUT;
    const easings = parts.map((part, index) =>
      records
        ? recordingOf(Easing.linear, partStarts[name][index], part.duration)
        : Easing.linear
    );
    const clock = records ? clockOf(name, TOTAL_MS) : Easing.linear;
    return (values) => {
      'worklet';
      const { currentOriginY, targetOriginY } = values;
      const animations = parts.map((part, index) => {
        'worklet';
        return withTiming(
          currentOriginY + part.to * (targetOriginY - currentOriginY),
          { duration: part.duration, easing: easings[index] }
        );
      });
      return {
        initialValues: {
          originX: values.currentOriginX,
          originY: currentOriginY,
        },
        animations: {
          originX: withTiming(values.targetOriginX, {
            duration: TOTAL_MS,
            easing: clock,
          }),
          originY: withSequence(...animations),
        },
        callback: (finished: boolean) => {
          'worklet';
          scheduleOnRN(
            recordCallback,
            name,
            finished,
            global._getAnimationTimestamp()
          );
        },
      };
    };
  };

  test('a new layout at 55 % of a native sequence gives the two leaves to the frame driver from the declared values of that time, and both boxes end at the new place', async () => {
    const counted = (name: BoxName, animation: AnimationFunction) => ({
      layout: countedOf(
        name,
        animation as Parameters<typeof countedOf>[1]
      ) as BoxAnimations['layout'],
    });
    const cells: Cell[] = [
      {
        refName: BOX_REF,
        animations: counted('native', layoutOf('native', false)),
      },
      {
        refName: FRAME_BOX_REF,
        animations: counted(
          'frame',
          frameDrivenOf(
            layoutOf('frame', true) as Parameters<typeof frameDrivenOf>[0]
          ) as unknown as AnimationFunction
        ),
      },
    ];
    resetRecords();
    await render(<Cells cells={cells} isMounted place={FIRST} />);
    await wait(200);
    const nativeTag = getTestComponent(BOX_REF).getTag();
    const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
    await takeTrace();
    callbacks.length = 0;
    namedBuilderCalls.length = 0;
    const startMs = performance.now();
    await render(<Cells cells={cells} isMounted place={SECOND} />);
    await wait(Math.max(0, startMs + REPLACED_AT_MS - performance.now()));
    const start = (await takeTrace()).filter(({ tag }) => tag === nativeTag);
    const twin = readRecords();
    await render(<Cells cells={cells} isMounted place={THIRD} />);
    await wait(3 * FRAME_MS);
    const replacement = (await takeTrace()).filter(
      ({ tag }) => tag === nativeTag
    );
    const capturedOf = (target: string) =>
      replacement.find(
        (event) =>
          event.event === 'LayoutLeafCaptured' && event.target === target
      )?.leafValue ?? NaN;
    const captured = { x: capturedOf('PositionX'), y: capturedOf('PositionY') };
    const capturedAtMs =
      (TOTAL_MS * (captured.x - FIRST.left)) / (SECOND.left - FIRST.left);
    const declaredStarts = declaredStartsOf(LAYOUT);
    const declaredY =
      FIRST.top +
      levelAt(LAYOUT, declaredStarts, 0, capturedAtMs) *
        (SECOND.top - FIRST.top);

    // The frame driver starts the second part of the twin in the frame after its declared start. The twin is
    // that time behind the declared Y at the replacement, and its last frame is one frame old or less.
    const twinLagMs =
      twin.starts.frame[1] - twin.origins.frame - declaredStarts[1];
    const travelIn = (speed: number, timeMs: number) =>
      TOLERANCE.points + speed * timeMs;
    const xBound = travelIn((SECOND.left - FIRST.left) / TOTAL_MS, FRAME_MS);
    const yBound = travelIn(
      (0.7 * (SECOND.top - FIRST.top)) / LAYOUT.parts[1].duration,
      FRAME_MS + twinLagMs
    );
    const rows: string[] = [];
    let isNearTwin = true;
    for (let checkpoint = 0; checkpoint < 4; checkpoint++) {
      const [native, frame] = await Promise.all([
        sample(nativeTag, 'Position'),
        sample(frameTag, 'Position'),
      ]);
      const x = native.model[0] - frame.model[0];
      const y = native.model[1] - frame.model[1];
      isNearTwin &&=
        native.playbacks.length === 0 &&
        Math.abs(x) < xBound &&
        Math.abs(y) < yBound;
      rows.push(
        `keys ${native.playbacks.length} x from the twin ${x.toFixed(2)} y ${y.toFixed(2)}`
      );
      await wait(150);
    }
    await waitForCallbacks(4);
    await wait(300);
    const [nativeEnd, twinEnd] = await Promise.all([
      sample(nativeTag, 'Position'),
      sample(frameTag, 'Position'),
    ]);
    console.log(
      [
        'SEQUENCE-REPLACED',
        `start ${routeOf(start)}`,
        `replacement ${summarize(replacement.filter(isHostEvent))}`,
        `captured x ${captured.x.toFixed(3)} y ${captured.y.toFixed(3)} at ${capturedAtMs.toFixed(1)} ms, declared y ${declaredY.toFixed(3)}`,
        `second part of the twin ${twinLagMs.toFixed(1)} ms after its declared start`,
        `bounds x ${xBound.toFixed(2)} y ${yBound.toFixed(2)}`,
        ...rows,
      ].join(' | ')
    );

    expect(routeOf(start)).toBe('PositionX+PositionY');
    expect(
      replacement
        .filter(({ buildFailure }) => buildFailure !== undefined)
        .map(({ buildFailure }) => buildFailure)
        .join()
    ).toBe('UnsupportedContinuation');
    expect(capturedAtMs > 400 && capturedAtMs < 700).toBe(true);
    expect(twinLagMs > -0.5).toBe(true);
    expect(Math.abs(captured.y - declaredY) < 0.05).toBe(true);
    expect(isNearTwin).toBe(true);
    expect(nativeEnd.playbacks.length).toBe(0);
    for (const end of [nativeEnd, twinEnd]) {
      expect(
        Math.abs(end.presentation[0] - nativeEnd.model[0]) < TOLERANCE.points
      ).toBe(true);
      expect(
        Math.abs(end.presentation[1] - nativeEnd.model[1]) < TOLERANCE.points
      ).toBe(true);
    }
    expect(sortedCallbacks()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    expect(sortedBuilderCalls()).toBe('frame,frame,native,native');
    await render(null);
  });
});

function summarizeEnded({ outcome, reason }: TraceEvent) {
  return `${outcome}:${reason}`;
}

const localStyles = StyleSheet.create({
  scroll: {
    height: 2 * CELL_HEIGHT + 20,
  },
  filler: {
    height: 2000,
  },
  cell: {
    height: CELL_HEIGHT,
  },
  box: {
    marginLeft: BOX_LEFT,
    marginTop: 10,
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
