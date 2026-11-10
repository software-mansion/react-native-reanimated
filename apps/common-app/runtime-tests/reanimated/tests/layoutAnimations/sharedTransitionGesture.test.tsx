import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { Screen, ScreenContainer } from 'react-native-screens';
import { scheduleOnRN } from 'react-native-worklets';

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
  transitionStyle = transition,
  sourceMounted = true,
  sourceScreenMounted = true,
  targetOffset = 0,
  targetTranslateX = 0,
  sourceActive = true,
  tagged = true,
  sourceTag = 'gesture-retained-source',
}: {
  transitionStyle?: SharedTransition;
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
            sharedTransitionStyle={transitionStyle}
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

function DeferredScreens({
  top,
  transitionStyle,
}: {
  top: number;
  transitionStyle: SharedTransition;
}) {
  return (
    <View style={styles.container}>
      {[0, 1, 2]
        .filter((index) => index <= top)
        .map((index) => (
          <DeferredScreen
            key={index}
            index={index}
            active={index === top}
            transitionStyle={transitionStyle}
          />
        ))}
    </View>
  );
}

function DeferredScreen({
  index,
  active,
  transitionStyle,
}: {
  index: number;
  active: boolean;
  transitionStyle: SharedTransition;
}) {
  const screen = useTestRef(`deferred-screen-${index}`);
  const endpoint = useTestRef(`deferred-endpoint-${index}`);
  return (
    <Screen
      ref={screen}
      enabled
      activityState={2}
      onAppear={() => notify(`deferred-screen-${index}-appeared`)}
      style={styles.screen}>
      <SharedTransitionBoundary isActive={active}>
        {index < 2 ? (
          <Animated.View
            ref={endpoint}
            sharedTransitionTag="deferred-back"
            sharedTransitionStyle={transitionStyle}
            style={index === 0 ? styles.target : styles.source}
          />
        ) : (
          <View ref={endpoint} collapsable={false} style={styles.source} />
        )}
      </SharedTransitionBoundary>
    </Screen>
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

// The screen below holds two tabs. The container detaches the tab that it does not show.
function TabScreens() {
  const sourceScreen = useTestRef('tabsSourceScreen');
  const targetScreen = useTestRef('tabsTargetScreen');
  const source = useTestRef('tabsSource');
  const shownTarget = useTestRef('tabsShownTarget');
  return (
    <View style={styles.container}>
      <Screen
        ref={targetScreen}
        onAppear={() => notify('tabs-target-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <ScreenContainer style={styles.screen}>
          <Screen enabled activityState={2} style={styles.screen}>
            <SharedTransitionBoundary isActive={false}>
              <Animated.View
                ref={shownTarget}
                sharedTransitionTag="tab-photo"
                sharedTransitionStyle={transition}
                style={styles.target}
              />
            </SharedTransitionBoundary>
          </Screen>
          <Screen enabled activityState={0} style={styles.screen}>
            <SharedTransitionBoundary isActive={false}>
              <Animated.View
                sharedTransitionTag="tab-photo"
                sharedTransitionStyle={transition}
                style={styles.hiddenTabTarget}
              />
            </SharedTransitionBoundary>
          </Screen>
        </ScreenContainer>
      </Screen>
      <Screen
        ref={sourceScreen}
        onAppear={() => notify('tabs-source-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <SharedTransitionBoundary isActive>
          <Animated.View
            ref={source}
            sharedTransitionTag="tab-photo"
            sharedTransitionStyle={transition}
            style={styles.source}
          />
        </SharedTransitionBoundary>
      </Screen>
    </View>
  );
}

describe('Back gesture to a screen with tabs', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest('moves the view to the tab on screen', async () => {
    await render(<TabScreens />);
    await waitForNotification('tabs-source-appeared');
    await waitForNotification('tabs-target-appeared');
    const targetScreen = getTestComponent('tabsTargetScreen').getTag();
    const source = getTestComponent('tabsSource').getTag();
    await observer().emitScreenTransitionProgress(
      targetScreen,
      0,
      false,
      false
    );
    await observer().emitScreenTransitionProgress(
      targetScreen,
      0.5,
      false,
      false
    );
    await expectCarrier(source, 105);
    await expectEventually(
      async () =>
        (await getTestComponent('tabsShownTarget').getMountedViewProps())
          ?.opacity
    ).toBe(0);
    await observer().emitScreenTransitionProgress(
      targetScreen,
      1,
      false,
      false
    );
    await expectEventually(
      async () =>
        (await getTestComponent('tabsShownTarget').getMountedViewProps())
          ?.opacity
    ).toBe(1);
  });
});

// The screen below holds two pages that are both in the window, like a pager. The first page was on screen.
function PagerScreens({
  stage,
  extraMounted = false,
}: {
  stage: 'below' | 'pushed' | 'popped';
  extraMounted?: boolean;
}) {
  const targetScreen = useTestRef('pagerTargetScreen');
  const sourceScreen = useTestRef('pagerSourceScreen');
  const shownPage = useTestRef('pagerShownPage');
  const otherPage = useTestRef('pagerOtherPage');
  const source = useTestRef('pagerSource');
  return (
    <View style={styles.container}>
      <Screen
        ref={targetScreen}
        onAppear={() => notify('pager-target-appeared')}
        enabled
        activityState={2}
        style={styles.screen}>
        <View style={styles.pages}>
          <View style={styles.page}>
            <SharedTransitionBoundary isActive={stage !== 'pushed'}>
              <Animated.View
                ref={shownPage}
                sharedTransitionTag="pager-photo"
                sharedTransitionStyle={transition}
                style={styles.target}
              />
              {extraMounted && <PagerExtra />}
            </SharedTransitionBoundary>
          </View>
          <View style={styles.page}>
            <SharedTransitionBoundary isActive={false}>
              <Animated.View
                ref={otherPage}
                sharedTransitionTag="pager-photo"
                sharedTransitionStyle={transition}
                style={styles.hiddenTabTarget}
              />
            </SharedTransitionBoundary>
          </View>
        </View>
      </Screen>
      {stage !== 'popped' && (
        <Screen
          ref={sourceScreen}
          onAppear={() => notify('pager-source-appeared')}
          enabled
          activityState={2}
          style={styles.screen}>
          <SharedTransitionBoundary isActive={stage === 'pushed'}>
            <Animated.View
              ref={source}
              sharedTransitionTag="pager-photo"
              sharedTransitionStyle={transition}
              style={styles.source}
            />
          </SharedTransitionBoundary>
        </Screen>
      )}
    </View>
  );
}

function PagerExtra() {
  const extra = useTestRef('pagerExtra');
  return (
    <Animated.View
      ref={extra}
      sharedTransitionTag="pager-extra"
      sharedTransitionStyle={transition}
      style={styles.child}
    />
  );
}

describe('Back gesture to a screen with two pages in the window', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest('moves the view to the page that was on screen', async () => {
    const tags = await pushOverPager();
    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      0.5,
      false,
      false
    );
    await expectCarrier(tags.source, 105);
    await observer().emitScreenTransitionProgress(
      tags.targetScreen,
      1,
      false,
      false
    );
    await render(<PagerScreens stage="popped" />);
    await expectEventually(() => opacityOf('pagerShownPage')).toBe(1);
  });

  gestureTest(
    'shows a view that the screen mounts during the gesture',
    async () => {
      const tags = await pushOverPager();
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        0.5,
        false,
        false
      );
      await render(<PagerScreens stage="pushed" extraMounted />);
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(
        tags.targetScreen,
        1,
        false,
        false
      );
      await render(<PagerScreens stage="popped" extraMounted />);
      await expectEventually(() => opacityOf('pagerExtra')).toBe(1);
    }
  );
});

async function pushOverPager() {
  await mockAnimationTimer({ autoAdvance: false });
  await render(<PagerScreens stage="below" />);
  await waitForNotification('pager-source-appeared');
  await waitForNotification('pager-target-appeared');
  await render(<PagerScreens stage="pushed" />);
  await waitForFrames(3);
  await advanceAnimationTimer(30000);
  await expectEventually(() => opacityOf('pagerShownPage')).toBe(0);
  const tags = {
    targetScreen: getTestComponent('pagerTargetScreen').getTag(),
    source: getTestComponent('pagerSource').getTag(),
  };
  await observer().emitScreenTransitionProgress(
    tags.targetScreen,
    0,
    false,
    false
  );
  return tags;
}

async function opacityOf(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.opacity;
}

describe('Deferred native progress callbacks', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;
  gestureTest.each([
    [ReduceMotion.Never, 'commit'],
    [ReduceMotion.Never, 'late cancel'],
  ] as const)(
    'reports a deferred gesture whose END precedes discovery: ${0}, ${1}',
    async ([mode, outcome]) => {
      const results: boolean[] = [];
      const record = (value: boolean) => results.push(value);
      const style = SharedTransition.reduceMotion(mode).withCallback(
        (value) => {
          'worklet';
          scheduleOnRN(record, value);
        }
      );
      await render(<DeferredScreens top={2} transitionStyle={style} />);
      for (const index of [0, 1, 2]) {
        await waitForNotification(`deferred-screen-${index}-appeared`);
      }
      const first = getTestComponent('deferred-screen-0').getTag();
      const second = getTestComponent('deferred-screen-1').getTag();
      const third = getTestComponent('deferred-screen-2').getTag();
      const target = getTestComponent('deferred-endpoint-0').getTag();
      const targetParent = await observer().observeParent(target);
      expect(targetParent !== null).toBe(true);
      const endpoint = getTestComponent('deferred-endpoint-1').getTag();
      const parent = await observer().observeParent(endpoint);
      expect(parent !== null).toBe(true);
      await observer().emitScreenTransitionProgress(third, 1, false, true);
      await observer().emitScreenTransitionProgress(second, 1, false, true);
      await observer().emitScreenTransitionProgress(second, 0, false, false);
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(second, 0.25, false, false);
      await observer().emitScreenTransitionProgress(second, 1, false, false);
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(first, 0.25, false, false);
      await waitForFrames(3);
      await observer().emitScreenTransitionProgress(first, 1, false, false);
      await waitForFrames(3);
      expect(await isViewMountedNatively(third)).toBe(true);
      expect(await observer().observeParent(endpoint)).toBe(parent);
      expect(results).toBe([]);
      await render(<DeferredScreens top={1} transitionStyle={style} />);
      await waitForFrames(3);
      expect(await isViewMountedNatively(third)).toBe(false);
      expect(results).toBe([]);
      if (outcome === 'commit') {
        await render(<DeferredScreens top={0} transitionStyle={style} />);
      } else {
        await observer().emitScreenGestureCancel(second);
      }
      const expected = outcome === 'commit';
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([expected]);
      await waitForFrames(6);
      expect(results).toBe([expected]);
      const visible = getTestComponent(
        `deferred-endpoint-${outcome === 'commit' ? 0 : 1}`
      );
      await expectEventually(
        async () => (await visible.getMountedViewProps())?.opacity
      ).toBe(1);
      await expectEventually(() => observer().observeParent(target)).toBe(
        targetParent
      );
      if (outcome === 'commit') {
        await expectEventually(() => isViewMountedNatively(endpoint)).toBe(
          false
        );
      } else {
        await expectEventually(() => observer().observeParent(endpoint)).toBe(
          parent
        );
      }
    }
  );
});

describe('Callbacks during native Screen progress', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest.each([['commit'], ['cancel'], ['late cancel']] as const)(
    'reports ${0} once with the callback accepted at start',
    async ([outcome]) => {
      const results: boolean[] = [];
      const replacementResults: boolean[] = [];
      const record = (finished: boolean) => results.push(finished);
      const recordReplacement = (finished: boolean) =>
        replacementResults.push(finished);
      const style = SharedTransition.duration(30000).withCallback(
        (finished) => {
          'worklet';
          scheduleOnRN(record, finished);
        }
      );
      const tags = await startGesture(style);
      const replacement = SharedTransition.duration(30000).withCallback(
        (finished) => {
          'worklet';
          scheduleOnRN(recordReplacement, finished);
        }
      );
      await render(<Screens transitionStyle={replacement} />);
      await waitForFrames(3);
      if (outcome !== 'cancel') {
        await observer().emitScreenTransitionProgress(
          tags.targetScreen,
          1,
          false,
          false
        );
        await waitForFrames(3);
        expect(results).toBe([]);
      }
      if (outcome === 'commit') {
        await render(
          <Screens transitionStyle={replacement} sourceScreenMounted={false} />
        );
      } else {
        await observer().emitScreenGestureCancel(tags.sourceScreen);
      }
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([outcome === 'commit']);
      expect(replacementResults).toBe([]);
      if (outcome === 'commit') {
        await observer().emitScreenTransitionProgress(
          tags.targetScreen,
          1,
          false,
          false
        );
      } else {
        await observer().emitScreenGestureCancel(tags.sourceScreen);
      }
      await waitForFrames(3);
      expect(results.length).toBe(1);
    }
  );
});

describe('Callback when native progress loses its screens', () => {
  const gestureTest = Platform.OS === 'ios' ? test : test.skip;

  gestureTest.each([['source'], ['both']] as const)(
    'reports one cancellation after removing ${0}',
    async ([removed]) => {
      const results: boolean[] = [];
      const record = (finished: boolean) => results.push(finished);
      const style = SharedTransition.duration(30000).withCallback(
        (finished) => {
          'worklet';
          scheduleOnRN(record, finished);
        }
      );
      await startGesture(style);
      if (removed === 'source') {
        await render(
          <Screens transitionStyle={style} sourceScreenMounted={false} />
        );
      } else {
        await render(<View />);
      }
      await expectEventually(() => results.length).toBe(1);
      expect(results).toBe([false]);
      await render(<View />);
      await waitForFrames(3);
      expect(results.length).toBe(1);
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

async function startGesture(transitionStyle = transition) {
  await render(<Screens transitionStyle={transitionStyle} />);
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
  hiddenTabTarget: { width: 240, height: 240, backgroundColor: '#22aa55' },
  pages: { flexDirection: 'row' },
  page: { width: 300 },
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
