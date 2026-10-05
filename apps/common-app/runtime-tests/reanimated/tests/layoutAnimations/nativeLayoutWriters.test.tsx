import type { ComponentRef } from 'react';
import React from 'react';
import {
  findNodeHandle,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type {
  LayoutAnimationFunction,
  SharedValue,
} from 'react-native-reanimated';
import Animated, {
  createAnimatedComponent,
  getStaticFeatureFlag,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { PairProps } from './nativeLayoutTestKit';
import {
  ClippingScrollView,
  BOX_REF,
  BOX_SIZE,
  callbacks,
  callbackTimes,
  DURATION,
  FRAME_BOX_REF,
  END_LEFT,
  FRAME_MS,
  hasNativeLayoutStarts,
  isHostEvent,
  layoutOf,
  sample,
  isNear,
  LAYOUT_DURATION,
  linearAt,
  mountScene,
  Pair,
  PAIR_CELL_HEIGHT,
  PAIR_DURATION,
  PAIR_LEFT,
  PAIR_TOP,
  pairLayoutsOf,
  POSITION_TOLERANCE,
  SAMPLED_OPACITY_TOLERANCE,
  sampleOpacity,
  sampleOpacityPair,
  sampleRows,
  START_LEFT,
  summarize,
  summarizeEnd,
  takeTrace,
  takeTraceOf,
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
          opacityAnimation === 'infinite' && {
            animationName: OPACITY_KEYFRAMES,
            animationDuration: CSS_DURATION,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
          },
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
  if (!hasNativeLayoutStarts) {
    return;
  }
  const hasNativeCSS = getStaticFeatureFlag('IOS_CSS_CORE_ANIMATION');
  const testWithNativeCSS = hasNativeCSS ? test : () => {};
  const hasSynchronousProps = getStaticFeatureFlag(
    'IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS'
  );

  // The opacity track goes from 0.3 to the mounted value 1.
  const fadeIn = (name: string) =>
    layoutOf(
      {
        originX: { duration: LAYOUT_DURATION },
        opacity: { duration: LAYOUT_DURATION, initial: 0.3, to: 1 },
      },
      { name }
    );
  const fadeInAt = (startMs: number, timeMs: number) =>
    linearAt(0.3, 1, startMs, LAYOUT_DURATION)(timeMs);

  for (const usesAnimatedProps of [false, true]) {
    test(`${usesAnimatedProps ? 'animated props write' : 'an animated style writes'} the opacity during a native opacity track`, async () => {
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
    });
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

      await render(
        <CSSBox
          left={START_LEFT}
          opacity={0.2}
          layout={layout}
          cssDuration={CSS_DURATION}
        />
      );
      await wait(CSS_DURATION / 6);
      const cssEvents = await takeTraceOf(tag);
      const cssStart = cssEvents[0];
      expect(summarize(cssEvents)).toBe(
        'Received > TrackStarted:Opacity > Admitted'
      );
      const cssAt = (timeMs: number) =>
        1 -
        0.8 * Math.min(1, (timeMs - cssStart.monotonicTimeMs) / CSS_DURATION);

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
      const layoutAt = (timeMs: number) =>
        0.9 -
        0.7 * Math.min(1, (timeMs - layoutStart.monotonicTimeMs) / DURATION);

      const during = await sampleRows(tag, 3, DURATION / 5);
      for (const row of during) {
        expect(row.keys).toBe(2);
        expect(
          isNear(
            row.presentation,
            layoutAt(row.time),
            SAMPLED_OPACITY_TOLERANCE
          )
        ).toBe(true);
      }

      await wait(DURATION / 2);
      const after = await sampleRows(tag, 3, DURATION / 2);
      for (const row of after) {
        expect(row.keys).toBe(0);
        expect(
          isNear(row.presentation, cssAt(row.time), SAMPLED_OPACITY_TOLERANCE)
        ).toBe(true);
      }
      expect(callbacks.join()).toBe('over-css:true');

      await wait(CSS_DURATION);
      const end = await sampleOpacity(tag);
      expect(isNear(end.presentation, 0.2)).toBe(true);
      await render(null);
    }
  );

  test('a CSS transition start during a native layout opacity track runs on the loop, and its value shows after the layout track', async () => {
    const layout = fadeIn('under-css');
    const tag = await mountScene(
      <CSSBox left={START_LEFT} layout={layout} cssDuration={CSS_DURATION} />,
      WRITER_REF
    );

    await render(
      <CSSBox left={END_LEFT} layout={layout} cssDuration={CSS_DURATION} />
    );
    await wait(LAYOUT_DURATION / 4);
    const pending = (await takeTraceOf(tag))[0];

    await render(
      <CSSBox
        left={END_LEFT}
        opacity={0.5}
        layout={layout}
        cssDuration={CSS_DURATION}
      />
    );
    await wait(4 * FRAME_MS);
    const cssEvents = await takeTraceOf(tag);
    expect(summarize(cssEvents)).toBe(
      hasNativeCSS ? 'Received > Ended:Rejected:OwnershipDenied' : ''
    );
    const cssStartMs = (await sampleOpacity(tag)).time - 4 * FRAME_MS;
    const cssAt = (timeMs: number) =>
      1 - 0.5 * Math.min(1, (timeMs - cssStartMs) / CSS_DURATION);
    // A React commit during the track mounts the stored value of the CSS loop again.
    await render(
      <CSSBox
        left={END_LEFT}
        opacity={0.5}
        backgroundColor="orange"
        layout={layout}
        cssDuration={CSS_DURATION}
      />
    );

    const during = await sampleRows(tag, 4, LAYOUT_DURATION / 8);
    for (const row of during) {
      expect(row.keys).toBe(2);
      expect(
        isNear(
          row.presentation,
          fadeInAt(pending.monotonicTimeMs, row.time),
          SAMPLED_OPACITY_TOLERANCE
        )
      ).toBe(true);
    }

    await wait(LAYOUT_DURATION / 3);
    const after = await sampleRows(tag, 3, DURATION / 2);
    for (const row of after) {
      expect(row.keys).toBe(0);
      expect(
        isNear(row.presentation, cssAt(row.time), SAMPLED_OPACITY_TOLERANCE)
      ).toBe(true);
    }
    expect(callbacks.join()).toBe('under-css:true');

    await wait(CSS_DURATION);
    const end = await sampleOpacity(tag);
    expect(isNear(end.presentation, 0.5)).toBe(true);
    await render(null);
  });

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
      const { playbackKeys } = await sample(tag, 'PositionX');
      expect(playbackKeys.length).toBe(2);

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

  test('a CSS animation of the opacity that starts during a native layout opacity track shows after the track', async () => {
    const layout = fadeIn('under-animation');
    const tag = await mountScene(
      <CSSBox left={START_LEFT} layout={layout} />,
      WRITER_REF
    );

    await render(<CSSBox left={END_LEFT} layout={layout} />);
    await wait(LAYOUT_DURATION / 4);
    const pending = (await takeTraceOf(tag))[0];
    await render(
      <CSSBox left={END_LEFT} layout={layout} opacityAnimation="infinite" />
    );
    await wait(4 * FRAME_MS);
    const during = await sampleRows(tag, 4, LAYOUT_DURATION / 8);
    for (const row of during) {
      expect(row.keys).toBe(2);
      expect(row.model < 0.85).toBe(true);
      expect(
        isNear(
          row.presentation,
          fadeInAt(pending.monotonicTimeMs, row.time),
          SAMPLED_OPACITY_TOLERANCE
        )
      ).toBe(true);
    }

    await wait(LAYOUT_DURATION / 3);
    const after = await sampleRows(tag, 3, DURATION / 2);
    for (const row of after) {
      expect(row.keys).toBe(0);
      expect(row.presentation < 0.85).toBe(true);
      expect(isNear(row.presentation, row.model)).toBe(true);
    }
    expect(callbacks.join()).toBe('under-animation:true');
    await render(null);
  });

  for (const [fill, endOpacity] of [
    ['once-with-fill', 0.8],
    ['once', 1],
  ] as const) {
    test(`a CSS animation of the opacity that ends during a native layout opacity track leaves ${fill === 'once' ? 'the style value' : 'its fill value'}`, async () => {
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
    });
  }

  test('a React commit after a CSS loop transition ended under a native layout opacity track keeps the layout value on screen', async () => {
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
  });

  test('a layout start with an opacity leaf on a view with a CSS animation of the opacity', async () => {
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
  });

  test('a frame-driven start takes a view whose opacity a CSS loop transition and a native layout track have', async () => {
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
    await render(pair(END_LEFT, 0, 0.2));
    await wait(LAYOUT_DURATION / 4);
    // With the CSS loop from the start, the mounted opacity is not the end value of the leaf, and the
    // layout animation is frame-driven before the drop too.
    expect((await sampleOpacity(tag)).keys).toBe(hasNativeCSS ? 2 : 0);
    await render(pair(END_LEFT, 30, 0.2));
    await wait(2 * FRAME_MS);
    // With the synchronous props path, the value of the CSS loop shows on each box.
    for (let index = 0; index < 8; index++) {
      const { native, frame } = await sampleOpacityPair(tag, frameTag);
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
    await wait(CSS_DURATION);
    const { native, frame } = await sampleOpacityPair(tag, frameTag);
    expect(isNear(native.presentation, 0.2)).toBe(true);
    expect(isNear(frame.model, 0.2)).toBe(true);
    expect(native.keys).toBe(0);
    await render(null);
  });

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
  if (!hasNativeLayoutStarts) {
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
    const [position, opacity] = await Promise.all([
      sample(tag, 'Position'),
      sample(tag, 'Opacity'),
    ]);
    return {
      x: position.model[0],
      y: position.model[1],
      opacity: opacity.model[0],
      shownX: position.presentation[0],
      shownY: position.presentation[1],
      shownOpacity: opacity.presentation[0],
      keys: position.playbackKeys.length,
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

  // 0.5 pt and two display frames of a leaf that moves `distance` in `durationMs`.
  const twoFrames = (distance: number, durationMs: number) =>
    POSITION_TOLERANCE + (2 * FRAME_MS * distance) / durationMs;

  test('a clip of the view gives its layout group to the frame driver: the view shows the values of the frame driver after a scroll back, and the callback gets true one time at the natural end', async () => {
    const opacityDuration = 2 * LAYOUT_DURATION;
    const layouts = pairLayoutsOf((hasCallback) => ({
      originX: { duration: LAYOUT_DURATION, hasCallback },
      opacity: { duration: opacityDuration, initial: 0.3, to: 1 },
    }));
    const clipped = await move(
      { left: START_LEFT, ...layouts },
      { left: END_LEFT, ...layouts }
    );
    await waitUntil(clipped, LAYOUT_DURATION / 4);
    await takeTrace();
    scrollTo(CLIPPED_OFFSET);
    await waitUntil(clipped, LAYOUT_DURATION / 2);
    const transfer = await takeTransferTrace(clipped);
    expect(transfer.host).toBe(
      'TrackEnded:Opacity:false > TrackEnded:PositionX:false > Ended:Interrupted:PlatformRemoved'
    );
    expect(transfer.hasFrameUpdate).toBe(true);
    expect(callbacks.length).toBe(0);
    const hidden = await readPair(clipped);
    expect(hidden.native.keys).toBe(0);
    expect(
      isNear(
        hidden.native.x,
        hidden.frame.x,
        twoFrames(END_LEFT, LAYOUT_DURATION)
      )
    ).toBe(true);
    expect(
      isNear(
        hidden.native.opacity,
        hidden.frame.opacity,
        SAMPLED_OPACITY_TOLERANCE
      )
    ).toBe(true);

    scrollTo(0);
    await wait(4 * FRAME_MS);
    await waitUntil(clipped, 0.75 * LAYOUT_DURATION);
    const shown = await readPair(clipped);
    expect(shown.native.keys).toBe(0);
    expect(
      isNear(
        shown.native.shownX,
        shown.frame.x,
        twoFrames(END_LEFT, LAYOUT_DURATION)
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
    expect(sortedCallbacks()).toBe('frame:true,native:true');
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
    ).toBe(true);
    const end = await readBox(clipped.nativeTag);
    expect(end.keys).toBe(0);
    expect(isNear(end.shownOpacity, 1)).toBe(true);
    expect(isNear(end.shownX, END_LEFT + BOX_SIZE / 2)).toBe(true);
    await render(null);
  });

  test('a clip after a replacement that kept a native track of the older build: the callback of the old group has false, and the callback of the new group gets true at the natural end', async () => {
    const replacementAt = PAIR_DURATION / 5;
    const layouts = pairLayoutsOf((hasCallback) => ({
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true, hasCallback },
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
    await render(<ClippedPair left={PAIR_LEFT} top={PAIR_TOP} {...layouts} />);
    await waitUntil(clipped, replacementAt + 150);
    expect(sortedCallbacks()).toBe('frame:false,native:false');
    await takeTrace();
    scrollTo(CLIPPED_OFFSET);
    await waitUntil(clipped, replacementAt + 450);
    const transfer = await takeTransferTrace(clipped);
    expect(transfer.host).toBe(
      'TrackEnded:PositionX:false > TrackEnded:PositionY:false > Ended:Interrupted:PlatformRemoved > Ended:Interrupted:PlatformRemoved'
    );
    expect(transfer.hasFrameUpdate).toBe(true);
    expect(callbacks.length).toBe(2);

    scrollTo(0);
    await waitUntil(clipped, replacementAt + 750);
    const shown = await readPair(clipped);
    expect(shown.native.keys).toBe(0);
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
    expect(sortedCallbacks()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
    ).toBe(true);
    await render(null);
  });

  test('a frame change of a clipped view after the frame driver took its layout group starts no native track, and the view agrees with the frame driver', async () => {
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
      'TrackEnded:PositionX:false > Ended:Interrupted:PlatformRemoved'
    );
    expect(callbacks.length).toBe(0);

    await render(<ClippedPair left={PAIR_LEFT} {...layouts} />);
    await wait(100);
    const change = await takeTransferTrace(clipped);
    expect(change.host).toBe('');
    expect(sortedCallbacks()).toBe('frame:false,native:false');

    scrollTo(0);
    for (const fraction of [0.2, 0.5, 0.8]) {
      await waitUntil(clipped, changeAt + fraction * PAIR_DURATION);
      const shown = await readPair(clipped);
      expect(shown.native.keys).toBe(0);
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
    expect(sortedCallbacks()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 4 * FRAME_MS
    ).toBe(true);
    await render(null);
  });
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
