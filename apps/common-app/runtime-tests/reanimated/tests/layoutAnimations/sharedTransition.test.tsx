import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const FIRST_CONTAINER_TAG = 10000002;
const CONTAINER_TAG_RANGE = 4000;

function createTransition(
  finished: boolean[],
  transition = SharedTransition.duration(300)
) {
  const recordEnd = (isFinished: boolean) => {
    finished.push(isFinished);
    notify('shared-transition-finished');
  };
  return transition.withCallback((isFinished) => {
    'worklet';
    scheduleOnRN(recordEnd, isFinished);
  });
}

function Target({ transition }: { transition: SharedTransition }) {
  const ref = useTestRef('target');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={ref}
        sharedTransitionTag="box"
        sharedTransitionStyle={transition}
        style={styles.target}
      />
    </SharedTransitionBoundary>
  );
}

function Screens({
  showTarget,
  transition,
  sourceTag = 'box',
}: {
  showTarget: boolean;
  transition: SharedTransition;
  sourceTag?: string | null;
}) {
  const sourceRef = useTestRef('source');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <Animated.View
          ref={sourceRef}
          sharedTransitionTag={sourceTag ?? undefined}
          sharedTransitionStyle={transition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      {showTarget && <Target transition={transition} />}
    </View>
  );
}

// On Android a nested Text forms a view whose props are TextProps, not ViewProps.
function NestedTextScreens({ targetActive }: { targetActive: boolean }) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!targetActive}>
        <Text>
          source <Animated.Text sharedTransitionTag="text">inner</Animated.Text>
        </Text>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={targetActive}>
        <Text>
          target <Animated.Text sharedTransitionTag="text">inner</Animated.Text>
        </Text>
      </SharedTransitionBoundary>
    </View>
  );
}

type ParentStyle = ComponentProps<typeof View>['style'];

function ParentScreens({
  showTarget,
  transition,
  sourceParent,
  targetParent,
  targetChild = styles.fill,
}: {
  showTarget: boolean;
  transition: SharedTransition;
  sourceParent: ParentStyle;
  targetParent: ParentStyle;
  targetChild?: ParentStyle;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <View style={sourceParent}>
          <Animated.View
            sharedTransitionTag="box"
            sharedTransitionStyle={transition}
            style={styles.fill}
          />
        </View>
      </SharedTransitionBoundary>
      {showTarget && (
        <SharedTransitionBoundary isActive>
          <View style={targetParent}>
            <Animated.View
              sharedTransitionTag="box"
              sharedTransitionStyle={transition}
              style={targetChild}
            />
          </View>
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

// The moving container and its clip have no React refs. The clip follows the container in tag order.
function mountedTransitionViews() {
  return runOnUIBlocking(() => {
    'worklet';
    const views = [];
    for (let offset = 0; offset < CONTAINER_TAG_RANGE; offset += 2) {
      const props = global._obtainMountedViewProps(
        FIRST_CONTAINER_TAG + offset,
        false
      );
      if (props) {
        views.push(props);
      }
    }
    return views;
  });
}

async function expectMountedAtLayout(name: string, opacity: number) {
  const component = getTestComponent(name);
  await expectEventually(
    async () => (await component.getMountedViewProps())?.opacity
  ).toBe(opacity, ComparisonMode.FLOAT_DISTANCE);
  const mounted = await component.getMountedViewProps();
  expect(mounted).not.toBe(null);
  const layout = async (prop: 'left' | 'top' | 'width' | 'height') =>
    Number(await component.getAnimatedStyle(prop));
  expect(mounted?.x).toBe(await layout('left'), ComparisonMode.PIXEL);
  expect(mounted?.y).toBe(await layout('top'), ComparisonMode.PIXEL);
  expect(mounted?.width).toBe(await layout('width'), ComparisonMode.PIXEL);
  expect(mounted?.height).toBe(await layout('height'), ComparisonMode.PIXEL);
}

describe('Shared element transition between boundaries', () => {
  test('ignores a nested Text with a shared tag', async () => {
    await render(<NestedTextScreens targetActive={false} />);
    await waitForFrames();
    await render(<NestedTextScreens targetActive />);
    await wait(500);
  });

  test('runs to completion', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished);
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(finished).toBe([true]);
    // Cleanup restores only the target. The source stays hidden because a screen
    // transition is expected to cover it.
    await expectMountedAtLayout('source', 0);
    await expectMountedAtLayout('target', 1);
  });

  test.each([
    ['removed', null],
    ['changed', 'other'],
  ] as const)(
    'shows the source again when its tag is ${0}',
    async ([, sourceTag]) => {
      const transition = createTransition([]);
      await render(<Screens showTarget={false} transition={transition} />);
      await waitForFrames();
      await render(<Screens showTarget transition={transition} />);
      await waitForNotification('shared-transition-finished');
      await waitForFrames();
      await expectMountedAtLayout('source', 0);
      await expectMountedAtLayout('target', 1);

      await render(
        <Screens showTarget transition={transition} sourceTag={sourceTag} />
      );
      await expectMountedAtLayout('source', 1);
    }
  );

  test('runs a transition that ends on its first frame', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.reduceMotion(ReduceMotion.Always)
    );
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(finished).toBe([true]);
    await expectMountedAtLayout('target', 1);
  });

  test('carries the opacity of the ancestors without a clip', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.duration(1000)
    );
    const props = {
      transition,
      sourceParent: [styles.parent, styles.dimmed],
      targetParent: styles.parent,
    };
    await render(<ParentScreens {...props} showTarget={false} />);
    await waitForFrames();

    await render(<ParentScreens {...props} showTarget />);
    await waitForFrames(2);
    const views = await mountedTransitionViews();
    expect(views.length).toBe(1);
    expect(views[0].opacity).toBeWithinRange(0.5, 0.9);

    await waitForNotification('shared-transition-finished');
    await waitForFrames();
    expect(finished).toBe([true]);
    expect((await mountedTransitionViews()).length).toBe(0);
  });

  test('ends on the opacity of the target ancestors', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.duration(1000)
    );
    const props = {
      transition,
      sourceParent: styles.parent,
      targetParent: [styles.parent, styles.dimmed],
    };
    await render(<ParentScreens {...props} showTarget={false} />);
    await waitForFrames();

    await render(<ParentScreens {...props} showTarget />);
    await wait(800);
    const views = await mountedTransitionViews();
    expect(views.length).toBe(1);
    expect(views[0].opacity).toBeWithinRange(0.5, 0.8);

    await waitForNotification('shared-transition-finished');
    expect(finished).toBe([true]);
  });

  test('removes the clip with the container', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.duration(1000)
    );
    const props = {
      transition,
      sourceParent: styles.clippingParent,
      targetParent: styles.farParent,
    };
    await render(<ParentScreens {...props} showTarget={false} />);
    await waitForFrames();

    await render(<ParentScreens {...props} showTarget />);
    await waitForFrames(2);
    const views = await mountedTransitionViews();
    expect(views.length).toBe(2);
    expect(views[1].width).toBeWithinRange(100, 140);

    await waitForNotification('shared-transition-finished');
    await waitForFrames();
    expect(finished).toBe([true]);
    expect((await mountedTransitionViews()).length).toBe(0);
  });

  test.each([
    ['clip', styles.clippingParent, styles.farClippingParent, styles.fill],
    ['container', styles.clippingParent, styles.clippingParent, styles.small],
  ] as const)(
    'runs the callback once after the ${0} moving alone ends',
    async ([, sourceParent, targetParent, targetChild]) => {
      const finished: boolean[] = [];
      const transition = createTransition(
        finished,
        SharedTransition.duration(600)
      );
      const props = { transition, sourceParent, targetParent, targetChild };
      await render(<ParentScreens {...props} showTarget={false} />);
      await waitForFrames();

      await render(<ParentScreens {...props} showTarget />);
      await wait(200);
      expect(finished).toBe([]);

      await waitForNotification('shared-transition-finished');
      await waitForFrames();
      expect(finished).toBe([true]);
      expect((await mountedTransitionViews()).length).toBe(0);
    }
  );

  test('restarts only the clip when only its target changes', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.duration(600)
    );
    const props = {
      transition,
      sourceParent: styles.clippingParent,
      targetChild: styles.fill,
    };
    await render(
      <ParentScreens
        {...props}
        showTarget={false}
        targetParent={styles.farClippingParent}
      />
    );
    await waitForFrames();
    await render(
      <ParentScreens
        {...props}
        showTarget
        targetParent={styles.farClippingParent}
      />
    );
    await waitForFrames(2);
    const clipStartY = (await mountedTransitionViews())[1].y;

    await render(
      <ParentScreens
        {...props}
        showTarget
        targetParent={styles.fartherClippingParent}
      />
    );
    await wait(450);
    const views = await mountedTransitionViews();
    expect(views.length).toBe(2);
    expect(views[1].y).toBeWithinRange(clipStartY + 301, clipStartY + 380);

    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(finished).toBe([true]);
    expect((await mountedTransitionViews()).length).toBe(0);
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  fill: { flex: 1, backgroundColor: '#dd5522' },
  small: { width: 40, height: 40, backgroundColor: '#dd5522' },
  parent: { width: 100, height: 100 },
  dimmed: { opacity: 0.5 },
  farParent: { width: 200, height: 200, marginTop: 200 },
  clippingParent: { width: 100, height: 100, overflow: 'hidden' },
  farClippingParent: {
    width: 100,
    height: 100,
    marginTop: 200,
    overflow: 'hidden',
  },
  fartherClippingParent: {
    width: 100,
    height: 100,
    marginTop: 280,
    overflow: 'hidden',
  },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: {
    marginTop: 200,
    marginLeft: 100,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
