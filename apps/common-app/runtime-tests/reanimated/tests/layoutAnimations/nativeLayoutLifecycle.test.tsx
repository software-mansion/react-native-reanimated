import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

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
import { hasNativeCSSTransitions } from '../nativeAnimationObservation';
import {
  commandsWithoutOneResult,
  growthOf,
  hasView,
  restStateOf,
  settledRead,
  summarizeOf,
  takeTraceUntilCommandsEnd,
} from './nativeLayoutLifecycleKit';
import type { TraceEvent } from './nativeLayoutTestKit';
import {
  afterMountOf,
  callbacks,
  callbackTimeOf,
  ClippingScrollView,
  CLIPPED_OFFSET,
  DURATION,
  END_LEFT,
  entryExitOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  hasNativeLayoutRoute,
  isHostEvent,
  LAID_OUT_TOLERANCE,
  layoutOf,
  movingGeometryTest,
  playbackIdsOf,
  REMOVES_TRACKS_OUT_OF_WINDOW,
  sample,
  scrollClippingViewTo,
  START_LEFT,
  summarize,
  takeTrace,
  takeTraceUntilSurfaceClosed,
  waitForCallbacks,
} from './nativeLayoutTestKit';

const TRACK_MS = 1600;
const BOX = 30;
const centerOfBox = (left: number) => left + BOX / 2;
const SURFACE_TAIL_MS = TRACK_MS + 500;

/**
 * Base behavior (owner item): on Apple the views of retained exits that are
 * children of the surface root stay mounted after the stop of the surface.
 */
const KEEPS_ROOT_EXIT_VIEWS_AT_SURFACE_STOP = Platform.OS === 'ios';

describe('native layout lifecycle: a recycled view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a view of the same type that takes the place of a view with a live native track keeps its own model and track',
    async () => {
      await runSwaps('recycle after a native track', swapAfterNativeTrack);
    }
  );

  if (hasNativeCSSTransitions) {
    test('a view of the same type that takes the place of a view with a live CSS transition keeps its model at the stop of that transition', async () => {
      await runSwaps('recycle after a CSS stop', swapAfterCSSTransition);
    });
  }
});

describe('native layout lifecycle: surface teardown', () => {
  if (!hasNativeLayoutRoute || !isSecondSurfaceAvailable()) {
    return;
  }

  movingGeometryTest(
    `the stop of a surface with native commands, frame writers, retained exits, and a start at the stop ends each command one time and keeps no state${KEEPS_ROOT_EXIT_VIEWS_AT_SURFACE_STOP ? ' but the views of the retained exits at the root' : ''}`,
    async () => {
      const caseName = 'combined surface teardown';
      const before = await settledRead(caseName, 'before');
      const surfaceId = await startSecondSurface(TeardownScene);
      await wait(300);
      const tags = Object.fromEntries(
        TEARDOWN_REFS.map((refName) => [
          refName,
          getTestComponent(refName).getTag(),
        ])
      );
      await takeTrace();
      callbacks.length = 0;

      setTeardown({
        ...TEARDOWN_START,
        left: END_LEFT,
        isExitMounted: false,
        opacity: CSS_END_OPACITY,
      });
      await wait(DURATION);
      const started = await takeTrace();
      expect(
        (await sample(tags[TEARDOWN_NATIVE_REF], 'PositionX')).playbacks
          .length > 0
      ).toBe(true);
      expect(
        (await sample(tags[TEARDOWN_EXIT_REF], 'Opacity')).playbacks.length > 0
      ).toBe(true);
      expect(
        (await sample(tags[TEARDOWN_CSS_REF], 'Opacity')).playbacks.length > 0
      ).toBe(true);

      setTeardown({
        ...TEARDOWN_START,
        left: END_LEFT,
        isExitMounted: false,
        queuedLeft: END_LEFT,
        opacity: 1,
      });
      await stopSecondSurface(surfaceId);
      const closing = await takeTraceUntilSurfaceClosed(surfaceId);
      await wait(SURFACE_TAIL_MS);
      const late = await takeTrace();
      const events = [...started, ...closing, ...late].filter(
        (event) => event.surfaceId === surfaceId
      );
      const mountedAfterClose = await mountedRefsOf(tags);
      await wait(SURFACE_TAIL_MS);
      console.log(
        `LIFECYCLE-TEARDOWN | ${JSON.stringify({
          queuedStart: queuedStartPathOf(events, tags[TEARDOWN_QUEUED_REF]),
          tags,
          mountedAfterClose,
          mountedLater: await mountedRefsOf(tags),
          callbacks,
          trace: Object.fromEntries(
            TEARDOWN_REFS.map((refName) => [
              refName,
              summarizeOf(events, tags[refName]),
            ])
          ),
        })}`
      );

      expect(
        summarize(events.filter(({ event }) => event === 'SurfaceClosed'))
      ).toBe('SurfaceClosed');
      expect(commandsWithoutOneResult(events.filter(isHostEvent))).toBe('');
      expect(workAfterClose(events)).toBe('');
      expect(endsOfClosedCommands(events)).toBe('');
      expect(mountedAfterClose).toBe(
        KEEPS_ROOT_EXIT_VIEWS_AT_SURFACE_STOP
          ? [TEARDOWN_EXIT_REF, TEARDOWN_FRAME_EXIT_REF].join()
          : ''
      );
      expect(callbackCountsOf(TEARDOWN_CALLBACKS)).toBe('');
      expect(callbacks.includes('teardownNative:false')).toBe(true);
      expect(callbacks.includes('teardownExit:false')).toBe(true);
      expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
    }
  );

  const surfaceHandOver = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'after the hand-over of its native group to the frame driver'
    : 'while its native group plays out of the window';
  movingGeometryTest(
    `the stop of a surface ${surfaceHandOver} gives the native box and its frame-driven twin false one time`,
    async () => {
      const caseName = 'surface stop after a hand-over';
      const before = await settledRead(caseName, 'before');
      const surfaceId = await startSecondSurface(ClippedTwinScene);
      await wait(300);
      const nativeTag = getTestComponent(TWIN_NATIVE_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      setTwinLeft(END_LEFT);
      await wait(DURATION);
      scrollClippingViewTo(CLIPPED_OFFSET);
      await wait(DURATION);
      const handOver = await takeTrace();
      expect(callbacks.join()).toBe('');

      await stopSecondSurface(surfaceId);
      const closing = await takeTraceUntilSurfaceClosed(surfaceId);
      await wait(500);
      const callbacksAtStop = [...callbacks].sort().join();
      await wait(TWIN_MS);
      const late = await takeTrace();
      const events = [...handOver, ...closing, ...late].filter(
        (event) => event.surfaceId === surfaceId
      );
      console.log(
        `LIFECYCLE-TWIN-STOP | ${JSON.stringify({
          callbacksAtStop,
          callbacks,
          native: summarizeOf(events, nativeTag),
        })}`
      );

      expect(summarizeEndOf(handOver, nativeTag)).toBe(
        REMOVES_TRACKS_OUT_OF_WINDOW
          ? 'TrackEnded:PositionX:false > Ended:Interrupted:PlatformRemoved'
          : ''
      );
      expect(callbacksAtStop).toBe('frame:false,native:false');
      expect([...callbacks].sort().join()).toBe('frame:false,native:false');
      expect(commandsWithoutOneResult(events.filter(isHostEvent))).toBe('');
      expect(workAfterClose(events)).toBe('');
      expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
    }
  );

  movingGeometryTest(
    'surfaces that start and stop during native tracks get new ids, and no command crosses to a later surface (no surface-id reuse)',
    async () => {
      const caseName = 'surface-id reuse attempt';
      const before = await settledRead(caseName, 'before');
      const surfaceIds: number[] = [];
      const crossings: string[] = [];
      for (let cycle = 0; cycle < SURFACE_CYCLES; cycle++) {
        const surfaceId = await startSecondSurface(TwinlessSurfaceScene);
        await wait(100);
        await takeTrace();
        setTwinlessLeft(END_LEFT);
        await wait(DURATION / 2);
        await stopSecondSurface(surfaceId);
        const events = await takeTraceUntilSurfaceClosed(surfaceId);
        const unclosed = commandsWithoutOneResult(
          events
            .filter(isHostEvent)
            .filter((event) => event.surfaceId === surfaceId)
        );
        if (unclosed !== '') {
          crossings.push(`cycle ${cycle}: ${unclosed}`);
        }
        const earlier = events.filter(
          (event) =>
            event.event !== 'SurfaceClosed' &&
            surfaceIds.includes(event.surfaceId)
        );
        if (earlier.length > 0) {
          crossings.push(
            `cycle ${cycle}: events of earlier surfaces ${summarize(earlier)}`
          );
        }
        surfaceIds.push(surfaceId);
      }
      console.log(`LIFECYCLE-SURFACE-IDS | ${surfaceIds.join(',')}`);
      expect(new Set(surfaceIds).size).toBe(SURFACE_CYCLES);
      expect(crossings.join('; ')).toBe('');
      expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
    }
  );
});

describe('native layout lifecycle: list, reparenting, and screens', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a list with rapid inserts, removals, and scrolls during native tracks ends each command one time and keeps no state',
    async () => {
      const caseName = 'list';
      const before = await settledRead(caseName, 'before');
      await render(<ListScene />);
      await takeTraceUntilCommandsEnd([]);
      const events: TraceEvent[] = [];
      let nextItem = LIST_SIZE;
      for (let round = 0; round < LIST_ROUNDS; round++) {
        listItems = [
          nextItem++,
          ...listItems.filter((_, index) => index !== 2),
        ];
        setListItems(listItems);
        await waitForFrames(LIST_ROUND_FRAMES);
        if (round % 2 === 1) {
          listRef.current?.scrollToOffset({
            offset: (round * LIST_SCROLL_STEP) % LIST_SCROLL_RANGE,
            animated: false,
          });
        }
        events.push(...(await takeTrace()));
      }
      const ended = await takeTraceUntilCommandsEnd(events);
      const counts = eventCountsOf(ended);
      console.log(`LIFECYCLE-LIST | ${JSON.stringify(counts)}`);

      expect(ended.some(({ event }) => event === 'Received')).toBe(true);
      expect(commandsWithoutOneResult(ended.filter(isHostEvent))).toBe('');
      expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
    }
  );

  movingGeometryTest(
    'a view that moves to a new host parent during its native track plays the track to its end and gets true one time',
    async () => {
      const caseName = 'reparenting';
      const before = await settledRead(caseName, 'before');
      await render(<ReparentScene left={START_LEFT} isWrapped={false} />);
      await wait(50);
      const tag = getTestComponent(REPARENT_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      const startedAtMs = performance.now();
      await render(<ReparentScene left={END_LEFT} isWrapped={false} />);
      await wait(DURATION / 2);
      expect((await sample(tag, 'PositionX')).playbacks.length > 0).toBe(true);

      await render(<ReparentScene left={END_LEFT} isWrapped />);
      expect(getTestComponent(REPARENT_REF).getTag()).toBe(tag);
      expect(await waitForCallbacks(1, 2 * TRACK_MS)).toBe('');
      await wait(TRACK_MS);
      const events = await takeTraceUntilCommandsEnd([]);
      console.log(
        `LIFECYCLE-REPARENT | ${JSON.stringify({
          callbacks,
          callbackAfterStartMs:
            callbacks.length > 0
              ? callbackTimeOf('reparent').receivedMs - startedAtMs
              : null,
          trace: summarizeOf(events, tag),
        })}`
      );

      expect(callbacks.join()).toBe('reparent:true');
      expect(
        callbackTimeOf('reparent').receivedMs - startedAtMs >=
          TRACK_MS - FRAME_MS
      ).toBe(true);
      expect(commandsWithoutOneResult(events.filter(isHostEvent))).toBe('');
      const { model } = await sample(tag, 'PositionX');
      expect(
        Math.abs(model[0] - centerOfBox(END_LEFT)) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(await restStateOf(tag, ['PositionX'])).toBe('');
      expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
    }
  );

  const screenTest = Platform.OS === 'ios' ? movingGeometryTest : test.skip;
  screenTest(
    'a native-stack push over a native track and the pop back end the native box and its frame-driven twin at the same end, with true one time',
    async () => {
      const caseName = 'screen push and pop';
      const before = await settledRead(caseName, 'before');
      await render(<StackScene />);
      await wait(800);
      const nativeTag = getTestComponent(TWIN_NATIVE_REF).getTag();
      const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      setTwinLeft(END_LEFT);
      await wait(DURATION);
      expect((await sample(nativeTag, 'PositionX')).playbacks.length > 0).toBe(
        true
      );

      stackNavigation.navigate(COVER_SCREEN);
      await wait(TWIN_MS / 3);
      stackNavigation.goBack();
      expect(
        await waitForCallbacks(['native:true', 'frame:true'], 2 * TWIN_MS)
      ).toBe('');
      await wait(500);
      const events = await takeTraceUntilCommandsEnd([]);
      console.log(
        `LIFECYCLE-SCREENS | ${JSON.stringify({ callbacks, native: summarizeOf(events, nativeTag) })}`
      );

      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      expect(commandsWithoutOneResult(events.filter(isHostEvent))).toBe('');
      const [native, frame] = await Promise.all([
        sample(nativeTag, 'PositionX'),
        sample(frameTag, 'PositionX'),
      ]);
      expect(
        Math.abs(native.model[0] - frame.model[0]) <= LAID_OUT_TOLERANCE
      ).toBe(true);
      expect(await restStateOf(nativeTag, ['PositionX'])).toBe('');
      expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
    }
  );
});

const REPLACED_REF = 'NativeLayoutLifecycleReplacedBox';
const RECYCLED_REF = 'NativeLayoutLifecycleRecycledBox';
const CSS_END_OPACITY = 0.2;
const RECYCLE_READS = 30;
const RECYCLE_SWAPS = 10;

const REPLACED_MOVE = layoutOf(
  { originX: { duration: TRACK_MS } },
  { name: 'replaced' }
);
const RECYCLED_ENTERING = entryExitOf(
  { opacity: { initial: 0, to: 1, duration: DURATION } },
  { name: 'recycled' }
);

/** A native X track that gives the trace the mount time of its view. */
const MOUNT_MARK = entryExitOf({
  originX: { initial: BOX, duration: DURATION },
});

type RecycleSlot = 'replaced' | 'recycled';

/**
 * The checks of one swap that failed; whether the stop of the old track came
 * after the mount of the new view; whether a read of the new tag showed a
 * playback of the old tag: then both tags had one layer.
 */
type SwapOutcome = {
  problems: string;
  isStoppedAfterMount: boolean;
  isReuseShown: boolean;
};

/**
 * The stop of the old track can reach a recycled layer only when it comes after
 * the mount of the new view, so at least one swap must have that order. A read
 * shows the reuse only when it also comes before that stop, so the count of
 * such reads is a record, not a check.
 */
async function runSwaps(caseName: string, swap: () => Promise<SwapOutcome>) {
  const before = await settledRead(caseName, 'before');
  const problems: string[] = [];
  let stoppedAfterMountCount = 0;
  let reuseShownCount = 0;
  for (let index = 0; index < RECYCLE_SWAPS; index++) {
    const outcome = await swap();
    if (outcome.problems !== '') {
      problems.push(`swap ${index}: ${outcome.problems}`);
    }
    stoppedAfterMountCount += outcome.isStoppedAfterMount ? 1 : 0;
    reuseShownCount += outcome.isReuseShown ? 1 : 0;
  }
  console.log(
    `LIFECYCLE-RECYCLE-COUNT | ${caseName} | swaps ${RECYCLE_SWAPS} | stop after the mount ${stoppedAfterMountCount} | reuse shown ${reuseShownCount} | failed swaps ${problems.length}`
  );
  expect(problems.join(' | ')).toBe('');
  expect(stoppedAfterMountCount > 0).toBe(true);
  expect(growthOf(before, await settledRead(caseName, 'after'))).toBe('');
}

async function swapAfterNativeTrack(): Promise<SwapOutcome> {
  await render(<RecycleScene slot="replaced" left={START_LEFT} />);
  const replacedTag = getTestComponent(REPLACED_REF).getTag();
  await afterMountOf(() => sample(replacedTag, 'Opacity'));
  await wait(50);
  await takeTrace();
  callbacks.length = 0;
  await render(<RecycleScene slot="replaced" left={END_LEFT} />);
  await wait(DURATION / 2);
  const isLive = (await sample(replacedTag, 'PositionX')).playbacks.length > 0;

  await render(<RecycleScene slot="recycled" left={START_LEFT} />);
  const recycledTag = getTestComponent(RECYCLED_REF).getTag();
  await afterMountOf(() => sample(recycledTag, 'Opacity'));
  const reads = await readRecycledView(recycledTag, ['PositionX', 'Opacity']);
  const missing = await waitForCallbacks(['recycled:true']);
  const events = await takeTraceUntilCommandsEnd(reads.events);
  printRecycle('native track', replacedTag, recycledTag, reads, events);
  const recycledEnd = summarizeEndOf(events, recycledTag);
  return outcomeOf(
    [
      !isLive && 'no live track before the swap',
      missing !== '' && `missing callbacks ${missing}`,
      commandsWithoutOneResult(events.filter(isHostEvent)),
      recycledEnd !== 'TrackEnded:Opacity:true > Ended:Finished:None' &&
        `recycled view ${recycledEnd}`,
      callbacks.join() !== 'replaced:false,recycled:true' &&
        `callbacks ${callbacks.join()}`,
      reads.modelsOffLayout(
        'PositionX',
        centerOfBox(START_LEFT),
        mountTimeOf(events, recycledTag)
      ),
      reads.playbacksOfTagAfterEnd(replacedTag, events),
      await restStateOf(recycledTag, ['PositionX', 'Opacity']),
    ],
    isStoppedAfterMount(events, replacedTag, recycledTag),
    reads.readsWithPlaybackOf(replacedTag).length > 0
  );
}

async function swapAfterCSSTransition(): Promise<SwapOutcome> {
  await render(<CSSRecycleScene slot="replaced" opacity={1} />);
  const replacedTag = getTestComponent(REPLACED_REF).getTag();
  await afterMountOf(() => sample(replacedTag, 'Opacity'));
  await wait(50);
  await takeTrace();
  await render(<CSSRecycleScene slot="replaced" opacity={CSS_END_OPACITY} />);
  await wait(TRACK_MS / 3);
  const live = await sample(replacedTag, 'Opacity');
  const isLive =
    live.playbacks.length === 1 && live.presentation[0] > CSS_END_OPACITY + 0.1;

  await render(<CSSRecycleScene slot="recycled" opacity={CSS_END_OPACITY} />);
  const recycledTag = getTestComponent(RECYCLED_REF).getTag();
  await afterMountOf(() => sample(recycledTag, 'Opacity'));
  const reads = await readRecycledView(recycledTag, ['Opacity']);
  const events = await takeTraceUntilCommandsEnd(reads.events);
  printRecycle('CSS stop', replacedTag, recycledTag, reads, events);
  const replacedEnd = summarizeEndOf(events, replacedTag);
  const recycledCSS = summarizeOf(
    events.filter(({ owner }) => owner === 'CSSTransition'),
    recycledTag
  );
  return outcomeOf(
    [
      !isLive && 'no live transition before the swap',
      commandsWithoutOneResult(events.filter(isHostEvent)),
      replacedEnd !== 'TrackEnded:Opacity:false > Ended:Cancelled:None' &&
        `replaced view ${replacedEnd}`,
      recycledCSS !== '' && `CSS on the recycled view ${recycledCSS}`,
      reads.modelsOffLayout(
        'Opacity',
        CSS_END_OPACITY,
        mountTimeOf(events, recycledTag)
      ),
      reads.playbacksOfTagAfterEnd(replacedTag, events),
      await restStateOf(recycledTag, ['Opacity']),
    ],
    isStoppedAfterMount(events, replacedTag, recycledTag),
    reads.readsWithPlaybackOf(replacedTag).length > 0
  );
}

const mountTimeOf = (events: TraceEvent[], tag: number) =>
  timeOf(events, tag, 'LayoutStartMounted');

const isStoppedAfterMount = (
  events: TraceEvent[],
  replacedTag: number,
  recycledTag: number
) =>
  (timeOf(events, replacedTag, 'TrackEnded') ?? 0) >
  (mountTimeOf(events, recycledTag) ?? Infinity);

const outcomeOf = (
  checks: (string | false)[],
  isStoppedAfterMount: boolean,
  isReuseShown: boolean
): SwapOutcome => ({
  problems: checks
    .filter((check) => check !== false && check !== '')
    .join('; '),
  isStoppedAfterMount,
  isReuseShown,
});

type RecycleReads = Awaited<ReturnType<typeof readRecycledView>>;

const showsPlaybackOf = ({ playbacks }: { playbacks: string[] }, tag: number) =>
  playbacks.some((id) => id.includes(`.${tag}.`));

/**
 * The reads of the view that took the place of the replaced view, from the
 * mount of the replacement, and the trace of the same time.
 */
async function readRecycledView(tag: number, targets: string[]) {
  const rows: {
    timeMs: number;
    target: string;
    model: number[];
    playbacks: string[];
  }[] = [];
  const events: TraceEvent[] = [];
  for (let read = 0; read < RECYCLE_READS; read++) {
    for (const target of targets) {
      const { model, playbacks, monotonicTimeMs } = await sample(tag, target);
      rows.push({
        timeMs: monotonicTimeMs,
        target,
        model,
        playbacks: playbackIdsOf({ playbacks }),
      });
    }
    events.push(...(await takeTrace()));
    await waitForFrames(1);
  }
  return {
    rows,
    events,
    /**
     * The reads of `target` after `mountMs` whose model is not `expected`.
     * Android creates a view before its mount, with no layout.
     */
    modelsOffLayout: (
      target: string,
      expected: number,
      mountMs: number | undefined
    ) =>
      mountMs === undefined
        ? 'no LayoutStartMounted of the new view in the trace'
        : rows
            .filter(
              (row) =>
                row.target === target &&
                row.timeMs > mountMs &&
                Math.abs(row.model[0] - expected) > LAID_OUT_TOLERANCE
            )
            .map((row) => `${row.model[0]} at ${row.timeMs.toFixed(1)}`)
            .join(', '),
    readsWithPlaybackOf: (otherTag: number) =>
      rows.filter((row) => showsPlaybackOf(row, otherTag)),
    /** The reads after the result of `tag` that still show a playback of it. */
    playbacksOfTagAfterEnd: (otherTag: number, traced: TraceEvent[]) => {
      const endMs = traced.find(
        (event) => event.tag === otherTag && event.event === 'Ended'
      )?.monotonicTimeMs;
      return rows
        .filter((row) => endMs !== undefined && row.timeMs > endMs)
        .filter((row) => showsPlaybackOf(row, otherTag))
        .map((row) => `${row.target} at ${row.timeMs.toFixed(1)}`)
        .join(', ');
    },
  };
}

/**
 * A read of the new tag that shows a playback of the old tag is a read of one
 * layer.
 */
function printRecycle(
  caseName: string,
  replacedTag: number,
  recycledTag: number,
  reads: RecycleReads,
  events: TraceEvent[]
) {
  const sharedReads = reads.readsWithPlaybackOf(replacedTag);
  console.log(
    `LIFECYCLE-RECYCLE | ${caseName} | ${JSON.stringify({
      replacedTag,
      recycledTag,
      readsWithPlaybackOfReplacedTag: sharedReads.length,
      firstSharedRead: sharedReads[0],
      firstRead: reads.rows[0],
      replaced: summarizeOf(events, replacedTag),
      recycled: summarizeOf(events, recycledTag),
      replacedEndMs: timeOf(events, replacedTag, 'Ended'),
      recycledMountMs: timeOf(events, recycledTag, 'LayoutStartMounted'),
    })}`
  );
}

const timeOf = (events: TraceEvent[], tag: number, type: string) =>
  events.find((event) => event.tag === tag && event.event === type)
    ?.monotonicTimeMs;

function RecycleScene({ slot, left }: { slot: RecycleSlot; left: number }) {
  return (
    <View style={lifecycleStyles.scene}>
      {slot === 'replaced' ? (
        <LifecycleBox
          key="replaced"
          refName={REPLACED_REF}
          left={left}
          layout={REPLACED_MOVE}
        />
      ) : (
        <LifecycleBox
          key="recycled"
          refName={RECYCLED_REF}
          left={left}
          entering={RECYCLED_ENTERING}
        />
      )}
    </View>
  );
}

const CSS_TRANSITION: CSSTransitionProperties = {
  transitionProperty: 'opacity',
  transitionDuration: TRACK_MS,
  transitionTimingFunction: 'linear',
};

function CSSRecycleScene({
  slot,
  opacity,
}: {
  slot: RecycleSlot;
  opacity: number;
}) {
  return (
    <View style={lifecycleStyles.scene}>
      {slot === 'replaced' ? (
        <LifecycleBox
          key="replaced"
          refName={REPLACED_REF}
          opacity={opacity}
          transition={CSS_TRANSITION}
        />
      ) : (
        <LifecycleBox
          key="recycled"
          refName={RECYCLED_REF}
          opacity={opacity}
          transition={CSS_TRANSITION}
          entering={MOUNT_MARK}
        />
      )}
    </View>
  );
}

type LifecycleBoxProps = Pick<
  React.ComponentProps<typeof Animated.View>,
  'layout' | 'entering' | 'exiting'
> & {
  refName: string;
  left?: number;
  opacity?: number;
  transition?: CSSTransitionProperties;
};

function LifecycleBox({
  refName,
  left = START_LEFT,
  opacity = 1,
  transition,
  ...animations
}: LifecycleBoxProps) {
  return (
    <Animated.View
      ref={useTestRef(refName)}
      {...animations}
      style={[lifecycleStyles.box, { marginLeft: left, opacity }, transition]}
    />
  );
}

const TEARDOWN_NATIVE_REF = 'NativeLayoutLifecycleTeardownNative';
const TEARDOWN_FRAME_REF = 'NativeLayoutLifecycleTeardownFrame';
const TEARDOWN_EXIT_REF = 'NativeLayoutLifecycleTeardownExit';
const TEARDOWN_FRAME_EXIT_REF = 'NativeLayoutLifecycleTeardownFrameExit';
const TEARDOWN_CSS_REF = 'NativeLayoutLifecycleTeardownCSS';
const TEARDOWN_QUEUED_REF = 'NativeLayoutLifecycleTeardownQueued';
const TEARDOWN_REFS = [
  TEARDOWN_QUEUED_REF,
  TEARDOWN_NATIVE_REF,
  TEARDOWN_FRAME_REF,
  TEARDOWN_EXIT_REF,
  TEARDOWN_FRAME_EXIT_REF,
  TEARDOWN_CSS_REF,
];
const TEARDOWN_CALLBACKS = [
  'teardownNative',
  'teardownFrame',
  'teardownExit',
  'teardownFrameExit',
  'teardownQueued',
];

const teardownMoveOf = (name: string) =>
  layoutOf({ originX: { duration: TRACK_MS } }, { name });
const teardownExitOf = (name: string) =>
  entryExitOf({ opacity: { initial: 1, to: 0, duration: TRACK_MS } }, { name });
const TEARDOWN_NATIVE_MOVE = teardownMoveOf('teardownNative');
const TEARDOWN_FRAME_MOVE = frameDrivenOf(teardownMoveOf('teardownFrame'));
const TEARDOWN_EXIT = teardownExitOf('teardownExit');
const TEARDOWN_FRAME_EXIT = frameDrivenOf(teardownExitOf('teardownFrameExit'));
const TEARDOWN_QUEUED_MOVE = teardownMoveOf('teardownQueued');

type TeardownState = {
  left: number;
  queuedLeft: number;
  isExitMounted: boolean;
  opacity: number;
};
const TEARDOWN_START: TeardownState = {
  left: START_LEFT,
  queuedLeft: START_LEFT,
  isExitMounted: true,
  opacity: 1,
};
let setTeardown: (state: TeardownState) => void = () => {};

/**
 * Each box with a named callback gets one start, so each callback name is one
 * command. The commit at the stop starts the queued box and a CSS run.
 */
function TeardownScene() {
  const [{ left, queuedLeft, isExitMounted, opacity }, setState] =
    useState<TeardownState>(TEARDOWN_START);
  setTeardown = setState;
  return (
    <View>
      <LifecycleBox
        refName={TEARDOWN_NATIVE_REF}
        left={left}
        layout={TEARDOWN_NATIVE_MOVE}
      />
      <LifecycleBox
        refName={TEARDOWN_FRAME_REF}
        left={left}
        layout={TEARDOWN_FRAME_MOVE}
      />
      {isExitMounted && (
        <LifecycleBox refName={TEARDOWN_EXIT_REF} exiting={TEARDOWN_EXIT} />
      )}
      {isExitMounted && (
        <LifecycleBox
          refName={TEARDOWN_FRAME_EXIT_REF}
          exiting={TEARDOWN_FRAME_EXIT}
        />
      )}
      <LifecycleBox
        refName={TEARDOWN_CSS_REF}
        opacity={opacity}
        transition={CSS_TRANSITION}
      />
      <LifecycleBox
        refName={TEARDOWN_QUEUED_REF}
        left={queuedLeft}
        layout={TEARDOWN_QUEUED_MOVE}
      />
    </View>
  );
}

/** The end events of `tag`: a track end or a command result. */
const summarizeEndOf = (events: TraceEvent[], tag: number) =>
  summarizeOf(
    events.filter(({ event }) => event === 'TrackEnded' || event === 'Ended'),
    tag
  );

/**
 * Where the start of the commit at the stop came: the scheduling of the commit
 * against the stop decides it.
 */
function queuedStartPathOf(events: TraceEvent[], tag: number) {
  const closeIndex = events.findIndex(({ event }) => event === 'SurfaceClosed');
  const startIndex = events.findIndex(
    (event) => event.tag === tag && event.event === 'LayoutStartPending'
  );
  if (startIndex < 0) {
    return 'no start';
  }
  return startIndex < closeIndex
    ? 'start before the close'
    : 'start after the close';
}

/**
 * The events of the surface after its `SurfaceClosed` that are not the end of a
 * command or of a track: a start, a mount, or a frame update.
 */
function workAfterClose(events: TraceEvent[]) {
  const closeIndex = events.findIndex(({ event }) => event === 'SurfaceClosed');
  if (closeIndex < 0) {
    return 'no SurfaceClosed';
  }
  return summarize(
    events
      .slice(closeIndex + 1)
      .filter(
        ({ event }) => !['TrackEnded', 'Ended', 'ClientEnded'].includes(event)
      )
  );
}

/**
 * The results after the close that are not `SurfaceDestroyed`. A CSS run can
 * also end `Cancelled`: the unmount of its view can stop it before the close
 * (`SURFACE_END_OUTCOMES` of `nativeTransitions.test.tsx`).
 */
function endsOfClosedCommands(events: TraceEvent[]) {
  const closeIndex = events.findIndex(({ event }) => event === 'SurfaceClosed');
  const isSurfaceEnd = ({ owner, outcome }: TraceEvent) =>
    outcome === 'SurfaceDestroyed' ||
    (owner === 'CSSTransition' && outcome === 'Cancelled');
  return events
    .slice(closeIndex + 1)
    .filter((event) => event.event === 'Ended' && !isSurfaceEnd(event))
    .map(
      ({ owner, tag, outcome, reason }) =>
        `${owner} ${tag} ${outcome}:${reason}`
    )
    .join(', ');
}

async function mountedRefsOf(tags: Record<string, number>) {
  const mounted: string[] = [];
  for (const [refName, tag] of Object.entries(tags)) {
    if (await hasView(tag)) {
      mounted.push(refName);
    }
  }
  return mounted.join();
}

/** The names of `names` with more than one callback. */
const callbackCountsOf = (names: string[]) =>
  names
    .map(
      (name) =>
        [
          name,
          callbacks.filter((entry) => entry.startsWith(`${name}:`)),
        ] as const
    )
    .filter(([, entries]) => entries.length > 1)
    .map(([name, entries]) => `${name} ${entries.join()}`)
    .join(', ');

const TWIN_NATIVE_REF = 'NativeLayoutLifecycleTwinNative';
const TWIN_MS = 3000;
const TWIN_NATIVE_MOVE = layoutOf(
  { originX: { duration: TWIN_MS } },
  { name: 'native' }
);
const TWIN_FRAME_MOVE = frameDrivenOf(
  layoutOf({ originX: { duration: TWIN_MS } }, { name: 'frame' })
);

let setTwinLeft: (left: number) => void = () => {};

function TwinBoxes() {
  const [left, setLeft] = useState(START_LEFT);
  setTwinLeft = setLeft;
  return (
    <View>
      <LifecycleBox
        refName={TWIN_NATIVE_REF}
        left={left}
        layout={TWIN_NATIVE_MOVE}
      />
      <LifecycleBox
        refName={FRAME_BOX_REF}
        left={left}
        layout={TWIN_FRAME_MOVE}
      />
    </View>
  );
}

function ClippedTwinScene() {
  return (
    <ClippingScrollView style={lifecycleStyles.surfaceScroll}>
      <TwinBoxes />
      <View style={lifecycleStyles.scrollFiller} />
    </ClippingScrollView>
  );
}

const SURFACE_CYCLES = 20;
const SURFACE_BOX_REF = 'NativeLayoutLifecycleSurfaceBox';
const TWINLESS_MOVE = layoutOf({ originX: { duration: TRACK_MS } });
let setTwinlessLeft: (left: number) => void = () => {};

function TwinlessSurfaceScene() {
  const [left, setLeft] = useState(START_LEFT);
  setTwinlessLeft = setLeft;
  return (
    <LifecycleBox
      refName={SURFACE_BOX_REF}
      left={left}
      layout={TWINLESS_MOVE}
    />
  );
}

const LIST_SIZE = 40;
const LIST_ROUNDS = 12;
const LIST_ROUND_FRAMES = 3;
const LIST_SCROLL_STEP = 170;
const LIST_SCROLL_RANGE = 600;
const LIST_MOVE = layoutOf({
  originX: { duration: TRACK_MS },
  originY: { duration: DURATION },
});
const LIST_ENTERING = entryExitOf({
  opacity: { initial: 0, to: 1, duration: DURATION },
});
const LIST_EXITING = entryExitOf({
  opacity: { initial: 1, to: 0, duration: DURATION },
});

const listRef = React.createRef<FlatList<number>>();
let listItems: number[] = [];
let setListItems: (items: number[]) => void = () => {};

function ListScene() {
  const [items, setItems] = useState(() => {
    listItems = Array.from({ length: LIST_SIZE }, (_, item) => item);
    return listItems;
  });
  setListItems = setItems;
  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={String}
      renderItem={({ item }) => <ListRow item={item} />}
      style={lifecycleStyles.list}
      initialNumToRender={12}
      windowSize={3}
      removeClippedSubviews={false}
    />
  );
}

function ListRow({ item }: { item: number }) {
  return (
    <Animated.View
      layout={LIST_MOVE}
      entering={LIST_ENTERING}
      exiting={LIST_EXITING}
      style={[lifecycleStyles.box, { marginLeft: (item % 3) * 40 }]}
    />
  );
}

/** The count of each event with its target, result, and refusal reason. */
const eventCountsOf = (events: TraceEvent[]) =>
  events.reduce<Record<string, number>>((counts, event) => {
    const key = summarize([event]);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

const REPARENT_REF = 'NativeLayoutLifecycleReparentBox';
const REPARENT_MOVE = layoutOf(
  { originX: { duration: TRACK_MS } },
  { name: 'reparent' }
);

/**
 * A wrapper with a background is a host view, so the commit that wraps the box
 * moves the box from the scene view to the wrapper with its tag.
 */
function ReparentScene({
  left,
  isWrapped,
}: {
  left: number;
  isWrapped: boolean;
}) {
  return (
    <View style={lifecycleStyles.scene}>
      <View style={isWrapped && lifecycleStyles.hostWrapper}>
        <LifecycleBox
          refName={REPARENT_REF}
          left={left}
          layout={REPARENT_MOVE}
        />
      </View>
    </View>
  );
}

const COVER_SCREEN = 'NativeLayoutLifecycleCover';
const Stack = createNativeStackNavigator();
const stackNavigation =
  createNavigationContainerRef<Record<string, undefined>>();

function StackScene() {
  return (
    <View collapsable={false} style={lifecycleStyles.stack}>
      <NavigationContainer ref={stackNavigation}>
        <Stack.Navigator>
          <Stack.Screen
            name="NativeLayoutLifecycleMoving"
            component={MovingScreen}
          />
          <Stack.Screen name={COVER_SCREEN} component={CoverScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

function MovingScreen() {
  return (
    <View style={lifecycleStyles.screen}>
      <TwinBoxes />
    </View>
  );
}

function CoverScreen() {
  return <View style={lifecycleStyles.screen} />;
}

const lifecycleStyles = StyleSheet.create({
  scene: {
    width: 300,
    height: 120,
  },
  box: {
    width: BOX,
    height: BOX,
    backgroundColor: 'teal',
  },
  hostWrapper: {
    backgroundColor: 'whitesmoke',
  },
  surfaceScroll: {
    height: 200,
  },
  scrollFiller: {
    height: 3000,
  },
  list: {
    height: 300,
  },
  stack: {
    height: 400,
  },
  screen: {
    flex: 1,
    backgroundColor: 'white',
  },
});
