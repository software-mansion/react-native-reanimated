/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), and each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B).
 * A check of a playback key count or of a model in such a test is for each row, by the time of the row
 * against the times of the trace. Each other test has state checks and trace checks at planned times.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, the in-flight
 * curve of a CSS writer that the frame loop plays, the model of the native box while the frame driver has
 * a position track (the player has statement M only for the opacity and the transform), when a callback
 * comes. The pixels on screen, a device, and 120 Hz are not tested.
 *
 * Not converted (the old pair comparison at planned times):
 * the test that calls `sampleOpacityPair`, and each test that calls `readPair`.
 */
import type { ComponentRef } from 'react';
import React from 'react';
import type { TurboModule } from 'react-native';
import {
  findNodeHandle,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TurboModuleRegistry,
  View,
} from 'react-native';
import type {
  LayoutAnimationFunction,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  createAnimatedComponent,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ScreenStack, ScreenStackItem } from 'react-native-screens';

import {
  describe,
  expect,
  getTestComponent,
  render,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { hasNativeCSSTransitions } from '../nativeAnimationObservation';
import { isViewSamplerAvailable, recordDrawnValues } from '../viewSampler';
import type { Played, ReferenceCase, Write } from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type {
  Leaf,
  Leaves,
  PairProps,
  SizeBoxProps,
} from './nativeLayoutTestKit';
import {
  Box,
  ClippingScrollView,
  BOX_REF,
  BOX_SIZE,
  callbacks,
  callbackTimes,
  centerOf,
  declaredDurationOf,
  drawnBandOf,
  DURATION,
  FRAME_BOX_REF,
  END_LEFT,
  FRAME_MS,
  hasNativeLayoutRoute,
  isHostEvent,
  isNoView,
  layoutOf,
  sample,
  isNear,
  LAID_OUT_TOLERANCE,
  LAYOUT_DURATION,
  curveBandOf,
  linearAt,
  middleOf,
  mountScene,
  NATIVE_ANIMATION_ROUTES,
  nativeOriginOf,
  narrowClockOffset,
  Pair,
  PAIR_CELL_HEIGHT,
  PAIR_DURATION,
  PAIR_LEFT,
  PAIR_TOP,
  pairLayoutsOf,
  POSITION_TOLERANCE,
  REMOVES_TRACKS_OUT_OF_WINDOW,
  PRESENTATION_STAY_MS,
  SAMPLED_OPACITY_TOLERANCE,
  sampleOpacity,
  sampleOpacityPair,
  sampleClockOffset,
  sampleRows,
  SizeBox,
  START_LEFT,
  summarize,
  summarizeEnd,
  takeTrace,
  takeTraceOf,
  waitForModel,
  movingGeometryTest,
} from './nativeLayoutTestKit';

const WRITER_REF = 'NativeLayoutWriterBox';
const CSS_DURATION = 6 * DURATION;
const FOCUSED_OPACITY = 0.4;

type WriterProps = {
  left: number;
  top?: number;
  opacity?: number;
  backgroundColor?: string;
  layout: LayoutAnimationFunction;
  cssDuration?: number;
  cssProperty?: 'opacity' | 'backgroundColor';
  opacityAnimation?: 'infinite' | 'once' | 'once-with-fill';
  refName?: string;
};

const OPACITY_KEYFRAMES = { from: { opacity: 0.2 }, to: { opacity: 0.8 } };
const OPACITY_LOOP = {
  animationName: OPACITY_KEYFRAMES,
  animationDuration: CSS_DURATION,
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
} as const;
const OPACITY_TRANSITION = {
  transitionProperty: 'opacity',
  transitionDuration: CSS_DURATION,
  transitionTimingFunction: 'linear',
} as const;

function CSSBox({
  left,
  top = 0,
  opacity = 1,
  backgroundColor = 'teal',
  layout,
  cssDuration,
  cssProperty = 'opacity',
  opacityAnimation,
  refName = WRITER_REF,
}: WriterProps) {
  const ref = useTestRef(refName);
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={layout}
        style={[
          styles.box,
          { marginLeft: left, marginTop: top, opacity, backgroundColor },
          cssDuration !== undefined && {
            transitionProperty: cssProperty,
            transitionDuration: cssDuration,
            transitionTimingFunction: 'linear',
          },
          opacityAnimation === 'infinite' && OPACITY_LOOP,
          (opacityAnimation === 'once' ||
            opacityAnimation === 'once-with-fill') && {
            animationName: OPACITY_KEYFRAMES,
            animationDuration: DURATION,
            animationTimingFunction: 'linear',
            animationFillMode:
              opacityAnimation === 'once' ? 'none' : 'forwards',
          },
        ]}
      />
    </View>
  );
}

const restylers: Record<string, (style: SizeBoxProps['style']) => void> = {};

/** A `SizeBox` that gets one more style from `restyleBoxes`, in a React commit. */
function RestyledBox(box: SizeBoxProps) {
  const [style, setStyle] = React.useState<SizeBoxProps['style']>();
  restylers[box.refName ?? BOX_REF] = setStyle;
  return <SizeBox {...box} style={[box.style, style]} />;
}

function restyleBoxes(style: SizeBoxProps['style']) {
  for (const restyle of Object.values(restylers)) {
    restyle(style);
  }
}

const nativeBoxTag = () => getTestComponent(BOX_REF).getTag();

/**
 * A read shows a value of the curve from `PRESENTATION_STAY_MS` before the read
 * to the read.
 */
function isInReadBand(
  shown: number,
  valueAt: (timeMs: number) => number,
  readTimeMs: number
) {
  const { low, high } = curveBandOf(
    valueAt,
    readTimeMs - PRESENTATION_STAY_MS,
    readTimeMs
  );
  return (
    shown >= low - SAMPLED_OPACITY_TOLERANCE &&
    shown <= high + SAMPLED_OPACITY_TOLERANCE
  );
}

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference` and the end of the two boxes.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  expectReference(caseName, referenceCase, played);
  return played;
}

/** The reads of a target of the native box in a time of the sample clock. */
const readsIn = (
  { rows }: Played,
  target: string,
  fromMs: number,
  toMs = Infinity
) =>
  rows
    .map(({ row }) => row.native[target])
    .filter(
      ({ monotonicTimeMs }) =>
        monotonicTimeMs >= fromMs && monotonicTimeMs < toMs
    );

/**
 * Each read of the opacity of the native box has the two playback keys of the
 * layout group, from the start report of the opacity track to one display frame
 * before its declared end.
 */
function expectGroupKeysWhilePlaying(played: Played) {
  const track = played.tracks.find(({ target }) => target === 'Opacity')!;
  const reads = readsIn(
    played,
    'Opacity',
    track.played.from,
    middleOf(track.origin) + declaredDurationOf(track.timeline) - FRAME_MS
  );
  expect(reads.length > 0).toBe(true);
  for (const { playbacks } of reads) {
    expect(playbacks.length).toBe(2);
  }
}

let animatedOpacity: SharedValue<number> | undefined;

function AnimatedStyleBox({
  left,
  layout,
  usesAnimatedProps = false,
}: WriterProps & { usesAnimatedProps?: boolean }) {
  const ref = useTestRef(WRITER_REF);
  const opacity = useSharedValue(1);
  animatedOpacity = opacity;
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={layout}
        style={[
          styles.box,
          { marginLeft: left },
          !usesAnimatedProps && animatedStyle,
        ]}
        // The types refuse `opacity` as an animated prop of a view. The runtime takes it.
        animatedProps={
          (usesAnimatedProps ? animatedProps : undefined) as undefined
        }
      />
    </View>
  );
}

const AnimatedTextInput = createAnimatedComponent(TextInput);
const inputRef = React.createRef<ComponentRef<typeof TextInput>>();

function FocusableBox({ left, opacity = 1, layout }: WriterProps) {
  return (
    <View style={styles.container}>
      <AnimatedTextInput
        ref={inputRef}
        layout={layout}
        style={[
          styles.box,
          {
            marginLeft: left,
            opacity: { default: opacity, ':focus': FOCUSED_OPACITY },
            transitionProperty: 'opacity',
            transitionDuration: DURATION,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

const scrollRef = React.createRef<ComponentRef<typeof ScrollView>>();

/** A scroll to `CLIPPED_OFFSET` takes the two boxes out of the window. */
function ClippedPair(pair: PairProps) {
  return (
    <ClippingScrollView scrollRef={scrollRef} style={styles.scroll}>
      <Pair {...pair} />
      <View style={styles.scrollFiller} />
    </ClippingScrollView>
  );
}

const CLIPPED_OFFSET = 1500;
const scrollTo = (y: number) =>
  scrollRef.current?.scrollTo({ y, animated: false });

describe('native layout animations and other writers of the view', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }
  const hasNativeCSS = hasNativeCSSTransitions;
  const testWithNativeCSS = hasNativeCSS ? movingGeometryTest : () => {};
  const hasSynchronousProps = NATIVE_ANIMATION_ROUTES.synchronousProps;

  // The opacity track goes from 0.3 to the mounted value 1.
  const FADE_IN: Leaves = {
    originX: { duration: LAYOUT_DURATION },
    opacity: { duration: LAYOUT_DURATION, initial: 0.3, to: 1 },
  };
  const fadeIn = (name: string) => layoutOf(FADE_IN, { name });
  const fadeInAt = (startMs: number, timeMs: number) =>
    linearAt(0.3, 1, startMs, LAYOUT_DURATION)(timeMs);

  /** The fade-in with a write of the test on the opacity of the two boxes. */
  const fadeInWith = (
    write: Write['run'],
    style?: SizeBoxProps['style']
  ): ReferenceCase => ({
    flow: 'layout',
    leaves: FADE_IN,
    places: [
      { left: START_LEFT, top: 0 },
      { left: END_LEFT, top: 0 },
    ],
    totalMs: LAYOUT_DURATION,
    box: { Box: RestyledBox, style },
    write: { atMs: LAYOUT_DURATION / 4, targets: ['Opacity'], run: write },
    drawsOpacity: true,
  });

  for (const usesAnimatedProps of [false, true]) {
    movingGeometryTest(
      `${usesAnimatedProps ? 'animated props write' : 'an animated style writes'} the opacity during a native opacity track`,
      async () => {
        const layout = fadeIn('style');
        const tag = await mountScene(
          <AnimatedStyleBox
            left={START_LEFT}
            layout={layout}
            usesAnimatedProps={usesAnimatedProps}
          />,
          WRITER_REF
        );

        await render(
          <AnimatedStyleBox
            left={END_LEFT}
            layout={layout}
            usesAnimatedProps={usesAnimatedProps}
          />
        );
        await wait(LAYOUT_DURATION / 4);
        const pending = (await takeTraceOf(tag))[0];
        animatedOpacity!.value = 0.6;
        await wait(4 * FRAME_MS);
        const rows = await sampleRows(tag, 4, LAYOUT_DURATION / 8);
        for (const row of rows) {
          expect(row.keys).toBe(2);
          expect(isNear(row.model, 0.6)).toBe(true);
          expect(
            isNear(
              row.presentation,
              fadeInAt(pending.monotonicTimeMs, row.time),
              SAMPLED_OPACITY_TOLERANCE
            )
          ).toBe(true);
        }

        await wait(LAYOUT_DURATION / 2);
        const end = await sampleOpacity(tag);
        expect(end.keys).toBe(0);
        expect(isNear(end.presentation, 0.6)).toBe(true);
        expect(callbacks.join()).toBe('style:true');
        const ends = (await takeTraceOf(tag)).filter(isHostEvent);
        expect(ends.length).toBe(3);
        expect(summarize(ends.slice(2))).toBe('Ended:Finished:None');
        await render(null);
      }
    );
  }

  testWithNativeCSS(
    'a layout start takes the opacity from a native CSS transition, and the CSS value shows after the layout track',
    async () => {
      // The layout opacity track goes from 0.9 to the mounted value 0.2 in a short time.
      const layout = layoutOf(
        {
          originX: { duration: DURATION },
          opacity: { duration: DURATION, initial: 0.9, to: 0.2 },
        },
        { name: 'over-css' }
      );
      const tag = await mountScene(
        <CSSBox
          left={START_LEFT}
          opacity={1}
          layout={layout}
          cssDuration={CSS_DURATION}
        />,
        WRITER_REF
      );
      const clock = await narrowClockOffset(tag);

      await render(
        <CSSBox
          left={START_LEFT}
          opacity={0.2}
          layout={layout}
          cssDuration={CSS_DURATION}
        />
      );
      await wait(CSS_DURATION / 6);
      expect(summarize(await takeTraceOf(tag))).toBe(
        'Received > TrackStarted:Opacity > Admitted'
      );

      await render(
        <CSSBox
          left={END_LEFT}
          opacity={0.2}
          layout={layout}
          cssDuration={CSS_DURATION}
        />
      );
      await wait(4 * FRAME_MS);
      const layoutEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(layoutEvents)).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Opacity:false > Ended:Interrupted:None > TrackStarted:PositionX > TrackStarted:Opacity > Admitted'
      );
      expect(layoutEvents[3].owner).toBe('CSSTransition');
      const layoutStart = layoutEvents[0];
      const origin = nativeOriginOf(layoutEvents, layoutStart, clock);
      const layoutAt = (timeMs: number) =>
        0.9 - 0.7 * Math.min(1, (timeMs - middleOf(origin)) / DURATION);

      const during = await sampleRows(tag, 3, DURATION / 5);
      for (const row of during) {
        expect(row.keys).toBe(2);
        expect(isInReadBand(row.presentation, layoutAt, row.time)).toBe(true);
      }

      await wait(DURATION / 2);
      const after = await sampleRows(tag, 3, DURATION / 2);
      console.log(
        `RuntimeTestsOverCSS ${JSON.stringify({
          layoutStartMs: layoutStart.monotonicTimeMs,
          originTimestampMs: layoutEvents[2]?.originTimestampMs,
          origin,
          clockOffset: await sampleClockOffset(tag),
          during: during.map((row) => ({ ...row, layout: layoutAt(row.time) })),
          after,
        })}`
      );
      for (const row of after) {
        expect(row.keys).toBe(0);
      }
      // The CSS transition goes down to 0.2, which is also the end value of the layout track.
      const shown = after.map(({ presentation }) => presentation);
      expect(shown[0] > 0.2 + SAMPLED_OPACITY_TOLERANCE).toBe(true);
      expect(
        shown.slice(1).every((value, index) => value < shown[index])
          ? ''
          : `the presentations ${shown.join()} do not each go down`
      ).toBe('');
      expect(callbacks.join()).toBe('over-css:true');

      await wait(CSS_DURATION);
      const end = await sampleOpacity(tag);
      console.log(`RuntimeTestsOverCSSEnd ${JSON.stringify(end)}`);
      expect(isNear(end.presentation, 0.2)).toBe(true);
      await render(null);
    }
  );

  testWithNativeCSS(
    'one render changes the opacity of a view with a native CSS transition and moves it: the layout start takes the opacity, and the new value shows at the end',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: DURATION },
          opacity: { duration: DURATION, initial: 0.9, to: 0.5 },
        },
        { name: 'over-css-change' }
      );
      const tag = await mountScene(
        <CSSBox
          left={START_LEFT}
          opacity={1}
          layout={layout}
          cssDuration={CSS_DURATION}
        />,
        WRITER_REF
      );

      await render(
        <CSSBox
          left={START_LEFT}
          opacity={0.2}
          layout={layout}
          cssDuration={CSS_DURATION}
        />
      );
      await wait(CSS_DURATION / 6);
      const cssStart = await takeTraceOf(tag);
      expect(summarize(cssStart)).toBe(
        'Received > TrackStarted:Opacity > Admitted'
      );
      const firstCSSGeneration = cssStart[0]?.generation;

      await render(
        <CSSBox
          left={END_LEFT}
          opacity={0.5}
          layout={layout}
          cssDuration={CSS_DURATION}
        />
      );
      await wait(4 * FRAME_MS);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      const layoutEvents = events.filter(({ owner }) => owner === 'Layout');
      const replacedCSS = events.filter(
        ({ owner, generation }) =>
          owner === 'CSSTransition' && generation === firstCSSGeneration
      );
      const replacementCSS = events.filter(
        ({ owner, generation }) =>
          owner === 'CSSTransition' && generation !== firstCSSGeneration
      );
      const sequenceOf = (of: typeof events, event: string) =>
        of.find((candidate) => candidate.event === event)?.sequence ?? -1;
      const cssAdmittedBeforeDrain =
        sequenceOf(replacementCSS, 'Admitted') >= 0 &&
        sequenceOf(replacementCSS, 'Admitted') <
          sequenceOf(layoutEvents, 'Received');
      console.log(
        `RuntimeTestsOverCSSChange ${JSON.stringify({
          order: cssAdmittedBeforeDrain
            ? 'CSS admitted before the layout drain'
            : 'layout drain before the CSS admission',
          trace: events.map(
            (event) =>
              `${event.sequence}@${event.monotonicTimeMs.toFixed(2)} ${event.owner}#${event.generation} ${summarize([event])}`
          ),
        })}`
      );
      expect(summarize(layoutEvents)).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:Opacity > Admitted'
      );
      expect(
        replacedCSS
          .filter(({ event }) => event === 'Ended')
          .map(({ outcome }) => outcome)
          .join()
      ).toBe('Interrupted');
      expect(summarize(replacementCSS)).toBe(
        cssAdmittedBeforeDrain
          ? 'Received > TrackStarted:Opacity > Admitted > TrackEnded:Opacity:false > Ended:Interrupted:None'
          : 'Received > Ended:Rejected:OwnershipDenied'
      );
      const layoutStart = layoutEvents[0];
      const layoutAt = (timeMs: number) =>
        0.9 -
        0.4 * Math.min(1, (timeMs - layoutStart.monotonicTimeMs) / DURATION);

      const during = await sampleRows(tag, 3, DURATION / 5);
      for (const row of during) {
        expect(row.keys).toBe(2);
        expect(isInReadBand(row.presentation, layoutAt, row.time)).toBe(true);
      }

      await wait(DURATION / 2);
      const after = await sampleRows(tag, 3, DURATION / 2);
      for (const row of after) {
        expect(row.keys).toBe(0);
      }
      expect(callbacks.join()).toBe('over-css-change:true');

      await wait(CSS_DURATION);
      const end = await sampleOpacity(tag);
      expect(end.keys).toBe(0);
      expect(isNear(end.presentation, 0.5)).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest(
    'a CSS transition start during a native layout opacity track runs on the loop, and its value shows after the layout track',
    async () => {
      const played = await playCase(
        'a CSS transition start during a native layout opacity track',
        fadeInWith(async () => {
          restyleBoxes({ opacity: 0.5 });
          await waitForModel(
            nativeBoxTag(),
            'Opacity',
            ([opacity]) => opacity < 1
          );
          // A React commit during the track mounts the stored value of the CSS loop again.
          restyleBoxes({ opacity: 0.5, backgroundColor: 'orange' });
        }, OPACITY_TRANSITION)
      );
      expect(
        summarize(
          played.events.filter(({ owner }) => owner === 'CSSTransition')
        )
      ).toBe(hasNativeCSS ? 'Received > Ended:Rejected:OwnershipDenied' : '');
      expectGroupKeysWhilePlaying(played);

      await wait(CSS_DURATION);
      const end = await sampleOpacity(nativeBoxTag());
      expect(end.keys).toBe(0);
      expect(isNear(end.presentation, 0.5)).toBe(true);
      await render(null);
    }
  );

  testWithNativeCSS(
    'a native CSS transition of the background color and a native layout X track play together',
    async () => {
      const layout = layoutOf(
        { originX: { duration: LAYOUT_DURATION } },
        { name: 'disjoint' }
      );
      const css = {
        cssDuration: LAYOUT_DURATION,
        cssProperty: 'backgroundColor',
      } as const;
      const tag = await mountScene(
        <CSSBox left={START_LEFT} layout={layout} {...css} />,
        WRITER_REF
      );

      await render(
        <CSSBox
          left={START_LEFT}
          backgroundColor="orange"
          layout={layout}
          {...css}
        />
      );
      await wait(LAYOUT_DURATION / 4);
      await render(
        <CSSBox
          left={END_LEFT}
          backgroundColor="orange"
          layout={layout}
          {...css}
        />
      );
      await wait(LAYOUT_DURATION / 4);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(events)).toBe(
        'Received > TrackStarted:BackgroundColor > Admitted > LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > Admitted'
      );
      const { playbacks } = await sample(tag, 'PositionX');
      expect(playbacks.length).toBe(2);

      await wait(LAYOUT_DURATION);
      const ends = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(
        ends.filter(
          ({ event, outcome }) => event === 'Ended' && outcome === 'Finished'
        ).length
      ).toBe(2);
      expect(callbacks.join()).toBe('disjoint:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a CSS animation of the opacity that starts during a native layout opacity track shows after the track',
    async () => {
      const played = await playCase(
        'a CSS animation of the opacity that starts during a native layout opacity track',
        fadeInWith(() => {
          restyleBoxes(OPACITY_LOOP);
          return waitForModel(
            nativeBoxTag(),
            'Opacity',
            ([opacity]) => opacity < 0.85
          );
        })
      );
      expectGroupKeysWhilePlaying(played);
      const [{ reads: waitReads }] = played.modelWaits;
      const writtenMs = waitReads[waitReads.length - 1].monotonicTimeMs;
      for (const { model } of readsIn(played, 'Opacity', writtenMs)) {
        expect(model[0] < 0.85).toBe(true);
      }

      const after = await sampleRows(nativeBoxTag(), 3, DURATION / 2);
      for (const row of after) {
        expect(row.keys).toBe(0);
        expect(row.presentation < 0.85).toBe(true);
        expect(isNear(row.presentation, row.model)).toBe(true);
      }
      await render(null);
    }
  );

  for (const writer of ['transition', 'animation'] as const) {
    movingGeometryTest(
      `each draw during a native layout opacity track shows the layout value while a CSS ${writer} of the opacity runs on the frame loop`,
      async () => {
        if (!isViewSamplerAvailable()) {
          return;
        }
        const layout = fadeIn(`drawn-under-${writer}`);
        const transition = { cssDuration: CSS_DURATION };
        const mounted = writer === 'transition' ? transition : {};
        const looped =
          writer === 'transition'
            ? { ...transition, opacity: 0.5 }
            : { opacityAnimation: 'infinite' as const };
        const tag = await mountScene(
          <CSSBox left={START_LEFT} layout={layout} {...mounted} />,
          WRITER_REF
        );
        const clock = await narrowClockOffset(tag);
        await render(<CSSBox left={END_LEFT} layout={layout} {...mounted} />);
        await wait(4 * FRAME_MS);
        const events = (await takeTraceOf(tag)).filter(isHostEvent);
        expect(summarize(events)).toBe(
          'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:Opacity > Admitted'
        );
        const originMs = middleOf(nativeOriginOf(events, events[0], clock));
        const drawn = await recordDrawnValues(tag, ['opacity'], async () => {
          await render(<CSSBox left={END_LEFT} layout={layout} {...looped} />);
          await wait(LAYOUT_DURATION / 3);
          // A React commit during the track mounts the stored value of the frame loop again.
          await render(
            <CSSBox
              left={END_LEFT}
              backgroundColor="orange"
              layout={layout}
              {...looped}
            />
          );
          await wait(LAYOUT_DURATION);
        });
        const inTrack = drawn
          .map(({ timeMs, values: [opacity] }) => ({
            atMs: drawnBandOf(timeMs, clock).to - originMs,
            opacity,
          }))
          .filter(({ atMs }) => atMs >= 0 && atMs < LAYOUT_DURATION - FRAME_MS);
        const offCurve = inTrack.filter(
          ({ atMs, opacity }) =>
            !isNear(opacity, fadeInAt(0, atMs), SAMPLED_OPACITY_TOLERANCE)
        );
        console.log(
          `RuntimeTestsDrawnUnderLoop ${JSON.stringify({ writer, draws: drawn.length, inTrack: inTrack.length, offCurve })}`
        );
        expect(inTrack.length > 0).toBe(true);
        expect(offCurve.length).toBe(0);
        await render(null);
      }
    );
  }

  for (const [fill, endOpacity] of [
    ['once-with-fill', 0.8],
    ['once', 1],
  ] as const) {
    movingGeometryTest(
      `a CSS animation of the opacity that ends during a native layout opacity track leaves ${fill === 'once' ? 'the style value' : 'its fill value'}`,
      async () => {
        const layout = fadeIn('under-fill');
        const tag = await mountScene(
          <CSSBox left={START_LEFT} layout={layout} />,
          WRITER_REF
        );
        await render(<CSSBox left={END_LEFT} layout={layout} />);
        await wait(LAYOUT_DURATION / 4);
        await render(
          <CSSBox left={END_LEFT} layout={layout} opacityAnimation={fill} />
        );
        await wait(2 * DURATION);
        const during = await sampleOpacity(tag);
        expect(during.keys).toBe(2);
        expect(isNear(during.model, endOpacity)).toBe(true);
        expect(during.presentation > 0.81 && during.presentation < 0.95).toBe(
          true
        );
        await wait(LAYOUT_DURATION / 2);
        const after = await sampleOpacity(tag);
        expect(after.keys).toBe(0);
        expect(isNear(after.presentation, endOpacity)).toBe(true);
        expect(callbacks.join()).toBe('under-fill:true');
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'a React commit after a CSS loop transition ended under a native layout opacity track keeps the layout value on screen',
    async () => {
      const layout = fadeIn('after-css');
      const css = { cssDuration: DURATION / 2 };
      const tag = await mountScene(
        <CSSBox left={START_LEFT} layout={layout} {...css} />,
        WRITER_REF
      );
      await render(<CSSBox left={END_LEFT} layout={layout} {...css} />);
      await wait(LAYOUT_DURATION / 8);
      const pending = (await takeTraceOf(tag))[0];
      await render(
        <CSSBox left={END_LEFT} opacity={0.5} layout={layout} {...css} />
      );
      await wait(DURATION);
      await render(
        <CSSBox
          left={END_LEFT}
          opacity={0.5}
          backgroundColor="orange"
          layout={layout}
          {...css}
        />
      );
      await wait(4 * FRAME_MS);
      const during = await sampleRows(tag, 2, LAYOUT_DURATION / 8);
      for (const row of during) {
        expect(row.keys).toBe(2);
        expect(isNear(row.model, 0.5)).toBe(true);
        expect(
          isNear(
            row.presentation,
            fadeInAt(pending.monotonicTimeMs, row.time),
            SAMPLED_OPACITY_TOLERANCE
          )
        ).toBe(true);
      }
      await wait(LAYOUT_DURATION / 2);
      const after = await sampleOpacity(tag);
      expect(after.keys).toBe(0);
      expect(isNear(after.presentation, 0.5)).toBe(true);
      expect(callbacks.join()).toBe('after-css:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a layout start with an opacity leaf on a view with a CSS animation of the opacity',
    async () => {
      const layout = fadeIn('with-animation');
      await render(
        <CSSBox left={START_LEFT} layout={layout} opacityAnimation="infinite" />
      );
      await wait(LAYOUT_DURATION / 4);
      const tag = getTestComponent(WRITER_REF).getTag();
      await takeTrace();
      callbacks.length = 0;
      await render(
        <CSSBox left={END_LEFT} layout={layout} opacityAnimation="infinite" />
      );
      await wait(4 * FRAME_MS);
      // The mounted opacity is the value of the CSS animation, not the end value of the leaf.
      expect(summarize(await takeTraceOf(tag))).toBe(
        'LayoutBuildFailed:EndpointMismatch'
      );
      for (const row of await sampleRows(tag, 4, LAYOUT_DURATION / 8)) {
        expect(row.keys).toBe(0);
      }
      await wait(LAYOUT_DURATION);
      expect(callbacks.join()).toBe('with-animation:true');
      await render(null);
    }
  );

  movingGeometryTest(
    'a frame-driven start takes a view whose opacity a CSS loop transition and a native layout track have',
    async () => {
      const FRAME_REF = 'NativeLayoutWriterFrameBox';
      const { nativeLayout, frameLayout } = pairLayoutsOf((hasCallback) => ({
        originX: {
          duration: LAYOUT_DURATION,
          onlyWhenChanged: true,
          hasCallback,
        },
        opacity: { duration: LAYOUT_DURATION, initial: 0.9, to: 0.2 },
        originY: { isSpring: true, onlyWhenChanged: true },
      }));
      const pair = (left: number, top: number, opacity: number) => (
        <View>
          <CSSBox
            left={left}
            top={top}
            opacity={opacity}
            layout={nativeLayout}
            cssDuration={CSS_DURATION}
          />
          <CSSBox
            left={left}
            top={top}
            opacity={opacity}
            layout={frameLayout}
            cssDuration={CSS_DURATION}
            refName={FRAME_REF}
          />
        </View>
      );
      const tag = await mountScene(pair(START_LEFT, 0, 1), WRITER_REF);
      const frameTag = getTestComponent(FRAME_REF).getTag();
      await render(pair(START_LEFT, 0, 0.2));
      await wait(CSS_DURATION / 6);
      const cssStart = summarize(await takeTraceOf(tag));
      await render(pair(END_LEFT, 0, 0.2));
      await wait(4 * FRAME_MS);
      const layoutEvents = (await takeTraceOf(tag)).filter(isHostEvent);
      if (hasNativeCSS) {
        expect(cssStart).toBe('Received > TrackStarted:Opacity > Admitted');
        expect(summarize(layoutEvents)).toBe(
          'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Opacity:false > Ended:Interrupted:None > TrackStarted:PositionX > TrackStarted:Opacity > Admitted'
        );
        expect(layoutEvents[3]?.owner).toBe('CSSTransition');
      }
      await wait(LAYOUT_DURATION / 4 - 4 * FRAME_MS);
      // With the CSS loop from the start, the mounted opacity is not the end value of the leaf, and the
      // layout animation is frame-driven before the drop too.
      expect((await sampleOpacity(tag)).keys).toBe(hasNativeCSS ? 2 : 0);
      await render(pair(END_LEFT, 30, 0.2));
      await wait(2 * FRAME_MS);
      // With the synchronous props path, the value of the CSS loop shows on each box.
      const compared = [];
      for (let index = 0; index < 8; index++) {
        const { native, frame } = await sampleOpacityPair(tag, frameTag);
        compared.push({
          native: native.presentation,
          framePresentation: frame.presentation,
          frameModel: frame.model,
        });
        expect(native.keys).toBe(0);
        expect(
          isNear(
            native.presentation,
            hasSynchronousProps ? frame.presentation : frame.model,
            SAMPLED_OPACITY_TOLERANCE
          )
        ).toBe(true);
        await wait(LAYOUT_DURATION / 16);
      }
      console.log(
        `RuntimeTestsFrameDrivenTakeOver ${JSON.stringify({ hasSynchronousProps, compared })}`
      );
      await wait(CSS_DURATION);
      const { native, frame } = await sampleOpacityPair(tag, frameTag);
      expect(isNear(native.presentation, 0.2)).toBe(true);
      expect(isNear(frame.model, 0.2)).toBe(true);
      expect(native.keys).toBe(0);
      await render(null);
    }
  );

  testWithNativeCSS(
    'a layout start takes the opacity from a CSS hold, and the held value shows after the layout track',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: DURATION },
          opacity: { duration: DURATION, initial: 1, to: 0.9 },
        },
        { name: 'over-hold' }
      );
      await render(
        <FocusableBox left={START_LEFT} opacity={1} layout={layout} />
      );
      await wait(50);
      await render(
        <FocusableBox left={START_LEFT} opacity={0.9} layout={layout} />
      );
      await wait(DURATION * 1.5);
      const tag = findNodeHandle(inputRef.current) ?? -1;
      inputRef.current?.focus();
      await takeTrace();
      // The hold reports the end of its timeline. The layout start comes after that report.
      for (let attempt = 0; attempt < 40; attempt++) {
        await wait(DURATION / 4);
        if (
          (await takeTraceOf(tag)).some(({ event }) => event === 'TrackEnded')
        ) {
          break;
        }
      }
      const held = await sampleOpacity(tag);
      expect(held.keys).toBe(1);
      expect(isNear(held.presentation, FOCUSED_OPACITY)).toBe(true);
      await takeTrace();
      callbacks.length = 0;

      await render(
        <FocusableBox left={END_LEFT} opacity={0.9} layout={layout} />
      );
      await wait(4 * FRAME_MS);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      const during = await sampleRows(tag, 2, DURATION / 4);
      expect(summarize(events)).toBe(
        'LayoutStartPending > LayoutStartMounted > Received > Ended:Interrupted:None > TrackStarted:PositionX > TrackStarted:Opacity > Admitted'
      );
      expect(events[3].owner).toBe('CSSTransition');
      for (const row of during) {
        expect(row.keys).toBe(2);
        expect(row.presentation > 0.9).toBe(true);
      }
      await wait(DURATION);
      const after = await sampleRows(tag, 2, DURATION / 2);
      expect(callbacks.join()).toBe('over-hold:true');
      expect(isNear(after[1].presentation, FOCUSED_OPACITY)).toBe(true);
      inputRef.current?.blur();
      await wait(DURATION * 1.5);
      await render(null);
    }
  );
});

describe('a native layout group whose tracks the platform removes', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  type Clipped = { nativeTag: number; frameTag: number; startMs: number };

  /** Mounts the pair, then renders `moved`. */
  async function move(mounted: PairProps, moved: PairProps): Promise<Clipped> {
    await mountScene(<ClippedPair {...mounted} />);
    const tags = {
      nativeTag: getTestComponent(BOX_REF).getTag(),
      frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
    };
    const startMs = performance.now();
    await render(<ClippedPair {...moved} />);
    return { ...tags, startMs };
  }

  const waitUntil = ({ startMs }: Clipped, elapsedMs: number) =>
    wait(Math.max(0, startMs + elapsedMs - performance.now()));

  async function readBox(tag: number) {
    const [x, y, opacity] = await Promise.all([
      sample(tag, 'PositionX'),
      sample(tag, 'PositionY'),
      sample(tag, 'Opacity'),
    ]);
    return {
      x: x.model[0],
      y: y.model[0],
      opacity: opacity.model[0],
      shownX: x.presentation[0],
      shownY: y.presentation[0],
      shownOpacity: opacity.presentation[0],
      keys: x.playbacks.length,
    };
  }

  /** The frame-driven box is the reference. It is one cell below the native box. */
  async function readPair({ nativeTag, frameTag }: Clipped) {
    const [native, frame] = await Promise.all([
      readBox(nativeTag),
      readBox(frameTag),
    ]);
    return { native, frame: { ...frame, y: frame.y - PAIR_CELL_HEIGHT } };
  }

  const isFrameUpdate = ({ event }: { event: string }) =>
    event === 'FrameUpdateMounted';

  async function takeTransferTrace({ nativeTag }: Clipped) {
    const events = await takeTraceOf(nativeTag);
    return {
      host: summarizeEnd(events.filter((event) => !isFrameUpdate(event))),
      hasFrameUpdate: events.some(isFrameUpdate),
    };
  }

  const sortedCallbacks = () => callbacks.slice().sort().join();

  // A delayed leaf that a new animation does not replace has no native continuation.
  const MERGED_DELAY = {
    firstStart:
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > Admitted',
    newY: 'TrackEnded:PositionX:false > LayoutBuildFailed:UnsupportedContinuation > Ended:Cancelled:None',
    clip: '',
  };

  // 0.5 pt and two display frames of a leaf that moves `distance` in `durationMs`.
  const twoFrames = (distance: number, durationMs: number) =>
    POSITION_TOLERANCE + (2 * FRAME_MS * distance) / durationMs;

  const clippedTracks: [string, Leaf['easing'], number][] = [
    ['one segment', Easing.linear, 1],
    ['the two segments of the default easing', 'default', 2],
  ];
  for (const [trackName, easing, largestSlope] of clippedTracks) {
    const clipResult = REMOVES_TRACKS_OUT_OF_WINDOW
      ? `gives its layout group with tracks of ${trackName} to the frame driver`
      : `keeps the native tracks of ${trackName} of its layout group`;
    movingGeometryTest(
      `a clip of the view ${clipResult}: the view shows the values of the frame driver after a scroll back, and the callback gets true one time at the natural end`,
      async () => {
        const opacityDuration = 2 * LAYOUT_DURATION;
        const layouts = pairLayoutsOf((hasCallback) => ({
          originX: { duration: LAYOUT_DURATION, hasCallback, easing },
          opacity: { duration: opacityDuration, initial: 0.3, to: 1, easing },
        }));
        const travel = largestSlope * END_LEFT;
        const clipped = await move(
          { left: START_LEFT, ...layouts },
          { left: END_LEFT, ...layouts }
        );
        await waitUntil(clipped, LAYOUT_DURATION / 4);
        await takeTrace();
        scrollTo(CLIPPED_OFFSET);
        await waitUntil(clipped, LAYOUT_DURATION / 2);
        const transfer = await takeTransferTrace(clipped);
        expect(callbacks.length).toBe(0);
        if (REMOVES_TRACKS_OUT_OF_WINDOW) {
          expect(transfer.host).toBe(
            'TrackEnded:Opacity:false > TrackEnded:PositionX:false > Ended:Interrupted:PlatformRemoved'
          );
          expect(transfer.hasFrameUpdate).toBe(true);
          const hidden = await readPair(clipped);
          expect(hidden.native.keys).toBe(0);
          expect(
            isNear(
              hidden.native.x,
              hidden.frame.x,
              twoFrames(travel, LAYOUT_DURATION)
            )
          ).toBe(true);
          expect(
            isNear(
              hidden.native.opacity,
              hidden.frame.opacity,
              SAMPLED_OPACITY_TOLERANCE
            )
          ).toBe(true);
        } else {
          expect(transfer.host).toBe('');
        }

        scrollTo(0);
        await wait(4 * FRAME_MS);
        await waitUntil(clipped, 0.75 * LAYOUT_DURATION);
        const shown = await readPair(clipped);
        if (REMOVES_TRACKS_OUT_OF_WINDOW) {
          expect(shown.native.keys).toBe(0);
        }
        expect(
          isNear(
            shown.native.shownX,
            shown.frame.x,
            twoFrames(travel, LAYOUT_DURATION)
          )
        ).toBe(true);
        expect(shown.native.shownX > START_LEFT + BOX_SIZE / 2 + 10).toBe(true);
        expect(shown.native.shownX < END_LEFT + BOX_SIZE / 2 - 10).toBe(true);
        expect(
          isNear(
            shown.native.shownOpacity,
            shown.frame.opacity,
            SAMPLED_OPACITY_TOLERANCE
          )
        ).toBe(true);
        expect(callbacks.length).toBe(0);

        await waitUntil(clipped, opacityDuration + 400);
        if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
          expect((await takeTransferTrace(clipped)).host).toBe(
            'TrackEnded:Opacity:true > TrackEnded:PositionX:true > Ended:Finished:None'
          );
        }
        expect(sortedCallbacks()).toBe('frame:true,native:true');
        expect(
          Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
        ).toBe(true);
        const end = await readBox(clipped.nativeTag);
        expect(end.keys).toBe(0);
        expect(isNear(end.shownOpacity, 1)).toBe(true);
        const endCentre = END_LEFT + BOX_SIZE / 2;
        expect(
          isNear(end.shownX, endCentre, LAID_OUT_TOLERANCE)
            ? ''
            : `the centre ${end.shownX} after the end is not ${endCentre}`
        ).toBe('');
        await render(null);
      }
    );
  }

  movingGeometryTest(
    `a clip after a replacement that kept a native track of the older build${REMOVES_TRACKS_OUT_OF_WINDOW ? '' : ' plays the two native tracks to their ends'}: the callback of the old group has false, and the callback of the new group gets true at the natural end`,
    async () => {
      const replacementAt = PAIR_DURATION / 5;
      const layouts = pairLayoutsOf((hasCallback) => ({
        originX: {
          duration: PAIR_DURATION,
          onlyWhenChanged: true,
          hasCallback,
        },
        originY: {
          duration: PAIR_DURATION / 2,
          onlyWhenChanged: true,
          hasCallback,
        },
      }));
      const clipped = await move(
        { left: START_LEFT, top: 0, ...layouts },
        { left: PAIR_LEFT, top: 0, ...layouts }
      );
      await waitUntil(clipped, replacementAt);
      await render(
        <ClippedPair left={PAIR_LEFT} top={PAIR_TOP} {...layouts} />
      );
      await waitUntil(clipped, replacementAt + 150);
      expect(sortedCallbacks()).toBe('frame:false,native:false');
      await takeTrace();
      scrollTo(CLIPPED_OFFSET);
      await waitUntil(clipped, replacementAt + 450);
      const transfer = await takeTransferTrace(clipped);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(transfer.host).toBe(
          'TrackEnded:PositionX:false > TrackEnded:PositionY:false > Ended:Interrupted:PlatformRemoved > Ended:Interrupted:PlatformRemoved'
        );
        expect(transfer.hasFrameUpdate).toBe(true);
      } else {
        expect(transfer.host).toBe('');
      }
      expect(callbacks.length).toBe(2);

      scrollTo(0);
      await waitUntil(clipped, replacementAt + 750);
      const shown = await readPair(clipped);
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(shown.native.keys).toBe(0);
      }
      expect(
        isNear(
          shown.native.shownX,
          shown.frame.x,
          twoFrames(PAIR_LEFT, PAIR_DURATION)
        )
      ).toBe(true);
      expect(
        isNear(
          shown.native.shownY,
          shown.frame.y,
          twoFrames(PAIR_TOP, PAIR_DURATION / 2)
        )
      ).toBe(true);
      expect(shown.native.shownX < PAIR_LEFT - 20).toBe(true);
      expect(shown.native.shownY < PAIR_TOP + BOX_SIZE / 2 - 5).toBe(true);
      expect(callbacks.length).toBe(2);

      await waitUntil(clipped, PAIR_DURATION + 400);
      if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect((await takeTransferTrace(clipped)).host).toBe(
          'TrackEnded:PositionX:true > TrackEnded:PositionY:true > Ended:Finished:None > Ended:Finished:None'
        );
      }
      expect(sortedCallbacks()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
      ).toBe(true);
      await render(null);
    }
  );

  movingGeometryTest(
    'a new Y in the delay of a native X gives the two leaves to the frame driver at once, and a clip after the end of that delay starts nothing: the view agrees with the frame driver, and each callback comes one time',
    async () => {
      const delayMs = 600;
      const durationMs = PAIR_DURATION / 2;
      const newYAt = delayMs / 2;
      const layouts = pairLayoutsOf((hasCallback) => ({
        originX: {
          duration: durationMs,
          delays: [delayMs],
          onlyWhenChanged: true,
          hasCallback,
        },
        originY: { duration: durationMs, onlyWhenChanged: true, hasCallback },
      }));
      const clipped = await move(
        { left: START_LEFT, top: 0, ...layouts },
        { left: PAIR_LEFT, top: 0, ...layouts }
      );
      await waitUntil(clipped, newYAt);
      const first = await takeTransferTrace(clipped);
      await render(
        <ClippedPair left={PAIR_LEFT} top={PAIR_TOP} {...layouts} />
      );
      await waitUntil(clipped, delayMs + 100);
      const second = await takeTransferTrace(clipped);
      scrollTo(CLIPPED_OFFSET);
      await waitUntil(clipped, delayMs + 250);
      const afterClip = await takeTransferTrace(clipped);
      scrollTo(0);
      console.log(
        `MERGED-DELAY | first start ${first.host} | new Y ${second.host} | clip ${afterClip.host} | callbacks ${sortedCallbacks()}`
      );
      expect(first.host).toBe(MERGED_DELAY.firstStart);
      expect(second.host).toBe(MERGED_DELAY.newY);
      expect(afterClip.host).toBe(MERGED_DELAY.clip);
      expect(sortedCallbacks()).toBe('frame:false,native:false');

      const rows: string[] = [];
      let agrees = true;
      for (const elapsedMs of [1000, 1300, 1600, 1900, 2200]) {
        await waitUntil(clipped, elapsedMs);
        const shown = await readPair(clipped);
        const isClose =
          shown.native.keys === 0 &&
          isNear(
            shown.native.shownX,
            shown.frame.x,
            twoFrames(PAIR_LEFT, durationMs)
          ) &&
          isNear(
            shown.native.shownY,
            shown.frame.y,
            twoFrames(PAIR_TOP, durationMs)
          );
        agrees &&= isClose;
        rows.push(
          `${elapsedMs} ms native ${shown.native.shownX.toFixed(2)} ${shown.native.shownY.toFixed(2)} keys ${shown.native.keys} frame driver ${shown.frame.x.toFixed(2)} ${shown.frame.y.toFixed(2)}`
        );
      }
      if (!agrees) {
        console.log(`MERGED-DELAY-ROWS | ${rows.join(' | ')}`);
      }
      expect(agrees).toBe(true);

      await waitUntil(clipped, newYAt + delayMs + durationMs + 400);
      expect(sortedCallbacks()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
      ).toBe(true);
      const end = await readPair(clipped);
      expect(end.native.keys).toBe(0);
      expect(
        isNear(end.native.shownX, end.frame.x, LAID_OUT_TOLERANCE) &&
          isNear(end.native.shownY, end.frame.y, LAID_OUT_TOLERANCE)
          ? ''
          : `the centre ${end.native.shownX} ${end.native.shownY} after the end is not the centre ${end.frame.x} ${end.frame.y} of the frame driver`
      ).toBe('');
      await render(null);
    }
  );

  const clippedChange = REMOVES_TRACKS_OUT_OF_WINDOW
    ? 'a frame change of a clipped view after the frame driver took its layout group starts no native track'
    : 'a frame change of a clipped view with a native track';
  movingGeometryTest(
    `${clippedChange}, and the view agrees with the frame driver`,
    async () => {
      const changeAt = 0.3 * PAIR_DURATION;
      const layouts = pairLayoutsOf((hasCallback) => ({
        originX: { duration: PAIR_DURATION, hasCallback },
      }));
      const clipped = await move(
        { left: START_LEFT, ...layouts },
        { left: PAIR_LEFT / 2, ...layouts }
      );
      await waitUntil(clipped, 0.15 * PAIR_DURATION);
      await takeTrace();
      scrollTo(CLIPPED_OFFSET);
      await waitUntil(clipped, changeAt);
      const transfer = await takeTransferTrace(clipped);
      expect(transfer.host).toBe(
        REMOVES_TRACKS_OUT_OF_WINDOW
          ? 'TrackEnded:PositionX:false > Ended:Interrupted:PlatformRemoved'
          : ''
      );
      expect(callbacks.length).toBe(0);

      await render(<ClippedPair left={PAIR_LEFT} {...layouts} />);
      await wait(100);
      const change = await takeTransferTrace(clipped);
      console.log(
        `CLIPPED-CHANGE | ${clippedChange} | ${change.host} | frame updates ${change.hasFrameUpdate}`
      );
      if (REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect(change.host).toBe('');
      }
      expect(sortedCallbacks()).toBe('frame:false,native:false');

      scrollTo(0);
      for (const fraction of [0.2, 0.5, 0.8]) {
        await waitUntil(clipped, changeAt + fraction * PAIR_DURATION);
        const shown = await readPair(clipped);
        if (REMOVES_TRACKS_OUT_OF_WINDOW) {
          expect(shown.native.keys).toBe(0);
        }
        expect(
          isNear(
            shown.native.shownX,
            shown.frame.x,
            twoFrames(PAIR_LEFT, PAIR_DURATION)
          )
        ).toBe(true);
        expect(shown.native.shownX < PAIR_LEFT + BOX_SIZE / 2 - 5).toBe(true);
      }
      expect(callbacks.length).toBe(2);

      await waitUntil(clipped, changeAt + PAIR_DURATION + 400);
      if (!REMOVES_TRACKS_OUT_OF_WINDOW) {
        expect((await takeTransferTrace(clipped)).host).toBe(
          'TrackEnded:PositionX:true > Ended:Finished:None'
        );
      }
      expect(sortedCallbacks()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
      ).toBe(true);
      await render(null);
    }
  );
});

describe('native layout tracks of a view that leaves the screen', () => {
  if (!hasNativeLayoutRoute || REMOVES_TRACKS_OUT_OF_WINDOW) {
    return;
  }

  const LEAVE_DURATION = 2 * LAYOUT_DURATION;
  const leaveLayout = layoutOf(
    {
      originX: { duration: LEAVE_DURATION },
      opacity: { duration: LEAVE_DURATION, initial: 0.3, to: 1 },
    },
    { name: 'native' }
  );
  const LEAVE_START =
    'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:Opacity > Admitted';
  const PLAYED_TO_THE_END =
    'TrackEnded:Opacity:true > TrackEnded:PositionX:true > Ended:Finished:None';

  type Scene = (left: number, isAway: boolean) => Parameters<typeof render>[0];

  type Leave = {
    shortName: string;
    scene: Scene;
    /** A render of the scene in place brings the view back at one half. */
    comesBack: boolean;
  };

  /**
   * Plays the layout group of the box, takes the view away by a render of the
   * scene away at one quarter of the group, and records the trace, the
   * callbacks, and the samples of the box.
   */
  async function playLeave(leave: Leave) {
    const started = await startLeave(leave.scene);
    await render(leave.scene(END_LEFT, true));
    return finishLeave(leave, started);
  }

  /** Starts the layout group of the box and waits for one quarter of it. */
  async function startLeave(scene: Scene) {
    const tag = await mountScene(scene(START_LEFT, false));
    await render(scene(END_LEFT, false));
    const startMs = performance.now();
    const until = (part: number) =>
      wait(Math.max(0, startMs + part * LEAVE_DURATION - performance.now()));
    await until(1 / 4);
    const start = summarize((await takeTraceOf(tag)).filter(isHostEvent));
    const before = await readOrNone(tag);
    return { tag, until, start, before };
  }

  async function finishLeave(
    { shortName, scene, comesBack }: Leave,
    { tag, until, start, before }: Awaited<ReturnType<typeof startLeave>>
  ) {
    await until(1 / 2);
    const away = await takeTraceOf(tag);
    const awaySample = await readOrNone(tag);
    if (comesBack) {
      await render(scene(END_LEFT, false));
    }
    await until(3 / 4);
    const backSample = await readOrNone(tag);
    await until(1);
    await wait(400);
    const afterLeave = [...away, ...(await takeTraceOf(tag))].filter(
      isHostEvent
    );
    const end = await readOrNone(tag);
    const record = {
      start,
      afterLeave: summarizeEnd(afterLeave),
      callbacks: callbacks.join(),
      before,
      awaySample,
      backSample,
      end,
    };
    console.log(`RuntimeTests${shortName} ${JSON.stringify(record)}`);
    const results = afterLeave.filter(({ event }) => event === 'Ended');
    return { ...record, results };
  }

  async function readOrNone(tag: number) {
    try {
      const [x, opacity] = await Promise.all([
        sample(tag, 'PositionX'),
        sample(tag, 'Opacity'),
      ]);
      return {
        shownX: x.presentation[0],
        shownOpacity: opacity.presentation[0],
        keys: x.playbacks.length,
      };
    } catch (error) {
      if (isNoView(error)) {
        return null;
      }
      throw error;
    }
  }

  /** One natural end of the group, its callback, and the end values on screen. */
  function expectPlayedToTheEnd({
    start,
    afterLeave,
    end,
  }: Awaited<ReturnType<typeof playLeave>>) {
    expect(start).toBe(LEAVE_START);
    expect(afterLeave).toBe(PLAYED_TO_THE_END);
    expect(callbacks.join()).toBe('native:true');
    expect(end?.keys).toBe(0);
    expect(isNear(end?.shownOpacity ?? NaN, 1)).toBe(true);
    expect(
      isNear(end?.shownX ?? NaN, centerOf(END_LEFT), LAID_OUT_TOLERANCE)
    ).toBe(true);
  }

  movingGeometryTest('a hidden Modal', async () => {
    const played = await playLeave({
      shortName: 'LeaveModal',
      scene: (left, isAway) => (
        <Modal visible={!isAway} transparent animationType="none">
          <View style={styles.container}>
            <Box left={left} layout={leaveLayout} />
          </View>
        </Modal>
      ),
      comesBack: false,
    });
    expect(played.start).toBe(LEAVE_START);
    expect(played.results.length).toBe(1);
    expect(callbacks.length).toBe(1);
    expect(played.end === null || played.end.keys === 0).toBe(true);
    await render(null);
  });

  movingGeometryTest('a screen pushed over a native track', async () => {
    expectPlayedToTheEnd(
      await playLeave({
        shortName: 'LeavePush',
        scene: (left, isAway) => (
          <ScreenStack style={localStyles.stack}>
            <ScreenStackItem
              screenId="NativeLayoutLeaveBase"
              headerConfig={HIDDEN_HEADER}
              stackAnimation="none">
              <View style={styles.container}>
                <Box left={left} layout={leaveLayout} />
              </View>
            </ScreenStackItem>
            {isAway && (
              <ScreenStackItem
                screenId="NativeLayoutLeavePushed"
                headerConfig={HIDDEN_HEADER}
                stackAnimation="none">
                <View style={localStyles.pushed} />
              </ScreenStackItem>
            )}
          </ScreenStack>
        ),
        comesBack: true,
      })
    );
    await render(null);
  });

  movingGeometryTest(
    'the activity of the app under another activity during a native track',
    async () => {
      const leave: Leave = {
        shortName: 'LeaveCovered',
        scene: (left) => (
          <View style={styles.container}>
            <Box left={left} layout={leaveLayout} />
          </View>
        ),
        comesBack: false,
      };
      const started = await startLeave(leave.scene);
      const covered = await runCovered(LEAVE_DURATION / 8, COVER_TIMEOUT_MS);
      console.log(`RuntimeTestsLeaveCoveredHost ${JSON.stringify(covered)}`);
      if (covered.outcome === 'timeout') {
        console.log(
          `RuntimeTestsLeaveCoveredHost not tested: no resume after a pause in ${COVER_TIMEOUT_MS} ms (paused at ${covered.pausedAtMs} ms)`
        );
        await render(null);
        return;
      }
      expect(pauseFaultOf(covered)).toBe('');
      expectPlayedToTheEnd(await finishLeave(leave, started));
      await render(null);
    }
  );
});

const HIDDEN_HEADER = { hidden: true };
const COVER_TIMEOUT_MS = 5000;

/**
 * The uptime of the pause and of the first resume after it. `timeout`: no such
 * resume in the timeout of the host after the cover time.
 */
type PauseRecord = {
  outcome: 'resumed' | 'timeout';
  pausedAtMs: number;
  resumedAtMs: number;
};

const pauseFaultOf = ({ pausedAtMs, resumedAtMs }: PauseRecord) =>
  Number.isFinite(pausedAtMs) && resumedAtMs > pausedAtMs
    ? ''
    : `no pause before the resume: paused at ${pausedAtMs} ms, resumed at ${resumedAtMs} ms`;

interface RuntimeTestsCoverModule extends TurboModule {
  /**
   * Covers the main activity with another activity of the app for `durationMs`.
   * Resolves at the first resume after a pause, or at `timeoutMs` after
   * `durationMs` with the outcome `timeout`.
   */
  runCovered(durationMs: number, timeoutMs: number): Promise<PauseRecord>;
}

/**
 * A task that goes to the back does not come to the front again on its own on
 * Android 10 and later, so the host covers the activity.
 */
function runCovered(durationMs: number, timeoutMs: number) {
  const host = TurboModuleRegistry.get<RuntimeTestsCoverModule>(
    'RuntimeTestsSurface'
  );
  if (!host?.runCovered) {
    throw new Error(
      'The test host has no RuntimeTestsSurface.runCovered method.'
    );
  }
  return host.runCovered(durationMs, timeoutMs);
}

const localStyles = StyleSheet.create({
  stack: {
    width: 300,
    height: 200,
  },
  pushed: {
    flex: 1,
    backgroundColor: 'white',
  },
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
  scroll: {
    height: 2 * PAIR_CELL_HEIGHT,
  },
  scrollFiller: {
    height: 3000,
  },
});
