import { StyleSheet, Text, View } from 'react-native';
import Animated, {
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

function createTransition(finished: boolean[]) {
  const recordEnd = (isFinished: boolean) => {
    finished.push(isFinished);
    notify('shared-transition-finished');
  };
  return SharedTransition.duration(300).withCallback((isFinished) => {
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
}: {
  showTarget: boolean;
  transition: SharedTransition;
}) {
  const sourceRef = useTestRef('source');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <Animated.View
          ref={sourceRef}
          sharedTransitionTag="box"
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
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: {
    marginTop: 200,
    marginLeft: 100,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
