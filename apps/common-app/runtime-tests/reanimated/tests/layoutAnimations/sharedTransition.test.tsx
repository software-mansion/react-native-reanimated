import type { ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedTransitionAnimationsValues } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
  ReduceMotion,
  SharedTransition,
  SharedTransitionBoundary,
  SharedTransitionType,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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

function Target({
  transition,
  entering,
  isActive,
}: {
  transition: SharedTransition;
  entering?: FadeIn;
  isActive: boolean;
}) {
  const ref = useTestRef('target');
  return (
    <SharedTransitionBoundary isActive={isActive}>
      <Animated.View
        ref={ref}
        sharedTransitionTag="box"
        sharedTransitionStyle={transition}
        entering={entering}
        style={styles.target}
      />
    </SharedTransitionBoundary>
  );
}

function Screens({
  showTarget,
  transition,
  sourceTag = 'box',
  targetEntering,
  covered = false,
}: {
  showTarget: boolean;
  transition: SharedTransition;
  sourceTag?: string | null;
  targetEntering?: FadeIn;
  covered?: boolean;
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
      {showTarget && (
        <Target
          transition={transition}
          entering={targetEntering}
          isActive={!covered}
        />
      )}
      {covered && (
        <SharedTransitionBoundary isActive>
          <View collapsable={false} style={styles.cover} />
        </SharedTransitionBoundary>
      )}
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

type NativeIDCase = 'skipEntering' | 'nativeID';

function BoxWithoutReanimatedNativeID({
  nativeIDCase,
  name,
  transition,
  entering,
  style,
}: {
  nativeIDCase: NativeIDCase;
  name: string;
  transition: SharedTransition;
  entering?: FadeIn;
  style: ViewStyle;
}) {
  const ref = useTestRef(name);
  const box = (
    <Animated.View
      ref={ref}
      nativeID={nativeIDCase === 'nativeID' ? name : undefined}
      sharedTransitionTag="withoutNativeID"
      sharedTransitionStyle={transition}
      entering={entering}
      style={style}
    />
  );
  return nativeIDCase === 'skipEntering' ? (
    <LayoutAnimationConfig skipEntering>{box}</LayoutAnimationConfig>
  ) : (
    box
  );
}

function ScreensWithoutReanimatedNativeID({
  nativeIDCase,
  targetActive,
  transition,
  entering,
}: {
  nativeIDCase: NativeIDCase;
  targetActive: boolean;
  transition: SharedTransition;
  entering?: FadeIn;
}) {
  const props = { nativeIDCase, transition, entering };
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!targetActive}>
        <BoxWithoutReanimatedNativeID
          {...props}
          name="sourceWithoutNativeID"
          style={styles.source}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={targetActive}>
        <BoxWithoutReanimatedNativeID
          {...props}
          name="targetWithoutNativeID"
          style={styles.target}
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

  test('runs in place of the entering animation of the target', async () => {
    const finished: boolean[] = [];
    const entered: boolean[] = [];
    const recordEntering = (isFinished: boolean) => entered.push(isFinished);
    const transition = createTransition(finished);
    const targetEntering = FadeIn.duration(10000).withCallback((isFinished) => {
      'worklet';
      scheduleOnRN(recordEntering, isFinished);
    });
    const props = { transition, targetEntering };
    await render(<Screens {...props} showTarget={false} />);
    await waitForFrames();

    await render(<Screens {...props} showTarget />);
    await waitForNotification('shared-transition-finished');
    await waitForFrames();

    expect(finished).toBe([true]);
    await expectMountedAtLayout('target', 1);
    expect(entered).toBe([]);
  });

  test('does not play the entering animation of a target whose transition stops', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const entered: boolean[] = [];
    const recordEntering = (isFinished: boolean) => entered.push(isFinished);
    const transition = createTransition([]);
    const targetEntering = FadeIn.duration(300).withCallback((isFinished) => {
      'worklet';
      scheduleOnRN(recordEntering, isFinished);
    });
    const props = { transition, targetEntering };
    await render(<Screens {...props} showTarget={false} />);
    await waitForFrames();
    await render(<Screens {...props} showTarget />);
    await waitForFrames(3);
    await advanceAnimationTimer(150);

    // The new active boundary has no match, so the run stops and the target shows in its place.
    await render(<Screens {...props} showTarget covered />);
    await waitForFrames(3);
    await expectMountedAtLayout('target', 1);

    await advanceAnimationTimer(600);
    await expectMountedAtLayout('target', 1);
    expect(entered).toBe([]);
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

  test('leaves reduced-motion views untagged', async () => {
    const finished: boolean[] = [];
    const transition = createTransition(
      finished,
      SharedTransition.reduceMotion(ReduceMotion.Always).fadeContent()
    );
    await render(<Screens showTarget={false} transition={transition} />);
    await waitForFrames();

    await render(<Screens showTarget transition={transition} />);
    await waitForFrames(3);

    expect(finished).toBe([]);
    await expectMountedAtLayout('source', 1);
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
    const width = withTiming(150, { duration: 100 });
    const transition = createTransition(
      finished,
      SharedTransition.custom(() => {
        'worklet';
        return { width };
      }).reduceMotion(ReduceMotion.Never)
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
});

// Both boundaries are on screen, like a list under a sheet. The row is under the inactive one.
function InactiveBoundaryScreens({
  rowMounted,
  nested = false,
  topTagged = false,
  rowActive = false,
  topTag = 'inactive-boundary-row',
  transition = SharedTransition.duration(300),
}: {
  rowMounted: boolean;
  nested?: boolean;
  topTagged?: boolean;
  rowActive?: boolean;
  topTag?: string;
  transition?: SharedTransition;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!rowActive}>
        {topTagged && (
          <InactiveBoundaryTop tag={topTag} transition={transition} />
        )}
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={rowActive}>
        {rowMounted && (
          <InactiveBoundaryRow nested={nested} transition={transition} />
        )}
      </SharedTransitionBoundary>
    </View>
  );
}

function InactiveBoundaryTop({
  tag,
  transition,
}: {
  tag: string;
  transition: SharedTransition;
}) {
  const ref = useTestRef('inactive-boundary-top');
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={tag}
      sharedTransitionStyle={transition}
      style={styles.source}
    />
  );
}

function InactiveBoundaryRow({
  nested,
  transition,
}: {
  nested: boolean;
  transition: SharedTransition;
}) {
  const ref = useTestRef('inactive-boundary-row');
  const view = (
    <Animated.View
      ref={ref}
      sharedTransitionTag="inactive-boundary-row"
      sharedTransitionStyle={transition}
      style={styles.target}
    />
  );
  return nested ? <View collapsable={false}>{view}</View> : view;
}

// The second page mounts while the first one is focused. Both pages are on screen.
function Pager({
  secondPageMounted,
  secondPageFocused = false,
}: {
  secondPageMounted: boolean;
  secondPageFocused?: boolean;
}) {
  return (
    <View style={[styles.container, styles.pages]}>
      <View style={styles.page}>
        <SharedTransitionBoundary isActive={!secondPageFocused}>
          <Animated.View
            sharedTransitionTag="pager-first-photo"
            style={styles.source}
          />
        </SharedTransitionBoundary>
      </View>
      {secondPageMounted && <SecondPage focused={secondPageFocused} />}
    </View>
  );
}

function SecondPage({ focused }: { focused: boolean }) {
  const photo = useTestRef('pager-second-photo');
  const caption = useTestRef('pager-second-caption');
  return (
    <View style={styles.page}>
      <SharedTransitionBoundary isActive={focused}>
        <Animated.View
          ref={photo}
          sharedTransitionTag="pager-second-photo"
          style={styles.source}
        />
        <View collapsable={false}>
          <Animated.View
            ref={caption}
            sharedTransitionTag="pager-second-caption"
            style={styles.cover}
          />
        </View>
      </SharedTransitionBoundary>
    </View>
  );
}

async function expectOpacityForFrames(name: string, opacity: number) {
  for (let frame = 0; frame < 4; frame++) {
    expect((await getTestComponent(name).getMountedViewProps())?.opacity).toBe(
      opacity
    );
    await waitForFrames(1);
  }
}

describe('Shared view that mounts under an inactive boundary', () => {
  test.each([
    ['top-level', false],
    ['nested', true],
  ] as const)(
    'shows a ${0} view whose tag the top screen does not show',
    async ([, nested]) => {
      await render(
        <InactiveBoundaryScreens rowMounted={false} nested={nested} />
      );
      await waitForFrames();
      await render(<InactiveBoundaryScreens rowMounted nested={nested} />);
      await waitForFrames(3);
      await expectOpacityForFrames('inactive-boundary-row', 1);
    }
  );

  test.each([
    ['top-level', false],
    ['nested', true],
  ] as const)(
    'hides a ${0} view whose tag the top screen shows',
    async ([, nested]) => {
      const props = { nested, topTagged: true };
      await render(<InactiveBoundaryScreens {...props} rowMounted={false} />);
      await waitForFrames();
      await render(<InactiveBoundaryScreens {...props} rowMounted />);
      await waitForFrames(3);
      await expectOpacityForFrames('inactive-boundary-row', 0);
      await expectOpacityForFrames('inactive-boundary-top', 1);
    }
  );

  test('shows the hidden view when the top screen removes its tag', async () => {
    await render(<InactiveBoundaryScreens rowMounted topTagged />);
    await waitForFrames(3);
    await expectOpacityForFrames('inactive-boundary-row', 0);
    await render(<InactiveBoundaryScreens rowMounted />);
    await expectEventually(
      async () =>
        (await getTestComponent('inactive-boundary-row').getMountedViewProps())
          ?.opacity
    ).toBe(1);
  });

  test('shows the hidden view when the top view changes its tag', async () => {
    const transition = SharedTransition.duration(300);
    const props = { rowMounted: true, topTagged: true, transition };
    await render(<InactiveBoundaryScreens {...props} />);
    await waitForFrames(3);
    await expectOpacityForFrames('inactive-boundary-row', 0);
    await render(<InactiveBoundaryScreens {...props} topTag="other-tag" />);
    await expectEventually(
      async () =>
        (await getTestComponent('inactive-boundary-row').getMountedViewProps())
          ?.opacity
    ).toBe(1);
    await expectOpacityForFrames('inactive-boundary-top', 1);
  });

  test('hides the target in flight when the top screen mounts its tag later', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const finished: boolean[] = [];
    const transition = createTransition(finished);
    await render(
      <InactiveBoundaryScreens rowMounted transition={transition} />
    );
    await waitForFrames(3);
    await render(
      <InactiveBoundaryScreens rowMounted topTagged transition={transition} />
    );
    await waitForFrames(3);
    await expectOpacityForFrames('inactive-boundary-row', 1);
    await expectOpacityForFrames('inactive-boundary-top', 1);

    await render(
      <InactiveBoundaryScreens
        rowMounted
        topTagged
        rowActive
        transition={transition}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(150);
    await expectOpacityForFrames('inactive-boundary-row', 0);

    await advanceAnimationTimer(600);
    await waitForNotification('shared-transition-finished');
    expect(finished).toBe([true]);
    await expectMountedAtLayout('inactive-boundary-row', 1);
    await expectMountedAtLayout('inactive-boundary-top', 0);
  });

  test('shows the views of a page that mounts while another page is focused', async () => {
    await render(<Pager secondPageMounted={false} />);
    await waitForFrames();
    await render(<Pager secondPageMounted />);
    await waitForFrames(3);
    await expectOpacityForFrames('pager-second-photo', 1);
    await expectOpacityForFrames('pager-second-caption', 1);

    await render(<Pager secondPageMounted secondPageFocused />);
    await waitForFrames(3);
    await expectOpacityForFrames('pager-second-photo', 1);
    await expectOpacityForFrames('pager-second-caption', 1);
  });
});

describe('Shared element transition of views without the Reanimated native ID', () => {
  test.each(['skipEntering', 'nativeID'] as const)(
    'runs between views rendered with %s',
    async (nativeIDCase) => {
      const finished: boolean[] = [];
      const entered: boolean[] = [];
      const recordEntering = (isFinished: boolean) => entered.push(isFinished);
      const transition = createTransition(finished);
      const entering = FadeIn.duration(100).withCallback((isFinished) => {
        'worklet';
        scheduleOnRN(recordEntering, isFinished);
      });
      const props = { nativeIDCase, transition, entering };
      await render(
        <ScreensWithoutReanimatedNativeID {...props} targetActive={false} />
      );
      await waitForFrames();

      await render(
        <ScreensWithoutReanimatedNativeID {...props} targetActive />
      );
      await waitForNotification('shared-transition-finished');
      await waitForFrames();

      expect(finished).toBe([true]);
      await expectMountedAtLayout('targetWithoutNativeID', 1);
      if (nativeIDCase === 'skipEntering') {
        expect(entered).toBe([]);
      }
    }
  );
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
  cover: { width: 20, height: 20 },
  pages: { flexDirection: 'row' },
  page: { width: 150 },
  target: {
    marginTop: 200,
    marginLeft: 100,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
