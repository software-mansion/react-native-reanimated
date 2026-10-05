import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  SharedTransition,
  SharedTransitionBoundary,
  withTiming,
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
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import type {
  Frame,
  Key,
  Leaf,
  Leaves,
  PairLayouts,
  PairProps,
  SizePairProps,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbacks,
  callbackTimes,
  END_OPACITY,
  FRAME_BOX_REF,
  FRAME_MS,
  Pair,
  PAIR_DURATION,
  PAIR_CELL_HEIGHT,
  PAIR_LEFT,
  PAIR_TOP,
  POSITION_TOLERANCE,
  START_OPACITY,
  takeTraceUntilSurfaceClosed,
  hasNativeLayoutStarts,
  layoutOf,
  mountScene,
  pairLayoutsOf,
  sample,
  SECOND_BOX_REF,
  secondSurfaceSceneOf,
  setSecondSurfaceBox,
  START_LEFT,
  takeTrace,
  takeTraceOf,
  summarize,
  summarizeEnd,
  SizePair,
  PAIR_IN_ROW,
  sampleFramePair,
  sampleFramePairAt,
  framePairDistances,
  isHostEvent,
  linearPairOf,
  sampleFrame,
  frameDistance,
} from './nativeLayoutTestKit';

const SHARED_SOURCE_REF = 'NativeLayoutContinuitySharedSource';
const SHARED_PARENT_REF = 'NativeLayoutContinuitySharedParent';
const SHARED_TRANSITION = SharedTransition.duration(PAIR_DURATION / 3);
// React Native gives no tag in this range, and each shared container takes the next even number.
const FIRST_SHARED_CONTAINER_TAG = 10000002;
const SHARED_CONTAINER_TAGS = 300;

function SharedParent({
  left,
  layout,
  children,
}: React.PropsWithChildren<{ left: number; layout: LayoutAnimationFunction }>) {
  const ref = useTestRef(SHARED_PARENT_REF);
  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      layout={layout}
      style={[styles.sharedParent, { marginLeft: left }]}>
      {children}
    </Animated.View>
  );
}

type SharedScreensProps = {
  left: number;
  width?: number;
  height?: number;
  opacity?: number;
  showTarget: boolean;
  layout: LayoutAnimationFunction;
  /** The parent of the source has the layout animation and the move. */
  movesParent?: boolean;
};

function SharedScreens({
  left,
  width = BOX_SIZE,
  height = BOX_SIZE,
  opacity = 1,
  showTarget,
  layout,
  movesParent = false,
}: SharedScreensProps) {
  const sourceRef = useTestRef(SHARED_SOURCE_REF);
  const source = (
    <Animated.View
      ref={sourceRef}
      sharedTransitionTag="native-layout-continuity"
      sharedTransitionStyle={SHARED_TRANSITION}
      layout={movesParent ? undefined : layout}
      style={[
        styles.sharedBox,
        { marginLeft: movesParent ? 0 : left, width, height, opacity },
      ]}
    />
  );
  return (
    <View style={styles.sharedScreens}>
      <SharedTransitionBoundary isActive={!showTarget}>
        {movesParent ? (
          <SharedParent left={left} layout={layout}>
            {source}
          </SharedParent>
        ) : (
          source
        )}
      </SharedTransitionBoundary>
      {showTarget && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="native-layout-continuity"
            sharedTransitionStyle={SHARED_TRANSITION}
            style={[styles.sharedBox, styles.sharedTarget]}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

async function findSharedContainerTag() {
  const tags = Array.from(
    { length: SHARED_CONTAINER_TAGS },
    (_, index) => FIRST_SHARED_CONTAINER_TAG + 2 * index
  );
  const samples = await Promise.all(
    tags.map((tag) => sample(tag, 'PositionX').catch(() => undefined))
  );
  return tags.find((_, index) => samples[index] !== undefined);
}

async function sampleSharedContainer(target = 'PositionX') {
  const samples = await Promise.all(
    Array.from({ length: SHARED_CONTAINER_TAGS }, (_, index) =>
      sample(FIRST_SHARED_CONTAINER_TAG + 2 * index, target).catch(
        () => undefined
      )
    )
  );
  return samples.find((containerSample) => containerSample !== undefined);
}

describe('native layout continuity', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  // The native box and the frame-driven box get the same commits. The frame-driven box is the reference.
  const pairTags = () => ({
    nativeTag: getTestComponent(BOX_REF).getTag(),
    frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
  });

  async function samplePair({ nativeTag, frameTag } = pairTags()) {
    const [position, opacity, framePosition, frameOpacity] = await Promise.all([
      sample(nativeTag, 'Position'),
      sample(nativeTag, 'Opacity'),
      sample(frameTag, 'Position'),
      sample(frameTag, 'Opacity'),
    ]);
    return {
      x: position.presentation[0],
      y: position.presentation[1],
      opacity: opacity.presentation[0],
      frameX: framePosition.model[0],
      // The frame-driven box is one cell below the native box.
      frameY: framePosition.model[1] - PAIR_CELL_HEIGHT,
      frameOpacity: frameOpacity.model[0],
      playbackKeys: position.playbackKeys,
    };
  }

  async function renderPair(
    layouts: Pick<PairProps, 'nativeLayout' | 'frameLayout'>,
    opacity = 1
  ) {
    await mountScene(
      <Pair left={START_LEFT} top={0} opacity={opacity} {...layouts} />
    );
  }

  const pairOf = (leaves: Leaves, frameKey: Key = 'originX') =>
    pairLayoutsOf((hasCallback) => ({
      ...leaves,
      [frameKey]: { ...leaves[frameKey], hasCallback },
    }));

  // The tolerance of the semantic contract: 0.5 pt and one display frame of the leaf with the given duration.
  const oneFrame = (durationMs = PAIR_DURATION) =>
    POSITION_TOLERANCE + (FRAME_MS * PAIR_LEFT) / durationMs;
  const OPACITY_TOLERANCE = 0.01 + FRAME_MS / PAIR_DURATION;

  async function expectPairParity(
    checkpoints: number,
    intervalMs: number,
    tolerance: number,
    tags = pairTags()
  ) {
    let isClose = true;
    // The presentation layer shows a change of the playback after the next display frame.
    await wait(2 * FRAME_MS);
    for (let checkpoint = 0; checkpoint < checkpoints; checkpoint++) {
      const { x, y, opacity, frameX, frameY, frameOpacity } =
        await samplePair(tags);
      isClose =
        isClose &&
        Math.abs(x - frameX) < tolerance &&
        Math.abs(y - frameY) < tolerance &&
        Math.abs(opacity - frameOpacity) < OPACITY_TOLERANCE;
      await wait(intervalMs);
    }
    expect(isClose).toBe(true);
  }

  test('a spring Y during a long native X keeps X on its timeline', async () => {
    const layouts = pairOf({
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
      originY: { isSpring: true, onlyWhenChanged: true },
    });
    await renderPair(layouts);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
    await wait(PAIR_DURATION / 3);
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await expectPairParity(10, PAIR_DURATION / 15, oneFrame());
    await wait(PAIR_DURATION / 3);
    const end = await samplePair();
    expect(end.playbackKeys.length).toBe(0);
    expect(Math.abs(end.x - end.frameX) < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 3 * FRAME_MS
    ).toBe(true);
    await render(null);
  });

  test('a new timing with the same end value keeps the old start time and start value', async () => {
    const first = pairOf({
      originX: { duration: PAIR_DURATION },
      originY: { duration: PAIR_DURATION },
    });
    // Each variant has the duration of its fastest part for the bound of one display frame.
    const variants: [Leaf, number][] = [
      [{ duration: PAIR_DURATION / 2 }, PAIR_DURATION / 2],
      [{ duration: 1.5 * PAIR_DURATION }, 1.5 * PAIR_DURATION],
      [
        { duration: PAIR_DURATION, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
        PAIR_DURATION / 2,
      ],
    ];
    for (const [leaf, fastestDuration] of variants) {
      const second = pairOf({ originX: leaf, originY: leaf });
      await renderPair(first);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
      await wait(PAIR_DURATION / 4);
      await render(
        <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...second} />
      );
      await expectPairParity(6, PAIR_DURATION / 20, oneFrame(fastestDuration));
      await wait(1.5 * PAIR_DURATION);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    }
  });

  test('the old track continues through the delay of its replacement', async () => {
    const first = pairOf({ originX: { duration: PAIR_DURATION } });
    const second = pairOf({
      originX: { duration: PAIR_DURATION / 3, delays: [PAIR_DURATION / 5] },
    });
    await renderPair(first);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
    await wait(PAIR_DURATION / 4);
    await render(<Pair left={PAIR_LEFT / 4} top={0} opacity={1} {...second} />);
    await expectPairParity(8, PAIR_DURATION / 15, oneFrame(PAIR_DURATION / 3));
    await wait(PAIR_DURATION / 3);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  test('a replacement with position and opacity continues both drivers from one value', async () => {
    const layouts = pairOf({
      originX: { duration: PAIR_DURATION },
      opacity: {
        duration: PAIR_DURATION,
        initial: START_OPACITY,
        to: END_OPACITY,
      },
    });
    await renderPair(layouts, START_OPACITY);
    await render(
      <Pair left={PAIR_LEFT} top={0} opacity={END_OPACITY} {...layouts} />
    );
    await wait(PAIR_DURATION / 3);
    await render(
      <Pair left={PAIR_LEFT / 4} top={0} opacity={END_OPACITY} {...layouts} />
    );
    await expectPairParity(6, PAIR_DURATION / 8, oneFrame());
    await render(null);
  });

  test('a replacement during the part of an overshoot curve that is below its start', async () => {
    const first = pairOf({
      originX: {
        duration: PAIR_DURATION,
        easing: Easing.bezier(0.3, -0.4, 0.7, 1.6),
      },
    });
    const second = pairOf({ originX: { duration: PAIR_DURATION } });
    await renderPair(first);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
    await wait(PAIR_DURATION / 10);
    await render(<Pair left={PAIR_LEFT / 2} top={0} opacity={1} {...second} />);
    await expectPairParity(6, PAIR_DURATION / 8, oneFrame());
    await render(null);
  });

  test('an exit during a native X continues X and fades', async () => {
    const layouts = pairOf({ originX: { duration: PAIR_DURATION } });
    const exiting = ((values: { currentOriginX: number }) => {
      'worklet';
      return {
        initialValues: { originX: values.currentOriginX, opacity: 1 },
        animations: {
          opacity: withTiming(0, {
            duration: PAIR_DURATION / 2,
            easing: Easing.linear,
          }),
        },
      };
    }) as PairProps['exiting'];
    await renderPair(layouts);
    await render(
      <Pair
        left={PAIR_LEFT}
        top={0}
        opacity={1}
        exiting={exiting}
        {...layouts}
      />
    );
    await wait(PAIR_DURATION / 3);
    const tags = pairTags();
    await render(
      <Pair
        left={PAIR_LEFT}
        top={0}
        opacity={1}
        exiting={exiting}
        isMounted={false}
        {...layouts}
      />
    );
    await expectPairParity(6, PAIR_DURATION / 15, oneFrame(), tags);
    await wait(PAIR_DURATION / 2);
    expect([...callbacks].sort().join()).toBe('frame:false,native:false');
    await render(null);
  });

  test('a new Y during a delayed native X', async () => {
    const layouts = pairOf({
      originX: {
        duration: PAIR_DURATION / 2,
        delays: [PAIR_DURATION / 4],
        onlyWhenChanged: true,
      },
      originY: { duration: PAIR_DURATION / 3, onlyWhenChanged: true },
    });
    // The first time is in the delay of X. The second time is after it.
    for (const waitMs of [PAIR_DURATION / 8, PAIR_DURATION / 2]) {
      await renderPair(layouts);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
      await wait(waitMs);
      await render(
        <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
      );
      await expectPairParity(
        8,
        PAIR_DURATION / 10,
        oneFrame(PAIR_DURATION / 2)
      );
      await wait(PAIR_DURATION / 2);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    }
  });

  test('a commit that changes no end value of the builder keeps X on its timeline', async () => {
    const layouts = pairOf({ originX: { duration: PAIR_DURATION } });
    await renderPair(layouts);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
    await wait(PAIR_DURATION / 3);
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await expectPairParity(6, PAIR_DURATION / 10, oneFrame());
    await wait(PAIR_DURATION / 3);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  test('a native replacement and then a frame-driven start', async () => {
    const timing = pairOf({
      originX: { duration: PAIR_DURATION },
      originY: { duration: PAIR_DURATION },
    });
    const spring = pairOf({
      originX: { duration: PAIR_DURATION },
      originY: { isSpring: true },
    });
    await renderPair(timing);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...timing} />);
    await wait(PAIR_DURATION / 4);
    await render(<Pair left={PAIR_LEFT / 2} top={0} opacity={1} {...timing} />);
    await wait(PAIR_DURATION / 4);
    const { nativeTag } = pairTags();
    const native = await sample(nativeTag, 'PositionX');
    expect(native.playbackKeys.length).toBe(2);
    await takeTrace();
    await render(
      <Pair left={PAIR_LEFT / 2} top={PAIR_TOP} opacity={1} {...spring} />
    );
    await expectPairParity(8, PAIR_DURATION / 12, oneFrame());
    expect((await sample(nativeTag, 'PositionX')).playbackKeys.length).toBe(0);
    await wait(PAIR_DURATION / 2);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:false,frame:true,native:false,native:false,native:true'
    );
    await render(null);
  });

  test('the removal of the view after a frame-driven start took its native tracks', async () => {
    const layouts = pairOf({
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
      originY: { isSpring: true, onlyWhenChanged: true },
    });
    await renderPair(layouts);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
    await wait(PAIR_DURATION / 4);
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await wait(PAIR_DURATION / 4);
    await render(null);
    await wait(200);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:false,native:false,native:false'
    );
    expect(
      (await takeTrace()).filter((event) => event.event === 'Ended').length
    ).toBe(1);
  });

  test('a React commit that changes the opacity prop during a native opacity track', async () => {
    const layouts = pairOf({
      originX: { duration: PAIR_DURATION },
      opacity: {
        duration: PAIR_DURATION,
        initial: START_OPACITY,
        to: END_OPACITY,
      },
    });
    await renderPair(layouts, START_OPACITY);
    await render(
      <Pair left={PAIR_LEFT} top={0} opacity={END_OPACITY} {...layouts} />
    );
    await wait(PAIR_DURATION / 3);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={0.6} {...layouts} />);
    await expectPairParity(5, PAIR_DURATION / 10, oneFrame());
    await wait(PAIR_DURATION / 4);
    // The native box shows the committed prop when its track ends.
    const end = await samplePair();
    expect(end.playbackKeys.length).toBe(0);
    expect(Math.abs(end.opacity - 0.6) < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  test('a new native Y keeps the long native X, and the callbacks agree with the frame driver', async () => {
    const layouts = pairOf({
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
      originY: { duration: PAIR_DURATION / 4, onlyWhenChanged: true },
    });
    await renderPair(layouts);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
    await wait(PAIR_DURATION / 4);
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await expectPairParity(6, PAIR_DURATION / 10, oneFrame());
    const { nativeTag } = pairTags();
    const native = await sample(nativeTag, 'PositionX');
    expect(native.playbackKeys.length).toBe(1);
    expect(callbacks.filter((name) => name.startsWith('native')).join()).toBe(
      'native:false'
    );
    await wait(PAIR_DURATION / 4);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    expect(
      Math.abs(callbackTimes.native - callbackTimes.frame) < 3 * FRAME_MS
    ).toBe(true);
    await render(null);
  });

  test('a new initial value is the start value of a native replacement and of a frame-driven start', async () => {
    const first = pairOf({ originX: { duration: PAIR_DURATION } });
    const offset = pairOf({
      originX: { duration: PAIR_DURATION, initial: 40 },
    });
    const offsetSpring = pairOf({
      originX: { duration: PAIR_DURATION, initial: 40 },
      originY: { isSpring: true, onlyWhenChanged: true },
    });
    for (const [second, top] of [
      [offset, 0],
      [offsetSpring, PAIR_TOP],
    ] as const) {
      await renderPair(first);
      await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...first} />);
      await wait(PAIR_DURATION / 4);
      await render(
        <Pair left={PAIR_LEFT / 2} top={top} opacity={1} {...second} />
      );
      await expectPairParity(5, PAIR_DURATION / 10, oneFrame());
      await render(null);
    }
  });

  test('the removal of the view in the next commit after a frame-driven start took its native tracks', async () => {
    const layouts = pairOf({
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
      originY: { isSpring: true, onlyWhenChanged: true },
    });
    await renderPair(layouts);
    await render(<Pair left={PAIR_LEFT} top={0} opacity={1} {...layouts} />);
    await wait(PAIR_DURATION / 4);
    const { nativeTag } = pairTags();
    await takeTrace();
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await render(null);
    await wait(200);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:false,native:false,native:false'
    );
    const events = (await takeTrace()).filter(
      (event) => event.tag === nativeTag
    );
    expect(events.filter((event) => event.event === 'Ended').length).toBe(1);
    expect(events.filter((event) => event.event === 'TrackEnded').length).toBe(
      1
    );
  });

  test('a shared transition from a view with a native X track starts at the value on screen', async () => {
    if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
      return;
    }
    for (const hasCallback of [false, true]) {
      const layout = layoutOf({
        originX: { duration: PAIR_DURATION, hasCallback },
      });
      await render(
        <SharedScreens left={START_LEFT} showTarget={false} layout={layout} />
      );
      await wait(50);
      const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
      await render(
        <SharedScreens left={PAIR_LEFT} showTarget={false} layout={layout} />
      );
      await wait(PAIR_DURATION / 3);
      const source = await sample(tag, 'PositionX');
      expect(source.playbackKeys.length).toBe(hasCallback ? 0 : 1);
      await render(
        <SharedScreens left={PAIR_LEFT} showTarget layout={layout} />
      );
      await wait(2 * FRAME_MS);
      const container = await sampleSharedContainer();
      // The container moves to the target for two frames after its start.
      expect(
        Math.abs(container!.model[0] - source.presentation[0]) < oneFrame()
      ).toBe(true);
      await wait(PAIR_DURATION / 2);
      await render(null);
    }
  });

  type SharedFrame = { left: number; width: number; height: number };
  const SHARED_START: SharedFrame = {
    left: START_LEFT,
    width: BOX_SIZE,
    height: BOX_SIZE,
  };
  const sharedSizeCases: [string, Key[], SharedFrame][] = [
    ['width track', ['width'], { ...SHARED_START, width: 3 * BOX_SIZE }],
    ['height track', ['height'], { ...SHARED_START, height: 3 * BOX_SIZE }],
    [
      'position and size group',
      ['originX', 'width', 'height'],
      { left: PAIR_LEFT / 2, width: 3 * BOX_SIZE, height: 2 * BOX_SIZE },
    ],
  ];
  for (const [caseName, keys, end] of sharedSizeCases) {
    test(`a shared transition from a view with a native ${caseName} starts at the frame on screen`, async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      const firstFrames: Frame[] = [];
      for (const hasCallback of [false, true]) {
        const layout = layoutOf(
          Object.fromEntries(
            keys.map((key, index) => [
              key,
              {
                duration: PAIR_DURATION,
                hasCallback: hasCallback && index === 0,
              },
            ])
          )
        );
        const screens = (frame: SharedFrame, showTarget: boolean) => (
          <SharedScreens {...frame} showTarget={showTarget} layout={layout} />
        );
        await render(screens(SHARED_START, false));
        await wait(50);
        const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
        await render(screens(end, false));
        await wait(PAIR_DURATION / 3);
        const source = await sampleFrame(tag);
        expect(source.playbackKeys.length).toBe(hasCallback ? 0 : keys.length);
        expect(
          frameDistance(source.presentation, source.model) > BOX_SIZE / 2
        ).toBe(!hasCallback);
        await render(screens(end, true));
        await wait(2 * FRAME_MS);
        const containerTag = await findSharedContainerTag();
        const container = await sampleFrame(containerTag!);
        // The container changes to the frame of the target for two frames after its start.
        for (const dimension of ['x', 'width', 'height'] as const) {
          expect(
            Math.abs(
              container.model[dimension] - source.presentation[dimension]
            ) < oneFrame()
          ).toBe(true);
        }
        firstFrames.push(container.model);
        await wait(PAIR_DURATION / 2);
        await render(null);
      }
      // The container of the native source starts where the container of the frame-driven source starts.
      expect(frameDistance(firstFrames[0], firstFrames[1]) < oneFrame()).toBe(
        true
      );
    });
  }

  test('a shared transition from a child of a view with a native X track starts at the value on screen', async () => {
    if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
      return;
    }
    for (const hasCallback of [false, true]) {
      const layout = layoutOf({
        originX: { duration: PAIR_DURATION, hasCallback },
      });
      const screens = (left: number, showTarget: boolean) => (
        <SharedScreens
          left={left}
          showTarget={showTarget}
          layout={layout}
          movesParent
        />
      );
      await render(screens(START_LEFT, false));
      await wait(50);
      const parentTag = getTestComponent(SHARED_PARENT_REF).getTag();
      await render(screens(PAIR_LEFT, false));
      await wait(PAIR_DURATION / 3);
      const parent = await sample(parentTag, 'PositionX');
      expect(parent.playbackKeys.length).toBe(hasCallback ? 0 : 1);
      await render(screens(PAIR_LEFT, true));
      await wait(2 * FRAME_MS);
      const container = await sampleSharedContainer();
      expect(
        Math.abs(container!.model[0] - parent.presentation[0]) < oneFrame()
      ).toBe(true);
      await wait(PAIR_DURATION / 2);
      await render(null);
    }
  });

  test('a shared transition hides a source view whose native opacity track plays', async () => {
    if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
      return;
    }
    for (const hasCallback of [false, true]) {
      const layout = layoutOf({
        originX: { duration: PAIR_DURATION, hasCallback },
        opacity: { duration: PAIR_DURATION, initial: 1, to: 0.5 },
      });
      const screens = (left: number, opacity: number, showTarget: boolean) => (
        <SharedScreens
          left={left}
          opacity={opacity}
          showTarget={showTarget}
          layout={layout}
        />
      );
      await render(screens(START_LEFT, 1, false));
      await wait(50);
      const tag = getTestComponent(SHARED_SOURCE_REF).getTag();
      await render(screens(PAIR_LEFT, 0.5, false));
      await wait(PAIR_DURATION / 3);
      const before = await sample(tag, 'Opacity');
      expect(before.playbackKeys.length).toBe(hasCallback ? 0 : 2);
      await render(screens(PAIR_LEFT, 0.5, true));
      await wait(2 * FRAME_MS);
      const containerTag = await findSharedContainerTag();
      const container = await sample(containerTag!, 'Opacity');
      const source = await sample(tag, 'Opacity');
      expect(source.presentation[0]).toBe(0);
      // The container starts at the opacity that the source showed.
      expect(Math.abs(container.model[0] - before.presentation[0]) < 0.02).toBe(
        true
      );
      await wait(PAIR_DURATION / 2);
      await render(null);
    }
  });
});

const TransferSurfaceScene = secondSurfaceSceneOf({
  layout: layoutOf(
    {
      originX: { duration: PAIR_DURATION, onlyWhenChanged: true },
      originY: { isSpring: true, onlyWhenChanged: true },
    },
    { name: 'surface' }
  ),
});

describe('native layout continuity on a second surface', () => {
  if (!hasNativeLayoutStarts || !isSecondSurfaceAvailable()) {
    return;
  }

  test('the stop of a surface after a frame-driven start took a native track gives each callback one result', async () => {
    const surfaceId = await startSecondSurface(TransferSurfaceScene);
    const tag = getTestComponent(SECOND_BOX_REF).getTag();
    await takeTrace();
    callbacks.length = 0;
    setSecondSurfaceBox({ left: PAIR_LEFT, top: 0 });
    await wait(PAIR_DURATION / 4);
    setSecondSurfaceBox({ left: PAIR_LEFT, top: PAIR_TOP });
    await wait(4 * FRAME_MS);
    expect(callbacks.join()).toBe('surface:false');
    await stopSecondSurface(surfaceId);
    const events = await takeTraceUntilSurfaceClosed(surfaceId);
    await wait(500);
    expect(callbacks.join()).toBe('surface:false,surface:false');
    expect(
      events.filter((event) => event.tag === tag && event.event === 'Ended')
        .length
    ).toBe(1);
    expect(
      (await takeTrace()).filter((event) => event.tag === tag).length
    ).toBe(0);
  });
});

describe('native layout size continuity', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const START = { left: 0, top: 0, width: 50 };
  const FIRST = { left: 120, top: 0, width: 150 };
  const MOVED = { left: 120, top: 0, width: 50 };
  const TOLERANCE = POSITION_TOLERANCE + (FRAME_MS * 120) / PAIR_DURATION;
  const CHECKPOINTS = [0.05, 0.15, 0.3, 0.45, 0.6, 0.8];

  const customPair = pairLayoutsOf((hasCallback) => ({
    originX: { duration: PAIR_DURATION, hasCallback },
    width: { duration: PAIR_DURATION },
  }));
  const linearPair = linearPairOf(PAIR_DURATION);

  // The second commit comes after one third of the first animation.
  async function replaceDuringSizeGroup(
    layouts: PairLayouts,
    second: Partial<SizePairProps>,
    first = FIRST
  ) {
    const tag = await mountScene(<SizePair {...START} {...layouts} />);
    await render(<SizePair {...first} {...layouts} />);
    await wait(PAIR_DURATION / 3);
    const firstEvents = await takeTraceOf(tag);
    const before = await sampleFramePair();
    await render(<SizePair {...first} {...second} {...layouts} />);
    const rows = await sampleFramePairAt(PAIR_DURATION, CHECKPOINTS);
    const events = await takeTraceOf(tag);
    return {
      firstPending: firstEvents[0],
      before,
      rows,
      events,
      distances: framePairDistances(rows),
    };
  }

  const targetsOf = (events: TraceEvent[], name: string) =>
    events
      .filter(({ event }) => event === name)
      .map(({ target }) => target)
      .join();

  // The last part of a playback key is its target.
  const targetPartOf = (key: string) => key.split('.').pop();

  // Each key of `before` is in `after`, but one: a key with a new generation has its target.
  function expectOneTrackReplaced(before: string[], after: string[]) {
    const ended = before.filter((key) => !after.includes(key));
    const started = after.filter((key) => !before.includes(key));
    expect(after.length).toBe(before.length);
    expect(ended.length).toBe(1);
    expect(started.length).toBe(1);
    expect(targetPartOf(started[0])).toBe(targetPartOf(ended[0]));
  }

  // The old track of `replaced` ends first. Each track on the view then ends one time, and the result comes last.
  function expectOneEndForEachTrack(
    events: TraceEvent[],
    replaced: string,
    kept: string[]
  ) {
    const hostEvents = events.filter(isHostEvent);
    const trackEnds = hostEvents
      .filter(({ event }) => event === 'TrackEnded')
      .map(({ target, finished }) => `${target}:${finished}`);
    expect(trackEnds[0]).toBe(`${replaced}:false`);
    expect(trackEnds.slice(1).sort().join()).toBe(
      [replaced, ...kept]
        .map((target) => `${target}:true`)
        .sort()
        .join()
    );
    expect(summarize(hostEvents.filter(({ event }) => event === 'Ended'))).toBe(
      'Ended:Interrupted:None > Ended:Finished:None'
    );
    expect(summarize(hostEvents.slice(-1))).toBe('Ended:Finished:None');
  }

  test('a new X during a native size group replaces the X track and keeps the width track', async () => {
    const { before, rows, events, distances } = await replaceDuringSizeGroup(
      customPair,
      { left: 0 }
    );
    expect(targetsOf(events, 'TrackStarted')).toBe('PositionX');
    expect(before.playbackKeys.length).toBe(2);
    expectOneTrackReplaced(before.playbackKeys, rows[0].playbackKeys);
    expectOneEndForEachTrack(events, 'PositionX', ['Width']);
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect(distances.keysAtEnd).toBe(0);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  test('a new width during a native size group replaces the width track and keeps the X track', async () => {
    const { before, rows, events, distances } = await replaceDuringSizeGroup(
      customPair,
      { width: 100 }
    );
    expect(targetsOf(events, 'TrackStarted')).toBe('Width');
    expect(before.playbackKeys.length).toBe(2);
    expectOneTrackReplaced(before.playbackKeys, rows[0].playbackKeys);
    expectOneEndForEachTrack(events, 'Width', ['PositionX']);
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect(distances.keysAtEnd).toBe(0);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  test('a commit with the same end values during a native size group starts no track, and the frame driver takes the group on its timeline', async () => {
    const { firstPending, before, rows, events, distances } =
      await replaceDuringSizeGroup(customPair, { top: 40 });
    expect(summarize(events)).toBe(
      'LayoutLeafCaptured:PositionX > LayoutLeafCaptured:Width > LayoutBuildFailed:UnsupportedContinuation > FrameUpdateMounted:PositionX > FrameUpdateMounted:Width > TrackEnded:PositionX:false > TrackEnded:Width:false > Ended:Cancelled:None > ClientEnded:Cancelled:None'
    );
    // Each captured value is the value of its track at the pull.
    const [capturedX, capturedWidth] = events;
    const progress =
      (capturedX.monotonicTimeMs - firstPending.monotonicTimeMs) /
      PAIR_DURATION;
    expect(
      Math.abs(capturedX.leafValue! - progress * FIRST.left) < TOLERANCE
    ).toBe(true);
    expect(
      Math.abs(
        capturedWidth.leafValue! -
          (START.width + progress * (FIRST.width - START.width))
      ) < TOLERANCE
    ).toBe(true);
    expect(before.playbackKeys.length).toBe(2);
    expect(rows[0].playbackKeys.length).toBe(0);
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  const NO_LAYOUT: PairLayouts = {
    nativeLayout: undefined,
    frameLayout: undefined,
  };

  test('a native size group plays to its end after the removal of the layout prop', async () => {
    const tag = await mountScene(<SizePair {...START} {...customPair} />);
    await render(<SizePair {...FIRST} {...customPair} />);
    await wait(PAIR_DURATION / 3);
    await takeTraceOf(tag);
    await render(<SizePair {...FIRST} {...NO_LAYOUT} />);
    const rows = await sampleFramePairAt(
      (2 * PAIR_DURATION) / 3,
      [0.1, 0.4, 0.7]
    );
    const events = await takeTraceOf(tag);
    expect(summarizeEnd(events)).toBe(
      'TrackEnded:PositionX:true > TrackEnded:Width:true > Ended:Finished:None'
    );
    expect(
      rows
        .slice(0, -1)
        .map((row) => row.playbackKeys.length)
        .join()
    ).toBe('2,2,2');
    expect(framePairDistances(rows).during < TOLERANCE).toBe(true);
    expect(framePairDistances(rows).atEnd < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  type GroupFrame = typeof FIRST & { height?: number };
  type StyleChange = {
    host?: SizePairProps['host'];
    /** The commit that changes the style gives this frame also. */
    frameAfter?: GroupFrame;
  };

  // One commit changes the style after one third of the animation. The frame changes only with `frameAfter`.
  async function changeStyleDuringAnimation(
    layouts: PairLayouts,
    end: GroupFrame,
    styleBefore: ViewStyle | undefined,
    styleAfter: ViewStyle | undefined,
    { host, frameAfter }: StyleChange = {}
  ) {
    const pairOf = (frame: GroupFrame, style: ViewStyle | undefined) => (
      <SizePair {...frame} host={host} style={style} {...layouts} inRow />
    );
    const tag = await mountScene(pairOf(START, styleBefore));
    await render(pairOf(end, styleBefore));
    await wait(PAIR_DURATION / 3);
    const startEvents = await takeTraceOf(tag);
    const before = await sampleFramePair(PAIR_IN_ROW);
    await render(pairOf(frameAfter ?? end, styleAfter));
    await wait(4 * FRAME_MS);
    const commitEvents = await takeTraceOf(tag);
    // A new frame starts the animation again.
    const rows = await sampleFramePairAt(
      frameAfter ? PAIR_DURATION : (2 * PAIR_DURATION) / 3,
      [0.1, 0.4, 0.7],
      PAIR_IN_ROW
    );
    const endEvents = await takeTraceOf(tag);
    return {
      startEvents,
      before,
      commitEvents,
      rows,
      endEvents,
      distances: framePairDistances(rows),
    };
  }

  const BORDER: ViewStyle = { borderWidth: 3, borderColor: 'black' };
  const stylesWithNoNativeSizeChange: [string, ViewStyle][] = [
    ['a border', BORDER],
    [
      'a transform origin',
      { transformOrigin: 'top left', transform: [{ rotate: '20deg' }] },
    ],
    [
      'a legacy shadow',
      {
        shadowColor: 'black',
        shadowOpacity: 0.8,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
      },
    ],
  ];
  const TRANSFER_OF_X_AND_WIDTH =
    'LayoutBuildFailed:UnsupportedTarget > FrameUpdateMounted:PositionX > FrameUpdateMounted:Width > TrackEnded:PositionX:false > TrackEnded:Width:false > Ended:Cancelled:None';
  const TALLER: GroupFrame = { left: 0, top: 40, width: 50, height: 110 };
  const heightPair = pairLayoutsOf((hasCallback) => ({
    originY: { duration: PAIR_DURATION, hasCallback },
    height: { duration: PAIR_DURATION },
  }));
  const groupsWithASizeTrack: [string, PairLayouts, GroupFrame, string][] = [
    ['size', customPair, FIRST, TRANSFER_OF_X_AND_WIDTH],
    [
      'height',
      heightPair,
      TALLER,
      'LayoutBuildFailed:UnsupportedTarget > FrameUpdateMounted:PositionY > FrameUpdateMounted:Height > TrackEnded:PositionY:false > TrackEnded:Height:false > Ended:Cancelled:None',
    ],
  ];
  for (const [groupName, layouts, end, transfer] of groupsWithASizeTrack) {
    for (const [styleName, style] of stylesWithNoNativeSizeChange) {
      test(`${styleName} that comes during a native ${groupName} group gives the group to the frame driver`, async () => {
        const { before, commitEvents, rows, endEvents, distances } =
          await changeStyleDuringAnimation(layouts, end, undefined, style);
        expect(before.playbackKeys.length).toBe(2);
        expect(summarize(commitEvents.filter(isHostEvent))).toBe(transfer);
        expect(rows[0].playbackKeys.length).toBe(0);
        expect(summarize(endEvents.filter(isHostEvent))).toBe('');
        expect(distances.during < TOLERANCE).toBe(true);
        expect(distances.atEnd < 0.01).toBe(true);
        expect([...callbacks].sort().join()).toBe(
          'frame:true,native:false,native:true'
        );
        await render(null);
      });
    }
  }

  test('a border and a new width in one commit during a native size group give the group to the frame driver', async () => {
    const { before, commitEvents, rows, endEvents, distances } =
      await changeStyleDuringAnimation(customPair, FIRST, undefined, BORDER, {
        frameAfter: { ...FIRST, width: 100 },
      });
    expect(before.playbackKeys.length).toBe(2);
    expect(summarize(commitEvents.filter(isHostEvent))).toBe(
      TRANSFER_OF_X_AND_WIDTH
    );
    expect(rows[0].playbackKeys.length).toBe(0);
    expect(summarize(endEvents.filter(isHostEvent))).toBe('');
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  const stylesWithANativeSizeChange: [string, ViewStyle][] = [
    ['a new background color', { backgroundColor: 'navy' }],
    ['a new opacity', { opacity: 0.5 }],
  ];
  for (const [styleName, style] of stylesWithANativeSizeChange) {
    test(`${styleName} during a native size group keeps the native tracks`, async () => {
      const { before, commitEvents, rows, endEvents, distances } =
        await changeStyleDuringAnimation(customPair, FIRST, undefined, style);
      expect(before.playbackKeys.length).toBe(2);
      expect(summarize(commitEvents)).toBe('');
      expect(rows[0].playbackKeys.join()).toBe(before.playbackKeys.join());
      expect(summarizeEnd(endEvents)).toBe(
        'TrackEnded:PositionX:true > TrackEnded:Width:true > Ended:Finished:None'
      );
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd < 0.01).toBe(true);
      expect(distances.keysAtEnd).toBe(0);
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      await render(null);
    });
  }

  const hostsWithNoNativeSizeChange: [string, SizePairProps['host']][] = [
    ['a Text', 'Text'],
    ['an Image', 'Image'],
  ];
  const lateBorderOnPositionTracks: [string, SizePairProps['host']][] = [
    ['native position tracks with size leaves that do not change', undefined],
    ...hostsWithNoNativeSizeChange.map(
      ([hostName, host]): [string, SizePairProps['host']] => [
        `the native position tracks of ${hostName}`,
        host,
      ]
    ),
  ];
  for (const [caseName, host] of lateBorderOnPositionTracks) {
    test(`a border that comes during ${caseName} keeps the native tracks`, async () => {
      const { before, commitEvents, rows, endEvents, distances } =
        await changeStyleDuringAnimation(linearPair, MOVED, undefined, BORDER, {
          host,
        });
      expect(before.playbackKeys.length).toBe(4);
      expect(summarize(commitEvents)).toBe('');
      expect(rows[0].playbackKeys.join()).toBe(before.playbackKeys.join());
      expect(summarizeEnd(endEvents)).toBe(
        'TrackEnded:Height:true > TrackEnded:PositionX:true > TrackEnded:PositionY:true > TrackEnded:Width:true > Ended:Finished:None'
      );
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd < 0.01).toBe(true);
      await render(null);
    });
  }

  test('the removal of a border during a frame-driven size animation starts no native track', async () => {
    const { startEvents, commitEvents, rows, endEvents, distances } =
      await changeStyleDuringAnimation(customPair, FIRST, BORDER, undefined);
    const isRouteEvent = ({ event }: TraceEvent) =>
      event !== 'FrameUpdateMounted';
    expect(summarize(startEvents.filter(isRouteEvent))).toBe(
      'LayoutBuildFailed:UnsupportedTarget'
    );
    expect(summarize(commitEvents.filter(isRouteEvent))).toBe('');
    expect(summarize(endEvents.filter(isRouteEvent))).toBe('');
    expect(rows.map((row) => row.playbackKeys.length).join()).toBe('0,0,0,0');
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    await render(null);
  });

  type FrameKey = 'left' | 'top' | 'width' | 'height';
  type TrackLeaf = 'originX' | 'originY' | 'width' | 'height';
  const WRITE_START = { left: 0, top: 0, width: 50, height: 50 };
  const TRACK_END: Record<TrackLeaf, Partial<typeof WRITE_START>> = {
    originX: { left: 120 },
    originY: { top: 60 },
    width: { width: 150 },
    height: { height: 110 },
  };
  const WRITE_OFFSET: Record<FrameKey, number> = {
    left: 30,
    top: 30,
    width: 40,
    height: 40,
  };
  const WRITE_CHECKPOINTS = [0.05, 0.25, 0.5, 0.75, 0.95];

  // The layout prop goes away during the track. A later commit with no layout prop writes one frame value.
  // The boxes are in a row: in a column the layout gives them heights that differ by a float error.
  async function writeDuringTrack(trackLeaf: TrackLeaf, writeKey: FrameKey) {
    const layouts = pairLayoutsOf((hasCallback) => ({
      [trackLeaf]: { duration: PAIR_DURATION, hasCallback },
    }));
    const first = { ...WRITE_START, ...TRACK_END[trackLeaf] };
    const written = {
      ...first,
      [writeKey]: first[writeKey] + WRITE_OFFSET[writeKey],
    };
    const tag = await mountScene(
      <SizePair {...WRITE_START} {...layouts} inRow />
    );
    await render(<SizePair {...first} {...layouts} inRow />);
    await wait(PAIR_DURATION / 3);
    await render(<SizePair {...first} {...NO_LAYOUT} inRow />);
    await wait(150);
    await takeTraceOf(tag);
    callbacks.length = 0;
    await render(<SizePair {...written} {...NO_LAYOUT} inRow />);
    const rows = await sampleFramePairAt(
      PAIR_DURATION,
      WRITE_CHECKPOINTS,
      PAIR_IN_ROW
    );
    const events = await takeTraceOf(tag);
    return { rows, events, distances: framePairDistances(rows) };
  }

  // A write of the value of the track starts a native track. A write of a different value gives the track to the frame driver.
  const competingWrites: [TrackLeaf, FrameKey, string][] = [
    ['originX', 'left', 'PositionX'],
    ['originX', 'width', ''],
    ['width', 'left', ''],
    ['width', 'width', 'Width'],
    ['originY', 'top', 'PositionY'],
    ['originY', 'height', ''],
    ['height', 'top', ''],
    ['height', 'height', 'Height'],
  ];
  for (const [trackLeaf, writeKey, startedTrack] of competingWrites) {
    test(`a write of ${writeKey} with no layout prop during a native ${trackLeaf} track agrees with the frame driver`, async () => {
      const { rows, events, distances } = await writeDuringTrack(
        trackLeaf,
        writeKey
      );
      expect(targetsOf(events, 'TrackStarted')).toBe(startedTrack);
      expect(
        events.some(
          ({ buildFailure }) => buildFailure === 'UnsupportedContinuation'
        )
      ).toBe(startedTrack === '');
      expect(rows[0].playbackKeys.length).toBe(startedTrack === '' ? 0 : 1);
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd < 0.01).toBe(true);
      expect(distances.keysAtEnd).toBe(0);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    });
  }

  for (const [hostName, host] of hostsWithNoNativeSizeChange) {
    test(`a write of width with no layout prop during the native tracks of ${hostName} gives the tracks to the frame driver`, async () => {
      const layouts = pairLayoutsOf((hasCallback) => ({
        originX: { duration: PAIR_DURATION, hasCallback },
        originY: { duration: PAIR_DURATION },
        width: { duration: PAIR_DURATION },
        height: { duration: PAIR_DURATION },
      }));
      const first = { ...WRITE_START, ...TRACK_END.originX, host };
      const tag = await mountScene(
        <SizePair {...WRITE_START} host={host} {...layouts} inRow />
      );
      await render(<SizePair {...first} {...layouts} inRow />);
      await wait(PAIR_DURATION / 3);
      await render(<SizePair {...first} {...NO_LAYOUT} inRow />);
      await wait(150);
      const before = await sampleFramePair(PAIR_IN_ROW);
      await takeTraceOf(tag);
      callbacks.length = 0;
      await render(
        <SizePair
          {...first}
          width={first.width + WRITE_OFFSET.width}
          {...NO_LAYOUT}
          inRow
        />
      );
      const rows = await sampleFramePairAt(
        PAIR_DURATION,
        WRITE_CHECKPOINTS,
        PAIR_IN_ROW
      );
      const events = await takeTraceOf(tag);
      const distances = framePairDistances(rows);
      expect(before.playbackKeys.length).toBe(4);
      expect(targetsOf(events, 'TrackStarted')).toBe('');
      expect(
        events.some(({ buildFailure }) => buildFailure === 'UnsupportedTarget')
      ).toBe(true);
      expect(rows[0].playbackKeys.length).toBe(0);
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd < 0.01).toBe(true);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    });
  }

  for (const startsFlat of [false, true]) {
    test(`a flattening change of the parent with a new width after the removal of the layout prop replaces the width track (${startsFlat ? 'the parent unflattens' : 'the parent flattens'})`, async () => {
      const scene = (
        box: Partial<SizePairProps>,
        isFlat: boolean,
        layouts: PairLayouts
      ) => (
        <View>
          <View style={isFlat ? undefined : styles.notFlat}>
            <SizePair {...box} {...layouts} inRow />
          </View>
        </View>
      );
      const tag = await mountScene(scene(START, startsFlat, customPair));
      await render(scene(FIRST, startsFlat, customPair));
      await wait(PAIR_DURATION / 3);
      await render(scene(FIRST, startsFlat, NO_LAYOUT));
      await wait(150);
      const before = await sampleFramePair(PAIR_IN_ROW);
      await takeTraceOf(tag);
      callbacks.length = 0;
      await render(
        scene(
          { ...FIRST, width: FIRST.width + WRITE_OFFSET.width },
          !startsFlat,
          NO_LAYOUT
        )
      );
      const rows = await sampleFramePairAt(
        PAIR_DURATION,
        WRITE_CHECKPOINTS,
        PAIR_IN_ROW
      );
      const events = await takeTraceOf(tag);
      const distances = framePairDistances(rows);
      expect(getTestComponent(BOX_REF).getTag()).toBe(tag);
      expect(targetsOf(events, 'TrackStarted')).toBe('Width');
      expectOneTrackReplaced(before.playbackKeys, rows[0].playbackKeys);
      expectOneEndForEachTrack(events, 'Width', ['PositionX']);
      expect(distances.during < TOLERANCE).toBe(true);
      expect(distances.atEnd < 0.01).toBe(true);
      expect(distances.keysAtEnd).toBe(0);
      expect([...callbacks].sort().join()).toBe(
        'frame:false,frame:true,native:false,native:true'
      );
      await render(null);
    });
  }

  test('a new X during a LinearTransition replaces the X track and keeps the other tracks', async () => {
    const { before, rows, events, distances } = await replaceDuringSizeGroup(
      linearPair,
      { left: 0 },
      MOVED
    );
    expect(targetsOf(events, 'TrackStarted')).toBe('PositionX');
    expect(before.playbackKeys.length).toBe(4);
    expectOneTrackReplaced(before.playbackKeys, rows[0].playbackKeys);
    expectOneEndForEachTrack(events, 'PositionX', [
      'PositionY',
      'Width',
      'Height',
    ]);
    expect(distances.during < TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect(distances.keysAtEnd).toBe(0);
    await render(null);
  });
});

const styles = StyleSheet.create({
  // A view with an opacity is not flattened.
  notFlat: {
    opacity: 0.9,
  },
  sharedScreens: {
    width: 300,
    height: 300,
  },
  sharedParent: {
    width: BOX_SIZE,
    height: BOX_SIZE,
  },
  sharedBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
  sharedTarget: {
    marginLeft: PAIR_LEFT / 2,
    marginTop: 150,
  },
});
