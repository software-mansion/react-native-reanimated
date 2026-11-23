import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  useTestRef,
  wait,
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
  settledRead,
  summarizeOf,
} from './nativeLayoutLifecycleKit';
import type { TraceEvent } from './nativeLayoutTestKit';
import {
  callbacks,
  DURATION,
  END_LEFT,
  entryExitOf,
  frameDrivenOf,
  hasNativeLayoutRoute,
  isHostEvent,
  layoutOf,
  movingGeometryTest,
  sample,
  START_LEFT,
  summarize,
  takeTrace,
  takeTraceUntilSurfaceClosed,
} from './nativeLayoutTestKit';

const TRACK_MS = 1600;
const BOX = 30;
const SURFACE_TAIL_MS = TRACK_MS + 500;

/**
 * Base behavior (owner item): on Apple the views of retained exits that are
 * children of the surface root stay mounted after the stop of the surface.
 */
const KEEPS_ROOT_EXIT_VIEWS_AT_SURFACE_STOP = Platform.OS === 'ios';

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
      ).toBe(hasNativeCSSTransitions);

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
});

const CSS_END_OPACITY = 0.2;

const CSS_TRANSITION: CSSTransitionProperties = {
  transitionProperty: 'opacity',
  transitionDuration: TRACK_MS,
  transitionTimingFunction: 'linear',
};

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

const lifecycleStyles = StyleSheet.create({
  box: {
    width: BOX,
    height: BOX,
    backgroundColor: 'teal',
  },
});
