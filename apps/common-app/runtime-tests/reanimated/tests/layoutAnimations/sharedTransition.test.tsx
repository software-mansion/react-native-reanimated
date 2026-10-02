import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  render,
  test,
  wait,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

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

function Screens({
  showTarget,
  transition,
}: {
  showTarget: boolean;
  transition: SharedTransition;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!showTarget}>
        <Animated.View
          sharedTransitionTag="box"
          sharedTransitionStyle={transition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      {showTarget && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="box"
            sharedTransitionStyle={transition}
            style={styles.target}
          />
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

    // ReJest can only read the shadow tree: getViewProp, _obtainProp and measure all use
    // the newest shadow node clone. The transition's frames and the hiding and restoring of
    // the shared views exist only in the mutations sent to the platform, so this test cannot
    // check what is displayed. It checks that the transition runs to completion.
    expect(finished).toBe([true]);
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
