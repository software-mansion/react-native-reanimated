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

function Screens({
  active,
  targetMounted = true,
}: {
  active: boolean;
  targetMounted?: boolean;
}) {
  const source = useTestRef('source');
  const target = useTestRef('target');
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
          {targetMounted && (
            <Animated.View
              ref={target}
              sharedTransitionTag="removed-target"
              sharedTransitionStyle={transition}
              style={styles.target}
            />
          )}
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

async function sourceWidth() {
  return (await getTestComponent('source').getMountedViewProps())?.width;
}

describe('Shared transition with a removed target', () => {
  test('moves to the last target frame before the source jumps back', async () => {
    await mockAnimationTimer(false);
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
    await expectEventually(async () => {
      const props = await getTestComponent('source').getMountedViewProps();
      return !!props && props.opacity === 1 && Math.abs(props.width - 60) < 0.5;
    }).toBe(true);
  });
});

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
});
