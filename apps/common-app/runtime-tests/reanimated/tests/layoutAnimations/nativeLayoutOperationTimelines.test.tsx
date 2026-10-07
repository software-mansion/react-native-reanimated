import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  Keyframe,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
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
import type { TargetSample, TraceEvent } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  callbackTimes,
  curveOf,
  declaredFrameChangeAt,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  hasNativeLayoutStarts,
  isHostEvent,
  layoutOf,
  mountScene,
  namedBuilderCalls,
  countedOf,
  recordedCurveOf,
  sample,
  sampleClockOffset,
  SizePair,
  takeAtFrameDriverFrame,
  styles,
  summarize,
  takeTrace,
  twinStartTime,
} from './nativeLayoutTestKit';

type AnyEasing = EasingFunction | EasingFunctionFactory;

/** One timing of an operation, after a hold of `holdMs`. */
type Part = {
  to: number | string;
  ms: number;
  holdMs?: number;
  /** No value: a linear easing. */
  easing?: AnyEasing | 'default';
};

type Operation = {
  kind: string;
  from: number | string;
  /** No parts: the array of animations holds `to` and no animation. */
  parts: Part[];
  to?: number | string;
  delayMs?: number;
};

const START_LEFT = 60;
const END_LEFT = 62;
const DEGREE = Math.PI / 180;
const DEFAULT_CURVE = Easing.inOut(Easing.quad);
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const TRANSFORM_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted';
const TRANSFORM_END = 'TrackEnded:Transform:true > Ended:Finished:None';

const numberOf = (value: number | string) =>
  typeof value === 'string' ? parseFloat(value) : value;

const endOf = ({ parts, to, from }: Operation) =>
  to ?? parts[parts.length - 1]?.to ?? from;

const curveOfPart = ({ easing }: Part) =>
  !easing
    ? Easing.linear
    : easing === 'default'
      ? DEFAULT_CURVE
      : curveOf(easing);

/** The declared scalar of an operation at a time from the start. */
function declaredAt(operation: Operation, timeMs: number) {
  let value = numberOf(operation.from);
  let startMs = operation.delayMs ?? 0;
  for (const part of operation.parts) {
    startMs += part.holdMs ?? 0;
    const elapsed = timeMs - startMs;
    if (elapsed < 0) {
      return value;
    }
    if (elapsed < part.ms) {
      return (
        value +
        (numberOf(part.to) - value) * curveOfPart(part)(elapsed / part.ms)
      );
    }
    value = numberOf(part.to);
    startMs += part.ms;
  }
  return numberOf(endOf(operation));
}

type TimelineLayout = {
  name: string;
  operations: Operation[];
  /** An opacity leaf with a spring: the animation has no native form. */
  hasSpringLeaf?: boolean;
  /**
   * The first part of an operation writes the start of the animation on the
   * animation clock to `twinStartTime`.
   */
  recordsStart?: boolean;
};

/** An operation whose first part starts with the animation and has a duration. */
const recordedOperationOf = (operations: Operation[]) =>
  operations.findIndex(
    ({ parts: [first], delayMs }) =>
      first !== undefined && first.ms > 0 && !first.holdMs && !delayMs
  );

/**
 * A layout animation, or an entering animation, whose `transform` leaf has the
 * operations with their own timelines.
 */
function timelinesOf({
  name,
  operations,
  hasSpringLeaf = false,
  recordsStart = false,
}: TimelineLayout): LayoutAnimationFunction {
  const recorded = recordsStart ? recordedOperationOf(operations) : -1;
  const easings = operations.map(({ parts }, operationIndex) =>
    parts.map((part, partIndex) =>
      operationIndex === recorded && partIndex === 0
        ? recordedCurveOf(curveOfPart(part), part.ms)
        : part.easing
    )
  );
  const callback = callbackOf(name);
  return () => {
    'worklet';
    const animations = operations.map((operation, operationIndex) => {
      if (operation.parts.length === 0) {
        return { [operation.kind]: operation.to };
      }
      const timings = operation.parts.map(({ to, ms, holdMs }, partIndex) => {
        const easing = easings[operationIndex][partIndex];
        const timing = withTiming(
          to,
          easing === 'default'
            ? { duration: ms }
            : { duration: ms, easing: easing ?? Easing.linear }
        );
        return holdMs === undefined ? timing : withDelay(holdMs, timing);
      });
      const sequence =
        timings.length === 1 ? timings[0] : withSequence(...timings);
      return {
        [operation.kind]:
          operation.delayMs === undefined
            ? sequence
            : withDelay(operation.delayMs, sequence),
      };
    });
    return {
      initialValues: {
        transform: operations.map(({ kind, from }) => ({ [kind]: from })),
        ...(hasSpringLeaf && { opacity: 0.5 }),
      },
      animations: {
        transform: animations,
        ...(hasSpringLeaf && { opacity: withSpring(1) }),
      },
      callback,
    } as ReturnType<LayoutAnimationFunction>;
  };
}

const endTransformOf = (operations: Operation[]) =>
  operations.map((operation) => {
    const end = endOf(operation);
    const isAngle = operation.kind.startsWith('rotate');
    return {
      [operation.kind]: isAngle && typeof end === 'number' ? `${end}rad` : end,
    };
  }) as ViewStyle['transform'];

type PairOptions = Pick<TimelineLayout, 'hasSpringLeaf'>;

/**
 * The native box and its frame-driven twin have the same operations. The twin
 * records the start of its animation: the two start in one commit, so it is the
 * start of the native box too.
 */
const pairOf = (operations: Operation[], options: PairOptions = {}) => ({
  nativeLayout: countedOf(
    'native',
    timelinesOf({ name: 'native', operations, ...options })
  ) as LayoutAnimationFunction,
  frameLayout: frameDrivenOf(
    countedOf(
      'frame',
      timelinesOf({ name: 'frame', operations, ...options, recordsStart: true })
    )
  ) as LayoutAnimationFunction,
});

const sceneOf = (
  layouts: ReturnType<typeof pairOf>,
  operations: Operation[],
  left: number
) => (
  <SizePair
    left={left}
    top={60}
    style={{ transform: endTransformOf(operations) }}
    {...layouts}
    inRow
  />
);

const tagsOf = () => ({
  native: getTestComponent(BOX_REF).getTag(),
  frame: getTestComponent(FRAME_BOX_REF).getTag(),
});

async function takeTraceOfPair() {
  const tags = tagsOf();
  const events = (await takeTrace()).filter(
    ({ event }) => event !== 'FrameUpdateMounted'
  );
  return {
    native: events.filter(({ tag }) => tag === tags.native),
    frame: events.filter(({ tag }) => tag === tags.frame),
  };
}

const isStartEvent = ({ event }: TraceEvent) =>
  event !== 'TrackEnded' && event !== 'Ended';
const summarizeStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter(isStartEvent));
const summarizeAfterStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter((event) => !isStartEvent(event)));

async function samplePair() {
  const tags = tagsOf();
  const [native, frame] = await Promise.all([
    sample(tags.native, 'Transform'),
    sample(tags.frame, 'Transform'),
  ]);
  return { native, frame };
}

type Played = { startMs: number; clockOffset: number };

/** Mounts the pair, then starts the two layout animations in one commit. */
async function play(
  operations: Operation[],
  options: PairOptions = {}
): Promise<Played> {
  const layouts = pairOf(operations, options);
  const tag = await mountScene(sceneOf(layouts, operations, START_LEFT));
  const clock = await sampleClockOffset(tag);
  namedBuilderCalls.length = 0;
  const startMs = performance.now();
  await render(sceneOf(layouts, operations, END_LEFT));
  return { startMs, clockOffset: clock.offset };
}

const waitUntil = ({ startMs }: Played, elapsedMs: number) =>
  wait(Math.max(0, startMs + elapsedMs - performance.now()));

const sortedCallbacks = () => callbacks.slice().sort().join();

const isNear = (value: number, expected: number, tolerance: number) =>
  Math.abs(value - expected) < tolerance;

const largestCellDifference = (first: number[], second: number[]) =>
  Math.max(...first.map((cell, index) => Math.abs(cell - second[index])));

type Member = TargetSample['members'][number];

/** The first component of each value of a member, or its matrix cell. */
const valuesOf = ({ values }: Member, cell = 0) =>
  values.map((value) => value[cell]);

function expectNear(shown: number[], expected: number[], tolerance = 1e-6) {
  expect(shown.length).toBe(expected.length);
  expect(
    shown.every((value, index) => isNear(value, expected[index], tolerance))
  ).toBe(true);
}

/**
 * The time of a sample or of a trace event, from the recorded start of the
 * animation.
 */
const timeFromStart = (
  { monotonicTimeMs }: { monotonicTimeMs: number },
  { clockOffset }: Played
) => monotonicTimeMs - clockOffset - twinStartTime.value;

// Core Animation reports the end of a playback in a display frame after it.
const END_REPORT_FRAMES = 2;

/**
 * The track plays to the end of its longest operation: no end and no callback
 * before it, then one end in the frames after it, one callback with `true`, and
 * the end value.
 */
async function expectOneEndAfter(played: Played, endMs: number) {
  await waitUntil(played, endMs - 6 * FRAME_MS);
  const before = await samplePair();
  expect(before.native.playbackKeys.length).toBe(1);
  expect(summarizeAfterStart((await takeTraceOfPair()).native)).toBe('');
  expect(callbacks.filter((each) => each.startsWith('native')).length).toBe(0);

  await waitUntil(played, endMs + 300);
  const end = await samplePair();
  expect(end.native.playbackKeys.length).toBe(0);
  expect(largestCellDifference(end.native.presentation, end.native.model)).toBe(
    0
  );
  expect(largestCellDifference(end.native.model, end.frame.model) < 0.01).toBe(
    true
  );
  const events = (await takeTraceOfPair()).native.filter(
    (event) => isHostEvent(event) && !isStartEvent(event)
  );
  expect(summarize(events)).toBe(TRANSFORM_END);
  const endedAtMs = timeFromStart(events[0], played);
  expect(endedAtMs > endMs - FRAME_MS).toBe(true);
  expect(endedAtMs < endMs + END_REPORT_FRAMES * FRAME_MS).toBe(true);
  expect(sortedCallbacks()).toBe('frame:true,native:true');
  expect(namedBuilderCalls.slice().sort().join()).toBe('frame,native');
}

describe('native layout operation timelines', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const QUARTER_TURN = Math.PI / 2;

  test('a rotation in the first half of the time of a translation: one track, the rotation member holds its end value, and one callback at the end of the translation', async () => {
    const operations: Operation[] = [
      { kind: 'rotate', from: '0deg', parts: [{ to: '90deg', ms: 600 }] },
      { kind: 'translateX', from: 0, parts: [{ to: 100, ms: 1200 }] },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    const events = await takeTraceOfPair();
    expect(summarizeStart(events.native)).toBe(TRANSFORM_START);
    expect(summarize(events.frame)).toBe('LayoutBuildFailed:UnsupportedTiming');
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform.translateX,transform.rotateZ'
    );
    expectNear(members[0].keyTimes, [0, 1]);
    expect(members[0].values[0].join()).toBe(IDENTITY.join());
    expectNear(members[1].keyTimes, [0, 1]);
    expectNear(valuesOf(members[1]), [0, 100]);
    expectNear(members[2].keyTimes, [0, 0.5, 1]);
    expectNear(valuesOf(members[2]), [0, QUARTER_TURN, QUARTER_TURN]);
    await expectOneEndAfter(played, 1200);
    await render(null);
  });

  test('a rotation with a delay beside a translation: the rotation member holds its start value for the delay and its end value after its time', async () => {
    const operations: Operation[] = [
      { kind: 'translateX', from: 0, parts: [{ to: 100, ms: 1200 }] },
      {
        kind: 'rotate',
        from: '30deg',
        delayMs: 360,
        parts: [{ to: '90deg', ms: 600 }],
      },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform.rotateZ,transform.translateX'
    );
    expectNear(members[1].keyTimes, [0, 0.3, 0.8, 1]);
    expectNear(valuesOf(members[1]), [
      30 * DEGREE,
      30 * DEGREE,
      QUARTER_TURN,
      QUARTER_TURN,
    ]);
    expectNear(members[2].keyTimes, [0, 1]);
    await expectOneEndAfter(played, 1200);
    await render(null);
  });

  test('three operations with three durations: each member has its own key times, and the callback comes at the end of the longest operation', async () => {
    const operations: Operation[] = [
      {
        kind: 'translateX',
        from: 0,
        parts: [{ to: 80, ms: 1200, easing: 'default' }],
      },
      { kind: 'scale', from: 0.5, parts: [{ to: 1.2, ms: 720 }] },
      { kind: 'rotate', from: '0deg', parts: [{ to: '60deg', ms: 420 }] },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform.rotateZ,transform.scale,transform.translateX'
    );
    expectNear(members[1].keyTimes, [0, 0.35, 1]);
    expectNear(valuesOf(members[1]), [0, 60 * DEGREE, 60 * DEGREE]);
    expectNear(members[2].keyTimes, [0, 0.6, 1]);
    expect(members[2].values.map((value) => value.join()).join(' ')).toBe(
      '0.5,0.5,0.5 1.2,1.2,1.2 1.2,1.2,1.2'
    );
    expectNear(members[3].keyTimes, [0, 0.5, 1]);
    expectNear(valuesOf(members[3]), [0, 40, 80]);
    await expectOneEndAfter(played, 1200);
    await render(null);
  });

  test('an operation alone with the default easing, a hold, and a second move is on its declared timeline and on the timeline of its frame-driven twin', async () => {
    const operation: Operation = {
      kind: 'translateX',
      from: 0,
      parts: [
        { to: 80, ms: 500, easing: 'default' },
        { to: 20, ms: 600, holdMs: 300 },
      ],
    };
    const played = await play([operation]);
    await waitUntil(played, 100);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { members } = (await samplePair()).native;
    expectNear(members[1].keyTimes, [0, 250 / 1400, 500 / 1400, 800 / 1400, 1]);
    expectNear(valuesOf(members[1]), [0, 40, 80, 80, 20]);

    const declared = (timeMs: number) => declaredAt(operation, timeMs);
    for (const elapsedMs of [200, 400, 650, 1000, 1250]) {
      await waitUntil(played, elapsedMs);
      const { native, frame } = await samplePair();
      const timeMs = timeFromStart(native, played);
      const frameChange = declaredFrameChangeAt(declared, timeMs);
      expect(
        isNear(native.presentation[12], declared(timeMs), 0.25 + frameChange)
      ).toBe(true);
      expect(
        isNear(frame.model[12], declared(timeMs), 0.25 + 2 * frameChange)
      ).toBe(true);
      expect(native.playbackKeys.length).toBe(1);
    }
    await expectOneEndAfter(played, 1400);
    await render(null);
  });

  test('a plain value of an operation shows from the start beside an operation that moves', async () => {
    const operations: Operation[] = [
      { kind: 'rotate', from: '0deg', parts: [{ to: '90deg', ms: 900 }] },
      { kind: 'translateX', from: 0, to: 30, parts: [] },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform,transform.rotateZ'
    );
    expectNear(valuesOf(members[1], 12), [30, 30]);
    expectNear(members[2].keyTimes, [0, 1]);
    await expectOneEndAfter(played, 900);
    await render(null);
  });

  const constants: [string, number, number][] = [
    ['a longer time than the operation that moves', 1200, 600],
    ['a shorter time than the operation that moves', 400, 1000],
  ];
  for (const [caseName, constantMs, movingMs] of constants) {
    test(`an operation that keeps its value for ${caseName}: the track ends at the end of the longer operation`, async () => {
      const operations: Operation[] = [
        { kind: 'scale', from: 1, parts: [{ to: 1, ms: constantMs }] },
        { kind: 'translateX', from: 0, parts: [{ to: 60, ms: movingMs }] },
      ];
      const endMs = Math.max(constantMs, movingMs);
      const played = await play(operations);
      await waitUntil(played, 150);
      expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
        TRANSFORM_START
      );
      const { members } = (await samplePair()).native;
      expect(members.map(({ property }) => property).join()).toBe(
        'transform,transform.translateX,transform'
      );
      expectNear(
        members[1].keyTimes,
        movingMs < endMs ? [0, movingMs / endMs, 1] : [0, 1]
      );
      expectNear(members[2].keyTimes, [0, 1]);
      if (movingMs < endMs) {
        await waitUntil(played, (movingMs + endMs) / 2);
        expect((await samplePair()).native.presentation[12]).toBe(60);
      }
      await expectOneEndAfter(played, endMs);
      await render(null);
    });
  }

  test('a first part with no duration before a part with a duration gives its value to the start of the operation', async () => {
    const operations: Operation[] = [
      {
        kind: 'translateX',
        from: 0,
        parts: [
          { to: 40, ms: 0 },
          { to: 0, ms: 800 },
        ],
      },
      { kind: 'scaleY', from: 1, parts: [{ to: 1.5, ms: 400 }] },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { native, frame } = await samplePair();
    expectNear(valuesOf(native.members[2]), [40, 0]);
    expectNear(native.members[1].keyTimes, [0, 0.5, 1]);
    expect(native.presentation[12] > 25 && native.presentation[12] < 40).toBe(
      true
    );
    expect(isNear(native.presentation[12], frame.model[12], 2.5)).toBe(true);
    await expectOneEndAfter(played, 800);
    await render(null);
  });

  test('an operation with control points beside an operation with a fitted easing function: each member has the keys of its own timing', async () => {
    const operations: Operation[] = [
      {
        kind: 'translateX',
        from: 0,
        parts: [{ to: 100, ms: 1200, easing: Easing.bezier(0.3, 0, 0.7, 1) }],
      },
      {
        kind: 'rotate',
        from: '0deg',
        parts: [{ to: '90deg', ms: 840, easing: Easing.bounce }],
      },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform.rotateZ,transform.translateX'
    );
    expect(members[1].keyTimes.length).toBe(24);
    expectNear(members[1].keyTimes.slice(-2), [0.7, 1]);
    expectNear(valuesOf(members[1]).slice(-2), [QUARTER_TURN, QUARTER_TURN]);
    expectNear(members[2].keyTimes, [0, 1]);
    await expectOneEndAfter(played, 1200);
    await render(null);
  });

  test('a hold between two moves of one operation while another operation moves: the hold is a key of that member only', async () => {
    const operations: Operation[] = [
      {
        kind: 'translateY',
        from: 0,
        parts: [
          { to: -40, ms: 360 },
          { to: 0, ms: 360, holdMs: 240 },
        ],
      },
      { kind: 'translateX', from: 0, parts: [{ to: 90, ms: 1200 }] },
    ];
    const played = await play(operations);
    await waitUntil(played, 150);
    expect(summarizeStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_START
    );
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform.translateX,transform.translateY'
    );
    expectNear(members[1].keyTimes, [0, 1]);
    expectNear(members[2].keyTimes, [0, 0.3, 0.5, 0.8, 1]);
    expectNear(valuesOf(members[2]), [0, -40, -40, 0, 0]);

    // The two translations commute, so the value on screen is valid for the two operations.
    for (const elapsedMs of [480, 700, 1050]) {
      await waitUntil(played, elapsedMs);
      const { native, frame } = await samplePair();
      const tolerance = 0.25 + 2 * FRAME_MS * (90 / 1200 + 40 / 360);
      expect(isNear(native.presentation[12], frame.model[12], tolerance)).toBe(
        true
      );
      expect(isNear(native.presentation[13], frame.model[13], tolerance)).toBe(
        true
      );
    }
    await expectOneEndAfter(played, 1200);
    await render(null);
  });

  test('operations with two timelines and a leaf with no native form stay frame-driven as a whole, with one builder call and one callback', async () => {
    const operations: Operation[] = [
      { kind: 'rotate', from: '0deg', parts: [{ to: '90deg', ms: 300 }] },
      { kind: 'translateX', from: 0, parts: [{ to: 100, ms: 600 }] },
    ];
    const played = await play(operations, { hasSpringLeaf: true });
    await waitUntil(played, 200);
    const events = await takeTraceOfPair();
    expect(summarize(events.native)).toBe(
      'LayoutBuildFailed:UnsupportedTiming'
    );
    const row = await samplePair();
    expect(row.native.playbackKeys.length).toBe(0);
    expect(
      largestCellDifference(row.native.model, row.frame.model) <
        0.01 + (2 * FRAME_MS * 100) / 300
    ).toBe(true);
    await waitUntil(played, 2500);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(namedBuilderCalls.slice().sort().join()).toBe('frame,native');
    const end = await samplePair();
    expect(
      largestCellDifference(end.native.model, end.frame.model) < 0.01
    ).toBe(true);
    await render(null);
  });
});

describe('native layout operation timelines and a new start', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  // The two translations commute, so the value on screen is valid for the two operations.
  const FIRST: Operation[] = [
    { kind: 'translateX', from: 0, parts: [{ to: 80, ms: 400 }] },
    { kind: 'translateY', from: 0, parts: [{ to: 60, ms: 2000 }] },
  ];
  const REPLACED_AT_MS = 800;
  // The test samples after the render of the new start resolves.
  const FIRST_ROW_FRAMES = 3;

  /** Plays `FIRST` to 40 % of its time: the first operation holds its end value. */
  async function playFirst() {
    const played = await play(FIRST);
    await waitUntil(played, REPLACED_AT_MS);
    await takeTraceOfPair();
    callbacks.length = 0;
    namedBuilderCalls.length = 0;
    return played;
  }

  async function startSecond(
    operations: Operation[],
    { clockOffset }: Played
  ): Promise<Played> {
    const layouts = pairOf(operations);
    const startMs = performance.now();
    await render(sceneOf(layouts, operations, START_LEFT));
    return { startMs, clockOffset };
  }

  test('a new start with other end values at 40 %, while one operation holds and one moves, replaces the track: from the first frame that the test can sample, each operation is on its declared timeline from the start of the replacement and agrees with the frame-driven twin at its frame', async () => {
    const second: Operation[] = [
      { kind: 'translateX', from: 80, parts: [{ to: 10, ms: 1000 }] },
      { kind: 'translateY', from: 24, parts: [{ to: 0, ms: 500 }] },
    ];
    const played = await startSecond(second, await playFirst());
    const rows = [await takeAtFrameDriverFrame(samplePair)];
    const events = await takeTraceOfPair();
    expect(summarize(events.native.filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Transform:false > Ended:Interrupted:None > TrackStarted:Transform > Admitted'
    );
    expect(sortedCallbacks()).toBe('frame:false,native:false');
    for (const elapsedMs of [200, 400, 700]) {
      await waitUntil(played, elapsedMs);
      rows.push(await takeAtFrameDriverFrame(samplePair));
    }
    const TRANSLATION_CELLS = [12, 13];
    for (const { native, frame, lateMs } of rows) {
      expect(native.playbackKeys.length).toBe(1);
      expect(lateMs <= FRAME_MS).toBe(true);
      const timeMs = timeFromStart(native, played);
      second.forEach((operation, index) => {
        const cell = TRANSLATION_CELLS[index];
        const declared = (elapsedMs: number) =>
          declaredAt(operation, elapsedMs);
        const tolerance = 0.25 + declaredFrameChangeAt(declared, timeMs);
        expect(
          isNear(native.presentation[cell], declared(timeMs), tolerance)
        ).toBe(true);
        expect(
          isNear(native.presentation[cell], frame.model[cell], tolerance)
        ).toBe(true);
      });
    }
    const firstRowMs = timeFromStart(rows[0].native, played);
    expect(firstRowMs > 0 && firstRowMs < FIRST_ROW_FRAMES * FRAME_MS).toBe(
      true
    );
    expectNear(rows[0].native.members[1].keyTimes, [0, 0.5, 1]);
    callbacks.length = 0;
    await waitUntil(played, 1300);
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect((await samplePair()).native.playbackKeys.length).toBe(0);
    await render(null);
  });

  test('a new start with the same end values after the end of the shorter operation gives the view to the frame driver to its end: the two boxes agree, each start has one builder call, each callback comes one time, and no native playback starts', async () => {
    const second: Operation[] = [
      { kind: 'translateX', from: 80, parts: [{ to: 80, ms: 400 }] },
      { kind: 'translateY', from: 24, parts: [{ to: 60, ms: 2000 }] },
    ];
    const played = await startSecond(second, await playFirst());
    const rows = [];
    for (const elapsedMs of [100, 400, 900, 1500]) {
      await waitUntil(played, elapsedMs);
      rows.push(await samplePair());
    }
    for (const { native, frame } of rows) {
      expect(native.playbackKeys.length).toBe(0);
      expect(isNear(native.model[12], frame.model[12], 0.01)).toBe(true);
      expect(
        isNear(
          native.model[13],
          frame.model[13],
          0.25 + (2 * FRAME_MS * 60) / 2000
        )
      ).toBe(true);
    }
    await waitUntil(played, 2000 + 400);
    const events = await takeTraceOfPair();
    expect(
      events.native
        .filter(({ event }) => event === 'LayoutBuildFailed')
        .map(({ buildFailure }) => buildFailure)
        .join()
    ).toBe('UnsupportedContinuation');
    expect(events.native.some(({ event }) => event === 'TrackStarted')).toBe(
      false
    );
    expect(sortedCallbacks()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    expect(namedBuilderCalls.slice().sort().join()).toBe('frame,native');
    const end = await samplePair();
    expect(end.native.playbackKeys.length).toBe(0);
    for (const { model } of [end.native, end.frame]) {
      expect(model[12]).toBe(80);
      expect(model[13]).toBe(60);
    }
    await render(null);
  });
});

describe('native layout operation timelines and a live size track', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  test('a transform with two timelines starts natively on a view with a live width track of an earlier build, and the width track stays live', async () => {
    const SIZE_MS = 2000;
    const size = {
      nativeLayout: layoutOf(
        { width: { duration: SIZE_MS } },
        { name: 'nativeSize' }
      ),
      frameLayout: frameDrivenOf(
        layoutOf({ width: { duration: SIZE_MS } }, { name: 'frameSize' })
      ),
    };
    const operations: Operation[] = [
      { kind: 'rotate', from: '0deg', parts: [{ to: '90deg', ms: 400 }] },
      { kind: 'translateX', from: 0, parts: [{ to: 40, ms: 800 }] },
    ];
    const box = {
      top: 60,
      style: { transform: endTransformOf(operations) },
      inRow: true,
    };
    await mountScene(
      <SizePair left={START_LEFT} width={60} {...box} {...size} />
    );
    await render(<SizePair left={START_LEFT} width={120} {...box} {...size} />);
    await wait(500);
    await takeTraceOfPair();
    const before = await samplePair();
    expect(before.native.playbackKeys.length).toBe(1);
    callbacks.length = 0;
    await render(
      <SizePair left={END_LEFT} width={120} {...box} {...pairOf(operations)} />
    );
    await wait(250);
    const trace = summarize((await takeTraceOfPair()).native);
    expect(
      trace.startsWith(
        'LayoutLeafCaptured:Width > LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted'
      )
    ).toBe(true);
    expect(trace.includes('TrackEnded')).toBe(false);
    const during = await samplePair();
    expect(during.native.playbackKeys.length).toBe(2);
    expect(during.native.playbackKeys[0]).toBe(before.native.playbackKeys[0]);
    expect(during.native.members.map(({ property }) => property).join()).toBe(
      'transform,transform.translateX,transform.rotateZ'
    );
    await wait(2200);
    const end = await samplePair();
    expect(sortedCallbacks()).toBe(
      'frame:true,frameSize:false,native:true,nativeSize:false'
    );
    expect(end.native.playbackKeys.length).toBe(0);
    expect(
      largestCellDifference(end.native.model, end.frame.model) < 0.01
    ).toBe(true);
    await render(null);
  });
});

const ENTER_REF_STYLE = { width: 100, height: 60 };

function EnteringBox({
  refName,
  entering,
  style,
}: {
  refName: string;
  entering: unknown;
  style: ViewStyle;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      entering={entering as never}
      style={[styles.sizeBox, ENTER_REF_STYLE, { marginLeft: 60 }, style]}
    />
  );
}

function EnteringPair({
  isMounted,
  native,
  frame,
  style,
}: {
  isMounted: boolean;
  native: unknown;
  frame: unknown;
  style: ViewStyle;
}) {
  return (
    <View style={styles.sizeRow}>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        {isMounted && (
          <EnteringBox refName={BOX_REF} entering={native} style={style} />
        )}
      </View>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        {isMounted && (
          <EnteringBox refName={FRAME_BOX_REF} entering={frame} style={style} />
        )}
      </View>
    </View>
  );
}

describe('native layout operation timelines of a keyframe animation', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  test('a keyframe animation with other points for its two operations plays natively: each member has the keys of its own points, and one callback comes at the end', async () => {
    const DURATION = 1000;
    const keyframeOf = (name: string) =>
      new Keyframe({
        0: { transform: [{ scale: 0.5 }, { rotate: '0deg' }] },
        40: { transform: [{ scale: 1.2 }] },
        100: { transform: [{ scale: 1 }, { rotate: '90deg' }] },
      } as ConstructorParameters<typeof Keyframe>[0])
        .duration(DURATION)
        .withCallback(callbackOf(name));
    const pair = {
      native: keyframeOf('native'),
      frame: frameDrivenOf(
        keyframeOf('frame') as unknown as Parameters<typeof frameDrivenOf>[0]
      ),
      style: { transform: [{ scale: 1 }, { rotate: '90deg' }] } as ViewStyle,
    };
    await render(<EnteringPair {...pair} isMounted={false} />);
    await wait(200);
    await takeTrace();
    callbacks.length = 0;
    const played = { startMs: performance.now(), clockOffset: 0 };
    await render(<EnteringPair {...pair} isMounted />);
    await waitUntil(played, 150);
    const events = await takeTraceOfPair();
    expect(summarizeStart(events.native)).toBe(TRANSFORM_START);
    expect(summarize(events.frame)).toBe('LayoutBuildFailed:UnsupportedTiming');
    const { members } = (await samplePair()).native;
    expect(members.map(({ property }) => property).join()).toBe(
      'transform,transform.rotateZ,transform.scale'
    );
    expectNear(members[1].keyTimes, [0, 1]);
    expectNear(valuesOf(members[1]), [0, Math.PI / 2]);
    expectNear(members[2].keyTimes, [0, 0.4, 1]);
    expectNear(valuesOf(members[2]), [0.5, 1.2, 1]);

    await waitUntil(played, DURATION - 6 * FRAME_MS);
    expect(callbacks.filter((each) => each.startsWith('native')).length).toBe(
      0
    );
    await waitUntil(played, DURATION + 300);
    const end = await samplePair();
    expect(end.native.playbackKeys.length).toBe(0);
    expect(
      largestCellDifference(end.native.presentation, end.frame.model) < 0.01
    ).toBe(true);
    expect(summarizeAfterStart((await takeTraceOfPair()).native)).toBe(
      TRANSFORM_END
    );
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    await render(null);
  });
});
