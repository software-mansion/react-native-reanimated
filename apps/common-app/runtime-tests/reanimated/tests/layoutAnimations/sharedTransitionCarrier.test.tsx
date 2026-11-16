import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
  makeMutable,
} from 'react-native-reanimated';

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

function Target({
  transition,
  opacity,
  active,
  sharedTag = 'carrier',
  mounted,
  exiting,
  targetKey,
}: {
  transition: SharedTransition;
  opacity: number;
  active: boolean;
  sharedTag?: string;
  mounted: boolean;
  exiting?: FadeOut;
  targetKey?: string;
}) {
  const target = useTestRef('target');
  const targetChild = useTestRef('targetChild');
  return (
    <SharedTransitionBoundary isActive={active}>
      {mounted && (
        <Animated.View
          key={targetKey}
          ref={target}
          sharedTransitionTag={sharedTag}
          sharedTransitionStyle={transition}
          exiting={exiting}
          style={[styles.target, { opacity }]}>
          <View ref={targetChild} collapsable={false} style={styles.child} />
        </Animated.View>
      )}
    </SharedTransitionBoundary>
  );
}

function Screens({
  active,
  transition,
  removeSource = false,
  targetOpacity = 1,
  sourceWidth = 60,
  sourceOpacity = 1,
  sharedTag = 'carrier',
  keepTarget = false,
  reorder = false,
  moveAncestor = false,
  targetScreen = active || keepTarget,
  targetMounted = true,
  targetExiting,
  sourceMoved = false,
  targetKey,
  covered = false,
  coveringScreen = 'boundary',
}: {
  active: boolean;
  transition: SharedTransition;
  removeSource?: boolean;
  targetOpacity?: number;
  sourceWidth?: number;
  sourceOpacity?: number;
  sharedTag?: string;
  keepTarget?: boolean;
  reorder?: boolean;
  moveAncestor?: boolean;
  targetScreen?: boolean;
  targetMounted?: boolean;
  targetExiting?: FadeOut;
  sourceMoved?: boolean;
  targetKey?: string;
  covered?: boolean;
  coveringScreen?: 'boundary' | 'view' | 'none';
}) {
  const source = useTestRef('source');
  const sourceChild = useTestRef('sourceChild');
  const carrier = (
    <Animated.View
      key="carrier"
      ref={source}
      sharedTransitionTag={sharedTag}
      sharedTransitionStyle={transition}
      style={[styles.source, { width: sourceWidth, opacity: sourceOpacity }]}>
      <View ref={sourceChild} collapsable={false} style={styles.child} />
    </Animated.View>
  );
  const siblings = ['sibling-1', 'sibling-2'].map((key) => (
    <View key={key} collapsable={false} style={styles.child} />
  ));
  const children = moveAncestor ? (
    <View key="ancestor" collapsable={false}>
      {carrier}
    </View>
  ) : (
    carrier
  );
  return (
    <View style={styles.container}>
      {!(active && removeSource) && (
        <SharedTransitionBoundary isActive={!active && !covered}>
          {reorder || sourceMoved
            ? [children, ...siblings]
            : [...siblings, children]}
        </SharedTransitionBoundary>
      )}
      {targetScreen && (
        <Target
          transition={transition}
          opacity={targetOpacity}
          active={active && !covered}
          sharedTag={sharedTag}
          mounted={targetMounted}
          exiting={targetExiting}
          targetKey={targetKey}
        />
      )}
      {covered && coveringScreen === 'boundary' && (
        <SharedTransitionBoundary isActive>
          <View collapsable={false} style={styles.child} />
        </SharedTransitionBoundary>
      )}
      {covered && coveringScreen === 'view' && (
        <View collapsable={false} style={styles.child} />
      )}
    </View>
  );
}

function RecreatedChildScreens({
  active,
  hidden,
  transition,
  inContainer,
}: {
  active: boolean;
  hidden: boolean;
  transition: SharedTransition;
  inContainer: boolean;
}) {
  const source = useTestRef('source');
  const child = useTestRef('recreatedChild');
  const childView = (
    <Animated.View
      ref={child}
      exiting={FadeOut.duration(1000)}
      style={[styles.child, hidden && { display: 'none' }]}
    />
  );
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="carrier"
          sharedTransitionStyle={transition}
          style={[styles.source, active && { display: 'contents' }]}>
          {inContainer ? (
            <ChildContainer active={active}>{childView}</ChildContainer>
          ) : (
            childView
          )}
        </Animated.View>
      </SharedTransitionBoundary>
      {active && <Target active transition={transition} opacity={1} mounted />}
    </View>
  );
}

function ChildContainer({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const container = useTestRef('childContainer');
  return (
    <View
      ref={container}
      collapsable={false}
      style={active && { display: 'contents' }}>
      {children}
    </View>
  );
}

function observer() {
  if (!RuntimeTestObserver) {
    throw new Error('RuntimeTestObserver requires a runtime-test build');
  }
  return RuntimeTestObserver;
}

function transitionWithNotification(duration = 1200) {
  return SharedTransition.duration(duration).withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('carrier-finished');
    }
  });
}

async function expectMoving(name: string, minWidth = 65) {
  await expectEventually(async () => {
    const props = await getTestComponent(name).getMountedViewProps();
    return (
      !!props &&
      props.opacity > 0 &&
      props.width > minWidth &&
      props.width < 145
    );
  }).toBe(true);
}

async function expectAtHome(name: string, width: number, opacity: number) {
  await expectEventually(async () => {
    const props = await getTestComponent(name).getMountedViewProps();
    return (
      !!props &&
      Math.abs(props.width - width) < 0.5 &&
      Math.abs(props.opacity - opacity) < 0.01
    );
  }).toBe(true);
}

async function expectRemovedTarget(tag: number, exiting: boolean) {
  const props = await runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, true);
  });
  if (exiting) {
    expect(props !== null).toBe(true);
    expect(props?.opacity).toBe(0);
  } else {
    expect(props).toBe(null);
  }
}

describe('Shared transition moves a real native view', () => {
  // On Android, `display: none` does not start the exit of the child, so React does not recreate its tag.
  const recreateChildTest = Platform.OS === 'ios' ? test : test.skip;
  recreateChildTest.each([false, true])(
    'keeps a retained carrier when React recreates its last child tag (in a container: %p)',
    async (inContainer) => {
      await mockAnimationTimer({ autoAdvance: false });
      const transition = transitionWithNotification(4000).easing(Easing.linear);
      await render(
        <RecreatedChildScreens
          inContainer={inContainer}
          active={false}
          hidden={false}
          transition={transition}
        />
      );
      await expectEventually(
        async () =>
          (await getTestComponent('source').getMountedViewProps())?.width
      ).toBe(60, ComparisonMode.PIXEL);
      const sourceTag = getTestComponent('source').getTag();
      const childTag = getTestComponent('recreatedChild').getTag();
      const containerTag = inContainer
        ? getTestComponent('childContainer').getTag()
        : null;

      await render(
        <RecreatedChildScreens
          inContainer={inContainer}
          active={false}
          hidden
          transition={transition}
        />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(200);
      const exitingChild =
        await getTestComponent('recreatedChild').getMountedViewProps();
      expect(exitingChild?.opacity).toBeWithinRange(0.5, 0.95);
      await render(
        <RecreatedChildScreens
          inContainer={inContainer}
          active
          hidden
          transition={transition}
        />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(500);
      await expectEventually(
        async () =>
          (await getTestComponent('source').getMountedViewProps())?.width
      ).toBe(71.25, ComparisonMode.PIXEL);
      expect(await isViewMountedNatively(sourceTag)).toBe(true);
      expect(
        (await getTestComponent('target').getMountedViewProps())?.opacity
      ).toBe(0);

      await render(
        <RecreatedChildScreens
          inContainer={inContainer}
          active
          hidden={false}
          transition={transition}
        />
      );
      await waitForFrames(3);
      expect(getTestComponent('recreatedChild').getTag()).toBe(childTag);
      expect(
        (await getTestComponent('recreatedChild').getMountedViewProps())
          ?.opacity
      ).toBe(1);
      expect(await isViewMountedNatively(sourceTag)).toBe(true);
      expect(
        (await getTestComponent('target').getMountedViewProps())?.opacity
      ).toBe(0);
      await advanceAnimationTimer(500);
      expect(
        (await getTestComponent('source').getMountedViewProps())?.width
      ).toBe(71.25 + (150 - 71.25) / 8, ComparisonMode.PIXEL);
      if (containerTag !== null) {
        expect(await isViewMountedNatively(containerTag)).toBe(true);
      }

      await advanceAnimationTimer(3500);
      await waitForNotification('carrier-finished');
      await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(
        false
      );
      expect(await isViewMountedNatively(childTag)).toBe(true);
      if (containerTag !== null) {
        await expectEventually(() => isViewMountedNatively(containerTag)).toBe(
          false
        );
      }
      await expectAtHome('target', 150, 1);
    }
  );

  test('moves the source with its untagged child and keeps the target hidden', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const childTag = getTestComponent('sourceChild').getTag();
    const home = await getTestComponent('source').getMountedViewProps();
    expect(home).not.toBe(null);

    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    expect(await isViewMountedNatively(childTag)).toBe(true);
    const child = await getTestComponent('sourceChild').getMountedViewProps();
    expect(child?.width).toBe(20, ComparisonMode.PIXEL);
    expect(child?.height).toBe(15, ComparisonMode.PIXEL);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);

    await render(
      <Screens active transition={transition} targetOpacity={0.7} />
    );
    await waitForFrames(3);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(300);
    await expectMoving('source');
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(400);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 0.7);
    expect(await isViewMountedNatively(childTag)).toBe(true);
    const source = await getTestComponent('source').getMountedViewProps();
    expect(source?.x).toBeWithinRange(home!.x - 0.5, home!.x + 0.5);
    expect(source?.y).toBeWithinRange(home!.y - 0.5, home!.y + 0.5);
  });

  test('moves the source into a carrier layer with a tag that React does not give', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    const layerTag = (await observer().observeParent(sourceTag))!;
    expect(layerTag % 2).toBe(1);
    expect(layerTag % 10 === 1).toBe(false);
  });

  test('ends the run when a screen without its tag covers the target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const homeParent = await observer().observeParent(sourceTag);
    expect(homeParent !== null).toBe(true);
    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    expect(await observer().observeParent(sourceTag)).not.toBe(homeParent);

    await render(<Screens active covered transition={transition} />);
    await waitForFrames(3);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
    await expectEventually(() => observer().observeParent(sourceTag)).toBe(
      homeParent
    );
    await advanceAnimationTimer(300);
    await expectAtHome('source', 60, 0);
  });

  test.each([
    ['a screen without a boundary covers the target', 'view'],
    ['the boundary of the target turns inactive', 'none'],
  ] as const)('ends the run when ${0}', async ([, coveringScreen]) => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const homeParent = await observer().observeParent(sourceTag);
    expect(homeParent !== null).toBe(true);
    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    expect(await observer().observeParent(sourceTag)).not.toBe(homeParent);

    await render(
      <Screens
        active
        covered
        coveringScreen={coveringScreen}
        transition={transition}
      />
    );
    await waitForFrames(3);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
    await expectEventually(() => observer().observeParent(sourceTag)).toBe(
      homeParent
    );
    await advanceAnimationTimer(300);
    await expectAtHome('source', 60, 0);
  });

  test('ends a reversed run when a screen without its tag covers the target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} keepTarget />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const homeParent = await observer().observeParent(sourceTag);
    expect(homeParent !== null).toBe(true);
    await render(<Screens active transition={transition} keepTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    await render(<Screens active={false} transition={transition} keepTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(100);
    await expectMoving('source');
    expect(await observer().observeParent(sourceTag)).not.toBe(homeParent);

    await render(
      <Screens active={false} covered transition={transition} keepTarget />
    );
    await waitForFrames(3);
    await expectAtHome('source', 60, 1);
    await expectEventually(() => observer().observeParent(sourceTag)).toBe(
      homeParent
    );
    await advanceAnimationTimer(300);
    await expectAtHome('source', 60, 1);
  });

  test('lands in the first frame with a zero duration', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification(0);
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
    await advanceAnimationTimer(16);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
  });

  test('keeps a replaced target hidden until the source lands', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    const replacedTag = getTestComponent('target').getTag();

    await render(<Screens active transition={transition} targetKey="new" />);
    await waitForFrames(3);
    expect(getTestComponent('target').getTag()).not.toBe(replacedTag);
    await expectMoving('source');
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(1300);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
  });

  test('keeps the source and its children when React removes their screen', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification();
    await render(
      <Screens active={false} transition={transition} removeSource />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} removeSource />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    const [source, child] = await runOnUIBlocking(() => {
      'worklet';
      return [
        global._obtainMountedViewProps(sourceTag, false),
        global._obtainMountedViewProps(childTag, false),
      ];
    });
    expect(source?.opacity).toBe(1);
    expect(source?.width).toBeWithinRange(65, 145);
    expect(child === null).toBe(false);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    const targetChild = getTestComponent('targetChild');
    expect((await targetChild.getMountedViewProps())?.width).toBe(
      20,
      ComparisonMode.PIXEL
    );

    await advanceAnimationTimer(700);
    await waitForNotification('carrier-finished');
    await expectAtHome('target', 150, 1);
    expect(await isViewMountedNatively(targetChild.getTag())).toBe(true);
    await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(false);
    await expectEventually(() => isViewMountedNatively(childTag)).toBe(false);
  });

  test('deletes retained content before the run ends and starts a new source', async () => {
    const transition = SharedTransition.duration(30000);
    await render(
      <Screens active={false} transition={transition} removeSource />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();
    await render(<Screens active transition={transition} removeSource />);
    await waitForFrames(3);
    expect(await isViewMountedNatively(sourceTag)).toBe(true);
    const targetTag = getTestComponent('target').getTag();
    await render(
      <Screens
        active
        transition={transition}
        removeSource
        targetMounted={false}
      />
    );
    await expectEventually(async () => {
      const mounted = await Promise.all(
        [targetTag, sourceTag, childTag].map(isViewMountedNatively)
      );
      return mounted.every((value) => !value);
    }, 2000).toBe(true);

    const nextTransition = transitionWithNotification(4000);
    await render(
      <Screens key="new" active={false} transition={nextTransition} />
    );
    await waitForFrames();
    const newSourceTag = getTestComponent('source').getTag();
    expect(newSourceTag === sourceTag).toBe(false);
    await render(<Screens key="new" active transition={nextTransition} />);
    await expectEventually(async () => {
      const source = await getTestComponent('source').getMountedViewProps();
      const target = await getTestComponent('target').getMountedViewProps();
      return !!source && source.width > 60 && !!target && target.opacity === 0;
    }, 2000).toBe(true);
    expect(getTestComponent('source').getTag()).toBe(newSourceTag);
    expect(await isViewMountedNatively(sourceTag)).toBe(false);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
  });

  test('applies a carrier prop and layout update when it returns to its parent', async () => {
    await mockAnimationTimer();
    const finishes = makeMutable(0);
    const transition = SharedTransition.duration(600).withCallback(
      (finished) => {
        'worklet';
        if (finished) {
          finishes.value += 1;
          notify(
            finishes.value === 1 ? 'carrier-finished' : 'carrier-returned'
          );
        }
      }
    );
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    await render(<Screens active transition={transition} />);
    await expectMoving('source');
    await render(
      <Screens
        active
        transition={transition}
        sourceWidth={90}
        sourceOpacity={0.4}
      />
    );
    await waitForNotification('carrier-finished', 30000);
    await expectAtHome('source', 90, 0);
    await expectAtHome('target', 150, 1);
    await render(
      <Screens
        active={false}
        transition={transition}
        sourceWidth={90}
        sourceOpacity={0.4}
      />
    );
    await waitForNotification('carrier-returned', 30000);
    await expectAtHome('source', 90, 0.4);
  });

  test('keeps the run when React reorders the carrier in its parent', async () => {
    await mockAnimationTimer();
    const transition = transitionWithNotification(600);
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    await render(<Screens active transition={transition} />);
    await expectMoving('source');
    await render(<Screens active transition={transition} reorder />);
    await expectMoving('source');
    await waitForNotification('carrier-finished', 30000);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
    expect((await getTestComponent('source').getMountedViewProps())?.y).toBe(
      0,
      ComparisonMode.PIXEL
    );
  });

  test('keeps the run when React reorders the carrier ancestor', async () => {
    await mockAnimationTimer();
    const transition = transitionWithNotification(600);
    await render(
      <Screens active={false} transition={transition} moveAncestor />
    );
    await waitForFrames();
    await render(<Screens active transition={transition} moveAncestor />);
    await expectMoving('source');
    await render(
      <Screens active transition={transition} moveAncestor reorder />
    );
    await expectMoving('source');
    await waitForNotification('carrier-finished', 30000);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
  });

  test('starts a new tag after a reversal makes the carrier the target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const transition = transitionWithNotification(600);
    await render(<Screens active={false} transition={transition} keepTarget />);
    await waitForFrames();
    await render(<Screens active transition={transition} keepTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    await expectMoving('source');
    await render(<Screens active={false} transition={transition} keepTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(100);
    await expectMoving('source');
    const changedTransition = SharedTransition.duration(600).withCallback(
      (finished) => {
        'worklet';
        if (finished) {
          notify('changed-carrier-finished');
        }
      }
    );
    await render(
      <Screens
        active
        transition={changedTransition}
        keepTarget
        sharedTag="changed-carrier"
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(100);
    await expectMoving('source');
    await advanceAnimationTimer(600);
    await waitForNotification('changed-carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
  });

  for (const [kind, targetExiting] of [
    ['without an exit', undefined],
    [
      'with an exit that outlasts the run',
      FadeOut.duration(3000).withCallback((finished) => {
        'worklet';
        if (finished) {
          notify('target-exited');
        }
      }),
    ],
  ] as const) {
    test(`shows the source at the end when React removes the target ${kind}`, async () => {
      await mockAnimationTimer({ autoAdvance: false });
      const transition = transitionWithNotification();
      await render(
        <Screens
          active={false}
          transition={transition}
          targetExiting={targetExiting}
        />
      );
      await waitForFrames();
      const sourceHome = await getTestComponent('source').getMountedViewProps();
      const sourceTag = getTestComponent('source').getTag();

      await render(
        <Screens active transition={transition} targetExiting={targetExiting} />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(500);
      await expectMoving('source');
      const targetTag = getTestComponent('target').getTag();

      await render(
        <Screens
          active
          transition={transition}
          targetMounted={false}
          targetExiting={targetExiting}
        />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(300);
      await expectMoving('source');
      await expectRemovedTarget(targetTag, !!targetExiting);
      await advanceAnimationTimer(400);
      await waitForNotification('carrier-finished');
      await expectAtHome('source', 60, 1);
      const sourceProps =
        await getTestComponent('source').getMountedViewProps();
      expect(sourceProps?.x).toBe(sourceHome?.x, ComparisonMode.PIXEL);
      expect(sourceProps?.y).toBe(sourceHome?.y, ComparisonMode.PIXEL);
      await expectRemovedTarget(targetTag, !!targetExiting);
      if (targetExiting) {
        await advanceAnimationTimer(2400);
        await waitForNotification('target-exited');
        await expectEventually(() => isViewMountedNatively(targetTag)).toBe(
          false
        );
      }
      expect(await isViewMountedNatively(sourceTag)).toBe(true);
    });

    test(`keeps the source moving when React moves it and removes the target ${kind} in the same update`, async () => {
      await mockAnimationTimer({ autoAdvance: false });
      const transition = transitionWithNotification();
      await render(
        <Screens
          active={false}
          transition={transition}
          targetExiting={targetExiting}
        />
      );
      await waitForFrames();
      const sourceTag = getTestComponent('source').getTag();

      await render(
        <Screens active transition={transition} targetExiting={targetExiting} />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(500);
      await expectMoving('source');
      const targetTag = getTestComponent('target').getTag();

      await render(
        <Screens
          active
          transition={transition}
          targetMounted={false}
          targetExiting={targetExiting}
          sourceMoved
        />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(300);
      await expectMoving('source');
      await expectRemovedTarget(targetTag, !!targetExiting);
      await advanceAnimationTimer(400);
      await waitForNotification('carrier-finished');
      await expectAtHome('source', 60, 1);
      expect((await getTestComponent('source').getMountedViewProps())?.y).toBe(
        0,
        ComparisonMode.PIXEL
      );
      await expectRemovedTarget(targetTag, !!targetExiting);
      if (targetExiting) {
        await advanceAnimationTimer(2400);
        await waitForNotification('target-exited');
        await expectEventually(() => isViewMountedNatively(targetTag)).toBe(
          false
        );
      }
      expect(await isViewMountedNatively(sourceTag)).toBe(true);
    });
  }
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400, marginTop: 40, marginLeft: 30 },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: {
    marginTop: 100,
    marginLeft: 60,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
  child: { width: 20, height: 15, backgroundColor: '#ffffff' },
});
