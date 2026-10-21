/*
 * The Android mount window of native layout starts: a start of a pull runs in the `didMountItems` of the
 * dispatch that mounts its final state, and the first drawn frame of
 * each start, replacement, hand-over, hide, and natural end. The draw checks read the records of
 * the view sampler (`viewSampler.ts`): each draw of the window, with its uptime, on the clock of the trace and
 * of the animation timestamps. Each case logs its draw records (`logDrawnValues`), and the cases that record a
 * result log a `RuntimeTestsMountWindow` line.
 *
 * Not proved: the pixels on screen (the phone recording of section 5.2 links them to the trace), a value that
 * the window does not draw, 120 Hz.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  LinearTransition,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
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
  DispatchAttachRecord,
  OutsideDispatchAttachRecord,
} from '../../../ReJest/secondSurface';
import {
  attachPrerenderedSurface,
  attachRootViewInNextDispatch,
  attachRootViewOutsideDispatch,
  prerenderSecondSurface,
  queuedPullItemsOf,
  startDispatchRecord,
  startSecondSurface,
  startSurfaceWithoutRootView,
  stopSecondSurface,
  stopSurfaceWithoutRootView,
  takeDispatchRecord,
  takePrerenderedDraws,
} from '../../../ReJest/secondSurface';
import type { DrawnSample, RecordedProperty } from '../viewSampler';
import {
  drawnPointOf,
  logDrawnValues,
  postsAnimatorEnd,
  recordDrawnValues,
  uptimeMs,
  valueCountOf,
} from '../viewSampler';
import { blockUIThread } from './nativeLayoutLoad';
import type { BoxProps, TargetSample, TraceEvent } from './nativeLayoutTestKit';
import {
  Box,
  BOX_REF,
  BOX_SIZE,
  callbackOf,
  callbacks,
  DURATION,
  END_LEFT,
  END_OPACITY,
  entryExitOf,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  hasNativeLayoutRoute,
  isHostEvent,
  isNear,
  isOfCommand,
  LAYOUT_DURATION,
  layoutBuilderCalls,
  layoutOf,
  mountScene,
  MOUNTS_IN_DISPATCHES,
  NATIVE_ANIMATION_ROUTES,
  ORDER_B_WRITE_DRAW_DELAY_MS,
  NATIVE_START,
  opacities,
  OPACITY_TOLERANCE,
  POSITION_TOLERANCE,
  REPEATED_STARTS,
  resetCallbacks,
  routeOf,
  Row,
  ROW_REFS,
  sample,
  SECOND_BOX_REF,
  secondSurfaceSceneOf,
  setSecondSurfaceBox,
  START_LEFT,
  START_OPACITY,
  styles,
  summarize,
  takeTrace,
  takeTraceUntil,
  takeTraceUntilSurfaceClosed,
  waitForCallbacks,
  withTimeout,
  WriterBox,
  movingGeometryTest,
} from './nativeLayoutTestKit';

const RECORD_MARKER = 'RuntimeTestsMountWindow';
const SETTLE_MS = 300;
const START_REFUSED = 'LayoutStartRefused:Rejected:TargetUnavailable';

const ENTER_MS = 600;
const ENTERING_REF = 'NativeLayoutMountWindowEntering';
const SURFACE_ENTERING_NAME = 'surface entering';
const SURFACE_ENTERING = entryExitOf(
  { opacity: { initial: 0, to: 1, duration: ENTER_MS } },
  { name: SURFACE_ENTERING_NAME }
);
// The extremes of the lag of the frame driver from the refusal, measured on iOS; the first Android run
// measures them.
const FRAME_DRIVER_EARLY_MS = 2 * FRAME_MS;
const FRAME_DRIVER_LATE_MS = 5 * FRAME_MS;
const QUEUED_PULL_WAIT_MS = 2000;
const ATTACH_WAIT_MS = 3000;

const FIRST_REF = 'NativeLayoutMountWindowFirst';
const SECOND_REF = 'NativeLayoutMountWindowSecond';
const FIRST_NAME = 'first';
const SECOND_NAME = 'second';
const TWO_COMMIT_LAYOUTS = {
  first: layoutOf({ originX: {}, originY: {} }, { name: FIRST_NAME }),
  second: layoutOf({ originX: {}, originY: {} }, { name: SECOND_NAME }),
};
const SAME_VIEW_DURATION = 2 * DURATION;
const SAME_VIEW_NAME = 'same view';
const SAME_VIEW_LAYOUT = LinearTransition.duration(SAME_VIEW_DURATION)
  .easing(Easing.linear)
  .withCallback(callbackOf(SAME_VIEW_NAME));
const SAME_VIEW_SPEED = (2 * END_LEFT - START_LEFT) / SAME_VIEW_DURATION;

const STOPPED_SURFACE_NAME = 'stopped surface';
const StoppedSurfaceScene = secondSurfaceSceneOf({
  layout: layoutOf(
    { originX: { duration: LAYOUT_DURATION } },
    { name: STOPPED_SURFACE_NAME }
  ),
});
const STOP_DELAYS_IN_FRAMES = [0, 1, 2];

const REWRITE_NAME = 'rewrite';
const REWRITE_LAYOUT = layoutOf(
  { opacity: { duration: DURATION, initial: 0.9, to: 0.5 } },
  { name: REWRITE_NAME }
);
const REWRITE_RUNS = 10;
const REWRITE_BLOCK_MS = 40;
const REWRITTEN_OPACITY = 0.8;

const BATCH_SIZE = 20;
const BATCH_SPEED = (END_LEFT - START_LEFT) / LAYOUT_DURATION;

const REPLACED_DURATION = 2 * DURATION;
const REPLACED_END = 2 * END_LEFT;
const REPLACED_LAYOUT = layoutOf({
  originX: { duration: REPLACED_DURATION },
  originY: { duration: REPLACED_DURATION },
});
const REPLACED_SPEED = (REPLACED_END - START_LEFT) / REPLACED_DURATION;

const HAND_OVER_DURATION = 2 * DURATION;
const NATIVE_X = layoutOf({ originX: { duration: HAND_OVER_DURATION } });
const FRAME_DRIVEN_X = layoutOf({
  originX: { duration: HAND_OVER_DURATION, hasCallback: true },
});

const NATIVE_FADE = layoutOf(
  {
    originX: { duration: LAYOUT_DURATION },
    opacity: {
      duration: LAYOUT_DURATION,
      initial: START_OPACITY,
      to: END_OPACITY,
    },
  },
  { name: 'native' }
);
const FRAME_DRIVEN_FADE = layoutOf(
  {
    originX: { duration: LAYOUT_DURATION, hasCallback: true },
    opacity: {
      duration: LAYOUT_DURATION,
      initial: 'none',
      to: END_OPACITY,
      hasCallback: true,
    },
  },
  { name: 'frame' }
);

const SHARED_ENTER_MS = 2000;
const SHARED_SOURCE_REF = 'NativeLayoutMountWindowSharedSource';
const SHARED_TRANSITION = SharedTransition.duration(600);
const SHARED_ENTERING = entryExitOf(
  { opacity: { initial: 0, to: 1, duration: SHARED_ENTER_MS } },
  { name: 'shared' }
);

const END_DURATION = 500;
const END_NAME = 'end';
const WRITE_FRACTION = 0.4;
const WRITTEN_OPACITY = 0.6;
const SECOND_VIEW_MS = 3 * END_DURATION;
// A draw comes at most this long after the end of the track before it is of a frame after the last animator
// update: one frame of draw lag and one frame of animator end. The first Android run measures both.
const MODEL_DRAW_LATENESS_MS = 2 * FRAME_MS;
const OPACITY_STEP = ((START_OPACITY - END_OPACITY) * FRAME_MS) / END_DURATION;

type EndTrack = 'natural end' | 'end of a delayed zero-duration track';
type EndWrite = 'no write' | 'Fabric write' | 'synchronous write';

const END_TRACKS: EndTrack[] = [
  'natural end',
  'end of a delayed zero-duration track',
];
const END_LAYOUTS: Record<EndTrack, LayoutAnimationFunction> = {
  'natural end': layoutOf(
    {
      opacity: {
        duration: END_DURATION,
        initial: START_OPACITY,
        to: END_OPACITY,
      },
    },
    { name: END_NAME }
  ),
  'end of a delayed zero-duration track': layoutOf(
    {
      opacity: {
        delays: [END_DURATION],
        duration: 0,
        initial: START_OPACITY,
        to: END_OPACITY,
      },
    },
    { name: END_NAME }
  ),
};
const END_WRITES: EndWrite[] = [
  'no write',
  'Fabric write',
  ...(NATIVE_ANIMATION_ROUTES.synchronousProps
    ? (['synchronous write'] as const)
    : []),
];

const ORDER_B_OPACITY = 0.8;
const ORDER_B_NAME = 'order b';
const ORDER_B_LAYOUT = layoutOf(
  {
    opacity: {
      duration: END_DURATION,
      initial: START_OPACITY,
      to: END_OPACITY,
    },
  },
  { name: ORDER_B_NAME }
);
const ORDER_B_OFFSETS_IN_FRAMES = [0, -1, 1];
const ORDER_B_RUN_CAP = 10;
const orderBWriteAtMs = makeMutable(0);
const orderBWrittenAtMs = makeMutable(0);

let setFirstLeft: (left: number) => void = () => {};
let setSecondLeft: (left: number) => void = () => {};
let setSameViewLeft: (left: number) => void = () => {};

describe('native layout mount window', () => {
  if (!MOUNTS_IN_DISPATCHES || !hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a start mounts its final state and is admitted in the didMountItems of its dispatch',
    async () => {
      const tag = await mountScene(<PlaceScene left={START_LEFT} />);
      let renderStartMs = 0;
      const samples = await recordDrawnValues(
        tag,
        PLACE_PROPERTIES,
        async () => {
          renderStartMs = await uptimeMs();
          await render(<PlaceScene left={END_LEFT} />);
          await wait(DURATION + SETTLE_MS);
        }
      );
      logDrawnValues('a start in its dispatch', samples, renderStartMs);
      const events = await takeTrace();
      const ofView = events.filter((event) => event.tag === tag);
      expect(summarize(ofView.filter(isHostEvent).slice(0, 6))).toBe(
        NATIVE_START
      );
      const pending = requireOf(ofView, 'LayoutStartPending');
      expect(requireOf(ofView, 'LayoutStartMounted').transactionNumber).toBe(
        pending.transactionNumber
      );
      const admitted = requireOf(ofView, 'Admitted');
      const reported = events.find(
        (event) =>
          event.event === 'LayoutMountReported' &&
          event.surfaceId === pending.surfaceId &&
          event.transactionNumber === pending.transactionNumber
      );
      expect(
        reported !== undefined && reported.sequence > admitted.sequence
      ).toBe(true);
      expect(
        freshStartFaultsOf(placeDrawsOf(samples, 1), START_LEFT, END_LEFT).join(
          '; '
        )
      ).toBe('');
      await render(null);
    }
  );

  movingGeometryTest(
    'two commits of one surface in one frame: one result for each command, in pull order, and the drains in one dispatch (record of the pull count)',
    async () => {
      await mountScene(<TwoCommitScene />, FIRST_REF);
      const tags = [FIRST_REF, SECOND_REF].map((refName) =>
        getTestComponent(refName).getTag()
      );
      resetCallbacks();
      await startDispatchRecord();
      setTimeout(() => setFirstLeft(END_LEFT), 0);
      setTimeout(() => setSecondLeft(END_LEFT), 0);
      const events = await takeTraceUntilEnded(tags);
      const dispatches = await takeDispatchRecord();
      const commands = commandResultsOf(events, tags);
      const mounted = events.filter(
        (event) =>
          tags.includes(event.tag) && event.event === 'LayoutStartMounted'
      );
      const admitted = events.filter(
        (event) => tags.includes(event.tag) && event.event === 'Admitted'
      );
      const pulls = pullsOf(mounted, dispatches);
      recordCase('two commits in one frame', {
        commands,
        mountedTransactions: mounted.map(({ tag, transactionNumber }) => [
          tag,
          transactionNumber,
        ]),
        pulls,
        dispatches,
        reports: mountReportsOf(events),
        emptyPulls: 'not recorded; measured: 0 mutations in the second pull',
      });
      expect(commands.length).toBe(2);
      expect(oneDispatchFaultOf(pulls)).toBe('');
      expect(resultCountFaultsOf(commands).join('; ')).toBe('');
      expect(
        mounted.every(
          (event, index) =>
            index === 0 ||
            event.transactionNumber! >= mounted[index - 1].transactionNumber!
        )
      ).toBe(true);
      expect(admitted.map(({ tag }) => tag).join()).toBe(
        mounted.map(({ tag }) => tag).join()
      );
      expect(
        await waitForCallbacks([`${FIRST_NAME}:true`, `${SECOND_NAME}:true`])
      ).toBe('');
      expect(callbacks.length).toBe(2);
      await render(null);
    }
  );

  movingGeometryTest(
    'two pulls of one surface in one dispatch, the second with a second change of the same view: one result for each command, and no drawn frame jumps',
    async () => {
      const tag = await mountScene(<SameViewScene />);
      resetCallbacks();
      let events: TraceEvent[] = [];
      let renderStartMs = 0;
      let dispatches: number[][] = [];
      const samples = await recordDrawnValues(
        tag,
        PLACE_PROPERTIES,
        async () => {
          renderStartMs = await uptimeMs();
          await startDispatchRecord();
          setTimeout(() => setSameViewLeft(END_LEFT), 0);
          setTimeout(() => setSameViewLeft(2 * END_LEFT), 0);
          events = await takeTraceUntilEnded([tag]);
          dispatches = await takeDispatchRecord();
          await wait(SAME_VIEW_DURATION + SETTLE_MS);
        }
      );
      logDrawnValues(
        'a second change of the same view',
        samples,
        renderStartMs
      );
      const commands = commandResultsOf(events, [tag]);
      const pulls = pullsOf(
        events.filter(
          (event) => event.tag === tag && event.event === 'LayoutStartMounted'
        ),
        dispatches
      );
      recordCase('two pulls, a second change of the same view', {
        commands,
        events: summarize(events.filter((event) => event.tag === tag)),
        pulls,
        dispatches,
        reports: mountReportsOf(events),
        callbacks,
        scene: sameViewSceneFaultOf(commands, pulls) || 'two pulls',
      });
      expect(resultCountFaultsOf(commands).join('; ')).toBe('');
      expect(
        jumpFaultsOf(placeDrawsOf(samples, 1), SAME_VIEW_SPEED).join('; ')
      ).toBe('');
      await render(null);
    }
  );

  test('a pull outside a dispatch admits no native start', async () => {
    await takeTrace();
    resetCallbacks();
    const builderCallsBefore = builderCallsOf(SURFACE_ENTERING_NAME);
    const rootTag = await startSurfaceWithoutRootView(EnteringSurface);
    try {
      const queuedBeforeAttach = await waitForQueuedPullItems(rootTag);
      const tag = getTestComponent(ENTERING_REF).getTag();
      const attach = await attachRootViewOutsideDispatch(rootTag);
      const samples = await sampleAtFractions(tag, 'Opacity', ENTER_MS, [
        1 / 3,
        2 / 3,
      ]);
      const events = await takeTrace();
      const ofView = events.filter(
        (event) => event.tag === tag && isHostEvent(event)
      );
      recordCase('a pull outside a dispatch', {
        queuedBeforeAttach,
        attach,
        events: summarize(ofView),
        transactions: ofView.map(({ transactionNumber }) => transactionNumber),
      });
      expect(outsideDispatchSceneFaultOf(queuedBeforeAttach, attach)).toBe('');
      expect(summarize(ofView)).toBe(START_REFUSED);
      const route = routeOf(
        events,
        tag,
        'Opacity',
        samples,
        isOnEnteringTimeline
      );
      expect(route.kind).toBe('frame-driven');
      expect(await waitForCallbacks([`${SURFACE_ENTERING_NAME}:true`])).toBe(
        ''
      );
      expect(builderCallsOf(SURFACE_ENTERING_NAME) - builderCallsBefore).toBe(
        1
      );
    } finally {
      await stopSurfaceWithoutRootView(rootTag);
      await wait(SETTLE_MS);
    }
  });

  test('the entering view of a second surface start: the place of its pull and its route (record)', async () => {
    await takeTrace();
    resetCallbacks();
    const surfaceId = await startSecondSurface(EnteringSurface);
    const tag = getTestComponent(ENTERING_REF).getTag();
    await wait(ENTER_MS + SETTLE_MS);
    const ofView = (await takeTrace()).filter(
      (event) => event.tag === tag && isHostEvent(event)
    );
    recordCase('a second surface start', {
      events: summarize(ofView),
      transactions: ofView.map(({ transactionNumber }) => transactionNumber),
      pullPlace: pullPlaceOf(ofView),
      route: enteringRouteOf(ofView),
      callbacks,
    });
    expect(await waitForCallbacks([`${SURFACE_ENTERING_NAME}:true`])).toBe('');
    await stopSecondSurface(surfaceId);
    await wait(SETTLE_MS);
  });

  test('a prerendered surface with an entering view: no flash, the animation runs on either route, one result, no assert', async () => {
    await takeTrace();
    resetCallbacks();
    const rendered = enteringRender();
    const rootTag = await prerenderSecondSurface(EnteringSurface);
    if ((await withTimeout(rendered, ATTACH_WAIT_MS)) === null) {
      throw new Error(
        `React did not render the prerendered surface in ${ATTACH_WAIT_MS} ms.`
      );
    }
    const tag = getTestComponent(ENTERING_REF).getTag();
    const beforeAttach = await takeTrace();
    await attachPrerenderedSurface(rootTag);
    const reads = await sampleAtFractions(
      tag,
      'Opacity',
      ENTER_MS,
      [0, 0.1, 0.2, 0.4, 0.6, 0.8]
    );
    await wait(ENTER_MS / 2);
    const draws = await takePrerenderedDraws(rootTag);
    const afterAttach = await takeTrace();
    const events = [...beforeAttach, ...afterAttach];
    const ofView = (taken: TraceEvent[]) =>
      taken.filter((event) => event.tag === tag && isHostEvent(event));
    recordCase('a prerendered surface', {
      pullBeforeAttach: summarize(ofView(beforeAttach)),
      pullAfterAttach: summarize(ofView(afterAttach)),
      pullPlace: pullPlaceOf(ofView(events)),
      route: enteringRouteOf(ofView(events)),
      reads: reads.map(({ presentation, playbacks, monotonicTimeMs }) => [
        monotonicTimeMs,
        presentation[0],
        playbacks.length,
      ]),
      draws,
      callbacks,
    });
    expect(drawnFlashFaultsOf(draws, tag).join('; ')).toBe('');
    expect(flashFaultsOf(reads).join('; ')).toBe('');
    expect(await waitForCallbacks([`${SURFACE_ENTERING_NAME}:true`])).toBe('');
    expect(callbacks.join()).toBe(`${SURFACE_ENTERING_NAME}:true`);
    await stopSecondSurface(rootTag);
    await wait(SETTLE_MS);
  });

  test('app code that attaches a root view inside a dispatch', async () => {
    await takeTrace();
    resetCallbacks();
    const rootTag = await startSurfaceWithoutRootView(EnteringSurface);
    try {
      const queuedBeforeAttach = await waitForQueuedPullItems(rootTag);
      const tag = getTestComponent(ENTERING_REF).getTag();
      const attached = attachRootViewInNextDispatch(rootTag);
      await wait(2 * FRAME_MS);
      await render(<DispatchTrigger width={2 * BOX_SIZE} />);
      const attach = await withTimeout(attached, ATTACH_WAIT_MS);
      const reads = await sampleAtFractions(
        tag,
        'Opacity',
        ENTER_MS,
        [0.25, 0.5, 0.75]
      );
      await wait(ENTER_MS / 2);
      await waitForCallbacks(1);
      const events = (await takeTrace()).filter(
        (event) => event.tag === tag && isHostEvent(event)
      );
      const outcome = attachOutcomeOf(
        queuedBeforeAttach,
        attach,
        tag,
        events,
        reads
      );
      recordCase('an attach inside a dispatch', {
        queuedBeforeAttach,
        attach,
        events: summarize(events),
        playbacks: reads.map(({ playbacks }) => playbacks.length),
        callbacks,
        outcome,
      });
      expect(outcome.verdict).toBe('');
    } finally {
      await stopSurfaceWithoutRootView(rootTag);
      await render(null);
    }
  });

  movingGeometryTest(
    'a stop of a second surface in the frame of a commit with a native start: one result for the command',
    async () => {
      for (const delayFrames of STOP_DELAYS_IN_FRAMES) {
        const surfaceId = await startSecondSurface(StoppedSurfaceScene);
        const tag = getTestComponent(SECOND_BOX_REF).getTag();
        await wait(SETTLE_MS);
        await takeTrace();
        resetCallbacks();
        setSecondSurfaceBox({ left: END_LEFT });
        await wait(delayFrames * FRAME_MS);
        await stopSecondSurface(surfaceId);
        const events = await takeTraceUntilSurfaceClosed(surfaceId);
        const commands = commandResultsOf(events, [tag]);
        recordCase('a stop of a second surface', {
          delayFrames,
          commands,
          events: summarize(events.filter((event) => event.tag === tag)),
          callbacks,
        });
        expect(resultCountFaultsOf(commands).join('; ')).toBe('');
        for (const { results } of commands) {
          expect(['Rejected', 'SurfaceDestroyed'].includes(results[0])).toBe(
            true
          );
        }
        await wait(SETTLE_MS);
      }
    }
  );

  if (NATIVE_ANIMATION_ROUTES.synchronousProps) {
    test('a synchronous props rewrite in the didMountItems of a native opacity start: the start is admitted, and the model and the end show the rewritten value', async () => {
      const scene = (left: number) => (
        <View collapsable={false} style={styles.container}>
          <WriterBox left={left} layout={REWRITE_LAYOUT} initialOpacity={0.5} />
        </View>
      );
      const tag = await mountScene(scene(START_LEFT));
      for (let run = 0; run < REWRITE_RUNS; run++) {
        opacities[BOX_REF].value = 0.5;
        await wait(100);
        await takeTrace();
        resetCallbacks();
        writeAfterBlock(REWRITTEN_OPACITY);
        await render(scene(run % 2 === 0 ? END_LEFT : START_LEFT));
        await wait(DURATION / 2);
        const playing = await sample(tag, 'Opacity');
        await wait(DURATION / 2 + SETTLE_MS);
        const end = await sample(tag, 'Opacity');
        const events = (await takeTrace()).filter(
          (event) => event.tag === tag && isHostEvent(event)
        );
        recordCase('a rewrite in the didMountItems of a start', {
          run,
          events: summarize(events),
          playing: [playing.model[0], playing.presentation[0]],
          end: [end.model[0], end.presentation[0]],
          callbacks,
        });
        expect(summarize(events.slice(0, 5))).toBe(
          'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Opacity > Admitted'
        );
        expect(playing.playbacks.length).toBe(1);
        expect(isNear(playing.model[0], REWRITTEN_OPACITY)).toBe(true);
        expect(isNear(end.presentation[0], REWRITTEN_OPACITY)).toBe(true);
        expect(callbacks.join()).toBe(`${REWRITE_NAME}:true`);
      }
      await render(null);
    });
  }

  movingGeometryTest(
    'the starts of one mount-report pass share one clock read',
    async () => {
      await mountScene(
        <Row left={START_LEFT} count={BATCH_SIZE} />,
        ROW_REFS[0]
      );
      const tags = [ROW_REFS[0], ROW_REFS[BATCH_SIZE - 1]].map((refName) =>
        getTestComponent(refName).getTag()
      );
      let renderStartMs = 0;
      const samples = await recordDrawnValues(
        tags,
        PLACE_PROPERTIES,
        async () => {
          renderStartMs = await uptimeMs();
          await render(<Row left={END_LEFT} count={BATCH_SIZE} />);
          await wait(LAYOUT_DURATION / 2);
        }
      );
      logDrawnValues('one clock read for a batch', samples, renderStartMs);
      const events = await takeTrace();
      const received = events.filter((event) => event.event === 'Received');
      expect(received.length).toBe(BATCH_SIZE);
      expect(events.filter((event) => event.event === 'Admitted').length).toBe(
        BATCH_SIZE
      );
      expect(
        new Set(received.map(({ originTimestampMs }) => originTimestampMs)).size
      ).toBe(1);
      const draws = placeDrawsOf(samples, 2);
      expect(draws.length > 0).toBe(true);
      const apart = draws.filter(
        ({ places: [first, last] }) =>
          Math.abs(first.drawnLeft - last.drawnLeft) >
          BATCH_SPEED * FRAME_MS + POSITION_TOLERANCE
      );
      expect(
        apart
          .map(
            ({ timeMs, places: [first, last] }) =>
              `at ${timeMs} ms the first view is at ${first.drawnLeft} and the last at ${last.drawnLeft}`
          )
          .join('; ')
      ).toBe('');
      await wait(LAYOUT_DURATION);
      await render(null);
    }
  );
});

describe('native layout mount window: the first drawn frame', () => {
  if (!MOUNTS_IN_DISPATCHES || !hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a fresh start: no drawn frame shows the final state before the start value',
    async () => {
      const tag = await mountScene(<PlaceScene left={START_LEFT} />);
      const faults: string[] = [];
      let admittedStarts = 0;
      let left = START_LEFT;
      for (let run = 0; run < REPEATED_STARTS; run++) {
        const from = left;
        left = left === START_LEFT ? END_LEFT : START_LEFT;
        let renderStartMs = 0;
        const samples = await recordDrawnValues(
          tag,
          PLACE_PROPERTIES,
          async () => {
            renderStartMs = await uptimeMs();
            await render(<PlaceScene left={left} />);
            await wait(DURATION + SETTLE_MS);
          }
        );
        logDrawnValues(`a fresh start ${run}`, samples, renderStartMs);
        admittedStarts += (await takeTrace()).filter(
          (event) => event.tag === tag && event.event === 'Admitted'
        ).length;
        faults.push(
          ...freshStartFaultsOf(placeDrawsOf(samples, 1), from, left).map(
            (fault) => `start ${run}: ${fault}`
          )
        );
      }
      expect(admittedStarts).toBe(REPEATED_STARTS);
      expect(faults.join('; ')).toBe('');
      await render(null);
    }
  );

  movingGeometryTest(
    'a replacement: no drawn frame shows the final state or a jump at the replacement',
    async () => {
      const faults: string[] = [];
      for (let run = 0; run < REPEATED_STARTS; run++) {
        const tag = await mountScene(
          <PlaceScene left={START_LEFT} layout={REPLACED_LAYOUT} />
        );
        await render(<PlaceScene left={END_LEFT} layout={REPLACED_LAYOUT} />);
        await wait(0.4 * REPLACED_DURATION);
        await takeTrace();
        let renderStartMs = 0;
        const samples = await recordDrawnValues(
          tag,
          PLACE_PROPERTIES,
          async () => {
            renderStartMs = await uptimeMs();
            await render(
              <PlaceScene left={REPLACED_END} layout={REPLACED_LAYOUT} />
            );
            await wait(REPLACED_DURATION + SETTLE_MS);
          }
        );
        logDrawnValues(`a replacement ${run}`, samples, renderStartMs);
        const received = requireOf(
          (await takeTrace()).filter((event) => event.tag === tag),
          'Received'
        );
        const draws = placeDrawsOf(samples, 1);
        faults.push(
          ...[
            ...jumpFaultsOf(draws, REPLACED_SPEED),
            ...earlyFinalFaultsOf(
              draws,
              REPLACED_END,
              received.originTimestampMs! + REPLACED_DURATION - 2 * FRAME_MS
            ),
          ].map((fault) => `replacement ${run}: ${fault}`)
        );
        await render(null);
      }
      expect(faults.join('; ')).toBe('');
    }
  );

  movingGeometryTest(
    'a hand-over to the frame driver: the frame-driven value shows in the frame of its mount, and no later frame shows the native value',
    async () => {
      const faults: string[] = [];
      for (let run = 0; run < REPEATED_STARTS; run++) {
        const tag = await mountScene(
          <PlaceScene left={START_LEFT} layout={NATIVE_X} />
        );
        await render(<PlaceScene left={END_LEFT} layout={NATIVE_X} />);
        await wait(0.3 * HAND_OVER_DURATION);
        let renderStartMs = 0;
        const samples = await recordDrawnValues(
          tag,
          PLACE_PROPERTIES,
          async () => {
            renderStartMs = await uptimeMs();
            await render(
              <PlaceScene left={END_LEFT / 2} layout={FRAME_DRIVEN_X} />
            );
            await wait(SETTLE_MS);
          }
        );
        logDrawnValues(`a hand-over ${run}`, samples, renderStartMs);
        faults.push(
          ...handOverFaultsOf(placeDrawsOf(samples, 1), END_LEFT).map(
            (fault) => `hand-over ${run}: ${fault}`
          )
        );
        await render(null);
        await wait(100);
      }
      expect(faults.join('; ')).toBe('');
    }
  );

  movingGeometryTest('the 12H opacity hand-over scene', async () => {
    const tag = await mountScene(
      <PlaceScene
        left={START_LEFT}
        layout={NATIVE_FADE}
        opacity={END_OPACITY}
      />
    );
    await render(
      <PlaceScene left={END_LEFT} layout={NATIVE_FADE} opacity={END_OPACITY} />
    );
    await wait(LAYOUT_DURATION / 3);
    const started = await takeTrace();
    const nativeStart = started.find(
      (event) =>
        event.tag === tag &&
        event.event === 'TrackStarted' &&
        event.target === 'Opacity'
    );
    expect(nativeStart !== undefined).toBe(true);
    let renderStartMs = 0;
    const samples = await recordDrawnValues(tag, ['opacity'], async () => {
      renderStartMs = await uptimeMs();
      await render(
        <PlaceScene
          left={END_LEFT / 2}
          layout={FRAME_DRIVEN_FADE}
          opacity={END_OPACITY}
        />
      );
      await wait(SETTLE_MS);
    });
    logDrawnValues('the 12H opacity hand-over', samples, renderStartMs);
    const events = await takeTrace();
    const firstUpdate = events.find(
      (event) => event.tag === tag && event.event === 'FrameUpdateMounted'
    );
    const report = events.find(
      (event) =>
        event.event === 'LayoutMountReported' &&
        event.transactionNumber === firstUpdate?.transactionNumber
    );
    recordCase('the 12H opacity hand-over', {
      order: stopOrderOf(events, nativeStart!),
      reportMs: report?.monotonicTimeMs,
      firstDrawAfterReport: report
        ? firstDrawFrom(samples, report.monotonicTimeMs)
        : null,
      drawBeforeReport: report
        ? lastDrawBefore(samples, report.monotonicTimeMs)
        : null,
    });
    await render(null);
  });

  if (getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
    test('a hide of a view with a native opacity track by a shared transition: the first drawn frame after the mount shows the hidden state', async () => {
      await render(<SharedScreens hasSource={false} showsTarget={false} />);
      await wait(SETTLE_MS);
      await takeTrace();
      resetCallbacks();
      await render(<SharedScreens hasSource showsTarget={false} />);
      const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
      await wait(0.3 * SHARED_ENTER_MS);
      const started = await takeTrace();
      expect(
        started.some(
          (event) =>
            event.tag === tag &&
            event.event === 'TrackStarted' &&
            event.target === 'Opacity'
        )
      ).toBe(true);
      let renderStartMs = 0;
      const samples = await recordDrawnValues(tag, ['opacity'], async () => {
        renderStartMs = await uptimeMs();
        await render(<SharedScreens hasSource showsTarget />);
        await wait(SETTLE_MS);
      });
      logDrawnValues('a hide by a shared transition', samples, renderStartMs);
      const events = await takeTrace();
      const stop = events.find(
        (event) =>
          event.tag === tag &&
          event.event === 'TrackEnded' &&
          event.target === 'Opacity'
      );
      const firstDraw = stop
        ? firstDrawFrom(samples, stop.monotonicTimeMs)
        : null;
      recordCase('a hide by a shared transition', {
        events: summarize(events.filter((event) => event.tag === tag)),
        reports: mountReportsOf(events),
        stopMs: stop?.monotonicTimeMs,
        firstDraw,
        drawBefore: stop ? lastDrawBefore(samples, stop.monotonicTimeMs) : null,
      });
      expect(stop !== undefined).toBe(true);
      expect(
        firstDraw !== null && isNear(firstDraw[1], 0, OPACITY_TOLERANCE)
      ).toBe(true);
      await waitForCallbacks(['shared:true']);
      await render(null);
      await wait(100);
    });
  }

  for (const track of END_TRACKS) {
    for (const write of END_WRITES) {
      test(`the first drawn frame after the ${track} of a native opacity track shows the model: ${write}`, async () => {
        await playEnd(track, write, false);
      });
      if (write !== 'no write') {
        test(`the first drawn frame after the ${track} of a native opacity track shows the model: ${write}, with a frame-driven animation of a second view through the end`, async () => {
          await playEnd(track, write, true);
        });
      }
    }
  }

  const orderBSubForm = NATIVE_ANIMATION_ROUTES.synchronousProps
    ? 'a synchronous write'
    : 'a Fabric write';
  test(`a write of the target opacity after the last animator update of a native opacity track shows from the first drawn frame after it: ${orderBSubForm}`, async () => {
    await playOrderB(orderBSubForm);
  });
});

const PLACE_PROPERTIES: RecordedProperty[] = ['frame', 'drawnMatrix'];

type Place = { frameLeft: number; drawnLeft: number };
type PlaceDraw = { timeMs: number; places: Place[] };

/**
 * The frame left and the drawn left of each view of a draw, in dp from the
 * parent.
 */
function placeDrawsOf(samples: DrawnSample[], viewCount: number) {
  const frameCount = valueCountOf('frame');
  const viewValueCount = frameCount + valueCountOf('drawnMatrix');
  return samples.map(
    ({ timeMs, values }): PlaceDraw => ({
      timeMs,
      places: Array.from({ length: viewCount }, (_, view) => {
        const offset = view * viewValueCount;
        const frame = values.slice(offset, offset + frameCount);
        const matrix = values.slice(
          offset + frameCount,
          offset + viewValueCount
        );
        return {
          frameLeft: frame[0],
          drawnLeft: drawnPointOf(frame, matrix, [0, 0])[0],
        };
      }),
    })
  );
}

/** The first draw of the new layout of a start must show the start value. */
function freshStartFaultsOf(draws: PlaceDraw[], from: number, to: number) {
  const firstNew = draws.find(({ places: [place] }) =>
    isNear(place.frameLeft, to, POSITION_TOLERANCE)
  );
  if (!firstNew) {
    return [`no draw has the new layout at ${to}`];
  }
  const { drawnLeft } = firstNew.places[0];
  return Math.abs(drawnLeft - from) <= FIRST_FRAME_TRAVEL
    ? []
    : [
        `the first draw of the new layout, at ${firstNew.timeMs} ms, shows ${drawnLeft}, not the start value ${from}`,
      ];
}

/**
 * Two draws in a row must not be farther apart than the fastest declared move
 * gives.
 */
function jumpFaultsOf(draws: PlaceDraw[], speed: number) {
  return draws.flatMap(({ timeMs, places: [place] }, index) => {
    if (index === 0) {
      return [];
    }
    const before = draws[index - 1];
    const travel = Math.abs(place.drawnLeft - before.places[0].drawnLeft);
    const limit =
      speed * (timeMs - before.timeMs + FRAME_MS) + POSITION_TOLERANCE;
    return travel > limit
      ? [
          `from ${before.timeMs} ms to ${timeMs} ms the view moves ${travel.toFixed(2)}, more than ${limit.toFixed(2)}`,
        ]
      : [];
  });
}

function earlyFinalFaultsOf(
  draws: PlaceDraw[],
  finalLeft: number,
  untilMs: number
) {
  return draws
    .filter(
      ({ timeMs, places: [place] }) =>
        timeMs < untilMs &&
        isNear(place.drawnLeft, finalLeft, POSITION_TOLERANCE)
    )
    .map(({ timeMs }) => `the draw at ${timeMs} ms shows the final state`);
}

/**
 * From the first draw whose frame is not the end of the native track, each draw
 * shows its frame with no native offset.
 */
function handOverFaultsOf(draws: PlaceDraw[], nativeEnd: number) {
  const first = draws.findIndex(
    ({ places: [place] }) =>
      !isNear(place.frameLeft, nativeEnd, POSITION_TOLERANCE)
  );
  if (first < 0) {
    return ['no draw has a frame-driven value'];
  }
  return draws
    .slice(first)
    .filter(
      ({ places: [place] }) =>
        !isNear(place.drawnLeft, place.frameLeft, POSITION_TOLERANCE)
    )
    .map(
      ({ timeMs, places: [place] }) =>
        `the draw at ${timeMs} ms shows ${place.drawnLeft} on the frame ${place.frameLeft}`
    );
}

/**
 * Plays a native opacity track to its end with a write of the target, or none,
 * and checks the draws after the end against the model.
 */
async function playEnd(
  track: EndTrack,
  write: EndWrite,
  hasSecondView: boolean
) {
  const layout = END_LAYOUTS[track];
  const scene = (left: number, opacity: number, moves: boolean) => (
    <EndScene
      left={left}
      opacity={opacity}
      layout={layout}
      writesSynchronously={write === 'synchronous write'}
      secondViewMoves={hasSecondView ? moves : undefined}
    />
  );
  const tag = await mountScene(scene(START_LEFT, END_OPACITY, false));
  resetCallbacks();
  let endMs = 0;
  let renderStartMs = 0;
  const events: TraceEvent[] = [];
  const samples = await recordDrawnValues(tag, ['opacity'], async () => {
    renderStartMs = await uptimeMs();
    await render(scene(END_LEFT, END_OPACITY, true));
    events.push(...(await takeTraceUntilReceived(tag)));
    const received = requireOf(
      events.filter((event) => event.tag === tag),
      'Received'
    );
    endMs = received.originTimestampMs! + END_DURATION;
    if (write !== 'no write') {
      await waitUntilUptime(
        received.originTimestampMs! + WRITE_FRACTION * END_DURATION
      );
      if (write === 'Fabric write') {
        await render(scene(END_LEFT, WRITTEN_OPACITY, true));
      } else {
        opacities[BOX_REF].value = WRITTEN_OPACITY;
      }
    }
    await waitUntilUptime(endMs + SETTLE_MS);
  });
  const caseName = `the ${track}: ${write}${hasSecondView ? ', second view' : ''}`;
  logDrawnValues(caseName, samples, renderStartMs);
  events.push(...(await takeTrace()));
  const model = write === 'no write' ? END_OPACITY : WRITTEN_OPACITY;
  const ended = events.find(
    (event) =>
      event.tag === tag &&
      event.event === 'TrackEnded' &&
      event.target === 'Opacity' &&
      event.finished === true
  );
  const faults = ended
    ? modelAfterEndFaultsOf(samples, ended.monotonicTimeMs, model)
    : ['no natural end of the opacity track in the trace'];
  recordCase(caseName, {
    endMs,
    endedMs: ended?.monotonicTimeMs,
    events: summarize(events.filter((event) => event.tag === tag)),
    firstDrawAfterEnd: firstDrawFrom(samples, endMs),
    drawBeforeEnd: lastDrawBefore(samples, endMs),
    faults,
  });
  expect(faults.join('; ')).toBe('');
  expect(callbacks.join()).toBe(`${END_NAME}:true`);
  await render(null);
}

/**
 * The end listener of the track runs after its last animator update
 * (`TrackPlayback.kt`), so each draw at or after the `TrackEnded` event is of a
 * frame after that update: the first of them and each later draw show the
 * model.
 */
function modelAfterEndFaultsOf(
  samples: DrawnSample[],
  endedMs: number,
  model: number
) {
  const isModel = (value: number) => isNear(value, model, OPACITY_TOLERANCE);
  const after = samples.filter(({ timeMs }) => timeMs >= Math.floor(endedMs));
  if (after.length === 0) {
    return [`no draw at or after the end listener at ${endedMs} ms`];
  }
  return after
    .filter(({ values: [value] }) => !isModel(value))
    .map(
      ({ timeMs, values: [value] }) =>
        `the draw at ${(timeMs - endedMs).toFixed(0)} ms after the end listener shows ${value}, not the model ${model}`
    );
}

type OrderBRunClass =
  | 'order b'
  | 'earlier frame'
  | 'later frame'
  | 'unclassified';

type OrderBRun = {
  offsetFrames: number;
  runClass: OrderBRunClass;
  endMs: number;
  writtenAtMs: number;
  drawBefore: number[] | null;
  drawOfWrite: number[] | null;
  model: number;
  faults: string[];
};

/**
 * Runs the write of the target in the frame nearest to the end of the track and
 * one frame before and after it, then more runs in the nearest frame until a
 * run is of order b, up to the cap. An order-b run counts only when the device
 * posts the end listener of an animator.
 */
async function playOrderB(subForm: string) {
  const postsEnd = await postsAnimatorEnd();
  const runs: OrderBRun[] = [];
  for (let index = 0; index < ORDER_B_RUN_CAP; index++) {
    const isExtraRun = index >= ORDER_B_OFFSETS_IN_FRAMES.length;
    const hasOrderB = runs.some(({ runClass }) => runClass === 'order b');
    if (isExtraRun && (postsEnd !== true || hasOrderB)) {
      break;
    }
    runs.push(
      await playOrderBRun(
        subForm,
        isExtraRun ? 0 : ORDER_B_OFFSETS_IN_FRAMES[index]
      )
    );
  }
  const orderBRuns = runs.filter(({ runClass }) => runClass === 'order b');
  recordCase(`order b: ${subForm}`, {
    postsAnimatorEnd: postsEnd,
    status: orderBStatusOf(postsEnd, orderBRuns.length),
    runs,
  });
  expect(runs.flatMap(({ faults }) => faults).join('; ')).toBe('');
}

function orderBStatusOf(postsEnd: boolean | null, orderBRunCount: number) {
  if (postsEnd === null) {
    return 'unknown';
  }
  if (!postsEnd) {
    return 'order b cannot occur on this device';
  }
  return orderBRunCount > 0 ? 'order b reached' : 'order b not reached';
}

async function playOrderBRun(
  subForm: string,
  offsetFrames: number
): Promise<OrderBRun> {
  orderBWriteAtMs.value = 0;
  orderBWrittenAtMs.value = 0;
  const tag = await mountScene(<FrameWriteScene left={START_LEFT} />);
  resetCallbacks();
  let endMs = 0;
  let renderStartMs = 0;
  const samples = await recordDrawnValues(tag, ['opacity'], async () => {
    renderStartMs = await uptimeMs();
    await render(<FrameWriteScene left={END_LEFT} />);
    const received = requireOf(
      (await takeTraceUntilReceived(tag)).filter((event) => event.tag === tag),
      'Received'
    );
    endMs = received.originTimestampMs! + END_DURATION;
    orderBWriteAtMs.value = endMs + (offsetFrames - 0.5) * FRAME_MS;
    await waitUntilUptime(endMs + SETTLE_MS);
  });
  logDrawnValues(
    `order b: ${subForm}, offset ${offsetFrames}`,
    samples,
    renderStartMs
  );
  const writtenAtMs = orderBWrittenAtMs.value;
  const { model } = await sample(tag, 'Opacity');
  await render(null);
  const drawBefore = lastDrawBefore(samples, writtenAtMs);
  const drawOfWrite = firstDrawFrom(samples, writtenAtMs);
  const runClass = orderBClassOf(drawBefore, drawOfWrite);
  return {
    offsetFrames,
    runClass,
    endMs,
    writtenAtMs,
    drawBefore,
    drawOfWrite,
    model: model[0],
    faults: [
      ...(isNear(model[0], ORDER_B_OPACITY)
        ? []
        : [`offset ${offsetFrames}: the model after the write is ${model[0]}`]),
      ...orderBFaultsOf(runClass, samples, writtenAtMs, endMs).map(
        (fault) => `offset ${offsetFrames} (${runClass}): ${fault}`
      ),
    ],
  };
}

/**
 * Before the update of fraction 1 each draw shows a track value, which differs
 * from the model by more than one frame step; that update writes the model.
 */
const isTrackValue = (value: number) =>
  Math.abs(value - END_OPACITY) > OPACITY_STEP &&
  !isNear(value, ORDER_B_OPACITY, OPACITY_TOLERANCE);

function orderBClassOf(
  drawBefore: number[] | null,
  drawOfWrite: number[] | null
): OrderBRunClass {
  if (!drawBefore || !drawOfWrite) {
    return 'unclassified';
  }
  if (isTrackValue(drawOfWrite[1])) {
    return 'earlier frame';
  }
  return isTrackValue(drawBefore[1]) ? 'order b' : 'later frame';
}

function orderBFaultsOf(
  runClass: OrderBRunClass,
  samples: DrawnSample[],
  writtenAtMs: number,
  endMs: number
) {
  const isWritten = (value: number) =>
    isNear(value, ORDER_B_OPACITY, OPACITY_TOLERANCE);
  const describeDraw = ({ timeMs, values: [value] }: DrawnSample) =>
    `the draw at ${timeMs} ms shows ${value}`;
  if (runClass === 'order b' || runClass === 'later frame') {
    return samples
      .filter(
        ({ timeMs, values: [value] }) =>
          timeMs >= writtenAtMs + ORDER_B_WRITE_DRAW_DELAY_MS &&
          !isWritten(value)
      )
      .map(describeDraw);
  }
  if (runClass === 'earlier frame') {
    return [
      ...samples
        .filter(
          ({ timeMs, values: [value] }) =>
            timeMs >= writtenAtMs &&
            timeMs < endMs - FRAME_MS &&
            !isTrackValue(value)
        )
        .map((draw) => `${describeDraw(draw)}, not a track value`),
      ...samples
        .filter(
          ({ timeMs, values: [value] }) =>
            timeMs >= endMs + MODEL_DRAW_LATENESS_MS && !isWritten(value)
        )
        .map(describeDraw),
    ];
  }
  return [];
}

/** The time and the values of the first draw at or after `timeMs`. */
function firstDrawFrom(samples: DrawnSample[], timeMs: number) {
  const draw = samples.find((drawn) => drawn.timeMs >= Math.floor(timeMs));
  return draw ? [draw.timeMs, ...draw.values] : null;
}

function lastDrawBefore(samples: DrawnSample[], timeMs: number) {
  const before = samples.filter((drawn) => drawn.timeMs < Math.floor(timeMs));
  const draw = before[before.length - 1];
  return draw ? [draw.timeMs, ...draw.values] : null;
}

type CommandResults = { tag: number; generation: number; results: string[] };

/** The result of each command of the views that has a pending start. */
function commandResultsOf(events: TraceEvent[], tags: number[]) {
  return events
    .filter(
      (event) =>
        tags.includes(event.tag) && event.event === 'LayoutStartPending'
    )
    .map(
      (command): CommandResults => ({
        tag: command.tag,
        generation: command.generation,
        results: events
          .filter(
            (event) => event.event === 'Ended' && isOfCommand(event, command)
          )
          .map(({ outcome }) => outcome ?? ''),
      })
    );
}

const resultCountFaultsOf = (commands: CommandResults[]) =>
  commands
    .filter(({ results }) => results.length !== 1)
    .map(
      ({ tag, generation, results }) =>
        `the command ${tag}.${generation} has ${results.length} results: ${results.join()}`
    );

const mountReportsOf = (events: TraceEvent[]) =>
  events
    .filter((event) => event.event === 'LayoutMountReported')
    .map(({ sequence, transactionNumber }) => [sequence, transactionNumber]);

/**
 * The trace until each command of the views with a pending start has its
 * result.
 */
function takeTraceUntilEnded(tags: number[]) {
  return takeTraceUntil(
    (events) =>
      events.some((event) => tags.includes(event.tag)) &&
      commandResultsOf(events, tags).every(({ results }) => results.length > 0),
    LAYOUT_DURATION + 2000
  );
}

const takeTraceUntilReceived = (tag: number) =>
  takeTraceUntil((events) =>
    events.some((event) => event.tag === tag && event.event === 'Received')
  );

function requireOf(events: TraceEvent[], name: string) {
  const found = events.find((event) => event.event === name);
  if (!found) {
    throw new Error(`The trace has no ${name} event: ${summarize(events)}.`);
  }
  return found;
}

/**
 * The events of a native command and the mount reports of its surface, in the
 * form `event:target:finished:outcome:transaction`.
 */
function stopOrderOf(events: TraceEvent[], command: TraceEvent) {
  return events
    .filter(
      (event) =>
        event.surfaceId === command.surfaceId &&
        (isOfCommand(event, command) ||
          event.event === 'LayoutMountReported' ||
          (event.tag === command.tag && event.event === 'FrameUpdateMounted'))
    )
    .map(({ event, target, finished, outcome, transactionNumber }) =>
      [event, target, finished, outcome, transactionNumber]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ');
}

async function waitUntilUptime(timeMs: number) {
  await wait(Math.max(0, timeMs - (await uptimeMs())));
}

async function sampleAtFractions(
  tag: number,
  target: string,
  durationMs: number,
  fractions: number[]
) {
  const startMs = performance.now();
  const samples: TargetSample[] = [];
  for (const fraction of fractions) {
    await wait(
      Math.max(0, startMs + fraction * durationMs - performance.now())
    );
    samples.push(await sample(tag, target));
  }
  return samples;
}

function isOnEnteringTimeline(
  { model: [opacity] }: { model: number[] },
  sinceRefusalMs: number
) {
  const opacityAt = (timeMs: number) =>
    Math.min(1, Math.max(0, timeMs / ENTER_MS));
  return (
    opacity >=
      opacityAt(sinceRefusalMs - FRAME_DRIVER_LATE_MS) - OPACITY_TOLERANCE &&
    opacity <=
      opacityAt(sinceRefusalMs + FRAME_DRIVER_EARLY_MS) + OPACITY_TOLERANCE
  );
}

const builderCallsOf = (name: string) =>
  layoutBuilderCalls.filter((call) => call === name).length;

const pullPlaceOf = (events: TraceEvent[]) => {
  if (events.some(({ event }) => event === 'LayoutStartRefused')) {
    return 'a pull outside a dispatch';
  }
  return events.some(({ event }) => event === 'LayoutStartPending')
    ? 'a pull in a dispatch'
    : 'no host event';
};

const enteringRouteOf = (events: TraceEvent[]) =>
  events.some(({ event }) => event === 'Admitted') ? 'native' : 'frame-driven';

/**
 * An entering fade only goes up: a read lower than a read before it is a frame
 * at a later state before the start value.
 */
function flashFaultsOf(reads: TargetSample[]) {
  return reads.flatMap(({ presentation: [opacity], monotonicTimeMs }, index) =>
    index > 0 && opacity < reads[index - 1].presentation[0] - OPACITY_TOLERANCE
      ? [
          `the read at ${monotonicTimeMs} ms shows ${opacity} after ${reads[index - 1].presentation[0]}`,
        ]
      : []
  );
}

async function waitForQueuedPullItems(rootTag: number) {
  const untilMs = performance.now() + QUEUED_PULL_WAIT_MS;
  let queued = await queuedPullItemsOf(rootTag);
  while (queued === 0 && performance.now() < untilMs) {
    await wait(FRAME_MS);
    queued = await queuedPullItemsOf(rootTag);
  }
  return queued;
}

type AttachOutcome = {
  outcome: 'flash' | 'lost' | 'correct' | 'inconclusive' | 'other';
  reason: string;
  /** No text when the outcome passes: (b) is a stated limit, (c) is right. */
  verdict: string;
};

/**
 * The outcomes flash, lost, and correct from the draws of the root view and the
 * result trace. The path ran only with a real queued pull item at the attach,
 * no child at the report of the dispatch, and a child in a later draw: the
 * batch of a pull in the attach queue mounts in a later dispatch
 * (`FabricUIManager.scheduleMountItem`).
 */
function attachOutcomeOf(
  queuedBeforeAttach: number,
  attach: DispatchAttachRecord | null,
  tag: number,
  events: TraceEvent[],
  reads: TargetSample[]
): AttachOutcome {
  const inconclusive = (reason: string): AttachOutcome => ({
    outcome: 'inconclusive',
    reason,
    verdict: `inconclusive: ${reason}`,
  });
  if (!attach) {
    return inconclusive('no dispatch attached the root view');
  }
  if (queuedBeforeAttach === 0 || attach.queuedPullItemsAtAttach <= 0) {
    return inconclusive('no pull mount item was in the attach queue');
  }
  if (
    attach.childCountAtReport !== 0 ||
    !attach.draws.some(([, childCount]) => childCount > 0)
  ) {
    return inconclusive(
      `the view is not absent at the drain and shown in a later draw (${attach.childCountAtReport} at the drain)`
    );
  }
  const { shown, childFault } = shownDrawsOf(attach.draws, tag);
  if (childFault) {
    return inconclusive(childFault);
  }
  const alphas = shown
    .filter(([, , alpha]) => !Number.isNaN(alpha))
    .map(([, , alpha]) => alpha);
  if (alphas.length === 0) {
    return inconclusive('no draw shows the view');
  }
  const results = events.filter(({ event }) => event === 'Ended');
  const enteringCallbacks = callbacks.filter((entry) =>
    entry.startsWith(`${SURFACE_ENTERING_NAME}:`)
  );
  const resultFault =
    results.length > 1 || enteringCallbacks.length !== 1
      ? `${results.length} host results and ${enteringCallbacks.length} callbacks`
      : '';
  const isFinal = (alpha: number) => alpha >= 1 - OPACITY_TOLERANCE;
  const hasFlash = alphas.some(
    (alpha, index) =>
      isFinal(alpha) &&
      alphas.slice(index + 1).some((later) => later < alpha - OPACITY_TOLERANCE)
  );
  if (hasFlash) {
    return { outcome: 'flash', reason: alphas.join(), verdict: 'flash' };
  }
  if (alphas[0] <= (2 * FRAME_MS) / ENTER_MS + OPACITY_TOLERANCE) {
    return { outcome: 'correct', reason: '', verdict: resultFault };
  }
  const isLost =
    isFinal(alphas[0]) &&
    results.length === 1 &&
    results[0].outcome === 'Rejected' &&
    reads.every(({ playbacks }) => playbacks.length === 0);
  return isLost
    ? { outcome: 'lost', reason: '', verdict: resultFault }
    : {
        outcome: 'other',
        reason: alphas.join(),
        verdict: `the first drawn alpha ${alphas[0]} is not the start value, and the result is ${summarize(results)}`,
      };
}

type PullOfCommand = {
  tag: number;
  transactionNumber: number | undefined;
  dispatch: number;
};

/**
 * The transaction of each mounted start and the index of the dispatch whose
 * drain recorded it, or -1 when no recorded dispatch holds its time. An empty
 * pull records nothing, so a pull with no start is not in it.
 */
function pullsOf(mounted: TraceEvent[], dispatches: number[][]) {
  const pulls = new Map<number | undefined, PullOfCommand>();
  for (const { tag, transactionNumber, monotonicTimeMs } of mounted) {
    pulls.set(transactionNumber, {
      tag,
      transactionNumber,
      dispatch: dispatches.findIndex(
        ([startMs, endMs]) =>
          monotonicTimeMs >= startMs - 1 &&
          (Number.isNaN(endMs) || monotonicTimeMs <= endMs + 1)
      ),
    });
  }
  return [...pulls.values()];
}

function oneDispatchFaultOf(pulls: PullOfCommand[]) {
  const dispatchIndexes = new Set(pulls.map(({ dispatch }) => dispatch));
  return dispatchIndexes.size === 1 && !dispatchIndexes.has(-1)
    ? ''
    : `inconclusive: the pulls drained in the dispatches ${[...dispatchIndexes].join()}, not in one`;
}

/**
 * The scene needs each change in its own pull: two commands of the view, two
 * pulls, one dispatch. The coordinator keeps only the newest revision for the
 * next pull, so two commits before one pull are one transaction (measured: one
 * command in one pull). The case records the scene; it is not a failure.
 */
function sameViewSceneFaultOf(
  commands: CommandResults[],
  pulls: PullOfCommand[]
) {
  if (commands.length !== 2 || pulls.length !== 2) {
    return `inconclusive: ${commands.length} commands in ${pulls.length} pulls, not 2 in 2`;
  }
  return oneDispatchFaultOf(pulls);
}

function outsideDispatchSceneFaultOf(
  queuedBeforeAttach: number,
  attach: OutsideDispatchAttachRecord
) {
  if (queuedBeforeAttach === 0 || attach.queuedPullItemsAtAttach <= 0) {
    return 'inconclusive: no pull mount item was in the attach queue';
  }
  return attach.isInDispatchAtAttach
    ? 'inconclusive: the attach ran in a dispatch'
    : '';
}

/**
 * Each draw from the attach that shows the entering view as the first child of
 * the root view: an entering fade only goes up, so a draw lower than a draw
 * before it is a frame at a later state before the start value.
 */
function drawnFlashFaultsOf(draws: number[][], tag: number) {
  const { shown, childFault } = shownDrawsOf(draws, tag);
  if (shown.length === 0) {
    return ['no draw shows a child of the root view'];
  }
  if (childFault) {
    return [childFault];
  }
  return shown.flatMap(([timeMs, , alpha], index) =>
    index > 0 && alpha < shown[index - 1][2] - OPACITY_TOLERANCE
      ? [`the draw at ${timeMs} ms shows ${alpha} after ${shown[index - 1][2]}`]
      : []
  );
}

/**
 * The draws of the root view with a child, and a fault when the first child of
 * one of them is not the entering view.
 */
function shownDrawsOf(draws: number[][], tag: number) {
  const shown = draws.filter(([, childCount]) => childCount > 0);
  const otherChild = shown.find(([, , , childTag]) => childTag !== tag);
  const childFault = otherChild
    ? `the first child of the root view is the view ${otherChild[3]}, not the entering view ${tag}`
    : '';
  return { shown, childFault };
}

function writeAfterBlock(value: number) {
  const opacity = opacities[BOX_REF];
  scheduleOnUI(() => {
    'worklet';
    blockUIThread(REWRITE_BLOCK_MS);
    opacity.value = value;
  });
}

function recordCase(caseName: string, data: Record<string, unknown>) {
  console.log(`${RECORD_MARKER} ${JSON.stringify({ caseName, ...data })}`);
}

function PlaceScene(box: BoxProps) {
  return (
    <View collapsable={false} style={styles.container}>
      <Box {...box} />
    </View>
  );
}

function TwoCommitScene() {
  const [first, setFirst] = useState(START_LEFT);
  const [second, setSecond] = useState(START_LEFT);
  setFirstLeft = setFirst;
  setSecondLeft = setSecond;
  return (
    <View collapsable={false} style={localStyles.column}>
      <Box left={first} layout={TWO_COMMIT_LAYOUTS.first} refName={FIRST_REF} />
      <Box
        left={second}
        layout={TWO_COMMIT_LAYOUTS.second}
        refName={SECOND_REF}
      />
    </View>
  );
}

function SameViewScene() {
  const [left, setLeft] = useState(START_LEFT);
  setSameViewLeft = setLeft;
  return (
    <View collapsable={false} style={styles.container}>
      <Box left={left} layout={SAME_VIEW_LAYOUT} />
    </View>
  );
}

/** The entering view is the root view of its surface. */
let resolveEnteringRender = () => {};

/**
 * The commit of the next `EnteringSurface`. A prerendered surface resolves at
 * its start (`ReactSurface.prerender`), which can come before React renders
 * it.
 */
function enteringRender() {
  return new Promise<true>((resolve) => {
    resolveEnteringRender = () => resolve(true);
  });
}

function EnteringSurface() {
  const ref = useTestRef(ENTERING_REF);
  useEffect(() => resolveEnteringRender(), []);
  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      entering={SURFACE_ENTERING}
      style={styles.box}
    />
  );
}

/** A commit of the main surface with mount items. */
function DispatchTrigger({ width }: { width: number }) {
  return <View style={[styles.box, { width }]} />;
}

function SharedSource() {
  const ref = useTestRef(SHARED_SOURCE_REF);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag="native-layout-mount-window"
      sharedTransitionStyle={SHARED_TRANSITION}
      entering={SHARED_ENTERING}
      style={styles.box}
    />
  );
}

/** The commit that shows the target hides the source, which stays mounted. */
function SharedScreens({
  hasSource,
  showsTarget,
}: {
  hasSource: boolean;
  showsTarget: boolean;
}) {
  return (
    <View style={localStyles.sharedScreens}>
      <SharedTransitionBoundary isActive={!showsTarget}>
        {hasSource && <SharedSource />}
      </SharedTransitionBoundary>
      {showsTarget && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="native-layout-mount-window"
            sharedTransitionStyle={SHARED_TRANSITION}
            style={[styles.box, localStyles.sharedTarget]}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

function EndScene({
  left,
  opacity,
  layout,
  writesSynchronously,
  secondViewMoves,
}: {
  left: number;
  opacity: number;
  layout: LayoutAnimationFunction;
  writesSynchronously: boolean;
  secondViewMoves?: boolean;
}) {
  return (
    <View collapsable={false} style={localStyles.column}>
      {writesSynchronously ? (
        <WriterBox left={left} layout={layout} initialOpacity={END_OPACITY} />
      ) : (
        <Box left={left} opacity={opacity} layout={layout} />
      )}
      {secondViewMoves !== undefined && (
        <MovingWidthBox moves={secondViewMoves} />
      )}
    </View>
  );
}

/** Its width animation makes a UI-thread commit in each frame while it runs. */
function MovingWidthBox({ moves }: { moves: boolean }) {
  const width = useSharedValue(BOX_SIZE);
  useEffect(() => {
    if (moves) {
      width.value = withTiming(3 * BOX_SIZE, {
        duration: SECOND_VIEW_MS,
        easing: Easing.linear,
      });
    }
  }, [moves, width]);
  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

/**
 * A frame callback writes the opacity of the box in the first frame at or after
 * `orderBWriteAtMs`, and keeps the frame time of that frame.
 */
function FrameWriteScene({ left }: { left: number }) {
  const ref = useTestRef(BOX_REF);
  const opacity = useSharedValue(END_OPACITY);
  useFrameCallback(({ timestamp }) => {
    if (
      orderBWriteAtMs.value > 0 &&
      orderBWrittenAtMs.value === 0 &&
      timestamp >= orderBWriteAtMs.value
    ) {
      opacity.value = ORDER_B_OPACITY;
      orderBWrittenAtMs.value = timestamp;
    }
  });
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View collapsable={false} style={styles.container}>
      <Animated.View
        ref={ref}
        layout={ORDER_B_LAYOUT}
        style={[styles.box, { marginLeft: left }, animatedStyle]}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  column: {
    width: 300,
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
