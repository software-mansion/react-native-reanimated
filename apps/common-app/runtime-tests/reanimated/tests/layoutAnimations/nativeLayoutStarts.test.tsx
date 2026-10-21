/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B),
 * and at the end the native box shows its model and the twin has the same model. A check of a playback key
 * count or of a held size in such a test is for each row, by the time of the row against the times of the
 * trace. Each other test has state checks and trace checks at planned times.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, when a callback comes or the gap of two callbacks, that a
 * row comes in each part of a timeline, a native value in the first display frame after its origin to
 * better than one display frame. The pixels on screen, a device, and 120 Hz are not tested.
 *
 * Statement A has the edge hold of `native layout reference`. Within the read band, this suite cannot
 * distinguish the platform hold from a native segment that keeps its start value through eased progress
 * 0.001 or shows its end value from eased progress 0.999. The frame-driven twin keeps its exact curve check
 * without a hold allowance.
 *
 * The suite `native layout live clock` has the wall-clock statements for the cases of this suite in
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the gap of the two end
 * callbacks, and a row of the native box in each phase.
 */

import {
  Easing,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  MOVED_AND_RESIZED,
  SIZE_DURATION,
  SIZE_START,
} from './nativeLayoutLiveClockCases';
import type {
  CallbackBuilder,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type {
  Band,
  DeclaredKey,
  GeometryTrack,
  Key,
  Leaf,
  LayoutOptions,
  Operation,
  BoxProps,
  ScalarKey,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  hasNativeLayoutRoute,
  PLAYS_3D_OPERATIONS,
  movingGeometryTest,
  testOfTracks,
  declaresMotion,
  PLAYS_SIZE_CHANGE,
  REFUSES_OPACITY_UNDER_FILTER,
  WRITES_ANIMATION_MATRIX,
  declaredTimelineOf,
  declaredValueOf,
  layerPositionOf,
  routeOf,
  START_LEFT,
  END_LEFT,
  DURATION,
  LAID_OUT_TOLERANCE,
  POSITION_TOLERANCE,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  centerOf,
  takeTraceOf,
  isHostEvent,
  sample,
  playbackCountOf,
  summarize,
  callbacks,
  builderCalls,
  waitForCallbacks,
  layoutOf,
  endTransformOf,
  MALFORMED_BEZIER,
  Scene,
  renderBox,
  NATIVE_START,
  NATIVE_END,
  summarizeEnd,
} from './nativeLayoutTestKit';

const REST_TOLERANCE = 0.01;
const LAYOUT_TARGETS = ['PositionX', 'PositionY', 'Width', 'Height'];

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
 * At the end the native box shows its model, and the twin has the model of the
 * native box, to one pixel: the twin lays out on its own place of the pixel
 * grid (measured on Android: a height of 49.904785 for the twin and 50.285721
 * for the native box in one place).
 */
function expectAtRest({ end }: Played) {
  for (const [target, { presentation, model }] of Object.entries(
    end?.native ?? {}
  )) {
    const twinTolerance =
      REST_TOLERANCE +
      (LAYOUT_TARGETS.includes(target) ? LAID_OUT_TOLERANCE : 0);
    model.forEach((value, index) => {
      expect(Math.abs(presentation[index] - value) < REST_TOLERANCE).toBe(true);
      expect(
        Math.abs(end!.frame[target].model[index] - value) < twinTolerance
      ).toBe(true);
    });
  }
}

type FrameDrivenBuild = [
  caseName: string,
  leaves: Partial<Record<Key, Leaf>>,
  failure: string,
  options?: LayoutOptions,
  box?: Partial<BoxProps>,
];

/**
 * The geometry tracks of a build of a box that the scene moves from
 * `START_LEFT` to `END_LEFT`. Each position leaf counts as one that moves, and
 * an operation moves by `declaresMotion`.
 */
const geometryTracksOf = ([
  ,
  leaves,
  ,
  options,
]: FrameDrivenBuild): GeometryTrack[] => [
  ...(['originX', 'originY'] as const).flatMap((key) =>
    leaves[key]
      ? [{ target: key === 'originX' ? 'PositionX' : 'PositionY', moves: true }]
      : []
  ),
  ...(options?.transform?.operations ?? []).map(([, from, to, leaf = {}]) => ({
    target: 'Transform',
    moves: declaresMotion({ isPlain: leaf.isPlain, from, to, leaf }),
  })),
];

const transformCase = (
  operations: Operation[],
  transform = endTransformOf(operations),
  box: Partial<BoxProps> = {}
): [LayoutOptions, Partial<BoxProps>] => [
  { transform: { operations } },
  { transform, ...box },
];
const TURN: Operation = ['rotate', 0, 1];

/**
 * The build fails with `failure`, the builder runs one time, and the frame
 * driver plays the whole animation to its end.
 */
async function expectWholeAnimationFrameDriven(
  ...[, leaves, failure, options, box]: FrameDrivenBuild
) {
  const layout = layoutOf(leaves, { ...options, name: 'frame' });
  const leaf = leaves.originX;
  const isFinite = !Number.isNaN(
    (leaf?.duration ?? 0) +
      (leaf?.initial === 'none' ? 0 : (leaf?.initial ?? 0))
  );
  const playsToItsEnd = leaf !== undefined && isFinite && !leaf.to;
  const tag = await renderBox({ layout, ...box });
  await render(<Scene left={END_LEFT} layout={layout} {...box} />);
  if (playsToItsEnd) {
    expect(await waitForCallbacks(['frame:true'])).toBe('');
  } else {
    await wait(DURATION * 1.5);
  }

  const events = (await takeTraceOf(tag)).filter(
    (event) => event.event !== 'FrameUpdateMounted'
  );
  expect(summarize(events)).toBe(`LayoutBuildFailed:${failure}`);
  expect(builderCalls).toBe(1);
  if (playsToItsEnd) {
    expect(callbacks.join()).toBe('frame:true');
    const { model } = await sample(tag, 'PositionX');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE).toBe(
      true
    );
  }
  await render(null);
}

function firstEventOf(events: TraceEvent[], name: string) {
  const found = events.find(({ event }) => event === name);
  if (!found) {
    throw new Error(`The trace has no ${name} event: ${summarize(events)}`);
  }
  return found;
}

const MOVES: Partial<Record<Key, Leaf>> = { originX: {}, originY: {} };
const THREE_D_KINDS = ['rotateX', 'rotateY', 'perspective'];

describe('native layout starts after the mount of the final state', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'the final state mounts before admission and the model holds the endpoint',
    async () => {
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} />);
      await wait(DURATION / 2);

      const events = await takeTraceOf(tag);
      expect(summarize(events.filter(isHostEvent))).toBe(NATIVE_START);
      expect(events[0].owner).toBe('Layout');
      expect(events[1].transactionNumber).toBe(events[0].transactionNumber);
      expect(events[3].endpointPolicy).toBe('MountedModelMustMatchEndpoint');

      const playing = await sample(tag, 'PositionX');
      const { model, presentation, monotonicTimeMs } = playing;
      expect(playing.playbacks.length).toBe(2);
      expect(playbackCountOf(playing, events[0].generation)).toBe(2);
      expect(
        Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      const progress = (monotonicTimeMs - events[0].monotonicTimeMs) / DURATION;
      const expectedX =
        centerOf(START_LEFT) + progress * (END_LEFT - START_LEFT);
      expect(
        Math.abs(presentation[0] - expectedX) <
          FIRST_FRAME_TRAVEL + POSITION_TOLERANCE
      ).toBe(true);

      await wait(DURATION);
      expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
      const end = await sample(tag, 'PositionX');
      expect(end.playbacks.length).toBe(0);
      expect(
        Math.abs(end.presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      await render(null);
    }
  );

  const MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1];
  const transformFailures: [
    string,
    Partial<Record<Key, Leaf>>,
    string,
    LayoutOptions,
    Partial<BoxProps>,
  ][] = [
    [
      'a skewX operation',
      {},
      'UnsupportedValue',
      ...transformCase([['skewX', '0deg', '30deg']]),
    ],
    [
      'a skewY operation',
      {},
      'UnsupportedValue',
      ...transformCase([['skewY', '0deg', '30deg']]),
    ],
    [
      'a translate operation',
      {},
      'UnsupportedValue',
      ...transformCase([['translate', [0, 0], [10, 20]]]),
    ],
    [
      'an operation of an unknown kind',
      {},
      'UnsupportedValue',
      ...transformCase([['translateZ', 0, 10]], [{ translateX: 0 }]),
    ],
    [
      'a matrix operation',
      {},
      'UnsupportedValue',
      ...transformCase([['matrix', MATRIX, MATRIX]]),
    ],
    [
      'a perspective that changes',
      {},
      'UnsupportedValue',
      ...transformCase([['perspective', 300, 500], TURN]),
    ],
    [
      'a translation in percent',
      {},
      'UnsupportedValue',
      ...transformCase([['translateX', '0%', '50%']]),
    ],
    [
      'an angle that changes its unit',
      {},
      'UnsupportedValue',
      ...transformCase([['rotate', '0rad', '90deg']]),
    ],
    [
      'a transform leaf with no initial value',
      {},
      'UnsupportedValue',
      { transform: { operations: [TURN], hasNoInitialValue: true } },
      { transform: endTransformOf([TURN]) },
    ],
    [
      'an operation with no duration after a delay beside an operation with a duration',
      {},
      'UnsupportedTrackForm',
      ...transformCase([
        TURN,
        ['translateX', 0, 10, { duration: 0, delays: [50] }],
      ]),
    ],
    [
      'an operation with a spring',
      {},
      'UnsupportedTiming',
      ...transformCase([TURN, ['translateX', 0, 10, { isSpring: true }]]),
    ],
    [
      'a transform leaf on a view with a transform origin',
      {},
      'UnsupportedTarget',
      ...transformCase([TURN], undefined, { transformOrigin: 'top left' }),
    ],
    [
      'a transform leaf on a view with a translation in percent',
      {},
      'UnsupportedTarget',
      ...transformCase(
        [['translateX', 25, 25], TURN],
        [{ translateX: '50%' }, { rotate: '1rad' }]
      ),
    ],
    [
      'an end transform that the style does not have',
      {},
      'EndpointMismatch',
      ...transformCase([TURN], [{ rotate: '0.5rad' }]),
    ],
    [
      'a perspective that the style does not have',
      {},
      PLAYS_3D_OPERATIONS ? 'EndpointMismatch' : 'UnsupportedTarget',
      ...transformCase(
        [
          ['perspective', 500, 500],
          ['rotateX', '90deg', '0deg'],
        ],
        [{ rotateX: '0deg' }]
      ),
    ],
    [
      'more segments than the native route takes in one operation timeline and two scalar leaves',
      {
        originX: { easing: Easing.bounce },
        opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
      },
      'ResourceLimit',
      ...transformCase([['rotate', 0, 1, { easing: Easing.bounce }]]),
    ],
    [
      'more segments than the native route takes in the sum of four operation timelines with the 22 segments of Easing.bounce',
      {},
      'ResourceLimit',
      ...transformCase([
        ['translateX', 0, 10, { easing: Easing.bounce }],
        ['translateY', 0, 10, { easing: Easing.bounce }],
        ['scale', 1, 1.2, { easing: Easing.bounce }],
        ['rotate', 0, 1, { easing: Easing.bounce }],
      ]),
    ],
    [
      'more operations than the limit',
      {},
      'ResourceLimit',
      ...transformCase([
        TURN,
        ['translateX', 0, 10],
        ['translateY', 0, 10],
        ['scaleX', 1, 2],
        ['scaleY', 1, 2],
      ]),
    ],
  ];

  const animationMatrixRefusals: FrameDrivenBuild[] = [
    [
      'a view with a skew model transform',
      MOVES,
      'UnsupportedTarget',
      undefined,
      { transform: [{ skewX: '20deg' }] },
    ],
    [
      'a final scale of 0 with a transform track',
      {},
      'UnsupportedTarget',
      ...transformCase([['scale', 1, 0]]),
    ],
  ];
  const threeDRefusals: FrameDrivenBuild[] = [
    [
      'a rotateX operation',
      {},
      'UnsupportedTarget',
      ...transformCase([['rotateX', '0deg', '40deg']]),
    ],
    [
      'a rotateY operation',
      {},
      'UnsupportedTarget',
      ...transformCase([['rotateY', '0deg', '40deg']]),
    ],
    [
      'a constant perspective operation',
      {},
      'UnsupportedTarget',
      ...transformCase([['perspective', 500, 500], TURN]),
    ],
  ];

  const opacityFilterRefusal: FrameDrivenBuild = [
    'an opacity leaf on a view with an opacity filter',
    { originX: {}, opacity: { initial: 1, to: 1 } },
    'UnsupportedTarget',
    undefined,
    { hasOpacityFilter: true },
  ];

  const frameDrivenBuilds: FrameDrivenBuild[] = [
    [
      'an easing with a step',
      { originX: { easing: Easing.steps(4) } },
      'UnsupportedTiming',
    ],
    [
      'an easing with no fit',
      { originX: { easing: Easing.circle } },
      'UnsupportedTiming',
    ],
    [
      'more segments than the native route takes',
      {
        originX: { easing: Easing.bounce },
        width: { easing: Easing.bounce, initial: 10 },
        opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
      },
      'ResourceLimit',
    ],
    [
      'a spring beside a timing',
      { originX: {}, originY: { isSpring: true } },
      'UnsupportedTiming',
    ],
    [
      'a callback on a leaf',
      { originX: { hasCallback: true } },
      'UnsupportedTiming',
    ],
    [
      'a callback on a leaf inside a delay',
      { originX: { hasCallback: true, delays: [50] } },
      'UnsupportedTiming',
    ],
    [
      'reduced motion that the builder sets',
      { originX: { setsReduceMotion: true } },
      'UnsupportedTiming',
    ],
    [
      'a duration that is a string',
      { originX: { duration: '400' as unknown as number } },
      'InvalidValue',
    ],
    [
      'control points that are not an array',
      { originX: { easing: MALFORMED_BEZIER } },
      'InvalidValue',
    ],
    [
      'an initial value that is not finite',
      { originX: { initial: NaN } },
      'InvalidValue',
    ],
    ['a builder with no animation', {}, 'UnsupportedTrackForm'],
    [
      'reduced motion on a leaf',
      { originX: { reduceMotion: ReduceMotion.Always } },
      'UnsupportedTiming',
    ],
    [
      'a duration that is not a number',
      { originX: { duration: NaN } },
      'InvalidValue',
    ],
    ['no initial value', { originX: { initial: 'none' } }, 'UnsupportedValue'],
    [
      'an initial value with no animation',
      { originX: {} },
      'UnsupportedTrackForm',
      { initialOnlyKey: 'opacity' },
    ],
    [
      'more leaves than native targets',
      {
        originX: {},
        originY: {},
        width: {},
        height: {},
        opacity: { initial: 1, to: 1 },
        borderRadius: { initial: 0, to: 0 },
      },
      'ResourceLimit',
      { transform: { operations: [['rotate', 0, 0]] } },
    ],
    ...transformFailures,
    [
      'an end value that the mount does not give',
      { originX: { to: 10 } },
      'EndpointMismatch',
    ],
    ...(REFUSES_OPACITY_UNDER_FILTER ? [opacityFilterRefusal] : []),
    ...(WRITES_ANIMATION_MATRIX ? animationMatrixRefusals : []),
    ...(PLAYS_3D_OPERATIONS ? [] : threeDRefusals),
  ];

  type NativeBuild = [
    string,
    Partial<Record<Key, Leaf>>,
    string[],
    LayoutOptions?,
    Partial<BoxProps>?,
  ];
  const opacityUnderFilterOnAndroid: NativeBuild = [
    'on Android, an opacity leaf on a view with an opacity filter',
    { originX: {}, opacity: { initial: 1, to: 1 } },
    ['PositionX', 'Opacity'],
    undefined,
    { hasOpacityFilter: true },
  ];
  const nativeBuilds: NativeBuild[] = [
    ...(REFUSES_OPACITY_UNDER_FILTER ? [] : [opacityUnderFilterOnAndroid]),
    ['the default easing', { originX: { easing: 'default' } }, ['PositionX']],
    [
      'Easing.out(Easing.ease)',
      { originX: { easing: Easing.out(Easing.ease) } },
      ['PositionX'],
    ],
    ['Easing.quad', { originX: { easing: Easing.quad } }, ['PositionX']],
    [
      'the 22 segments of Easing.bounce on each of two leaves',
      {
        originX: { easing: Easing.bounce },
        opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
      },
      ['PositionX', 'Opacity'],
    ],
    [
      'a size leaf that does not change',
      { originX: {}, width: {} },
      ['PositionX', 'Width'],
    ],
    [
      'one leaf for each layout key',
      { originX: {}, originY: {}, width: {}, height: {} },
      ['PositionX', 'PositionY', 'Width', 'Height'],
    ],
    [
      'one leaf for each native target',
      {
        originX: {},
        originY: {},
        width: {},
        height: {},
        opacity: { initial: 1, to: 1 },
      },
      ['PositionX', 'PositionY', 'Width', 'Height', 'Opacity'],
    ],
    [
      'a transform leaf with the largest number of operations',
      {},
      ['Transform'],
      ...transformCase([
        ['perspective', 500, 500],
        ['rotateY', '0deg', '40deg'],
        ['translateX', 0, 10, { isPlain: true }],
        ['scale', 1, 1.2],
      ]),
    ],
    [
      'two operations with the 22 segments of Easing.bounce beside a position leaf',
      { originX: {} },
      ['PositionX', 'Transform'],
      ...transformCase([
        ['scale', 1, 1.2, { easing: Easing.bounce }],
        ['rotate', 0, 1, { easing: Easing.bounce }],
      ]),
    ],
    [
      'a transform leaf with no operation beside a position leaf',
      { originX: {} },
      ['PositionX', 'Transform'],
      { transform: { operations: [] } },
      {},
    ],
    [
      'the largest number of leaves',
      {
        originX: {},
        originY: {},
        width: {},
        height: {},
        opacity: { initial: 1, to: 1 },
      },
      ['PositionX', 'PositionY', 'Width', 'Height', 'Opacity', 'Transform'],
      ...transformCase([TURN]),
    ],
  ];
  const hasThreeDOperation = (options?: LayoutOptions) =>
    (options?.transform?.operations ?? []).some(([kind]) =>
      THREE_D_KINDS.includes(kind)
    );
  const isNativeBuild = ([, , , options]: (typeof nativeBuilds)[number]) =>
    PLAYS_3D_OPERATIONS || !hasThreeDOperation(options);

  for (const build of [
    ...frameDrivenBuilds,
    ...nativeBuilds
      .filter((nativeBuild) => !isNativeBuild(nativeBuild))
      .map(
        ([caseName, leaves, , options, box]): FrameDrivenBuild => [
          caseName,
          leaves,
          'UnsupportedTarget',
          options,
          box,
        ]
      ),
  ]) {
    testOfTracks(geometryTracksOf(build))(
      `${build[0]} keeps the whole animation frame-driven: ${build[2]}`,
      async () => {
        await expectWholeAnimationFrameDriven(...build);
      }
    );
  }
});

describe('native layout size', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const START = SIZE_START;
  const MOVED: Place = { left: 120, top: 40, width: 50, height: 50 };
  const RESIZED: Place = { left: 0, top: 0, width: 150, height: 90 };

  const startOf = (...targets: string[]) =>
    `LayoutStartPending > LayoutStartMounted > Received > ${targets
      .map((target) => `TrackStarted:${target}`)
      .join(' > ')} > Admitted`;
  const FOUR_TRACKS = startOf('PositionX', 'PositionY', 'Width', 'Height');

  const isStartEvent = ({ event }: TraceEvent) =>
    event !== 'TrackEnded' && event !== 'Ended';
  const summarizeStart = (events: TraceEvent[]) =>
    summarize(events.filter(isHostEvent).filter(isStartEvent));
  const summarizeResults = (events: TraceEvent[]) =>
    summarize(events.filter(({ event }) => event === 'Ended'));

  const linearLayout = (durationMs: number) =>
    LinearTransition.duration(durationMs).easing(Easing.linear);
  const LINEAR_LEAF: Leaf = { duration: SIZE_DURATION };
  const LINEAR: Pick<ReferenceCase, 'leaves' | 'builder'> = {
    leaves: {
      originX: LINEAR_LEAF,
      originY: LINEAR_LEAF,
      width: LINEAR_LEAF,
      height: LINEAR_LEAF,
    },
    builder: () => linearLayout(SIZE_DURATION) as unknown as CallbackBuilder,
  };

  const sizeCaseOf = (
    declaration: Pick<ReferenceCase, 'leaves' | 'builder'>,
    start: Place,
    end: Place,
    options: Pick<ReferenceCase, 'box' | 'alsoSampled'> = {}
  ): ReferenceCase => ({
    flow: 'layout',
    ...declaration,
    places: [start, end],
    totalMs: SIZE_DURATION,
    ...options,
  });

  /**
   * Android refuses a Width or Height track that changes
   * (`AndroidNativeAnimationPlatform::playsTarget`): the frame driver plays the
   * whole animation on the two boxes.
   */
  const sizeChangeOf = (referenceCase: ReferenceCase): ReferenceCase =>
    PLAYS_SIZE_CHANGE
      ? referenceCase
      : { ...referenceCase, isFrameDriven: true };
  const SIZE_FALLBACK_NAME =
    'keeps the whole animation frame-driven: UnsupportedTarget, and the frames of the frame driver on the two boxes are on its timeline';

  /**
   * The fallback evidence of a refused size change: the build failure, no
   * result of a native command, and a frame-driven route of `target` with
   * models on the declared timeline at their read times. An off-curve model
   * fails the same check.
   */
  function expectSizeFallback(played: Played, target: string) {
    const events = played.events.filter(
      ({ event }) => event !== 'FrameUpdateMounted'
    );
    expect(summarizeStart(events)).toBe('LayoutBuildFailed:UnsupportedTarget');
    expect(summarizeResults(events)).toBe('');
    const refusal = firstEventOf(events, 'LayoutBuildFailed');
    const valueAt = declaredTargetOf(played, target);
    const isOnTimeline = (model: number[], readMs: Band) =>
      isOnFrameDriverTimeline(valueAt, refusal.monotonicTimeMs, model, readMs);
    const reads = nativeReadsOf(played, target);
    const moving = reads.filter(
      ({ sample: { model, monotonicTimeMs } }, index) =>
        monotonicTimeMs > refusal.monotonicTimeMs &&
        index > 0 &&
        reads[index - 1].sample.model.join() !== model.join()
    );
    const picked = [0.25, 0.5, 0.75]
      .map((part) => moving[Math.floor(part * moving.length)])
      .filter(
        (read, index, all) =>
          read !== undefined &&
          all.findIndex(
            (other) => other?.sample.model.join() === read.sample.model.join()
          ) === index
      );
    console.log(
      'RuntimeTestsSizeFallback ' +
        JSON.stringify({
          target,
          picked: picked.map(({ sample: { model }, readMs }) => ({
            model,
            fromRefusalMs: {
              from: readMs.from - refusal.monotonicTimeMs,
              to: readMs.to - refusal.monotonicTimeMs,
            },
          })),
        })
    );
    const route = routeOf(
      events,
      refusal.tag,
      target,
      picked.map(({ sample, readMs }) => ({ ...sample, readMs })),
      ({ model, readMs }) => isOnTimeline(model, readMs)
    );
    expect(route.kind).toBe('frame-driven');
    expect(isOnTimeline([valueAt(Infinity)], picked[0].readMs)).toBe(false);
    for (const { row } of played.rows) {
      expect(row.native[target].playbacks.length).toBe(0);
    }
  }

  const linearCases: [string, Place, string][] = [
    ['a position change', MOVED, 'PositionX'],
    ['a position change and a size change', MOVED_AND_RESIZED, 'PositionX'],
    ['a size change', RESIZED, 'Width'],
  ];
  for (const [caseName, end, routeTarget] of linearCases) {
    const changesSize =
      end.width !== START.width || end.height !== START.height;
    const isNative = PLAYS_SIZE_CHANGE || !changesSize;
    const linearTest = isNative ? movingGeometryTest : test;
    linearTest(
      `LinearTransition with a linear easing ${isNative ? `plays ${caseName} on four native tracks, and the native values and the frames of the frame driver are on its timeline` : `with ${caseName} ${SIZE_FALLBACK_NAME}`}`,
      async () => {
        const referenceCase = sizeCaseOf(LINEAR, START, end);
        const played = await playCase(
          caseName,
          changesSize ? sizeChangeOf(referenceCase) : referenceCase
        );
        if (!isNative) {
          expectSizeFallback(played, routeTarget);
          await render(null);
          return;
        }
        expect(summarizeStart(played.events)).toBe(FOUR_TRACKS);
        expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
        await render(null);
      }
    );
  }
});

// The extremes of the lag of the frame driver from the refusal that iOS measured, in whole display frames.
// Android: not measured.
const FRAME_DRIVER_EARLY_MS = 2 * FRAME_MS;
const FRAME_DRIVER_LATE_MS = 5 * FRAME_MS;

/**
 * The declared value of `target` of the native box at a time from the start of
 * its timelines. A position target is the centre of the box.
 */
function declaredTargetOf({ endKeys }: Played, target: string) {
  const valueOfKey = ({ leaf, from, to, base }: DeclaredKey) =>
    declaredValueOf(declaredTimelineOf(leaf, from, to, base));
  const scalarKey = endKeys.find(
    (key): key is ScalarKey =>
      key.operation === undefined && key.target === target
  );
  if (!scalarKey) {
    throw new Error(`The case declares no key of the target ${target}.`);
  }
  const valueAt = valueOfKey(scalarKey);
  const { size } = scalarKey;
  if (!size) {
    return valueAt;
  }
  const sizeKey = endKeys.find(({ key }) => key === size.key);
  const sizeAt = sizeKey ? valueOfKey(sizeKey) : () => size.rest;
  return (timeMs: number) => layerPositionOf(valueAt(timeMs), sizeAt(timeMs));
}

type NativeRead = { sample: TargetSample; readMs: Band };

/**
 * Each sample of `target` of the native box after the first row, with the
 * interval of its read on the sample clock: a row starts its reads after the
 * last read of the row before it ends, and the host stamps a sample after its
 * read (`NativeAnimationHost::sampleTarget`).
 */
const nativeReadsOf = ({ rows }: Played, target: string): NativeRead[] =>
  rows.slice(1).map(({ row }, index) => ({
    sample: row.native[target],
    readMs: {
      from: Math.max(
        ...Object.values(rows[index].row).flatMap((samples) =>
          Object.values(samples).map(({ monotonicTimeMs }) => monotonicTimeMs)
        )
      ),
      to: row.native[target].monotonicTimeMs,
    },
  }));

/**
 * A model of a read in `readMs` is within `POSITION_TOLERANCE` of a declared
 * value of the frame driver, from `FRAME_DRIVER_LATE_MS` before the read to
 * `FRAME_DRIVER_EARLY_MS` after it, on the timeline from the refusal.
 */
function isOnFrameDriverTimeline(
  valueAt: (timeMs: number) => number,
  refusalMs: number,
  [value]: number[],
  readMs: Band
) {
  const fromMs = readMs.from - refusalMs - FRAME_DRIVER_LATE_MS;
  const toMs = readMs.to - refusalMs + FRAME_DRIVER_EARLY_MS;
  const declared = [toMs];
  for (let timeMs = fromMs; timeMs < toMs; timeMs += DECLARED_STEP_MS) {
    declared.push(timeMs);
  }
  const values = declared.map(valueAt);
  return (
    value >= Math.min(...values) - POSITION_TOLERANCE &&
    value <= Math.max(...values) + POSITION_TOLERANCE
  );
}

const DECLARED_STEP_MS = 1;
