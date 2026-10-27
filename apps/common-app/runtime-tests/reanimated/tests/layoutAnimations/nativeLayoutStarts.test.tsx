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
import React from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import type {
  EasingFunction,
  LayoutAnimationFunction,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  LinearTransition,
  makeMutable,
  ReduceMotion,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
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
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import {
  hasNativeCSSTransitions,
  NATIVE_ANIMATION_ROUTES,
} from '../nativeAnimationObservation';
import type { DrawnSample, GeometryProperty } from '../viewSampler';
import {
  drawnPointOf,
  failNextViewLookup,
  isViewSamplerAvailable,
  postsAnimatorEnd,
  recordDrawnValues,
  takeViewLookupFailure,
  uptimeMs,
  valueCountOf,
} from '../viewSampler';
import {
  CURVE_CASES,
  curveLeavesOf,
  HELD_SIZE_CASES,
  HOLD_AFTER_TRACK_CASES,
  MOVED_AND_RESIZED,
  PAIR_END,
  PAIR_START,
  SIZE_DURATION,
  SIZE_START,
  WIDE,
} from './nativeLayoutLiveClockCases';
import type {
  CallbackBuilder,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import {
  expectReference,
  expectSteadySides,
  play,
} from './nativeLayoutReferencePlay';
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
  SizeBoxProps,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  hasNativeLayoutRoute,
  isNativeLayoutRouteConfigured,
  PLAYS_3D_OPERATIONS,
  PLAYS_MOVING_GEOMETRY,
  movingGeometryTest,
  testOfTracks,
  declaresMotion,
  PLAYS_SIZE_CHANGE,
  ONE_PIXEL,
  REFUSES_OPACITY_UNDER_FILTER,
  TRANSFORM_SAMPLE_CELLS,
  WRITES_ANIMATION_MATRIX,
  endCellsOf,
  cellsOf,
  declaredTimelineOf,
  declaredValueOf,
  layerPositionOf,
  FRAME_BOX_REF,
  narrowClockOffset,
  nativeOriginOf,
  callbackOf,
  curveOf,
  DEFAULT_EASING,
  LAYOUT_DURATION,
  layoutBuilderCalls,
  recordBuilderCall,
  isOfCommand,
  routeOf,
  SizePair,
  BOX_REF,
  BOX_SIZE,
  START_LEFT,
  END_LEFT,
  END_TOP,
  DURATION,
  LAID_OUT_TOLERANCE,
  MOUNTS_IN_DISPATCHES,
  POSITION_TOLERANCE,
  FILTER_OPACITY,
  REPEATED_STARTS,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  PRESENTATION_STAY_MS,
  ORDER_B_WRITE_DRAW_DELAY_MS,
  centerOf,
  curveBandOf,
  declaredBandOf,
  drawnBandOf,
  frameTimesOf,
  middleOf,
  takeTrace,
  takeTraceOf,
  takeTraceUntil,
  isHostEvent,
  isClientReport,
  sample,
  SIZE_CELL_HEIGHT,
  playbackCountOf,
  takeTraceUntilSurfaceClosed,
  summarize,
  callbacks,
  builderCalls,
  waitForBuilderCalls,
  waitForCallbacks,
  layoutOf,
  endTransformOf,
  MALFORMED_BEZIER,
  Box,
  Scene,
  ROW_REFS,
  LONG_MOVE,
  Row,
  ModalScene,
  SECOND_BOX_REF,
  SECOND_CSS_BOX_REF,
  setSecondSurfaceBox,
  setSecondSurfaceOpacity,
  SecondSurfaceScene,
  renderBox,
  mountScene,
  pairLayoutsOf,
  NATIVE_START,
  NATIVE_END,
  SORTED_START_AND_END,
  summarizeEnd,
  PAIR_DURATION,
  PAIR_LEFT,
  PAIR_TOP,
  Pair,
  styles,
  SizeScene,
  sampleFrame,
} from './nativeLayoutTestKit';
import { describeThrownMountItem } from './nativeLayoutThrownMountItem';

const AT_START: Place = { left: START_LEFT, top: 0 };
const AT_END: Place = { left: END_LEFT, top: 0 };
const REST_TOLERANCE = 0.01;
const SAME_ORIGIN_TOLERANCE = 1e-3;
const ORIGIN_BRACKET = 0.25;
const BRACKET_ATTEMPTS = 5;
const ORIGIN_FAULTS = 5;
/**
 * Two renders with no wait between them can come in one pull on Android. The
 * cases with one frame between them expect one pull for each render.
 */
const RENDER_GAPS = [
  {
    twoStartsName: 'with no wait between them',
    removalName: 'right after',
    waitForGap: async () => {},
    mayShareAPull: true,
  },
  {
    twoStartsName: 'one frame apart',
    removalName: 'one frame after',
    waitForGap: () => waitForFrames(1),
    mayShareAPull: false,
  },
];
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

/**
 * The two commits came in one pull: the mounting coordinator keeps only the
 * newest revision for the next pull, so the client has one command.
 */
const isOnePull = (reports: TraceEvent[]) =>
  reports.filter(({ event }) => event === 'ClientAdmitted').length === 1;

/**
 * The trace to the pending start of the view: on Android the pull of a commit
 * can come after its render resolves.
 */
const pendingStartOf = (tag: number) =>
  takeTraceUntil((events) =>
    events.some(
      (event) => event.tag === tag && event.event === 'LayoutStartPending'
    )
  );

/** Each command that the trace starts has one result. */
function expectOneResultForEachCommand(events: TraceEvent[]) {
  const commands = new Set(
    events
      .filter(({ event }) => event === 'LayoutStartPending')
      .map(({ generation }) => generation)
  );
  for (const generation of commands) {
    expect(
      events.filter(
        (event) => event.event === 'Ended' && event.generation === generation
      ).length
    ).toBe(1);
  }
}

type CancelBox = { left: number; layout: LayoutAnimationFunction };

let setCancelBox: (box: CancelBox) => void = () => {};

/** The box whose left and layout change by `setCancelBox`, with no `render`. */
function CancelScene({ initial }: { initial: CancelBox }) {
  const [box, setBox] = React.useState(initial);
  setCancelBox = setBox;
  return <Scene left={box.left} layout={box.layout} />;
}

/**
 * The place of the cancel build in the trace order: before or after the
 * admission of the first command of the view.
 */
function cancelPlaceOf(events: TraceEvent[]) {
  const pending = firstEventOf(events, 'LayoutStartPending');
  const cancel = events.find(
    ({ event, sequence }) =>
      sequence > pending.sequence &&
      (event === 'LayoutBuildFailed' || event === 'LayoutLeafCaptured')
  );
  if (!cancel) {
    return `no cancel build after the start: ${summarize(events)}`;
  }
  const admitted = events.find(
    (event) => event.event === 'Admitted' && isOfCommand(event, pending)
  );
  return admitted !== undefined && admitted.sequence < cancel.sequence
    ? 'after the start'
    : 'before the start';
}

const MOVES: Partial<Record<Key, Leaf>> = { originX: {}, originY: {} };
const THREE_D_KINDS = ['rotateX', 'rotateY', 'perspective'];

/** Android refuses each moving geometry track below API 29. */
const BELOW_API_29_REFUSALS: FrameDrivenBuild[] = [
  ['a moving position below API 29', MOVES, 'UnsupportedTarget'],
  [
    'a moving position with no duration below API 29',
    { originX: { duration: 0 }, originY: { duration: 0 } },
    'UnsupportedTarget',
  ],
  [
    'a moving transform below API 29',
    {},
    'UnsupportedTarget',
    ...transformCase([TURN]),
  ],
];

/**
 * The fallback forms of the describes of this suite that need a moving native
 * geometry track. The reference cases of these describes (`CURVE_CASES`,
 * `HELD_SIZE_CASES`, `HOLD_AFTER_TRACK_CASES`) have their fallback forms in
 * `native layout reference below API 29`. The describes of a late start and of
 * the animation matrix have no form: a frame-driven start has no native
 * timeline to be late on and no animation matrix.
 */
describe('native layout starts below API 29', () => {
  if (!hasNativeLayoutRoute || PLAYS_MOVING_GEOMETRY) {
    return;
  }

  for (const build of BELOW_API_29_REFUSALS) {
    test(`${build[0]} keeps the whole animation frame-driven: ${build[2]}`, async () => {
      await expectWholeAnimationFrameDriven(...build);
    });
  }

  test('the builder of each of 20 views runs one time, and each start is refused: UnsupportedTarget', async () => {
    const count = 20;
    await render(<Row left={START_LEFT} count={count} />);
    await wait(50);
    const tags = ROW_REFS.slice(0, count).map((refName) =>
      getTestComponent(refName).getTag()
    );
    await takeTrace();
    const callsBefore = builderCalls;
    await render(<Row left={END_LEFT} count={count} />);
    expect(await waitForBuilderCalls(callsBefore + count)).toBe('');
    const events = await takeTraceUntil(
      (taken) =>
        taken.filter(({ event }) => event === 'LayoutBuildFailed').length >=
        count,
      3 * LAYOUT_DURATION
    );
    expect(builderCalls - callsBefore).toBe(count);
    for (const tag of tags) {
      expect(summarize(routeEventsOf(events, tag))).toBe(
        'LayoutBuildFailed:UnsupportedTarget'
      );
    }
    await render(null);
  });

  test('the removal of the view during its frame-driven move gives the callback false one time and starts nothing native', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'removed' });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 4);
    await render(<Scene left={END_LEFT} layout={layout} isMounted={false} />);
    await wait(DURATION);
    expect(summarize(routeEventsOf(await takeTraceOf(tag), tag))).toBe(
      'LayoutBuildFailed:UnsupportedTarget'
    );
    expect(callbacks.join()).toBe('removed:false');
    await render(null);
  });

  if (!getStaticFeatureFlag('USE_ANIMATION_BACKEND')) {
    test('a commit inside the callback of a frame-driven move starts a frame-driven move of the other view: UnsupportedTarget', async () => {
      await render(
        <ReentryScene left={START_LEFT} followerLayout={FOLLOWER_LAYOUT} />
      );
      await wait(50);
      const leaderTag = getTestComponent(BOX_REF).getTag();
      const followerTag = getTestComponent(FOLLOWER_REF).getTag();
      await takeTrace();
      await render(
        <ReentryScene left={END_LEFT} followerLayout={FOLLOWER_LAYOUT} />
      );
      await wait(DURATION * 1.5);
      const events = await takeTrace();
      for (const tag of [leaderTag, followerTag]) {
        expect(summarize(routeEventsOf(events, tag))).toBe(
          'LayoutBuildFailed:UnsupportedTarget'
        );
      }
      await wait(3 * DURATION);
      await render(null);
    });
  }

  if (isSecondSurfaceAvailable()) {
    test('each surface keeps the start of its view frame-driven: UnsupportedTarget', async () => {
      const tag = await renderBox();
      const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
      const secondTag = getTestComponent(SECOND_BOX_REF).getTag();
      await render(<Scene left={END_LEFT} />);
      setSecondSurfaceBox({ left: END_LEFT });
      await wait(DURATION * 5);
      const events = await takeTrace();
      for (const viewTag of [tag, secondTag]) {
        expect(summarize(routeEventsOf(events, viewTag))).toBe(
          'LayoutBuildFailed:UnsupportedTarget'
        );
      }
      expect(routeEventsOf(events, secondTag)[0].surfaceId).toBe(
        secondSurfaceId
      );
      const { model } = await sample(tag, 'PositionX');
      expect(Math.abs(model[0] - centerOf(END_LEFT)) < POSITION_TOLERANCE).toBe(
        true
      );
      await stopSecondSurface(secondSurfaceId);
      await render(null);
    });
  }
});

/** The events of the view that show its route: build failures and starts. */
const routeEventsOf = (events: TraceEvent[], tag: number) =>
  events.filter(
    (event) =>
      event.tag === tag &&
      (event.event === 'LayoutBuildFailed' ||
        event.event === 'LayoutStartPending' ||
        event.event === 'LayoutStartRefused' ||
        event.event === 'Admitted')
  );

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

  movingGeometryTest(
    'the builder runs one time and its callback gets true one time',
    async () => {
      const layout = layoutOf({ originX: {}, originY: {} }, { name: 'native' });
      await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);
      expect(builderCalls).toBe(1);
      expect(callbacks.length).toBe(0);
      await wait(DURATION);
      expect(callbacks.join()).toBe('native:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'the builder of each of 20 views on the native route runs one time, and each command ends one time',
    async () => {
      const count = 20;
      await render(<Row left={START_LEFT} count={count} />);
      await wait(50);
      const tags = ROW_REFS.slice(0, count).map((refName) =>
        getTestComponent(refName).getTag()
      );
      await takeTrace();
      const callsBefore = builderCalls;
      await render(<Row left={END_LEFT} count={count} />);
      expect(await waitForBuilderCalls(callsBefore + count)).toBe('');
      const events = await takeTraceUntil(
        (taken) =>
          taken.filter(({ event }) => event === 'Ended').length >= count,
        3 * LAYOUT_DURATION
      );
      expect(builderCalls - callsBefore).toBe(count);
      for (const tag of tags) {
        const ofTag = events.filter((event) => event.tag === tag);
        expect(summarize(ofTag.filter(({ event }) => event === 'Ended'))).toBe(
          'Ended:Finished:None'
        );
        expect(ofTag.some(({ event }) => event === 'Admitted')).toBe(true);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'the builder of an unsupported input runs one time and its callback gets true one time',
    async () => {
      const layout = layoutOf(
        { originX: { isFrameDrivenSpring: true } },
        { name: 'spring' }
      );
      await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      expect(await waitForCallbacks(['spring:true'])).toBe('');
      await wait(DURATION);
      expect(builderCalls).toBe(1);
      expect(callbacks.join()).toBe('spring:true');
      await render(null);
    }
  );

  if (isViewSamplerAvailable()) {
    movingGeometryTest(
      'the builder of a start that resolve refuses runs one time and its callback gets false one time',
      async () => {
        const layout = layoutOf(MOVES, { name: 'refused' });
        const tag = await renderBox({ layout });
        await failNextViewLookup(tag);
        await render(<Scene left={END_LEFT} layout={layout} />);
        await waitForCallbacks(1);
        await wait(DURATION * 1.5);
        const events = (await takeTraceOf(tag)).filter(isHostEvent);
        const failure = await takeViewLookupFailure();
        console.log(
          'RuntimeTestsResolveRefusalBuilds ' +
            JSON.stringify({
              trace: summarize(events),
              failure,
              callbacks,
              builderCalls,
            })
        );
        expect(failure !== null).toBe(true);
        expect(summarize(events.filter(({ event }) => event === 'Ended'))).toBe(
          'Ended:Rejected:TargetUnavailable'
        );
        expect(builderCalls).toBe(1);
        expect(callbacks.join()).toBe('refused:false');
        await render(null);
      }
    );

    movingGeometryTest(
      'a missing view at resolve rejects before claim replacement, and the older live track stays',
      async () => {
        const layout = layoutOf(
          {
            originX: { duration: 4 * DURATION, onlyWhenChanged: true },
            originY: { duration: 4 * DURATION, onlyWhenChanged: true },
          },
          { name: 'older' }
        );
        const tag = await renderBox({ layout });
        await render(<Scene left={END_LEFT} layout={layout} />);
        await wait(DURATION / 4);
        const older = firstEventOf(await takeTraceOf(tag), 'Admitted');
        await failNextViewLookup(tag);
        await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
        await wait(DURATION / 2);
        const events = (await takeTraceOf(tag)).filter(isHostEvent);
        const failure = await takeViewLookupFailure();
        const later = events.filter(
          ({ generation }) => generation !== older.generation
        );
        console.log(
          'RuntimeTestsViewLookupFailure ' +
            JSON.stringify({
              trace: summarize(events),
              generations: events.map(({ generation }) => generation),
              olderGeneration: older.generation,
              failure,
              callbacks,
            })
        );
        expect(
          summarize(
            later.filter(({ event }) =>
              ['LayoutStartPending', 'Received', 'Ended'].includes(event)
            )
          )
        ).toBe(
          'LayoutStartPending > Received > Ended:Rejected:TargetUnavailable'
        );
        expect(
          (failure ?? []).some(
            ([, keyTag, , generation]) =>
              keyTag === tag && generation === older.generation
          )
        ).toBe(true);
        await wait(4 * DURATION);
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a config change during playback has an effect only on the next start',
    async () => {
      const slow = layoutOf(
        { originX: { duration: 2 * DURATION }, originY: {} },
        { name: 'slow' }
      );
      const fast = layoutOf(
        { originX: { duration: DURATION / 2 }, originY: {} },
        { name: 'fast' }
      );
      const tag = await renderBox({ layout: slow });
      await render(<Scene left={END_LEFT} layout={slow} />);
      await wait(DURATION / 2);
      await takeTraceOf(tag);

      await render(<Scene left={END_LEFT} layout={fast} />);
      await wait(DURATION);
      expect((await takeTraceOf(tag)).filter(isHostEvent).length).toBe(1);
      expect(callbacks.length).toBe(0);
      await wait(DURATION);
      expect(callbacks.join()).toBe('slow:true');

      await render(<Scene left={START_LEFT} layout={fast} />);
      await wait(DURATION * 1.5);
      expect(callbacks.join()).toBe('slow:true,fast:true');
      await render(null);
    }
  );

  const supportedEasings: [string, Leaf['easing']][] = [
    ['Easing.ease', Easing.ease],
    ['Easing.in(Easing.ease)', Easing.in(Easing.ease)],
    ['Easing.bezier', Easing.bezier(0.25, 0.1, 0.25, 1)],
    // The value that this test reads stays in the range of the start value and the end value; the value on
    // screen does not.
    [
      'Easing.bezier that leaves the unit range',
      Easing.bezier(0.3, -0.4, 0.7, 1.6),
    ],
  ];
  for (const [easingName, easing] of supportedEasings) {
    movingGeometryTest(`${easingName} plays natively`, async () => {
      const { events } = await playCase(easingName, {
        flow: 'layout',
        leaves: { originX: { easing }, originY: { easing } },
        places: [AT_START, AT_END],
        totalMs: DURATION,
      });
      expect(summarizeEnd(events)).toBe(SORTED_START_AND_END);
      await render(null);
    });
  }

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
      ...transformCase([
        TURN,
        ['translateX', 0, 10, { isFrameDrivenSpring: true }],
      ]),
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
      { originX: {}, originY: { isFrameDrivenSpring: true } },
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

  for (const [caseName, leaves, targets, options, box] of nativeBuilds.filter(
    isNativeBuild
  )) {
    movingGeometryTest(
      `${caseName} plays natively: ${targets.join(', ')}`,
      async () => {
        const layout = layoutOf(leaves, { ...options, name: 'native' });
        const tag = await renderBox({ layout, ...box });
        await render(<Scene left={END_LEFT} layout={layout} {...box} />);
        await wait(DURATION * 1.5);

        const events = (await takeTraceOf(tag)).filter(isHostEvent);
        expect(summarize(events.slice(0, 4 + targets.length))).toBe(
          `LayoutStartPending > LayoutStartMounted > Received > ${targets
            .map((target) => `TrackStarted:${target}`)
            .join(' > ')} > Admitted`
        );
        expect(summarize(events.slice(-1))).toBe('Ended:Finished:None');
        expect(callbacks.join()).toBe('native:true');
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'position leaves play natively on a view whose size changes in the commit',
    async () => {
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} width={2 * BOX_SIZE} />);
      await wait(DURATION / 2);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        NATIVE_START
      );
      const { model, presentation } = await sampleFrame(tag);
      expect(model.width).toBe(2 * BOX_SIZE);
      expect(presentation.width).toBe(2 * BOX_SIZE);
      expect(presentation.x > START_LEFT).toBe(true);
      expect(presentation.x < END_LEFT).toBe(true);
      await wait(DURATION);
      expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
      await render(null);
    }
  );

  movingGeometryTest(
    'each negative delay wrapper counts as zero before the sum',
    async () => {
      const layout = layoutOf({
        originX: { delays: [-DURATION, DURATION] },
        originY: {},
      });
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);
      const { presentation } = await sample(tag, 'PositionX');
      expect(
        Math.abs(presentation[0] - centerOf(START_LEFT)) < POSITION_TOLERANCE
      ).toBe(true);

      await wait(DURATION);
      const moving = await sample(tag, 'PositionX');
      expect(moving.presentation[0] > centerOf(START_LEFT)).toBe(true);
      expect(moving.presentation[0] < centerOf(END_LEFT)).toBe(true);
      await wait(DURATION);
      await render(null);
    }
  );

  movingGeometryTest(
    'the start value stays on screen through the delay',
    async () => {
      const layout = layoutOf({ originX: { delays: [DURATION] }, originY: {} });
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);

      const { model, presentation } = await sample(tag, 'PositionX');
      expect(
        Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(
        Math.abs(presentation[0] - centerOf(START_LEFT)) < POSITION_TOLERANCE
      ).toBe(true);
      await wait(DURATION * 2);
      await render(null);
    }
  );

  movingGeometryTest(
    'an explicit initial value is the start value',
    async () => {
      const layout = layoutOf({
        originX: { initial: -30, duration: 4 * DURATION },
        originY: {},
      });
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);
      const pending = (await takeTraceOf(tag))[0];
      const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
      const progress =
        (monotonicTimeMs - pending.monotonicTimeMs) / (4 * DURATION);
      const startX = centerOf(START_LEFT - 30);
      const expectedX = startX + progress * (centerOf(END_LEFT) - startX);
      expect(Math.abs(presentation[0] - expectedX) < FIRST_FRAME_TRAVEL).toBe(
        true
      );
      await render(null);
    }
  );

  movingGeometryTest('one command plays position and opacity', async () => {
    const layout = layoutOf({
      originX: {},
      originY: {},
      opacity: { initial: 1, to: 0.2 },
    });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} opacity={0.2} layout={layout} />);
    await wait(DURATION / 2);

    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:PositionY > TrackStarted:Opacity > Admitted'
    );
    const opacity = await sample(tag, 'Opacity');
    expect(Math.abs(opacity.model[0] - 0.2) < 0.01).toBe(true);
    expect(opacity.presentation[0] > 0.2).toBe(true);
    expect(opacity.presentation[0] < 1).toBe(true);

    await wait(DURATION);
    const endEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(
      endEvents
        .filter((event) => event.event === 'TrackEnded' && event.finished)
        .map((event) => event.target)
        .sort()
        .join()
    ).toBe('Opacity,PositionX,PositionY');
    expect(summarize(endEvents.slice(3))).toBe('Ended:Finished:None');
    await render(null);
  });

  movingGeometryTest(
    'a long constant leaf holds the callback after a short moving leaf ends',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: DURATION / 2 },
          opacity: { initial: 1, to: 1, duration: 2 * DURATION },
        },
        { name: 'constant' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:Opacity > Admitted > TrackEnded:PositionX:true'
      );
      expect(callbacks.length).toBe(0);
      await wait(DURATION * 1.5);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        'TrackEnded:Opacity:true > Ended:Finished:None'
      );
      expect(callbacks.join()).toBe('constant:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a second native start replaces the X track from its value at the pull and keeps the Y track',
    async () => {
      const { events, tracks, rows } = await playCase('a second native start', {
        flow: 'layout',
        leaves: { originX: {}, originY: {} },
        places: [AT_START, AT_END, { ...AT_END, left: 2 * END_LEFT }],
        commitTimesMs: [DURATION / 2],
        totalMs: DURATION,
      });
      const hostEvents = events.filter(isHostEvent);
      expect(summarize(hostEvents)).toBe(
        `${NATIVE_START} > LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionX:false > Ended:Interrupted:None > TrackStarted:PositionX > Admitted > TrackEnded:PositionY:true > TrackEnded:PositionX:true > Ended:Finished:None`
      );
      const [, firstY, secondX] = tracks;
      expect(hostEvents[10].generation).toBe(firstY.generation);
      expect(secondX.generation > firstY.generation).toBe(true);
      // The Y leaf has the same end value and timing, so its track stays.
      const beforeTheEndOfY = rows
        .map(({ row }) => row.native.PositionX)
        .filter(
          ({ monotonicTimeMs }) =>
            monotonicTimeMs >= secondX.played.from + PRESENTATION_STAY_MS &&
            monotonicTimeMs < middleOf(firstY.origin) + DURATION - FRAME_MS
        );
      for (const read of beforeTheEndOfY) {
        expect(read.playbacks.length).toBe(2);
        expect(playbackCountOf(read, secondX.generation)).toBe(1);
        expect(playbackCountOf(read, firstY.generation)).toBe(1);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a short new Y keeps the long X: one false, then true after X ends',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: 3 * DURATION, onlyWhenChanged: true },
          originY: { onlyWhenChanged: true },
        },
        { name: 'group' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
      await wait(DURATION / 4);
      const firstGeneration = (await takeTraceOf(tag))[0].generation;

      await render(<Scene left={END_LEFT} top={0} layout={layout} />);
      await wait(DURATION * 1.5);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(events)).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionY:false > Ended:Interrupted:None > TrackStarted:PositionY > Admitted > TrackEnded:PositionY:true > Ended:Finished:None'
      );
      expect(events[3].generation).toBe(firstGeneration);
      expect(events[7].generation > firstGeneration).toBe(true);
      expect(callbacks.join()).toBe('group:false');
      const x = await sample(tag, 'PositionX');
      expect(x.playbacks.length).toBe(1);
      expect(playbackCountOf(x, firstGeneration)).toBe(1);
      expect(x.presentation[0] < centerOf(END_LEFT)).toBe(true);

      await wait(2 * DURATION);
      const lateEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(lateEvents)).toBe('TrackEnded:PositionX:true');
      expect(lateEvents[0].generation).toBe(firstGeneration);
      expect(callbacks.join()).toBe('group:false,group:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'the long X stays through two replacements of Y and its first frame-driven update names its command',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: 4 * DURATION, onlyWhenChanged: true },
          originY: { onlyWhenChanged: true },
        },
        { name: 'twice' }
      );
      const spring = layoutOf({ originX: { isFrameDrivenSpring: true } });
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
      await wait(DURATION / 4);
      const firstGeneration = (await takeTraceOf(tag))[0].generation;
      await render(<Scene left={END_LEFT} top={0} layout={layout} />);
      await wait(DURATION / 4);
      await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
      await wait(DURATION * 1.5);
      expect(callbacks.join()).toBe('twice:false,twice:false');
      const x = await sample(tag, 'PositionX');
      expect(x.presentation[0] < centerOf(END_LEFT)).toBe(true);
      await takeTraceOf(tag);

      await wait(3 * DURATION);
      const xEnd = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(xEnd)).toBe('TrackEnded:PositionX:true');
      expect(xEnd[0].generation).toBe(firstGeneration);
      expect(callbacks.join()).toBe('twice:false,twice:false,twice:true');

      await render(<Scene left={END_LEFT} top={END_TOP} layout={spring} />);
      await render(<Scene left={START_LEFT} top={END_TOP} layout={spring} />);
      await wait(DURATION);
      const frameUpdates = (await takeTraceOf(tag)).filter(
        (event) => event.event === 'FrameUpdateMounted'
      );
      expect(summarize(frameUpdates)).toBe('FrameUpdateMounted:PositionX');
      expect(frameUpdates[0].generation).toBe(firstGeneration);
      await render(null);
    }
  );

  for (const { twoStartsName, waitForGap, mayShareAPull } of RENDER_GAPS) {
    movingGeometryTest(
      `the client gets the reports of two starts ${twoStartsName} in admission order`,
      async () => {
        const tag = await renderBox();
        await render(<Scene left={END_LEFT} />);
        await waitForGap();
        await render(<Scene left={2 * END_LEFT} />);
        await wait(DURATION * 1.5);

        const reports = (await takeTraceOf(tag)).filter(isClientReport);
        if (mayShareAPull && MOUNTS_IN_DISPATCHES && isOnePull(reports)) {
          console.log(`RuntimeTestsTwoStarts one pull: ${summarize(reports)}`);
          expect(summarize(reports)).toBe(
            'ClientAdmitted > ClientEnded:Finished:None'
          );
          await render(null);
          return;
        }
        expect(summarize(reports)).toBe(
          'ClientAdmitted > ClientEnded:Interrupted:None > ClientAdmitted > ClientEnded:Finished:None'
        );
        expect(reports[1].generation).toBe(reports[0].generation);
        expect(reports[2].generation > reports[0].generation).toBe(true);
        expect(reports[3].generation).toBe(reports[2].generation);
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'the removal of the view cancels each track and gives the callback false one time',
    async () => {
      const layout = layoutOf(
        { originX: {}, originY: {} },
        { name: 'removed' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 4);
      await takeTraceOf(tag);

      await render(<Scene left={END_LEFT} layout={layout} isMounted={false} />);
      await wait(DURATION);
      const ends = (await takeTraceOf(tag)).filter(
        (event) => event.event === 'Ended'
      );
      expect(ends.length).toBe(1);
      expect(callbacks.join()).toBe('removed:false');
      await render(null);
    }
  );

  for (const { removalName, waitForGap, mayShareAPull } of RENDER_GAPS) {
    movingGeometryTest(
      `the removal of the view ${removalName} its start ends the command one time`,
      async () => {
        const layout = layoutOf(
          { originX: {}, originY: {} },
          { name: 'removed' }
        );
        const tag = await renderBox({ layout });
        await render(<Scene left={END_LEFT} layout={layout} />);
        await waitForGap();
        await render(
          <Scene left={END_LEFT} layout={layout} isMounted={false} />
        );
        await wait(DURATION);
        const events = await takeTraceOf(tag);
        if (
          mayShareAPull &&
          MOUNTS_IN_DISPATCHES &&
          !events.some(({ event }) => event === 'LayoutStartPending')
        ) {
          console.log(
            `RuntimeTestsRemovalAfterStart one pull with the removal: ${JSON.stringify({ trace: summarize(events), callbacks })}`
          );
          expect(callbacks.join()).toBe('');
          await render(null);
          return;
        }
        const ends = events.filter((event) => event.event === 'Ended');
        expect(ends.length).toBe(1);
        expect(callbacks.join()).toBe('removed:false');
        await render(null);
      }
    );
  }

  const MOVE_LAYOUT = layoutOf(MOVES, { name: 'move' });
  const SPRING_LAYOUT = layoutOf(
    { originX: { isFrameDrivenSpring: true } },
    { name: 'spring' }
  );
  const MOVED_BOX: CancelBox = { left: END_LEFT, layout: MOVE_LAYOUT };
  const CANCEL_BOX: CancelBox = { left: START_LEFT, layout: SPRING_LAYOUT };

  movingGeometryTest(
    'two updates in a row cancel each other: no start and no callback',
    async () => {
      const tag = await mountScene(
        <CancelScene initial={{ left: START_LEFT, layout: MOVE_LAYOUT }} />
      );
      setCancelBox(MOVED_BOX);
      setCancelBox(CANCEL_BOX);
      await wait(DURATION);
      const events = await takeTraceOf(tag);
      console.log(
        `RuntimeTestsCancel no mount of the move: ${JSON.stringify({ trace: summarize(events), callbacks })}`
      );
      expect(summarize(events)).toBe('');
      expect(callbacks.join()).toBe('');
      await render(null);
    }
  );

  movingGeometryTest('a cancel at 50 % ends the command one time', async () => {
    const tag = await mountScene(
      <CancelScene initial={{ left: START_LEFT, layout: MOVE_LAYOUT }} />
    );
    setCancelBox(MOVED_BOX);
    await wait(DURATION / 2);
    setCancelBox(CANCEL_BOX);
    const missingCallbacks = await waitForCallbacks([
      'move:false',
      'spring:true',
    ]);
    await wait(DURATION);
    const events = await takeTraceOf(tag);
    expect(missingCallbacks).toBe('');
    const measuredPlace = cancelPlaceOf(events);
    console.log(
      'RuntimeTestsCancel ' +
        JSON.stringify({
          timeName: 'at 50 %',
          place: measuredPlace,
          trace: summarize(events),
          callbacks,
        })
    );
    expect(
      measuredPlace === 'after the start'
        ? ''
        : `inconclusive: the cancel came ${measuredPlace}, not after the start`
    ).toBe('');
    expectOneResultForEachCommand(events);
    expect([...callbacks].sort().join()).toBe('move:false,spring:true');
    await render(null);
  });

  movingGeometryTest(
    'a replacement of one target at 40 % ends the replaced command one time and keeps the other target',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: 3 * DURATION, onlyWhenChanged: true },
          originY: { onlyWhenChanged: true },
        },
        { name: 'group' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
      await wait(0.4 * DURATION);
      const startEvents = await takeTraceOf(tag);
      const firstGeneration = firstEventOf(startEvents, 'Admitted').generation;

      await render(<Scene left={END_LEFT} top={0} layout={layout} />);
      expect(
        await waitForCallbacks(['group:false', 'group:true'], 4 * DURATION)
      ).toBe('');
      await wait(DURATION);
      const events = [...startEvents, ...(await takeTraceOf(tag))];
      expectOneResultForEachCommand(events);
      expect(
        summarize(
          events.filter(
            ({ event, generation }) =>
              event === 'TrackEnded' && generation === firstGeneration
          )
        )
      ).toBe('TrackEnded:PositionY:false > TrackEnded:PositionX:true');
      expect(callbacks.join()).toBe('group:false,group:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a later commit with no layout change keeps the playback and the endpoint',
    async () => {
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} />);
      await render(<Scene left={END_LEFT} opacity={0.5} />);
      await wait(DURATION / 2);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        NATIVE_START
      );
      const { model, presentation } = await sample(tag, 'PositionX');
      expect(
        Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(presentation[0] < centerOf(END_LEFT)).toBe(true);

      await wait(DURATION);
      expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
      await render(null);
    }
  );

  movingGeometryTest(
    'a frame-driven start during native playback takes the X track at the mount of its first update',
    async () => {
      const xDuration = 3 * DURATION;
      const { events, tracks, rows, captures } = await playCase(
        'a frame-driven start during native playback',
        {
          flow: 'layout',
          leaves: {
            originX: { duration: xDuration, onlyWhenChanged: true },
            originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
          },
          places: [AT_START, AT_END, { ...AT_END, top: END_TOP }],
          commitTimesMs: [DURATION],
          totalMs: xDuration,
        }
      );
      const takeOver = events.slice(
        events.findIndex(({ event }) => event === 'LayoutLeafCaptured')
      );
      expect(summarize(takeOver)).toBe(
        'LayoutLeafCaptured:PositionX > LayoutBuildFailed:UnsupportedTiming > FrameUpdateMounted:PositionX > TrackEnded:PositionX:false > Ended:Cancelled:None > ClientEnded:Cancelled:None'
      );
      // The capture, the build, and the first frame-driven X value are in one transaction.
      const [captured, failed, frameUpdate, trackEnd] = takeOver;
      expect(failed.transactionNumber).toBe(captured.transactionNumber);
      expect(frameUpdate.transactionNumber).toBe(captured.transactionNumber);
      for (const event of [captured, frameUpdate, trackEnd]) {
        expect(event.generation).toBe(tracks[0].generation);
      }
      expect(captures.length).toBe(1);

      for (const { row } of rows) {
        const { model, playbacks, monotonicTimeMs } = row.native.PositionX;
        // On Android a read can come before the mount of the start (`READ-UNCHECKED` rows before
        // `TrackStarted`); such a read has the model before the commit.
        if (
          monotonicTimeMs >= tracks[0].played.from &&
          monotonicTimeMs < captured.monotonicTimeMs
        ) {
          expect(
            Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
          ).toBe(true);
        }
        if (monotonicTimeMs >= trackEnd.monotonicTimeMs + FRAME_MS) {
          expect(playbacks.length).toBe(0);
        }
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'the first frame-driven update after a native command is identified at its mount',
    async () => {
      const spring = layoutOf({ originX: { isFrameDrivenSpring: true } });
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} />);
      await wait(DURATION * 1.5);
      const nativeGeneration = (await takeTraceOf(tag))[0].generation;

      await render(<Scene left={END_LEFT} layout={spring} />);
      await render(<Scene left={START_LEFT} layout={spring} />);
      await wait(DURATION);
      const events = (await takeTraceOf(tag)).filter(
        (event) => event.event === 'FrameUpdateMounted'
      );
      expect(summarize(events)).toBe('FrameUpdateMounted:PositionX');
      expect(events[0].generation).toBe(nativeGeneration);
      expect(events[0].transactionNumber !== undefined).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest(
    'each of many starts plays from the start value on the timeline of its pull',
    async () => {
      const tag = await renderBox();
      let left = START_LEFT;
      for (let run = 0; run < REPEATED_STARTS; run++) {
        const startCenter = centerOf(left);
        left = left === START_LEFT ? END_LEFT : START_LEFT;
        await render(<Scene left={left} />);
        await wait(DURATION / 4);
        const pending = (await takeTraceOf(tag)).find(
          (event) => event.event === 'LayoutStartPending'
        );
        const { presentation, monotonicTimeMs } = await sample(
          tag,
          'PositionX'
        );
        const progress =
          (monotonicTimeMs - pending!.monotonicTimeMs) / DURATION;
        const expectedX =
          startCenter + progress * (centerOf(left) - startCenter);
        expect(Math.abs(presentation[0] - expectedX) < FIRST_FRAME_TRAVEL).toBe(
          true
        );
        await wait(DURATION);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'all starts of one large mount use one time origin',
    async () => {
      const count = ROW_REFS.length;
      await render(<Row left={START_LEFT} count={count} />);
      await wait(50);
      const tags = ROW_REFS.map((refName) =>
        getTestComponent(refName).getTag()
      );
      await takeTrace();
      await render(<Row left={END_LEFT} count={count} />);
      await wait(DURATION);

      const events = await takeTrace();
      const mounted = events.filter(
        (event) => event.event === 'LayoutStartMounted'
      );
      expect(mounted.length).toBe(count);
      expect(
        new Set(mounted.map((event) => event.transactionNumber)).size
      ).toBe(1);
      expect(events.filter((event) => event.event === 'Admitted').length).toBe(
        count
      );
      // With one origin, each box shows the value that the first box shows at the same time.
      const [first, ...others] = tags;
      const faults: string[] = [];
      const widths: number[] = [];
      for (const [index, tag] of others.entries()) {
        const { low, shown, high } = await bracketedReadOf(first, tag);
        widths.push(high - low);
        if (high - low > ORIGIN_BRACKET) {
          faults.push(
            `read ${index + 1}: the first box moved ${high - low} pt`
          );
        } else if (
          shown < low - SAME_ORIGIN_TOLERANCE ||
          shown > high + SAME_ORIGIN_TOLERANCE
        ) {
          faults.push(`read ${index + 1}: ${shown} out of [${low}, ${high}]`);
        }
      }
      console.log(
        'RuntimeTestsOneOrigin ' +
          JSON.stringify({
            reads: widths.length,
            zeroWidths: widths.filter((width) => width === 0).length,
            widest: Math.max(...widths),
          })
      );
      expect(faults.slice(0, ORIGIN_FAULTS).join(', ')).toBe('');
      await wait(4 * DURATION);
      await render(null);
    }
  );

  movingGeometryTest('three starts give false, false, and true', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'chain' });
    const tag = await renderBox({ layout });
    const isAdmitted = ({ event, tag: eventTag }: TraceEvent) =>
      event === 'Admitted' && eventTag === tag;
    let starts = 0;
    for (const left of [END_LEFT, 2 * END_LEFT, START_LEFT]) {
      await render(<Scene left={left} layout={layout} />);
      starts++;
      expect(await waitForBuilderCalls(starts)).toBe('');
      const events = await takeTraceUntil((taken) => taken.some(isAdmitted));
      expect(events.filter(isAdmitted).length).toBe(1);
    }
    const expected = ['chain:false', 'chain:false', 'chain:true'];
    expect(await waitForCallbacks(expected)).toBe('');
    expect(callbacks.join()).toBe(expected.join());
    expect(builderCalls).toBe(3);
    await render(null);
  });

  // An API 36 animator can post the end listener of a natural end (`ValueAnimator.java:1306`, `:1322`).
  const NEAR_END_OFFSETS_MS = [-FRAME_MS, 0, FRAME_MS];
  movingGeometryTest(
    'a replacement at the natural end of a track gives one result for each command',
    async () => {
      const layout = layoutOf(MOVES, { name: 'end' });
      const tag = await renderBox({ layout });
      for (const offsetMs of NEAR_END_OFFSETS_MS) {
        callbacks.length = 0;
        const startedMs = performance.now();
        await render(<Scene left={END_LEFT} layout={layout} />);
        await wait(
          Math.max(0, startedMs + DURATION + offsetMs - performance.now())
        );
        await render(<Scene left={START_LEFT} layout={layout} />);
        const missing = await waitForCallbacks(2);
        await wait(DURATION);
        const events = await takeTraceOf(tag);
        console.log(
          'RuntimeTestsReplacementAtEnd ' +
            JSON.stringify({
              offsetMs,
              trace: summarize(events.filter(isHostEvent)),
              generations: events.map(({ generation }) => generation),
              callbacks,
            })
        );
        expect(missing).toBe('');
        expectOneResultForEachCommand(events);
        expect(callbacks.length).toBe(2);
        expect(callbacks[1]).toBe('end:true');
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'the removal of the view after a replacement stops the old and the new tracks',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: 3 * DURATION, onlyWhenChanged: true },
          originY: { duration: 3 * DURATION, onlyWhenChanged: true },
        },
        { name: 'adopted' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
      await wait(DURATION / 4);
      await render(<Scene left={END_LEFT} top={0} layout={layout} />);
      await wait(DURATION / 4);
      await takeTraceOf(tag);

      await render(<Scene left={END_LEFT} layout={layout} isMounted={false} />);
      await wait(DURATION / 2);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(
        events
          .filter((event) => event.event === 'TrackEnded')
          .map((event) => event.target)
          .sort()
          .join()
      ).toBe('PositionX,PositionY');
      expect(new Set(events.map((event) => event.generation)).size).toBe(2);
      expect(callbacks.join()).toBe('adopted:false,adopted:false');
      await render(null);
    }
  );

  movingGeometryTest(
    'a start during a frame-driven animation of the view stays frame-driven',
    async () => {
      const spring = layoutOf(
        { originX: { isFrameDrivenSpring: true } },
        { name: 'spring' }
      );
      const move = layoutOf({ originX: {}, originY: {} }, { name: 'move' });
      const tag = await renderBox({ layout: spring });
      await render(<Scene left={END_LEFT} layout={spring} />);
      await wait(50);
      await takeTraceOf(tag);

      await render(<Scene left={END_LEFT} layout={move} />);
      await render(<Scene left={START_LEFT} layout={move} />);
      await wait(DURATION * 1.5);
      expect(
        (await takeTraceOf(tag)).filter(
          (event) => event.event !== 'FrameUpdateMounted'
        ).length
      ).toBe(0);
      expect(callbacks.join()).toBe('spring:false,move:true');
      expect(builderCalls).toBe(2);
      const { model } = await sample(tag, 'PositionX');
      expect(
        Math.abs(model[0] - centerOf(START_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest('a view in a Modal starts after its mount', async () => {
    await render(<ModalScene left={START_LEFT} />);
    await wait(300);
    const tag = getTestComponent(BOX_REF).getTag();
    await takeTrace();
    await render(<ModalScene left={END_LEFT} />);
    await wait(DURATION / 2);

    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      NATIVE_START
    );
    const { model, presentation } = await sample(tag, 'PositionX');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE).toBe(
      true
    );
    expect(presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    await render(null);
    await wait(300);
  });
});

/**
 * A read of the box between two reads of the reference box. The read is made
 * again while the reference box moves more than `ORIGIN_BRACKET` around it.
 */
async function bracketedReadOf(referenceTag: number, tag: number) {
  const shownOf = async (of: number) =>
    (await sample(of, 'PositionX')).presentation[0];
  let read = { low: 0, shown: 0, high: Infinity };
  for (
    let attempt = 0;
    attempt < BRACKET_ATTEMPTS && read.high - read.low > ORIGIN_BRACKET;
    attempt++
  ) {
    const before = await shownOf(referenceTag);
    const shown = await shownOf(tag);
    const after = await shownOf(referenceTag);
    read = {
      low: Math.min(before, after),
      shown,
      high: Math.max(before, after),
    };
  }
  return read;
}

describe('native layout starts with no duration', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const NATIVE_START_AND_END = `${NATIVE_START} > TrackEnded:PositionX:true > TrackEnded:PositionY:true > Ended:Finished:None`;

  movingGeometryTest(
    'a delay holds the start value, then the endpoint shows and the callback gets true',
    async () => {
      // The Y track has the timeline end of the hold, so its end report is the time reference.
      const layout = layoutOf(
        { originX: { duration: 0, delays: [DURATION] }, originY: {} },
        { name: 'hold' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);

      const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(startEvents)).toBe(NATIVE_START);
      const held = await sample(tag, 'PositionX');
      expect(playbackCountOf(held, startEvents[0].generation)).toBe(2);
      expect(
        Math.abs(held.model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(
        Math.abs(held.presentation[0] - centerOf(START_LEFT)) <=
          LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(callbacks.length).toBe(0);

      await wait(DURATION);
      const endEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarizeEnd(endEvents)).toBe(NATIVE_END);
      const endTimeOf = (target: string) =>
        endEvents.find((event) => event.target === target)!.monotonicTimeMs;
      const holdEnd = endTimeOf('PositionX');
      expect(
        holdEnd - startEvents[0].monotonicTimeMs > DURATION - FRAME_MS
      ).toBe(true);
      expect(Math.abs(holdEnd - endTimeOf('PositionY')) < FRAME_MS).toBe(true);
      const end = await sample(tag, 'PositionX');
      expect(end.playbacks.length).toBe(0);
      expect(
        Math.abs(end.presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(callbacks.join()).toBe('hold:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'each negative delay wrapper counts as zero before the hold',
    async () => {
      const leaf = { duration: 0, delays: [-DURATION, DURATION] };
      const layout = layoutOf({ originX: leaf, originY: leaf });
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);
      const held = await sample(tag, 'PositionX');
      expect(
        Math.abs(held.presentation[0] - centerOf(START_LEFT)) <=
          LAID_OUT_TOLERANCE
      ).toBe(true);
      await wait(DURATION);
      expect(summarizeEnd(await takeTraceOf(tag))).toBe(SORTED_START_AND_END);
      await render(null);
    }
  );

  movingGeometryTest(
    'no delay ends each track with the admission and starts no playback',
    async () => {
      const leaf = { duration: 0 };
      const layout = layoutOf(
        { originX: leaf, originY: leaf },
        { name: 'now' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(50);

      const events = await takeTraceOf(tag);
      expect(summarize(events.filter(isHostEvent))).toBe(NATIVE_START_AND_END);
      expect(summarize(events.filter(isClientReport))).toBe(
        'ClientAdmitted > ClientEnded:Finished:None'
      );
      const { model, presentation, playbacks } = await sample(tag, 'PositionX');
      expect(playbacks.length).toBe(0);
      expect(
        Math.abs(model[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(
        Math.abs(presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(callbacks.join()).toBe('now:true');
      expect(builderCalls).toBe(1);
      await render(null);
    }
  );

  movingGeometryTest(
    'a track with no duration ends with the admission and the other track of its command plays',
    async () => {
      const layout = layoutOf(
        { originX: { duration: 0 }, originY: {} },
        { name: 'mixed' }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
      await wait(DURATION / 2);

      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        `${NATIVE_START} > TrackEnded:PositionX:true`
      );
      const x = await sample(tag, 'PositionX');
      expect(x.playbacks.length).toBe(1);
      expect(
        Math.abs(x.presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      const y = await sample(tag, 'PositionY');
      expect(y.presentation[0] > y.model[0] - END_TOP).toBe(true);
      expect(y.presentation[0] < y.model[0]).toBe(true);
      expect(callbacks.length).toBe(0);

      await wait(DURATION);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        'TrackEnded:PositionY:true > Ended:Finished:None'
      );
      expect(callbacks.join()).toBe('mixed:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a start with no duration replaces a playing command: false, then true, and the endpoint shows',
    async () => {
      const first = layoutOf(
        { originX: { duration: 4 * DURATION }, originY: {} },
        { name: 'first' }
      );
      const second = layoutOf(
        { originX: { duration: 0 }, originY: { duration: 0 } },
        { name: 'second' }
      );
      const tag = await renderBox({ layout: first });
      await render(<Scene left={END_LEFT} layout={first} />);
      await wait(DURATION / 2);
      await takeTrace();

      await render(<Scene left={2 * END_LEFT} top={END_TOP} layout={second} />);
      await wait(50);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        `LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionX:false > Ended:Interrupted:None > TrackEnded:PositionY:false > ${NATIVE_START_AND_END.replace('LayoutStartPending > LayoutStartMounted > Received > ', '')}`
      );
      const { presentation, playbacks } = await sample(tag, 'PositionX');
      expect(playbacks.length).toBe(0);
      expect(
        Math.abs(presentation[0] - centerOf(2 * END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(callbacks.join()).toBe('first:false,second:true');
      await render(null);
    }
  );

  for (const [caseName, referenceCase] of Object.entries(
    HOLD_AFTER_TRACK_CASES
  )) {
    movingGeometryTest(
      `${caseName} goes to the frame driver, and the old value continues through its delay`,
      async () => {
        const { events, rows } = await playCase(caseName, referenceCase);
        const trackEnd = events.find(
          ({ event, target }) =>
            event === 'TrackEnded' && target === 'PositionX'
        );
        expect(trackEnd?.finished).toBe(false);
        for (const { row } of rows) {
          const { playbacks, monotonicTimeMs } = row.native.PositionX;
          if (monotonicTimeMs >= trackEnd!.monotonicTimeMs + FRAME_MS) {
            expect(playbacks.length).toBe(0);
          }
        }
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a new Y with no duration replaces the playing Y and keeps the long X: one false, then true after X ends',
    async () => {
      const long = { duration: 3 * DURATION, onlyWhenChanged: true };
      const first = layoutOf(
        { originX: long, originY: long },
        { name: 'first' }
      );
      const second = layoutOf(
        { originX: long, originY: { duration: 0, onlyWhenChanged: true } },
        { name: 'second' }
      );
      const tag = await renderBox({ layout: first });
      await render(<Scene left={END_LEFT} top={END_TOP} layout={first} />);
      await wait(DURATION / 4);
      const firstGeneration = (await takeTraceOf(tag))[0].generation;

      await render(<Scene left={END_LEFT} top={0} layout={second} />);
      await wait(DURATION / 2);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(events)).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionY:false > Ended:Interrupted:None > TrackStarted:PositionY > Admitted > TrackEnded:PositionY:true > Ended:Finished:None'
      );
      expect(events[3].generation).toBe(firstGeneration);
      expect(callbacks.join()).toBe('first:false');
      const x = await sample(tag, 'PositionX');
      expect(x.playbacks.length).toBe(1);
      expect(playbackCountOf(x, firstGeneration)).toBe(1);
      expect(x.presentation[0] < centerOf(END_LEFT)).toBe(true);

      await wait(3 * DURATION);
      const lateEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(lateEvents)).toBe('TrackEnded:PositionX:true');
      expect(lateEvents[0].generation).toBe(firstGeneration);
      expect(callbacks.join()).toBe('first:false,second:true');
      expect((await sample(tag, 'PositionX')).playbacks.length).toBe(0);
      await render(null);
    }
  );
});

describe('a native layout start that is late on its timeline', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const TRAVEL = END_LEFT - START_LEFT;
  const LATE_DURATION = 4 * DURATION;
  const FRAME_TRAVEL = (FRAME_MS * TRAVEL) / LATE_DURATION;
  // A presentation is the value of the last animator update, at most `PRESENTATION_STAY_MS` before the read.
  const STAY_TRAVEL = (PRESENTATION_STAY_MS * TRAVEL) / LATE_DURATION;

  const lateStartFaultOf = (x: number, leastX: number) => {
    const band = {
      from: leastX - STAY_TRAVEL - POSITION_TOLERANCE,
      to: leastX + FRAME_TRAVEL + POSITION_TOLERANCE,
    };
    return x > band.from && x < band.to
      ? ''
      : `x ${x} is not in ${band.from}..${band.to}`;
  };

  // The builder ends when the pull records the pending start, so the origin is `blocksForMs` before that
  // event, and earlier by the time from the frame timestamp to the builder call.
  async function sampleLateStart(tag: number, blocksForMs: number) {
    const pending = (await pendingStartOf(tag)).find(
      (event) => event.tag === tag && event.event === 'LayoutStartPending'
    );
    const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
    return {
      x: presentation[0],
      leastElapsedMs: monotonicTimeMs - pending!.monotonicTimeMs + blocksForMs,
    };
  }

  movingGeometryTest(
    'a start that is late by less than its duration continues at the elapsed time',
    async () => {
      const blocksForMs = DURATION;
      const duration = LATE_DURATION;
      const layout = layoutOf(
        { originX: { duration }, originY: { duration } },
        { blocksForMs }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      const { x, leastElapsedMs } = await sampleLateStart(tag, blocksForMs);
      const leastX =
        centerOf(START_LEFT) + (leastElapsedMs / duration) * TRAVEL;
      expect(lateStartFaultOf(x, leastX)).toBe('');
      await wait(duration);
      await render(null);
    }
  );

  movingGeometryTest(
    'a delay that is over at admission does not run again',
    async () => {
      const blocksForMs = DURATION;
      const duration = LATE_DURATION;
      const leaf = { duration, delays: [DURATION / 2] };
      const layout = layoutOf(
        { originX: leaf, originY: leaf },
        { blocksForMs }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      const { x, leastElapsedMs } = await sampleLateStart(tag, blocksForMs);
      const leastX =
        centerOf(START_LEFT) +
        ((leastElapsedMs - DURATION / 2) / duration) * TRAVEL;
      expect(lateStartFaultOf(x, leastX)).toBe('');
      await wait(duration);
      await render(null);
    }
  );

  movingGeometryTest(
    'a timeline that is over at admission ends with true and shows the endpoint',
    async () => {
      const layout = layoutOf(
        { originX: { delays: [DURATION / 4] }, originY: {} },
        { name: 'late', blocksForMs: 2 * DURATION }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      const started = await pendingStartOf(tag);
      const { presentation } = await sample(tag, 'PositionX');
      expect(
        Math.abs(presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      await wait(100);
      expect((await sample(tag, 'PositionX')).playbacks.length).toBe(0);
      const events = [...started, ...(await takeTraceOf(tag))].filter(
        (event) => event.tag === tag && isHostEvent(event)
      );
      expect(summarizeEnd(events)).toBe(SORTED_START_AND_END);
      expect(callbacks.join()).toBe('late:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a hold that is over at admission ends with true and shows the endpoint',
    async () => {
      const leaf = { duration: 0, delays: [DURATION / 4] };
      const layout = layoutOf(
        { originX: leaf, originY: leaf },
        { name: 'late', blocksForMs: DURATION }
      );
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      const started = await pendingStartOf(tag);
      const { presentation } = await sample(tag, 'PositionX');
      expect(
        Math.abs(presentation[0] - centerOf(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      await wait(100);
      expect((await sample(tag, 'PositionX')).playbacks.length).toBe(0);
      const events = [...started, ...(await takeTraceOf(tag))].filter(
        (event) => event.tag === tag && isHostEvent(event)
      );
      expect(summarizeEnd(events)).toBe(SORTED_START_AND_END);
      expect(callbacks.join()).toBe('late:true');
      await render(null);
    }
  );
});

describe('native layout timing against the curve and the frame driver', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [curveName, referenceCase] of Object.entries(CURVE_CASES)) {
    movingGeometryTest(
      `${curveName}: the native values and the frames of the frame driver are on the curve`,
      async () => {
        await playCase(curveName, referenceCase);
        await render(null);
      }
    );
  }

  type Replaced = {
    trackName: string;
    easing: Leaf['easing'];
    segments: number;
    /** The part of the duration at which the replacement comes. */
    replacedAt: number;
  };
  const replaced: Replaced[] = [
    {
      trackName: 'a linear track',
      easing: Easing.linear,
      segments: 1,
      replacedAt: 1 / 3,
    },
    {
      trackName: 'a track of the default easing',
      easing: 'default',
      segments: 2,
      replacedAt: 1 / 3,
    },
    {
      trackName: 'a track of the 22 segments of Easing.bounce',
      easing: Easing.bounce,
      segments: 22,
      replacedAt: 0.4,
    },
  ];
  for (const { trackName, easing, segments, replacedAt } of replaced) {
    movingGeometryTest(
      `a replacement during playback of ${trackName} continues each driver from its own value`,
      async () => {
        const { rows, tracks } = await playCase(
          `a replacement of ${trackName}`,
          {
            flow: 'layout',
            leaves: curveLeavesOf(easing),
            places: [PAIR_START, PAIR_END, { left: PAIR_LEFT / 4, top: 0 }],
            commitTimesMs: [replacedAt * PAIR_DURATION],
            totalMs: PAIR_DURATION,
          }
        );
        const [firstX, , secondX] = tracks;
        expect(secondX.replaced === firstX).toBe(true);
        expect(secondX.captured !== undefined).toBe(true);
        const beforeTheReplacement = rows
          .map(({ row }) => row.native.PositionX)
          .filter(
            ({ monotonicTimeMs }) =>
              monotonicTimeMs >= firstX.played.from + PRESENTATION_STAY_MS &&
              monotonicTimeMs < firstX.played.to
          );
        expect(beforeTheReplacement.length > 0).toBe(true);
        for (const { members } of beforeTheReplacement) {
          expect(members[0].values.length - 1).toBe(segments);
        }
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'the removal of the views during playback gives both drivers false one time',
    async () => {
      const layouts = pairLayoutsOf((hasCallback) => ({
        originX: { duration: PAIR_DURATION },
        originY: { duration: PAIR_DURATION, hasCallback },
      }));
      await mountScene(<Pair left={START_LEFT} top={0} {...layouts} />);
      await render(<Pair left={PAIR_LEFT} top={PAIR_TOP} {...layouts} />);
      await wait(PAIR_DURATION / 3);
      await render(null);
      await wait(100);
      expect([...callbacks].sort().join()).toBe('frame:false,native:false');
    }
  );
});

describe('layout animations with the native route off', () => {
  if (isNativeLayoutRouteConfigured) {
    return;
  }

  test('a builder of the native subset runs one time and stays frame-driven', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'off' });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION * 1.5);
    expect((await takeTraceOf(tag)).length).toBe(0);
    expect(builderCalls).toBe(1);
    expect(callbacks.join()).toBe('off:true');
    await render(null);
  });
});

const FOLLOWER_REF = 'NativeLayoutStartFollower';
const FOLLOWER_LAYOUT = layoutOf({
  originX: { duration: 3 * DURATION },
  originY: {},
});
const FOLLOWER_SPRING = layoutOf({ originX: { isFrameDrivenSpring: true } });

type UIRuntimeGlobal = {
  __mapperRun?: () => void;
  _maybeFlushUIUpdatesQueue: () => void;
};

// The callback of the leader moves the follower with an animated style and commits it in the same turn.
function ReentryScene({
  left,
  followerLayout,
}: {
  left: number;
  followerLayout: LayoutAnimationFunction;
}) {
  const followerLeft = useSharedValue(START_LEFT);
  const followerRef = useTestRef(FOLLOWER_REF);
  const followerStyle = useAnimatedStyle(() => ({
    marginLeft: followerLeft.value,
  }));
  const leaderLayout = React.useMemo<LayoutAnimationFunction>(
    () => (values) => {
      'worklet';
      return {
        initialValues: { originX: values.currentOriginX },
        animations: {
          originX: withTiming(values.targetOriginX, {
            duration: DURATION,
            easing: Easing.linear,
          }),
        },
        callback: () => {
          'worklet';
          followerLeft.value = followerLeft.value + END_LEFT;
          const uiGlobal = globalThis as unknown as UIRuntimeGlobal;
          uiGlobal.__mapperRun?.();
          uiGlobal._maybeFlushUIUpdatesQueue();
        },
      };
    },
    [followerLeft]
  );
  return (
    <View style={styles.container}>
      <Box left={left} layout={leaderLayout} />
      <Animated.View
        ref={followerRef}
        layout={followerLayout}
        style={[styles.box, followerStyle]}
      />
    </View>
  );
}

describe('native layout starts from a client callback', () => {
  if (!hasNativeLayoutRoute || getStaticFeatureFlag('USE_ANIMATION_BACKEND')) {
    return;
  }

  movingGeometryTest(
    'a commit inside a callback starts the next command inside the host report',
    async () => {
      await render(
        <ReentryScene left={START_LEFT} followerLayout={FOLLOWER_LAYOUT} />
      );
      await wait(50);
      const leaderTag = getTestComponent(BOX_REF).getTag();
      const followerTag = getTestComponent(FOLLOWER_REF).getTag();
      await takeTrace();

      await render(
        <ReentryScene left={END_LEFT} followerLayout={FOLLOWER_LAYOUT} />
      );
      await wait(DURATION * 1.5);
      const events = await takeTrace();
      const indexOf = (tag: number, name: string) =>
        events.findIndex((event) => event.tag === tag && event.event === name);
      const leaderResult = indexOf(leaderTag, 'ClientEnded');
      const followerStart = indexOf(followerTag, 'Admitted');
      expect(followerStart > indexOf(leaderTag, 'Ended')).toBe(true);
      expect(followerStart < leaderResult).toBe(true);
      expect(indexOf(followerTag, 'ClientAdmitted') > leaderResult).toBe(true);
      expect(events[leaderResult].outcome).toBe('Finished');

      // The second callback run cancels the playing follower from inside a host report.
      await render(
        <ReentryScene left={START_LEFT} followerLayout={FOLLOWER_SPRING} />
      );
      await wait(DURATION * 1.5);
      const nestedEvents = await takeTrace();
      const followerEvents = nestedEvents.filter(
        (event) => event.tag === followerTag
      );
      expect(
        summarize(
          followerEvents.filter(
            (event) =>
              event.event === 'LayoutBuildFailed' || event.event === 'Ended'
          )
        )
      ).toBe('LayoutBuildFailed:UnsupportedTiming > Ended:Cancelled:None');
      await wait(3 * DURATION);
      await render(null);
    }
  );
});

describe('native layout starts on two surfaces', () => {
  if (!hasNativeLayoutRoute || !isSecondSurfaceAvailable()) {
    return;
  }

  movingGeometryTest('each surface starts its own command', async () => {
    const tag = await renderBox();
    const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
    const secondTag = getTestComponent(SECOND_BOX_REF).getTag();

    await render(<Scene left={END_LEFT} />);
    setSecondSurfaceBox({ left: END_LEFT });
    await wait(DURATION * 5);

    const events = (await takeTrace()).filter(
      (event) => event.owner === 'Layout' && event.event === 'Ended'
    );
    const first = events.find((event) => event.tag === tag);
    const second = events.find((event) => event.tag === secondTag);
    expect(first!.outcome).toBe('Finished');
    expect(second!.outcome).toBe('Finished');
    expect(second!.surfaceId).toBe(secondSurfaceId);
    expect(first!.surfaceId).not.toBe(secondSurfaceId);

    await stopSecondSurface(secondSurfaceId);
    await render(null);
  });

  movingGeometryTest(
    'the stop of a surface ends its active command one time and no other command',
    async () => {
      const tag = await renderBox({ layout: LONG_MOVE });
      const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
      const secondTag = getTestComponent(SECOND_BOX_REF).getTag();
      const cssTag = getTestComponent(SECOND_CSS_BOX_REF).getTag();

      await render(<Scene left={END_LEFT} layout={LONG_MOVE} />);
      setSecondSurfaceBox({ left: END_LEFT });
      setSecondSurfaceOpacity(0.2);
      await wait(DURATION * 1.5);
      await takeTrace();

      await stopSecondSurface(secondSurfaceId);
      const events = (
        await takeTraceUntilSurfaceClosed(secondSurfaceId)
      ).filter(isHostEvent);
      expect(
        summarize(events.filter((event) => event.event === 'SurfaceClosed'))
      ).toBe('SurfaceClosed');
      expect(
        events.filter(
          (event) => event.tag === secondTag && event.event === 'Ended'
        ).length
      ).toBe(1);
      if (hasNativeCSSTransitions) {
        expect(summarize(events.filter((event) => event.tag === cssTag))).toBe(
          'TrackEnded:Opacity:false > Ended:SurfaceDestroyed:None'
        );
      }
      expect(events.filter((event) => event.tag === tag).length).toBe(0);

      await wait(4 * DURATION);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        'TrackEnded:PositionX:true > Ended:Finished:None'
      );
      expect((await takeTraceOf(secondTag)).length).toBe(0);
      await render(null);
    }
  );
});

describe('native layout size', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const ROUTE_DURATION = DURATION;
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

  /** The samples of a target of the native box from a time of the sample clock. */
  const shownFrom = ({ rows }: Played, target: string, fromMs: number) =>
    rows
      .map(({ row }) => row.native[target])
      .filter(({ monotonicTimeMs }) => monotonicTimeMs >= fromMs);

  const trackOf = ({ tracks }: Played, target: string) =>
    tracks.find((track) => track.target === target)!;

  /**
   * Android refuses a Width or Height track that changes by more than one pixel
   * (`AndroidNativeAnimationPlatform::canRealize`): the frame driver plays the
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

  test(`four leaves with different durations, delays, and easings ${PLAYS_SIZE_CHANGE ? 'are on their timelines on the native box and on the frame driver' : SIZE_FALLBACK_NAME}`, async () => {
    const caseName =
      'four leaves with different durations, delays, and easings';
    const played = await playCase(
      caseName,
      sizeChangeOf(HELD_SIZE_CASES[caseName])
    );
    if (!PLAYS_SIZE_CHANGE) {
      expectSizeFallback(played, 'PositionX');
      await render(null);
      return;
    }
    const { events, reads } = played;
    expect(summarizeStart(events)).toBe(FOUR_TRACKS);
    expect(summarizeResults(events)).toBe('Ended:Finished:None');
    // A read that can show one declared value only shows that value.
    for (const { checked, values, timeMs } of reads) {
      checked.forEach((track, index) => {
        const { from, to } = declaredBandOf(track, timeMs);
        if (from === to) {
          expect(Math.abs(values[index] - from) < 0.01).toBe(true);
        }
      });
    }
    await render(null);
  });

  movingGeometryTest(
    'position leaves on a view whose size changes in the commit play natively, and the native values and the frames of the frame driver are on their timelines',
    async () => {
      const played = await playCase(
        'position leaves on a view whose size changes',
        sizeCaseOf(
          { leaves: { originX: LINEAR_LEAF, originY: LINEAR_LEAF } },
          START,
          MOVED_AND_RESIZED,
          { alsoSampled: ['Width'] }
        )
      );
      expect(summarizeStart(played.events)).toBe(
        startOf('PositionX', 'PositionY')
      );
      expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
      const { from } = trackOf(played, 'PositionX').played;
      for (const { presentation } of shownFrom(
        played,
        'Width',
        from + PRESENTATION_STAY_MS
      )) {
        expect(presentation[0]).toBe(MOVED_AND_RESIZED.width);
      }
      await render(null);
    }
  );

  test(`fractional values of the frame ${PLAYS_SIZE_CHANGE ? 'play on four native tracks, and the frames of the frame driver are on the timeline' : SIZE_FALLBACK_NAME}`, async () => {
    const played = await playCase(
      'fractional values of the frame',
      sizeChangeOf(
        sizeCaseOf(
          LINEAR,
          { left: 10.4, top: 10.4, width: 50.3, height: 50.3 },
          { left: 110.4, top: 60.4, width: 100.3, height: 100.3 }
        )
      )
    );
    if (!PLAYS_SIZE_CHANGE) {
      expectSizeFallback(played, 'PositionX');
      await render(null);
      return;
    }
    const { events } = played;
    expect(summarizeStart(events)).toBe(FOUR_TRACKS);
    expect(summarizeResults(events)).toBe('Ended:Finished:None');
    await render(null);
  });

  if (!PLAYS_SIZE_CHANGE && isViewSamplerAvailable()) {
    movingGeometryTest(
      'fractional left and top with a constant size play on two native tracks: the mounted frame is on the pixel grid, and the drawn centre at the end is within 0.5 pt of the frame-driven twin and of the declared end',
      async () => {
        const start = { left: 10.4, top: 10.4 };
        const end = { left: 110.4, top: 60.4 };
        const leaf: Leaf = { duration: 3 * DURATION };
        const box = {
          nativeLayout: layoutOf(
            { originX: leaf, originY: leaf },
            { name: 'native' }
          ),
          frameLayout: layoutOf(
            {
              originX: { ...leaf, hasCallback: true },
              originY: { ...leaf, hasCallback: true },
            },
            { name: 'frame' }
          ),
        };
        const tag = await mountScene(<SizePair {...box} {...start} />);
        const twinTag = getTestComponent(FRAME_BOX_REF).getTag();
        const samples = await recordDrawnValues(
          [tag, twinTag],
          DRAWN_READS,
          async () => {
            await render(<SizePair {...box} {...end} />);
            await waitForCallbacks(['native:true', 'frame:true'], 9 * DURATION);
            await wait(100);
          }
        );
        const [native, twin] = geometryReadsOf(samples, DRAWN_READS, 2);
        const trace = await takeTrace();
        const events = trace.filter((event) => event.tag === tag);
        const twinEvents = trace.filter((event) => event.tag === twinTag);
        // The frames are in the parent that has the place of the scene after React flattens it (measured on
        // Android: a top of 180.57). The final state can mount before the first recorded draw, so the place
        // comes from the last read, at the end place on the pixel grid.
        const lastNative = native[native.length - 1];
        const lastTwin = twin[twin.length - 1];
        const [originX, originY] = [
          lastNative.frame![0] - PixelRatio.roundToNearestPixel(end.left),
          lastNative.frame![1] - PixelRatio.roundToNearestPixel(end.top),
        ];
        const mounted = native.filter(({ frame }) =>
          areOnGrid(
            [frame![0] - originX, frame![1] - originY],
            [end.left, end.top]
          )
        );
        const declaredEnd: Point = [
          originX + end.left + BOX_SIZE / 2,
          originY + end.top + BOX_SIZE / 2,
        ];
        const nativeCentre = drawnCentreOf(lastNative);
        const [twinX, twinY] = drawnCentreOf(lastTwin);
        const twinCentre: Point = [
          twinX - (lastTwin.frame![0] - lastNative.frame![0]),
          twinY - (lastTwin.frame![1] - lastNative.frame![1]),
        ];
        console.log(
          'RuntimeTestsFractionalPosition ' +
            JSON.stringify({
              pixelRatio: PixelRatio.get(),
              trace: summarize(events.filter(isHostEvent)),
              twinTrace: summarize(twinEvents),
              mountedFrame: mounted[0]?.frame,
              nativeCentre,
              twinCentre,
              declaredEnd,
            })
        );
        expect(summarize(events.filter(isHostEvent).slice(0, 6))).toBe(
          NATIVE_START
        );
        expect(summarizeResults(events)).toBe('Ended:Finished:None');
        expect(
          summarize(
            twinEvents.filter(({ event }) => event === 'LayoutBuildFailed')
          )
        ).toBe('LayoutBuildFailed:UnsupportedTiming');
        expect(mounted.length > 2).toBe(true);
        for (const { frame } of mounted) {
          expect(frame!.every(isOnPixelGrid)).toBe(true);
        }
        for (const centre of [twinCentre, declaredEnd]) {
          expect(
            pointDistanceOf(nativeCentre, centre) < POSITION_TOLERANCE
          ).toBe(true);
        }
        await render(null);
      }
    );
  }

  const constantSizeLeaves: [string, Leaf][] = [
    ['delayed', { duration: SIZE_DURATION / 2, delays: [SIZE_DURATION / 4] }],
    ['immediate', { duration: 0 }],
  ];
  const hostsWithNoNativeSizeChange: [string, SizeBoxProps['host']][] = [
    ['a Text', 'Text'],
    ['an Image', 'Image'],
  ];
  for (const [hostName, host] of hostsWithNoNativeSizeChange) {
    for (const [leafName, sizeLeaf] of constantSizeLeaves) {
      movingGeometryTest(
        `a position change of ${hostName} with ${leafName} size leaves that do not change plays on four native tracks, and the native values and the frames of the frame driver are on their timelines`,
        async () => {
          const played = await playCase(
            `a position change of ${hostName} with ${leafName} size leaves`,
            sizeCaseOf(
              {
                leaves: {
                  originX: LINEAR_LEAF,
                  originY: LINEAR_LEAF,
                  width: sizeLeaf,
                  height: sizeLeaf,
                },
              },
              START,
              MOVED,
              { box: { host } }
            )
          );
          expect(summarizeStart(played.events)).toBe(FOUR_TRACKS);
          expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
          for (const [target, size] of [
            ['Width', START.width],
            ['Height', START.height],
          ] as const) {
            for (const { presentation } of shownFrom(played, target, 0)) {
              expect(presentation[0]).toBe(size);
            }
          }
          await render(null);
        }
      );
    }
  }

  // A size leaf of a Text with a start value at most 0.01 pt from its end value (Android: one pixel plus 0.01 pt)
  // does not change the size.
  const sizeLeafOffsets: [number, boolean][] = [
    [0.009, true],
    [Platform.OS === 'android' ? ONE_PIXEL + 0.011 : 0.011, false],
  ];
  for (const [offset, isNative] of sizeLeafOffsets) {
    const offsetTest = isNative ? movingGeometryTest : test;
    offsetTest(
      `a size leaf of a Text that starts ${offset.toFixed(3)} pt from its end value ${isNative ? 'plays natively' : 'keeps the whole animation frame-driven: UnsupportedTarget'}`,
      async () => {
        const layout = layoutOf({
          originX: { duration: ROUTE_DURATION },
          width: { duration: ROUTE_DURATION, initial: offset },
        });
        const tag = await mountScene(<SizeScene host="Text" layout={layout} />);
        await render(<SizeScene host="Text" left={END_LEFT} layout={layout} />);
        await wait(ROUTE_DURATION * 1.5);
        const events = (await takeTraceOf(tag)).filter(
          (event) => event.event !== 'FrameUpdateMounted'
        );
        expect(summarizeStart(events)).toBe(
          isNative
            ? startOf('PositionX', 'Width')
            : 'LayoutBuildFailed:UnsupportedTarget'
        );
        expect(summarizeResults(events)).toBe(
          isNative ? 'Ended:Finished:None' : ''
        );
        await render(null);
      }
    );
  }

  const heldSteps = [
    {
      size: 'width',
      position: 'X',
      caseName: 'a delayed width with no duration during a native X',
    },
    {
      size: 'height',
      position: 'Y',
      caseName: 'a delayed height with no duration during a native Y',
    },
  ] as const;
  for (const { size, position, caseName } of heldSteps) {
    const target = size === 'width' ? 'Width' : 'Height';
    test(`a delayed ${size} with no duration ${PLAYS_SIZE_CHANGE ? `holds the start ${size} during a native ${position}, then shows the end ${size}` : `beside a ${position} ${SIZE_FALLBACK_NAME}`}`, async () => {
      const played = await playCase(
        caseName,
        sizeChangeOf(HELD_SIZE_CASES[caseName])
      );
      if (!PLAYS_SIZE_CHANGE) {
        expectSizeFallback(played, `Position${position}`);
        await render(null);
        return;
      }
      expect(summarizeStart(played.events)).toBe(
        startOf(`Position${position}`, target)
      );
      expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
      expectSteadySides(
        played,
        trackOf(played, target),
        trackOf(played, `Position${position}`).played.to,
        {
          from: played.start!.native[target].model[0],
          to: played.end!.native[target].model[0],
        }
      );
      await render(null);
    });
  }

  test(`a width with no duration ${PLAYS_SIZE_CHANGE ? 'shows the end width at once during a native X' : `beside an X ${SIZE_FALLBACK_NAME}`}`, async () => {
    const played = await playCase(
      'a width with no duration during a native X',
      sizeChangeOf(
        sizeCaseOf(
          { leaves: { originX: LINEAR_LEAF, width: { duration: 0 } } },
          START,
          WIDE
        )
      )
    );
    if (!PLAYS_SIZE_CHANGE) {
      expectSizeFallback(played, 'PositionX');
      await render(null);
      return;
    }
    expect(
      summarize(played.events.filter(isHostEvent)).startsWith(
        `${startOf('PositionX', 'Width')} > TrackEnded:Width:true`
      )
    ).toBe(true);
    expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
    const { from } = trackOf(played, 'Width').played;
    for (const { presentation } of shownFrom(
      played,
      'Width',
      from + PRESENTATION_STAY_MS
    )) {
      expect(presentation[0]).toBe(WIDE.width);
    }
    await render(null);
  });

  test(`a delayed width ${PLAYS_SIZE_CHANGE ? 'is on its timeline during a native X on the native box and on the frame driver' : `beside an X ${SIZE_FALLBACK_NAME}`}`, async () => {
    const caseName = 'a delayed width during a native X';
    const played = await playCase(
      caseName,
      sizeChangeOf(HELD_SIZE_CASES[caseName])
    );
    if (!PLAYS_SIZE_CHANGE) {
      expectSizeFallback(played, 'PositionX');
      await render(null);
      return;
    }
    expect(summarizeStart(played.events)).toBe(startOf('PositionX', 'Width'));
    expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
    const { timeline, origin, played: band } = trackOf(played, 'Width');
    for (const { presentation, monotonicTimeMs } of shownFrom(
      played,
      'Width',
      band.from
    )) {
      if (monotonicTimeMs < origin.from + timeline.phases[0].durationMs) {
        expect(presentation[0]).toBe(START.width);
      }
    }
    await render(null);
  });

  const WIDTH_AXIS = {
    size: 'width',
    origin: 'originX',
    edge: 'left',
    tracks: ['PositionX', 'Width'],
  } as const;
  const HEIGHT_AXIS = {
    size: 'height',
    origin: 'originY',
    edge: 'top',
    tracks: ['PositionY', 'Height'],
  } as const;
  type SizeAxis = typeof WIDTH_AXIS | typeof HEIGHT_AXIS;
  const zeroSizeCases: [string, SizeAxis, number, number][] = [
    ['width from 0 to 100', WIDTH_AXIS, 0, 100],
    ['width from 100 to 0', WIDTH_AXIS, 100, 0],
    ['width from 0 to 0', WIDTH_AXIS, 0, 0],
    ['height from 0 to 100', HEIGHT_AXIS, 0, 100],
  ];
  for (const [caseName, axis, startSize, endSize] of zeroSizeCases) {
    const isNative = PLAYS_SIZE_CHANGE || startSize === endSize;
    const zeroSizeTest = isNative ? movingGeometryTest : test;
    zeroSizeTest(
      `a ${caseName} gives finite values on its timeline on the native box and on the frame driver${isNative ? '' : `, and ${SIZE_FALLBACK_NAME}`}`,
      async () => {
        const referenceCase = sizeCaseOf(
          { leaves: { [axis.origin]: LINEAR_LEAF, [axis.size]: LINEAR_LEAF } },
          { ...START, [axis.size]: startSize },
          { ...START, [axis.edge]: 60, [axis.size]: endSize }
        );
        const played = await playCase(
          `a ${caseName}`,
          isNative ? referenceCase : sizeChangeOf(referenceCase)
        );
        const { events, rows } = played;
        if (isNative) {
          expect(summarizeStart(events)).toBe(startOf(...axis.tracks));
          expect(summarizeResults(events)).toBe('Ended:Finished:None');
        } else {
          expectSizeFallback(played, axis.tracks[0]);
        }
        const values = rows.flatMap(({ row: { native, frame } }) =>
          axis.tracks.flatMap((target) => [
            ...native[target].presentation,
            ...frame[target].model,
          ])
        );
        expect(values.every(Number.isFinite)).toBe(true);
        await render(null);
      }
    );
  }

  const WIDER = { width: 2 * BOX_SIZE, height: BOX_SIZE };
  const TALLER = { width: BOX_SIZE, height: 2 * BOX_SIZE };
  const BORDER = { style: { borderWidth: 2, borderColor: 'black' } };
  const sizeChangesOnTheFrameDriver: [
    string,
    Partial<SizeBoxProps>,
    typeof WIDER,
  ][] = [
    ['a size change of a View with a border', BORDER, WIDER],
    ['a height change of a View with a border', BORDER, TALLER],
    [
      'a size change of a View with a radius that is not uniform',
      { style: { borderTopLeftRadius: 12 } },
      WIDER,
    ],
    [
      'a size change of a View with a box shadow',
      { style: { boxShadow: '4px 4px 6px 0px rgba(0, 0, 0, 0.8)' } },
      WIDER,
    ],
    [
      'a size change of a View with an outline',
      { style: { outlineWidth: 3, outlineColor: 'red' } },
      WIDER,
    ],
    [
      'a size change of a View with a filter',
      { style: { filter: [{ brightness: 0.5 }] } },
      WIDER,
    ],
    [
      'a size change of a View with a background image',
      {
        style: {
          experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with a legacy shadow',
      {
        style: {
          shadowColor: 'black',
          shadowOpacity: 0.8,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with a transform origin',
      {
        style: {
          transformOrigin: 'top left',
          transform: [{ rotate: '20deg' }],
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with a percent translation',
      { style: { transform: [{ translateX: '50%' }] } },
      WIDER,
    ],
    [
      'a size change of a View with a dashed border of zero width',
      { style: { borderWidth: 0, borderStyle: 'dashed' } },
      WIDER,
    ],
    [
      'a size change of a View with a border of zero width and a colour for each side',
      {
        style: {
          borderWidth: 0,
          borderLeftColor: 'red',
          borderRightColor: 'blue',
          borderTopColor: 'green',
          borderBottomColor: 'black',
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with an elliptical radius',
      { style: { borderRadius: '30%' } },
      WIDER,
    ],
    [
      'a height change of a View with a percent translation',
      { style: { transform: [{ translateY: '50%' }] } },
      TALLER,
    ],
    ['a size change of a Text', { host: 'Text' }, WIDER],
    ['a size change of an Image', { host: 'Image' }, WIDER],
    ['a size change of a ScrollView', { host: 'ScrollView' }, WIDER],
  ];
  for (const [caseName, box, end] of sizeChangesOnTheFrameDriver) {
    test(`${caseName} keeps the whole animation frame-driven: UnsupportedTarget`, async () => {
      const layout = linearLayout(ROUTE_DURATION);
      const tag = await mountScene(<SizeScene {...box} layout={layout} />);
      await render(<SizeScene {...box} {...end} layout={layout} />);
      await wait(ROUTE_DURATION * 1.5);
      const events = (await takeTraceOf(tag)).filter(
        (event) => event.event !== 'FrameUpdateMounted'
      );
      expect(summarize(events)).toBe('LayoutBuildFailed:UnsupportedTarget');
      const { model } = await sampleFrame(tag);
      const changed = end === TALLER ? 'height' : 'width';
      expect(
        Math.abs(model[changed] - end[changed]) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      await render(null);
    });
  }

  const sizeChangesOnNativeTracks: [
    string,
    Pick<SizeBoxProps, 'style'>,
    Place,
    Place,
  ][] = [
    [
      'a size change of a View with a static rotation',
      { style: { transform: [{ rotate: '20deg' }] } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with a static scale',
      { style: { transform: [{ scale: 1.5 }] } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with a continuous border curve and a radius',
      { style: { borderCurve: 'continuous', borderRadius: 12 } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with an opacity filter',
      { style: { filter: [{ opacity: FILTER_OPACITY }] } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with a blend mode',
      { style: { mixBlendMode: 'multiply' } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with its own stacking context',
      { style: { isolation: 'isolate' } },
      START,
      RESIZED,
    ],
    [
      'a change to a smaller size of a View with a clip and a radius',
      { style: { overflow: 'hidden', borderRadius: 12 } },
      RESIZED,
      START,
    ],
  ];
  for (const [caseName, box, start, end] of sizeChangesOnNativeTracks) {
    test(`${caseName} ${PLAYS_SIZE_CHANGE ? 'plays on four native tracks, and the native values and the frames of the frame driver are on its timeline' : SIZE_FALLBACK_NAME}`, async () => {
      const played = await playCase(
        caseName,
        sizeChangeOf(sizeCaseOf(LINEAR, start, end, { box }))
      );
      if (!PLAYS_SIZE_CHANGE) {
        expectSizeFallback(played, 'Width');
        await render(null);
        return;
      }
      expect(summarizeStart(played.events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
      const { origin, played: band } = trackOf(played, 'Width');
      const playing = shownFrom(
        played,
        'Width',
        band.from + PRESENTATION_STAY_MS
      ).filter(
        ({ monotonicTimeMs }) =>
          monotonicTimeMs < middleOf(origin) + SIZE_DURATION - FRAME_MS
      );
      expect(playing.length > 0).toBe(true);
      for (const { playbacks } of playing) {
        expect(playbacks.length).toBe(4);
      }
      await render(null);
    });
  }

  const positionChangesOnNativeTracks: [string, Partial<SizeBoxProps>][] = [
    ['a Text', { host: 'Text' }],
    ['an Image', { host: 'Image' }],
  ];
  for (const [caseName, box] of positionChangesOnNativeTracks) {
    movingGeometryTest(
      `LinearTransition with a linear easing plays a position change of ${caseName} on four native tracks`,
      async () => {
        const layout = linearLayout(ROUTE_DURATION);
        const tag = await mountScene(<SizeScene {...box} layout={layout} />);
        await render(<SizeScene {...box} left={END_LEFT} layout={layout} />);
        await wait(ROUTE_DURATION / 2);
        const playing = await sampleFrame(tag);
        await wait(ROUTE_DURATION);
        const events = await takeTraceOf(tag);
        expect(summarizeStart(events)).toBe(FOUR_TRACKS);
        expect(summarizeResults(events)).toBe('Ended:Finished:None');
        expect(playing.playbacks.length).toBe(4);
        expect(playing.presentation.x > START_LEFT).toBe(true);
        expect(playing.presentation.x < END_LEFT).toBe(true);
        expect(playing.presentation.width).toBe(BOX_SIZE);
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a position-only LinearTransition plays its constant size leaves as holds: duration, delay, completion, playback entries',
    async () => {
      const delayMs = ROUTE_DURATION / 2;
      const layout = linearLayout(ROUTE_DURATION)
        .delay(delayMs)
        .withCallback(callbackOf('linear'));
      const tag = await mountScene(<SizeScene layout={layout} />);
      await render(<SizeScene left={END_LEFT} layout={layout} />);
      await wait(delayMs / 2);
      const inDelay = await sampleSizeAndX(tag);
      await wait(delayMs / 2 + ROUTE_DURATION / 2);
      const inMotion = await sampleSizeAndX(tag);
      expect(await waitForCallbacks(['linear:true'], 3 * ROUTE_DURATION)).toBe(
        ''
      );
      await wait(100);
      const events = await takeTraceOf(tag);
      console.log(
        'RuntimeTestsSizeHolds ' +
          JSON.stringify({ trace: summarize(events), inDelay, inMotion })
      );
      expect(summarizeStart(events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(events)).toBe('Ended:Finished:None');
      for (const { width, height } of [inDelay, inMotion]) {
        for (const size of [width, height]) {
          expect(size.model[0]).toBe(BOX_SIZE);
          expect(size.presentation[0]).toBe(BOX_SIZE);
          expect(size.playbacks.length).toBe(4);
        }
      }
      expect(
        Math.abs(inDelay.x.presentation[0] - centerOf(START_LEFT)) <
          POSITION_TOLERANCE
      ).toBe(true);
      expect(inMotion.x.presentation[0] > centerOf(START_LEFT)).toBe(true);
      const admitted = firstEventOf(events, 'Admitted');
      for (const target of ['Width', 'Height']) {
        const ended = events.find(
          (event) => event.event === 'TrackEnded' && event.target === target
        );
        expect(ended?.finished).toBe(true);
        expect(
          ended!.monotonicTimeMs - admitted.monotonicTimeMs >
            delayMs + ROUTE_DURATION - FRAME_MS
        ).toBe(true);
      }
      expect(callbacks.join()).toBe('linear:true');
      await render(null);
    }
  );

  test('a five-second position and size animation: the mounted bounds, the visual values, the handle, the target, and the route at the start and at 50 %', async () => {
    const durationMs = 5000;
    const layout = linearLayout(durationMs);
    const tag = await mountScene(<SizeScene layout={layout} />);
    const end = MOVED_AND_RESIZED;
    const startedMs = performance.now();
    await render(
      <SizeScene
        left={end.left}
        top={end.top}
        width={end.width}
        height={end.height}
        layout={layout}
      />
    );
    const points: Record<string, unknown>[] = [];
    const widths: TargetSample[] = [];
    for (const part of [0, 0.5]) {
      await wait(
        Math.max(
          0,
          startedMs + part * durationMs + 3 * FRAME_MS - performance.now()
        )
      );
      const width = await sample(tag, 'Width');
      widths.push(width);
      points.push({
        part,
        frame: await sampleFrame(tag),
        width,
        drawn: isViewSamplerAvailable()
          ? await recordDrawnValues(tag, ['frame', 'drawnMatrix'], () =>
              wait(2 * FRAME_MS)
            )
          : undefined,
      });
    }
    const events = await takeTraceOf(tag);
    const route = PLAYS_SIZE_CHANGE
      ? routeOf(events, tag, 'Width', widths)
      : routeOf(
          events,
          tag,
          'Width',
          widths,
          isOnLinearSizeTimeline(BOX_SIZE, end.width!, durationMs)
        );
    console.log(
      'RuntimeTestsFiveSecondSize ' +
        JSON.stringify({ trace: summarize(events), route, points })
    );
    expect(route.kind).toBe(
      PLAYS_SIZE_CHANGE ? 'native playing' : 'frame-driven'
    );
    await wait(durationMs / 2 + 300);
    await render(null);
  });

  if (!PLAYS_SIZE_CHANGE) {
    test('a refused Android start: the model samples move on the frame-driver timeline', async () => {
      const durationMs = 1200;
      const layout = linearLayout(durationMs);
      const tag = await mountScene(<SizeScene layout={layout} />);
      await render(<SizeScene layout={layout} width={2 * BOX_SIZE} />);
      const startedMs = performance.now();
      const samples: TargetSample[] = [];
      for (const part of [1 / 3, 2 / 3]) {
        await wait(
          Math.max(0, startedMs + part * durationMs - performance.now())
        );
        samples.push(await sample(tag, 'Width'));
      }
      const events = await takeTraceOf(tag);
      const route = routeOf(
        events,
        tag,
        'Width',
        samples,
        isOnLinearSizeTimeline(BOX_SIZE, 2 * BOX_SIZE, durationMs)
      );
      if (route.kind !== 'frame-driven') {
        throw new Error(`The refused start reports ${route.kind}.`);
      }
      expect(route.refusal.buildFailure).toBe('UnsupportedTarget');
      await wait(durationMs);
      await render(null);
    });
  }
});

async function sampleSizeAndX(tag: number) {
  const [width, height, x] = await Promise.all([
    sample(tag, 'Width'),
    sample(tag, 'Height'),
    sample(tag, 'PositionX'),
  ]);
  return { width, height, x };
}

// The extremes of the lag of the frame driver from the refusal that iOS measured, in whole display frames.
// Android: not measured.
const FRAME_DRIVER_EARLY_MS = 2 * FRAME_MS;
const FRAME_DRIVER_LATE_MS = 5 * FRAME_MS;

/**
 * A linear size from `from` to `to` that the frame driver starts at the
 * refusal.
 */
const isOnLinearSizeTimeline =
  (from: number, to: number, durationMs: number) =>
  ({ model: [size] }: { model: number[] }, sinceRefusalMs: number) => {
    const sizeAt = (timeMs: number) =>
      from + (to - from) * Math.min(1, Math.max(0, timeMs / durationMs));
    const [low, high] = [
      sizeAt(sinceRefusalMs - FRAME_DRIVER_LATE_MS),
      sizeAt(sinceRefusalMs + FRAME_DRIVER_EARLY_MS),
    ].sort((first, second) => first - second);
    return size >= low && size <= high;
  };

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

const GEOMETRY_READS: GeometryProperty[] = [
  'frame',
  'drawnMatrix',
  'hitRect',
  'accessibilityBounds',
];
const DRAWN_READS: GeometryProperty[] = ['frame', 'drawnMatrix'];
const CELL_TOLERANCE = 1e-3;

type GeometryRead = { timeMs: number } & {
  [Property in GeometryProperty]?: number[];
};

/** The reads of each view of `recordDrawnValues`, in the order of its tags. */
function geometryReadsOf(
  samples: DrawnSample[],
  properties: GeometryProperty[],
  viewCount = 1
): GeometryRead[][] {
  const width = properties.reduce(
    (sum, property) => sum + valueCountOf(property),
    0
  );
  return Array.from({ length: viewCount }, (_, view) =>
    samples.map(({ timeMs, values }) => {
      const read: GeometryRead = { timeMs };
      let offset = view * width;
      for (const property of properties) {
        const count = valueCountOf(property);
        read[property] = values.slice(offset, offset + count);
        offset += count;
      }
      return read;
    })
  );
}

type Point = [number, number];

/**
 * The drawn corners of a view in its parent: top left, top right, bottom left,
 * bottom right.
 */
function cornersOf({ frame, drawnMatrix }: GeometryRead): Point[] {
  const [, , width, height] = frame!;
  const corners: Point[] = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  return corners.map((corner) => drawnPointOf(frame!, drawnMatrix!, corner));
}

/**
 * The corners of the twin in the cell of the native view: the frame of a view
 * is in the parent that has its place after React flattens the cells (measured:
 * the top of the twin is 220.19 below the top of the native view).
 */
const twinCornersOf = (read: GeometryRead): Point[] =>
  cornersOf(read).map(([x, y]) => [x, y - SIZE_CELL_HEIGHT]);

const cornerDistanceOf = (first: Point[], second: Point[]) =>
  Math.max(
    ...first.map(([x, y], corner) =>
      Math.hypot(x - second[corner][0], y - second[corner][1])
    )
  );

/** The angle of the linear part of a drawn matrix, in radians. */
const angleOf = ([scaleX, skewY]: number[]) => Math.atan2(skewY, scaleX);

/**
 * The distance of the drawn corners of each read of the native view from the
 * corners of the twin at the same progress. `progressOf` gives a value that
 * grows along the path of the two views. A read out of the progress of the twin
 * has no distance.
 */
function cornerDistancesAtProgress(
  native: GeometryRead[],
  twin: GeometryRead[],
  progressOf: (drawnMatrix: number[]) => number
) {
  const twinPath = twin
    .map((read) => ({
      progress: progressOf(read.drawnMatrix!),
      corners: twinCornersOf(read),
    }))
    .sort((first, second) => first.progress - second.progress);
  return native.flatMap((read) => {
    const progress = progressOf(read.drawnMatrix!);
    const next = twinPath.findIndex((entry) => entry.progress >= progress);
    if (next < 0 || (next === 0 && twinPath[0].progress !== progress)) {
      return [];
    }
    const after = twinPath[next];
    const before = twinPath[Math.max(0, next - 1)];
    const span = after.progress - before.progress;
    const part = span === 0 ? 0 : (progress - before.progress) / span;
    const corners = before.corners.map(
      ([x, y], corner): Point => [
        x + (after.corners[corner][0] - x) * part,
        y + (after.corners[corner][1] - y) * part,
      ]
    );
    return [
      {
        timeMs: read.timeMs,
        progress,
        distance: cornerDistanceOf(cornersOf(read), corners),
      },
    ];
  });
}

type GeometryPairCase = {
  operations: Operation[];
  width?: number;
  height?: number;
  durationMs: number;
  /** Runs at the middle of the animation. */
  atMiddle?: (tag: number) => Promise<void>;
};

/**
 * Plays a transform leaf on a native view and on its frame-driven twin, with
 * the drawn frame and matrix of the two views at each draw. The commit moves
 * the views with no position leaf.
 */
async function playGeometryPair({
  operations,
  width = BOX_SIZE,
  height = BOX_SIZE,
  durationMs,
  atMiddle,
}: GeometryPairCase) {
  const timed = operations.map(
    ([kind, from, to, leaf]): Operation => [
      kind,
      from,
      to,
      { duration: durationMs, ...leaf },
    ]
  );
  const layouts = {
    nativeLayout: layoutOf(
      {},
      { name: 'native', transform: { operations: timed } }
    ),
    frameLayout: layoutOf(
      {},
      {
        name: 'frame',
        transform: { operations: timed, shared: { hasCallback: true } },
      }
    ),
  };
  const box = {
    width,
    height,
    style: { transform: endTransformOf(timed) },
    ...layouts,
  };
  const tag = await mountScene(<SizePair {...box} />);
  const twinTag = getTestComponent(FRAME_BOX_REF).getTag();
  const clockOffset = await narrowClockOffset(tag);
  const samples = await recordDrawnValues(
    [tag, twinTag],
    DRAWN_READS,
    async () => {
      await render(<SizePair {...box} left={END_LEFT} />);
      if (atMiddle) {
        await wait(durationMs / 2);
        await atMiddle(tag);
      }
      await waitForCallbacks(['native:true', 'frame:true'], 3 * durationMs);
      await wait(100);
    }
  );
  const [native, twin] = geometryReadsOf(samples, DRAWN_READS, 2);
  return {
    tag,
    events: await takeTraceOf(tag),
    native,
    twin,
    operations: timed,
    clockOffset,
  };
}

type PlayedGeometryPair = Awaited<ReturnType<typeof playGeometryPair>>;

/**
 * The corners of the native view are within 0.5 pt of the twin at each progress
 * of the twin and after the end. The twin draws its start value in its first
 * frame, so the start is compared by progress only.
 */
function expectCornersAsTwin(
  caseName: string,
  { native, twin }: PlayedGeometryPair,
  progressOf: (drawnMatrix: number[]) => number
) {
  const distances = cornerDistancesAtProgress(native, twin, progressOf);
  const atStart = cornerDistanceOf(
    cornersOf(native[0]),
    twinCornersOf(twin[0])
  );
  const atEnd = cornerDistanceOf(
    cornersOf(native[native.length - 1]),
    twinCornersOf(twin[twin.length - 1])
  );
  console.log(
    'RuntimeTestsDrawnCorners ' +
      JSON.stringify({
        caseName,
        atStart,
        atEnd,
        nativeEnd: native[native.length - 1],
        twinEnd: twin[twin.length - 1],
        reads: distances.length,
        largest: Math.max(0, ...distances.map(({ distance }) => distance)),
      })
  );
  expect(distances.length > 2).toBe(true);
  expect(atEnd < POSITION_TOLERANCE).toBe(true);
  for (const { distance } of distances) {
    expect(distance < POSITION_TOLERANCE).toBe(true);
  }
}

/**
 * Each draw of the native view is within 0.5 pt of the declared corners in the
 * frame times that the draw can show, from the origin of its command. The draw
 * time is on the animation clock (Android, with no slow animations).
 */
function expectCornersOnTimeline(
  caseName: string,
  { native, events, operations, clockOffset }: PlayedGeometryPair
) {
  const origin = nativeOriginOf(
    events,
    firstEventOf(events, 'Received'),
    clockOffset
  );
  const cellsAt = declaredCellsOf(operations);
  const checked = native.map((read) => {
    const elapsed = frameTimesOf(drawnBandOf(read.timeMs, clockOffset), origin);
    const drawn = cornersOf(read);
    const { low } = curveBandOf(
      (elapsedMs) =>
        cornerDistanceOf(
          drawn,
          cornersOf({
            ...read,
            drawnMatrix: centredMatrixOf(read.frame!, cellsAt(elapsedMs)),
          })
        ),
      elapsed.from,
      elapsed.to
    );
    return { timeMs: read.timeMs, elapsed, residual: low };
  });
  console.log(
    'RuntimeTestsCornersOnTimeline ' +
      JSON.stringify({
        caseName,
        origin,
        clockOffset,
        first: checked[0],
        largest: Math.max(...checked.map(({ residual }) => residual)),
        reads: checked.length,
      })
  );
  expect(checked.length > 2).toBe(true);
  for (const { residual } of checked) {
    expect(residual < POSITION_TOLERANCE).toBe(true);
  }
}

/**
 * The 4 x 4 cells of the transform of `operations` at a time from the origin of
 * their command, on the declared timeline of each leaf.
 */
function declaredCellsOf(operations: Operation[]) {
  const timelines = operations.map(([kind, from, to, leaf]) => {
    if (typeof from === 'object' || typeof to === 'object') {
      throw new Error(`The kit has no timeline of the operation ${kind}.`);
    }
    const timeline = declaredTimelineOf(leaf ?? {}, from, to);
    return { kind, unit: timeline.unit, valueAt: declaredValueOf(timeline) };
  });
  return (timeMs: number) =>
    cellsOf(
      timelines.map(({ kind, unit, valueAt }) => ({
        kind,
        unit,
        amount: valueAt(timeMs),
      })),
      'rest'
    );
}

/**
 * The six cells of a drawn matrix for the 4 x 4 cells of a transform about the
 * centre of a frame.
 */
function centredMatrixOf([, , width, height]: number[], cells: number[]) {
  const [centreX, centreY] = [width / 2, height / 2];
  return [
    cells[0],
    cells[1],
    cells[4],
    cells[5],
    centreX - cells[0] * centreX - cells[4] * centreY + cells[12],
    centreY - cells[1] * centreX - cells[5] * centreY + cells[13],
  ];
}

/** Renders `scene`, then gives the uptime after the render. */
async function renderedAt(scene: Parameters<typeof render>[0]) {
  await render(scene);
  return uptimeMs();
}

/** A rotation of the linear part of a drawn matrix, to the cell tolerance. */
const isRotation = (drawnMatrix: number[], angle: number) =>
  [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle)].every(
    (cell, index) => Math.abs(drawnMatrix[index] - cell) < CELL_TOLERANCE
  );

const DEGREE = Math.PI / 180;

/**
 * The linear part of a drawn matrix is a skew of `angle` on X, to the cell
 * tolerance.
 */
const isSkewX = (drawnMatrix: number[], angle: number) =>
  [1, 0, Math.tan(angle), 1].every(
    (cell, index) => Math.abs(drawnMatrix[index] - cell) < CELL_TOLERANCE
  );

/**
 * The first draw with the skew `angle` comes within 3 frames of `writtenAtMs`,
 * and each later draw of `reads` keeps it.
 */
function expectSkewFrom(
  reads: GeometryRead[],
  angle: number,
  writtenAtMs: number
) {
  const first = reads.findIndex(({ drawnMatrix }) =>
    isSkewX(drawnMatrix!, angle)
  );
  console.log(
    'RuntimeTestsSkewDrawn ' +
      JSON.stringify({ angle, writtenAtMs, first, draws: reads.length })
  );
  expect(first >= 0).toBe(true);
  if (first < 0) {
    return;
  }
  expect(reads[first].timeMs < writtenAtMs + 3 * FRAME_MS).toBe(true);
  for (const { drawnMatrix } of reads.slice(first)) {
    expect(isSkewX(drawnMatrix!, angle)).toBe(true);
  }
}

/** A layout value in dp on the pixel grid of the device. */
const isOnGrid = (value: number, expected: number) =>
  Math.abs(value - expected) < 1 / PixelRatio.get();
const areOnGrid = (values: number[], expected: number[]) =>
  values.every((value, index) => isOnGrid(value, expected[index]));

/** A value in dp that is a whole number of device pixels. */
const isOnPixelGrid = (value: number) => {
  const pixels = value * PixelRatio.get();
  return Math.abs(pixels - Math.round(pixels)) < PIXEL_TOLERANCE;
};
// The sampler rounds a dp value to 4 decimals.
const PIXEL_TOLERANCE = 1e-3;

/** The drawn place of the centre of a view in its parent. */
const drawnCentreOf = ({ frame, drawnMatrix }: GeometryRead): Point =>
  drawnPointOf(frame!, drawnMatrix!, [frame![2] / 2, frame![3] / 2]);

const pointDistanceOf = ([x, y]: Point, [otherX, otherY]: Point) =>
  Math.hypot(x - otherX, y - otherY);

describe('native layout geometry on the animation matrix', () => {
  if (!hasNativeLayoutRoute || !isViewSamplerAvailable()) {
    return;
  }

  const AT_START: Place = { left: START_LEFT, top: 0 };
  const AT_END: Place = { left: END_LEFT, top: 0 };
  const LONG = 2 * DURATION;

  movingGeometryTest(
    'the mounted bounds, the touch region, and the accessibility bounds are final while the visual place moves',
    async () => {
      const tag = await renderBox();
      const samples = await recordDrawnValues(tag, GEOMETRY_READS, async () => {
        await render(<Scene left={END_LEFT} />);
        await wait(DURATION * 1.5);
      });
      const [reads] = geometryReadsOf(samples, GEOMETRY_READS);
      const mounted = reads.filter(({ frame }) =>
        isOnGrid(frame![0], END_LEFT)
      );
      const final = mounted[mounted.length - 1];
      console.log(
        'RuntimeTestsFinalBounds ' +
          JSON.stringify({ reads: reads.length, first: mounted[0], final })
      );
      expect(mounted.length > 2).toBe(true);
      // The frame is in the parent that has the place of the scene after React flattens it (measured: a
      // top of 180.5714 on Android), so the top is the top of the first read.
      const top = mounted[0].frame![1];
      for (const { frame, hitRect, accessibilityBounds } of mounted) {
        expect(areOnGrid(frame!, [END_LEFT, top, BOX_SIZE, BOX_SIZE])).toBe(
          true
        );
        expect(
          areOnGrid(hitRect!, [
            END_LEFT,
            top,
            END_LEFT + BOX_SIZE,
            top + BOX_SIZE,
          ])
        ).toBe(true);
        expect(accessibilityBounds!.join()).toBe(
          final.accessibilityBounds!.join()
        );
      }
      const isMoving = ([x]: Point) =>
        x > START_LEFT + POSITION_TOLERANCE &&
        x < END_LEFT - POSITION_TOLERANCE;
      expect(mounted.some((read) => isMoving(cornersOf(read)[0]))).toBe(true);
      await render(null);
    }
  );

  const startOrders: [string, ReferenceCase][] = [
    [
      'position and then transform',
      {
        flow: 'layout',
        leaves: { originX: { duration: LONG } },
        replacement: {
          leaves: { originY: { duration: LONG } },
          operations: [['rotate', 0, 1, { duration: LONG }]],
        },
        places: [AT_START, AT_END, { ...AT_END, top: END_TOP }],
        commitTimesMs: [DURATION / 2],
        totalMs: LONG,
      },
    ],
    [
      'transform and then position',
      {
        flow: 'layout',
        leaves: { originY: { duration: LONG } },
        operations: [['rotate', 0, 1, { duration: LONG }]],
        replacement: { leaves: { originX: { duration: LONG } } },
        places: [
          AT_START,
          { ...AT_START, top: END_TOP },
          { ...AT_END, top: END_TOP },
        ],
        commitTimesMs: [DURATION / 2],
        totalMs: LONG,
      },
    ],
  ];
  for (const [orderName, referenceCase] of startOrders) {
    movingGeometryTest(
      `${orderName} on one view gives the same frames as the frame driver`,
      async () => {
        const { events } = await playCase(orderName, referenceCase);
        expect(summarize(events.filter(({ event }) => event === 'Ended'))).toBe(
          'Ended:Finished:None > Ended:Finished:None'
        );
        await render(null);
      }
    );
  }

  const partialReplacements: [string, string, ReferenceCase][] = [
    [
      'position',
      'Transform',
      {
        flow: 'layout',
        leaves: { originX: { duration: LONG } },
        operations: [['rotate', 0, 1, { duration: LONG }]],
        replacement: { leaves: { originX: { duration: DURATION } } },
        places: [AT_START, AT_END, { ...AT_END, left: 2 * END_LEFT }],
        commitTimesMs: [0.4 * LONG],
        totalMs: LONG,
      },
    ],
    [
      'transform',
      'PositionX',
      {
        flow: 'layout',
        leaves: { originX: { duration: LONG } },
        operations: [['rotate', 0, 1, { duration: LONG }]],
        replacement: {
          leaves: {},
          operations: [['rotate', 0.5, 2, { duration: DURATION }]],
        },
        places: [AT_START, AT_END, { ...AT_END, top: END_TOP }],
        commitTimesMs: [0.4 * LONG],
        totalMs: LONG,
      },
    ],
  ];
  for (const [replacedName, keptTarget, referenceCase] of partialReplacements) {
    movingGeometryTest(
      `a partial replacement of ${replacedName} keeps the ${keptTarget} track`,
      async () => {
        const { tracks, rows } = await playCase(
          `a partial replacement of ${replacedName}`,
          referenceCase
        );
        const kept = tracks.find(({ target }) => target === keptTarget)!;
        const replacing = tracks[tracks.length - 1];
        expect(replacing.generation > kept.generation).toBe(true);
        const whileKept = rows
          .map(({ row }) => row.native[keptTarget])
          .filter(
            ({ monotonicTimeMs }) =>
              monotonicTimeMs >= replacing.played.from + PRESENTATION_STAY_MS &&
              monotonicTimeMs < kept.played.to - FRAME_MS
          );
        expect(whileKept.length > 0).toBe(true);
        for (const read of whileKept) {
          expect(playbackCountOf(read, kept.generation)).toBe(1);
        }
        await render(null);
      }
    );
  }

  type GeometryCancel = {
    trackName: string;
    first: BoxProps;
    cancel: BoxProps;
    /**
     * The cell of the drawn matrix of the cancelled track, and of the kept
     * track.
     */
    cancelledCell: number;
    keptCell: number;
    cancelledEnd: number;
    kept: { from: number; to: number };
  };
  const SHIFT = 40;
  const SHIFTED = 60;
  const longLayoutOf = (
    leaves: Partial<Record<Key, Leaf>>,
    operations: Operation[]
  ) => layoutOf(leaves, { name: 'first', transform: { operations } });
  const geometryCancels: GeometryCancel[] = [
    {
      trackName: 'the position track',
      first: {
        left: END_LEFT,
        transform: [{ translateY: SHIFT }],
        layout: longLayoutOf({ originX: { duration: 3 * DURATION } }, [
          ['translateY', 0, SHIFT, { duration: 3 * DURATION }],
        ]),
      },
      cancel: {
        left: 2 * END_LEFT,
        transform: [{ translateY: SHIFT }],
        layout: layoutOf({ originX: { duration: 0 } }, { name: 'cancel' }),
      },
      cancelledCell: 4,
      keptCell: 5,
      cancelledEnd: 0,
      kept: { from: 0, to: SHIFT },
    },
    {
      trackName: 'the transform track',
      first: {
        left: END_LEFT,
        transform: [{ translateY: SHIFT }],
        layout: longLayoutOf({ originX: { duration: 3 * DURATION } }, [
          ['translateY', 0, SHIFT, { duration: 3 * DURATION }],
        ]),
      },
      cancel: {
        left: END_LEFT,
        top: END_TOP,
        transform: [{ translateY: SHIFTED }],
        layout: layoutOf(
          {},
          {
            name: 'cancel',
            transform: {
              operations: [['translateY', SHIFTED, SHIFTED, { duration: 0 }]],
            },
          }
        ),
      },
      cancelledCell: 5,
      keptCell: 4,
      cancelledEnd: SHIFTED,
      kept: { from: START_LEFT - END_LEFT, to: 0 },
    },
  ];
  for (const geometryCancel of geometryCancels) {
    const { trackName, first, cancel, cancelledCell, keptCell } =
      geometryCancel;
    movingGeometryTest(
      `a cancel of ${trackName} removes only its part of the matrix`,
      async () => {
        const tag = await renderBox({
          transform: first.transform,
          layout: first.layout,
        });
        let cancelledAtMs = 0;
        const samples = await recordDrawnValues(tag, DRAWN_READS, async () => {
          await render(<Scene {...first} />);
          await wait(1.5 * DURATION);
          await render(<Scene {...first} layout={cancel.layout} />);
          cancelledAtMs = await renderedAt(<Scene {...cancel} />);
          await wait(2 * DURATION);
        });
        const [reads] = geometryReadsOf(samples, DRAWN_READS);
        const events = await takeTraceOf(tag);
        const keptEnd = events.find(
          ({ event, target }) =>
            event === 'TrackEnded' &&
            target === (keptCell === 4 ? 'PositionX' : 'Transform')
        );
        const afterCancel = reads.filter(
          ({ timeMs }) =>
            timeMs > cancelledAtMs + 3 * FRAME_MS &&
            timeMs < (keptEnd?.monotonicTimeMs ?? Infinity) - FRAME_MS
        );
        console.log(
          'RuntimeTestsGeometryCancel ' +
            JSON.stringify({
              trackName,
              trace: summarize(events.filter(isHostEvent)),
              cancelledAtMs,
              reads,
            })
        );
        expect(afterCancel.length > 2).toBe(true);
        const keptValues = afterCancel.map(
          ({ drawnMatrix }) => drawnMatrix![keptCell]
        );
        for (const [index, { drawnMatrix }] of afterCancel.entries()) {
          expect(
            Math.abs(
              drawnMatrix![cancelledCell] - geometryCancel.cancelledEnd
            ) < POSITION_TOLERANCE
          ).toBe(true);
          expect(keptValues[index] > geometryCancel.kept.from).toBe(true);
          expect(keptValues[index] < geometryCancel.kept.to).toBe(true);
          if (index > 0) {
            expect(keptValues[index] >= keptValues[index - 1]).toBe(true);
          }
        }
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'the scene of Objective 10B item 1 plus a position change on the same view gives the same frames as the frame driver',
    async () => {
      const caseName =
        'an ordered rotation and translation and a position change';
      const { events } = await playCase(caseName, {
        flow: 'layout',
        leaves: { originX: { duration: LONG } },
        operations: [
          ['rotate', '0deg', '90deg', { duration: LONG }],
          ['translateX', 0, 50, { duration: LONG }],
        ],
        places: [AT_START, AT_END],
        totalMs: LONG,
      });
      expect(summarize(events.filter(({ event }) => event === 'Ended'))).toBe(
        'Ended:Finished:None'
      );
      await render(null);
    }
  );

  movingGeometryTest(
    'a Fabric layout write during a position track keeps the offset relative to the new frame',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: 3 * DURATION, onlyWhenChanged: true },
          originY: { duration: 0, onlyWhenChanged: true },
        },
        { name: 'position' }
      );
      const tag = await renderBox({ layout });
      let writtenAtMs = 0;
      const samples = await recordDrawnValues(tag, DRAWN_READS, async () => {
        await render(<Scene left={END_LEFT} layout={layout} />);
        await wait(0.4 * 3 * DURATION);
        writtenAtMs = await renderedAt(
          <Scene left={END_LEFT} top={END_TOP} layout={layout} />
        );
        await wait(2.5 * DURATION);
      });
      const [reads] = geometryReadsOf(samples, DRAWN_READS);
      const events = await takeTraceOf(tag);
      const xEnd = events.find(
        ({ event, target }) => event === 'TrackEnded' && target === 'PositionX'
      );
      const afterWrite = reads.filter(
        ({ timeMs }) =>
          timeMs > writtenAtMs + 3 * FRAME_MS &&
          timeMs < (xEnd?.monotonicTimeMs ?? Infinity) - FRAME_MS
      );
      console.log(
        'RuntimeTestsLayoutWrite ' +
          JSON.stringify({
            trace: summarize(events.filter(isHostEvent)),
            reads,
          })
      );
      expect(afterWrite.length > 2).toBe(true);
      const drawnX = afterWrite.map((read) => cornersOf(read)[0][0]);
      // The first read is before the write: its top is the top of the scene in the parent of the frame.
      const sceneTop = reads[0].frame![1];
      for (const [index, read] of afterWrite.entries()) {
        expect(isOnGrid(read.frame![1] - sceneTop, END_TOP)).toBe(true);
        expect(Math.abs(read.drawnMatrix![5]) < POSITION_TOLERANCE).toBe(true);
        expect(drawnX[index] > START_LEFT).toBe(true);
        const trackEndX = read.frame![0];
        expect(drawnX[index] < trackEndX).toBe(true);
        if (index > 0) {
          expect(drawnX[index] >= drawnX[index - 1]).toBe(true);
        }
      }
      const last = reads[reads.length - 1];
      expect(
        Math.abs(cornersOf(last)[0][0] - END_LEFT) < POSITION_TOLERANCE
      ).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest(
    'a Fabric transform write during a position track shows the new transform at once',
    async () => {
      const tag = await renderBox();
      const written = 20 * DEGREE;
      let writtenAtMs = 0;
      const samples = await recordDrawnValues(tag, DRAWN_READS, async () => {
        await render(<Scene left={END_LEFT} />);
        await wait(0.4 * DURATION);
        writtenAtMs = await renderedAt(
          <Scene left={END_LEFT} transform={[{ rotate: '20deg' }]} />
        );
        await wait(DURATION);
      });
      const [reads] = geometryReadsOf(samples, DRAWN_READS);
      const firstRotated = reads.findIndex(
        ({ drawnMatrix }) => !isRotation(drawnMatrix!, 0)
      );
      console.log(
        'RuntimeTestsTransformWriteOnPosition ' +
          JSON.stringify({ writtenAtMs, reads })
      );
      expect(firstRotated > 0).toBe(true);
      expect(reads[firstRotated].timeMs < writtenAtMs + 3 * FRAME_MS).toBe(
        true
      );
      for (const { drawnMatrix, frame } of reads.slice(firstRotated)) {
        expect(isRotation(drawnMatrix!, written)).toBe(true);
        expect(isOnGrid(frame![0], END_LEFT)).toBe(true);
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a Fabric transform write during a transform track: the track stays on screen, the new model shows after it',
    async () => {
      const trackEnd = 30 * DEGREE;
      const written = 60 * DEGREE;
      const layout = layoutOf(
        {},
        {
          name: 'track',
          transform: {
            operations: [['rotate', 0, trackEnd, { duration: 3 * DURATION }]],
          },
        }
      );
      const tag = await renderBox({
        layout,
        transform: [{ rotate: `${trackEnd}rad` }],
      });
      let writtenAtMs = 0;
      const samples = await recordDrawnValues(tag, DRAWN_READS, async () => {
        await render(
          <Scene
            left={END_LEFT}
            layout={layout}
            transform={[{ rotate: `${trackEnd}rad` }]}
          />
        );
        await wait(0.4 * 3 * DURATION);
        writtenAtMs = await renderedAt(
          <Scene
            left={END_LEFT}
            layout={layout}
            transform={[{ rotate: `${written}rad` }]}
          />
        );
        expect(await waitForCallbacks(['track:true'], 6 * DURATION)).toBe('');
        await wait(300);
      });
      const [reads] = geometryReadsOf(samples, DRAWN_READS);
      const events = await takeTraceOf(tag);
      const ended = firstEventOf(events, 'TrackEnded');
      console.log(
        'RuntimeTestsTransformWriteOnTransform ' +
          JSON.stringify({
            trace: summarize(events.filter(isHostEvent)),
            writtenAtMs,
            reads,
          })
      );
      const onTrack = reads.filter(
        ({ timeMs }) =>
          timeMs > writtenAtMs + 3 * FRAME_MS &&
          timeMs < ended.monotonicTimeMs - 2 * FRAME_MS
      );
      expect(onTrack.length > 2).toBe(true);
      for (const { drawnMatrix } of onTrack) {
        expect(angleOf(drawnMatrix!) < trackEnd + CELL_TOLERANCE).toBe(true);
      }
      // A draw has a whole-millisecond time, the end event can come after the last draw, and a view at rest
      // draws no more frames.
      const afterTrack = reads.filter(
        ({ timeMs }) => timeMs >= Math.floor(ended.monotonicTimeMs)
      );
      for (const { drawnMatrix } of [...afterTrack, reads[reads.length - 1]]) {
        expect(isRotation(drawnMatrix!, written)).toBe(true);
      }
      await render(null);
    }
  );

  const writeFrames = [-1, 0, 1];
  movingGeometryTest(
    'a Fabric transform write after the last animator update of a transform track: the new model shows from the first drawn frame after it',
    async () => {
      const runs: Record<string, unknown>[] = [];
      for (const writeFrame of writeFrames) {
        runs.push(await playTransformWriteNearTheEnd(writeFrame));
        await render(null);
      }
      const orderBRuns = runs.filter(({ runClass }) => runClass === 'order b');
      console.log(
        'RuntimeTestsTransformWriteAtTheEnd ' +
          JSON.stringify({
            synchronousProps: NATIVE_ANIMATION_ROUTES.synchronousProps,
            postsAnimatorEnd: await postsAnimatorEnd(),
            orderBRuns: orderBRuns.length,
            runs,
          })
      );
    }
  );

  movingGeometryTest(
    'a Fabric transform write that makes the model singular during a transform track',
    async () => {
      const layout = layoutOf(
        {},
        {
          name: 'track',
          transform: {
            operations: [['rotate', 0, 1, { duration: 3 * DURATION }]],
          },
        }
      );
      const tag = await renderBox({ layout, transform: [{ rotate: '1rad' }] });
      let writtenAtMs = 0;
      const samples = await recordDrawnValues(tag, GEOMETRY_READS, async () => {
        await render(
          <Scene
            left={END_LEFT}
            layout={layout}
            transform={[{ rotate: '1rad' }]}
          />
        );
        await wait(0.4 * 3 * DURATION);
        writtenAtMs = await renderedAt(
          <Scene left={END_LEFT} layout={layout} transform={[{ scale: 0 }]} />
        );
        await waitForCallbacks(1, 6 * DURATION);
        await wait(300);
      });
      const events = await takeTraceOf(tag);
      console.log(
        'RuntimeTestsSingularModelWrite ' +
          JSON.stringify({
            trace: summarize(events),
            callbacks,
            writtenAtMs,
            sample: await sample(tag, 'Transform'),
            reads: geometryReadsOf(samples, GEOMETRY_READS)[0],
          })
      );
      await render(null);
    }
  );

  const SKEW_TRACK_MS = 3 * DURATION;
  const skewWrites: [string, string, BoxProps, BoxProps['transform']][] = [
    [
      'a position track',
      'PositionX',
      {
        left: END_LEFT,
        layout: layoutOf(
          {
            originX: { duration: SKEW_TRACK_MS },
            originY: { duration: SKEW_TRACK_MS },
          },
          { name: 'track' }
        ),
      },
      undefined,
    ],
    [
      'a transform track',
      'Transform',
      {
        left: END_LEFT,
        layout: layoutOf(
          {},
          {
            name: 'track',
            transform: {
              operations: [['rotate', 0, 1, { duration: SKEW_TRACK_MS }]],
            },
          }
        ),
      },
      [{ rotate: '1rad' }],
    ],
  ];
  for (const [trackName, target, box, modelTransform] of skewWrites) {
    movingGeometryTest(
      `a Fabric transform write with skew during ${trackName}`,
      async () => {
        const tag = await renderBox({
          layout: box.layout,
          transform: modelTransform,
        });
        let beforeWrite: TargetSample | undefined;
        let writtenAtMs = 0;
        let committedAtMs = 0;
        const samples = await recordDrawnValues(
          tag,
          GEOMETRY_READS,
          async () => {
            await render(<Scene {...box} transform={modelTransform} />);
            await wait(0.4 * SKEW_TRACK_MS);
            beforeWrite = await sample(tag, target);
            writtenAtMs = await renderedAt(
              <Scene {...box} transform={[{ skewX: '20deg' }]} />
            );
            await waitForCallbacks(['track:true'], 6 * SKEW_TRACK_MS);
            await wait(300);
            committedAtMs = await renderedAt(
              <Scene {...box} transform={[{ skewX: '10deg' }]} />
            );
            await wait(300);
          }
        );
        const trace = summarize(await takeTraceOf(tag));
        const [reads] = geometryReadsOf(samples, GEOMETRY_READS);
        console.log(
          'RuntimeTestsSkewWrite ' +
            JSON.stringify({
              trackName,
              trace,
              callbacks,
              beforeWrite,
              writtenAtMs,
              committedAtMs,
              reads,
            })
        );
        expect(
          beforeWrite!.playbacks.some(
            (playback) =>
              playback.target === target && playback.owner === 'Layout'
          )
        ).toBe(true);
        expect(trace.includes(`TrackEnded:${target}:false`)).toBe(true);
        const committed = reads.filter(({ timeMs }) => timeMs >= committedAtMs);
        expectSkewFrom(committed, 10 * DEGREE, committedAtMs);
        if (target === 'PositionX') {
          const written = reads.filter(({ timeMs }) => timeMs < committedAtMs);
          expectSkewFrom(written, 20 * DEGREE, writtenAtMs);
        }
        await render(null);
      }
    );
  }

  if (WRITES_ANIMATION_MATRIX) {
    movingGeometryTest(
      'a Fabric transform write with skew after the last animator update of a position track: the skew shows from the first drawn frame after it and stays',
      async () => {
        const postsEnd = await postsAnimatorEnd();
        const runs: SkewWriteRun[] = [];
        for (let index = 0; index < SKEW_WRITE_RUN_CAP; index++) {
          const isExtraRun = index >= writeFrames.length;
          const hasOrderB = runs.some(({ runClass }) => runClass === 'order b');
          if (isExtraRun && (postsEnd !== true || hasOrderB)) {
            break;
          }
          runs.push(
            await playSkewWriteNearTheEnd(isExtraRun ? 0 : writeFrames[index])
          );
          await render(null);
        }
        const orderBRuns = runs.filter(
          ({ runClass }) => runClass === 'order b'
        );
        console.log(
          'RuntimeTestsSkewWriteAtTheEnd ' +
            JSON.stringify({
              synchronousProps: NATIVE_ANIMATION_ROUTES.synchronousProps,
              postsAnimatorEnd: postsEnd,
              status: orderBStatusOf(postsEnd, orderBRuns.length),
              classes: runs.map(({ writeFrame, runClass }) => ({
                writeFrame,
                runClass,
              })),
            })
        );
        expect(runs.flatMap(({ faults }) => faults).join('; ')).toBe('');
      }
    );
  }

  const transformEnds: [string, Operation[]][] = [
    [
      'a scale and a rotation',
      [
        ['scale', 1, 0.5],
        ['rotate', '0deg', '30deg'],
      ],
    ],
    [
      'a scaleX, a scaleY, and a rotation',
      [
        ['scaleX', 1, 0.5],
        ['scaleY', 1, 0.5],
        ['rotate', '0deg', '30deg'],
      ],
    ],
  ];
  const endModels: number[][] = [];
  for (const [formName, operations] of transformEnds) {
    movingGeometryTest(
      `a transform track that ends at a scale of 0.5 and a rotation of 30 deg plays natively and draws as the frame driver: ${formName}`,
      async () => {
        let model: number[] = [];
        const played = await playGeometryPair({
          operations,
          width: 200,
          height: 100,
          durationMs: 3 * DURATION,
          atMiddle: async (tag) => {
            model = (await sample(tag, 'Transform')).model;
          },
        });
        expect(summarize(played.events.filter(isHostEvent).slice(0, 5))).toBe(
          'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted'
        );
        const common = endCellsOf(operations);
        for (const cell of TRANSFORM_SAMPLE_CELLS) {
          const tolerance = cell === 12 || cell === 13 ? 0.01 : 1e-4;
          expect(Math.abs(model[cell] - common[cell]) < tolerance).toBe(true);
        }
        console.log(
          'RuntimeTestsTransformModelCells ' +
            JSON.stringify({ formName, model, common, cell10: model[10] })
        );
        endModels.push(model);
        if (endModels.length === transformEnds.length) {
          for (const cell of TRANSFORM_SAMPLE_CELLS) {
            expect(
              Math.abs(endModels[0][cell] - endModels[1][cell]) < 1e-4
            ).toBe(true);
          }
        }
        expectCornersAsTwin(formName, played, angleOf);
        expectCornersOnTimeline(formName, played);
        await render(null);
      }
    );
  }

  const smallScaleName = 'a final scale of 0.02';
  movingGeometryTest(
    `${smallScaleName} with a transform track plays natively`,
    async () => {
      // A `scale` scales Z too (React Native `conversions.h`), and Android mounts a matrix with a 3D
      // determinant under 1e-5 as scale 0 (measured for scale 0.02: the model cells 0), so the case scales X
      // and Y.
      const played = await playGeometryPair({
        operations: [
          ['scaleX', 1, 0.02],
          ['scaleY', 1, 0.02],
        ],
        durationMs: 3 * DURATION,
      });
      const { model } = await sample(played.tag, 'Transform');
      console.log(
        `RuntimeTestsSmallScaleModel ${JSON.stringify({ model, events: summarize(played.events.filter(isHostEvent)) })}`
      );
      expect(summarize(played.events.filter(isHostEvent).slice(0, 5))).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Transform > Admitted'
      );
      expectCornersAsTwin(smallScaleName, played, ([scaleX]) => -scaleX);
      expectCornersOnTimeline(smallScaleName, played);
      await render(null);
    }
  );
});

const TRACK_END_ANGLE = Math.PI / 6;
const WRITTEN_ANGLE = Math.PI / 3;
const WRITE_TRACK_MS = 600;

type TransformWrite = {
  angle: SharedValue<number>;
  writeAtMs: SharedValue<number>;
  writtenAtMs: SharedValue<number>;
};
let transformWrite: TransformWrite | undefined;

const WRITE_TRACK_LAYOUT = layoutOf(
  {},
  {
    name: 'track',
    transform: {
      operations: [
        ['rotate', 0, TRACK_END_ANGLE, { duration: WRITE_TRACK_MS }],
      ],
    },
  }
);

/**
 * A box with a native transform track and an animated rotation. The first frame
 * at or after `writeAtMs` (animation clock) writes `WRITTEN_ANGLE`.
 */
function TransformWriteBox({ left }: { left: number }) {
  const angle = useSharedValue(TRACK_END_ANGLE);
  const writeAtMs = useSharedValue(Infinity);
  const writtenAtMs = useSharedValue(-1);
  transformWrite = { angle, writeAtMs, writtenAtMs };
  const ref = useTestRef(BOX_REF);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}rad` }],
  }));
  useFrameCallback(({ timestamp }) => {
    'worklet';
    if (writtenAtMs.value < 0 && timestamp >= writeAtMs.value) {
      angle.value = WRITTEN_ANGLE;
      writtenAtMs.value = timestamp;
    }
  });
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={WRITE_TRACK_LAYOUT}
        style={[styles.box, { marginLeft: left }, animatedStyle]}
      />
    </View>
  );
}

/**
 * The first draw at or after a write plus `ORDER_B_WRITE_DRAW_DELAY_MS`, or the
 * last draw when there is no such draw (measured on Android: no draw comes
 * after the draw of the write when no value changes after it).
 */
function firstDrawAfterWriteOf(
  draws: { timeMs: number }[],
  writtenUptimeMs: number
) {
  const index = draws.findIndex(
    ({ timeMs }) => timeMs >= writtenUptimeMs + ORDER_B_WRITE_DRAW_DELAY_MS
  );
  return index < 0 ? draws.length - 1 : index;
}

/**
 * One run of the order-b form (design 5.2 item 6 and 5.3 item 7): the write
 * comes in the frame `writeFrame` frames after the declared end of the track.
 * The run class comes from the draw before the frame of the write and the draw
 * of that frame.
 */
async function playTransformWriteNearTheEnd(writeFrame: number) {
  const tag = await mountScene(<TransformWriteBox left={START_LEFT} />);
  const write = transformWrite!;
  const samples = await recordDrawnValues(tag, ['drawnMatrix'], async () => {
    await render(<TransformWriteBox left={END_LEFT} />);
    const events = await takeTraceUntil((taken) =>
      taken.some(
        ({ event, tag: eventTag }) => event === 'Received' && eventTag === tag
      )
    );
    const { originTimestampMs } = firstEventOf(
      events.filter((event) => event.tag === tag),
      'Received'
    );
    write.writeAtMs.value =
      originTimestampMs! + WRITE_TRACK_MS + writeFrame * FRAME_MS;
    await waitForCallbacks(['track:true'], 3 * WRITE_TRACK_MS);
    await wait(300);
  });
  const clockOffset = await narrowClockOffset(tag);
  const events = await takeTraceOf(tag);
  const writtenUptimeMs =
    write.writtenAtMs.value + (clockOffset.from + clockOffset.to) / 2;
  const draws = samples.map(({ timeMs, values }) => ({
    timeMs,
    angle: angleOf(values),
    values,
  }));
  const step = (TRACK_END_ANGLE * FRAME_MS) / WRITE_TRACK_MS;
  const isTrackValue = (angle: number) =>
    Math.abs(angle - TRACK_END_ANGLE) > step &&
    Math.abs(angle - WRITTEN_ANGLE) > CELL_TOLERANCE;
  const atWrite = draws.findIndex(({ timeMs }) => timeMs >= writtenUptimeMs);
  const before = draws[atWrite - 1];
  const runClass =
    atWrite < 1
      ? 'not classified'
      : isTrackValue(draws[atWrite].angle)
        ? 'earlier frame'
        : isTrackValue(before.angle)
          ? 'order b'
          : 'later frame';
  const firstWritten =
    runClass === 'earlier frame'
      ? draws.findIndex(
          ({ angle }, index) => index >= atWrite && !isTrackValue(angle)
        )
      : firstDrawAfterWriteOf(draws, writtenUptimeMs);
  const model = (await sample(tag, 'Transform')).model;
  console.log(
    'RuntimeTestsTransformWriteRun ' +
      JSON.stringify({
        writeFrame,
        runClass,
        writtenAtMs: write.writtenAtMs.value,
        writtenUptimeMs,
        clockOffset,
        trace: summarize(events),
        draws,
      })
  );
  expect(runClass !== 'not classified').toBe(true);
  expect(firstWritten >= atWrite).toBe(true);
  for (const { angle } of draws.slice(firstWritten)) {
    expect(Math.abs(angle - WRITTEN_ANGLE) < CELL_TOLERANCE).toBe(true);
  }
  expect(Math.abs(angleOf(model) - WRITTEN_ANGLE) < CELL_TOLERANCE).toBe(true);
  return { writeFrame, runClass };
}

const SKEW_WRITE_TRACK_MS = 600;
const SKEW_WRITE_RUN_CAP = 10;
const WRITTEN_SKEW = Math.tan(20 * (Math.PI / 180));
const skewWriteAtMs = makeMutable(Infinity);
const skewWrittenAtMs = makeMutable(-1);

const SKEW_WRITE_TRACK_LAYOUT = layoutOf(
  { originX: { duration: SKEW_WRITE_TRACK_MS, easing: Easing.linear } },
  { name: 'track' }
);

/**
 * A box with a native position track and an animated skew. The first frame at
 * or after `skewWriteAtMs` (animation clock) writes the skew.
 */
function SkewWriteBox({ left }: { left: number }) {
  const ref = useTestRef(BOX_REF);
  const isSkewed = useSharedValue(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: isSkewed.value ? [{ skewX: '20deg' }] : [],
  }));
  useFrameCallback(({ timestamp }) => {
    'worklet';
    if (skewWrittenAtMs.value < 0 && timestamp >= skewWriteAtMs.value) {
      isSkewed.value = true;
      skewWrittenAtMs.value = timestamp;
    }
  });
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={SKEW_WRITE_TRACK_LAYOUT}
        style={[styles.box, { marginLeft: left }, animatedStyle]}
      />
    </View>
  );
}

type SkewWriteRun = { writeFrame: number; runClass: string; faults: string[] };

/**
 * One run of the order-b form with a skew write on a position track. The draws
 * before the update of fraction 1 show a track offset of the drawn centre; a
 * skew about the centre does not move it
 * (`SkewMatrixHelper.buildAffine2DMatrix` of React Native).
 */
async function playSkewWriteNearTheEnd(
  writeFrame: number
): Promise<SkewWriteRun> {
  skewWriteAtMs.value = Infinity;
  skewWrittenAtMs.value = -1;
  const tag = await mountScene(<SkewWriteBox left={START_LEFT} />);
  const samples = await recordDrawnValues(tag, DRAWN_READS, async () => {
    await render(<SkewWriteBox left={END_LEFT} />);
    const events = await takeTraceUntil((taken) =>
      taken.some(
        ({ event, tag: eventTag }) => event === 'Received' && eventTag === tag
      )
    );
    const { originTimestampMs } = firstEventOf(
      events.filter((event) => event.tag === tag),
      'Received'
    );
    skewWriteAtMs.value =
      originTimestampMs! + SKEW_WRITE_TRACK_MS + writeFrame * FRAME_MS;
    await waitForCallbacks(['track:true'], 3 * SKEW_WRITE_TRACK_MS);
    await wait(300);
  });
  const clockOffset = await narrowClockOffset(tag);
  const events = await takeTraceOf(tag);
  const writtenUptimeMs =
    skewWrittenAtMs.value + (clockOffset.from + clockOffset.to) / 2;
  const draws = geometryReadsOf(samples, DRAWN_READS)[0].map((read) => ({
    timeMs: read.timeMs,
    offset: drawnCentreOf(read)[0] - (read.frame![0] + read.frame![2] / 2),
    skew: read.drawnMatrix![2],
  }));
  const isTrackValue = ({ offset }: (typeof draws)[number]) =>
    Math.abs(offset) > TRACK_OFFSET_TOLERANCE;
  const isSkewed = ({ skew }: (typeof draws)[number]) =>
    Math.abs(skew - WRITTEN_SKEW) < CELL_TOLERANCE;
  const atWrite = draws.findIndex(({ timeMs }) => timeMs >= writtenUptimeMs);
  const runClass =
    atWrite < 1
      ? 'not classified'
      : isTrackValue(draws[atWrite])
        ? 'earlier frame'
        : isTrackValue(draws[atWrite - 1])
          ? 'order b'
          : 'later frame';
  const firstWritten =
    runClass === 'earlier frame'
      ? draws.findIndex(
          (draw, index) => index >= atWrite && !isTrackValue(draw)
        )
      : firstDrawAfterWriteOf(draws, writtenUptimeMs);
  console.log(
    'RuntimeTestsSkewWriteRun ' +
      JSON.stringify({
        writeFrame,
        runClass,
        writtenAtMs: skewWrittenAtMs.value,
        writtenUptimeMs,
        clockOffset,
        trace: summarize(events),
        draws,
      })
  );
  const faults = [
    ...(runClass === 'not classified' ? ['the run has no class'] : []),
    ...(firstWritten < atWrite ? ['no draw after the track end'] : []),
    ...draws
      .slice(Math.max(0, firstWritten))
      .filter((draw) => !isSkewed(draw))
      .map(
        ({ timeMs, skew }) =>
          `frame ${writeFrame} (${runClass}): the draw at ${timeMs} ms has the skew cell ${skew}`
      ),
  ];
  return { writeFrame, runClass, faults };
}

// Above the 4 decimals of the sampler and below the travel of the track in one frame.
const TRACK_OFFSET_TOLERANCE = 0.01;

function orderBStatusOf(postsEnd: boolean | null, orderBRunCount: number) {
  if (postsEnd === null) {
    return 'unknown';
  }
  if (!postsEnd) {
    return 'order b cannot occur on this device';
  }
  return orderBRunCount > 0 ? 'order b reached' : 'order b not reached';
}

const CURVE_DURATION = 1000;

describe('native layout curves against the declared timeline', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  // The four control sets that an Android phone run logged (`interp controls=`) and the default easing of
  // `withTiming`.
  const curves: [string, Leaf['easing'], EasingFunction][] = [
    ...(
      [
        [0.25, 0.1, 0.25, 1],
        [0.3, -0.5, 0.7, 1.5],
        [1 / 3, 1.4, 2 / 3, -0.3],
        [0.68, -0.6, 0.32, 1.6],
      ] as const
    ).map(([x1, y1, x2, y2]): [string, Leaf['easing'], EasingFunction] => {
      const easing = Easing.bezier(x1, y1, x2, y2);
      return [
        `Easing.bezier(${x1}, ${y1}, ${x2}, ${y2})`,
        easing,
        curveOf(easing),
      ];
    }),
    ['the default easing', 'default', DEFAULT_EASING.curve],
  ];
  for (const [curveName, easing, curve] of curves) {
    for (const distance of [200, 393]) {
      movingGeometryTest(
        `${curveName} on a move of ${distance} pt: each sample is within 0.5 pt of the curve at its read time`,
        async () => {
          const layout = layoutOf({
            originX: { duration: CURVE_DURATION, easing },
            originY: { duration: CURVE_DURATION },
          });
          const tag = await renderBox({ layout });
          const clockOffset = await narrowClockOffset(tag);
          await render(<Scene left={START_LEFT + distance} layout={layout} />);
          const startedMs = performance.now();
          const samples: TargetSample[] = [];
          while (performance.now() - startedMs < CURVE_DURATION + 100) {
            samples.push(await sample(tag, 'PositionX'));
            await wait(FRAME_MS);
          }
          const events = await takeTraceOf(tag);
          const origin = nativeOriginOf(
            events,
            firstEventOf(events, 'Received'),
            clockOffset
          );
          const valueAt = (timeMs: number) =>
            centerOf(START_LEFT) +
            distance * curve(Math.min(1, Math.max(0, timeMs / CURVE_DURATION)));
          const residuals = samples.map(({ presentation, monotonicTimeMs }) => {
            const { from, to } = frameTimesOf(
              { from: monotonicTimeMs, to: monotonicTimeMs },
              origin
            );
            const { low, high } = curveBandOf(valueAt, from, to);
            const shown = presentation[0];
            return Math.max(0, low - shown, shown - high);
          });
          console.log(
            'RuntimeTestsLayoutCurve ' +
              JSON.stringify({
                curveName,
                distance,
                largest: Math.max(...residuals),
                origin,
                samples: samples.length,
              })
          );
          expect(samples.length > 10).toBe(true);
          for (const residual of residuals) {
            expect(residual < POSITION_TOLERANCE).toBe(true);
          }
          await render(null);
        }
      );
    }
  }
});

const THROWING_BUILDER = 'thrower';

/**
 * The view has a live frame-driven animation: the refusal of its start, no
 * native command, no playback in two reads, and models of the two reads that
 * differ and are not at the end.
 */
function frameDrivenStateFaultOf(
  events: TraceEvent[],
  [first, second]: TargetSample[]
) {
  if (!events.some(({ event }) => event === 'LayoutBuildFailed')) {
    return `the control start has no refusal: ${summarize(events)}`;
  }
  if (events.some(({ event }) => event === 'Admitted')) {
    return `the control start has a native command: ${summarize(events)}`;
  }
  if (first.playbacks.length > 0 || second.playbacks.length > 0) {
    return 'the view has a native playback';
  }
  const [firstX, secondX] = [first.model[0], second.model[0]];
  if (firstX === secondX) {
    return `the model stays at ${firstX} from ${first.monotonicTimeMs} ms to ${second.monotonicTimeMs} ms`;
  }
  return Math.abs(secondX - centerOf(END_LEFT)) < POSITION_TOLERANCE
    ? 'the frame-driven animation of the view is at its end'
    : '';
}

function throwingLayout(): never {
  'worklet';
  scheduleOnRN(recordBuilderCall, THROWING_BUILDER);
  throw new Error('RuntimeTests: a layout builder that throws');
}

describe('a layout builder that throws', () => {
  if (__DEV__) {
    return;
  }

  const throwerCalls = () =>
    layoutBuilderCalls.filter((name) => name === THROWING_BUILDER).length;

  test('a builder that throws on the native candidate path runs one time', async () => {
    const tag = await renderBox({ layout: throwingLayout });
    const callsBefore = throwerCalls();
    await render(<Scene left={END_LEFT} layout={throwingLayout} />);
    await wait(DURATION * 1.5);
    console.log(
      'RuntimeTestsThrowingBuilder ' +
        JSON.stringify({
          path: 'native candidate',
          trace: summarize(await takeTraceOf(tag)),
          callbacks,
          model: (await sample(tag, 'PositionX')).model,
        })
    );
    expect(throwerCalls() - callsBefore).toBe(1);
    await render(null);
  });

  test('a builder that throws on the frame-driven control runs one time', async () => {
    const spring = layoutOf(
      { originX: { isFrameDrivenSpring: true } },
      { name: 'spring' }
    );
    const tag = await renderBox({ layout: spring });
    await render(<Scene left={END_LEFT} layout={spring} />);
    await wait(50);
    await render(<Scene left={END_LEFT} layout={throwingLayout} />);
    const firstRead = await sample(tag, 'PositionX');
    await wait(3 * FRAME_MS);
    const secondRead = await sample(tag, 'PositionX');
    expect(
      frameDrivenStateFaultOf(await takeTraceOf(tag), [firstRead, secondRead])
    ).toBe('');
    const callsBefore = throwerCalls();
    await render(<Scene left={START_LEFT} layout={throwingLayout} />);
    await wait(DURATION * 1.5);
    console.log(
      'RuntimeTestsThrowingBuilder ' +
        JSON.stringify({
          path: 'frame-driven control',
          trace: summarize(await takeTraceOf(tag)),
          callbacks,
          model: (await sample(tag, 'PositionX')).model,
        })
    );
    expect(throwerCalls() - callsBefore).toBe(1);
    await render(null);
  });
});

describeThrownMountItem('ignorable');
