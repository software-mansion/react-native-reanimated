import React from 'react';
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
import type { Key, Leaf, Leaves, PairProps } from './nativeLayoutTestKit';
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
  opacity?: number;
  showTarget: boolean;
  layout: LayoutAnimationFunction;
  /** The parent of the source has the layout animation and the move. */
  movesParent?: boolean;
};

function SharedScreens({
  left,
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
        { marginLeft: movesParent ? 0 : left, opacity },
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

async function sampleSharedContainer() {
  const samples = await Promise.all(
    Array.from({ length: SHARED_CONTAINER_TAGS }, (_, index) =>
      sample(FIRST_SHARED_CONTAINER_TAG + 2 * index, 'PositionX').catch(
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

const styles = StyleSheet.create({
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
