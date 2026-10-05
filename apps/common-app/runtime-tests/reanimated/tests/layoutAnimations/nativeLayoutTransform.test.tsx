import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  setDynamicFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

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
  Leaf,
  Leaves,
  Operation,
  SizeBoxProps,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  blockUIThread,
  BOX_REF,
  builderCalls,
  callbacks,
  endTransformOf,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutStarts,
  isHostEvent,
  layoutOf,
  mountScene,
  recordedLinearOf,
  sample,
  sampleClockOffset,
  SizePair,
  styles,
  summarize,
  takeTraceOf,
  twinStartTime,
} from './nativeLayoutTestKit';

type StyleTransform = ViewStyle['transform'];

const TRANSFORM_DURATION = 2400;
const START_LEFT = 60;
const END_LEFT = 62;
const TRANSFORM_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted';
const TRANSFORM_END = 'TrackEnded:Transform:true > Ended:Finished:None';
const DEGREE = Math.PI / 180;
const TRANSLATION_CELLS = [12, 13, 14];

const radiansOf = (value: number | string) =>
  typeof value === 'string'
    ? parseFloat(value) * (value.endsWith('deg') ? DEGREE : 1)
    : value;

/** The cells that a style of one `translateX` or one `rotate` in degrees gives. */
function matrixOfStyle(style: StyleTransform) {
  const [operation] = style as Record<string, number | string>[];
  const angle = radiansOf(operation.rotate ?? 0);
  const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  matrix[0] = matrix[5] = Math.cos(angle);
  matrix[1] = Math.sin(angle);
  matrix[4] = -Math.sin(angle);
  matrix[12] = (operation.translateX as number) ?? 0;
  return matrix;
}

/** The scalar of the one operation of `kind` that gives `matrix`. */
function scalarOf(kind: string, matrix: number[]) {
  switch (kind) {
    case 'translateX':
      return matrix[12];
    case 'translateY':
      return matrix[13];
    case 'scaleY':
      return matrix[5];
    case 'rotate':
    case 'rotateZ':
      return Math.atan2(matrix[1], matrix[0]);
    case 'rotateX':
      return Math.atan2(matrix[6], matrix[5]);
    case 'rotateY':
      return Math.atan2(matrix[8], matrix[0]);
    default:
      return matrix[0];
  }
}

/** The native box plays `operations`; a callback keeps its twin frame-driven. */
const transformPairOf = (
  operations: Operation[],
  shared: Leaf = {},
  leaves: Leaves = {}
) => ({
  nativeLayout: layoutOf(leaves, {
    name: 'native',
    transform: {
      operations,
      shared: { duration: TRANSFORM_DURATION, ...shared },
    },
  }),
  frameLayout: layoutOf(leaves, {
    name: 'frame',
    transform: {
      operations,
      shared: { duration: TRANSFORM_DURATION, ...shared, hasCallback: true },
    },
  }),
});

type TransformPair = ReturnType<typeof transformPairOf>;

const pairSceneOf = (
  layouts: TransformPair,
  transform: StyleTransform,
  box: SizeBoxProps = {}
) => (
  <SizePair
    left={START_LEFT}
    top={60}
    {...box}
    style={[{ transform }, box.style]}
    {...layouts}
    inRow
  />
);

/** The largest difference of the translation cells and of the other cells. */
function matrixDistance(first: number[], second: number[]) {
  const distanceOf = (isTranslation: boolean) =>
    Math.max(
      ...first
        .map((cell, index) => Math.abs(cell - second[index]))
        .filter(
          (_, index) => TRANSLATION_CELLS.includes(index) === isTranslation
        )
    );
  return { translation: distanceOf(true), cells: distanceOf(false) };
}

async function sampleTransformPair() {
  const [native, frame] = await Promise.all([
    sample(getTestComponent(BOX_REF).getTag(), 'Transform'),
    sample(getTestComponent(FRAME_BOX_REF).getTag(), 'Transform'),
  ]);
  return {
    native: native.presentation,
    end: native.model,
    frame: frame.model,
    keys: native.playbackKeys.length,
    members: native.members,
    readTime: native.monotonicTimeMs,
  };
}

type TransformPairRow = Awaited<ReturnType<typeof sampleTransformPair>>;

async function sampleTransformPairAt(elapsedMs: number[], startMs: number) {
  const rows: TransformPairRow[] = [];
  for (const elapsed of elapsedMs) {
    await wait(Math.max(0, startMs + elapsed - performance.now()));
    rows.push(await sampleTransformPair());
  }
  return rows;
}

const isStartEvent = ({ event }: TraceEvent) =>
  event !== 'TrackEnded' && event !== 'Ended';
const summarizeStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter(isStartEvent));
const summarizeAfterStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter((event) => !isStartEvent(event)));

/**
 * The change of a matrix cell, and of a translation, in two display frames of a
 * track that moves `range` in `durationMs`: the model of the twin is its last
 * mounted frame, which can be one display frame old.
 */
const toleranceOf = (range: number, durationMs = TRANSFORM_DURATION) =>
  0.005 + (2 * FRAME_MS * Math.abs(range)) / durationMs;

function expectSameMatrix(
  shown: number[],
  expected: number[],
  cells: number,
  translation: number
) {
  const distance = matrixDistance(shown, expected);
  expect(distance.cells < cells).toBe(true);
  expect(distance.translation < translation).toBe(true);
}

describe('native layout transform', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const oneOperation: Operation[] = [
    ['translateX', 0, 80],
    ['translateY', -30, 30],
    ['scale', 0.5, 1.5],
    ['scaleX', 0.2, 1],
    ['scaleY', 1, 2],
    ['rotate', '0deg', '90deg'],
    ['rotateZ', 0, 2],
    ['rotateX', 0, 1],
    ['rotateY', '0rad', '1rad'],
  ];
  for (const operation of oneOperation) {
    const [kind, from, to] = operation;
    test(`${kind} from ${String(from)} to ${String(to)} plays natively and agrees with the frame driver`, async () => {
      const layouts = {
        ...transformPairOf([operation]),
        frameLayout: layoutOf(
          {},
          {
            name: 'frame',
            transform: {
              operations: [operation],
              shared: {
                duration: TRANSFORM_DURATION,
                easing: recordedLinearOf(TRANSFORM_DURATION),
              },
            },
          }
        ),
      };
      const style = endTransformOf([operation]);
      const tag = await mountScene(pairSceneOf(layouts, style));
      const clock = await sampleClockOffset(tag);
      const start = performance.now();
      await render(pairSceneOf(layouts, style, { left: END_LEFT }));
      const rows = await sampleTransformPairAt(
        [0.25, 0.5, 0.75, 1.15].map(
          (fraction) => fraction * TRANSFORM_DURATION
        ),
        start
      );
      const events = await takeTraceOf(tag);
      expect(summarizeStart(events)).toBe(TRANSFORM_START);
      expect(summarizeAfterStart(events)).toBe(TRANSFORM_END);

      const range =
        radiansOf(to as number | string) - radiansOf(from as number | string);
      const isTranslation = kind.startsWith('translate');
      for (const row of rows.slice(0, 3)) {
        // The native value at its read time against the timeline of the twin at that time.
        const shownProgress =
          (scalarOf(kind, row.native) - radiansOf(from as number | string)) /
          range;
        const twinProgress =
          (row.readTime - clock.offset - twinStartTime.value) /
          TRANSFORM_DURATION;
        expect(
          Math.abs(shownProgress - twinProgress) * TRANSFORM_DURATION < FRAME_MS
        ).toBe(true);
        expectSameMatrix(
          row.native,
          row.frame,
          isTranslation ? 0.005 : toleranceOf(range),
          isTranslation ? toleranceOf(range) : 0.01
        );
        expect(row.keys).toBe(1);
      }
      const middle = matrixDistance(rows[1].native, rows[1].end);
      expect(middle.cells + middle.translation > 0.1).toBe(true);
      const end = rows[3];
      expectSameMatrix(end.native, end.end, 0.0001, 0.01);
      expectSameMatrix(end.frame, end.end, 0.0001, 0.01);
      expect(end.keys).toBe(0);
      expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  async function membersOf(
    operations: Operation[],
    shared: Leaf = {},
    waitMs = 100
  ) {
    const layouts = transformPairOf(operations, shared);
    const style = endTransformOf(operations);
    const tag = await mountScene(pairSceneOf(layouts, style));
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    await wait(waitMs);
    const events = await takeTraceOf(tag);
    const { members } = await sampleTransformPair();
    await render(null);
    return {
      events,
      members,
      properties: members.map((each) => each.property),
    };
  }

  test('the members after the base are the operations in the reverse order of the style array', async () => {
    const translateThenRotate = await membersOf([
      ['translateX', 0, 100],
      ['rotate', 0, 1.5],
    ]);
    expect(summarizeStart(translateThenRotate.events)).toBe(TRANSFORM_START);
    expect(translateThenRotate.properties.join()).toBe(
      'transform,transform.rotateZ,transform.translateX'
    );
    expect(translateThenRotate.members[0].from.join()).toBe(
      '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1'
    );
    expect(translateThenRotate.members[2].to.join()).toBe('100');

    const rotateThenTranslate = await membersOf([
      ['rotate', 0, 1.5],
      ['translateX', 0, 100],
    ]);
    expect(rotateThenTranslate.properties.join()).toBe(
      'transform,transform.translateX,transform.rotateZ'
    );
  });

  test('two operations of one kind are two members, and one that does not change is a matrix', async () => {
    const { events, members, properties } = await membersOf([
      ['rotate', '10deg', '100deg'],
      ['rotate', '20deg', '20deg'],
    ]);
    expect(summarizeStart(events)).toBe(TRANSFORM_START);
    expect(properties.join()).toBe('transform,transform,transform.rotateZ');
    expect(Math.abs(members[1].from[0] - Math.cos(20 * DEGREE)) < 1e-6).toBe(
      true
    );
    expect(members[1].from.join()).toBe(members[1].to.join());
    expect(Math.abs(members[2].from[0] - 10 * DEGREE) < 1e-6).toBe(true);
    expect(Math.abs(members[2].to[0] - 100 * DEGREE) < 1e-6).toBe(true);
  });

  test('a perspective is a matrix member and scale has one factor for each axis', async () => {
    const flip = await membersOf([
      ['perspective', 500, 500],
      ['rotateX', '90deg', '0deg'],
    ]);
    expect(summarizeStart(flip.events)).toBe(TRANSFORM_START);
    expect(flip.properties.join()).toBe(
      'transform,transform.rotateX,transform'
    );
    expect(Math.abs(flip.members[2].from[11] + 1 / 500) < 1e-6).toBe(true);

    const zoom = await membersOf([['scale', 0.5, 1.5]]);
    expect(zoom.properties.join()).toBe('transform,transform.scale');
    expect(zoom.members[1].from.join()).toBe('0.5,0.5,0.5');
    expect(zoom.members[1].to.join()).toBe('1.5,1.5,1.5');
  });

  test('a rotation of two turns shows one quarter turn at one eighth of its time', async () => {
    const operations: Operation[] = [['rotate', '0deg', '720deg']];
    const layouts = transformPairOf(operations);
    const style = endTransformOf(operations);
    await mountScene(pairSceneOf(layouts, style));
    const start = performance.now();
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    const [row] = await sampleTransformPairAt([TRANSFORM_DURATION / 8], start);
    expectSameMatrix(row.native, row.frame, toleranceOf(4 * Math.PI), 0.01);
    expect(Math.abs(row.native[1]) > 0.8).toBe(true);
    expectSameMatrix(
      row.end,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      0.0001,
      0.01
    );
    await render(null);
  });

  test('a transform leaf on a ScrollView stays frame-driven', async () => {
    const operations: Operation[] = [['rotate', 0, 1]];
    const layouts = transformPairOf(operations, { duration: 300 });
    const style = endTransformOf(operations);
    const box: SizeBoxProps = { host: 'ScrollView' };
    const tag = await mountScene(pairSceneOf(layouts, style, box));
    await render(pairSceneOf(layouts, style, { ...box, left: END_LEFT }));
    await wait(500);
    expect(
      summarize(
        (await takeTraceOf(tag)).filter(
          ({ event }) => event !== 'FrameUpdateMounted'
        )
      )
    ).toBe('LayoutBuildFailed:UnsupportedTarget');
    expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  test('the start value stays on screen through the delay', async () => {
    const operations: Operation[] = [['translateX', 40, 0]];
    const layouts = transformPairOf(operations, {
      duration: 400,
      delays: [600],
    });
    const style = endTransformOf(operations);
    await mountScene(pairSceneOf(layouts, style));
    const start = performance.now();
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    const [held, moving, end] = await sampleTransformPairAt(
      [300, 800, 1300],
      start
    );
    expect(Math.abs(held.native[12] - 40) < 0.01).toBe(true);
    expect(Math.abs(held.frame[12] - 40) < 0.01).toBe(true);
    expect(held.end[12]).toBe(0);
    expectSameMatrix(moving.native, moving.frame, 0.005, toleranceOf(40, 400));
    expect(end.keys).toBe(0);
    expect(end.native[12]).toBe(0);
    await render(null);
  });

  test('no duration with a delay holds the start value, then the model shows', async () => {
    const operations: Operation[] = [['scaleX', 0.5, 1]];
    const layouts = transformPairOf(operations, { duration: 0, delays: [600] });
    const style = endTransformOf(operations);
    const tag = await mountScene(pairSceneOf(layouts, style));
    const start = performance.now();
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    const [held, end] = await sampleTransformPairAt([300, 900], start);
    expect(Math.abs(held.native[0] - 0.5) < 0.0001).toBe(true);
    expect(Math.abs(held.frame[0] - 0.5) < 0.0001).toBe(true);
    expect(held.keys).toBe(1);
    expect(end.native[0]).toBe(1);
    expect(end.frame[0]).toBe(1);
    expect(end.keys).toBe(0);
    const events = await takeTraceOf(tag);
    expect(summarizeStart(events)).toBe(TRANSFORM_START);
    expect(summarizeAfterStart(events)).toBe(TRANSFORM_END);
    await render(null);
  });

  test('no duration and no delay ends the track with the admission', async () => {
    const operations: Operation[] = [
      ['rotate', 0, 1],
      ['translateX', 0, 30, { isPlain: true }],
    ];
    const layouts = transformPairOf(operations, { duration: 0 });
    const style = endTransformOf(operations);
    const tag = await mountScene(pairSceneOf(layouts, style));
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    await wait(200);
    const events = await takeTraceOf(tag);
    expect(summarize(events.filter(isHostEvent))).toBe(
      `${TRANSFORM_START} > ${TRANSFORM_END}`
    );
    const row = await sampleTransformPair();
    expect(row.keys).toBe(0);
    expectSameMatrix(row.native, row.frame, 0.0001, 0.01);
    expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
    await render(null);
  });
});

describe('native layout transform continuity', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const FIRST: Operation[] = [['translateX', 0, 80]];
  const FIRST_STYLE = endTransformOf(FIRST);
  const AFTER_START = [0.2, 0.4, 0.75].map(
    (fraction) => fraction * TRANSFORM_DURATION
  );
  const TRANSLATION_TOLERANCE = toleranceOf(80);

  const TWO: Operation[] = [
    ['translateX', 0, 80],
    ['scale', 1, 1.5],
  ];

  /** Starts the layouts on the two boxes and waits for a part of their time. */
  async function playFirst(
    layouts: TransformPair,
    style = FIRST_STYLE,
    part = 0.4
  ) {
    const tag = await mountScene(pairSceneOf(layouts, style));
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    await wait(part * TRANSFORM_DURATION);
    await takeTraceOf(tag);
    callbacks.length = 0;
    return tag;
  }

  const startedTargets = (events: TraceEvent[]) =>
    events
      .filter(({ event }) => event === 'TrackStarted')
      .map(({ target }) => target)
      .join();
  const buildFailures = (events: TraceEvent[]) =>
    events
      .filter(({ event }) => event === 'LayoutBuildFailed')
      .map(({ buildFailure }) => buildFailure)
      .join();

  test('a new start with another end value replaces the track and agrees with the frame driver', async () => {
    const second: Operation[] = [['translateX', 50, 20]];
    const tag = await playFirst(transformPairOf(FIRST));
    const start = performance.now();
    await render(
      pairSceneOf(transformPairOf(second), endTransformOf(second), {
        left: START_LEFT,
      })
    );
    const rows = await sampleTransformPairAt(AFTER_START, start);
    const events = await takeTraceOf(tag);
    expect(summarize(events.filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Transform:false > Ended:Interrupted:None > TrackStarted:Transform > Admitted'
    );
    for (const row of rows) {
      expectSameMatrix(row.native, row.frame, 0.005, TRANSLATION_TOLERANCE);
      expect(row.keys).toBe(1);
    }
    expect(rows[0].native[12] < 50).toBe(true);
    expect(callbacks.slice().sort().join()).toBe('frame:false,native:false');
    await render(null);
  });

  test('a new start with the same end value and a position leaf keeps the transform track', async () => {
    const layouts = transformPairOf(FIRST, {}, { originX: { duration: 400 } });
    const tag = await playFirst(layouts);
    const start = performance.now();
    await render(pairSceneOf(layouts, FIRST_STYLE, { left: START_LEFT }));
    const rows = await sampleTransformPairAt(
      [0.2, 0.4].map((fraction) => fraction * TRANSFORM_DURATION),
      start
    );
    const events = await takeTraceOf(tag);
    expect(startedTargets(events)).toBe('PositionX');
    expect(buildFailures(events)).toBe('');
    for (const row of rows) {
      expectSameMatrix(row.native, row.frame, 0.005, TRANSLATION_TOLERANCE);
    }
    expect(rows[1].native[12] > 60).toBe(true);
    await render(null);
  });

  const transfers: [
    string,
    Operation[],
    Operation[] | undefined,
    Leaves,
    string,
  ][] = [
    [
      'a frame-driven start with no transform leaf',
      FIRST,
      undefined,
      { originX: { easing: 'default' } },
      'UnsupportedTiming',
    ],
    [
      'a frame-driven start with a transform leaf',
      FIRST,
      [['translateX', 50, 20, { isSpring: true }]],
      {},
      'UnsupportedTiming',
    ],
    [
      'a start that continues one operation and replaces the other',
      TWO,
      [
        ['translateX', 32, 80],
        ['scale', 1.2, 2],
      ],
      {},
      'UnsupportedContinuation',
    ],
    [
      'a start with the same end values and no other leaf',
      TWO,
      [
        ['translateX', 32, 80],
        ['scale', 1.2, 1.5],
      ],
      {},
      'UnsupportedContinuation',
    ],
  ];
  for (const [caseName, first, operations, leaves, failure] of transfers) {
    test(`${caseName} takes the view from the transform track and agrees with the frame driver`, async () => {
      const tag = await playFirst(
        transformPairOf(first),
        endTransformOf(first)
      );
      const next = operations
        ? transformPairOf(operations, {}, leaves)
        : {
            nativeLayout: layoutOf(leaves, { name: 'native' }),
            frameLayout: layoutOf(leaves, { name: 'frame' }),
          };
      const start = performance.now();
      await render(
        pairSceneOf(next, endTransformOf(operations ?? first), {
          left: START_LEFT,
        })
      );
      const rows = await sampleTransformPairAt(AFTER_START, start);
      const events = await takeTraceOf(tag);
      expect(buildFailures(events)).toBe(failure);
      expect(startedTargets(events)).toBe('');
      for (const row of rows) {
        expect(row.keys).toBe(0);
        expectSameMatrix(row.end, row.frame, 0.02, TRANSLATION_TOLERANCE);
      }
      await render(null);
    });
  }

  test('a frame-driven start takes the view in the part of a curve below its start value', async () => {
    const easing = Easing.bezier(0.3, -0.4, 0.7, 1.6);
    const tag = await playFirst(
      transformPairOf(FIRST, { easing }),
      FIRST_STYLE,
      0.1
    );
    const leaves: Leaves = { originX: { easing: 'default' } };
    const start = performance.now();
    await render(
      pairSceneOf(
        {
          nativeLayout: layoutOf(leaves),
          frameLayout: layoutOf(leaves),
        },
        FIRST_STYLE,
        { left: START_LEFT }
      )
    );
    const rows = await sampleTransformPairAt([30, 100, 500, 1500], start);
    expect(buildFailures(await takeTraceOf(tag))).toBe('UnsupportedTiming');
    expect(rows[0].end[12] < 0).toBe(true);
    for (const row of rows) {
      expect(row.keys).toBe(0);
      expectSameMatrix(row.end, row.frame, 0.005, toleranceOf(160));
    }
    await render(null);
  });

  const commitCases: [string, Operation, StyleTransform, number][] = [
    ['a number', ['translateX', 0, 80], [{ translateX: 30 }], 12],
    [
      'an angle in degrees',
      ['rotate', '0deg', '90deg'],
      [{ rotate: '30deg' }],
      1,
    ],
  ];
  for (const [caseName, operation, committed, cell] of commitCases) {
    test(`a commit of another style transform during a track of ${caseName} keeps the track, and the committed style shows at its end`, async () => {
      const layouts = transformPairOf([operation]);
      const endStyle = endTransformOf([operation]);
      const tag = await mountScene(pairSceneOf(layouts, endStyle));
      const start = performance.now();
      await render(pairSceneOf(layouts, endStyle, { left: END_LEFT }));
      await wait(0.4 * TRANSFORM_DURATION);
      await takeTraceOf(tag);
      const builderCallsBefore = builderCalls;
      const before = await sample(tag, 'Transform');

      await render(pairSceneOf(layouts, committed, { left: END_LEFT }));
      const rows = await sampleTransformPairAt(
        [0.6, 0.8].map((fraction) => fraction * TRANSFORM_DURATION),
        start
      );
      const playing = await sample(tag, 'Transform');
      expect(playing.playbackKeys.join()).toBe(before.playbackKeys.join());
      expect(playing.playbackKeys.length).toBe(1);
      for (const row of rows) {
        expectSameMatrix(
          row.native,
          row.frame,
          toleranceOf(Math.PI / 2),
          toleranceOf(80)
        );
      }

      const [end] = await sampleTransformPairAt(
        [1.2 * TRANSFORM_DURATION],
        start
      );
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        TRANSFORM_END
      );
      expect(builderCalls).toBe(builderCallsBefore);
      expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
      expect(end.keys).toBe(0);
      const leafEnd = matrixOfStyle(endStyle)[cell];
      const committedValue = matrixOfStyle(committed)[cell];
      expect(Math.abs(end.native[cell] - committedValue) < 0.001).toBe(true);
      expect(Math.abs(end.frame[cell] - leafEnd) < 0.001).toBe(true);
      await render(null);
    });
  }

  const unrealizableCommits: [string, StyleTransform, SizeBoxProps['style']][] =
    [
      ['a transform origin', FIRST_STYLE, { transformOrigin: 'top left' }],
      ['a translation in percent', [{ translateX: '160%' }], {}],
    ];
  for (const [caseName, committed, style] of unrealizableCommits) {
    test(`a commit of ${caseName} during the track gives the view to the frame driver`, async () => {
      const layouts = transformPairOf(FIRST);
      const tag = await playFirst(layouts);
      const start = performance.now();
      await render(pairSceneOf(layouts, committed, { left: END_LEFT, style }));
      const rows = await sampleTransformPairAt(
        [0.2, 0.4].map((fraction) => fraction * TRANSFORM_DURATION),
        start
      );
      const events = await takeTraceOf(tag);
      expect(buildFailures(events)).toBe('UnsupportedTarget');
      expect(startedTargets(events)).toBe('');
      for (const row of rows) {
        expect(row.keys).toBe(0);
        expectSameMatrix(row.end, row.frame, 0.005, TRANSLATION_TOLERANCE);
      }
      await render(null);
    });
  }
});

const offsets: Record<string, SharedValue<number>> = {};

type WrittenBoxProps = {
  left: number;
  layout: SizeBoxProps['layout'];
  refName?: string;
};

/** An animated style gives the box its `translateX`. */
function WrittenBox({ left, layout, refName = BOX_REF }: WrittenBoxProps) {
  const ref = useTestRef(refName);
  const offset = useSharedValue(WRITTEN_END);
  offsets[refName] = offset;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      style={[styles.box, { marginLeft: left }, animatedStyle]}
    />
  );
}

const WRITTEN_END = 80;
const WRITTEN_VALUE = 30;

describe('native layout transform and the synchronous props path', () => {
  if (
    !hasNativeLayoutStarts ||
    !getStaticFeatureFlag('IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS')
  ) {
    return;
  }

  const layouts = transformPairOf([['translateX', 0, WRITTEN_END]]);
  const pair = (left: number) => (
    <View style={styles.sizeRow}>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        <WrittenBox left={left} layout={layouts.nativeLayout} />
      </View>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        <WrittenBox
          left={left}
          layout={layouts.frameLayout}
          refName={FRAME_BOX_REF}
        />
      </View>
    </View>
  );
  const writePair = (value: number, blockMs = 0) => {
    const targets = [offsets[BOX_REF], offsets[FRAME_BOX_REF]];
    scheduleOnUI(() => {
      'worklet';
      blockUIThread(blockMs);
      for (const target of targets) {
        target.value = value;
      }
    });
  };
  /** The track plays to its end over the written model value, which shows then. */
  async function expectTrackThenWrittenValue(
    tag: number,
    rows: TransformPairRow[]
  ) {
    const playing = rows.slice(0, -1);
    const end = rows[rows.length - 1];
    for (const row of playing) {
      expect(row.keys).toBe(1);
      expect(Math.abs(row.end[12] - WRITTEN_VALUE) < 0.01).toBe(true);
      expectSameMatrix(row.native, row.frame, 0.005, toleranceOf(WRITTEN_END));
    }
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      `${TRANSFORM_START} > ${TRANSFORM_END}`
    );
    expect(end.keys).toBe(0);
    expect(Math.abs(end.native[12] - WRITTEN_VALUE) < 0.01).toBe(true);
    expect(callbacks.filter((each) => each.startsWith('native')).join()).toBe(
      'native:true'
    );
  }

  for (const tracks of [false, true]) {
    test(`a transform write during the track keeps the track, and the written value shows at its end, tracking ${tracks}`, async () => {
      setDynamicFeatureFlag(
        'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS',
        tracks
      );
      const tag = await mountScene(pair(START_LEFT));
      const start = performance.now();
      await render(pair(END_LEFT));
      await wait(0.4 * TRANSFORM_DURATION);
      writePair(WRITTEN_VALUE);
      const rows = await sampleTransformPairAt(
        [0.5, 0.75, 1.15].map((fraction) => fraction * TRANSFORM_DURATION),
        start
      );
      await expectTrackThenWrittenValue(tag, rows);
      setDynamicFeatureFlag(
        'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS',
        false
      );
      await render(null);
    });

    test(`a transform write between a commit and its mount keeps the native start, and the written value shows at the end of the track, tracking ${tracks}`, async () => {
      setDynamicFeatureFlag(
        'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS',
        tracks
      );
      const tag = await mountScene(pair(START_LEFT));
      writePair(WRITTEN_VALUE, 40);
      const start = performance.now();
      await render(pair(END_LEFT));
      const rows = await sampleTransformPairAt(
        [0.25, 0.75, 1.15].map((fraction) => fraction * TRANSFORM_DURATION),
        start
      );
      await expectTrackThenWrittenValue(tag, rows);
      setDynamicFeatureFlag(
        'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS',
        false
      );
      await render(null);
    });
  }
});
