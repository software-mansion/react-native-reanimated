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
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { OutsideDispatchAttachRecord } from '../../../ReJest/secondSurface';
import {
  attachRootViewOutsideDispatch,
  queuedPullItemsOf,
  startSurfaceWithoutRootView,
  stopSurfaceWithoutRootView,
} from '../../../ReJest/secondSurface';
import type { DrawnSample, RecordedProperty } from '../viewSampler';
import {
  drawnPointOf,
  logDrawnValues,
  recordDrawnValues,
  uptimeMs,
  valueCountOf,
} from '../viewSampler';
import type { BoxProps, TargetSample, TraceEvent } from './nativeLayoutTestKit';
import {
  Box,
  DURATION,
  END_LEFT,
  entryExitOf,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  hasNativeLayoutRoute,
  isHostEvent,
  isNear,
  layoutBuilderCalls,
  mountScene,
  MOUNTS_IN_DISPATCHES,
  NATIVE_START,
  OPACITY_TOLERANCE,
  POSITION_TOLERANCE,
  resetCallbacks,
  routeOf,
  sample,
  START_LEFT,
  styles,
  summarize,
  takeTrace,
  waitForCallbacks,
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

function requireOf(events: TraceEvent[], name: string) {
  const found = events.find((event) => event.event === name);
  if (!found) {
    throw new Error(`The trace has no ${name} event: ${summarize(events)}.`);
  }
  return found;
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

async function waitForQueuedPullItems(rootTag: number) {
  const untilMs = performance.now() + QUEUED_PULL_WAIT_MS;
  let queued = await queuedPullItemsOf(rootTag);
  while (queued === 0 && performance.now() < untilMs) {
    await wait(FRAME_MS);
    queued = await queuedPullItemsOf(rootTag);
  }
  return queued;
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

/** The entering view is the root view of its surface. */
const resolveEnteringRender = () => {};

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
