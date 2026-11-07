import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
  SharedTransitionType,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

describe('Shared transition live target geometry', () => {
  test('samples ancestor motion without starting a new clock', async () => {
    const state = counters();
    const offset = makeMutable(0);
    const transition = countedTransition(1200, state);
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} {...{ transition, offset }} />);
    await waitForFrames();
    const stop = await recordStarts(state);
    try {
      await render(<Screens active {...{ transition, offset }} />);
      await waitForFrames(3);
      expect(state.value.starts).toBe(1);
      await advanceAnimationTimer(300);
      offset.value = 100;
      await waitForFrames(3);
      await expectTranslation(25);
      expect((await props('source'))?.width).toBe(45, ComparisonMode.PIXEL);
      await advanceAnimationTimer(300);
      offset.value = 200;
      await waitForFrames(3);
      await expectTranslation(100);
      expect((await props('source'))?.width).toBe(60, ComparisonMode.PIXEL);
      expect(state.value.success).toBe(0);
      await advanceAnimationTimer(600);
      await expectEventually(() => state.value.success).toBe(1);
      await expectEndpoint();
      await advanceAnimationTimer(1200);
      expect(state.value.starts).toBe(1);
      expect(state.value.success).toBe(1);
      expect(state.value.failure).toBe(0);
    } finally {
      await stop();
    }
  });

  test('keeps completed child props while its target ancestor moves', async () => {
    const state = counters();
    const offset = makeMutable(0);
    const transition = countedTransition(600, state);
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} nested {...{ transition, offset }} />);
    await waitForFrames();
    const stop = await recordStarts(state);
    try {
      await render(<Screens active nested {...{ transition, offset }} />);
      await waitForFrames(3);
      await advanceAnimationTimer(600);
      await expectEventually(() => state.value.success).toBe(1);
      await expectChildEnd();
      const baseline = await translation();
      for (const value of [100, 200]) {
        offset.value = value;
        await waitForFrames(3);
        await expectTranslation(baseline + value);
        await expectChildEnd();
        await waitForFrames(3);
        await expectTranslation(baseline + value);
        await expectChildEnd();
        expect((await props('targetOuter'))?.opacity).toBe(0);
      }
      expect(state.value.starts).toBe(2);
      expect(state.value.success).toBe(1);
      expect(state.value.failure).toBe(0);
      await advanceAnimationTimer(1800);
      await expectEndpoint();
      expect(state.value.success).toBe(1);
      expect(state.value.starts).toBe(2);
    } finally {
      await stop();
    }
  });

  test('lands when its completion callback moves the target ancestor', async () => {
    const state = counters();
    const offset = makeMutable(0);
    const completed = completionCounter(state);
    const transition = SharedTransition.duration(600)
      .easing(Easing.linear)
      .withCallback((finished) => {
        'worklet';
        completed(finished);
        if (finished) offset.value = 200;
      });
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} {...{ transition, offset }} />);
    await waitForFrames();
    const stop = await recordStarts(state);
    try {
      await render(<Screens active {...{ transition, offset }} />);
      await waitForFrames(3);
      await advanceAnimationTimer(600);
      await expectEventually(() => state.value.success).toBe(1);
      await expectEndpoint();
      if (RuntimeTestObserver) {
        await expectEventually(
          async () =>
            (await getTestComponent('targetMotion').getTransformObservation())
              ?.translateX
        ).toBe(200, ComparisonMode.PIXEL);
      }
      expect((await props('source'))?.opacity).toBe(0);
      await advanceAnimationTimer(600);
      expect(state.value.starts).toBe(1);
      expect(state.value.failure).toBe(0);
      expect(state.value.success).toBe(1);
    } finally {
      await stop();
    }
  });

  test('replaces built-in, custom, and progress clocks on one mounted pair', async () => {
    const state = counters();
    const offset = makeMutable(0);
    const builtin = countedTransition(1200, state);
    const custom = SharedTransition.custom((values) => {
      'worklet';
      return {
        width: withTiming(values.targetWidth, {
          duration: 5000,
          easing: Easing.linear,
        }),
        borderRadius: withTiming(20, { duration: 5000 }),
      };
    }).withCallback(completionCounter(state));
    const progress = countedTransition(1200, state).defaultTransitionType(
      SharedTransitionType.PROGRESS_ANIMATION
    );
    const final = countedTransition(600, state);
    await mockAnimationTimer({ autoAdvance: false });
    await render(
      <Screens active={false} transition={builtin} offset={offset} />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const stop = await recordStarts(state);
    try {
      await render(<Screens active transition={builtin} offset={offset} />);
      await waitForFrames(3);
      const targetTag = getTestComponent('target').getTag();
      await advanceAnimationTimer(300);
      expect((await props('source'))?.width).toBe(45, ComparisonMode.PIXEL);
      for (const [index, transition, targetWidth, fraction] of [
        [1, custom, 120, 300 / 5000],
        [2, progress, 150, 300 / 1200],
      ] as const) {
        const width = (await props('source'))?.width ?? NaN;
        await render(
          <Screens active {...{ transition, offset, targetWidth }} />
        );
        await waitForFrames(3);
        expect(state.value.starts).toBe(index + 1);
        expect(state.value.failure).toBe(index);
        expect(state.value.success).toBe(0);
        await advanceAnimationTimer(300);
        const expectedWidth = width + (targetWidth - width) * fraction;
        expect((await props('source'))?.width).toBeWithinRange(
          expectedWidth - 1,
          expectedWidth + 1
        );
      }
      await render(
        <Screens active transition={final} offset={offset} targetWidth={180} />
      );
      await waitForFrames(3);
      expect(state.value.starts).toBe(4);
      expect(state.value.failure).toBe(3);
      expect(state.value.success).toBe(0);
      await advanceAnimationTimer(600);
      await expectEventually(() => state.value.success).toBe(1);
      await expectEndpoint(180);
      await expectEventually(async () => (await props('source'))?.opacity).toBe(
        0
      );
      expect(getTestComponent('source').getTag()).toBe(sourceTag);
      expect(getTestComponent('target').getTag()).toBe(targetTag);
      await advanceAnimationTimer(5000);
      expect(state.value.starts).toBe(4);
      expect(state.value.failure).toBe(3);
      expect(state.value.success).toBe(1);
    } finally {
      await stop();
    }
  });
});

function Screens({
  active,
  transition,
  offset,
  nested = false,
  targetWidth = 90,
}: {
  active: boolean;
  transition: SharedTransition;
  offset: SharedValue<number>;
  nested?: boolean;
  targetWidth?: number;
}) {
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <Side name="source" {...{ transition, offset, nested, targetWidth }} />
      </SharedTransitionBoundary>
      {active && (
        <SharedTransitionBoundary isActive>
          <Side
            name="target"
            {...{ transition, offset, nested, targetWidth }}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

const outerTransition = SharedTransition.duration(2400).easing(Easing.linear);

function Side({
  name,
  transition,
  offset,
  nested,
  targetWidth = 90,
}: {
  name: 'source' | 'target';
  transition: SharedTransition;
  offset: SharedValue<number>;
  nested: boolean;
  targetWidth?: number;
}) {
  const outer = useTestRef(`${name}Outer`);
  const child = useTestRef(name);
  const motionRef = useTestRef(`${name}Motion`);
  const target = name === 'target';
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: target ? offset.value : 0 }],
  }));
  return (
    <Animated.View
      ref={outer}
      sharedTransitionTag={nested ? 'moving-outer' : undefined}
      sharedTransitionStyle={nested ? outerTransition : undefined}
      style={[styles.outer, nested && target && { width: 260 }]}>
      <Animated.View ref={motionRef} style={motion}>
        <Animated.View
          ref={child}
          sharedTransitionTag="moving-child"
          sharedTransitionStyle={transition}
          style={
            target ? [styles.target, { width: targetWidth }] : styles.source
          }
        />
      </Animated.View>
    </Animated.View>
  );
}

function counters() {
  return makeMutable({
    starts: 0,
    success: 0,
    failure: 0,
  });
}

function countedTransition(
  duration: number,
  state: ReturnType<typeof counters>
) {
  return SharedTransition.duration(duration)
    .easing(Easing.linear)
    .withCallback(completionCounter(state));
}

function completionCounter(state: ReturnType<typeof counters>) {
  return (finished: boolean) => {
    'worklet';
    state.modify((value) => ({
      ...value,
      success: value.success + Number(finished),
      failure: value.failure + Number(!finished),
    }));
  };
}

async function recordStarts(state: ReturnType<typeof counters>) {
  await runOnUIBlocking(() => {
    'worklet';
    const original = global.LayoutAnimationsManager;
    global.originalLayoutAnimationsManager = original;
    global.LayoutAnimationsManager = {
      start: (tag, type, values, config) => {
        if (Number(type) === 4)
          state.modify((value) => ({ ...value, starts: value.starts + 1 }));
        original.start(tag, type, values, config);
      },
      stop: original.stop,
    };
  });
  return () =>
    runOnUIBlocking(() => {
      'worklet';
      global.LayoutAnimationsManager = global.originalLayoutAnimationsManager;
    });
}

function props(name: string) {
  return getTestComponent(name).getMountedViewProps();
}

async function translation() {
  return (
    (
      await RuntimeTestObserver?.observeTransform(
        getTestComponent('source').getTag()
      )
    )?.translateX ?? 0
  );
}

async function expectTranslation(value: number) {
  if (RuntimeTestObserver) {
    expect(
      (
        await RuntimeTestObserver.observeTransform(
          getTestComponent('source').getTag()
        )
      )?.translateX
    ).toBe(value, ComparisonMode.PIXEL);
  }
}

async function expectChildEnd() {
  const child = await props('source');
  expect(child?.width).toBe(90, ComparisonMode.PIXEL);
  expect(child?.backgroundColor).toBe('#0000ff', ComparisonMode.COLOR);
  expect(child?.opacity).toBeWithinRange(0.599, 0.601);
}

async function expectEndpoint(targetWidth = 90) {
  await expectEventually(async () => {
    const opacity = (await props('target'))?.opacity;
    return opacity !== undefined && Math.abs(opacity - 0.6) < 0.001;
  }).toBe(true);
  expect((await props('target'))?.width).toBe(
    targetWidth,
    ComparisonMode.PIXEL
  );
}

const styles = StyleSheet.create({
  root: { width: 380, height: 600 },
  outer: { position: 'absolute', width: 200, height: 200 },
  source: { width: 30, height: 30, backgroundColor: '#ff0000', opacity: 0.8 },
  target: { width: 90, height: 90, backgroundColor: '#0000ff', opacity: 0.6 },
});
