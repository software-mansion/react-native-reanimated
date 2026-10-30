import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
  makeMutable,
} from 'react-native-reanimated';

import {
  beforeEach,
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

function Target({
  transition,
  opacity,
  active,
  sharedTag,
}: {
  transition: SharedTransition;
  opacity: number;
  active: boolean;
  sharedTag: string;
}) {
  const target = useTestRef('target');
  const targetChild = useTestRef('targetChild');
  return (
    <SharedTransitionBoundary isActive={active}>
      <Animated.View
        ref={target}
        sharedTransitionTag={sharedTag}
        sharedTransitionStyle={transition}
        style={[styles.target, { opacity }]}>
        <View ref={targetChild} collapsable={false} style={styles.child} />
      </Animated.View>
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
          {reorder ? [children, ...siblings] : [...siblings, children]}
        </SharedTransitionBoundary>
      )}
      {(active || keepTarget) && (
        <Target
          transition={transition}
          opacity={targetOpacity}
          active={active}
          sharedTag={sharedTag}
        />
      )}
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
  beforeEach(mockAnimationTimer);

  test('moves the source with its untagged child and keeps the target hidden', async () => {
    const transition = transitionWithNotification(600);
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} />);
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
    await waitForFrames();
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await waitForNotification('carrier-finished', 30000);
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 0.7);
    expect(getTestComponent('sourceChild').getTag()).toBe(childTag);
  });

  test('moves the target when React removes the source in the same update', async () => {
    const transition = transitionWithNotification(600);
    await render(
      <Screens active={false} transition={transition} removeSource />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} removeSource />);
    await expectMoving('target');
    const targetTag = getTestComponent('target').getTag();
    const targetChild = getTestComponent('targetChild');
    const targetChildTag = targetChild.getTag();
    expect((await targetChild.getMountedViewProps())?.width).toBe(
      20,
      ComparisonMode.PIXEL
    );

    await waitForNotification('carrier-finished', 30000);
    await expectAtHome('target', 150, 1);
    expect(getTestComponent('target').getTag()).toBe(targetTag);
    expect(getTestComponent('targetChild').getTag()).toBe(targetChildTag);
    await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(false);
    await expectEventually(() => isViewMountedNatively(childTag)).toBe(false);
  });

  test('applies a carrier prop and layout update when it returns to its parent', async () => {
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
