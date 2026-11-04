import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedTransitionAnimationsValues } from 'react-native-reanimated';
import Animated, {
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
  SharedTransitionType,
  withTiming,
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

const FIRST_CLIP_TAG = 20000002;
const CLIP_TAG_RANGE = 4000;

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

function IdenticalScreens({
  targetActive,
  transition,
}: {
  targetActive: boolean;
  transition: SharedTransition;
}) {
  const targetRef = useTestRef('identical-target');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!targetActive}>
        <Animated.View
          sharedTransitionTag="identical"
          sharedTransitionStyle={transition}
          style={styles.identical}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={targetActive}>
        <Animated.View
          ref={targetRef}
          sharedTransitionTag="identical"
          sharedTransitionStyle={transition}
          style={styles.identical}
        />
      </SharedTransitionBoundary>
    </View>
  );
}

type ViewStyle = ComponentProps<typeof View>['style'];

function ParentScreens({
  showTarget,
  transition,
  sourceParent,
  targetParent,
  targetChild = styles.fill,
  overflowingChild = false,
}: {
  showTarget: boolean;
  transition: SharedTransition;
  sourceParent: ViewStyle;
  targetParent: ViewStyle;
  targetChild?: ViewStyle;
  overflowingChild?: boolean;
}) {
  const sourceRef = useTestRef('source');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <View style={sourceParent}>
          <Animated.View
            ref={sourceRef}
            sharedTransitionTag="box"
            sharedTransitionStyle={transition}
            style={styles.fill}>
            {overflowingChild && <View style={styles.overflowing} />}
          </Animated.View>
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

// The view that clips the moving view has no React ref. The view inside each clip follows it in tag order.
function mountedClips() {
  return runOnUIBlocking(() => {
    'worklet';
    const clips = [];
    for (let offset = 0; offset < CLIP_TAG_RANGE; offset += 4) {
      const props = global._obtainMountedViewProps(
        FIRST_CLIP_TAG + offset,
        false
      );
      if (props) {
        clips.push(props);
      }
    }
    return clips;
  });
}

async function mountedSourceOpacity() {
  return (await getTestComponent('source').getMountedViewProps())?.opacity;
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

type RecordedValues = Pick<
  SharedTransitionAnimationsValues,
  | 'currentWidth'
  | 'targetWidth'
  | 'targetOriginX'
  | 'targetGlobalOriginX'
  | 'currentBackgroundColor'
  | 'windowWidth'
> & { hasBorderTopLeftRadius: boolean };

function createRecordingTransition(recorded: RecordedValues[]) {
  const record = (values: RecordedValues) => recorded.push(values);
  const finish = () => notify('shared-transition-finished');
  return SharedTransition.custom((values) => {
    'worklet';
    scheduleOnRN(record, {
      currentWidth: values.currentWidth,
      targetWidth: values.targetWidth,
      targetOriginX: values.targetOriginX,
      targetGlobalOriginX: values.targetGlobalOriginX,
      currentBackgroundColor: values.currentBackgroundColor,
      windowWidth: values.windowWidth,
      hasBorderTopLeftRadius: 'currentBorderTopLeftRadius' in values,
    });
    return { width: withTiming(values.targetWidth, { duration: 100 }) };
  }).withCallback(() => {
    'worklet';
    scheduleOnRN(finish);
  });
}

function createProgressTransition(progresses: number[]) {
  const record = (progress: number) => progresses.push(progress);
  const finish = () => notify('shared-transition-finished');
  return SharedTransition.progressAnimation((values, progress) => {
    'worklet';
    scheduleOnRN(record, progress);
    return {
      width:
        values.currentWidth +
        progress * (values.targetWidth - values.currentWidth),
    };
  })
    .duration(300)
    .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION)
    .withCallback(() => {
      'worklet';
      scheduleOnRN(finish);
    });
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

  test('runs a transition between views that do not differ', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(finished);
    await render(
      <IdenticalScreens targetActive={false} transition={transition} />
    );
    await waitForFrames();

    await render(<IdenticalScreens targetActive transition={transition} />);
    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(finished).toBe([true]);
    await expectMountedAtLayout('identical-target', 1);
  });

  test('passes the source and target snapshots to a custom animation', async () => {
    const recorded: RecordedValues[] = [];
    const transition = createRecordingTransition(recorded);
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await waitForNotification('shared-transition-finished');

    expect(recorded.length).toBe(1);
    const [values] = recorded;
    expect(values.currentWidth).toBe(60, ComparisonMode.PIXEL);
    expect(values.targetWidth).toBe(150, ComparisonMode.PIXEL);
    expect(values.targetGlobalOriginX).toBe(
      values.targetOriginX,
      ComparisonMode.PIXEL
    );
    expect(values.currentBackgroundColor).toBe('rgba(221, 85, 34, 1)');
    expect(values.windowWidth > 0).toBe(true);
    expect(values.hasBorderTopLeftRadius).toBe(false);
  });

  test('runs a custom animation defined outside the worklet', async () => {
    const finished: boolean[] = [];
    const width = withTiming(150, { duration: 100000 });
    const transition = createTransition(
      finished,
      SharedTransition.custom(() => {
        'worklet';
        return { width };
      }).reduceMotion(ReduceMotion.Always)
    );
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(finished).toBe([true]);
    await expectMountedAtLayout('target', 1);
  });

  test('drives a PROGRESS_ANIMATION transition from 0 to 1', async () => {
    const progresses: number[] = [];
    const transition = createProgressTransition(progresses);
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(progresses[0]).toBe(0);
    expect(progresses[progresses.length - 1]).toBe(1);
    expect(
      progresses.every(
        (progress, index) => index === 0 || progress >= progresses[index - 1]
      )
    ).toBe(true);
    await expectMountedAtLayout('target', 1);
  });
  test('carries the opacity of the source ancestors without a clip', async () => {
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
    expect(await mountedSourceOpacity()).toBeWithinRange(0.45, 0.6);
    expect((await mountedClips()).length).toBe(0);

    await wait(600);
    expect(await mountedSourceOpacity()).toBeWithinRange(0.65, 0.98);

    await waitForNotification('shared-transition-finished');
    expect(finished).toBe([true]);
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
    expect(await mountedSourceOpacity()).toBeWithinRange(0.5, 0.8);

    await waitForNotification('shared-transition-finished');
    expect(finished).toBe([true]);
  });

  test('moves the source inside a clip and removes the clip at the end', async () => {
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
    const clips = await mountedClips();
    expect(clips.length).toBe(1);
    expect(clips[0].width).toBeWithinRange(100, 140);

    await waitForNotification('shared-transition-finished');
    await waitForFrames();
    expect(finished).toBe([true]);
    expect((await mountedClips()).length).toBe(0);
    await expectMountedAtLayout('source', 0);
  });

  test.each([
    ['fits the unclipped end of the clip to a childless view', false, 100, 160],
    [
      'keeps the window as the unclipped end for overflowing children',
      true,
      200,
      10000,
    ],
  ] as const)('${0}', async ([, overflowingChild, minWidth, maxWidth]) => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.duration(1000)
    );
    const props = {
      transition,
      sourceParent: styles.clippingParent,
      targetParent: styles.farParent,
      overflowingChild,
    };
    await render(<ParentScreens {...props} showTarget={false} />);
    await waitForFrames();

    await render(<ParentScreens {...props} showTarget />);
    await wait(500);
    const clips = await mountedClips();
    expect(clips.length).toBe(1);
    expect(clips[0].width).toBeWithinRange(minWidth, maxWidth);

    await waitForNotification('shared-transition-finished');
    expect(finished).toBe([true]);
  });

  test('retargets the clip when only its target changes', async () => {
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
    const clipStartY = (await mountedClips())[0].y;

    await render(
      <ParentScreens
        {...props}
        showTarget
        targetParent={styles.fartherClippingParent}
      />
    );
    await wait(450);
    const clips = await mountedClips();
    expect(clips.length).toBe(1);
    expect(clips[0].y).toBeWithinRange(clipStartY + 301, clipStartY + 380);

    // The clip moves with the moving view, so both restart.
    await expectEventually(() => finished).toBe([false, true]);
    await waitForFrames();
    expect((await mountedClips()).length).toBe(0);
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  fill: { flex: 1, backgroundColor: '#dd5522' },
  overflowing: { width: 300, height: 20, backgroundColor: '#2277dd' },
  parent: { width: 100, height: 100 },
  dimmed: { opacity: 0.5 },
  farParent: { width: 150, height: 150, marginTop: 200 },
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
  identical: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 80,
    height: 80,
    backgroundColor: '#22aa55',
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
