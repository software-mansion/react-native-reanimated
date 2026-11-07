import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type {
  SharedTransitionAnimationsValues,
  StyleProps,
} from 'react-native-reanimated';
import Animated, {
  cancelAnimation,
  FadeOut,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  mockAnimationTimer,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode, type MountedViewProps } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

function transitionWithNotification(duration: number, name: string) {
  return SharedTransition.duration(duration).withCallback((finished) => {
    'worklet';
    if (finished) {
      notify(name);
    }
  });
}

type Transitions = { outer: SharedTransition; inner: SharedTransition };

const innerEndsFirst: Transitions = {
  outer: transitionWithNotification(3000, 'outer-finished'),
  inner: transitionWithNotification(600, 'inner-finished'),
};

const outerEndsFirst: Transitions = {
  outer: transitionWithNotification(300, 'outer-finished'),
  inner: transitionWithNotification(1200, 'inner-finished'),
};

const retargetOuterDuration = 3000;
const retargetInnerDuration = 600;
const retargetTransitions: Transitions = {
  outer: transitionWithNotification(retargetOuterDuration, 'outer-finished'),
  inner: transitionWithNotification(retargetInnerDuration, 'inner-finished'),
};

const targetExiting = FadeOut.duration(1000);

function Target({
  active,
  innerSize,
  innerColor,
  innerLabel,
  repeatInner,
  exiting,
  transitions,
  wrapperTranslateX,
}: {
  active: boolean;
  innerSize: number;
  innerColor: string;
  innerLabel?: string;
  repeatInner: boolean;
  exiting: boolean;
  transitions: Transitions;
  wrapperTranslateX: number;
}) {
  const outer = useTestRef('targetOuter');
  const inner = useTestRef('targetInner');
  const repeat = useSharedValue(0);
  useEffect(() => {
    if (!repeatInner) {
      return;
    }
    repeat.value = withRepeat(withTiming(1, { duration: 300 }), -1, true);
    return () => cancelAnimation(repeat);
  }, [repeat, repeatInner]);
  const innerStyle = useAnimatedStyle(() =>
    repeatInner ? { opacity: 0.6 + repeat.value * 0.4 } : {}
  );
  const innerView = (
    <Animated.View
      ref={inner}
      sharedTransitionTag="inner"
      sharedTransitionStyle={transitions.inner}
      exiting={exiting ? targetExiting : undefined}
      accessibilityLabel={innerLabel}
      style={[
        styles.targetInner,
        {
          width: innerSize,
          height: innerSize,
          backgroundColor: innerColor,
        },
        innerStyle,
      ]}
    />
  );
  return (
    <SharedTransitionBoundary isActive={active}>
      <Animated.View
        ref={outer}
        sharedTransitionTag="outer"
        sharedTransitionStyle={transitions.outer}
        exiting={exiting ? targetExiting : undefined}
        style={styles.targetOuter}>
        {wrapperTranslateX ? (
          <View style={{ transform: [{ translateX: wrapperTranslateX }] }}>
            {innerView}
          </View>
        ) : (
          innerView
        )}
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

function Screens({
  active,
  keepTarget = false,
  innerSize = 60,
  innerColor = '#ffffff',
  innerLabel,
  repeatInner = false,
  exitingTarget = false,
  transitions = innerEndsFirst,
  removeSource = false,
  innerWrapped = false,
  wrapperTranslateX = 0,
}: {
  active: boolean;
  keepTarget?: boolean;
  innerSize?: number;
  innerColor?: string;
  innerLabel?: string;
  repeatInner?: boolean;
  exitingTarget?: boolean;
  transitions?: Transitions;
  removeSource?: boolean;
  innerWrapped?: boolean;
  wrapperTranslateX?: number;
}) {
  const inner = useTestRef('sourceInner');
  const outer = useTestRef('sourceOuter');
  const innerWrapper = useTestRef('innerWrapper');
  return (
    <View style={styles.container}>
      {!(active && removeSource) && (
        <SharedTransitionBoundary isActive={!active}>
          <Animated.View
            ref={outer}
            sharedTransitionTag="outer"
            sharedTransitionStyle={transitions.outer}
            style={styles.sourceOuter}>
            {/* A collapsable wrapper is flattened, so the inner view changes its native parent. */}
            <View
              ref={innerWrapper}
              collapsable={!innerWrapped && !wrapperTranslateX}
              style={[
                innerWrapped && styles.innerWrapper,
                !!wrapperTranslateX && {
                  transform: [{ translateX: wrapperTranslateX }],
                },
              ]}>
              <Animated.View
                ref={inner}
                sharedTransitionTag="inner"
                sharedTransitionStyle={transitions.inner}
                style={styles.sourceInner}
              />
            </View>
          </Animated.View>
        </SharedTransitionBoundary>
      )}
      {(active || keepTarget) && (
        <Target
          active={active}
          innerSize={innerSize}
          innerColor={innerColor}
          innerLabel={innerLabel}
          repeatInner={repeatInner}
          exiting={exitingTarget}
          transitions={transitions}
          wrapperTranslateX={wrapperTranslateX}
        />
      )}
    </View>
  );
}

const continuousTransition = transitionWithNotification(
  600,
  'continuous-finished'
);

function ContinuousTarget({ ancestor }: { ancestor: boolean }) {
  const value = useSharedValue(0);
  const inner = useTestRef('continuousTarget');
  useEffect(() => {
    value.value = withRepeat(withTiming(1, { duration: 300 }), -1, true);
    return () => cancelAnimation(value);
  }, [value]);
  const targetStyle = useAnimatedStyle(() => ({
    opacity: ancestor ? 1 : 0.6 + value.value * 0.4,
  }));
  const parentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ancestor ? value.value * 20 : 0 }],
  }));
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View style={parentStyle}>
        <Animated.View
          ref={inner}
          sharedTransitionTag="continuous"
          sharedTransitionStyle={continuousTransition}
          style={[styles.targetInner, { width: 90, height: 90 }, targetStyle]}
        />
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

function ContinuousScreens({
  active,
  ancestor,
}: {
  active: boolean;
  ancestor: boolean;
}) {
  const source = useTestRef('continuousSource');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="continuous"
          sharedTransitionStyle={continuousTransition}
          style={styles.sourceInner}
        />
      </SharedTransitionBoundary>
      {active && <ContinuousTarget ancestor={ancestor} />}
    </View>
  );
}

async function sampleInnerViewWhileOuterTargetIsHidden() {
  let outerFinished = false;
  const markOuterFinished = () => {
    outerFinished = true;
  };
  const outerNotification = waitForNotification('outer-finished');
  outerNotification.then(markOuterFinished, markOuterFinished);
  const samples = { shown: 0, hidden: 0 };
  while (!outerFinished) {
    const [sourceInner, targetOuter] = await opacitiesOf(
      'sourceInner',
      'targetOuter'
    );
    if (targetOuter === 0) {
      samples[sourceInner === 1 ? 'shown' : 'hidden']++;
    }
    await waitForFrames(1);
  }
  await outerNotification;
  return samples;
}

async function sampleInnerViewUntilItLands() {
  let innerFinished = false;
  const markInnerFinished = () => {
    innerFinished = true;
  };
  const innerNotification = waitForNotification('inner-finished');
  innerNotification.then(markInnerFinished, markInnerFinished);
  const samples = { shown: 0, hidden: 0 };
  while (!innerFinished) {
    const [sourceInner, targetInner] = await opacitiesOf(
      'sourceInner',
      'targetInner'
    );
    if (targetInner === 0) {
      samples[sourceInner === 1 ? 'shown' : 'hidden']++;
    }
    await waitForFrames(1);
  }
  await innerNotification;
  return samples;
}

// Records a presented prop of the waiting inner view on each UI frame while the outer target is hidden.
function recordInnerViewProp<K extends 'width' | 'height' | 'backgroundColor'>(
  prop: K
) {
  const innerTag = getTestComponent('sourceInner').getTag();
  const outerTag = getTestComponent('targetOuter').getTag();
  const values = makeMutable<MountedViewProps[K][]>([]);
  const recording = makeMutable(true);
  scheduleOnUI(() => {
    'worklet';
    const record = () => {
      if (
        !recording.value ||
        global._obtainMountedViewProps(outerTag, false)?.opacity !== 0
      ) {
        return;
      }
      const value = global._obtainMountedViewProps(innerTag, true)?.[prop];
      if (value !== undefined) {
        values.modify((list) => {
          'worklet';
          list.push(value);
          return list;
        });
      }
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  return () => {
    recording.value = false;
    return values.value;
  };
}

async function expectInnerViewPhase(phase: 'active' | 'completed') {
  let phaseSample: Awaited<ReturnType<typeof readInnerViewState>> | undefined;
  await expectEventually(async () => {
    const sample = await readInnerViewState();
    const inner = sample.inner;
    const matches =
      !!inner &&
      inner.opacity === 1 &&
      sample.outerOpacity === 0 &&
      (phase === 'active'
        ? inner.width > 30.5 && inner.width < 59
        : Math.abs(inner.width - 60) < 0.5 &&
          Math.abs(inner.height - 60) < 0.5);
    if (matches) {
      phaseSample = sample;
    }
    return matches;
  }).toBe(true);
  return phaseSample;
}

async function expectInnerViewToReach<
  K extends 'width' | 'height' | 'backgroundColor',
>(prop: K, isEnd: (value: MountedViewProps[K]) => boolean) {
  let endSample: Awaited<ReturnType<typeof readInnerViewState>> | undefined;
  await expectEventually(async () => {
    const sample = await readInnerViewState();
    const { inner, outerOpacity } = sample;
    const matches = !!inner && isEnd(inner[prop]) && outerOpacity === 0;
    if (matches) {
      endSample = sample;
    }
    return matches;
  }).toBe(true);
  return endSample;
}

function readInnerViewState() {
  const innerTag = getTestComponent('sourceInner').getTag();
  const outerTag = getTestComponent('targetOuter').getTag();
  return runOnUIBlocking(() => {
    'worklet';
    return {
      timestamp: performance.now(),
      inner: global._obtainMountedViewProps(innerTag, true),
      outerOpacity: global._obtainMountedViewProps(outerTag, false)?.opacity,
    };
  });
}

function opacitiesOf(...names: string[]) {
  const tags = names.map((name) => getTestComponent(name).getTag());
  return runOnUIBlocking(() => {
    'worklet';
    return tags.map(
      (tag) => global._obtainMountedViewProps(tag, false)?.opacity
    );
  });
}

async function expectAllShownAtTargets() {
  await expectEventually(async () => {
    return (
      (await opacityOf('targetOuter')) === 1 &&
      (await opacityOf('targetInner')) === 1 &&
      (await opacityOf('sourceInner')) === 0
    );
  }).toBe(true);
}

async function opacityOf(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.opacity;
}

describe('Nested shared transitions', () => {
  for (const ancestor of [false, true]) {
    test(`finishes while the ${ancestor ? 'ancestor transform' : 'target opacity'} repeats`, async () => {
      await render(<ContinuousScreens active={false} ancestor={ancestor} />);
      await waitForFrames();
      await render(<ContinuousScreens active ancestor={ancestor} />);
      await waitForNotification('continuous-finished', 2500);
      await expectEventually(() => opacityOf('continuousSource')).toBe(0);
      const target =
        await getTestComponent('continuousTarget').getPresentedViewProps();
      expect(!!target && target.width > 89.5 && target.height > 89.5).toBe(
        true
      );
      expect(((await opacityOf('continuousTarget')) ?? 0) > 0).toBe(true);
    });
  }

  for (const exitingTarget of [false, true]) {
    test(`returns a waiting carrier when the ${exitingTarget ? 'exiting ' : ''}target boundary is removed`, async () => {
      await render(<Screens active={false} exitingTarget={exitingTarget} />);
      await waitForFrames();
      await render(<Screens active exitingTarget={exitingTarget} />);
      await waitForNotification('inner-finished');
      expect(await opacityOf('targetOuter')).toBe(0);
      await render(<Screens active={false} exitingTarget={exitingTarget} />);
      await expectEventually(() => opacityOf('sourceInner')).toBe(1);
      await expectEventually(async () => {
        const props =
          await getTestComponent('sourceInner').getPresentedViewProps();
        return (
          !!props &&
          Math.abs(props.width - 30) < 0.5 &&
          Math.abs(props.height - 30) < 0.5
        );
      }).toBe(true);
    });
  }

  test('retargets the layout of an active carrier', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(
      <Screens keepTarget active={false} transitions={retargetTransitions} />
    );
    await waitForFrames();
    await render(
      <Screens keepTarget active transitions={retargetTransitions} />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await expectInnerViewPhase('active');
    const stopRecording = recordInnerViewProp('width');
    await render(
      <Screens
        keepTarget
        active
        innerSize={90}
        transitions={retargetTransitions}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    const endSample = await expectInnerViewToReach(
      'width',
      (width) => Math.abs(width - 90) < 0.5
    );
    expect(
      !!endSample?.inner && Math.abs(endSample.inner.height - 90) < 0.5
    ).toBe(true);
    expect(endSample?.inner?.opacity).toBe(1);
    const widths = stopRecording();
    expect(widths.some((width) => width > 61 && width < 89)).toBe(true);
    await advanceAnimationTimer(retargetOuterDuration);
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('keeps a completed retained carrier at its current target while it waits to land', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} removeSource />);
    await waitForFrames();
    const innerTag = getTestComponent('sourceInner').getTag();
    await render(<Screens active removeSource />);
    await waitForFrames(3);
    await advanceAnimationTimer(600);
    await waitForNotification('inner-finished');
    await waitForFrames(2);
    await render(<Screens active removeSource innerSize={90} />);
    await expectEventually(
      async () =>
        (await getTestComponent('targetInner').getMountedViewProps())?.width
    ).toBe(90, ComparisonMode.PIXEL);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    await expectEventually(() =>
      runOnUIBlocking(() => {
        'worklet';
        const inner = global._obtainMountedViewProps(innerTag, false);
        return (
          !!inner && Math.abs(inner.width - 90) < 0.5 && inner.opacity === 1
        );
      })
    ).toBe(true);
    await advanceAnimationTimer(300);
    await expectEventually(() =>
      runOnUIBlocking(() => {
        'worklet';
        const width = global._obtainMountedViewProps(innerTag, false)?.width;
        return width !== undefined && Math.abs(width - 90) < 0.5;
      })
    ).toBe(true);
    expect(await opacityOf('targetOuter')).toBe(0);
    await advanceAnimationTimer(1800);
    await waitForNotification('outer-finished');
    await expectEventually(() => isViewMountedNatively(innerTag)).toBe(false);
    await expectEventually(() => opacityOf('targetInner')).toBe(1);
  });

  for (const [order, transitions, firstEnd, secondEnd] of [
    ['inner first', innerEndsFirst, 600, 3000],
    ['outer first', outerEndsFirst, 300, 1200],
  ] as const) {
    test(`keeps deleted nested carriers until both finish when the ${order.replace(' first', '')} one ends first`, async () => {
      await mockAnimationTimer({ autoAdvance: false });
      await render(
        <Screens active={false} transitions={transitions} removeSource />
      );
      await waitForFrames();
      const innerTag = getTestComponent('sourceInner').getTag();
      const outerTag = getTestComponent('sourceOuter').getTag();
      await render(<Screens active transitions={transitions} removeSource />);
      await waitForFrames(3);
      await advanceAnimationTimer(firstEnd);
      await waitForNotification(
        order === 'inner first' ? 'inner-finished' : 'outer-finished'
      );
      await waitForFrames(2);
      expect(await isViewMountedNatively(innerTag)).toBe(true);
      expect(
        await runOnUIBlocking(() => {
          'worklet';
          return global._obtainMountedViewProps(innerTag, false)?.opacity;
        })
      ).toBe(1);
      expect(await isViewMountedNatively(outerTag)).toBe(true);
      await advanceAnimationTimer(secondEnd - firstEnd);
      await waitForNotification(
        order === 'inner first' ? 'outer-finished' : 'inner-finished'
      );
      await expectEventually(() => isViewMountedNatively(innerTag)).toBe(false);
      await expectEventually(() => isViewMountedNatively(outerTag)).toBe(false);
      await expectEventually(() => opacityOf('targetInner')).toBe(1);
      await expectEventually(() => opacityOf('targetOuter')).toBe(1);
    });
  }

  test.each([true, false])(
    'moves a waiting inner view with React (wrapped first: %p)',
    async (wrapped) => {
      await mockAnimationTimer({ autoAdvance: false });
      await render(<Screens active={false} innerWrapped={wrapped} />);
      await waitForFrames();
      const innerTag = getTestComponent('sourceInner').getTag();
      const outerTag = getTestComponent('sourceOuter').getTag();
      const wrapperTag = getTestComponent('innerWrapper').getTag();
      const nativeParentOfInner = () =>
        RuntimeTestObserver?.observeParent(innerTag);
      const homeParent = (isWrapped: boolean) =>
        isWrapped ? wrapperTag : outerTag;
      expect(await nativeParentOfInner()).toBe(homeParent(wrapped));
      await render(<Screens active innerWrapped={wrapped} />);
      await waitForFrames(3);
      await advanceAnimationTimer(600);
      await waitForNotification('inner-finished');
      await waitForFrames(2);

      await render(<Screens active innerWrapped={!wrapped} />);
      await expectEventually(() => isViewMountedNatively(wrapperTag)).toBe(
        !wrapped
      );
      expect(await nativeParentOfInner()).toBe(homeParent(!wrapped));
      expect(getTestComponent('sourceInner').getTag()).toBe(innerTag);
      const inner = await runOnUIBlocking(() => {
        'worklet';
        return global._obtainMountedViewProps(innerTag, false);
      });
      expect(inner?.opacity).toBe(1);
      expect(!!inner && Math.abs(inner.width - 60) < 0.5).toBe(true);
      expect(await opacityOf('targetOuter')).toBe(0);

      await advanceAnimationTimer(2400);
      await waitForNotification('outer-finished');
      await expectAllShownAtTargets();
      expect(await nativeParentOfInner()).toBe(homeParent(!wrapped));
    }
  );

  if (__DEV__) {
    const observerTest = RuntimeTestObserver ? test : test.skip;
    observerTest(
      'lands a failed child after native reparent from its wrapper to the outer carrier',
      async () => {
        type GeometryHelper = (
          values: SharedTransitionAnimationsValues,
          progress: number
        ) => StyleProps;
        type GeometryTestGlobal = typeof global & {
          _getSharedTransitionGeometry: GeometryHelper;
          geometryBeforeReparentTest?: GeometryHelper;
        };
        const armed = makeMutable(false);
        const errors = makeMutable(0);
        const innerCalls = makeMutable(0);
        const failures = makeMutable(0);
        const successes = makeMutable(0);
        const sourceWidth = styles.sourceInner.width;
        const transitions: Transitions = {
          outer: innerEndsFirst.outer,
          inner: SharedTransition.duration(600).withCallback((finished) => {
            'worklet';
            if (finished) successes.value++;
            else failures.value++;
          }),
        };
        await mockAnimationTimer({ autoAdvance: false });
        await render(
          <Screens active={false} innerWrapped transitions={transitions} />
        );
        await waitForFrames();
        const innerTag = getTestComponent('sourceInner').getTag();
        const outerTag = getTestComponent('sourceOuter').getTag();
        const wrapperTag = getTestComponent('innerWrapper').getTag();
        const parentOfInner = () =>
          RuntimeTestObserver!.observeParent(innerTag);
        expect(await parentOfInner()).toBe(wrapperTag);
        await runOnUIBlocking(() => {
          'worklet';
          const testGlobal = global as GeometryTestGlobal;
          const original = testGlobal._getSharedTransitionGeometry;
          testGlobal.geometryBeforeReparentTest = original;
          testGlobal._getSharedTransitionGeometry = (values, progress) => {
            if (Math.abs(values.currentWidth - sourceWidth) < 0.5) {
              innerCalls.value++;
              if (armed.value && progress > 0 && progress < 1) {
                errors.value++;
                throw new Error('SET inner geometry throws on purpose');
              }
            }
            return original(values, progress);
          };
        });
        try {
          await render(
            <Screens active innerWrapped transitions={transitions} />
          );
          await waitForFrames(3);
          expect(await parentOfInner()).toBe(wrapperTag);
          await runOnUIBlocking(() => {
            'worklet';
            armed.value = true;
          });
          await advanceAnimationTimer(300);
          await expectEventually(() => errors.value).toBe(1);
          await expectEventually(() => failures.value).toBe(1);
          await waitForFrames(3);
          const callsAfterFailure = innerCalls.value;
          expect(successes.value).toBe(0);
          expect(await opacityOf('targetOuter')).toBe(0);

          await render(
            <Screens active innerWrapped={false} transitions={transitions} />
          );
          await expectEventually(() => isViewMountedNatively(wrapperTag)).toBe(
            false
          );
          await expectEventually(parentOfInner).toBe(outerTag);
          expect(getTestComponent('sourceInner').getTag()).toBe(innerTag);
          await waitForFrames(3);
          expect(innerCalls.value).toBe(callsAfterFailure);
          expect(errors.value).toBe(1);
          expect(failures.value).toBe(1);
          await advanceAnimationTimer(2700);
          await waitForNotification('outer-finished');
          await expectAllShownAtTargets();
          expect(await parentOfInner()).toBe(outerTag);
          expect(
            (await getTestComponent('sourceInner').getMountedViewProps())?.width
          ).toBe(30, ComparisonMode.PIXEL);
          await advanceAnimationTimer(3000);
          expect(innerCalls.value).toBe(callsAfterFailure);
          expect(errors.value).toBe(1);
          expect(failures.value).toBe(1);
          expect(successes.value).toBe(0);
        } finally {
          await runOnUIBlocking(() => {
            'worklet';
            const testGlobal = global as GeometryTestGlobal;
            if (testGlobal.geometryBeforeReparentTest) {
              testGlobal._getSharedTransitionGeometry =
                testGlobal.geometryBeforeReparentTest;
              delete testGlobal.geometryBeforeReparentTest;
            }
          });
        }
      }
    );
  }

  test('keeps the inner view in its parent during the flight', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} />);
    await waitForFrames();
    const innerTag = getTestComponent('sourceInner').getTag();
    const homeParent = await RuntimeTestObserver?.observeParent(innerTag);
    await RuntimeTestObserver?.startUnmountRecording();
    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    await waitForFrames(2);
    expect(await RuntimeTestObserver?.observeParent(innerTag)).toBe(homeParent);
    if (Platform.OS === 'ios') {
      const unmounts = await RuntimeTestObserver?.takeUnmountRecording();
      expect(!!unmounts).toBe(true);
      expect(!!unmounts?.some(({ childTag }) => childTag === innerTag)).toBe(
        false
      );
    }
    await advanceAnimationTimer(2700);
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('applies the transform of a wrapper around the inner view once', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} wrapperTranslateX={30} />);
    await waitForFrames();
    const innerTag = getTestComponent('sourceInner').getTag();
    await render(<Screens active wrapperTranslateX={30} />);
    await waitForFrames(3);
    await advanceAnimationTimer(600);
    await waitForNotification('inner-finished');
    await waitForFrames(2);
    const transform = await RuntimeTestObserver?.observeTransform(innerTag);
    expect(!!transform && Math.abs(transform.translateX) < 0.5).toBe(true);
    await advanceAnimationTimer(2400);
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('keeps the inner view on screen until the outer transition ends', async () => {
    await render(<Screens active={false} />);
    await waitForFrames();

    await render(<Screens active />);
    await waitForNotification('inner-finished');
    const samples = await sampleInnerViewWhileOuterTargetIsHidden();
    expect(samples.hidden).toBe(0);
    expect(samples.shown > 0).toBe(true);

    await expectAllShownAtTargets();
  });

  test('keeps the completed inner view at its current target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} transitions={retargetTransitions} />);
    await waitForFrames();

    await render(<Screens active transitions={retargetTransitions} />);
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration);
    await waitForNotification('inner-finished');
    await expectInnerViewPhase('completed');
    await render(
      <Screens active innerSize={90} transitions={retargetTransitions} />
    );
    await waitForFrames(3);
    await expectInnerViewToReach(
      'width',
      (width) => Math.abs(width - 90) < 0.5
    );
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    const endSample = await expectInnerViewToReach(
      'width',
      (width) => Math.abs(width - 90) < 0.5
    );
    expect(
      !!endSample?.inner && Math.abs(endSample.inner.height - 90) < 0.5
    ).toBe(true);
    expect(endSample?.inner?.opacity).toBe(1);
    await advanceAnimationTimer(retargetOuterDuration);
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('animates the waiting inner view to a color that changed during its own flight', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} transitions={retargetTransitions} />);
    await waitForFrames();
    await render(<Screens active transitions={retargetTransitions} />);
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await render(
      <Screens active innerColor="#00ff00" transitions={retargetTransitions} />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await waitForNotification('inner-finished');
    await expectInnerViewPhase('completed');
    const oldColor = (
      await getTestComponent('sourceInner').getPresentedViewProps()
    )?.backgroundColor;
    expect(oldColor).toBe('#ffffffff');

    await render(
      <Screens
        active
        innerColor="#00ff00"
        innerLabel="changed"
        transitions={retargetTransitions}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration);
    await expectInnerViewToReach(
      'backgroundColor',
      (color) => color === '#00ff00ff'
    );
    await advanceAnimationTimer(retargetOuterDuration);
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('lands a waiting inner view whose target opacity repeats', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} transitions={retargetTransitions} />);
    await waitForFrames();
    await render(
      <Screens active repeatInner transitions={retargetTransitions} />
    );
    await waitForFrames(3);
    for (let time = 0; time < retargetOuterDuration; time += 100) {
      await advanceAnimationTimer(100);
    }
    await waitForNotification('outer-finished');
    for (let time = 0; time < 2 * retargetInnerDuration; time += 100) {
      await advanceAnimationTimer(100);
    }
    await expectEventually(async () => {
      const targetInner = await opacityOf('targetInner');
      return (
        (await opacityOf('targetOuter')) === 1 &&
        (await opacityOf('sourceInner')) === 0 &&
        targetInner !== undefined &&
        targetInner >= 0.6
      );
    }).toBe(true);
  });

  test('animates the waiting inner view to a new color of its target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} transitions={retargetTransitions} />);
    await waitForFrames();

    await render(<Screens active transitions={retargetTransitions} />);
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration);
    await waitForNotification('inner-finished');
    await expectInnerViewPhase('completed');
    const oldColor = (
      await getTestComponent('sourceInner').getPresentedViewProps()
    )?.backgroundColor;
    const stopRecording = recordInnerViewProp('backgroundColor');
    await render(
      <Screens active innerColor="#00ff00" transitions={retargetTransitions} />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await expectEventually(async () => {
      return (await getTestComponent('targetInner').getMountedViewProps())
        ?.backgroundColor;
    }).toBe('#00ff00ff');
    const newColor = (
      await getTestComponent('targetInner').getMountedViewProps()
    )?.backgroundColor;
    expect(newColor !== oldColor).toBe(true);
    const colors = stopRecording();
    expect(
      colors.some((color) => color !== oldColor && color !== newColor)
    ).toBe(true);
    await advanceAnimationTimer(retargetInnerDuration / 2);
    await expectInnerViewToReach(
      'backgroundColor',
      (color) => color === newColor
    );
    await advanceAnimationTimer(
      retargetOuterDuration - 2 * retargetInnerDuration
    );
    await waitForNotification('outer-finished');
    await expectAllShownAtTargets();
  });

  test('keeps the inner view on screen when the outer transition ends first', async () => {
    await render(<Screens active={false} transitions={outerEndsFirst} />);
    await waitForFrames();

    await render(<Screens active transitions={outerEndsFirst} />);
    await waitForNotification('outer-finished');
    const samples = await sampleInnerViewUntilItLands();
    expect(samples.hidden).toBe(0);
    expect(samples.shown > 0).toBe(true);

    await expectAllShownAtTargets();
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  sourceOuter: { width: 80, height: 80, backgroundColor: '#dd5522' },
  sourceInner: { width: 30, height: 30, backgroundColor: '#ffffff' },
  innerWrapper: { backgroundColor: '#882211' },
  targetOuter: {
    marginTop: 100,
    marginLeft: 60,
    width: 200,
    height: 200,
    backgroundColor: '#2277dd',
  },
  targetInner: { marginTop: 40, marginLeft: 40, backgroundColor: '#ffffff' },
});
