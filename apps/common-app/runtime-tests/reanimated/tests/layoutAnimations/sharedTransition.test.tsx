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
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
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
