/*
 * Each test plays a spring on the native box and the same spring with a leaf callback on its frame-driven
 * twin, each box in its own cell. A route is from `routeOf`: NATIVE PLAYING, NATIVE IMMEDIATE, or
 * FRAME-DRIVEN with two reads of the native box on the frames of the twin. A value check has statement A of
 * `native layout reference` with the frames of the twin in place of a declared timeline, each box on its
 * own clock: each read of the native box is on the frames of the twin at one time of the
 * `PRESENTATION_STAY_MS` before the read, from the origin of the native command, with 0.5 pt for a
 * position and 0.01 for an opacity. A read from the last frame of the twin before its end frame can show
 * the end value. Between two frames the twin has the cubic through the four nearest frames.
 *
 * Not tested: the pixels on screen, 120 Hz, a frame gap of more than 64 ms.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import { LinearTransition, ReduceMotion } from 'react-native-reanimated';

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
  FRAME_DRIVER_LATE_MS,
  isOnFrameDriverWindowOf,
  matchInWindowOf,
  MATRIX_TOLERANCE,
  sampleTargets,
} from './nativeLayoutReferencePlay';
import type {
  AnimationSource,
  Band,
  FrameRecord,
  Layer,
  Leaf,
  Leaves,
  NativeTrack,
  Operation,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  amountOf,
  BOX_REF,
  callbackEmissionTimes,
  callbackOf,
  callbacks,
  cellsOf,
  cellToleranceOf,
  endTransformOf,
  entryExitOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  frameRecordedOf,
  hasNativeLayoutRoute,
  isNear,
  isNoView,
  LAID_OUT_TOLERANCE,
  layerOf,
  layoutOf,
  middleOf,
  movingGeometryTest,
  nativeOriginOf,
  nativeResidualOf,
  narrowClockOffset,
  OPACITY_TOLERANCE,
  PAIR_LEFT,
  PAIR_TOP,
  PLAYS_HELD_SPRING,
  PLAYS_SIZE_CHANGE,
  playsSizeChangeOf,
  PLAYS_SPRING_WITH_HOLD,
  POSITION_TOLERANCE,
  PRESENTATION_STAY_MS,
  readFrameRecords,
  resetCallbacks,
  resetFrameRecords,
  routeOf,
  sample,
  SizeBox,
  styles,
  summarize,
  takeRows,
  takeTrace,
  TRANSFORM_SAMPLE_CELLS,
  uncertaintyOf,
  waitForCallbacks,
} from './nativeLayoutTestKit';

type BoxName = 'native' | 'frame';
type Flow = 'layout' | 'exiting';
type Place = {
  left: number;
  top: number;
  width?: number;
  height?: number;
  opacity?: number;
};
type BoxAnimations = Pick<React.ComponentProps<typeof SizeBox>, Flow>;
type Reads = Record<string, TargetSample>;

const BOXES: Record<BoxName, string> = {
  native: BOX_REF,
  frame: FRAME_BOX_REF,
};
const BOX_NAMES = Object.keys(BOXES) as BoxName[];
const CLOCK_REF = 'NativeLayoutSpringsClock';

const START: Place = { left: 0, top: 0 };
const MOVED: Place = { left: PAIR_LEFT, top: 0 };
const MOVED_DOWN: Place = { left: PAIR_LEFT, top: PAIR_TOP };
const OPACITY_FROM = 0.3;
const OPACITY_TO = 0.7;

/**
 * The settle time of the default spring (damping ratio 1, natural frequency
 * 15/s): the first time at which its energy is 6e-9 of its start energy, from
 * the closed form.
 */
const DEFAULT_SPRING_MS = 825;
const DEFAULT_SPRING_CALLBACKS = ['native:true', 'frame:true'];
const REPLACED_SPRING_CALLBACKS = [
  'native:false',
  'native:true',
  'frame:false',
  'frame:true',
];

type PhysicsOptions = Pick<
  WithSpringConfig,
  'overshootClamping' | 'velocity' | 'energyThreshold'
>;

/** A physics config with this damping ratio and natural frequency in 1/s. */
const physics = (
  zeta: number,
  omega0: number,
  options: PhysicsOptions = {}
): WithSpringConfig => ({
  stiffness: omega0 ** 2,
  mass: 1,
  damping: 2 * zeta * omega0,
  ...options,
});

type SpringCase = {
  flow?: Flow;
  leaves?: Leaves;
  operations?: Operation[];
  /**
   * The animation of a box with its callback, when `layoutOf` does not make it.
   * The twin gets it with no native description.
   */
  builder?: (callback: (finished: boolean) => void) => AnimationSource;
  /**
   * The place before the commit and after it. With no place after it, the
   * commit removes the boxes.
   */
  places: [Place, Place?];
  /** The time of the reads after the commit. */
  totalMs: number;
  /** The targets of each read. */
  targets: string[];
  /** A second commit, `atMs` after the first. */
  next?: { atMs: number; place: Place; leaves: Leaves };
};

type Played = {
  /** Each read from the commit, with the boxes that were mounted. */
  reads: Partial<Record<BoxName, Reads>>[];
  /** The reads before the second commit. */
  readsBeforeNext: number;
  /** The trace of the native box from the commit. */
  events: TraceEvent[];
  twinEvents: TraceEvent[];
  records: FrameRecord[];
  clockOffset: Band;
  tags: Record<BoxName, number>;
  missingCallbacks: string;
  /**
   * Of a commit that removes the boxes: when each box left, on the sample
   * clock.
   */
  removals: Partial<Record<BoxName, Band>>;
};

function animationsOf(
  { flow = 'layout', operations, builder }: SpringCase,
  leaves: Leaves = {}
): Record<BoxName, BoxAnimations> {
  const animationOf = (box: BoxName) => {
    const isTwin = box === 'frame';
    if (builder) {
      const built = builder(callbackOf(box));
      return frameRecordedOf(box, isTwin ? frameDrivenOf(built) : built);
    }
    const boxLeaves: Leaves = Object.fromEntries(
      Object.entries(leaves).map(([key, leaf]) => [
        key,
        { ...leaf, hasCallback: isTwin || leaf.hasCallback },
      ])
    );
    const options = {
      name: box,
      transform: operations && {
        operations,
        shared: { hasCallback: isTwin },
      },
    };
    return frameRecordedOf(
      box,
      flow === 'layout'
        ? layoutOf(boxLeaves, options)
        : entryExitOf(boxLeaves, options)
    );
  };
  return {
    native: { [flow]: animationOf('native') },
    frame: { [flow]: animationOf('frame') },
  };
}

function SpringScene({
  animations,
  place,
  transform,
}: {
  animations: Record<BoxName, BoxAnimations>;
  place?: Place;
  transform?: ViewStyle['transform'];
}) {
  const clockRef = useTestRef(CLOCK_REF);
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      {BOX_NAMES.map((box) => (
        <View key={box} collapsable={false} style={styles.pairCell}>
          {place && (
            <SizeBox
              refName={BOXES[box]}
              {...animations[box]}
              left={place.left}
              top={place.top}
              width={place.width}
              height={place.height}
              style={{ opacity: place.opacity ?? 1, transform }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * Plays a case on the two boxes: one commit, and the second commit of `next`
 * during the animations of the first. It reads the targets of the two boxes
 * from the commit to `totalMs` after it, or, for a commit that removes the
 * boxes, to the time at which each box leaves.
 */
async function play(
  springCase: SpringCase,
  expectedCallbacks: string[]
): Promise<Played> {
  const {
    places: [before, after],
    operations,
    totalMs,
    targets,
    next,
  } = springCase;
  const transform = operations && endTransformOf(operations);
  const animations = animationsOf(springCase, springCase.leaves);
  const sceneAt = (place: Place | undefined, ofCommit = animations) => (
    <SpringScene animations={ofCommit} place={place} transform={transform} />
  );
  await render(sceneAt(before));
  await wait(200);
  const clockOffset = await narrowClockOffset(
    getTestComponent(CLOCK_REF).getTag()
  );
  const tags: Record<BoxName, number> = {
    native: getTestComponent(BOX_REF).getTag(),
    frame: getTestComponent(FRAME_BOX_REF).getTag(),
  };
  resetFrameRecords();
  await takeTrace();
  resetCallbacks();
  await render(sceneAt(after));
  const startMs = performance.now();
  const reads: Played['reads'] = [];
  let readsBeforeNext = Infinity;
  let removals: Played['removals'] = {};
  const readUntil = async (untilMs: number) => {
    const rows = await takeRows(
      () => readBoxes(tags, targets),
      ({ native }) => native[targets[0]],
      untilMs
    );
    reads.push(...rows.map(({ row }) => row));
  };
  if (!after) {
    removals = await readUntilRemoved(tags, targets, reads, totalMs);
  } else if (next) {
    await readUntil(startMs + next.atMs);
    readsBeforeNext = reads.length;
    await render(sceneAt(next.place, animationsOf(springCase, next.leaves)));
  }
  if (after) {
    await readUntil(startMs + totalMs);
  }
  const missingCallbacks = await waitForCallbacks(expectedCallbacks);
  const trace = await takeTrace();
  const events = trace.filter(({ tag }) => tag === tags.native);
  return {
    reads,
    readsBeforeNext,
    events,
    twinEvents: trace.filter(({ tag }) => tag === tags.frame),
    records: readFrameRecords(),
    clockOffset,
    tags,
    missingCallbacks,
    removals,
  };
}

async function readBoxes(tags: Record<BoxName, number>, targets: string[]) {
  const [native, frame] = await Promise.all(
    BOX_NAMES.map((box) => sampleTargets(tags[box], targets))
  );
  return { native, frame };
}

/**
 * Reads the boxes with no pause until each one leaves. A box leaves after its
 * last read and before the read of the clock view after its first read with no
 * view.
 */
async function readUntilRemoved(
  tags: Record<BoxName, number>,
  targets: string[],
  reads: Played['reads'],
  timeoutMs: number
) {
  const clockTag = getTestComponent(CLOCK_REF).getTag();
  const lastReadMs: Record<BoxName, number> = {
    native: -Infinity,
    frame: -Infinity,
  };
  const removals: Played['removals'] = {};
  const untilMs = performance.now() + timeoutMs;
  while (
    BOX_NAMES.some((box) => !removals[box]) &&
    performance.now() < untilMs
  ) {
    const read: Played['reads'][number] = {};
    for (const box of BOX_NAMES.filter((name) => !removals[name])) {
      try {
        const boxReads = await sampleTargets(tags[box], targets);
        read[box] = boxReads;
        lastReadMs[box] = boxReads[targets[0]].monotonicTimeMs;
      } catch (error) {
        if (!isNoView(error)) {
          throw error;
        }
        const { monotonicTimeMs } = await sample(clockTag, 'Opacity');
        removals[box] = { from: lastReadMs[box], to: monotonicTimeMs };
      }
    }
    reads.push(read);
  }
  return removals;
}

const readsOf = (
  { reads }: Pick<Played, 'reads'>,
  box: BoxName,
  target: string
) => reads.flatMap((read) => (read[box] ? [read[box][target]] : []));

/**
 * The record of a leaf of a box in a build of the case: the first is 0. A leaf
 * that plays natively to its end has no start call.
 */
function recordOf(
  { records }: Played,
  box: BoxName,
  key: string,
  build = 0,
  operation?: number
) {
  const record = records.filter(
    (each) =>
      each.box === box && each.key === key && each.operation === operation
  )[build];
  if (!record) {
    throw new Error(
      `The frame driver has no record of ${key} of the ${box} box in the build ${build}.`
    );
  }
  return record;
}

/** `recordOf` a leaf that the frame driver started. */
function startedRecordOf(...args: Parameters<typeof recordOf>) {
  const record = recordOf(...args);
  if (!record.start) {
    throw new Error(
      `The frame driver has no start of ${record.key} of the ${record.box} box.`
    );
  }
  return { ...record, start: record.start };
}

const BUILD_EVENTS = [
  'LayoutStartPending',
  'LayoutBuildFailed',
  'LayoutStartRefused',
];

/** The events of the native box before its second build. */
function eventsOfFirstBuild({ events }: Played) {
  const [, second] = events.filter(({ event }) => BUILD_EVENTS.includes(event));
  return second
    ? events.filter(({ sequence }) => sequence < second.sequence)
    : events;
}

function firstCommandOf(events: TraceEvent[]) {
  const admitted = events.find(({ event }) => event === 'Admitted');
  if (!admitted) {
    throw new Error(
      `The native box has no native command: ${summarize(events)}`
    );
  }
  return admitted;
}

const nativeOriginOfPlay = (played: Played) =>
  nativeOriginOf(
    played.events,
    firstCommandOf(played.events),
    played.clockOffset
  );

/** `LARGEST_SPRING_STEP_MS` of `spring.ts` of the package. */
const LARGEST_SPRING_STEP_MS = 64;

/**
 * Logs the times of the X leaf of each box on the animation clock: the trace
 * events of each box, and the start, the frames and the spring time of each
 * frame record.
 */
function logSpringClock(caseName: string, played: Played) {
  const { clockOffset, records } = played;
  const log = (text: string) =>
    console.log(`SPRING-CLOCK | ${caseName} | ${text}`);
  const onAnimationClock = (monotonicTimeMs: number) =>
    `${ms(monotonicTimeMs - clockOffset.to)}..${ms(monotonicTimeMs - clockOffset.from)}`;
  log(
    `clock offset (sample minus animation) ${ms(clockOffset.from)}..${ms(clockOffset.to)}`
  );
  for (const [box, events] of [
    ['native', played.events],
    ['frame', played.twinEvents],
  ] as const) {
    const isFrameUpdate = ({ event }: TraceEvent) =>
      event === 'FrameUpdateMounted';
    log(
      `${box} FrameUpdateMounted events ${events.filter(isFrameUpdate).length}`
    );
    for (const event of events.filter((each) => !isFrameUpdate(each))) {
      log(
        `${box} event ${event.event}${event.target ? `:${event.target}` : ''} generation ${event.generation} at ${onAnimationClock(event.monotonicTimeMs)}${event.originTimestampMs === undefined ? '' : ` origin ${ms(event.originTimestampMs)}`}${event.finished === undefined ? '' : ` finished ${event.finished}`}`
      );
    }
  }
  for (const box of BOX_NAMES) {
    const boxRecords = records.filter(
      (record) => record.box === box && record.key === 'originX'
    );
    const timesOf = (build: number) =>
      boxRecords[build]?.frames.map(({ timeMs }) => timeMs) ?? [];
    boxRecords.forEach(({ start }, build) => {
      const times = timesOf(build);
      const endMs = lastOf(times);
      const previousEndMs = lastOf(timesOf(build - 1));
      log(
        `${box} build ${build}: start ${ms(start?.timeMs)} value ${start?.value ?? 'none'}, frames ${times.length}, first ${times.slice(0, 3).map(ms).join(' ')}, end ${ms(endMs)}, previous build end ${ms(previousEndMs)}, earliest frame minus start ${ms(start && Math.min(...times) - start.timeMs)}, end minus start ${ms(start && endMs !== undefined ? endMs - start.timeMs : undefined)}, spring time at the end from the start ${ms(start && lastOf(springTimesOf(start.timeMs, times)))}, from the previous build end ${ms(previousEndMs === undefined ? undefined : lastOf(springTimesOf(previousEndMs, times)))}`
      );
    });
  }
}

const ms = (timeMs: number | undefined) => timeMs?.toFixed(3) ?? 'none';

const lastOf = (times: number[]): number | undefined => times[times.length - 1];

/**
 * Logs the native end report and the callbacks of the two boxes on the trace
 * clock, from the origin of the native command. A callback time is on the
 * animation clock, so it gets the clock offset of the run.
 */
function logEndOnTraceClock(
  { clockOffset }: Played,
  origin: Band,
  trackEnded: TraceEvent
) {
  const fromOrigin = (traceTimeMs: number) => traceTimeMs - middleOf(origin);
  const callbackMsOf = (box: BoxName) => {
    const emittedMs = callbackEmissionTimes[box];
    return emittedMs === undefined
      ? undefined
      : fromOrigin(emittedMs + middleOf(clockOffset));
  };
  const nativeEndMs = fromOrigin(trackEnded.monotonicTimeMs);
  const twinCallbackMs = callbackMsOf('frame');
  console.log(
    `SPRING-END-CLOCK | trace clock (sample clock), from the origin of the native command: native TrackEnded ${ms(nativeEndMs)} ms, native callback ${ms(callbackMsOf('native'))} ms, twin callback ${ms(twinCallbackMs)} ms, twin callback minus native TrackEnded ${ms(twinCallbackMs === undefined ? undefined : twinCallbackMs - nativeEndMs)} ms, uncertainty of a callback time ${ms(uncertaintyOf(clockOffset))} ms, of the origin ${ms(uncertaintyOf(origin))} ms`
  );
}

/**
 * The spring time that `springOnFrame` of the package played at each frame
 * time: the sum of its steps from `lastTimestampMs`. A step before the last
 * frame time is 0, and a step is `LARGEST_SPRING_STEP_MS` or less.
 */
function springTimesOf(lastTimestampMs: number, frameTimesMs: number[]) {
  let springTimeMs = 0;
  let lastMs = lastTimestampMs;
  return frameTimesMs.map((timeMs) => {
    springTimeMs += Math.min(
      Math.max(timeMs - lastMs, 0),
      LARGEST_SPRING_STEP_MS
    );
    lastMs = timeMs;
    return springTimeMs;
  });
}

type Point = { timeMs: number; value: number };

/**
 * The values of a leaf of the frame driver on its spring time from
 * `lastTimestampMs`: the start value at 0, and the value of each frame. Out of
 * the frames, the value is the cubic of the four nearest frames.
 */
function springCurveOf(record: StartedRecord, lastTimestampMs: number) {
  const points: Point[] = [
    { timeMs: 0, value: amountOf(record.start.value).amount },
    ...springFramesOf(record, lastTimestampMs).map(
      ({ springTimeMs, value }) => ({ timeMs: springTimeMs, value })
    ),
  ].filter(
    (point, index, all) => index === 0 || point.timeMs > all[index - 1].timeMs
  );
  if (points.length < 4) {
    throw new Error(
      `The frame driver has less than 3 frames of ${record.key}.`
    );
  }
  return {
    endMs: points[points.length - 1].timeMs,
    valueAt: (springTimeMs: number) => cubicAt(points, springTimeMs),
  };
}

type StartedRecord = ReturnType<typeof startedRecordOf>;

const SHARED_FRAMES_LOGGED = 10;

/**
 * Logs the new springs of the two boxes at the frame times that both have: the
 * position gap, and the spring time of the twin minus the spring time of the
 * native box.
 */
function logSharedFrames(
  native: StartedRecord,
  twin: StartedRecord,
  twinLastTimestampMs: number
) {
  const nativeFrames = springFramesOf(native, native.start.timeMs);
  const twinFrames = new Map(
    springFramesOf(twin, twinLastTimestampMs).map((frame) => [
      frame.timeMs,
      frame,
    ])
  );
  const shared = nativeFrames.flatMap((nativeFrame) => {
    const twinFrame = twinFrames.get(nativeFrame.timeMs);
    return twinFrame
      ? [
          {
            gap: Math.abs(nativeFrame.value - twinFrame.value),
            offsetMs: twinFrame.springTimeMs - nativeFrame.springTimeMs,
          },
        ]
      : [];
  });
  const offsetsMs = shared.map(({ offsetMs }) => offsetMs);
  const first = shared.slice(0, SHARED_FRAMES_LOGGED);
  console.log(
    `SPRING-RETARGET-SHARED | twin start minus native start ${(twin.start.timeMs - native.start.timeMs).toFixed(3)} ms, shared frames ${shared.length}, gaps of the first ${first.length} ${first.map(({ gap }) => gap.toFixed(4)).join(' ')}, twin spring time minus native spring time of the first ${first.length} ${first.map(({ offsetMs }) => offsetMs.toFixed(3)).join(' ')} ms, of all ${Math.min(...offsetsMs).toFixed(3)}..${Math.max(...offsetsMs).toFixed(3)} ms`
  );
}

/** Each frame of a record with its frame time, value and spring time. */
const springFramesOf = ({ frames }: StartedRecord, lastTimestampMs: number) => {
  const springTimesMs = springTimesOf(
    lastTimestampMs,
    frames.map(({ timeMs }) => timeMs)
  );
  return frames.map(({ timeMs, value }, frame) => ({
    timeMs,
    value: amountOf(value).amount,
    springTimeMs: springTimesMs[frame],
  }));
};

/** The frames of the frame driver for one leaf, from its start call. */
type Curve = {
  from: number;
  to: number;
  valueAt: (timeMs: number) => number;
  /** The last frame before the end frame. */
  lastFrameMs: number;
  /** The frame in which the leaf ended. */
  endMs: number;
};

/**
 * The curve of a leaf that ended. A delay starts its animation in its first
 * frame at or after its end (`delay` of `delay.ts` of the package), so the
 * frames of that animation move back by its lateness.
 */
function curveOf(
  { key, start, frames }: ReturnType<typeof startedRecordOf>,
  delayMs = 0
): Curve {
  const points: Point[] = [
    { timeMs: 0, value: amountOf(start.value).amount },
    ...frames.map(({ timeMs, value }) => ({
      timeMs: timeMs - start.timeMs,
      value: amountOf(value).amount,
    })),
  ].filter(
    (point, index, all) => index === 0 || point.timeMs > all[index - 1].timeMs
  );
  if (points.length < 2) {
    throw new Error(`The frame driver has no frames of ${key}.`);
  }
  const end = points[points.length - 1];
  const animationStartMs =
    points.find(({ timeMs }) => timeMs >= delayMs)?.timeMs ?? delayMs;
  const lateMs = animationStartMs - delayMs;
  const moving = points
    .slice(0, -1)
    .filter(({ timeMs }) => timeMs >= animationStartMs)
    .map(({ timeMs, value }) => ({ timeMs: timeMs - lateMs, value }));
  const from = points[0].value;
  const endMs = end.timeMs - lateMs;
  return {
    from,
    to: end.value,
    valueAt: (timeMs) => {
      if (timeMs <= delayMs || moving.length === 0) {
        return timeMs < endMs ? from : end.value;
      }
      return timeMs >= endMs ? end.value : cubicAt(moving, timeMs);
    },
    lastFrameMs: moving[moving.length - 1]?.timeMs ?? delayMs,
    endMs,
  };
}

/**
 * The cubic through the four points nearest to a time, two on each side where
 * they exist.
 */
function cubicAt(points: Point[], timeMs: number) {
  const after = points.findIndex((point) => point.timeMs > timeMs);
  const index = after < 0 ? points.length : after;
  const first = Math.max(0, Math.min(index - 2, points.length - 4));
  const near = points.slice(first, first + 4);
  return near.reduce(
    (sum, { timeMs: atMs, value }, place) =>
      sum +
      value *
        near.reduce(
          (product, other, otherPlace) =>
            otherPlace === place
              ? product
              : (product * (timeMs - other.timeMs)) / (atMs - other.timeMs),
          1
        ),
    0
  );
}

/**
 * The twin for one target of the native box, in the form of its samples: the
 * values at a time from the start call of the twin.
 */
type Twin = {
  shownAt: (timeMs: number) => number[];
  endValues: number[];
  lastFrameMs: number;
  endMs: number;
  tolerances: number[];
  /** The start call of the twin on the sample clock. */
  startMs: number;
};

const LAYOUT_NAMES: Partial<Record<string, string>> = {
  originX: 'OriginX',
  originY: 'OriginY',
  width: 'Width',
  height: 'Height',
};
const SIZE_NAMES: Partial<Record<string, string>> = {
  originX: 'Width',
  originY: 'Height',
};

/**
 * The start value and the end value of a layout key of a box, from the values
 * that its builder got, as `layoutOf` makes them.
 */
function layoutEndsOf(
  { key, layoutValues }: FrameRecord,
  { initial, to }: Leaf
) {
  const name = LAYOUT_NAMES[key];
  if (!name) {
    return undefined;
  }
  const current = layoutValues[`current${name}`];
  return {
    from: current + ((initial as number | undefined) ?? 0),
    to: (layoutValues[`target${name}`] ?? current) + (to ?? 0),
  };
}

/** A sample of a position target is the center of the box. */
function shownOffsetOf({ key, layoutValues }: FrameRecord) {
  const size = SIZE_NAMES[key];
  return size
    ? (layoutValues[`target${size}`] ?? layoutValues[`current${size}`]) / 2
    : 0;
}

type ScalarKey = {
  key: string;
  tolerance: number;
  leaf?: Leaf;
  delayMs?: number;
  build?: number;
};

/**
 * The twin of a scalar key. Its frames go to the ends of the native box: the
 * layout of each box rounds to its own place of the pixel grid.
 */
function scalarTwinOf(
  played: Played,
  { key, tolerance, leaf = {}, delayMs, build = 0 }: ScalarKey
): Twin {
  const native = recordOf(played, 'native', key, build);
  const twin = startedRecordOf(played, 'frame', key, build);
  const curve = curveOf(twin, delayMs);
  const ends = layoutEndsOf(native, leaf);
  const from = native.start
    ? amountOf(native.start.value).amount
    : (ends?.from ?? curve.from);
  const to = ends?.to ?? curve.to;
  const scale =
    curve.to !== curve.from ? (to - from) / (curve.to - curve.from) : 1;
  const offset = shownOffsetOf(native);
  const shown = (value: number) => from + (value - curve.from) * scale + offset;
  return {
    shownAt: (timeMs) => [shown(curve.valueAt(timeMs))],
    endValues: [shown(curve.to)],
    lastFrameMs: curve.lastFrameMs,
    endMs: curve.endMs,
    tolerances: [tolerance],
    startMs: twin.start.timeMs + middleOf(played.clockOffset),
  };
}

/** The twin of the `Transform` target: the cells of the operations of the twin. */
function transformTwinOf(
  played: Played,
  operations: Operation[],
  layer: Layer
): Twin {
  const curves = operations.map(([kind, , to], operation) => ({
    kind,
    unit: amountOf(to as number | string).unit,
    record: startedRecordOf(played, 'frame', kind, 0, operation),
  }));
  const operationCurves = curves.map(({ record }) => curveOf(record));
  const cellsAt = (amounts: number[]) => {
    const cells = cellsOf(
      curves.map(({ kind, unit }, operation) => ({
        kind,
        amount: amounts[operation],
        unit,
      })),
      layer
    );
    return TRANSFORM_SAMPLE_CELLS.map((cell) => cells[cell]);
  };
  return {
    shownAt: (timeMs) =>
      cellsAt(operationCurves.map((curve) => curve.valueAt(timeMs))),
    endValues: cellsAt(operationCurves.map(({ to }) => to)),
    lastFrameMs: Math.max(...operationCurves.map((curve) => curve.lastFrameMs)),
    endMs: Math.max(...operationCurves.map((curve) => curve.endMs)),
    tolerances: TRANSFORM_SAMPLE_CELLS.map((cell) =>
      cellToleranceOf(cell, MATRIX_TOLERANCE)
    ),
    startMs: curves[0].record.start.timeMs + middleOf(played.clockOffset),
  };
}

const valuesOf = (twin: Twin, values: number[]) =>
  twin.tolerances.length === 1
    ? [values[0]]
    : TRANSFORM_SAMPLE_CELLS.map((cell) => values[cell]);

/**
 * The read is on the twin at one time of the `PRESENTATION_STAY_MS` before it,
 * from the native origin. From the last frame of the twin before its end frame,
 * a read can show the end value.
 */
function residualOnTwin(read: TargetSample, twin: Twin, origin: Band) {
  const tracks: NativeTrack[] = twin.tolerances.map((tolerance, cell) => ({
    declared: (timeMs) => twin.shownAt(timeMs)[cell],
    held: (timeMs) =>
      timeMs >= twin.lastFrameMs ? [twin.endValues[cell]] : [],
    edgesMs: [0, twin.lastFrameMs, twin.endMs],
    origin,
    played: { from: -Infinity, to: Infinity },
    tolerance,
  }));
  return nativeResidualOf(
    valuesOf(twin, read.presentation),
    read.monotonicTimeMs,
    tracks
  );
}

/**
 * Each read of a target of the native box from `fromMs` is on the twin. It
 * prints a `SPRING` row.
 */
function expectOnTwin(
  caseName: string,
  played: Played,
  target: string,
  twinOf: (read: TargetSample) => Twin,
  fromMs = -Infinity
) {
  const origin = nativeOriginOfPlay(played);
  const checked = readsOf(played, 'native', target)
    .filter(({ monotonicTimeMs }) => monotonicTimeMs >= fromMs)
    .map((read) => ({
      read,
      residual: residualOnTwin(read, twinOf(read), origin),
    }));
  const off = checked.filter(({ residual }) => !residual.isOnTimeline);
  const largestOf = (distances: number[]) => Math.max(0, ...distances);
  console.log(
    `SPRING | ${caseName} | ${target}: reads ${checked.length}, off the twin ${off.length}, largest distance ${largestOf(checked.map(({ residual }) => largestOf(residual.distances))).toFixed(4)}`
  );
  expect(checked.length > 0).toBe(true);
  expect(
    off
      .map(
        ({ read, residual }) =>
          `${read.presentation.join(' ')} at ${(read.monotonicTimeMs - middleOf(origin)).toFixed(2)} ms after the origin is ${largestOf(residual.distances).toFixed(4)} from the twin`
      )
      .join(', ')
  ).toBe('');
}

/**
 * NATIVE PLAYING of a target, from the reads of the native box that are
 * `PRESENTATION_STAY_MS` or more before the end of its track.
 */
function expectNativePlaying(
  played: Played,
  target: string,
  {
    events = played.events,
    reads = readsOf(played, 'native', target),
  }: { events?: TraceEvent[]; reads?: TargetSample[] } = {}
) {
  const ended = events.find(
    (event) => event.event === 'TrackEnded' && event.target === target
  );
  const untilMs = (ended?.monotonicTimeMs ?? Infinity) - PRESENTATION_STAY_MS;
  const playing = reads.filter(
    ({ monotonicTimeMs }) => monotonicTimeMs < untilMs
  );
  expect(routeOf(events, played.tags.native, target, playing).kind).toBe(
    'native playing'
  );
}

/**
 * The build fails with `failure`, and FRAME-DRIVEN of a target: two reads of
 * the native box after the refusal whose models differ, each on the twin at a
 * time from 5 display frames before it to 2 after it.
 */
function expectFrameDriven(
  caseName: string,
  played: Played,
  target: string,
  failure: string,
  twin: Twin
) {
  const refusal = played.events.find(
    ({ event }) => event === 'LayoutBuildFailed'
  );
  expect(refusal?.buildFailure).toBe(failure);
  if (!refusal) {
    return;
  }
  const differs = (first: number[], second: number[]) =>
    first.some(
      (value, cell) =>
        Math.abs(value - second[cell]) > 2 * twin.tolerances[cell]
    );
  const reads = readsOf(played, 'native', target).filter(
    ({ monotonicTimeMs }) =>
      monotonicTimeMs >= refusal.monotonicTimeMs + FRAME_DRIVER_LATE_MS
  );
  const [first] = reads;
  const second =
    first &&
    reads.find(({ model }) =>
      differs(valuesOf(twin, model), valuesOf(twin, first.model))
    );
  const samples = [first, second].filter(
    (read): read is TargetSample => read !== undefined
  );
  console.log(
    `SPRING-FALLBACK | ${caseName} | ${target}: models ${samples.map(({ model, monotonicTimeMs }) => `${valuesOf(twin, model).join(' ')} at ${(monotonicTimeMs - refusal.monotonicTimeMs).toFixed(2)} ms`).join(', ')} after the refusal`
  );
  const referenceAt = (sinceRefusalMs: number) =>
    twin.shownAt(refusal.monotonicTimeMs + sinceRefusalMs - twin.startMs);
  expect(
    routeOf(
      played.events,
      played.tags.native,
      target,
      samples,
      isOnFrameDriverWindowOf(
        referenceAt,
        (model) => valuesOf(twin, model),
        twin.tolerances
      )
    ).kind
  ).toBe('frame-driven');
}

const sortedCallbacks = () => [...callbacks].sort().join();

const expectCallbacks = (played: Played, expected: string[]) => {
  expect(played.missingCallbacks).toBe('');
  expect(sortedCallbacks()).toBe([...expected].sort().join());
};

const POSITION_X: ScalarKey = { key: 'originX', tolerance: POSITION_TOLERANCE };
const POSITION_Y: ScalarKey = { key: 'originY', tolerance: POSITION_TOLERANCE };
const OPACITY: ScalarKey = { key: 'opacity', tolerance: OPACITY_TOLERANCE };

const TARGETS: Record<string, string> = {
  originX: 'PositionX',
  originY: 'PositionY',
  opacity: 'Opacity',
  width: 'Width',
  height: 'Height',
};

/** NATIVE PLAYING of each key, and each read of each key on the twin. */
async function expectNativeOnTwin(
  caseName: string,
  springCase: SpringCase,
  keys: ScalarKey[],
  expectedCallbacks = DEFAULT_SPRING_CALLBACKS
) {
  const played = await play(springCase, expectedCallbacks);
  for (const scalarKey of keys) {
    const target = TARGETS[scalarKey.key];
    expectNativePlaying(played, target);
    const twin = scalarTwinOf(played, scalarKey);
    expectOnTwin(caseName, played, target, () => twin);
  }
  expectCallbacks(played, expectedCallbacks);
  await render(null);
  return played;
}

const springMoveOf = (
  x: WithSpringConfig,
  opacity: WithSpringConfig = x,
  totalMs = 2 * DEFAULT_SPRING_MS
): SpringCase => ({
  leaves: {
    originX: { spring: x },
    opacity: { spring: opacity, initial: OPACITY_FROM, to: OPACITY_TO },
  },
  places: [
    { ...START, opacity: OPACITY_FROM },
    { ...MOVED, opacity: OPACITY_TO },
  ],
  totalMs,
  targets: ['PositionX', 'Opacity'],
});

const xSpringOf = (spring: WithSpringConfig, leaf: Leaf = {}): SpringCase => ({
  leaves: { originX: { spring, ...leaf } },
  places: [START, MOVED],
  totalMs: 2 * DEFAULT_SPRING_MS,
  targets: ['PositionX'],
});

const ACCEPTED_SPRINGS: Record<string, SpringCase> = {
  'the default spring': springMoveOf({}),
  'an underdamped spring with a damping ratio of 0.3': springMoveOf(
    physics(0.3, 12),
    undefined,
    3200
  ),
  'a spring in duration mode': springMoveOf(
    { duration: 900, dampingRatio: 0.5 },
    undefined,
    2500
  ),
  'a spring with overshootClamping': springMoveOf(
    physics(0.3, 12, { overshootClamping: true }),
    undefined,
    800
  ),
  'a spring with a velocity toward the target': springMoveOf(
    { velocity: 1.5 * PAIR_LEFT },
    { velocity: 1.5 * (OPACITY_TO - OPACITY_FROM) }
  ),
  'a spring with a clamp that it does not reach': springMoveOf(
    { duration: 900, dampingRatio: 0.5, clamp: { min: -100, max: 300 } },
    { duration: 900, dampingRatio: 0.5, clamp: { min: 0.1, max: 0.9 } },
    2500
  ),
};

/** Each case has a config outside one gate of `SPRING_GATES` of the package. */
const REFUSED_SPRINGS: Record<string, SpringCase> = {
  'a damping ratio below 0.1': xSpringOf(physics(0.09, 20)),
  'a played velocity above 5 changes per second': xSpringOf(
    physics(0.3, 20, { velocity: 6 * PAIR_LEFT })
  ),
  'a natural frequency above 44.72 per second': xSpringOf(physics(0.3, 50)),
  'a settle time above 9.43 s': xSpringOf(physics(0.12, 7)),
  'an energy threshold above 0.01': xSpringOf({ energyThreshold: 0.02 }),
  'a clamp that raises the damping ratio': xSpringOf({
    duration: 900,
    dampingRatio: 0.3,
    clamp: { max: PAIR_LEFT + 10 },
  }),
  'no change with a velocity': {
    leaves: {
      originX: { spring: { velocity: 1000 } },
      originY: { duration: DEFAULT_SPRING_MS },
    },
    places: [START, { ...START, top: PAIR_TOP }],
    totalMs: DEFAULT_SPRING_MS,
    targets: ['PositionX'],
  },
};

describe('native layout springs', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'the default spring plays natively: NATIVE PLAYING',
    async () => {
      const played = await play(xSpringOf({}), DEFAULT_SPRING_CALLBACKS);
      expectNativePlaying(played, 'PositionX');
      await render(null);
    }
  );

  for (const [caseName, springCase] of Object.entries(REFUSED_SPRINGS)) {
    test(`${caseName} keeps the whole animation frame-driven: FRAME-DRIVEN, UnsupportedTiming`, async () => {
      const played = await play(springCase, []);
      expectFrameDriven(
        caseName,
        played,
        'PositionX',
        'UnsupportedTiming',
        scalarTwinOf(played, POSITION_X)
      );
      await render(null);
    });
  }

  for (const [caseName, springCase] of Object.entries(ACCEPTED_SPRINGS)) {
    movingGeometryTest(
      `${caseName} plays natively, and each read is on the frames of the twin: 0.5 pt for X, 0.01 for the opacity`,
      async () => {
        await expectNativeOnTwin(caseName, springCase, [POSITION_X, OPACITY]);
      }
    );
  }

  movingGeometryTest(
    'a spring ends its track one time one display frame or less from the end frame of the twin on the spring time of the twin, and its callback gets true one time',
    async () => {
      const played = await play(xSpringOf({}), DEFAULT_SPRING_CALLBACKS);
      logSpringClock('a spring ends its track', played);
      const origin = nativeOriginOfPlay(played);
      const ends = played.events.filter(
        ({ event, target }) => event === 'TrackEnded' && target === 'PositionX'
      );
      expect(summarize(ends)).toBe('TrackEnded:PositionX:true');
      if (ends.length === 0) {
        await render(null);
        return;
      }
      const nativeEndMs = ends[0].monotonicTimeMs - middleOf(origin);
      const twin = startedRecordOf(played, 'frame', 'originX');
      const twinEndMs = springCurveOf(twin, twin.start.timeMs).endMs;
      console.log(
        `SPRING-END | native track end ${nativeEndMs.toFixed(2)} ms after its origin, twin end frame ${curveOf(twin).endMs.toFixed(2)} ms after its start at the spring time ${twinEndMs.toFixed(2)} ms, origin uncertainty ${uncertaintyOf(origin).toFixed(2)} ms`
      );
      logEndOnTraceClock(played, origin, ends[0]);
      expect(
        Math.abs(nativeEndMs - twinEndMs) <=
          FRAME_MS + 2 * uncertaintyOf(origin)
      ).toBe(true);
      expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
      await render(null);
    }
  );

  movingGeometryTest(
    'a cancel at 50 % of a native spring gives its callback false one time',
    async () => {
      const played = await play(
        {
          ...xSpringOf({}),
          next: {
            atMs: DEFAULT_SPRING_MS / 2,
            place: START,
            leaves: { originX: {} },
          },
        },
        REPLACED_SPRING_CALLBACKS
      );
      expectNativePlaying(played, 'PositionX', {
        events: eventsOfFirstBuild(played),
        reads: readsOf(played, 'native', 'PositionX').slice(
          0,
          played.readsBeforeNext
        ),
      });
      expect(callbacks.filter((each) => each === 'native:false').length).toBe(
        1
      );
      expectCallbacks(played, REPLACED_SPRING_CALLBACKS);
      await render(null);
    }
  );

  const EXIT_LEAF: Leaf = { spring: {}, to: 80 };

  movingGeometryTest(
    PLAYS_HELD_SPRING
      ? 'a spring exit plays natively: NATIVE PLAYING, and the box leaves one display frame or less from the time at which the twin leaves'
      : 'a spring exit holds its end, so it is frame-driven: FRAME-DRIVEN, UnsupportedTarget',
    async () => {
      const played = await play(
        {
          flow: 'exiting',
          leaves: { originX: EXIT_LEAF },
          places: [START],
          totalMs: 2 * DEFAULT_SPRING_MS,
          targets: ['PositionX'],
        },
        DEFAULT_SPRING_CALLBACKS
      );
      if (!PLAYS_HELD_SPRING) {
        expectFrameDriven(
          'a spring exit',
          played,
          'PositionX',
          'UnsupportedTarget',
          scalarTwinOf(played, { ...POSITION_X, leaf: EXIT_LEAF })
        );
        expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
        await render(null);
        return;
      }
      expectNativePlaying(played, 'PositionX');
      const { native, frame } = played.removals;
      expect(native !== undefined && frame !== undefined).toBe(true);
      if (!native || !frame) {
        await render(null);
        return;
      }
      const origin = nativeOriginOfPlay(played);
      const nativeRemovalMs = middleOf(native) - middleOf(origin);
      const twinRemovalMs =
        middleOf(frame) -
        startedRecordOf(played, 'frame', 'originX').start.timeMs -
        middleOf(played.clockOffset);
      const boundMs =
        FRAME_MS +
        uncertaintyOf(native) +
        uncertaintyOf(frame) +
        2 * uncertaintyOf(origin);
      console.log(
        `SPRING-REMOVAL | native box ${nativeRemovalMs.toFixed(2)} ms after its origin, twin ${twinRemovalMs.toFixed(2)} ms after its start, bound ${boundMs.toFixed(2)} ms`
      );
      expect(Math.abs(nativeRemovalMs - twinRemovalMs) <= boundMs).toBe(true);
      expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
      await render(null);
    }
  );

  test('a spring with reduced motion has no track: the frame driver puts the end value at once', async () => {
    const played = await play(
      xSpringOf({ reduceMotion: ReduceMotion.Always }),
      DEFAULT_SPRING_CALLBACKS
    );
    const hostEvents = played.events.filter(
      ({ event }) => event !== 'FrameUpdateMounted'
    );
    expect(summarize(hostEvents)).toBe('LayoutBuildFailed:UnsupportedTiming');
    const native = recordOf(played, 'native', 'originX');
    const endValue = native.layoutValues.targetOriginX;
    expect(native.frames.every(({ value }) => value === endValue)).toBe(true);
    const shownEnd = endValue + shownOffsetOf(native);
    const late = readsOf(played, 'native', 'PositionX').filter(
      ({ monotonicTimeMs }) =>
        monotonicTimeMs >=
        (hostEvents[0]?.monotonicTimeMs ?? Infinity) + FRAME_DRIVER_LATE_MS
    );
    expect(late.length > 0).toBe(true);
    expect(
      late.every(
        ({ presentation, playbacks }) =>
          playbacks.length === 0 &&
          Math.abs(presentation[0] - shownEnd) <= LAID_OUT_TOLERANCE
      )
    ).toBe(true);
    expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
    await render(null);
  });

  movingGeometryTest(
    'a new spring at 40 % of a native spring starts on the frame driver: it continues from the state of the native spring at the commit origin and follows its declared curve from there, its frames are the frames of the twin, each box on its spring time, and the twin starts two display frames or less before the commit origin on the first twin curve',
    async () => {
      const atMs = 0.4 * DEFAULT_SPRING_MS;
      const played = await play(
        {
          ...xSpringOf({}),
          next: {
            atMs,
            place: { ...START, left: PAIR_LEFT / 2 },
            leaves: { originX: { spring: {} } },
          },
          totalMs: atMs + 2 * DEFAULT_SPRING_MS,
        },
        REPLACED_SPRING_CALLBACKS
      );
      logSpringClock('a new spring at 40 %', played);
      expectNativePlaying(played, 'PositionX', {
        events: eventsOfFirstBuild(played),
        reads: readsOf(played, 'native', 'PositionX').slice(
          0,
          played.readsBeforeNext
        ),
      });
      expectFrameDriven(
        'a new spring at 40 %',
        played,
        'PositionX',
        'UnsupportedContinuation',
        scalarTwinOf(played, { ...POSITION_X, build: 1 })
      );
      const [native, twin] = BOX_NAMES.map((box) =>
        startedRecordOf(played, box, 'originX', 1)
      );
      const firstTwin = startedRecordOf(played, 'frame', 'originX');
      const firstOrigin = firstCommandOf(played.events);
      const firstOriginMs =
        played.events.find(
          (event) =>
            event.event === 'Received' &&
            event.generation === firstOrigin.generation
        )?.originTimestampMs ?? NaN;
      const twinLastTimestampMs =
        lastOf(firstTwin.frames.map(({ timeMs }) => timeMs)) ?? NaN;
      const firstTwinCurve = springCurveOf(firstTwin, firstTwin.start.timeMs);
      const twinCurve = springCurveOf(twin, twinLastTimestampMs);
      const nativeFirstSpringMs = native.start.timeMs - firstOriginMs;
      const nativeSpringTimesMs = springTimesOf(
        native.start.timeMs,
        native.frames.map(({ timeMs }) => timeMs)
      );
      const checkpoints = Array.from({ length: 10 }, (_, checkpoint) =>
        Math.floor(((checkpoint + 1) * (native.frames.length - 1)) / 10)
      ).filter((frame) => frame > 0);
      const startDistance = Math.abs(
        Number(native.start.value) - firstTwinCurve.valueAt(nativeFirstSpringMs)
      );
      const distances = checkpoints.map((frame) =>
        Math.abs(
          Number(native.frames[frame].value) -
            twinCurve.valueAt(nativeSpringTimesMs[frame])
        )
      );
      const matches = checkpoints.map((frame) =>
        matchInWindowOf(
          (springTimeMs) => [twinCurve.valueAt(springTimeMs)],
          [Number(native.frames[frame].value)],
          [POSITION_TOLERANCE],
          [
            nativeSpringTimesMs[frame] - FRAME_MS,
            nativeSpringTimesMs[frame] + FRAME_MS,
          ]
        )
      );
      const twinStart = matchInWindowOf(
        (springTimeMs) => [firstTwinCurve.valueAt(springTimeMs)],
        [Number(twin.start.value)],
        [POSITION_TOLERANCE],
        [nativeFirstSpringMs - 2 * FRAME_MS, nativeFirstSpringMs]
      );
      console.log(
        `SPRING-RETARGET | start of the twin minus the native origin ${(firstTwin.start.timeMs - firstOriginMs).toFixed(3)} ms, new start of the native box ${native.start.value} at ${native.start.timeMs}, ${nativeFirstSpringMs.toFixed(3)} ms after the first origin, of the twin ${twin.start.value} at ${twin.start.timeMs}, twin spring clock from its last frame of the first spring ${twinLastTimestampMs.toFixed(3)}, native frames ${native.frames.length}, spring times of the checkpoints ${checkpoints.map((frame) => nativeSpringTimesMs[frame].toFixed(3)).join(' ')}, start distance to the first twin curve ${startDistance.toFixed(4)}, distances at equal spring times ${distances.map((distance) => distance.toFixed(4)).join(' ')}, smallest distances to the twin curve within one display frame of spring time ${matches.map(({ distance }) => distance.toFixed(4)).join(' ')}, twin start on the first twin curve from ${(nativeFirstSpringMs - 2 * FRAME_MS).toFixed(3)} to ${nativeFirstSpringMs.toFixed(3)} ms of spring time: smallest distance ${twinStart.distance.toFixed(4)} in the step from ${twinStart.stepMs.toFixed(3)} ms`
      );
      logSharedFrames(native, twin, twinLastTimestampMs);
      expect(new Set(checkpoints).size).toBe(10);
      expect(startDistance <= POSITION_TOLERANCE).toBe(true);
      expect(matches.every(({ isNear }) => isNear)).toBe(true);
      expect(twinStart.isNear).toBe(true);
      expectCallbacks(played, REPLACED_SPRING_CALLBACKS);
      await render(null);
    }
  );

  const TRANSFORM_SPRINGS: Operation[] = [
    ['rotate', '0deg', '90deg', { spring: {} }],
    ['scale', 0.5, 1, { spring: {} }],
  ];

  movingGeometryTest(
    'springs of a rotate to a string and of a scale play natively, and each read of the transform is on the frames of the twin',
    async () => {
      const played = await play(
        {
          operations: TRANSFORM_SPRINGS,
          places: [START, MOVED],
          totalMs: 2 * DEFAULT_SPRING_MS,
          targets: ['Transform'],
        },
        DEFAULT_SPRING_CALLBACKS
      );
      expectNativePlaying(played, 'Transform');
      const started = played.events.find(
        ({ event, target }) =>
          event === 'TrackStarted' && target === 'Transform'
      );
      expectOnTwin(
        'springs of a rotate and of a scale',
        played,
        'Transform',
        (read) => transformTwinOf(played, TRANSFORM_SPRINGS, layerOf(read)),
        (started?.monotonicTimeMs ?? Infinity) + PRESENTATION_STAY_MS
      );
      expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
      await render(null);
    }
  );

  /**
   * The least height is `to - 0.3723 * (100 - to)`: with damping ratio 0.3 and
   * no initial velocity, the first overshoot is 0.3723 of the change
   * (`narrowProgressRangeOf`).
   */
  const playHeightSpring = (to: number) =>
    play(
      {
        leaves: { height: { spring: physics(0.3, 8) } },
        places: [
          { ...START, height: 100 },
          { ...START, height: to },
        ],
        totalMs: 4400,
        targets: ['Height'],
      },
      DEFAULT_SPRING_CALLBACKS
    );

  const HEIGHT: ScalarKey = { key: 'height', tolerance: POSITION_TOLERANCE };

  const expectHeightEndsAt = (played: Played, to: number) => {
    const last = played.reads[played.reads.length - 1];
    for (const value of [
      last.native?.Height.presentation[0],
      last.native?.Height.model[0],
      last.frame?.Height.model[0],
    ]) {
      expect(Math.abs((value ?? NaN) - to) <= LAID_OUT_TOLERANCE).toBe(true);
    }
  };

  test(
    PLAYS_SIZE_CHANGE
      ? 'an underdamped height spring from 100 to 0 can go below 0, so it is frame-driven: FRAME-DRIVEN, UnsupportedTarget, and it ends at 0'
      : 'an underdamped height spring from 100 to 0 changes the size, so it is frame-driven: FRAME-DRIVEN, UnsupportedTarget, and it ends at 0',
    async () => {
      const played = await playHeightSpring(0);
      const twin = scalarTwinOf(played, HEIGHT);
      for (const read of played.reads) {
        console.log(
          `SPRING-SIZE | native presentation ${read.native?.Height.presentation[0]}, native model ${read.native?.Height.model[0]}, twin model ${read.frame?.Height.model[0]}, twin frames ${twin.shownAt((read.native?.Height.monotonicTimeMs ?? NaN) - twin.startMs)[0]} at ${read.native?.Height.monotonicTimeMs}`
        );
      }
      expectFrameDriven(
        'a height spring',
        played,
        'Height',
        'UnsupportedTarget',
        twin
      );
      expectHeightEndsAt(played, 0);
      expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
      await render(null);
    }
  );

  for (const [to, least] of [
    [60, 45.1],
    [40, 17.7],
  ]) {
    test(
      PLAYS_SIZE_CHANGE
        ? `an underdamped height spring from 100 to ${to} stays above 0 (least ${least}), so it plays natively: NATIVE PLAYING, and it ends at ${to}`
        : `an underdamped height spring from 100 to ${to} changes the size, so it is frame-driven: FRAME-DRIVEN, UnsupportedTarget, and it ends at ${to}`,
      async () => {
        const played = await playHeightSpring(to);
        if (PLAYS_SIZE_CHANGE) {
          expectNativePlaying(played, 'Height');
        } else {
          expectFrameDriven(
            'a height spring that stays above 0',
            played,
            'Height',
            'UnsupportedTarget',
            scalarTwinOf(played, HEIGHT)
          );
        }
        expectHeightEndsAt(played, to);
        expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a spring on X beside a timing of another duration on Y plays natively, and the reads of each are on the frames of the twin',
    async () => {
      await expectNativeOnTwin(
        'a spring beside a timing',
        {
          leaves: {
            originX: { spring: {} },
            originY: { duration: 2 * DEFAULT_SPRING_MS },
          },
          places: [START, MOVED_DOWN],
          totalMs: 2.5 * DEFAULT_SPRING_MS,
          targets: ['PositionX', 'PositionY'],
        },
        [POSITION_X, POSITION_Y]
      );
    }
  );

  movingGeometryTest(
    'two energy thresholds of one physics on two keys play natively, and the reads of each are on the frames of its twin',
    async () => {
      await expectNativeOnTwin(
        'two energy thresholds',
        {
          leaves: {
            originX: { spring: { energyThreshold: 1e-4 } },
            originY: { spring: { energyThreshold: 1e-2 } },
          },
          places: [START, MOVED_DOWN],
          totalMs: 2 * DEFAULT_SPRING_MS,
          targets: ['PositionX', 'PositionY'],
        },
        [POSITION_X, POSITION_Y]
      );
    }
  );

  movingGeometryTest(
    PLAYS_SIZE_CHANGE
      ? 'LinearTransition.springify() with a change of the position plays natively: NATIVE PLAYING for X and Y, NATIVE IMMEDIATE for a size with no change, NATIVE PLAYING for a size that the layout rounds'
      : 'LinearTransition.springify() with a change of the position: FRAME-DRIVEN, UnsupportedTarget for X and Y when the layout changes a size by more than one pixel, else NATIVE PLAYING for X and Y, NATIVE IMMEDIATE for a size with no change, and NATIVE PLAYING for a size that the layout rounds',
    async () => {
      const played = await play(
        {
          builder: (callback) =>
            LinearTransition.springify().withCallback(callback),
          places: [START, MOVED_DOWN],
          totalMs: 2 * DEFAULT_SPRING_MS,
          targets: ['PositionX', 'PositionY', 'Width', 'Height'],
        },
        DEFAULT_SPRING_CALLBACKS
      );
      const { layoutValues } = recordOf(played, 'native', 'height');
      const sizes = ['Width', 'Height'].map((target) => ({
        target,
        change:
          layoutValues[`target${target}`] - layoutValues[`current${target}`],
      }));
      const sizeReads = sizes.map(({ target, change }) => {
        const reads = readsOf(played, 'native', target);
        const playing = reads.filter(({ playbacks }) =>
          playbacks.some((playback) => playback.target === target)
        );
        return `${target}: change ${change}, ${reads.length} reads, ${playing.length} with a playback of ${target}`;
      });
      const startedX = played.events.find(
        (event) =>
          event.event === 'TrackStarted' && event.target === 'PositionX'
      );
      const sinceStartedX = (monotonicTimeMs = NaN) =>
        `${(monotonicTimeMs - (startedX?.monotonicTimeMs ?? NaN)).toFixed(2)} ms`;
      const xReads = readsOf(played, 'native', 'PositionX');
      const trackEnds = played.events
        .filter(({ event }) => event === 'TrackEnded')
        .map(
          ({ target, monotonicTimeMs }) =>
            `${target} ${sinceStartedX(monotonicTimeMs)}`
        );
      console.log(
        `SPRING-SPRINGIFY | layout values of the native box: ${JSON.stringify(layoutValues)}; ${sizeReads.join('; ')}; after TrackStarted:PositionX: last read ${sinceStartedX(xReads[xReads.length - 1]?.monotonicTimeMs)}, TrackEnded ${trackEnds.join(', ')}`
      );
      if (!sizes.every(({ change }) => playsSizeChangeOf(change))) {
        for (const key of [POSITION_X, POSITION_Y]) {
          expectFrameDriven(
            'LinearTransition.springify()',
            played,
            TARGETS[key.key],
            'UnsupportedTarget',
            scalarTwinOf(played, key)
          );
        }
        expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
        await render(null);
        return;
      }
      for (const target of ['PositionX', 'PositionY']) {
        expectNativePlaying(played, target);
      }
      expect(sizes.some(({ change }) => isNear(change, 0))).toBe(true);
      for (const { target, change } of sizes) {
        if (change === 0) {
          const afterEnd = await sampleTargets(played.tags.native, [target]);
          expect(
            routeOf(played.events, played.tags.native, target, [
              afterEnd[target],
            ]).kind
          ).toBe('native immediate');
        } else {
          expectNativePlaying(played, target);
        }
      }
      const twin = scalarTwinOf(played, POSITION_X);
      expectOnTwin(
        'LinearTransition.springify()',
        played,
        'PositionX',
        () => twin
      );
      expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
      await render(null);
    }
  );

  const SPRING_BESIDE_TIMING: Operation[] = [
    ['rotate', '0deg', '90deg', { spring: {} }],
    ['translateX', 0, 80, { duration: 2 * DEFAULT_SPRING_MS }],
  ];

  movingGeometryTest(
    PLAYS_SPRING_WITH_HOLD
      ? 'a spring operation beside an operation of another duration plays natively: NATIVE PLAYING'
      : 'a spring operation beside an operation of another duration has a hold, so it is frame-driven: FRAME-DRIVEN, UnsupportedTarget',
    async () => {
      const played = await play(
        {
          operations: SPRING_BESIDE_TIMING,
          places: [START, MOVED],
          totalMs: 2.5 * DEFAULT_SPRING_MS,
          targets: ['Transform'],
        },
        DEFAULT_SPRING_CALLBACKS
      );
      if (PLAYS_SPRING_WITH_HOLD) {
        expectNativePlaying(played, 'Transform');
      } else {
        expectFrameDriven(
          'a spring operation beside a timing',
          played,
          'Transform',
          'UnsupportedTarget',
          transformTwinOf(played, SPRING_BESIDE_TIMING, 'rest')
        );
      }
      expectCallbacks(played, DEFAULT_SPRING_CALLBACKS);
      await render(null);
    }
  );

  movingGeometryTest(
    'withDelay(withSpring) plays natively, and each read is on the frames of the twin',
    async () => {
      const delayMs = 300;
      await expectNativeOnTwin(
        'withDelay(withSpring)',
        {
          ...xSpringOf({}, { delays: [delayMs] }),
          totalMs: delayMs + 2 * DEFAULT_SPRING_MS,
        },
        [{ ...POSITION_X, delayMs }]
      );
    }
  );
});
