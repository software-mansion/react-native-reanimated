import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  SharedTransition,
  SharedTransitionBoundary,
  makeMutable,
} from 'react-native-reanimated';

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
}: {
  transition: SharedTransition;
  opacity: number;
  active: boolean;
  sharedTag?: string;
  mounted: boolean;
  exiting?: FadeOut;
}) {
  const target = useTestRef('target');
  const targetChild = useTestRef('targetChild');
  return (
    <SharedTransitionBoundary isActive={active}>
      {mounted && (
        <Animated.View
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
        <SharedTransitionBoundary isActive={!active}>
          {reorder || sourceMoved
            ? [children, ...siblings]
            : [...siblings, children]}
        </SharedTransitionBoundary>
      )}
      {targetScreen && (
        <Target
          transition={transition}
          opacity={targetOpacity}
          active={active}
          sharedTag={sharedTag}
          mounted={targetMounted}
          exiting={targetExiting}
        />
      )}
    </View>
  );
}

function RecreatedChildScreens({
  active,
  hidden,
  transition,
}: {
  active: boolean;
  hidden: boolean;
  transition: SharedTransition;
}) {
  const source = useTestRef('source');
  const child = useTestRef('recreatedChild');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="carrier"
          sharedTransitionStyle={transition}
          style={[styles.source, active && { display: 'contents' }]}>
          <Animated.View
            ref={child}
            exiting={FadeOut.duration(1000)}
            style={[styles.child, hidden && { display: 'none' }]}
          />
        </Animated.View>
      </SharedTransitionBoundary>
      {active && <Target active transition={transition} opacity={1} mounted />}
    </View>
  );
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

describe('Shared transition moves a real native view', () => {
  const recreateChildTest = Platform.OS === 'ios' ? test : test.skip;
  recreateChildTest(
    'keeps a retained carrier when React recreates its last child tag',
    async () => {
      await mockAnimationTimer(false);
      const transition = transitionWithNotification(4000).easing(Easing.linear);
      await render(
        <RecreatedChildScreens
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

      await render(
        <RecreatedChildScreens active={false} hidden transition={transition} />
      );
      await waitForFrames(3);
      await advanceAnimationTimer(200);
      await render(
        <RecreatedChildScreens active hidden transition={transition} />
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
        <RecreatedChildScreens active hidden={false} transition={transition} />
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

      await advanceAnimationTimer(4000);
      await waitForNotification('carrier-finished');
      await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(
        false
      );
      expect(await isViewMountedNatively(childTag)).toBe(true);
      await expectAtHome('target', 150, 1);
    }
  );

  test('moves the source with its untagged child and keeps the target hidden', async () => {
    await mockAnimationTimer(false);
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectMoving('source');
    expect(getTestComponent('source').getTag()).toBe(sourceTag);
    expect(getTestComponent('sourceChild').getTag()).toBe(childTag);
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
    await advanceAnimationTimer(700);
    const sourceOpacity = (
      await getTestComponent('source').getMountedViewProps()
    )?.opacity;
    expect(
      sourceOpacity !== undefined && sourceOpacity > 0.7 && sourceOpacity < 1
    ).toBe(true);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(500);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 0.7);
    expect(getTestComponent('sourceChild').getTag()).toBe(childTag);
  });

  test('keeps the source and its children when React removes their screen', async () => {
    const transition = transitionWithNotification();
    await render(
      <Screens active={false} transition={transition} removeSource />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} removeSource />);
    await expectEventually(() =>
      runOnUIBlocking(() => {
        'worklet';
        const source = global._obtainMountedViewProps(sourceTag, false);
        const child = global._obtainMountedViewProps(childTag, false);
        return (
          !!source &&
          !!child &&
          source.opacity > 0 &&
          source.width > 65 &&
          source.width < 145
        );
      })
    ).toBe(true);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    const targetTag = getTestComponent('target').getTag();
    const targetChild = getTestComponent('targetChild');
    const targetChildTag = targetChild.getTag();
    expect((await targetChild.getMountedViewProps())?.width).toBe(
      20,
      ComparisonMode.PIXEL
    );

    await waitForNotification('carrier-finished');
    await expectAtHome('target', 150, 1);
    expect(getTestComponent('target').getTag()).toBe(targetTag);
    expect(getTestComponent('targetChild').getTag()).toBe(targetChildTag);
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

  test('ends the run when React reorders the carrier in its parent', async () => {
    await mockAnimationTimer();
    const transition = SharedTransition.duration(4000);
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    await render(<Screens active transition={transition} />);
    await expectMoving('source', 60.5);
    await render(<Screens active transition={transition} reorder />);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
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
    await mockAnimationTimer();
    const transition = transitionWithNotification(600);
    await render(<Screens active={false} transition={transition} keepTarget />);
    await waitForFrames();
    await render(<Screens active transition={transition} keepTarget />);
    await expectMoving('source');
    await render(<Screens active={false} transition={transition} keepTarget />);
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
    await expectMoving('source');
    await waitForNotification('changed-carrier-finished', 30000);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 1);
  });

  for (const [kind, targetExiting] of [
    ['without an exit', undefined],
    ['with an exit that outlasts the run', FadeOut.duration(8000)],
  ] as const) {
    test(`shows the source at the end when React removes the target ${kind}`, async () => {
      const transition = SharedTransition.duration(4000);
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
      await expectMoving('source');

      await render(
        <Screens
          active
          transition={transition}
          targetMounted={false}
          targetExiting={targetExiting}
        />
      );
      await waitForFrames();
      await render(
        <Screens
          active={false}
          transition={transition}
          targetScreen
          targetMounted={false}
          targetExiting={targetExiting}
        />
      );

      await expectAtHome('source', 60, 1);
      expect(getTestComponent('source').getTag()).toBe(sourceTag);
    });

    test(`shows the source when React moves it and removes the target ${kind} in the same update`, async () => {
      const transition = SharedTransition.duration(4000);
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
      await expectMoving('source');

      await render(
        <Screens
          active
          transition={transition}
          targetMounted={false}
          targetExiting={targetExiting}
          sourceMoved
        />
      );

      await expectAtHome('source', 60, 1);
      expect(getTestComponent('source').getTag()).toBe(sourceTag);
    });
  }
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
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
