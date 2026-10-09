import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  LayoutAnimationFunction,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  setDynamicFeatureFlag,
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
import { blockUIThread } from './nativeLayoutLoad';
import type { Leaves, TraceEvent } from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbacks,
  DURATION,
  END_LEFT,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutStarts,
  isHostEvent,
  isNear,
  LAYOUT_DURATION,
  layoutOf,
  linearAt,
  POSITION_TOLERANCE,
  sample,
  mountScene,
  PairOf,
  pairLayoutsOf,
  recordCallback,
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
  takeTrace,
  takeTraceOf,
  takeTraceUntilSurfaceClosed,
} from './nativeLayoutTestKit';

const OTHER_REF = 'NativeLayoutSynchronousOtherBox';
const TRACKING_FLAG = 'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS';
const LOOP_DURATION = 6 * DURATION;
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

const opacities: Record<string, SharedValue<number>> = {};

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

type WriterBoxProps = {
  left: number;
  top?: number;
  width?: number;
  layout?: LayoutAnimationFunction;
  initialOpacity?: number;
  refName?: string;
};

function WriterBox({
  left,
  top = 0,
  width = BOX_SIZE,
  layout,
  initialOpacity = 0.5,
  refName = BOX_REF,
}: WriterBoxProps) {
  const ref = useTestRef(refName);
  const opacity = useSharedValue(initialOpacity);
  opacities[refName] = opacity;
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      style={[
        styles.box,
        { marginLeft: left, marginTop: top, width },
        animatedStyle,
      ]}
    />
  );
}

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

const LOOP_KEYFRAMES = { from: { opacity: 0.2 }, to: { opacity: 0.8 } };

function CSSLoopBox({ left, layout }: WriterBoxProps) {
  const ref = useTestRef(BOX_REF);
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      style={[
        styles.box,
        {
          marginLeft: left,
          opacity: 0.2,
          animationName: LOOP_KEYFRAMES,
          animationDuration: LOOP_DURATION,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        },
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
  if (
    !hasNativeLayoutStarts ||
    !getStaticFeatureFlag('IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS')
  ) {
    return;
  }

  async function withTracking(tracks: boolean, body: () => Promise<void>) {
    setDynamicFeatureFlag(TRACKING_FLAG, tracks);
    try {
      await body();
    } finally {
      setDynamicFeatureFlag(TRACKING_FLAG, false);
    }
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
    const layouts = pairLayoutsOf(leaves);
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
    test(`an animated style writes the opacity during a native opacity track, and a next start whose fixed end value differs from the written opacity is frame-driven (tracking: ${tracks})`, async () => {
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
        expect(isNear(start.model, 0.3, SAMPLED_OPACITY_TOLERANCE)).toBe(true);
        await wait(LAYOUT_DURATION + 200);
        const secondEnd = await sampleOpacity(tag);
        expect(isNear(secondEnd.model, 0.5)).toBe(true);
        expect(isNear(secondEnd.presentation, 0.5)).toBe(true);
        expect(callbacks.join()).toBe('direct:true');
        expect((await takeTraceOf(tag)).length).toBe(0);
        await render(null);
      });
    });
  }

  for (const tracks of [false, true]) {
    for (const hasOpacityLeaf of [false, true]) {
      test(`a layout change of the parent after a settled opacity write starts ${hasOpacityLeaf ? 'native X and opacity tracks' : 'a native X track'} (tracking: ${tracks})`, async () => {
        await withTracking(tracks, async () => {
          const pair = pairOf((hasCallback) => ({
            originX: { duration: LAYOUT_DURATION, hasCallback },
            ...(hasOpacityLeaf && {
              opacity: { duration: LAYOUT_DURATION, initial: 0.9, to: 0.6 },
            }),
          }));
          const box = { left: 0, initialOpacity: 0.2 };
          recordUIWarnings();
          const tag = await mountScene(pair(box));
          const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
          staleWarnings.length = 0;
          writePair(0.6);
          await wait(300);
          const settled = await sampleOpacityPair(tag, frameTag);
          expect(isNear(settled.native.presentation, 0.6)).toBe(true);
          expect(isNear(settled.frame.presentation, 0.6)).toBe(true);
          await takeTrace();

          await render(pair(box, END_LEFT));
          await wait(2 * FRAME_MS);
          for (let index = 0; index < 4; index++) {
            const { native, frame } = await sampleOpacityPair(tag, frameTag);
            expect(native.keys).toBe(hasOpacityLeaf ? 2 : 1);
            expect(isNear(native.model, 0.6)).toBe(true);
            expect(
              isNear(
                native.presentation,
                frame.presentation,
                SAMPLED_OPACITY_TOLERANCE
              )
            ).toBe(true);
            if (!hasOpacityLeaf) {
              expect(isNear(native.presentation, 0.6)).toBe(true);
            }
            await wait(LAYOUT_DURATION / 8);
          }
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            hasOpacityLeaf ? GROUP_START : X_START
          );
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

  for (const tracks of [false, true]) {
    test(`an opacity write after a UI block in the JS turn of a commit gives ${tracks ? 'no stale props warning' : 'one stale props warning for each view'} (tracking: ${tracks})`, async () => {
      await withTracking(tracks, async () => {
        const pair = pairOf((hasCallback) => ({
          originX: { duration: DURATION, hasCallback },
        }));
        const box = { left: 0, initialOpacity: 0.2 };
        recordUIWarnings();
        const tag = await mountScene(pair(box));
        const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
        staleWarnings.length = 0;
        writeAfterBlock([opacities[BOX_REF], opacities[FRAME_BOX_REF]], 0.6);
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
    });
  }

  test('an opacity write between a commit and its mount keeps the native start', async () => {
    const pair = pairOf((hasCallback) =>
      fadeLeaves(DURATION, 0.9, hasCallback)
    );
    const tag = await mountScene(pair({ left: START_LEFT }));
    const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
    for (let index = 0; index < REPETITIONS; index++) {
      writePair(0.5);
      await wait(100);
      await takeTrace();
      callbacks.length = 0;
      writeAfterBlock([opacities[BOX_REF], opacities[FRAME_BOX_REF]], 0.8);
      await render(pair({ left: index % 2 === 0 ? END_LEFT : START_LEFT }));
      await wait(3 * FRAME_MS);
      const early = await sampleOpacityPair(tag, frameTag);
      const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(startEvents)).toBe(GROUP_START);
      const trackAt = linearAt(
        0.9,
        0.5,
        startEvents[0].monotonicTimeMs,
        DURATION
      );
      await wait(DURATION / 2);
      const middle = await sampleOpacityPair(tag, frameTag);
      for (const { native } of [early, middle]) {
        expect(native.keys).toBe(2);
        expect(isNear(native.model, 0.8)).toBe(true);
        expect(
          isNear(
            native.presentation,
            trackAt(native.time),
            SAMPLED_OPACITY_TOLERANCE
          )
        ).toBe(true);
      }
      expect(
        isNear(
          middle.native.presentation,
          middle.frame.presentation,
          SAMPLED_OPACITY_TOLERANCE
        )
      ).toBe(true);
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

  test('an opacity write between a later commit and its mount keeps the native tracks', async () => {
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
          isNear(row.presentation, trackAt(row.time), SAMPLED_OPACITY_TOLERANCE)
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
  });

  for (const tracks of [false, true]) {
    for (const second of ['a native replacement', 'a spring Y'] as const) {
      test(`an opacity write during a native X track shows at once and stays after ${second} (tracking: ${tracks})`, async () => {
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
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            X_START
          );

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
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            isReplacement ? X_REPLACEMENT : FRAME_DRIVEN_X_TAKEOVER
          );
          await render(null);
        });
      });
    }
  }

  for (const tracks of [false, true]) {
    test(`a frame-driven start takes native X and opacity tracks after an opacity write, and the view agrees with a frame-driven view (tracking: ${tracks})`, async () => {
      await withTracking(tracks, async () => {
        const pair = pairOf((hasCallback) => ({
          originX: {
            duration: LAYOUT_DURATION,
            onlyWhenChanged: true,
            hasCallback,
          },
          opacity: { duration: LAYOUT_DURATION, initial: 0.9, to: 0.2 },
          originY: { isSpring: true, onlyWhenChanged: true },
        }));
        const box = { initialOpacity: 0.2 };
        const tag = await mountScene(pair({ ...box, left: START_LEFT }));
        const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
        await render(pair({ ...box, left: END_LEFT }));
        await wait(LAYOUT_DURATION / 4);
        writePair(0.6);
        await wait(4 * FRAME_MS);
        const written = await sampleOpacityPair(tag, frameTag);
        expect(written.native.keys).toBe(2);
        expect(isNear(written.native.model, 0.6)).toBe(true);
        expect(
          isNear(written.native.presentation, written.frame.presentation)
        ).toBe(true);
        await takeTrace();

        await render(pair({ ...box, left: END_LEFT, top: DROP }));
        await wait(2 * FRAME_MS);
        for (let index = 0; index < 8; index++) {
          const { native, frame } = await sampleOpacityPair(tag, frameTag);
          expect(native.keys).toBe(0);
          expect(isNear(native.model, frame.model)).toBe(true);
          expect(isNear(native.presentation, frame.presentation)).toBe(true);
          await wait(LAYOUT_DURATION / 16);
        }
        expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
          FRAME_DRIVEN_TAKEOVER
        );
        await wait(LAYOUT_DURATION + 1000);
        const end = await sampleOpacityPair(tag, frameTag);
        expect(isNear(end.native.model, end.frame.model)).toBe(true);
        expect(isNear(end.native.presentation, end.frame.presentation)).toBe(
          true
        );
        expect([...callbacks].sort().join()).toBe(
          'frame:false,frame:true,native:false,native:true'
        );
        await render(null);
      });
    });
  }

  test('the removal of the view after an opacity write during a native group gives the callback false one time', async () => {
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
  });

  const WIDE = 3 * BOX_SIZE;
  const WIDTH_START =
    'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Width > Admitted';
  const WIDTH_END = 'TrackEnded:Width:true > Ended:Finished:None';
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
    const widthAt = linearAt(
      BOX_SIZE,
      WIDE,
      startEvents[0].monotonicTimeMs,
      LAYOUT_DURATION
    );
    const width = await sample(tag, 'Width');
    expect(width.playbackKeys.length).toBe(1);
    expect(width.model[0]).toBe(WIDE);
    expect(
      isNear(
        width.presentation[0],
        widthAt(width.monotonicTimeMs),
        WIDTH_TOLERANCE
      )
    ).toBe(true);
  }

  async function expectWidthEnd(tag: number, opacity: number, name: string) {
    const end = await sampleOpacity(tag);
    expect(end.keys).toBe(0);
    expect(isNear(end.model, opacity)).toBe(true);
    expect(isNear(end.presentation, opacity)).toBe(true);
    expect((await sample(tag, 'Width')).presentation[0]).toBe(WIDE);
    expect(callbacks.join()).toBe(`${name}:true`);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      WIDTH_END
    );
  }

  test('an opacity write during a native width track shows at once and keeps the track', async () => {
    const layout = layoutOf(
      { width: { duration: LAYOUT_DURATION } },
      { name: 'width' }
    );
    const tag = await mountScene(widthScene(layout, BOX_SIZE));
    await render(widthScene(layout, WIDE));
    await wait(LAYOUT_DURATION / 4);
    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(WIDTH_START);
    for (const value of [0.6, 0.7]) {
      opacities[BOX_REF].value = value;
      await wait(2 * FRAME_MS);
      const written = await sampleOpacity(tag);
      expect(written.keys).toBe(1);
      expect(isNear(written.model, value)).toBe(true);
      expect(isNear(written.presentation, value)).toBe(true);
      await expectWidthOnTrack(tag, startEvents);
      await wait(LAYOUT_DURATION / 8);
    }
    await wait(LAYOUT_DURATION);
    await expectWidthEnd(tag, 0.7, 'width');
    await render(null);
  });

  test('an opacity write between a commit and its mount keeps the native width start', async () => {
    const layout = layoutOf(
      { width: { duration: LAYOUT_DURATION } },
      { name: 'width' }
    );
    const tag = await mountScene(widthScene(layout, BOX_SIZE));
    writeAfterBlock([opacities[BOX_REF]], 0.8);
    await render(widthScene(layout, WIDE));
    await wait(3 * FRAME_MS);
    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(WIDTH_START);
    for (let index = 0; index < 2; index++) {
      const written = await sampleOpacity(tag);
      expect(written.keys).toBe(1);
      expect(isNear(written.model, 0.8)).toBe(true);
      expect(isNear(written.presentation, 0.8)).toBe(true);
      await expectWidthOnTrack(tag, startEvents);
      await wait(LAYOUT_DURATION / 2);
    }
    await wait(LAYOUT_DURATION / 4);
    await expectWidthEnd(tag, 0.8, 'width');
    await render(null);
  });

  test('the removal of the view after an opacity write during a native width track gives the callback false one time', async () => {
    const layout = layoutOf(
      { width: { duration: LAYOUT_DURATION } },
      { name: 'removed' }
    );
    const tag = await mountScene(widthScene(layout, BOX_SIZE));
    await render(widthScene(layout, WIDE));
    await wait(LAYOUT_DURATION / 4);
    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(WIDTH_START);
    opacities[BOX_REF].value = 0.6;
    await wait(4 * FRAME_MS);
    await expectWidthOnTrack(tag, startEvents);
    await render(widthScene(layout, WIDE, false));
    await wait(200);
    expect(callbacks.join()).toBe('removed:false');
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'TrackEnded:Width:false > Ended:Cancelled:None'
    );
    await wait(LAYOUT_DURATION);
    expect(callbacks.join()).toBe('removed:false');
    expect((await takeTraceOf(tag)).length).toBe(0);
    await render(null);
  });

  test('the stop of a second surface after an opacity write during a native group gives the callback false one time', async () => {
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
      summarize(events.filter((event) => event.tag === tag).filter(isHostEvent))
    ).toBe(CANCELLED_GROUP);
    await wait(LAYOUT_DURATION);
    expect(callbacks.join()).toBe('surface:false');
    expect((await takeTraceOf(tag)).length).toBe(0);
  });

  test('a background color write during a native X and opacity group keeps the tracks', async () => {
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
  });

  for (const hasLeafCallback of [false, true]) {
    test(`a layout animation callback writes the opacity of another view (leaf callback: ${hasLeafCallback})`, async () => {
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
      expect(isNear(replaced.presentation, CALLBACK_FALSE_OPACITY)).toBe(true);
      expect(callbacks.join()).toBe('writer:false');

      await wait(LAYOUT_DURATION + 300);
      const end = await sampleOpacity(otherTag);
      expect(isNear(end.model, CALLBACK_TRUE_OPACITY)).toBe(true);
      expect(isNear(end.presentation, CALLBACK_TRUE_OPACITY)).toBe(true);
      expect(callbacks.join()).toBe('writer:false,writer:true');
      await render(null);
    });
  }

  for (const tracks of [false, true]) {
    for (const startsFlat of [false, true]) {
      test(`a flattening change of the parent moves a view with a native group to another parent (${startsFlat ? 'the parent unflattens' : 'the parent flattens'}, tracking: ${tracks})`, async () => {
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
          expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
            FRAME_DRIVEN_TAKEOVER
          );
          expect(callbacks.join()).toBe('moved:false');
          await wait(LAYOUT_DURATION + 300);
          expect(callbacks.join()).toBe('moved:false,moved:true');
          expect((await sampleOpacity(tag)).keys).toBe(0);
          expect(getTestComponent(BOX_REF).getTag()).toBe(tag);
          await render(null);
        });
      });
    }
  }

  for (const hasOpacityLeaf of [false, true]) {
    test(`a native CSS opacity transition and a native layout start in one commit, with a background color write before the mount (opacity leaf: ${hasOpacityLeaf})`, async () => {
      if (!getStaticFeatureFlag('IOS_CSS_CORE_ANIMATION')) {
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
            ({ event, outcome }) => event === 'Ended' && outcome === 'Finished'
          ).length
        ).toBe(hasOpacityLeaf ? 1 : 2);
        expect(
          await getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor')
        ).toBe(ORANGE);
        expect(callbacks.join()).toBe('with-css:true');
        await render(null);
      }
    });
  }

  for (const tracks of [false, true]) {
    for (const writesBeforeCommit of [false, true]) {
      test(`an opacity write ${writesBeforeCommit ? 'in the JS turn before the commit that starts' : 'during'} a frame-driven layout animation with an opacity leaf does not show while the animation runs (tracking: ${tracks})`, async () => {
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
      });
    }
  }

  for (const order of ['second surface first', 'main surface first'] as const) {
    test(`an opacity write from a worklet that follows the commits of two surfaces keeps the native start (request order: ${order})`, async () => {
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
    });
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
    scene: (left: number) => Parameters<typeof render>[0];
    from: number;
    to: number;
    startWriter?: () => void;
    end?: number;
  }[] = [
    {
      name: 'a CSS animation of the opacity',
      scene: (left: number) => (
        <View style={styles.container}>
          <CSSLoopBox left={left} layout={frameLayout} />
        </View>
      ),
      from: 0.2,
      to: 0.8,
    },
    {
      name: 'a timing animation of an animated style',
      scene: (left: number) => (
        <View style={styles.container}>
          <WriterBox left={left} layout={frameLayout} initialOpacity={1} />
        </View>
      ),
      from: 1,
      to: 0.5,
      startWriter: () => {
        opacities[BOX_REF].value = withTiming(0.5, {
          duration: LOOP_DURATION,
          easing: Easing.linear,
        });
      },
      end: 0.5,
    },
  ];

  for (const { name, scene, from, to, startWriter, end } of loopWriters) {
    test(`${name} shows during a frame-driven layout animation with an opacity leaf`, async () => {
      const tag = await mountScene(scene(START_LEFT));
      startWriter?.();
      await wait(300);
      const before = await sampleOpacity(tag);
      const writerAt = (timeMs: number) =>
        before.presentation +
        ((to - from) / LOOP_DURATION) * (timeMs - before.time);
      await render(scene(END_LEFT));
      await wait(2 * FRAME_MS);
      for (const row of await sampleRows(tag, 8, LAYOUT_DURATION / 16)) {
        expect(row.keys).toBe(0);
        expect(isNear(row.model, row.presentation)).toBe(true);
        expect(
          isNear(
            row.presentation,
            writerAt(row.time),
            SAMPLED_OPACITY_TOLERANCE
          )
        ).toBe(true);
      }
      expect(summarize(await takeTraceOf(tag))).toBe(
        'LayoutBuildFailed:UnsupportedTiming'
      );
      await wait(LAYOUT_DURATION);
      expect(callbacks.join()).toBe('under-loop:true');
      if (end !== undefined) {
        await wait(LOOP_DURATION);
        expect(isNear((await sampleOpacity(tag)).presentation, end)).toBe(true);
      }
      await render(null);
    });
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
