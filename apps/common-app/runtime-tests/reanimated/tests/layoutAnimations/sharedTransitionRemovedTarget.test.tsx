import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const DURATION = 1000;

const transition = SharedTransition.duration(DURATION)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('carrier-finished');
    }
  });

const renamedTransition = SharedTransition.duration(DURATION).easing(
  Easing.linear
);

function Target() {
  const target = useTestRef('target');
  return (
    <Animated.View
      ref={target}
      sharedTransitionTag="removed-target"
      sharedTransitionStyle={transition}
      style={styles.target}
    />
  );
}

function Screens({
  active,
  targetMounted = true,
}: {
  active: boolean;
  targetMounted?: boolean;
}) {
  const source = useTestRef('source');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="removed-target"
          sharedTransitionStyle={transition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      {active && (
        <SharedTransitionBoundary isActive>
          {targetMounted && <Target />}
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

type Boundary = 'source' | 'target' | 'next';

function ThreeBoundaries({
  active,
  targetTag = 'removed-target',
  targetMounted = true,
}: {
  active: Boundary;
  targetTag?: string;
  targetMounted?: boolean;
}) {
  const source = useTestRef('source');
  const target = useTestRef('target');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={active === 'source'}>
        <Animated.View
          ref={source}
          sharedTransitionTag="removed-target"
          sharedTransitionStyle={transition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active === 'target'}>
        {targetMounted && (
          <Animated.View
            ref={target}
            sharedTransitionTag={targetTag}
            sharedTransitionStyle={
              targetTag === 'renamed-target' ? renamedTransition : transition
            }
            style={styles.target}
          />
        )}
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active === 'next'}>
        <Animated.View
          sharedTransitionTag="renamed-target"
          sharedTransitionStyle={renamedTransition}
          style={styles.next}
        />
      </SharedTransitionBoundary>
    </View>
  );
}

async function sourceWidth() {
  return (await getTestComponent('source').getMountedViewProps())?.width;
}

async function targetWidth() {
  return (await getTestComponent('target').getMountedViewProps())?.width;
}

async function sourceOpacity() {
  return (await getTestComponent('source').getMountedViewProps())?.opacity;
}

describe('Shared transition with a removed target', () => {
  test('moves to the last target frame before the source jumps back', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} />);
    await waitForFrames();

    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    expect(await sourceWidth()).toBe(110, ComparisonMode.PIXEL);

    await render(<Screens active targetMounted={false} />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2 - 10);
    expect(await sourceWidth()).toBe(159, ComparisonMode.PIXEL);

    await advanceAnimationTimer(10);
    await waitForNotification('carrier-finished');
    await expectSourceAtHome();
  });

  test('shows the source when its boundary is active again after React removes a landed target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} />);
    await waitForFrames();

    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 160, 1);

    await render(<Screens active targetMounted={false} />);
    await waitForFrames(3);
    expect(await sourceOpacity()).toBe(0);
    await render(<Screens active={false} />);
    await expectSourceAtHome();
  });

  test('shows the source when its boundary is active again after React removes a renamed target', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<ThreeBoundaries active="source" />);
    await waitForFrames();

    await render(<ThreeBoundaries active="target" />);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    await render(
      <ThreeBoundaries active="target" targetTag="renamed-target" />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(100);
    await render(<ThreeBoundaries active="next" targetTag="renamed-target" />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION - 400);
    await waitForNotification('carrier-finished');
    expect(await targetWidth()).toBe(124, ComparisonMode.PIXEL);
    await expectAtHome('source', 60, 0);

    await render(
      <ThreeBoundaries
        active="next"
        targetTag="renamed-target"
        targetMounted={false}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(400);
    await waitForFrames(3);
    expect(await sourceOpacity()).toBe(0);
    await render(
      <ThreeBoundaries
        active="source"
        targetTag="renamed-target"
        targetMounted={false}
      />
    );
    await expectSourceAtHome();
  });
});

async function expectSourceAtHome() {
  await expectAtHome('source', 60, 1);
}

async function expectAtHome(name: string, width: number, opacity: number) {
  await expectEventually(async () => {
    const props = await getTestComponent(name).getMountedViewProps();
    return (
      !!props &&
      props.opacity === opacity &&
      Math.abs(props.width - width) < 0.5
    );
  }).toBe(true);
}

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: {
    marginTop: 100,
    marginLeft: 60,
    width: 160,
    height: 160,
    backgroundColor: '#2277dd',
  },
  next: { width: 100, height: 40, backgroundColor: '#22aa55' },
});
