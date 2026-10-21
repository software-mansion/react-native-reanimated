/*
 * A mount item of a React commit throws in the dispatch that has a native start of one view and the mounted
 * stop of the older native track of another view. A later UI-thread commit dispatches after the throw. The
 * suite `native layout starts` runs the ignorable form. The fatal form disables the frame-path mount for the
 * rest of the run of the app (`FabricUIManager.java:1661`), so only the opt-in suite `native layout fatal
 * mount item` runs it, last, in a new app process.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { requireNativeComponent, View } from 'react-native';
import type {
  LayoutAnimationFunction,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { isSecondSurfaceAvailable } from '../../../ReJest/secondSurface';
import type { DrawnSample, RecordedProperty } from '../viewSampler';
import {
  drawnPointOf,
  isViewSamplerAvailable,
  recordDrawnValues,
  uptimeMs,
  valueCountOf,
} from '../viewSampler';
import type { TraceEvent } from './nativeLayoutTestKit';
import {
  Box,
  callbacks,
  DURATION,
  END_LEFT,
  FIRST_FRAME_TRAVEL,
  hasNativeLayoutRoute,
  layoutOf,
  mountScene,
  MOUNTS_IN_DISPATCHES,
  movingGeometryTest,
  POSITION_TOLERANCE,
  sample,
  START_LEFT,
  styles,
  summarize,
  takeTrace,
} from './nativeLayoutTestKit';

export type ThrowForm = 'ignorable' | 'fatal';

/**
 * The fatal throw leaves the pull record of its dispatch, and the next pull
 * comes in another dispatch. A Debug build stops the app at the assert of that
 * pull (`LayoutAnimationsProxy::pullTransaction`); a Release build runs the
 * record. A runtime-tests build with Debug native code has a `__DEV__` bundle,
 * and one with Release native code has a bundle that is not `__DEV__`
 * (`debugRuntimeTests` and `releaseRuntimeTests` of
 * `apps/fabric-example/android/app/build.gradle`).
 */
const RUNS_STALE_PULL_RECORD = !__DEV__;

export function describeThrownMountItem(throwForm: ThrowForm) {
  describe(`a mount item that throws in a dispatch with a pending native start and a pending mounted stop: ${throwForm}`, () => {
    if (
      !hasNativeLayoutRoute ||
      !MOUNTS_IN_DISPATCHES ||
      !isSecondSurfaceAvailable() ||
      !isViewSamplerAvailable()
    ) {
      return;
    }

    const throwTest =
      throwForm === 'ignorable' || RUNS_STALE_PULL_RECORD
        ? movingGeometryTest
        : test.skip;
    throwTest(
      `a ${throwForm} throw: one result for each command, one drain of the pull of the throw, and the first drawn frame after it is on the timeline of the start`,
      async () => {
        await playThrow(throwForm);
      }
    );
  });
}

type SceneThrowForm = 'none' | ThrowForm;
type ThrowingViewProps = { throwOnMount: SceneThrowForm; style?: ViewStyle };

const START_NAME = 'start';
const START_LAYOUT = layoutOf(
  {
    originX: { easing: Easing.linear },
    originY: { easing: Easing.linear },
  },
  { name: START_NAME }
);
const OLDER_LAYOUT = layoutOf(
  { originX: { duration: 4 * DURATION } },
  { name: 'older' }
);
const HAND_OVER_LAYOUT = layoutOf(
  { originX: { isSpring: true } },
  { name: 'handOver' }
);
const HAND_OVER_REF = 'NativeLayoutThrownMountItemHandOverBox';
const DRAWN_PROPERTIES: RecordedProperty[] = ['frame', 'drawnMatrix'];
const WRITTEN_OPACITY = 0.5;

let throwingView: ReturnType<typeof requireNativeComponent<ThrowingViewProps>>;
let writerOpacity: SharedValue<number> | undefined;

async function playThrow(throwForm: ThrowForm) {
  const sceneOf = (
    form: SceneThrowForm,
    startLeft: number,
    handOverLeft: number,
    handOverLayout: LayoutAnimationFunction
  ) => (
    <ThrowScene
      throwOnMount={form}
      startLeft={startLeft}
      handOverLeft={handOverLeft}
      handOverLayout={handOverLayout}
    />
  );
  const tag = await mountScene(
    sceneOf('none', START_LEFT, START_LEFT, OLDER_LAYOUT)
  );
  const handOverTag = getTestComponent(HAND_OVER_REF).getTag();
  await render(sceneOf('none', START_LEFT, END_LEFT, OLDER_LAYOUT));
  await wait(DURATION / 2);
  await render(sceneOf('none', START_LEFT, END_LEFT, HAND_OVER_LAYOUT));
  const beforeThrow = await takeTrace();
  let thrownAtMs = 0;
  let laterCommitAtMs = 0;
  const samples = await recordDrawnValues(
    [tag, handOverTag],
    DRAWN_PROPERTIES,
    async () => {
      await render(sceneOf(throwForm, END_LEFT, START_LEFT, HAND_OVER_LAYOUT));
      thrownAtMs = await uptimeMs();
      await wait(DURATION / 2);
      laterCommitAtMs = await uptimeMs();
      writerOpacity!.value = WRITTEN_OPACITY;
      await wait(DURATION * 1.5);
    }
  );
  const events = [...beforeThrow, ...(await takeTrace())];
  const ofViews = events.filter(
    (event) => event.tag === tag || event.tag === handOverTag
  );
  const results = commandResultsOf(ofViews);
  const start = startCommandOf(events, tag);
  const drains = start
    ? events.filter(
        (event) =>
          event.event === 'LayoutMountReported' &&
          event.surfaceId === start.surfaceId &&
          event.transactionNumber === start.transactionNumber
      )
    : [];
  const drawFault = start
    ? firstDrawFaultOf(samples, events, start, drains, thrownAtMs)
    : 'no start command after the throw';
  console.log(
    'RuntimeTestsThrownMountItem ' +
      JSON.stringify({
        throwForm,
        thrownAtMs,
        laterCommitAtMs,
        trace: summarize(ofViews),
        reports: events
          .filter(({ event }) => event === 'LayoutMountReported')
          .map(({ transactionNumber, monotonicTimeMs }) => [
            transactionNumber,
            monotonicTimeMs,
          ]),
        startTransaction: start?.transactionNumber,
        drainsOfStart: drains.map(({ monotonicTimeMs }) => monotonicTimeMs),
        results,
        drawFault,
        playbacks: {
          start: (await sample(tag, 'PositionX')).playbacks,
          handOver: (await sample(handOverTag, 'PositionX')).playbacks,
        },
        callbacks,
        draws: samples,
      })
  );
  expect(results.length).toBe(2);
  expect(
    results
      .filter(({ count }) => count !== 1)
      .map(({ command, results: ended }) => `${command}: ${ended}`)
      .join('; ')
  ).toBe('');
  expect(drains.length).toBe(1);
  const drainedLater =
    drains.length > 0 && drains[0].monotonicTimeMs >= laterCommitAtMs;
  expect(drainedLater).toBe(throwForm === 'fatal');
  expect(drawFault).toBe('');
  await render(sceneOf('none', START_LEFT, START_LEFT, OLDER_LAYOUT));
  await render(null);
}

type CommandResult = { command: string; count: number; results: string };

function commandResultsOf(events: TraceEvent[]): CommandResult[] {
  const commands = new Set(
    events
      .filter(({ event }) => event === 'LayoutStartPending')
      .map(({ tag, generation }) => `${tag}.${generation}`)
  );
  return [...commands].map((command) => {
    const ended = events.filter(
      ({ event, tag, generation }) =>
        event === 'Ended' && `${tag}.${generation}` === command
    );
    return { command, count: ended.length, results: summarize(ended) };
  });
}

/** The start view changes its layout only in the commit of the throw. */
const startCommandOf = (events: TraceEvent[], tag: number) =>
  events.find(
    (event) => event.tag === tag && event.event === 'LayoutStartPending'
  );

/**
 * The first draw of the start view at or after the drain of its pull is not
 * ahead of its linear timeline from its origin, or from the commit of the throw
 * when it has no origin: no draw shows the final state early.
 */
function firstDrawFaultOf(
  samples: DrawnSample[],
  events: TraceEvent[],
  start: TraceEvent,
  drains: TraceEvent[],
  thrownAtMs: number
) {
  if (drains.length === 0) {
    return 'no drain of the pull of the throw';
  }
  const draw = samples.find(
    ({ timeMs }) => timeMs >= Math.floor(drains[0].monotonicTimeMs)
  );
  if (!draw) {
    return 'no draw after the drain';
  }
  const received = events.find(
    (event) =>
      event.event === 'Received' &&
      event.tag === start.tag &&
      event.generation === start.generation
  );
  const originMs = received?.originTimestampMs ?? thrownAtMs;
  const progress = Math.min(
    1,
    Math.max(0, (draw.timeMs - originMs) / DURATION)
  );
  const latestLeft = START_LEFT + (END_LEFT - START_LEFT) * progress;
  const frameCount = valueCountOf('frame');
  const viewValueCount = frameCount + valueCountOf('drawnMatrix');
  const [drawnLeft] = drawnPointOf(
    draw.values.slice(0, frameCount),
    draw.values.slice(frameCount, viewValueCount),
    [0, 0]
  );
  return drawnLeft >= START_LEFT - POSITION_TOLERANCE &&
    drawnLeft <= latestLeft + FIRST_FRAME_TRAVEL
    ? ''
    : `the first draw after the drain, at ${draw.timeMs} ms, shows ${drawnLeft}, ahead of ${latestLeft} on the timeline`;
}

function ThrowScene({
  throwOnMount,
  startLeft,
  handOverLeft,
  handOverLayout,
}: {
  throwOnMount: SceneThrowForm;
  startLeft: number;
  handOverLeft: number;
  handOverLayout: LayoutAnimationFunction;
}) {
  throwingView ??= requireNativeComponent<ThrowingViewProps>(
    'RuntimeTestsThrowingView'
  );
  const ThrowingView = throwingView;
  const opacity = useSharedValue(1);
  writerOpacity = opacity;
  const writerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.container}>
      <Box left={startLeft} layout={START_LAYOUT} />
      <Box
        left={handOverLeft}
        layout={handOverLayout}
        refName={HAND_OVER_REF}
      />
      <ThrowingView throwOnMount={throwOnMount} style={styles.rowItem} />
      <Animated.View style={[styles.rowItem, writerStyle]} />
    </View>
  );
}
