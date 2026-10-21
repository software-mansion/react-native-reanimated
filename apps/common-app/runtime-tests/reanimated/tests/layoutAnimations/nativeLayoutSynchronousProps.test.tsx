/*
 * The tests have state checks, trace checks, and checks of a value after a planned wait. Where a test had a
 * comparison of the native box with its frame-driven twin at one instant, each sample of the opacity of the
 * native box is on the declared timeline of its leaf at its own sample time, from the origin of its command
 * (statement A of `native layout reference`), and each frame of the opacity leaf of the twin is on a replay of
 * that timeline (statement B). The tolerance of an opacity sample is 0.03.
 *
 * The method does not prove the distance of the two boxes at one instant. The tests `a frame-driven start
 * takes native X and opacity tracks after an opacity write, ...` play a case of `native layout reference` with
 * a write: statements A and B, and statement M for the opacity model of the native box after the frame
 * driver took its tracks. The write step ends when a read of the native box has the written model, and that
 * read is before the trace event of the capture of the second build (the `WRITE-MODEL` row and the `CAPTURE`
 * row). They do not prove the end value of the opacity after the hand-over: the leaf and the animated style
 * both write the opacity. The end check is the native box against its model and against the model of the
 * twin, and the tests print the end as a `WRITTEN-END` row.
 *
 * The two tests `... shows during a frame-driven layout animation with an opacity leaf` have state checks of
 * the writer (no playback key, the model equal to the presentation, each presentation farther in the direction
 * of the writer than the one before) and waits on the callbacks. The distance of the writer from its line on
 * the wall clock is a case of `native layout live clock`.
 *
 * The suite needs the synchronous props path (`synchronousProps` of the routes of the build): a build without
 * it does not run the suite. A size change has a native track only where `PLAYS_SIZE_CHANGE` holds; on the
 * other platforms each width test has the evidence of the frame driver in its place.
 */
import React, { useMemo } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import type {
  LayoutAnimationFunction,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import { hasNativeCSSTransitions } from '../nativeAnimationObservation';
import { blockUIThread } from './nativeLayoutLoad';
import type {
  Place,
  ReferenceCase,
  Samples,
} from './nativeLayoutReferencePlay';
import {
  expectModelOnFrames,
  expectNativeRows,
  expectNoKeyAfterTransfer,
  expectReference,
  expectTimelineRows,
  FRAME_DRIVER_EARLY_MS,
  FRAME_DRIVER_LATE_MS,
  FRAME_TOLERANCE,
  MATRIX_TOLERANCE,
  plannedReadsOf,
  play,
} from './nativeLayoutReferencePlay';
import type {
  Band,
  DeclaredKey,
  Leaf,
  Leaves,
  SizeBoxProps,
  TakenRow,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbacks,
  CSSLoopBox,
  declaredTimelineOf,
  DURATION,
  END_LEFT,
  expectFrameTimeline,
  FRAME_BOX_REF,
  FRAME_MS,
  frameRecordedOf,
  hasNativeLayoutRoute,
  isHostEvent,
  isNear,
  LAYOUT_DURATION,
  layoutOf,
  linearAt,
  LOOP_DURATION,
  NATIVE_ANIMATION_ROUTES,
  opacities,
  PLAYS_SIZE_CHANGE,
  POSITION_TOLERANCE,
  routeOf,
  sample,
  mountScene,
  narrowClockOffset,
  PairOf,
  pairLayoutsOf,
  playedTracksOf,
  readFrameRecords,
  recordCallback,
  resetFrameRecords,
  SAMPLED_OPACITY_TOLERANCE,
  sampleOpacity,
  sampleOpacityPair,
  samplePosition,
  sampleRows,
  SECOND_BOX_REF,
  secondSurfaceSceneOf,
  setSecondSurfaceBox,
  START_LEFT,
  summarize,
  SURFACE_STOP_END_AFTER_SYNCHRONOUS_WRITE,
  takeRows,
  takeTrace,
  takeTraceOf,
  takeTraceUntilSurfaceClosed,
  waitForCallbacks,
  waitForModel,
  withTracking,
  WriterBox,
  movingGeometryTest,
} from './nativeLayoutTestKit';

const OTHER_REF = 'NativeLayoutSynchronousOtherBox';
const BLOCK_MS = 40;
const DROP = 30;
const REPETITIONS = 10;
const ORANGE = '#ffa500ff';

const GROUP_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:Opacity > Admitted';
const GROUP_END =
  'TrackEnded:Opacity:true > TrackEnded:PositionX:true > Ended:Finished:None';
const X_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > Admitted';
const FRAME_DRIVEN_START =
  'LayoutBuildFailed:EndpointMismatch > FrameUpdateMounted:Opacity > FrameUpdateMounted:PositionX';
const CANCELLED_GROUP =
  'TrackEnded:PositionX:false > TrackEnded:Opacity:false > Ended:Cancelled:None';

const X_REPLACEMENT =
  'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionX:false > Ended:Interrupted:None > TrackStarted:PositionX > Admitted > TrackEnded:PositionX:true > Ended:Finished:None';
const FRAME_DRIVEN_X_TAKEOVER =
  'LayoutBuildFailed:UnsupportedTiming > FrameUpdateMounted:PositionX > TrackEnded:PositionX:false > Ended:Cancelled:None';
const CSS_START = 'Received > TrackStarted:Opacity > Admitted';
const GROUP_START_OVER_CSS = `${CSS_START} > LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Opacity:false > Ended:Interrupted:None > TrackStarted:PositionX > TrackStarted:Opacity > Admitted`;

const FRAME_DRIVEN_TAKEOVER = `LayoutBuildFailed:EndpointMismatch > FrameUpdateMounted:PositionX > FrameUpdateMounted:Opacity > ${CANCELLED_GROUP}`;

const staleWarnings: string[] = [];
function recordWarning(message: string) {
  if (message.includes('synchronous path')) {
    staleWarnings.push(message);
  }
}

let recordsUIWarnings = false;
function recordUIWarnings() {
  if (recordsUIWarnings) {
    return;
  }
  recordsUIWarnings = true;
  scheduleOnUI(() => {
    'worklet';
    const uiConsole = global.console;
    const warn = uiConsole.warn;
    uiConsole.warn = (...args: unknown[]) => {
      scheduleOnRN(recordWarning, String(args[0]));
      warn(...args);
    };
  });
}

const colors: Record<string, SharedValue<string>> = {};

type WriterBoxProps = React.ComponentProps<typeof WriterBox>;

function ColorBox({
  left,
  layout,
  opacity,
  hasOpacityTransition = false,
}: WriterBoxProps & { opacity: number; hasOpacityTransition?: boolean }) {
  const ref = useTestRef(BOX_REF);
  const color = useSharedValue('teal');
  colors[BOX_REF] = color;
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: color.value,
  }));
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      style={[
        styles.box,
        { marginLeft: left, opacity },
        hasOpacityTransition && {
          transitionProperty: 'opacity',
          transitionDuration: LAYOUT_DURATION,
          transitionTimingFunction: 'linear',
        },
        animatedStyle,
      ]}
    />
  );
}

const CALLBACK_FALSE_OPACITY = 0.4;
const CALLBACK_TRUE_OPACITY = 0.7;

function CallbackWriterScene({
  left,
  hasLeafCallback,
}: {
  left: number;
  hasLeafCallback: boolean;
}) {
  const ref = useTestRef(BOX_REF);
  const otherRef = useTestRef(OTHER_REF);
  const other = useSharedValue(1);
  const layout = useMemo<LayoutAnimationFunction>(
    () => (values) => {
      'worklet';
      return {
        initialValues: { originX: values.currentOriginX },
        animations: {
          originX: withTiming(
            values.targetOriginX,
            { duration: LAYOUT_DURATION, easing: Easing.linear },
            hasLeafCallback
              ? () => {
                  'worklet';
                }
              : undefined
          ),
        },
        callback: (finished: boolean) => {
          'worklet';
          other.value = finished
            ? CALLBACK_TRUE_OPACITY
            : CALLBACK_FALSE_OPACITY;
          scheduleOnRN(
            recordCallback,
            'writer',
            finished,
            global._getAnimationTimestamp()
          );
        },
      };
    },
    [hasLeafCallback, other]
  );
  const otherStyle = useAnimatedStyle(() => ({ opacity: other.value }));
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={layout}
        style={[styles.box, { marginLeft: left }]}
      />
      <Animated.View ref={otherRef} style={[styles.box, otherStyle]} />
    </View>
  );
}

const fadeLeaves = (
  durationMs: number,
  from: number,
  hasCallback = false
): Leaves => ({
  originX: { duration: durationMs, hasCallback },
  opacity: { duration: durationMs, initial: from, to: 0.5 },
});

const LONG_SURFACE_LAYOUT = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3), {
  name: 'surface',
});
const SHORT_SURFACE_LAYOUT = layoutOf(fadeLeaves(DURATION, 0.9), {
  name: 'surface',
});
const longSurfaceScene = secondSurfaceSceneOf({
  layout: LONG_SURFACE_LAYOUT,
  BoxComponent: WriterBox,
});
const shortSurfaceScene = secondSurfaceSceneOf({
  layout: SHORT_SURFACE_LAYOUT,
  BoxComponent: WriterBox,
});

/** The key that an opacity leaf of a pair declares for the two boxes. */
const opacityKeyOf = (leaf: Leaf, from: number, to: number): DeclaredKey => ({
  key: 'opacity',
  target: 'Opacity',
  tolerance: SAMPLED_OPACITY_TOLERANCE,
  leaf,
  from,
  to,
  startsOnScreen: false,
});

async function takeOpacityPair(
  tag: number,
  frameTag: number
): Promise<Samples> {
  const [native, frame] = await Promise.all(
    [tag, frameTag].map((each) => sample(each, 'Opacity'))
  );
  return { native: { Opacity: native }, frame: { Opacity: frame } };
}

/** The rows of the two boxes from now, for a time. */
const takeOpacityRows = (tag: number, frameTag: number, forMs: number) =>
  takeRows(
    () => takeOpacityPair(tag, frameTag),
    ({ native }) => native.Opacity,
    performance.now() + forMs
  );

/** The rows from the start of the first native track of the events. */
function playingRowsOf(rows: TakenRow<Samples>[], events: TraceEvent[]) {
  const started = events.find(({ event }) => event === 'TrackStarted');
  const playing = rows
    .map(({ row }) => ({
      native: row.native.Opacity,
      frame: row.frame.Opacity,
    }))
    .filter(
      ({ native }) =>
        started !== undefined &&
        native.monotonicTimeMs >= started.monotonicTimeMs
    );
  expect(playing.length > 0).toBe(true);
  return playing;
}

/**
 * Statement A of `native layout reference` for the opacity track of the one
 * command of the events: each sample of the native box while the track plays is
 * on the declared timeline of the key.
 */
function expectOpacityReads(
  testName: string,
  rows: TakenRow<Samples>[],
  events: TraceEvent[],
  clockOffset: Band,
  key: DeclaredKey
) {
  const command = events.find(({ event }) => event === 'Admitted');
  if (!command) {
    throw new Error(`The trace has no native command: ${summarize(events)}`);
  }
  const tracks = playedTracksOf(events, command, clockOffset, [key]);
  const reads = expectNativeRows({ rows, tracks }, MATRIX_TOLERANCE);
  expectTimelineRows(testName, tracks, plannedReadsOf(rows), reads);
  const checked = reads.filter(({ isChecked }) => isChecked);
  const largestDistance = checked
    .flatMap(({ residual }) => residual.distances)
    .reduce((largest, distance) => Math.max(largest, distance), 0);
  console.log(
    `REFERENCE | ${testName} | opacity of the command ${command.generation} | reads ${reads.length}, checked ${checked.length}, largest distance ${largestDistance}`
  );
}

/**
 * Statement B of `native layout reference` for the last opacity leaf that the
 * frame driver played on the twin.
 */
function expectTwinOpacityFrames({ leaf, from, to }: DeclaredKey) {
  const record = readFrameRecords()
    .filter(
      ({ box, key, frames }) =>
        box === 'frame' && key === 'opacity' && frames.length > 0
    )
    .pop();
  if (!record) {
    throw new Error('The frame driver has no opacity frame of the twin.');
  }
  expectFrameTimeline(
    { record, timeline: declaredTimelineOf(leaf, from, to) },
    FRAME_TOLERANCE
  );
}

const HANDED_STYLE_OPACITY = 0.2;
const HANDED_WRITTEN_OPACITY = 0.6;
const HANDED_COMMIT_MS = LAYOUT_DURATION / 4 + 4 * FRAME_MS;
function HandedWriterBox(box: SizeBoxProps) {
  return <WriterBox {...box} initialOpacity={HANDED_STYLE_OPACITY} />;
}

const handedPlaceOf = (left: number, top: number): Place => ({
  left,
  top,
  opacity: HANDED_STYLE_OPACITY,
});

/**
 * The first models are `first`, and each model from the first `then` is `then`:
 * the names of what is not so.
 */
function modelOrderFaultsOf(models: number[], first: number, then: number) {
  const firstThen = models.findIndex((model) => isNear(model, then));
  const prefix = firstThen < 0 ? models.length : firstThen;
  const countNot = (part: number[], value: number) =>
    part.filter((model) => !isNear(model, value)).length;
  const notFirst = countNot(models.slice(0, prefix), first);
  const notThen = countNot(models.slice(prefix), then);
  return [
    ...(firstThen < 0
      ? [`no row of ${models.length} has the model ${then}`]
      : []),
    ...(notFirst > 0
      ? [
          `${notFirst} of the first ${prefix} rows do not have the model ${first}`,
        ]
      : []),
    ...(notThen > 0
      ? [
          `${notThen} of the ${models.length - prefix} rows after them do not have the model ${then}`,
        ]
      : []),
  ].join(', ');
}

function OpaqueWriterBox(box: SizeBoxProps) {
  return <WriterBox {...box} initialOpacity={1} />;
}

function writeAfterBlock<TValue>(
  targets: SharedValue<TValue>[],
  value: TValue,
  blockMs = BLOCK_MS
) {
  scheduleOnUI(() => {
    'worklet';
    blockUIThread(blockMs);
    for (const target of targets) {
      target.value = value;
    }
  });
}

describe('native layout animations and the synchronous props path', () => {
  if (!hasNativeLayoutRoute || !NATIVE_ANIMATION_ROUTES.synchronousProps) {
    return;
  }

  const boxScene = (
    layout: LayoutAnimationFunction | undefined,
    left: number,
    top = 0,
    backdrop = 'white'
  ) => (
    <View style={[styles.container, { backgroundColor: backdrop }]}>
      <WriterBox left={left} top={top} layout={layout} />
    </View>
  );

  type PairBox = Pick<WriterBoxProps, 'left' | 'top' | 'initialOpacity'>;

  const pairOf = (leaves: (hasCallback: boolean) => Leaves) => {
    const { nativeLayout, frameLayout } = pairLayoutsOf(leaves);
    const layouts = {
      nativeLayout,
      frameLayout: frameRecordedOf('frame', frameLayout),
    };
    return (box: PairBox, padding = 0) => (
      <PairOf
        BoxComponent={WriterBox}
        box={box}
        padding={padding}
        {...layouts}
      />
    );
  };

  function writePair(value: number) {
    opacities[BOX_REF].value = value;
    opacities[FRAME_BOX_REF].value = value;
  }

  async function startGroupAndWrite(
    scene: (left: number) => Parameters<typeof render>[0]
  ) {
    const tag = await mountScene(scene(START_LEFT));
    await render(scene(END_LEFT));
    await wait(LAYOUT_DURATION / 4);
    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(GROUP_START);
    const trackAt = linearAt(
      0.3,
      0.5,
      startEvents[0].monotonicTimeMs,
      LAYOUT_DURATION
    );
    opacities[BOX_REF].value = 0.6;
    await wait(4 * FRAME_MS);
    const written = await sampleOpacity(tag);
    expect(written.keys).toBe(2);
    expect(isNear(written.model, 0.6)).toBe(true);
    expect(
      isNear(
        written.presentation,
        trackAt(written.time),
        SAMPLED_OPACITY_TOLERANCE
      )
    ).toBe(true);
    return { tag, trackAt };
  }

  for (const tracks of [false, true]) {
    movingGeometryTest(
      `an animated style writes the opacity during a native opacity track, and a next start whose fixed end value differs from the written opacity is frame-driven (tracking: ${tracks})`,
      async () => {
        await withTracking(tracks, async () => {
          const layout = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3), {
            name: 'direct',
          });
          const tag = await mountScene(boxScene(layout, START_LEFT));
          await render(boxScene(layout, END_LEFT));
          await wait(LAYOUT_DURATION / 4);
          const pending = (await takeTraceOf(tag))[0];
          const trackAt = linearAt(
            0.3,
            0.5,
            pending.monotonicTimeMs,
            LAYOUT_DURATION
          );
          opacities[BOX_REF].value = 0.6;
          await wait(4 * FRAME_MS);
          for (const row of await sampleRows(tag, 4, LAYOUT_DURATION / 8)) {
            expect(row.keys).toBe(2);
            expect(isNear(row.model, 0.6)).toBe(true);
            expect(
              isNear(
                row.presentation,
                trackAt(row.time),
                SAMPLED_OPACITY_TOLERANCE
              )
            ).toBe(true);
          }
          await wait(LAYOUT_DURATION / 2);
          const end = await sampleOpacity(tag);
          expect(end.keys).toBe(0);
          expect(isNear(end.model, 0.6)).toBe(true);
          expect(isNear(end.presentation, 0.6)).toBe(true);
          expect(callbacks.join()).toBe('direct:true');
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            GROUP_END
          );

          callbacks.length = 0;
          await render(boxScene(layout, START_LEFT));
          await wait(4 * FRAME_MS);
          expect(summarize(await takeTraceOf(tag))).toBe(FRAME_DRIVEN_START);
          const start = await sampleOpacity(tag);
          expect(start.keys).toBe(0);
          expect(isNear(start.model, 0.3, SAMPLED_OPACITY_TOLERANCE)).toBe(
            true
          );
          await wait(LAYOUT_DURATION + 200);
          const secondEnd = await sampleOpacity(tag);
          expect(isNear(secondEnd.model, 0.5)).toBe(true);
          expect(isNear(secondEnd.presentation, 0.5)).toBe(true);
          expect(callbacks.join()).toBe('direct:true');
          expect((await takeTraceOf(tag)).length).toBe(0);
          await render(null);
        });
      }
    );
  }

  for (const tracks of [false, true]) {
    for (const hasOpacityLeaf of [false, true]) {
      const settledWrite = `a layout change of the parent after a settled opacity write starts ${hasOpacityLeaf ? 'native X and opacity tracks' : 'a native X track'} (tracking: ${tracks})`;
      movingGeometryTest(settledWrite, async () => {
        await withTracking(tracks, async () => {
          const fade = opacityKeyOf(
            { duration: LAYOUT_DURATION, initial: 0.9, to: 0.6 },
            0.9,
            0.6
          );
          const pair = pairOf((hasCallback) => ({
            originX: { duration: LAYOUT_DURATION, hasCallback },
            ...(hasOpacityLeaf && { opacity: fade.leaf }),
          }));
          const box = { left: 0, initialOpacity: 0.2 };
          recordUIWarnings();
          const tag = await mountScene(pair(box));
          const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
          const clockOffset = await narrowClockOffset(tag);
          staleWarnings.length = 0;
          writePair(0.6);
          await wait(300);
          const settled = await sampleOpacityPair(tag, frameTag);
          expect(isNear(settled.native.presentation, 0.6)).toBe(true);
          expect(isNear(settled.frame.presentation, 0.6)).toBe(true);
          await takeTrace();
          resetFrameRecords();

          await render(pair(box, END_LEFT));
          const rows = await takeOpacityRows(
            tag,
            frameTag,
            LAYOUT_DURATION / 2
          );
          const events = (await takeTraceOf(tag)).filter(isHostEvent);
          expect(summarize(events)).toBe(
            hasOpacityLeaf ? GROUP_START : X_START
          );
          for (const { native, frame } of playingRowsOf(rows, events)) {
            expect(native.playbacks.length).toBe(hasOpacityLeaf ? 2 : 1);
            expect(isNear(native.model[0], 0.6)).toBe(true);
            if (!hasOpacityLeaf) {
              expect(isNear(native.presentation[0], 0.6)).toBe(true);
              expect(
                isNear(frame.presentation[0], 0.6, SAMPLED_OPACITY_TOLERANCE)
              ).toBe(true);
            }
          }
          if (hasOpacityLeaf) {
            expectOpacityReads(settledWrite, rows, events, clockOffset, fade);
            expectTwinOpacityFrames(fade);
          }
          await wait(LAYOUT_DURATION);
          const end = await sampleOpacityPair(tag, frameTag);
          expect(end.native.keys).toBe(0);
          expect(isNear(end.native.presentation, 0.6)).toBe(true);
          expect(isNear(end.frame.presentation, 0.6)).toBe(true);
          expect([...callbacks].sort().join()).toBe('frame:true,native:true');
          expect(staleWarnings.length).toBe(0);
          await render(null);
        });
      });
    }
  }

  // The stale props warning exists only in development builds of the native code.
  if (__DEV__) {
    for (const tracks of [false, true]) {
      movingGeometryTest(
        `an opacity write after a UI block in the JS turn of a commit gives ${tracks ? 'no stale props warning' : 'one stale props warning for each view'} (tracking: ${tracks})`,
        async () => {
          await withTracking(tracks, async () => {
            const pair = pairOf((hasCallback) => ({
              originX: { duration: DURATION, hasCallback },
            }));
            const box = { left: 0, initialOpacity: 0.2 };
            recordUIWarnings();
            const tag = await mountScene(pair(box));
            const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
            staleWarnings.length = 0;
            writeAfterBlock(
              [opacities[BOX_REF], opacities[FRAME_BOX_REF]],
              0.6
            );
            await render(pair(box, END_LEFT));
            await wait(DURATION + 300);
            const warningsOf = (viewTag: number) =>
              staleWarnings.filter((warning) =>
                warning.includes(`View ${viewTag} `)
              ).length;
            expect(staleWarnings.length).toBe(tracks ? 0 : 2);
            expect(warningsOf(tag)).toBe(tracks ? 0 : 1);
            expect(warningsOf(frameTag)).toBe(tracks ? 0 : 1);
            const end = await sampleOpacityPair(tag, frameTag);
            expect(isNear(end.native.model, 0.6)).toBe(true);
            if (tracks) {
              expect(isNear(end.frame.model, 0.6)).toBe(true);
            }
            await render(null);
          });
        }
      );
    }
  }

  const writeBeforeMount =
    'an opacity write between a commit and its mount keeps the native start';
  movingGeometryTest(writeBeforeMount, async () => {
    const pair = pairOf((hasCallback) =>
      fadeLeaves(DURATION, 0.9, hasCallback)
    );
    const fade = opacityKeyOf(fadeLeaves(DURATION, 0.9).opacity!, 0.9, 0.5);
    const tag = await mountScene(pair({ left: START_LEFT }));
    const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
    const clockOffset = await narrowClockOffset(tag);
    for (let index = 0; index < REPETITIONS; index++) {
      writePair(0.5);
      await wait(100);
      await takeTrace();
      callbacks.length = 0;
      resetFrameRecords();
      writeAfterBlock([opacities[BOX_REF], opacities[FRAME_BOX_REF]], 0.8);
      await render(pair({ left: index % 2 === 0 ? END_LEFT : START_LEFT }));
      const rows = await takeOpacityRows(tag, frameTag, DURATION / 2);
      const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(startEvents)).toBe(GROUP_START);
      for (const { native } of playingRowsOf(rows, startEvents)) {
        expect(native.playbacks.length).toBe(2);
        expect(isNear(native.model[0], 0.8)).toBe(true);
      }
      expectOpacityReads(
        writeBeforeMount,
        rows,
        startEvents,
        clockOffset,
        fade
      );
      expectTwinOpacityFrames(fade);
      await wait(DURATION / 2 + 100);
      const end = await sampleOpacity(tag);
      expect(end.keys).toBe(0);
      expect(isNear(end.model, 0.8)).toBe(true);
      expect(isNear(end.presentation, 0.8)).toBe(true);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        GROUP_END
      );
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    }
    await render(null);
  });

  movingGeometryTest(
    'an opacity write between a later commit and its mount keeps the native tracks',
    async () => {
      const layout = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3), {
        name: 'rewrite',
      });
      const tag = await mountScene(boxScene(layout, START_LEFT));
      await render(boxScene(layout, END_LEFT));
      await wait(LAYOUT_DURATION / 8);
      const pending = (await takeTraceOf(tag))[0];
      const trackAt = linearAt(
        0.3,
        0.5,
        pending.monotonicTimeMs,
        LAYOUT_DURATION
      );
      for (const [value, color] of [
        [0.8, 'yellow'],
        [0.7, 'white'],
        [0.6, 'yellow'],
      ] as const) {
        writeAfterBlock([opacities[BOX_REF]], value);
        await render(boxScene(layout, END_LEFT, 0, color));
        await wait(3 * FRAME_MS);
        for (const row of await sampleRows(tag, 2, LAYOUT_DURATION / 8)) {
          expect(row.keys).toBe(2);
          expect(isNear(row.model, value)).toBe(true);
          expect(
            isNear(
              row.presentation,
              trackAt(row.time),
              SAMPLED_OPACITY_TOLERANCE
            )
          ).toBe(true);
        }
      }
      await wait(LAYOUT_DURATION);
      const end = await sampleOpacity(tag);
      expect(end.keys).toBe(0);
      expect(isNear(end.presentation, 0.6)).toBe(true);
      expect(callbacks.join()).toBe('rewrite:true');
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        GROUP_END
      );
      await render(null);
    }
  );

  for (const tracks of [false, true]) {
    for (const second of ['a native replacement', 'a spring Y'] as const) {
      movingGeometryTest(
        `an opacity write during a native X track shows at once and stays after ${second} (tracking: ${tracks})`,
        async () => {
          await withTracking(tracks, async () => {
            const isReplacement = second === 'a native replacement';
            const layout = layoutOf(
              {
                originX: { duration: LAYOUT_DURATION, onlyWhenChanged: true },
                originY: { isSpring: true, onlyWhenChanged: true },
              },
              { name: 'x-only' }
            );
            const tag = await mountScene(boxScene(layout, START_LEFT));
            await render(boxScene(layout, END_LEFT));
            await wait(LAYOUT_DURATION / 4);
            for (const value of [0.6, 0.7]) {
              opacities[BOX_REF].value = value;
              await wait(2 * FRAME_MS);
              const written = await sampleOpacity(tag);
              expect(written.keys).toBe(1);
              expect(isNear(written.model, value)).toBe(true);
              expect(isNear(written.presentation, value)).toBe(true);
              await wait(LAYOUT_DURATION / 8);
            }
            expect(
              summarize((await takeTraceOf(tag)).filter(isHostEvent))
            ).toBe(X_START);

            await render(
              isReplacement
                ? boxScene(layout, END_LEFT / 2)
                : boxScene(layout, END_LEFT, DROP)
            );
            await wait(2 * FRAME_MS);
            for (const row of await sampleRows(tag, 4, LAYOUT_DURATION / 8)) {
              expect(row.keys).toBe(isReplacement ? 1 : 0);
              expect(isNear(row.model, 0.7)).toBe(true);
              expect(isNear(row.presentation, 0.7)).toBe(true);
            }
            await wait(LAYOUT_DURATION + 500);
            const end = await sampleOpacity(tag);
            expect(end.keys).toBe(0);
            expect(isNear(end.presentation, 0.7)).toBe(true);
            expect(callbacks.join()).toBe('x-only:false,x-only:true');
            expect(
              summarize((await takeTraceOf(tag)).filter(isHostEvent))
            ).toBe(isReplacement ? X_REPLACEMENT : FRAME_DRIVEN_X_TAKEOVER);
            await render(null);
          });
        }
      );
    }
  }

  /**
   * The spring of the second commit gives the X track and the opacity track to
   * the frame driver, after a write of the opacity during the tracks.
   */
  const handedWrite: ReferenceCase = {
    flow: 'layout',
    leaves: {
      originX: { duration: LAYOUT_DURATION, onlyWhenChanged: true },
      opacity: {
        duration: LAYOUT_DURATION,
        initial: 0.9,
        to: HANDED_STYLE_OPACITY,
      },
      originY: { isSpring: true, onlyWhenChanged: true },
    },
    places: [
      handedPlaceOf(START_LEFT, 0),
      handedPlaceOf(END_LEFT, 0),
      handedPlaceOf(END_LEFT, DROP),
    ],
    commitTimesMs: [HANDED_COMMIT_MS],
    totalMs: LAYOUT_DURATION,
    box: { Box: HandedWriterBox },
    write: {
      atMs: LAYOUT_DURATION / 4,
      targets: ['Opacity'],
      run: () => {
        writePair(HANDED_WRITTEN_OPACITY);
        return waitForModel(
          getTestComponent(BOX_REF).getTag(),
          'Opacity',
          ([opacity]) => isNear(opacity, HANDED_WRITTEN_OPACITY)
        );
      },
    },
  };

  for (const tracks of [false, true]) {
    const handed = `a frame-driven start takes native X and opacity tracks after an opacity write, and the opacity model of the view is on the frames of the frame driver (tracking: ${tracks})`;
    movingGeometryTest(handed, async () => {
      await withTracking(tracks, async () => {
        const played = await play(handedWrite);
        expectReference(handed, handedWrite, played);
        expectNoKeyAfterTransfer(played, 'Opacity');
        expectModelOnFrames(handed, played, 'Opacity');
        const hostEvents = played.events.filter(isHostEvent);
        expect(summarize(hostEvents)).toBe(
          `${GROUP_START} > ${FRAME_DRIVEN_TAKEOVER}`
        );
        const timeOf = (name: string) =>
          hostEvents.find(({ event }) => event === name)?.monotonicTimeMs ??
          NaN;
        const [{ reads: waitReads }] = played.modelWaits;
        const written = waitReads[waitReads.length - 1];
        const captureTimes = played.captures.map(
          ({ eventTimeMs }) => eventTimeMs
        );
        expect(
          captureTimes.length > 0 &&
            captureTimes.every((time) => written.monotonicTimeMs < time)
            ? ''
            : `the read with the written model is not before each capture of the second build: ${captureTimes.map((time) => (time - written.monotonicTimeMs).toFixed(3)).join()} ms from the read to the ${captureTimes.length} captures`
        ).toBe('');
        const beforeTakeover = [
          ...played.rows.map(({ row }) => row.native.Opacity),
          ...waitReads,
        ]
          .filter(
            ({ monotonicTimeMs }) =>
              monotonicTimeMs >= timeOf('TrackStarted') &&
              monotonicTimeMs < timeOf('LayoutBuildFailed')
          )
          .sort((one, other) => one.monotonicTimeMs - other.monotonicTimeMs);
        for (const { playbacks } of beforeTakeover) {
          expect(playbacks.length).toBe(2);
        }
        expect(
          modelOrderFaultsOf(
            beforeTakeover.map(({ model }) => model[0]),
            HANDED_STYLE_OPACITY,
            HANDED_WRITTEN_OPACITY
          )
        ).toBe('');
        const { native, frame } = played.end!;
        console.log(
          `WRITTEN-END | ${handed} | native model ${native.Opacity.model[0]}, native presentation ${native.Opacity.presentation[0]}, twin model ${frame.Opacity.model[0]}, twin presentation ${frame.Opacity.presentation[0]}`
        );
        expect(native.Opacity.playbacks.length).toBe(0);
        expect(
          isNear(native.Opacity.presentation[0], native.Opacity.model[0])
        ).toBe(true);
        expect(isNear(native.Opacity.model[0], frame.Opacity.model[0])).toBe(
          true
        );
      });
    });
  }

  movingGeometryTest(
    'the removal of the view after an opacity write during a native group gives the callback false one time',
    async () => {
      const layout = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3), {
        name: 'removed',
      });
      const scene = (left: number, isMounted = true) => (
        <View style={styles.container}>
          {isMounted && <WriterBox left={left} layout={layout} />}
        </View>
      );
      const { tag } = await startGroupAndWrite(scene);
      await render(scene(END_LEFT, false));
      await wait(200);
      expect(callbacks.join()).toBe('removed:false');
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        CANCELLED_GROUP
      );
      await wait(LAYOUT_DURATION);
      expect(callbacks.join()).toBe('removed:false');
      expect((await takeTraceOf(tag)).length).toBe(0);
      await render(null);
    }
  );

  const WIDE = 3 * BOX_SIZE;
  const WIDTH_START = PLAYS_SIZE_CHANGE
    ? 'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Width > Admitted'
    : 'LayoutBuildFailed:UnsupportedTarget';
  const WIDTH_END = PLAYS_SIZE_CHANGE
    ? 'TrackEnded:Width:true > Ended:Finished:None'
    : '';
  const WIDTH_REMOVED = PLAYS_SIZE_CHANGE
    ? 'TrackEnded:Width:false > Ended:Cancelled:None'
    : '';
  const WIDTH_KEYS = PLAYS_SIZE_CHANGE ? 1 : 0;
  const widthTrack = PLAYS_SIZE_CHANGE
    ? 'a native width track'
    : `a frame-driven width animation (${WIDTH_START})`;
  // 0.5 pt and the travel of two display frames of the width.
  const WIDTH_TOLERANCE =
    POSITION_TOLERANCE + (2 * FRAME_MS * (WIDE - BOX_SIZE)) / LAYOUT_DURATION;

  const widthScene = (
    layout: LayoutAnimationFunction,
    width: number,
    isMounted = true
  ) => (
    <View style={styles.container}>
      {isMounted && (
        <WriterBox left={START_LEFT} width={width} layout={layout} />
      )}
    </View>
  );

  async function expectWidthOnTrack(tag: number, startEvents: TraceEvent[]) {
    if (!PLAYS_SIZE_CHANGE) {
      await expectWidthOnFrameDriver(tag, startEvents);
      return;
    }
    const widthAt = linearAt(
      BOX_SIZE,
      WIDE,
      startEvents[0].monotonicTimeMs,
      LAYOUT_DURATION
    );
    const width = await sample(tag, 'Width');
    expect(width.playbacks.length).toBe(1);
    expect(width.model[0]).toBe(WIDE);
    expect(
      isNear(
        width.presentation[0],
        widthAt(width.monotonicTimeMs),
        WIDTH_TOLERANCE
      )
    ).toBe(true);
  }

  /**
   * Two samples of the width, one eighth of the animation apart, are on the
   * linear timeline of the frame driver from the refusal (`routeOf`).
   */
  async function expectWidthOnFrameDriver(tag: number, events: TraceEvent[]) {
    const samples = [await sample(tag, 'Width')];
    await wait(LAYOUT_DURATION / 8);
    samples.push(await sample(tag, 'Width'));
    const widthAt = (sinceRefusalMs: number) =>
      BOX_SIZE +
      (WIDE - BOX_SIZE) *
        Math.min(1, Math.max(0, sinceRefusalMs / LAYOUT_DURATION));
    const isOnFrameDriverTimeline = (
      { model: [width] }: { model: number[] },
      sinceRefusalMs: number
    ) =>
      width >=
        widthAt(sinceRefusalMs - FRAME_DRIVER_LATE_MS) - POSITION_TOLERANCE &&
      width <=
        widthAt(sinceRefusalMs + FRAME_DRIVER_EARLY_MS) + POSITION_TOLERANCE;
    expect(
      routeOf(events, tag, 'Width', samples, isOnFrameDriverTimeline).kind
    ).toBe('frame-driven');
  }

  async function takeWidthStart(tag: number) {
    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(WIDTH_START);
    return startEvents;
  }

  async function expectWidthEnd(tag: number, opacity: number, name: string) {
    const end = await sampleOpacity(tag);
    expect(end.keys).toBe(0);
    expect(isNear(end.model, opacity)).toBe(true);
    expect(isNear(end.presentation, opacity)).toBe(true);
    // The layout rounds the width to the pixel grid.
    expect(
      isNear(
        (await sample(tag, 'Width')).presentation[0],
        WIDE,
        1 / PixelRatio.get()
      )
    ).toBe(true);
    expect(callbacks.join()).toBe(`${name}:true`);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      WIDTH_END
    );
  }

  test(`an opacity write during ${widthTrack} shows at once and keeps the track`, async () => {
    const layout = layoutOf(
      { width: { duration: LAYOUT_DURATION } },
      { name: 'width' }
    );
    const tag = await mountScene(widthScene(layout, BOX_SIZE));
    await render(widthScene(layout, WIDE));
    await wait(LAYOUT_DURATION / 4);
    const startEvents = await takeWidthStart(tag);
    for (const value of [0.6, 0.7]) {
      opacities[BOX_REF].value = value;
      await wait(2 * FRAME_MS);
      const written = await sampleOpacity(tag);
      expect(written.keys).toBe(WIDTH_KEYS);
      expect(isNear(written.model, value)).toBe(true);
      expect(isNear(written.presentation, value)).toBe(true);
      await expectWidthOnTrack(tag, startEvents);
      await wait(LAYOUT_DURATION / 8);
    }
    await wait(LAYOUT_DURATION);
    await expectWidthEnd(tag, 0.7, 'width');
    await render(null);
  });

  test(`an opacity write between a commit and its mount keeps the start of ${widthTrack}`, async () => {
    const layout = layoutOf(
      { width: { duration: LAYOUT_DURATION } },
      { name: 'width' }
    );
    const tag = await mountScene(widthScene(layout, BOX_SIZE));
    writeAfterBlock([opacities[BOX_REF]], 0.8);
    await render(widthScene(layout, WIDE));
    await wait(3 * FRAME_MS);
    const startEvents = await takeWidthStart(tag);
    for (let index = 0; index < 2; index++) {
      const written = await sampleOpacity(tag);
      expect(written.keys).toBe(WIDTH_KEYS);
      expect(isNear(written.model, 0.8)).toBe(true);
      expect(isNear(written.presentation, 0.8)).toBe(true);
      await expectWidthOnTrack(tag, startEvents);
      await wait(LAYOUT_DURATION / 2);
    }
    await wait(LAYOUT_DURATION / 4);
    await expectWidthEnd(tag, 0.8, 'width');
    await render(null);
  });

  test(`the removal of the view after an opacity write during ${widthTrack} gives the callback false one time`, async () => {
    const layout = layoutOf(
      { width: { duration: LAYOUT_DURATION } },
      { name: 'removed' }
    );
    const tag = await mountScene(widthScene(layout, BOX_SIZE));
    await render(widthScene(layout, WIDE));
    await wait(LAYOUT_DURATION / 4);
    const startEvents = await takeWidthStart(tag);
    opacities[BOX_REF].value = 0.6;
    await wait(4 * FRAME_MS);
    await expectWidthOnTrack(tag, startEvents);
    await render(widthScene(layout, WIDE, false));
    await wait(200);
    expect(callbacks.join()).toBe('removed:false');
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      WIDTH_REMOVED
    );
    await wait(LAYOUT_DURATION);
    expect(callbacks.join()).toBe('removed:false');
    expect((await takeTraceOf(tag)).length).toBe(0);
    await render(null);
  });

  movingGeometryTest(
    'the stop of a second surface after an opacity write during a native group gives the callback false one time',
    async () => {
      if (!isSecondSurfaceAvailable()) {
        return;
      }
      const surfaceId = await startSecondSurface(longSurfaceScene);
      await wait(50);
      const tag = getTestComponent(SECOND_BOX_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      setSecondSurfaceBox({ left: END_LEFT });
      await wait(LAYOUT_DURATION / 4);
      opacities[SECOND_BOX_REF].value = 0.6;
      await wait(4 * FRAME_MS);
      const written = await sampleOpacity(tag);
      expect(written.keys).toBe(2);
      expect(isNear(written.model, 0.6)).toBe(true);
      await takeTrace();

      await stopSecondSurface(surfaceId);
      const events = await takeTraceUntilSurfaceClosed(surfaceId);
      await wait(500);
      expect(callbacks.join()).toBe('surface:false');
      expect(
        summarize(
          events.filter((event) => event.tag === tag).filter(isHostEvent)
        )
      ).toBe(
        `TrackEnded:PositionX:false > TrackEnded:Opacity:false > Ended:${SURFACE_STOP_END_AFTER_SYNCHRONOUS_WRITE}:None`
      );
      await wait(LAYOUT_DURATION);
      expect(callbacks.join()).toBe('surface:false');
      expect((await takeTraceOf(tag)).length).toBe(0);
    }
  );

  movingGeometryTest(
    'a background color write during a native X and opacity group keeps the tracks',
    async () => {
      const layout = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3), {
        name: 'disjoint',
      });
      const scene = (left: number) => (
        <View style={styles.container}>
          <ColorBox left={left} layout={layout} opacity={0.5} />
        </View>
      );
      const tag = await mountScene(scene(START_LEFT));
      await render(scene(END_LEFT));
      await wait(LAYOUT_DURATION / 4);
      const pending = (await takeTraceOf(tag))[0];
      const trackAt = linearAt(
        0.3,
        0.5,
        pending.monotonicTimeMs,
        LAYOUT_DURATION
      );
      colors[BOX_REF].value = 'orange';
      await wait(4 * FRAME_MS);
      for (const row of await sampleRows(tag, 3, LAYOUT_DURATION / 8)) {
        expect(row.keys).toBe(2);
        expect(isNear(row.model, 0.5)).toBe(true);
        expect(
          isNear(row.presentation, trackAt(row.time), SAMPLED_OPACITY_TOLERANCE)
        ).toBe(true);
      }
      await wait(LAYOUT_DURATION / 2);
      const end = await sampleOpacity(tag);
      expect(end.keys).toBe(0);
      expect(isNear(end.presentation, 0.5)).toBe(true);
      expect(
        await getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor')
      ).toBe(ORANGE);
      expect(callbacks.join()).toBe('disjoint:true');
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        GROUP_END
      );
      await render(null);
    }
  );

  for (const hasLeafCallback of [false, true]) {
    movingGeometryTest(
      `a layout animation callback writes the opacity of another view (leaf callback: ${hasLeafCallback})`,
      async () => {
        const scene = (left: number) => (
          <CallbackWriterScene left={left} hasLeafCallback={hasLeafCallback} />
        );
        const tag = await mountScene(scene(START_LEFT));
        const otherTag = getTestComponent(OTHER_REF).getTag();
        await render(scene(END_LEFT));
        await wait(LAYOUT_DURATION / 4);
        expect((await samplePosition(tag)).keys).toBe(hasLeafCallback ? 0 : 1);
        expect(isNear((await sampleOpacity(otherTag)).presentation, 1)).toBe(
          true
        );

        await render(scene(END_LEFT / 2));
        await wait(4 * FRAME_MS);
        const replaced = await sampleOpacity(otherTag);
        expect(isNear(replaced.model, CALLBACK_FALSE_OPACITY)).toBe(true);
        expect(isNear(replaced.presentation, CALLBACK_FALSE_OPACITY)).toBe(
          true
        );
        expect(callbacks.join()).toBe('writer:false');

        await wait(LAYOUT_DURATION + 300);
        const end = await sampleOpacity(otherTag);
        expect(isNear(end.model, CALLBACK_TRUE_OPACITY)).toBe(true);
        expect(isNear(end.presentation, CALLBACK_TRUE_OPACITY)).toBe(true);
        expect(callbacks.join()).toBe('writer:false,writer:true');
        await render(null);
      }
    );
  }

  for (const tracks of [false, true]) {
    for (const startsFlat of [false, true]) {
      movingGeometryTest(
        `a flattening change of the parent moves a view with a native group to another parent (${startsFlat ? 'the parent unflattens' : 'the parent flattens'}, tracking: ${tracks})`,
        async () => {
          await withTracking(tracks, async () => {
            const layout = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3), {
              name: 'moved',
            });
            const scene = (left: number, isFlat = startsFlat) => (
              <View style={styles.container}>
                <View style={isFlat ? undefined : styles.unflattened}>
                  <WriterBox left={left} layout={layout} />
                </View>
              </View>
            );
            const { tag, trackAt } = await startGroupAndWrite(scene);
            const before = await samplePosition(tag);
            expect(before.keys).toBe(2);
            await takeTrace();

            await render(scene(END_LEFT, !startsFlat));
            await wait(4 * FRAME_MS);
            for (let index = 0; index < 3; index++) {
              const position = await samplePosition(tag);
              const opacity = await sampleOpacity(tag);
              expect(position.keys).toBe(0);
              expect(isNear(position.y, before.y)).toBe(false);
              expect(position.presentationX > before.presentationX).toBe(true);
              expect(position.presentationX < before.x).toBe(true);
              expect(isNear(opacity.model, opacity.presentation)).toBe(true);
              expect(
                isNear(
                  opacity.presentation,
                  trackAt(opacity.time),
                  SAMPLED_OPACITY_TOLERANCE
                )
              ).toBe(true);
              await wait(LAYOUT_DURATION / 8);
            }
            expect(
              summarize((await takeTraceOf(tag)).filter(isHostEvent))
            ).toBe(FRAME_DRIVEN_TAKEOVER);
            expect(callbacks.join()).toBe('moved:false');
            await wait(LAYOUT_DURATION + 300);
            expect(callbacks.join()).toBe('moved:false,moved:true');
            expect((await sampleOpacity(tag)).keys).toBe(0);
            expect(getTestComponent(BOX_REF).getTag()).toBe(tag);
            await render(null);
          });
        }
      );
    }
  }

  for (const hasOpacityLeaf of [false, true]) {
    movingGeometryTest(
      `a native CSS opacity transition and a native layout start in one commit, with a background color write before the mount (opacity leaf: ${hasOpacityLeaf})`,
      async () => {
        if (!hasNativeCSSTransitions) {
          return;
        }
        const layout = layoutOf(
          {
            originX: { duration: LAYOUT_DURATION },
            ...(hasOpacityLeaf && {
              opacity: { duration: LAYOUT_DURATION, initial: 0.9, to: 0.2 },
            }),
          },
          { name: 'with-css' }
        );
        const scene = (left: number, opacity: number) => (
          <View style={styles.container}>
            <ColorBox
              left={left}
              opacity={opacity}
              layout={layout}
              hasOpacityTransition
            />
          </View>
        );
        for (let index = 0; index < 3; index++) {
          const tag = await mountScene(scene(START_LEFT, 1));
          writeAfterBlock([colors[BOX_REF]], 'orange');
          await render(scene(END_LEFT, 0.2));
          await wait(3 * FRAME_MS);
          const rows = await sampleRows(tag, 4, LAYOUT_DURATION / 8);
          rows.forEach((row, rowIndex) => {
            expect(row.keys).toBe(2);
            expect(row.presentation < (hasOpacityLeaf ? 0.9 : 1)).toBe(true);
            expect(row.presentation > 0.2).toBe(true);
            if (rowIndex > 0) {
              expect(row.presentation < rows[rowIndex - 1].presentation).toBe(
                true
              );
            }
          });
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            hasOpacityLeaf ? GROUP_START_OVER_CSS : `${CSS_START} > ${X_START}`
          );
          await wait(LAYOUT_DURATION);
          const end = await sampleOpacity(tag);
          expect(end.keys).toBe(0);
          expect(isNear(end.model, 0.2)).toBe(true);
          expect(isNear(end.presentation, 0.2)).toBe(true);
          expect(
            (await takeTraceOf(tag)).filter(
              ({ event, outcome }) =>
                event === 'Ended' && outcome === 'Finished'
            ).length
          ).toBe(hasOpacityLeaf ? 1 : 2);
          expect(
            await getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor')
          ).toBe(ORANGE);
          expect(callbacks.join()).toBe('with-css:true');
          await render(null);
        }
      }
    );
  }

  for (const tracks of [false, true]) {
    for (const writesBeforeCommit of [false, true]) {
      movingGeometryTest(
        `an opacity write ${writesBeforeCommit ? 'in the JS turn before the commit that starts' : 'during'} a frame-driven layout animation with an opacity leaf does not show while the animation runs (tracking: ${tracks})`,
        async () => {
          await withTracking(tracks, async () => {
            const layout = layoutOf(fadeLeaves(LAYOUT_DURATION, 0.3, true), {
              name: 'frame',
            });
            const tag = await mountScene(boxScene(layout, START_LEFT));
            if (writesBeforeCommit) {
              opacities[BOX_REF].value = 0.6;
            }
            await render(boxScene(layout, END_LEFT));
            const startMs = (await sampleOpacity(tag)).time;
            if (!writesBeforeCommit) {
              await wait(LAYOUT_DURATION / 4);
              opacities[BOX_REF].value = 0.6;
            }
            const layoutAt = linearAt(0.3, 0.5, startMs, LAYOUT_DURATION);
            await wait(2 * FRAME_MS);
            for (const row of await sampleRows(tag, 4, LAYOUT_DURATION / 8)) {
              expect(row.keys).toBe(0);
              expect(isNear(row.model, row.presentation)).toBe(true);
              expect(
                isNear(
                  row.presentation,
                  layoutAt(row.time),
                  SAMPLED_OPACITY_TOLERANCE
                )
              ).toBe(true);
            }
            expect(summarize(await takeTraceOf(tag))).toBe(
              'LayoutBuildFailed:UnsupportedTiming'
            );
            await wait(LAYOUT_DURATION);
            expect(callbacks.join()).toBe('frame:true');
            await render(null);
          });
        }
      );
    }
  }

  for (const order of ['second surface first', 'main surface first'] as const) {
    movingGeometryTest(
      `an opacity write from a worklet that follows the commits of two surfaces keeps the native start (request order: ${order})`,
      async () => {
        if (!isSecondSurfaceAvailable()) {
          return;
        }
        const mainScene = (backdrop: string) => (
          <View style={[styles.container, { backgroundColor: backdrop }]} />
        );
        await render(mainScene('white'));
        const surfaceId = await startSecondSurface(shortSurfaceScene);
        await wait(50);
        const tag = getTestComponent(SECOND_BOX_REF).getTag();
        const opacity = opacities[SECOND_BOX_REF];
        for (let index = 0; index < REPETITIONS; index++) {
          opacity.value = 0.5;
          await wait(100);
          await takeTrace();
          callbacks.length = 0;
          const left = index % 2 === 0 ? END_LEFT : START_LEFT;
          const color = index % 2 === 0 ? 'yellow' : 'white';
          writeAfterBlock([opacity], 0.8, 2 * BLOCK_MS);
          if (order === 'second surface first') {
            setSecondSurfaceBox({ left: left });
            await wait(10);
            await render(mainScene(color));
          } else {
            const rendered = render(mainScene(color));
            await wait(10);
            setSecondSurfaceBox({ left: left });
            await rendered;
          }
          await wait(DURATION + 300);
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            `${GROUP_START} > ${GROUP_END}`
          );
          const end = await sampleOpacity(tag);
          expect(end.keys).toBe(0);
          expect(isNear(end.model, 0.8)).toBe(true);
          expect(isNear(end.presentation, 0.8)).toBe(true);
          expect(callbacks.join()).toBe('surface:true');
        }
        await stopSecondSurface(surfaceId);
        await takeTraceUntilSurfaceClosed(surfaceId);
        await render(null);
      }
    );
  }

  const frameLayout = layoutOf(
    {
      originX: { duration: LAYOUT_DURATION, hasCallback: true },
      opacity: { duration: LAYOUT_DURATION, initial: 0.9, to: 0.2 },
    },
    { name: 'under-loop' }
  );

  const loopWriters: {
    name: string;
    Box: React.ComponentType<SizeBoxProps>;
    startWriter?: () => void;
    callbacks: string[];
    /** The sign of the change of the opacity that the writer makes. */
    direction: 1 | -1;
    end?: number;
  }[] = [
    {
      name: 'a CSS animation of the opacity',
      Box: CSSLoopBox,
      callbacks: ['under-loop:true'],
      direction: 1,
    },
    {
      name: 'a timing animation of an animated style',
      Box: OpaqueWriterBox,
      startWriter: () => {
        opacities[BOX_REF].value = withTiming(
          0.5,
          { duration: LOOP_DURATION, easing: Easing.linear },
          (finished) => {
            'worklet';
            scheduleOnRN(
              recordCallback,
              'writer',
              finished === true,
              global._getAnimationTimestamp()
            );
          }
        );
      },
      callbacks: ['under-loop:true', 'writer:true'],
      direction: -1,
      end: 0.5,
    },
  ];

  for (const {
    name,
    Box,
    startWriter,
    callbacks: expected,
    direction,
    end,
  } of loopWriters) {
    movingGeometryTest(
      `${name} shows during a frame-driven layout animation with an opacity leaf`,
      async () => {
        const scene = (left: number) => (
          <View style={styles.container}>
            <Box left={left} layout={frameLayout} />
          </View>
        );
        const tag = await mountScene(scene(START_LEFT));
        startWriter?.();
        await wait(300);
        await render(scene(END_LEFT));
        await wait(2 * FRAME_MS);
        const rows = await sampleRows(tag, 8, LAYOUT_DURATION / 16);
        for (const row of rows) {
          expect(row.keys).toBe(0);
          expect(isNear(row.model, row.presentation)).toBe(true);
        }
        const presentations = rows.map(({ presentation }) => presentation);
        expect(
          presentations
            .slice(1)
            .every(
              (value, index) => direction * (value - presentations[index]) > 0
            )
            ? ''
            : `the presentations ${presentations.join()} do not each go on in the direction ${direction}`
        ).toBe('');
        expect(summarize(await takeTraceOf(tag))).toBe(
          'LayoutBuildFailed:UnsupportedTiming'
        );
        expect(await waitForCallbacks(expected)).toBe('');
        expect(callbacks.join()).toBe(expected.join());
        if (end !== undefined) {
          expect(isNear((await sampleOpacity(tag)).presentation, end)).toBe(
            true
          );
        }
        await render(null);
      }
    );
  }
});

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 120,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
  unflattened: {
    opacity: 0.9,
  },
});
