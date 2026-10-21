/*
 * Each test that plays a case (`playCase`, or `play` with `expectReference`) has the method of the suite
 * `native layout reference`, each box on its own clock: each sample of the `Transform` target of the native
 * box has the 16 cells of the matrix of the declared values of its operations at one time of the 18 ms
 * before the sample, from the origin of its command (statement A); each frame of the frame-driven
 * twin and of the frame driver on the native box is on a replay of the declared timeline at its frame time
 * (statement B); at the end the native box shows its model and the twin has the same model. A check of a
 * playback key count or of a model value in such a test is for each row, by the time of the row against
 * the times of the trace and the declared times. A spring has no declared timeline: its frames on the
 * native box are the frames of the twin. Each other test has state checks, trace checks, and checks of the
 * two boxes at rest. The tolerance of a cell is 0.005, and a translation has it too.
 *
 * Each test in which the frame driver takes the `Transform` track of the native box has statement M: the
 * model of each read of the native box, from the mount of the first frame update to the last frame of the
 * frame driver, is the matrix of the last recorded frame at or before the read, of the frame before it, or
 * of the first frame after the read whose recorded time is at most one display frame and the clock
 * uncertainty after the read. A cell is equal to 0.0001 and a translation to 0.01. Statement M permits a lag
 * of one recorded frame and gives no limit of the age of the model on the wall clock. Two frames whose
 * matrices are equal in these tolerances cannot say which write gave the value. Other display rates are not
 * tested.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, when a callback comes, that a row comes in each part of a
 * timeline, a native value in the first display frame after its origin to better than one display frame, a
 * read in the first 18 ms of a track (its operations start at the initial values of the builder, which the
 * view did not show). After a commit of another style transform, a read from 1.78 ms before the declared
 * end of the track is not checked: it can show the committed style. The pixels on screen, the order in
 * which the screen shows the operations, a device, and 120 Hz are not tested.
 *
 * Statement A has the edge hold of `native layout reference`. Within the read band, this suite cannot
 * distinguish the platform hold from a native segment that keeps its start value through eased progress
 * 0.001 or shows its end value from eased progress 0.999. The frame-driven twin keeps its exact curve check
 * without a hold allowance.
 *
 * The suite `native layout live clock` has the wall-clock statements for the cases of this suite in
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the gap of the two end
 * callbacks, and a row of the native box in each phase.
 *
 * The tests of the synchronous props path need the static flag `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`: the
 * default build does not run them. An animated style gives each box its transform, and each test plays a
 * case with a write of the two animated styles. The model of the native box is a state check for each read.
 * The test of a write between a commit and its mount prints the order that its reads show as a
 * `WRITE-ORDER` row and asserts the statements of that order. It has no load switch, so it does not assert
 * the order `before the mount`: a case of `native layout live clock` does. The reads cannot show a write in
 * the interval before the first read.
 *
 * The tests of `native layout transform forms against the frame driver` need the view sampler of the
 * Android test host. At each draw it maps the four corners of each box through the drawn matrix of the
 * view. Each test compares the native box with its frame-driven twin in the same draw, at each progress
 * of the iOS pixel table from the origin of the native track. Pixels and the alignment of the two starts
 * are not tested.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  getStaticFeatureFlag,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { RecordedProperty } from '../viewSampler';
import {
  drawnPointOf,
  isViewSamplerAvailable,
  recordDrawnValues,
  valueCountOf,
} from '../viewSampler';
import {
  BACK_AT_START,
  COMMITTED_ROTATION,
  COMMITTED_TRANSLATION,
  CONTINUITY_CASES,
  ONE_OPERATION_CASES,
  SECOND_COMMIT_MS,
  STYLE_COMMIT_CASES,
  timedOperationsOf,
  TRANSFORM_CASES,
  TRANSFORM_DURATION,
  TRANSFORM_PLACES,
  transformCaseOf,
  TRANSLATION,
} from './nativeLayoutLiveClockCases';
import { blockUIThread } from './nativeLayoutLoad';
import type {
  Played,
  ReferenceCase,
  RowRead,
  WriteOrder,
} from './nativeLayoutReferencePlay';
import {
  describeWriteOrder,
  expectModelOnFrames,
  expectNoKeyAfterTransfer,
  expectOneKeyWhilePlaying,
  expectReference,
  play,
  writeOrderOf,
} from './nativeLayoutReferencePlay';
import type {
  Leaf,
  Leaves,
  MatrixTolerance,
  Operation,
  SizeBoxProps,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  afterMountOf,
  appleSample,
  Box,
  BOX_REF,
  builderCalls,
  callbacks,
  cellToleranceOf,
  countedOf,
  endCellsOf,
  endTransformOf,
  FRAME_BOX_REF,
  frameDrivenOf,
  HAS_EDGE_ANTIALIASING,
  hasNativeLayoutRoute,
  isHostEvent,
  isSameLeaf,
  layoutOf,
  middleOf,
  mountScene,
  namedBuilderCalls,
  has3D,
  PLAYS_3D_OPERATIONS,
  PLAYS_CORE_ANIMATION_MEMBERS,
  POSITION_TOLERANCE,
  readFrameRecords,
  routeOf,
  sample,
  SizeBox,
  SizePair,
  styles,
  summarize,
  takeTrace,
  takeTraceOf,
  withTracking,
  movingGeometryTest,
  PLAYS_TRANSFORM_ON_EACH_COMPONENT,
} from './nativeLayoutTestKit';

type StyleTransform = ViewStyle['transform'];

const START_LEFT = 60;
const END_LEFT = 62;
const TRANSFORM_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted';
const TRANSFORM_END = 'TrackEnded:Transform:true > Ended:Finished:None';
const DEGREE = Math.PI / 180;
const DRAWN_ANGLE_TOLERANCE = 1e-3;
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const REST_TOLERANCE: MatrixTolerance = { cells: 0.0001, translation: 0.01 };

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference` and the end of the two boxes.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  expectAtRest(played);
  return { ...played, reads };
}

/**
 * At the end the native box shows its model with no playback key, and the twin
 * has the model of the native box.
 */
function expectAtRest({ end }: Played) {
  const { presentation, model, playbacks } = end!.native.Transform;
  expect(playbacks.length).toBe(0);
  expectCells(presentation, model);
  expectCells(end!.frame.Transform.model, model);
}

function expectCells(
  shown: number[],
  expected: number[],
  tolerance = REST_TOLERANCE
) {
  shown.forEach((cell, index) => {
    expect(
      Math.abs(cell - expected[index]) < cellToleranceOf(index, tolerance)
    ).toBe(true);
  });
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

const pairTags = () =>
  [BOX_REF, FRAME_BOX_REF].map((ref) => getTestComponent(ref).getTag());

const samplePair = () =>
  Promise.all(pairTags().map((tag) => sample(tag, 'Transform')));

const isStartEvent = ({ event }: TraceEvent) =>
  event !== 'TrackEnded' && event !== 'Ended';
const summarizeStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter(isStartEvent));
const summarizeAfterStart = (events: TraceEvent[]) =>
  summarize(events.filter(isHostEvent).filter((event) => !isStartEvent(event)));

const buildFailures = (events: TraceEvent[]) =>
  events
    .filter(({ event }) => event === 'LayoutBuildFailed')
    .map(({ buildFailure }) => buildFailure)
    .join();

/**
 * The member of the operation at `operation` in the style array: Core Animation
 * has an identity base member and the operations in the reverse order, Android
 * has the operations in their order.
 */
const operationMemberOf = ({ members }: TargetSample, operation: number) =>
  PLAYS_CORE_ANIMATION_MEMBERS
    ? members[members.length - 1 - operation]
    : members[operation];

const pieceCountOf = (sampled: TargetSample) =>
  operationMemberOf(sampled, 0).values.length - 1;

describe('native layout transform', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, referenceCase] of Object.entries(
    ONE_OPERATION_CASES
  ).filter(([, { operations }]) => PLAYS_3D_OPERATIONS || !has3D(operations))) {
    movingGeometryTest(
      `${caseName} plays natively, and the native values and the frames of the frame driver are on its timeline`,
      async () => {
        const { events, reads } = await playCase(caseName, referenceCase);
        expect(summarizeStart(events)).toBe(TRANSFORM_START);
        expect(summarizeAfterStart(events)).toBe(TRANSFORM_END);
        expectOneKeyWhilePlaying(reads);
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a rotation of one turn with Easing.bounce of a view of 100 x 60 pt plays natively no more than 0.25 pt at its corner from its easing function, with more pieces than a quarter turn',
    async () => {
      const SIZE = { width: 100, height: 60 };
      const LEVER = Math.hypot(SIZE.width, SIZE.height) / 2;
      const bounce: Leaf = { easing: Easing.bounce };
      const quarterTurn = pieceCountOf(
        (await membersOf([['rotate', '0deg', '90deg']], bounce)).playing
      );

      const { events, reads } = await playCase(
        'a rotation of one turn with Easing.bounce',
        transformCaseOf([['rotate', '0deg', '360deg']], bounce, {
          places: TRANSFORM_PLACES.map((place) => ({ ...place, ...SIZE })),
          // The sine and the cosine of the rotation, each this near, put the corner 0.25 pt or less from
          // its declared place.
          matrixTolerance: {
            cells: 0.25 / LEVER / Math.SQRT2,
            translation: REST_TOLERANCE.translation,
          },
        })
      );
      expect(summarizeStart(events)).toBe(TRANSFORM_START);
      expect(pieceCountOf(reads[0].sampled) > quarterTurn).toBe(true);
      expectOneKeyWhilePlaying(reads);
      await render(null);
    }
  );

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
    const playing = await sample(tag, 'Transform');
    await render(null);
    return {
      events,
      playing,
      members: playing.members,
      properties: playing.members.map((each) => each.property),
    };
  }

  const TRANSLATE_THEN_ROTATE: Operation[] = [
    ['translateX', 0, 100],
    ['rotate', 0, 1.5],
  ];
  const ROTATE_THEN_TRANSLATE: Operation[] = [
    ['rotate', 0, 1.5],
    ['translateX', 0, 100],
  ];
  const TWO_ROTATIONS: Operation[] = [
    ['rotate', '10deg', '100deg'],
    ['rotate', '20deg', '20deg'],
  ];

  if (PLAYS_CORE_ANIMATION_MEMBERS) {
    movingGeometryTest(
      'the members after the base are the operations in the reverse order of the style array',
      async () => {
        const translateThenRotate = await membersOf(TRANSLATE_THEN_ROTATE);
        expect(summarizeStart(translateThenRotate.events)).toBe(
          TRANSFORM_START
        );
        expect(translateThenRotate.properties.join()).toBe(
          'transform,transform.rotateZ,transform.translateX'
        );
        expect(translateThenRotate.members[0].values[0].join()).toBe(
          '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1'
        );
        expect(translateThenRotate.members[2].values[1].join()).toBe('100');

        const rotateThenTranslate = await membersOf(ROTATE_THEN_TRANSLATE);
        expect(rotateThenTranslate.properties.join()).toBe(
          'transform,transform.translateX,transform.rotateZ'
        );
      }
    );

    movingGeometryTest(
      'two operations of one kind are two members, and one that does not change is a matrix',
      async () => {
        const { events, members, properties } = await membersOf(TWO_ROTATIONS);
        expect(summarizeStart(events)).toBe(TRANSFORM_START);
        expect(properties.join()).toBe('transform,transform,transform.rotateZ');
        expect(
          Math.abs(members[1].values[0][0] - Math.cos(20 * DEGREE)) < 1e-6
        ).toBe(true);
        expect(members[1].values[0].join()).toBe(members[1].values[1].join());
        expect(Math.abs(members[2].values[0][0] - 10 * DEGREE) < 1e-6).toBe(
          true
        );
        expect(Math.abs(members[2].values[1][0] - 100 * DEGREE) < 1e-6).toBe(
          true
        );
      }
    );
  } else {
    movingGeometryTest(
      'the members are the operations in the order of the style array',
      async () => {
        const translateThenRotate = await membersOf(TRANSLATE_THEN_ROTATE);
        expect(summarizeStart(translateThenRotate.events)).toBe(
          TRANSFORM_START
        );
        expect(translateThenRotate.properties.join()).toBe(
          'transform.translateX,transform.rotateZ'
        );
        expect(translateThenRotate.members[0].values[1].join()).toBe('100');

        const rotateThenTranslate = await membersOf(ROTATE_THEN_TRANSLATE);
        expect(rotateThenTranslate.properties.join()).toBe(
          'transform.rotateZ,transform.translateX'
        );
      }
    );

    movingGeometryTest(
      'two operations of one kind are two members, and one that does not change keeps its value',
      async () => {
        const { events, members, properties } = await membersOf(TWO_ROTATIONS);
        expect(summarizeStart(events)).toBe(TRANSFORM_START);
        expect(properties.join()).toBe('transform.rotateZ,transform.rotateZ');
        expect(Math.abs(members[0].values[0][0] - 10 * DEGREE) < 1e-6).toBe(
          true
        );
        expect(Math.abs(members[0].values[1][0] - 100 * DEGREE) < 1e-6).toBe(
          true
        );
        expect(
          members[1].values.every(
            ([value]) => Math.abs(value - 20 * DEGREE) < 1e-6
          )
        ).toBe(true);
      }
    );

    movingGeometryTest('scale is one member with one value', async () => {
      const zoom = await membersOf([['scale', 0.5, 1.5]]);
      expect(summarizeStart(zoom.events)).toBe(TRANSFORM_START);
      expect(zoom.properties.join()).toBe('transform.scale');
      expect(zoom.members[0].values[0].join()).toBe('0.5');
      expect(zoom.members[0].values[1].join()).toBe('1.5');
    });
  }

  if (PLAYS_CORE_ANIMATION_MEMBERS && PLAYS_3D_OPERATIONS) {
    movingGeometryTest(
      'a perspective is a matrix member and scale has one factor for each axis',
      async () => {
        const flip = await membersOf([
          ['perspective', 500, 500],
          ['rotateX', '90deg', '0deg'],
        ]);
        expect(summarizeStart(flip.events)).toBe(TRANSFORM_START);
        expect(flip.properties.join()).toBe(
          'transform,transform.rotateX,transform'
        );
        expect(Math.abs(flip.members[2].values[0][11] + 1 / 500) < 1e-6).toBe(
          true
        );

        const zoom = await membersOf([['scale', 0.5, 1.5]]);
        expect(zoom.properties.join()).toBe('transform,transform.scale');
        expect(zoom.members[1].values[0].join()).toBe('0.5,0.5,0.5');
        expect(zoom.members[1].values[1].join()).toBe('1.5,1.5,1.5');
      }
    );
  }

  movingGeometryTest(
    'a rotation of two turns is on its timeline: it shows one quarter turn at one eighth of its time',
    async () => {
      const caseName = 'a rotation of two turns';
      const { rows } = await playCase(caseName, TRANSFORM_CASES[caseName]);
      for (const { row } of rows) {
        expectCells(row.native.Transform.model, IDENTITY);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    `a transform leaf on a ScrollView ${PLAYS_TRANSFORM_ON_EACH_COMPONENT ? 'plays natively' : 'stays frame-driven'}`,
    async () => {
      const operations: Operation[] = [['rotate', 0, 1]];
      const layouts = transformPairOf(operations, { duration: 300 });
      const style = endTransformOf(operations);
      const box: SizeBoxProps = { host: 'ScrollView' };
      const tag = await mountScene(pairSceneOf(layouts, style, box));
      const move = async () => {
        await render(pairSceneOf(layouts, style, { ...box, left: END_LEFT }));
        await wait(500);
      };
      let drawnAngles: number[] = [];
      if (PLAYS_TRANSFORM_ON_EACH_COMPONENT) {
        const draws = await recordDrawnValues(tag, ['drawnMatrix'], move);
        drawnAngles = draws.map(({ values: [cosine, sine] }) =>
          Math.atan2(sine, cosine)
        );
      } else {
        await move();
      }
      expect(
        summarize(
          (await takeTraceOf(tag)).filter(
            ({ event }) => event !== 'FrameUpdateMounted'
          )
        )
      ).toBe(
        PLAYS_TRANSFORM_ON_EACH_COMPONENT
          ? `${TRANSFORM_START} > ClientAdmitted > ${TRANSFORM_END} > ClientEnded:Finished:None`
          : 'LayoutBuildFailed:UnsupportedTarget'
      );
      expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
      if (PLAYS_TRANSFORM_ON_EACH_COMPONENT) {
        console.log(
          `RuntimeTestsScrollViewDrawnAngles ${JSON.stringify(drawnAngles)}`
        );
        expect(drawnAngles.some((angle) => angle > 0.1 && angle < 0.9)).toBe(
          true
        );
        expect(
          drawnAngles.every(
            (angle, index) =>
              index === 0 ||
              angle >= drawnAngles[index - 1] - DRAWN_ANGLE_TOLERANCE
          )
        ).toBe(true);
        expect(
          Math.abs((drawnAngles[drawnAngles.length - 1] ?? 0) - 1) <
            DRAWN_ANGLE_TOLERANCE
        ).toBe(true);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'the start value stays on screen through the delay',
    async () => {
      const caseName = 'a translation after a delay';
      const { rows, end } = await playCase(caseName, TRANSFORM_CASES[caseName]);
      for (const { row } of rows) {
        expect(row.native.Transform.model[12]).toBe(0);
      }
      expect(end!.native.Transform.presentation[12]).toBe(0);
      await render(null);
    }
  );

  movingGeometryTest(
    'no duration with a delay holds the start value, then the model shows',
    async () => {
      const { events, reads, end } = await playCase(
        'no duration with a delay',
        transformCaseOf(
          [['scaleX', 0.5, 1]],
          { duration: 0, delays: [600] },
          {
            totalMs: 600,
            matrixTolerance: { ...REST_TOLERANCE, translation: 0.005 },
          }
        )
      );
      expect(summarizeStart(events)).toBe(TRANSFORM_START);
      expect(summarizeAfterStart(events)).toBe(TRANSFORM_END);
      expectOneKeyWhilePlaying(reads);
      expect(end!.native.Transform.presentation[0]).toBe(1);
      expect(end!.frame.Transform.model[0]).toBe(1);
      await render(null);
    }
  );

  movingGeometryTest(
    'no duration and no delay ends the track with the admission',
    async () => {
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
      const [native, frame] = await samplePair();
      expect(native.playbacks.length).toBe(0);
      expectCells(native.presentation, frame.model);
      expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
      await render(null);
    }
  );
});

describe('native layout transform continuity', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const TWO: Operation[] = [
    ['translateX', 0, 80],
    ['scale', 1, 1.5],
  ];

  /** The frame driver takes the boxes at a second commit, which has `next`. */
  const transferOf = (
    first: Operation[],
    next: Partial<ReferenceCase['replacement']>,
    shared: Leaf = {},
    commitMs = SECOND_COMMIT_MS
  ) =>
    transformCaseOf(first, shared, {
      replacement: { leaves: {}, ...next, isFrameDriven: true },
      places: BACK_AT_START,
      commitTimesMs: [commitMs],
    });

  const startedTargets = (events: TraceEvent[]) =>
    events
      .filter(({ event }) => event === 'TrackStarted')
      .map(({ target }) => target)
      .join();

  /** The events from the start of the second build of the native box. */
  const secondBuildOf = (events: TraceEvent[]) =>
    events.slice(
      events.findIndex(
        ({ event }, index) =>
          index > 0 &&
          (event === 'LayoutStartPending' || event === 'LayoutBuildFailed')
      )
    );

  /**
   * A spring has no declared timeline: the last record of each spring operation
   * of the native box has the frames of the record of the twin.
   */
  function expectSpringFramesOfTwin({ replacement }: ReferenceCase) {
    const records = readFrameRecords();
    (replacement?.operations ?? []).forEach(([kind, , , leaf], operation) => {
      if (!leaf?.isSpring) {
        return;
      }
      const [native, twin] = ['native', 'frame'].map((box) =>
        records
          .filter(
            (record) =>
              record.box === box && isSameLeaf(record, { key: kind, operation })
          )
          .pop()!
          .frames.map(({ timeMs, value }) => `${value} at ${timeMs}`)
      );
      expect(native.length > 0).toBe(true);
      expect(native.join()).toBe(twin.join());
    });
  }

  movingGeometryTest(
    'a new start with another end value replaces the track, and the native values and the frames of the frame driver are on the two timelines',
    async () => {
      const { events, reads } = await playCase(
        'a new start with another end value',
        CONTINUITY_CASES['a new start with another end value']
      );
      expect(summarize(secondBuildOf(events).filter(isHostEvent))).toBe(
        `LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Transform:false > Ended:Interrupted:None > TrackStarted:Transform > Admitted > ${TRANSFORM_END}`
      );
      expectOneKeyWhilePlaying(reads);
      await render(null);
    }
  );

  movingGeometryTest(
    'a new start with the same end value and a position leaf keeps the transform track on its timeline',
    async () => {
      const { events } = await playCase(
        'a new start with the same end value and a position leaf',
        CONTINUITY_CASES[
          'a new start with the same end value and a position leaf'
        ]
      );
      const second = secondBuildOf(events);
      expect(startedTargets(second)).toBe('PositionX');
      expect(buildFailures(events)).toBe('');
      await render(null);
    }
  );

  const transfers: [string, ReferenceCase, string][] = [
    [
      'a frame-driven start with no transform leaf',
      transferOf(TRANSLATION, { leaves: { originX: { hasCallback: true } } }),
      'UnsupportedTiming',
    ],
    [
      'a frame-driven start with a transform leaf',
      transferOf(TRANSLATION, {
        operations: [['translateX', 50, 20, { isSpring: true }]],
      }),
      'UnsupportedTiming',
    ],
    [
      'a start that continues one operation and replaces the other',
      transferOf(TWO, {
        operations: timedOperationsOf([
          ['translateX', 32, 80],
          ['scale', 1.2, 2],
        ]),
      }),
      'UnsupportedContinuation',
    ],
    [
      'a start with the same end values and no other leaf',
      transferOf(TWO, {
        operations: timedOperationsOf([
          ['translateX', 32, 80],
          ['scale', 1.2, 1.5],
        ]),
      }),
      'UnsupportedContinuation',
    ],
    [
      'a frame-driven start in the part of a curve below its start value',
      transferOf(
        TRANSLATION,
        { leaves: { originX: { hasCallback: true } } },
        { easing: Easing.bezier(0.3, -0.4, 0.7, 1.6) },
        0.1 * TRANSFORM_DURATION
      ),
      'UnsupportedTiming',
    ],
  ];
  for (const [caseName, referenceCase, failure] of transfers) {
    movingGeometryTest(
      `${caseName} takes the view from the transform track, and the frames of the frame driver on the two boxes are on the timelines`,
      async () => {
        const played = await playCase(caseName, referenceCase);
        const second = secondBuildOf(played.events);
        expect(buildFailures(second)).toBe(failure);
        expect(startedTargets(second)).toBe('');
        expectNoKeyAfterTransfer(played);
        expectModelOnFrames(caseName, played);
        expectSpringFramesOfTwin(referenceCase);
        await render(null);
      }
    );
  }

  const commitCases: [string, Operation[], number][] = [
    ['a number', COMMITTED_TRANSLATION, 12],
    ['an angle in degrees', COMMITTED_ROTATION, 1],
  ];
  for (const [trackName, committed, cell] of commitCases) {
    const caseName =
      `a commit of another style transform during a track of ${trackName}` as keyof typeof STYLE_COMMIT_CASES;
    movingGeometryTest(
      `${caseName} keeps the track on its timeline, and the committed style shows at its end`,
      async () => {
        const referenceCase = STYLE_COMMIT_CASES[caseName];
        const builderCallsBefore = builderCalls;
        const played = await play(referenceCase);
        const reads = expectReference(caseName, referenceCase, played);
        expect(summarize(played.events.filter(isHostEvent))).toBe(
          `${TRANSFORM_START} > ${TRANSFORM_END}`
        );
        expect(builderCalls).toBe(builderCallsBefore + 2);
        expectOneKeyWhilePlaying(reads);

        const { native, frame } = played.end!;
        expect(native.Transform.playbacks.length).toBe(0);
        const shown = native.Transform.presentation[cell];
        expect(Math.abs(shown - endCellsOf(committed)[cell]) < 0.001).toBe(
          true
        );
        const leafEnd = endCellsOf(referenceCase.operations!)[cell];
        expect(Math.abs(frame.Transform.model[cell] - leafEnd) < 0.001).toBe(
          true
        );
        await render(null);
      }
    );
  }

  const unrealizableCommits: [string, StyleTransform, SizeBoxProps['style']][] =
    [
      ['a transform origin', undefined, { transformOrigin: 'top left' }],
      ['a translation in percent', [{ translateX: '160%' }], {}],
    ];
  for (const [caseName, transform, style] of unrealizableCommits) {
    movingGeometryTest(
      `a commit of ${caseName} during the track gives the view to the frame driver, and its frames are on the timeline of the track`,
      async () => {
        const referenceCase = transformCaseOf(
          TRANSLATION,
          {},
          {
            restyle: {
              atMs: SECOND_COMMIT_MS,
              transform,
              style,
              handsOver: true,
            },
          }
        );
        const played = await play(referenceCase);
        expectReference(`a commit of ${caseName}`, referenceCase, played);
        const second = secondBuildOf(played.events);
        expect(buildFailures(second)).toBe('UnsupportedTarget');
        expect(startedTargets(second)).toBe('');
        expectNoKeyAfterTransfer(played);
        expectModelOnFrames(`a commit of ${caseName}`, played);
        await render(null);
      }
    );
  }
});

const WRITTEN_END = 80;
const WRITTEN_VALUE = 30;
const WRITE_BLOCK_MS = 40;
const offsets: Record<string, SharedValue<number>> = {};

/** A `SizeBox` whose `translateX` an animated style gives. */
function WrittenBox(box: SizeBoxProps) {
  const offset = useSharedValue(WRITTEN_END);
  offsets[box.refName ?? BOX_REF] = offset;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  // oxlint-disable-next-line reanimated/animated-style-non-animated-component -- The host of a `SizeBox` is an animated component.
  return <SizeBox {...box} style={[box.style, animatedStyle]} />;
}

function writePair(value: number, blockMs = 0) {
  const targets = [offsets[BOX_REF], offsets[FRAME_BOX_REF]];
  scheduleOnUI(() => {
    'worklet';
    blockUIThread(blockMs);
    for (const target of targets) {
      target.value = value;
    }
  });
}

/**
 * The boxes go to their end place, with one write of the two transforms: at
 * `atMs` from the commit, or before the commit after a block of the UI thread.
 * The rows go on after the declared end of the track, so each run has reads
 * from the removal lead of the written target.
 */
const writtenCaseOf = (atMs?: number): ReferenceCase =>
  transformCaseOf([['translateX', 0, WRITTEN_END]], undefined, {
    totalMs: 1.15 * TRANSFORM_DURATION,
    box: { Box: WrittenBox },
    write: {
      atMs,
      targets: ['Transform'],
      run: () =>
        writePair(WRITTEN_VALUE, atMs === undefined ? WRITE_BLOCK_MS : 0),
    },
  });

const hasModel = (value: number) => (read: RowRead) =>
  Math.abs(read.sampled.model[12] - value) < 0.01;

const fromOriginOf = ({ timeMs, tracks: [{ origin }] }: RowRead) =>
  timeMs - middleOf(origin);

/**
 * The reads with the model of the style come first, and each read after them
 * has the written model: the names of what is not so.
 */
function modelFaultsOf(reads: RowRead[], styledReads: number) {
  const countOf = (from: number, to: number, value: number) =>
    reads.slice(from, to).filter((read) => !hasModel(value)(read)).length;
  const notStyled = countOf(0, styledReads, WRITTEN_END);
  const notWritten = countOf(styledReads, reads.length, WRITTEN_VALUE);
  return [
    ...(notStyled > 0
      ? [
          `${notStyled} of the first ${styledReads} reads do not have the model of the style`,
        ]
      : []),
    ...(notWritten > 0
      ? [
          `${notWritten} of the ${reads.length - styledReads} reads after them do not have the written model`,
        ]
      : []),
    ...(styledReads === reads.length ? ['no read has the written model'] : []),
  ];
}

const styledReadsOf = (order: WriteOrder) =>
  order.name === 'after the mount' ? order.reads : 0;

/**
 * The first read with the written model is before `byMs` from the origin of its
 * track: the name of what is not so.
 */
function lateWriteFaultsOf(reads: RowRead[], byMs: number) {
  const written = reads.find(hasModel(WRITTEN_VALUE));
  return written === undefined || fromOriginOf(written) < byMs
    ? []
    : [
        `the first read with the written model is ${fromOriginOf(written).toFixed(2)} ms after the origin of its track, not before ${byMs} ms`,
      ];
}

describe('native layout transform and the synchronous props path', () => {
  if (
    !hasNativeLayoutRoute ||
    !getStaticFeatureFlag('IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS')
  ) {
    return;
  }

  /**
   * Statements A and B for a case with a write, and what the write does not
   * change: the track plays to its end with its one key, and the written value
   * shows then.
   */
  async function playWritten(testName: string, atMs?: number) {
    const referenceCase = writtenCaseOf(atMs);
    const played = await play(referenceCase);
    const reads = expectReference(testName, referenceCase, played);
    expectOneKeyWhilePlaying(reads);
    expect(summarize(played.events.filter(isHostEvent))).toBe(
      `${TRANSFORM_START} > ${TRANSFORM_END}`
    );
    const { playbacks, presentation } = played.end!.native.Transform;
    expect(playbacks.length).toBe(0);
    expect(Math.abs(presentation[12] - WRITTEN_VALUE) < 0.01).toBe(true);
    expect(callbacks.filter((each) => each.startsWith('native')).join()).toBe(
      'native:true'
    );
    return reads;
  }

  for (const tracks of [false, true]) {
    const duringTrack = `a transform write during the track keeps the track, and the written value shows at its end, tracking ${tracks}`;
    test(duringTrack, async () => {
      await withTracking(tracks, async () => {
        const reads = await playWritten(duringTrack, SECOND_COMMIT_MS);
        const order = writeOrderOf(reads, hasModel(WRITTEN_VALUE));
        expect(
          [
            ...(order.name === 'before the mount'
              ? ['no read before the write has the model of the style']
              : []),
            ...modelFaultsOf(reads, styledReadsOf(order)),
            ...lateWriteFaultsOf(reads, 0.5 * TRANSFORM_DURATION),
          ].join()
        ).toBe('');
      });
    });

    const beforeMount = `a transform write between a commit and its mount keeps the native start, and the written value shows at the end of the track, tracking ${tracks}`;
    test(beforeMount, async () => {
      await withTracking(tracks, async () => {
        const reads = await playWritten(beforeMount);
        const order = writeOrderOf(reads, hasModel(WRITTEN_VALUE));
        console.log(
          ['WRITE-ORDER', beforeMount, describeWriteOrder(order)].join(' | ')
        );
        expect(
          [
            order.name,
            ...modelFaultsOf(reads, styledReadsOf(order)),
            ...lateWriteFaultsOf(reads, 0.25 * TRANSFORM_DURATION),
          ].join(': ')
        ).toBe(order.name);
      });
    });
  }
});

const FLAG_DURATION = 900;
const FLAG_READ_MS = 300;
const HELD_ROTATION_MS = 300;
const HELD_OPACITY_MS = 1500;
const HELD_OPACITY = 0.4;

type ExitOperation = [
  kind: string,
  from: number | string,
  ...phaseEnds: (number | string)[],
];
type Exit = {
  operations: ExitOperation[];
  /** The time of all the phases of an operation. */
  durationMs: number;
  /** The exit has an opacity leaf of this time. */
  opacityMs?: number;
};

/** A callback on each operation keeps the exit frame-driven. */
const exitOf =
  ({ operations, durationMs, opacityMs }: Exit, isFrameDriven: boolean) =>
  () => {
    'worklet';
    const timingOf = <TValue extends number | string>(
      toValue: TValue,
      duration: number
    ) =>
      withTiming(
        toValue,
        { duration, easing: Easing.linear },
        isFrameDriven
          ? () => {
              'worklet';
            }
          : undefined
      );
    const hasOpacity = opacityMs !== undefined;
    return {
      initialValues: {
        transform: operations.map(([kind, from]) => ({ [kind]: from })),
        ...(hasOpacity && { opacity: 1 }),
      },
      animations: {
        transform: operations.map(([kind, , ...phaseEnds]) => ({
          [kind]: withSequence(
            ...phaseEnds.map((phaseEnd) =>
              timingOf(phaseEnd, durationMs / phaseEnds.length)
            )
          ),
        })),
        ...(hasOpacity && { opacity: timingOf(HELD_OPACITY, opacityMs) }),
      },
    };
  };

type ExitPairProps = { exit: Exit; isMounted: boolean };

function ExitPair({ exit, isMounted }: ExitPairProps) {
  return (
    <View style={styles.container}>
      {isMounted && <Box left={START_LEFT} exiting={exitOf(exit, false)} />}
      {isMounted && (
        <Box
          left={START_LEFT}
          exiting={exitOf(exit, true)}
          refName={FRAME_BOX_REF}
        />
      )}
    </View>
  );
}

/** The edge antialiasing of the native box and of its frame-driven twin. */
async function edgeAntialiasingAt(
  tags: number[],
  elapsedMs: number,
  startMs: number
) {
  await wait(Math.max(0, startMs + elapsedMs - performance.now()));
  const samples = await Promise.all(
    tags.map((tag) => appleSample(tag, 'Transform'))
  );
  return samples.map(({ edgeAntialiasing }) => edgeAntialiasing).join();
}

const hasTransformTrack = (events: TraceEvent[]) =>
  events.some(
    ({ event, target }) => event === 'TrackStarted' && target === 'Transform'
  );

describe('native layout transform and the edge antialiasing of the view', () => {
  if (!hasNativeLayoutRoute || !HAS_EDGE_ANTIALIASING) {
    return;
  }

  const layoutRows: [string, Operation[], boolean, boolean][] = [
    ['a rotation to no rotation', [['rotate', '90deg', '0deg']], true, false],
    [
      'a rotation to the rotation of the style',
      [['rotate', '0deg', '90deg']],
      true,
      true,
    ],
    ['a translation', [['translateX', 80, 0]], false, false],
    ['a rotation about Y', [['rotateY', '60deg', '0deg']], false, false],
    [
      'rotations about X and Y',
      [
        ['rotateX', '60deg', '0deg'],
        ['rotateY', '40deg', '0deg'],
      ],
      true,
      false,
    ],
  ];
  for (const [name, operations, during, afterEnd] of layoutRows) {
    test(`${name}: the view and its frame-driven twin have edge antialiasing ${String(during)} during the track and ${String(afterEnd)} after its end`, async () => {
      const layouts = transformPairOf(operations, { duration: FLAG_DURATION });
      const style = endTransformOf(operations);
      const tag = await mountScene(pairSceneOf(layouts, style));
      const start = performance.now();
      await render(pairSceneOf(layouts, style, { left: END_LEFT }));
      const tags = pairTags();
      expect(await edgeAntialiasingAt(tags, FLAG_READ_MS, start)).toBe(
        `${during},${during}`
      );
      expect(
        await edgeAntialiasingAt(tags, FLAG_DURATION + FLAG_READ_MS, start)
      ).toBe(`${afterEnd},${afterEnd}`);
      const events = await takeTraceOf(tag);
      expect(summarizeStart(events)).toBe(TRANSFORM_START);
      expect(summarizeAfterStart(events)).toBe(TRANSFORM_END);
      await render(null);
    });
  }

  const HALF = FLAG_DURATION / 2;
  const IN_SECOND_HALF: Leaf = { delays: [HALF], duration: HALF };
  const IN_FIRST_HALF: Leaf = { duration: HALF };
  const partRows: [string, Operation[], boolean, string][] = [
    [
      'a translation from 20.3 and a rotation from 0 that wait for half of the time stay frame-driven',
      [
        ['translateX', 20.3, 101.3, IN_SECOND_HALF],
        ['rotate', '0deg', '90deg', IN_SECOND_HALF],
      ],
      false,
      'false,false',
    ],
    [
      'a translation from 0 and a rotation from 0 that wait for half of the time stay frame-driven',
      [
        ['translateX', 0, 80, IN_SECOND_HALF],
        ['rotate', '0deg', '90deg', IN_SECOND_HALF],
      ],
      false,
      'false,false',
    ],
    [
      'a translation from 20.3 and a rotation from 30deg that wait for half of the time play natively',
      [
        ['translateX', 20.3, 60.6, IN_SECOND_HALF],
        ['rotate', '30deg', '90deg', IN_SECOND_HALF],
      ],
      true,
      'true,true',
    ],
    [
      'a rotation from 0 that starts at half of the time of a translation stays frame-driven',
      [
        ['translateX', 0, 80],
        ['rotate', '0deg', '90deg', IN_SECOND_HALF],
      ],
      false,
      'false,false',
    ],
    [
      'a rotation from 0 in the first half of the time of a translation plays natively',
      [
        ['translateX', 0, 80],
        ['rotate', '0deg', '90deg', IN_FIRST_HALF],
      ],
      true,
      'true,true',
    ],
    [
      'a rotation from 30deg that starts at half of the time of a translation plays natively',
      [
        ['translateX', 0, 80],
        ['rotate', '30deg', '90deg', IN_SECOND_HALF],
      ],
      true,
      'true,true',
    ],
    [
      'a translation from 20.3 and a rotation from 0 that wait for half of the time of a scale that stays at 1 stay frame-driven',
      [
        ['scale', 1, 1],
        ['translateX', 20.3, 60.6, IN_SECOND_HALF],
        ['rotate', '0deg', '90deg', IN_SECOND_HALF],
      ],
      false,
      'false,false',
    ],
  ];
  for (const [name, operations, isNative, inFirstHalf] of partRows) {
    test(`${name}: the edge antialiasing of the view and of its frame-driven twin is ${inFirstHalf} in the first half of the time and true,true in the second half`, async () => {
      const pair = transformPairOf(operations, { duration: FLAG_DURATION });
      const layouts = {
        ...pair,
        nativeLayout: countedOf('native', pair.nativeLayout),
      };
      const style = endTransformOf(operations);
      const tag = await mountScene(pairSceneOf(layouts, style));
      namedBuilderCalls.length = 0;
      const start = performance.now();
      await render(pairSceneOf(layouts, style, { left: END_LEFT }));
      const tags = pairTags();
      expect(await edgeAntialiasingAt(tags, 0.25 * FLAG_DURATION, start)).toBe(
        inFirstHalf
      );
      expect(await edgeAntialiasingAt(tags, 0.75 * FLAG_DURATION, start)).toBe(
        'true,true'
      );
      expect(callbacks.join()).toBe('');
      await wait(
        Math.max(0, start + FLAG_DURATION + FLAG_READ_MS - performance.now())
      );
      const events = await takeTraceOf(tag);
      expect(hasTransformTrack(events)).toBe(isNative);
      expect(buildFailures(events)).toBe(isNative ? '' : 'UnsupportedTarget');
      expect(namedBuilderCalls.join()).toBe('native');
      expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  test('an exit with a perspective: the view and its frame-driven twin have edge antialiasing during the track', async () => {
    const exit: Exit = {
      operations: [
        ['perspective', 500, 500],
        ['rotateX', '0deg', '60deg'],
      ],
      durationMs: FLAG_DURATION,
    };
    const tag = await mountScene(<ExitPair exit={exit} isMounted />);
    const tags = pairTags();
    const start = performance.now();
    await render(<ExitPair exit={exit} isMounted={false} />);
    expect(await edgeAntialiasingAt(tags, FLAG_READ_MS, start)).toBe(
      'true,true'
    );
    expect(hasTransformTrack(await takeTraceOf(tag))).toBe(true);
    await wait(FLAG_DURATION);
    await render(null);
  });

  test('an exit with a rotation about X and then a rotation about Y: the view and its frame-driven twin have no edge antialiasing during the track', async () => {
    const exit: Exit = {
      operations: [
        ['rotateX', '0deg', '50deg', '0deg', '0deg', '0deg'],
        ['rotateY', '0deg', '0deg', '0deg', '40deg', '0deg'],
      ],
      durationMs: FLAG_DURATION,
    };
    const tag = await mountScene(<ExitPair exit={exit} isMounted />);
    const tags = pairTags();
    const start = performance.now();
    await render(<ExitPair exit={exit} isMounted={false} />);
    for (const part of [0.25, 0.75]) {
      expect(await edgeAntialiasingAt(tags, part * FLAG_DURATION, start)).toBe(
        'false,false'
      );
    }
    expect(hasTransformTrack(await takeTraceOf(tag))).toBe(true);
    await wait(FLAG_DURATION);
    await render(null);
  });

  const refusedExitRows: [string, ExitOperation[], boolean, boolean][] = [
    [
      'a translation in two phases and a rotation that stays at 0 in the first phase',
      [
        ['translateX', 0, 40, 80],
        ['rotate', '0deg', '0deg', '90deg'],
      ],
      false,
      true,
    ],
    [
      'a translation and a rotation that stay at 0 in the first phase',
      [
        ['translateX', 0, 0, 40],
        ['rotate', '0deg', '0deg', '90deg'],
      ],
      false,
      true,
    ],
    [
      'a translation that stays at 20.3 and a rotation that stays at 0 in the first phase',
      [
        ['translateX', 20.3, 20.3, 60.6],
        ['rotate', '0deg', '0deg', '90deg'],
      ],
      false,
      true,
    ],
    [
      'a translation that stays at 20.3 and a rotation that stays at 0 in the second phase',
      [
        ['translateX', 60.6, 20.3, 20.3],
        ['rotate', '90deg', '0deg', '0deg'],
      ],
      true,
      false,
    ],
  ];
  for (const [
    name,
    operations,
    inFirstPhase,
    inSecondPhase,
  ] of refusedExitRows) {
    test(`an exit with ${name} stays frame-driven: the view and its frame-driven twin have edge antialiasing ${String(inFirstPhase)} in the first phase and ${String(inSecondPhase)} in the second phase`, async () => {
      const exit: Exit = { operations, durationMs: FLAG_DURATION };
      const tag = await mountScene(<ExitPair exit={exit} isMounted />);
      const tags = pairTags();
      const start = performance.now();
      await render(<ExitPair exit={exit} isMounted={false} />);
      expect(await edgeAntialiasingAt(tags, 0.25 * FLAG_DURATION, start)).toBe(
        `${inFirstPhase},${inFirstPhase}`
      );
      expect(await edgeAntialiasingAt(tags, 0.75 * FLAG_DURATION, start)).toBe(
        `${inSecondPhase},${inSecondPhase}`
      );
      const events = await takeTraceOf(tag);
      expect(hasTransformTrack(events)).toBe(false);
      expect(buildFailures(events)).toBe('UnsupportedTarget');
      await wait(FLAG_DURATION);
      await render(null);
    });
  }

  test('an exit whose rotation ends before its opacity: the view and its frame-driven twin have edge antialiasing during the rotation and while the view holds its end', async () => {
    const exit: Exit = {
      operations: [['rotate', '0deg', '45deg']],
      durationMs: HELD_ROTATION_MS,
      opacityMs: HELD_OPACITY_MS,
    };
    const tag = await mountScene(<ExitPair exit={exit} isMounted />);
    const tags = pairTags();
    const start = performance.now();
    await render(<ExitPair exit={exit} isMounted={false} />);
    expect(await edgeAntialiasingAt(tags, HELD_ROTATION_MS / 2, start)).toBe(
      'true,true'
    );
    expect(
      await edgeAntialiasingAt(tags, HELD_ROTATION_MS + FLAG_READ_MS, start)
    ).toBe('true,true');
    const events = await takeTraceOf(tag);
    expect(hasTransformTrack(events)).toBe(true);
    expect(
      events.some(
        ({ event, target }) => event === 'TrackEnded' && target === 'Transform'
      )
    ).toBe(true);
    await wait(HELD_OPACITY_MS);
    await render(null);
  });

  test('an exit whose rotation ends at 0 before its opacity: the view and its frame-driven twin have edge antialiasing during the rotation and none while the view holds its end', async () => {
    const exit: Exit = {
      operations: [['rotate', '30deg', '0deg']],
      durationMs: HELD_ROTATION_MS,
      opacityMs: HELD_OPACITY_MS,
    };
    const tag = await mountScene(<ExitPair exit={exit} isMounted />);
    const tags = pairTags();
    const start = performance.now();
    await render(<ExitPair exit={exit} isMounted={false} />);
    expect(await edgeAntialiasingAt(tags, HELD_ROTATION_MS / 2, start)).toBe(
      'true,true'
    );
    expect(
      await edgeAntialiasingAt(tags, HELD_ROTATION_MS + FLAG_READ_MS, start)
    ).toBe('false,false');
    expect(hasTransformTrack(await takeTraceOf(tag))).toBe(true);
    await wait(HELD_OPACITY_MS);
    await render(null);
  });
});

const TWIN_TOLERANCE: MatrixTolerance = { cells: 0.005, translation: 0.25 };
/** Parts of the time of a refused animation at which its transform moves. */
const FALLBACK_PARTS = [0.2, 0.45, 0.7];

const isNearCells = (
  shown: number[],
  expected: number[],
  tolerance: MatrixTolerance
) =>
  shown.length === expected.length &&
  shown.every(
    (cell, index) =>
      Math.abs(cell - expected[index]) < cellToleranceOf(index, tolerance)
  );

/**
 * The `Transform` samples of the native box and of its twin at each part of
 * `FALLBACK_PARTS` of `durationMs` from `startMs`.
 */
async function readPairAt(tags: number[], durationMs: number, startMs: number) {
  const reads: TargetSample[][] = [];
  for (const part of FALLBACK_PARTS) {
    await wait(Math.max(0, startMs + part * durationMs - performance.now()));
    reads.push(await Promise.all(tags.map((tag) => sample(tag, 'Transform'))));
  }
  return reads;
}

/**
 * The fallback evidence of a start that the platform refuses: the refusal
 * `UnsupportedTarget`, and the route of the `Transform` target of the native
 * box is frame-driven, with the model of its frame-driven twin in each read.
 */
function expectFrameDrivenAsTwin(
  events: TraceEvent[],
  tag: number,
  reads: TargetSample[][]
) {
  const route = routeOf(
    events,
    tag,
    'Transform',
    reads.map(([native, frame]) => ({ ...native, twin: frame.model })),
    ({ model, twin }) => isNearCells(model, twin, TWIN_TOLERANCE)
  );
  if (route.kind !== 'frame-driven') {
    throw new Error(`The refused start reports ${route.kind}.`);
  }
  expect(route.refusal.event).toBe('LayoutBuildFailed');
  expect(route.refusal.buildFailure).toBe('UnsupportedTarget');
}

describe('native layout transform with 3D operations on a platform that does not play them', () => {
  if (!hasNativeLayoutRoute || PLAYS_3D_OPERATIONS) {
    return;
  }

  test('a perspective and a rotation about X keep the whole animation frame-driven: UnsupportedTarget, and the view has the model of its frame-driven twin', async () => {
    const operations: Operation[] = [
      ['perspective', 500, 500],
      ['rotateX', '90deg', '0deg'],
    ];
    const layouts = transformPairOf(operations);
    const style = endTransformOf(operations);
    const tag = await mountScene(pairSceneOf(layouts, style));
    const startMs = performance.now();
    await render(pairSceneOf(layouts, style, { left: END_LEFT }));
    const reads = await readPairAt(pairTags(), TRANSFORM_DURATION, startMs);
    expectFrameDrivenAsTwin(await takeTrace(), tag, reads);
    await wait(
      Math.max(
        0,
        startMs + TRANSFORM_DURATION + FLAG_READ_MS - performance.now()
      )
    );
    const [native, frame] = await samplePair();
    expect(native.playbacks.length).toBe(0);
    expect(isNearCells(native.model, frame.model, TWIN_TOLERANCE)).toBe(true);
    expect(callbacks.slice().sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  const exits: [string, Exit][] = [
    [
      'an exit with a perspective',
      {
        operations: [
          ['perspective', 500, 500],
          ['rotateX', '0deg', '60deg'],
        ],
        durationMs: FLAG_DURATION,
      },
    ],
    [
      'an exit with a rotation about X and then a rotation about Y',
      {
        operations: [
          ['rotateX', '0deg', '50deg', '0deg', '0deg', '0deg'],
          ['rotateY', '0deg', '0deg', '0deg', '40deg', '0deg'],
        ],
        durationMs: FLAG_DURATION,
      },
    ],
  ];
  for (const [name, exit] of exits) {
    test(`${name} stays frame-driven: UnsupportedTarget, and the view has the model of its frame-driven twin`, async () => {
      const tag = await mountScene(<ExitPair exit={exit} isMounted />);
      const tags = pairTags();
      const startMs = performance.now();
      await render(<ExitPair exit={exit} isMounted={false} />);
      const reads = await readPairAt(tags, exit.durationMs, startMs);
      const events = await takeTrace();
      expectFrameDrivenAsTwin(events, tag, reads);
      expect(
        hasTransformTrack(events.filter((event) => event.tag === tag))
      ).toBe(false);
      await wait(exit.durationMs);
      await render(null);
    });
  }
});

const FORM_DURATION = 8000;
const FORM_BOX = { width: 100, height: 60 };
const FORM_END_MS = 300;
const FORM_PROPERTIES: RecordedProperty[] = ['frame', 'drawnMatrix'];
const STANDARD_PARTS = [0.1, 0.25, 0.5, 0.75, 0.9, 1];
const BOUNCE_KEYS = [4 / 11, 8 / 11, 10 / 11];

/**
 * The parts of the iOS table: the standard parts, and 0.02 on each side of each
 * key.
 */
const partsOf = (keys: number[], more: number[] = []) =>
  [
    ...new Set([
      ...STANDARD_PARTS,
      ...keys.flatMap((key) => [key - 0.02, key + 0.02]),
      ...more,
    ]),
  ].sort((first, second) => first - second);

type TransformForm = {
  /** The transform of a layout transition of the two boxes. */
  operations?: Operation[];
  /** The keyframe animation of an entering box, and its transform at the end. */
  entering?: {
    keyframeOf: () => SizeBoxProps['entering'];
    transform: ViewStyle['transform'];
  };
  /** The progress of the track at each compared draw. */
  parts: number[];
};

/** The transform forms of a measured iOS table. */
const TRANSFORM_FORMS: Record<string, TransformForm> = {
  'a: a rotation to 90deg in the first half of a translation': {
    operations: [
      ['rotate', '0deg', '90deg', { duration: 0.5 * FORM_DURATION }],
      ['translateX', 0, 100],
    ],
    parts: partsOf([0.5]),
  },
  'b: a translation and a rotation with a delay of 0.3 and a duration of 0.5': {
    operations: [
      ['translateX', 0, 100],
      [
        'rotate',
        '0deg',
        '90deg',
        { delays: [0.3 * FORM_DURATION], duration: 0.5 * FORM_DURATION },
      ],
    ],
    parts: partsOf([0.3, 0.8]),
  },
  'c: an entering keyframe animation of a scale and a rotation': {
    entering: {
      keyframeOf: () =>
        new Keyframe({
          0: { transform: [{ scale: 0.5 }, { rotate: '0deg' }] },
          40: { transform: [{ scale: 1.2 }] },
          100: { transform: [{ scale: 1 }, { rotate: '90deg' }] },
        } as ConstructorParameters<typeof Keyframe>[0]).duration(FORM_DURATION),
      transform: [{ scale: 1 }, { rotate: '90deg' }],
    },
    parts: partsOf([0.4]),
  },
  'd: a translation with the default easing, a scale of 0.6, and a rotation of 0.35':
    {
      operations: [
        ['translateX', 0, 80, { easing: 'default' }],
        ['scale', 0.5, 1.2, { duration: 0.6 * FORM_DURATION }],
        ['rotate', '0deg', '60deg', { duration: 0.35 * FORM_DURATION }],
      ],
      parts: partsOf([0.35, 0.6]),
    },
  'e: a rotation with Easing.bounce and a translation with inOut(quad) in 0.6':
    {
      operations: [
        ['rotate', '0deg', '90deg', { easing: Easing.bounce }],
        [
          'translateX',
          0,
          100,
          { duration: 0.6 * FORM_DURATION, easing: 'default' },
        ],
      ],
      parts: partsOf([0.3, 0.6, ...BOUNCE_KEYS]),
    },
  'f: a translation with Easing.bezier and a rotation with Easing.sin in 0.7': {
    operations: [
      ['translateX', 0, 100, { easing: Easing.bezier(0.3, 0, 0.7, 1) }],
      [
        'rotate',
        '0deg',
        '90deg',
        { duration: 0.7 * FORM_DURATION, easing: Easing.sin },
      ],
    ],
    parts: partsOf([0.35, 0.7]),
  },
  'g: a move, a hold, and a move of translateY with a linear rotation': {
    operations: [
      [
        'translateY',
        0,
        0,
        {
          via: [{ to: -40, duration: 0.3 * FORM_DURATION }],
          delay: 0.2 * FORM_DURATION,
          duration: 0.3 * FORM_DURATION,
        },
      ],
      ['rotate', '0deg', '90deg'],
    ],
    parts: partsOf([0.3, 0.5, 0.8]),
  },
  'h: a translation from 393 with Easing.bounce and a rotation of 30deg in 0.2':
    {
      operations: [
        ['translateX', 393, 0, { easing: Easing.bounce }],
        ['rotate', '0deg', '30deg', { duration: 0.2 * FORM_DURATION }],
      ],
      parts: partsOf([0.2, ...BOUNCE_KEYS], [0.9075]),
    },
};

type EnteringAnimations = Pick<SizeBoxProps, 'entering'>;

function EnteringFormPair({
  isMounted,
  transform,
  native,
  frame,
}: {
  isMounted: boolean;
  transform: ViewStyle['transform'];
  native: EnteringAnimations;
  frame: EnteringAnimations;
}) {
  const box = { left: START_LEFT, top: 60, ...FORM_BOX, style: { transform } };
  return (
    <View style={styles.sizeRow}>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        {isMounted && <SizeBox {...box} {...native} />}
      </View>
      <View style={[styles.sizeCell, styles.sizeRowCell]}>
        {isMounted && <SizeBox {...box} {...frame} refName={FRAME_BOX_REF} />}
      </View>
    </View>
  );
}

/**
 * The drawn values of the two boxes of a form, at each draw from its start to
 * after its end.
 */
async function playForm({ operations, entering }: TransformForm) {
  const during = () => wait(FORM_DURATION + FORM_END_MS);
  if (operations) {
    const layouts = transformPairOf(operations, { duration: FORM_DURATION });
    const style = endTransformOf(operations);
    await mountScene(pairSceneOf(layouts, style, FORM_BOX));
    const tags = pairTags();
    const samples = await recordDrawnValues(tags, FORM_PROPERTIES, async () => {
      await render(
        pairSceneOf(layouts, style, { ...FORM_BOX, left: END_LEFT })
      );
      await during();
    });
    return { tags, samples };
  }
  const pair = {
    transform: entering!.transform,
    native: { entering: entering!.keyframeOf() },
    frame: {
      entering: frameDrivenOf(
        entering!.keyframeOf() as unknown as Parameters<typeof frameDrivenOf>[0]
      ) as SizeBoxProps['entering'],
    },
  };
  await render(<EnteringFormPair {...pair} isMounted={false} />);
  await wait(200);
  await takeTrace();
  await render(<EnteringFormPair {...pair} isMounted />);
  const tags = pairTags();
  await Promise.all(
    tags.map((tag) => afterMountOf(() => sample(tag, 'Transform')))
  );
  const samples = await recordDrawnValues(tags, FORM_PROPERTIES, during);
  return { tags, samples };
}

const FORM_VALUE_COUNT = FORM_PROPERTIES.reduce(
  (count, property) => count + valueCountOf(property),
  0
);

/** The drawn place of each corner of a box in its parent, from one draw. */
function drawnCornersOf(values: number[], box: number) {
  const offset = box * FORM_VALUE_COUNT;
  const frame = values.slice(offset, offset + valueCountOf('frame'));
  const matrix = values.slice(offset + frame.length, offset + FORM_VALUE_COUNT);
  const [, , width, height] = frame;
  return (
    [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ] as [number, number][]
  ).map((corner) => drawnPointOf(frame, matrix, corner));
}

/**
 * The place of the cell of the twin from the cell of the native box, from the
 * frames of the first draw: a frame is in the parent that has the place of the
 * pair after React flattens the cells (measured on Android: the twin 200 pt to
 * the right).
 */
function cellOffsetOf(values: number[]): [number, number] {
  const frameOf = (box: number) =>
    values.slice(box * FORM_VALUE_COUNT, box * FORM_VALUE_COUNT + 2);
  const [[nativeLeft, nativeTop], [twinLeft, twinTop]] = [0, 1].map(frameOf);
  return [twinLeft - nativeLeft, twinTop - nativeTop];
}

describe('native layout transform forms against the frame driver', () => {
  if (!hasNativeLayoutRoute || !isViewSamplerAvailable()) {
    return;
  }

  for (const [formName, form] of Object.entries(TRANSFORM_FORMS)) {
    movingGeometryTest(
      `form ${formName}: at each time of the iOS table, each drawn corner of the native box is no more than ${POSITION_TOLERANCE} pt from the corner of its frame-driven twin`,
      async () => {
        const { tags, samples } = await playForm(form);
        const [nativeTag, frameTag] = tags;
        const events = (await takeTrace()).filter(
          ({ event }) => event !== 'FrameUpdateMounted'
        );
        const ofTag = (tag: number) =>
          events.filter((event) => event.tag === tag);
        expect(summarizeStart(ofTag(nativeTag))).toBe(TRANSFORM_START);
        expect(summarizeAfterStart(ofTag(nativeTag))).toBe(TRANSFORM_END);
        expect(summarize(ofTag(frameTag))).toBe(
          'LayoutBuildFailed:UnsupportedTiming'
        );
        const originMs = ofTag(nativeTag).find(
          ({ event }) => event === 'Received'
        )?.originTimestampMs;
        expect(originMs === undefined).toBe(false);

        const cellOffset = cellOffsetOf(samples[0].values);
        const rows = form.parts.map((part) => {
          const drawn = samples.find(
            ({ timeMs }) => timeMs >= originMs! + part * FORM_DURATION
          );
          if (!drawn) {
            return { part, distance: NaN };
          }
          const native = drawnCornersOf(drawn.values, 0);
          const twin = drawnCornersOf(drawn.values, 1).map(
            ([x, y]): [number, number] => [x - cellOffset[0], y - cellOffset[1]]
          );
          const distance = Math.max(
            ...native.map(([x, y], corner) =>
              Math.hypot(x - twin[corner][0], y - twin[corner][1])
            )
          );
          return { part, timeMs: drawn.timeMs, distance, native, twin };
        });
        console.log(
          'RuntimeTestsTransformForms ' +
            JSON.stringify({ form: formName, originMs, rows })
        );
        expect(
          rows
            .filter(({ distance }) => !(distance <= POSITION_TOLERANCE))
            .map(({ part, distance }) => `${part}: ${distance}`)
            .join()
        ).toBe('');
        await render(null);
      }
    );
  }
});
