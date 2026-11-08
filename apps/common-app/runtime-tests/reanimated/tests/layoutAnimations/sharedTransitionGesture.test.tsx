import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  ReducedMotionConfig,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { Screen } from 'react-native-screens';
import { scheduleOnRN } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const transition = SharedTransition.duration(30000);

function Screens({
  transitionStyle = transition,
  systemMotion,
  sourceMounted = true,
  sourceScreenMounted = true,
}: {
  transitionStyle?: SharedTransition;
  systemMotion?: ReduceMotion;
  sourceMounted?: boolean;
  sourceScreenMounted?: boolean;
}) {
  const sourceScreen = useTestRef('gestureSourceScreen');
  const targetScreen = useTestRef('gestureTargetScreen');
  const source = useTestRef('gestureSource');
  const child = useTestRef('gestureChild');
  const target = useTestRef('gestureTarget');
  return (
    <View style={styles.container}>
      {systemMotion !== undefined && (
        <ReducedMotionConfig mode={systemMotion} />
      )}
      <Screen
        ref={targetScreen}
        onAppear={() => notify('gesture-target-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <SharedTransitionBoundary isActive={!sourceScreenMounted}>
          <Animated.View
            ref={target}
            sharedTransitionTag="gesture-retained-source"
            sharedTransitionStyle={transitionStyle}
            style={styles.target}
          />
        </SharedTransitionBoundary>
      </Screen>
      {sourceScreenMounted && (
        <Screen
          ref={sourceScreen}
          onAppear={() => notify('gesture-source-appeared')}
          enabled
          activityState={2}
          style={styles.screen}>
          <SharedTransitionBoundary isActive>
            {sourceMounted && (
              <Animated.View
                ref={source}
                sharedTransitionTag="gesture-retained-source"
                sharedTransitionStyle={transitionStyle}
                style={styles.source}>
                <View ref={child} collapsable={false} style={styles.child} />
              </Animated.View>
            )}
          </SharedTransitionBoundary>
        </Screen>
      )}
    </View>
  );
}

function NestedScreens({ innerMounted = true }: { innerMounted?: boolean }) {
  const sourceScreen = useTestRef('nestedGestureSourceScreen');
  const targetScreen = useTestRef('nestedGestureTargetScreen');
  const outer = useTestRef('nestedGestureOuter');
  const inner = useTestRef('nestedGestureInner');
  return (
    <View style={styles.container}>
      <Screen
        ref={targetScreen}
        onAppear={() => notify('nested-gesture-target-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <SharedTransitionBoundary isActive={false}>
          <Animated.View
            sharedTransitionTag="nested-gesture-outer"
            sharedTransitionStyle={transition}
            style={styles.nestedOuterTarget}>
            <Animated.View
              sharedTransitionTag="nested-gesture-inner"
              sharedTransitionStyle={transition}
              style={styles.nestedInnerTarget}
            />
          </Animated.View>
        </SharedTransitionBoundary>
      </Screen>
      <Screen
        ref={sourceScreen}
        onAppear={() => notify('nested-gesture-source-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <SharedTransitionBoundary isActive>
          <Animated.View
            ref={outer}
            sharedTransitionTag="nested-gesture-outer"
            sharedTransitionStyle={transition}
            style={styles.nestedOuterSource}>
            {innerMounted && (
              <Animated.View
                ref={inner}
                sharedTransitionTag="nested-gesture-inner"
                sharedTransitionStyle={transition}
                style={styles.source}
              />
            )}
          </Animated.View>
        </SharedTransitionBoundary>
      </Screen>
    </View>
  );
}

describe('Reduced motion during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest.each([
    [ReduceMotion.Always, 60],
    [ReduceMotion.Never, 82.5],
  ] as const)(
    'uses reduced motion ${0} and restores a cancelled swipe',
    async ([motion, width]) => {
      const style = SharedTransition.duration(30000).reduceMotion(motion);
      const tags = await startGesture(style, width);
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        0.75,
        false,
        false
      );
      await expectCarrier(
        tags.source,
        motion === ReduceMotion.Always ? 60 : 127.5
      );
      await observer().emitScreenGestureCancel(tags.sourceScreen);
      await expectCarrier(tags.source, 60);
      await expectTargetOpacity(1);
    }
  );
});

describe('System reduced motion during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest(
    'reads System at start and retains it during the swipe',
    async () => {
      const style = SharedTransition.duration(30000)
        .reduceMotion(ReduceMotion.System)
        .fadeContent();
      const tags = await startGesture(style, 60, async () => {
        await render(
          <Screens transitionStyle={style} systemMotion={ReduceMotion.Always} />
        );
        await waitForFrames(3);
      });
      await expectEventually(() =>
        runOnUIBlocking(() => {
          'worklet';
          return global._obtainMountedViewProps(tags.child, false)?.opacity;
        })
      ).toBe(1);
      await render(
        <Screens transitionStyle={style} systemMotion={ReduceMotion.Never} />
      );
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        0.5,
        false,
        false
      );
      await expectCarrier(tags.source, 60);
      await observer().emitScreenGestureCancel(tags.sourceScreen);
      await expectCarrier(tags.source, 60);
      await expectEventually(() =>
        runOnUIBlocking(() => {
          'worklet';
          return global._obtainMountedViewProps(tags.child, false)?.opacity;
        })
      ).toBe(1);
    }
  );
});

describe('Skipped shared transition during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;
  gestureTest.each([['commit'], ['cancel'], ['late cancel']] as const)(
    'keeps native parents and reports ${0} once',
    async ([outcome]) => {
      const finished: boolean[] = [];
      const record = (value: boolean) => {
        finished.push(value);
        notify('skipped-gesture-finished');
      };
      const style = SharedTransition.reduceMotion(ReduceMotion.Always)
        .fadeContent()
        .withCallback((value) => {
          'worklet';
          scheduleOnRN(record, value);
        });
      const tags = await startGesture(style, 60);
      expect(await observer().observeParent(tags.source)).toBe(
        tags.originalParent
      );
      await expectEventually(() =>
        runOnUIBlocking(() => {
          'worklet';
          return global._obtainMountedViewProps(tags.child, false)?.opacity;
        })
      ).toBe(1);
      expect(finished).toBe([]);
      if (outcome !== 'cancel') {
        await observer().emitScreenTransitionProgress(
          tags.targetScreen,
          1,
          false,
          false
        );
        await waitForFrames(3);
        expect(finished).toBe([]);
      }
      if (outcome === 'commit') {
        await render(
          <Screens transitionStyle={style} sourceScreenMounted={false} />
        );
      } else {
        await observer().emitScreenGestureCancel(tags.sourceScreen);
      }
      await waitForNotification('skipped-gesture-finished');
      await waitForFrames(3);
      expect(finished).toBe([outcome === 'commit']);
      await expectTargetOpacity(1);
    }
  );

  gestureTest(
    'keeps a running gesture when System changes to reduced motion',
    async () => {
      const style = SharedTransition.reduceMotion(ReduceMotion.System);
      const tags = await startGesture(style, 82.5, async () => {
        await render(
          <Screens transitionStyle={style} systemMotion={ReduceMotion.Never} />
        );
        await waitForFrames(3);
      });
      await render(
        <Screens transitionStyle={style} systemMotion={ReduceMotion.Always} />
      );
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        0.75,
        false,
        false
      );
      await expectCarrier(tags.source, 127.5);
      await observer().emitScreenGestureCancel(tags.sourceScreen);
      await expectCarrier(tags.source, 60);
      await expectTargetOpacity(1);
    }
  );
});

describe('Retained source during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest.each([['end'], ['cancel']] as const)(
    'keeps a deleted source through gesture ${0}',
    async ([outcome]) => {
      const tags = await startGesture();
      await render(<Screens sourceMounted={false} />);
      await waitForFrames(3);
      expect(getTestComponent('gestureSource').getTag()).toBe(-1);
      await expectCarrier(tags.source, 82.5);
      expect(await isViewMountedNatively(tags.child)).toBe(true);
      await expectTargetOpacity(0);

      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        0.75,
        false,
        false
      );
      await expectCarrier(tags.source, 127.5);
      expect(await isViewMountedNatively(tags.child)).toBe(true);
      await expectTargetOpacity(0);

      if (outcome === 'end') {
        await observer().emitScreenTransitionProgress(
          tags.targetScreen,
          1,
          false,
          false
        );
      } else {
        await observer().emitScreenGestureCancel(tags.sourceScreen);
      }
      await expectGone(tags.source, tags.child);
      await expectTargetOpacity(1);
      await render(<Screens sourceScreenMounted={false} />);
      await expectGone(tags.sourceScreen);
      await expectTargetOpacity(1);
    }
  );

  gestureTest(
    'cleans up when React removes the source Screen during a gesture',
    async () => {
      const tags = await startGesture();
      await render(<Screens sourceScreenMounted={false} />);
      await expectGone(tags.sourceScreen, tags.source, tags.child);
      await expectTargetOpacity(1);
    }
  );
});

describe('Nested shared view during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest(
    'moves a removed nested view to its target on screen',
    async () => {
      await render(<NestedScreens />);
      await waitForNotification('nested-gesture-source-appeared');
      await waitForNotification('nested-gesture-target-appeared');
      await expectEventually(
        async () =>
          (await getTestComponent('nestedGestureInner').getMountedViewProps())
            ?.width
      ).toBe(60, ComparisonMode.PIXEL);
      const targetScreen = getTestComponent(
        'nestedGestureTargetScreen'
      ).getTag();
      const outer = getTestComponent('nestedGestureOuter').getTag();
      const inner = getTestComponent('nestedGestureInner').getTag();
      const originalParent = await observer().observeParent(outer);
      await observer().emitScreenTransitionProgress(
        targetScreen,
        0,
        false,
        false
      );
      await expectEventually(async () => {
        const parent = await observer().observeParent(outer);
        return parent !== null && parent !== originalParent;
      }).toBe(true);
      const outerStart = await mountedX(outer);
      if (outerStart === undefined) {
        throw new Error('The outer carrier is not mounted');
      }
      await observer().emitScreenTransitionProgress(
        targetScreen,
        0.5,
        false,
        false
      );
      await expectEventually(() => mountedX(outer)).toBe(
        outerStart + 50,
        ComparisonMode.PIXEL
      );
      await render(<NestedScreens innerMounted={false} />);
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(
        targetScreen,
        0.75,
        false,
        false
      );
      // The outer view moves by 100 and the inner view by 20 inside it.
      await expectEventually(() => mountedX(inner)).toBe(
        outerStart + 90,
        ComparisonMode.PIXEL
      );
      await observer().emitScreenTransitionProgress(
        targetScreen,
        1,
        false,
        false
      );
      await expectGone(inner);
    }
  );
});

function mountedX(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false)?.x;
  });
}

async function startGesture(
  transitionStyle = transition,
  width = 82.5,
  beforeGesture?: () => Promise<void>
) {
  await render(<Screens transitionStyle={transitionStyle} />);
  await waitForNotification('gesture-source-appeared');
  await waitForNotification('gesture-target-appeared');
  await expectEventually(
    async () =>
      (await getTestComponent('gestureSource').getMountedViewProps())?.width
  ).toBe(60, ComparisonMode.PIXEL);
  const tags = {
    sourceScreen: getTestComponent('gestureSourceScreen').getTag(),
    targetScreen: getTestComponent('gestureTargetScreen').getTag(),
    source: getTestComponent('gestureSource').getTag(),
    child: getTestComponent('gestureChild').getTag(),
  };
  await beforeGesture?.();
  const originalParent = await observer().observeParent(tags.source);
  expect(originalParent !== null).toBe(true);
  await observer().emitScreenTransitionProgress(
    tags.targetScreen,
    0,
    false,
    false
  );
  await expectEventually(async () => {
    const parent = await observer().observeParent(tags.source);
    return (
      parent !== null &&
      (width === 60 ? parent === originalParent : parent !== originalParent)
    );
  }).toBe(true);
  await expectCarrier(tags.source, 60);
  await observer().emitScreenTransitionProgress(
    tags.targetScreen,
    0.25,
    false,
    false
  );
  await expectCarrier(tags.source, width);
  await expectTargetOpacity(width === 60 ? 1 : 0);
  return { ...tags, originalParent };
}

function observer() {
  if (!RuntimeTestObserver) {
    throw new Error('RuntimeTestObserver requires a runtime-test build');
  }
  return RuntimeTestObserver;
}

async function expectCarrier(tag: number, width: number) {
  await expectEventually(() =>
    runOnUIBlocking(() => {
      'worklet';
      return global._obtainMountedViewProps(tag, false)?.width;
    })
  ).toBe(width, ComparisonMode.PIXEL);
  await expectEventually(() =>
    runOnUIBlocking(() => {
      'worklet';
      return global._obtainMountedViewProps(tag, false)?.opacity;
    })
  ).toBe(1);
}

async function expectTargetOpacity(opacity: number) {
  await expectEventually(
    async () =>
      (await getTestComponent('gestureTarget').getMountedViewProps())?.opacity
  ).toBe(opacity);
}

async function expectGone(...tags: number[]) {
  for (const tag of tags) {
    await expectEventually(() => isViewMountedNatively(tag)).toBe(false);
  }
}

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  screen: { position: 'absolute', left: 0, top: 0, width: 300, height: 400 },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: { width: 150, height: 150, backgroundColor: '#2277dd' },
  child: { width: 20, height: 15, backgroundColor: '#ffffff' },
  nestedOuterSource: { width: 100, height: 100, backgroundColor: '#dd5522' },
  nestedOuterTarget: {
    marginLeft: 100,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
  nestedInnerTarget: {
    marginLeft: 20,
    width: 60,
    height: 60,
    backgroundColor: '#ffffff',
  },
});
