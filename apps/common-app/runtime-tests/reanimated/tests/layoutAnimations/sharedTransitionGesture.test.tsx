import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { Screen } from 'react-native-screens';

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
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const transition = SharedTransition.duration(30000);

function Screens({
  sourceMounted = true,
  sourceScreenMounted = true,
  targetOffset = 0,
  targetTranslateX = 0,
  sourceActive = true,
  tagged = true,
  sourceTag = 'gesture-retained-source',
}: {
  sourceMounted?: boolean;
  sourceScreenMounted?: boolean;
  targetOffset?: number;
  targetTranslateX?: number;
  sourceActive?: boolean;
  tagged?: boolean;
  sourceTag?: string;
}) {
  const sourceScreen = useTestRef('gestureSourceScreen');
  const targetScreen = useTestRef('gestureTargetScreen');
  const source = useTestRef('gestureSource');
  const child = useTestRef('gestureChild');
  const target = useTestRef('gestureTarget');
  return (
    <View style={styles.container}>
      <Screen
        ref={targetScreen}
        onAppear={() => notify('gesture-target-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <SharedTransitionBoundary
          isActive={!sourceScreenMounted || !sourceActive}>
          <Animated.View
            ref={target}
            sharedTransitionTag={tagged ? 'gesture-retained-source' : undefined}
            sharedTransitionStyle={transition}
            style={[
              styles.target,
              {
                marginTop: targetOffset,
                transform: [{ translateX: targetTranslateX }],
              },
            ]}
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
          <SharedTransitionBoundary isActive={sourceActive}>
            {sourceMounted && (
              <Animated.View
                ref={source}
                sharedTransitionTag={tagged ? sourceTag : undefined}
                sharedTransitionStyle={transition}
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

describe('Endpoint visibility after a cancelled Screen gesture', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest.each(['cancel', 'zero', 'late-cancel'] as const)(
    'keeps the prior hidden target after %p',
    async (outcome) => {
      const tags = await startGestureWithHiddenTarget();
      await render(<Screens targetOffset={80} targetTranslateX={30} />);
      await waitForFrames(3);
      if (outcome === 'late-cancel') {
        await observer().emitScreenTransitionProgress(
          tags.targetScreen,
          1,
          false,
          false
        );
        await expectTargetOpacity(1);
        await waitForFrames(3);
      }
      if (outcome === 'zero') {
        await observer().emitScreenTransitionProgress(
          tags.sourceScreen,
          0,
          true,
          false
        );
      } else {
        await observer().emitScreenGestureCancel(tags.sourceScreen);
      }
      await expectCarrier(tags.source, 60);
      await expectTargetOpacity(0);
      expect(await observer().observeParent(tags.source)).toBe(
        tags.originalParent
      );
      expect(
        (await getTestComponent('gestureTarget').getTransformObservation())
          ?.translateX
      ).toBe(30, ComparisonMode.PIXEL);
      await render(<Screens targetOffset={80} targetTranslateX={30} />);
      for (let frame = 0; frame < 6; frame++) {
        await expectTargetOpacity(0);
        await waitForFrames(1);
      }
    }
  );

  gestureTest(
    'shows the prior hidden target when cancellation cannot restore its removed source',
    async () => {
      const tags = await startGestureWithHiddenTarget();
      await render(<Screens sourceMounted={false} />);
      await waitForFrames(3);
      await observer().emitScreenGestureCancel(tags.sourceScreen);
      await expectGone(tags.source, tags.child);
      await expectTargetOpacity(1);
    }
  );

  gestureTest(
    'keeps an initially visible target visible after cancellation',
    async () => {
      await render(<Screens tagged={false} />);
      await waitForNotification('gesture-source-appeared');
      await waitForNotification('gesture-target-appeared');
      await render(<Screens />);
      await waitForFrames(3);
      await expectTargetOpacity(1);
      const tags = await beginGesture();
      await observer().emitScreenGestureCancel(tags.sourceScreen);
      await expectCarrier(tags.source, 60);
      await expectTargetOpacity(1);
      expect(await observer().observeParent(tags.source)).toBe(
        tags.originalParent
      );
    }
  );

  gestureTest(
    'keeps the target visible when the completed gesture removes its source screen',
    async () => {
      const tags = await startGestureWithHiddenTarget();
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        1,
        false,
        false
      );
      await expectTargetOpacity(1);
      await render(<Screens sourceScreenMounted={false} />);
      await expectGone(tags.sourceScreen, tags.source, tags.child);
      await expectTargetOpacity(1);
    }
  );

  gestureTest(
    'restores both views when the source changes its shared tag before a late cancel',
    async () => {
      const tags = await startGestureWithHiddenTarget();
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        1,
        false,
        false
      );
      await expectTargetOpacity(1);
      await render(<Screens sourceTag="gesture-renamed-source" />);
      await waitForFrames(3);
      await observer().emitScreenGestureCancel(tags.sourceScreen);
      await expectCarrier(tags.source, 60);
      await expectTargetOpacity(1);
      expect(await observer().observeParent(tags.source)).toBe(
        tags.originalParent
      );
      await waitForFrames(6);
      await expectTargetOpacity(1);
    }
  );

  gestureTest(
    'keeps the grid endpoint hidden when a reverse gesture interrupts its forward carrier',
    async () => {
      await mockAnimationTimer({ autoAdvance: false });
      await render(<Screens sourceActive={false} />);
      await waitForNotification('gesture-source-appeared');
      await waitForNotification('gesture-target-appeared');
      const target = getTestComponent('gestureTarget').getTag();
      const originalParent = await observer().observeParent(target);
      await render(<Screens />);
      await waitForFrames(3);
      await advanceAnimationTimer(15000);
      await expectCarrier(target, 105);
      const sourceScreen = getTestComponent('gestureSourceScreen').getTag();
      const targetScreen = getTestComponent('gestureTargetScreen').getTag();
      await observer().emitScreenTransitionProgress(
        targetScreen,
        0.25,
        false,
        false
      );
      await waitForFrames(3);
      await observer().emitScreenGestureCancel(sourceScreen);
      await expectTargetOpacity(0);
      await expectCarrier(getTestComponent('gestureSource').getTag(), 60);
      expect(await observer().observeParent(target)).toBe(originalParent);
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

describe('Target moved during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest('moves the carrier toward the new target position', async () => {
    const tags = await startGesture();
    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      0.5,
      false,
      false
    );
    await expectCarrier(tags.source, 105);
    const before = await carrierY(tags.source);
    const target = getTestComponent('gestureTarget');
    const targetY = (await target.getMountedViewProps())!.y;

    await render(<Screens targetOffset={100} />);
    await expectEventually(
      async () => (await target.getMountedViewProps())!.y - targetY
    ).toBe(100, ComparisonMode.PIXEL);
    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      0.5,
      false,
      false
    );
    await expectEventually(
      async () => (await carrierY(tags.source))! - before!
    ).toBe(50, ComparisonMode.PIXEL);

    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      1,
      false,
      false
    );
    await expectTargetOpacity(1);
  });

  gestureTest('moves the carrier toward the new target transform', async () => {
    const tags = await startGesture();
    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      0.5,
      false,
      false
    );
    await expectCarrier(tags.source, 105);

    await render(<Screens targetTranslateX={100} />);
    const target = getTestComponent('gestureTarget').getTag();
    await expectEventually(
      async () => (await observer().observeTransform(target))?.translateX
    ).toBe(100, ComparisonMode.PIXEL);
    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      0.5,
      false,
      false
    );
    await expectEventually(
      async () => (await observer().observeTransform(tags.source))?.translateX
    ).toBe(50, ComparisonMode.PIXEL);

    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      1,
      false,
      false
    );
    await expectTargetOpacity(1);
  });
});

async function startGesture() {
  await render(<Screens />);
  await waitForNotification('gesture-source-appeared');
  await waitForNotification('gesture-target-appeared');
  await expectEventually(
    async () =>
      (await getTestComponent('gestureSource').getMountedViewProps())?.width
  ).toBe(60, ComparisonMode.PIXEL);
  return beginGesture();
}

async function startGestureWithHiddenTarget() {
  await mockAnimationTimer({ autoAdvance: false });
  await render(<Screens sourceActive={false} />);
  await waitForNotification('gesture-source-appeared');
  await waitForNotification('gesture-target-appeared');
  await render(<Screens />);
  await waitForFrames(3);
  await advanceAnimationTimer(30000);
  await expectTargetOpacity(0);
  return beginGesture();
}

async function beginGesture() {
  const tags = {
    sourceScreen: getTestComponent('gestureSourceScreen').getTag(),
    targetScreen: getTestComponent('gestureTargetScreen').getTag(),
    source: getTestComponent('gestureSource').getTag(),
    child: getTestComponent('gestureChild').getTag(),
  };
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
    return parent !== null && parent !== originalParent;
  }).toBe(true);
  await observer().emitScreenTransitionProgress(
    tags.targetScreen,
    0.25,
    false,
    false
  );
  await expectCarrier(tags.source, 82.5);
  await expectTargetOpacity(0);
  return { ...tags, originalParent };
}

function carrierY(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false)?.y;
  });
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
