import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const DURATION = 1200;

const transition = SharedTransition.duration(DURATION).withCallback(
  (finished) => {
    'worklet';
    if (finished) {
      notify('carrier-finished');
    }
  }
);

function Screens({ active }: { active: boolean }) {
  const source = useTestRef('source');
  const target = useTestRef('target');
  const other = useTestRef('other');
  const width = useSharedValue(50);
  useEffect(() => {
    if (active) {
      width.value = withTiming(150, {
        duration: DURATION,
        easing: Easing.linear,
      });
    }
  }, [active, width]);
  const otherStyle = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="animated-style"
          sharedTransitionStyle={transition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      {active && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            ref={target}
            sharedTransitionTag="animated-style"
            sharedTransitionStyle={transition}
            style={styles.target}
          />
        </SharedTransitionBoundary>
      )}
      <Animated.View ref={other} style={[styles.other, otherStyle]} />
    </View>
  );
}

function sampleWidths(sourceTag: number, otherTag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return {
      source: global._obtainMountedViewProps(sourceTag, false)?.width ?? null,
      other: global._obtainMountedViewProps(otherTag, false)?.width ?? null,
    };
  });
}

function isNear(value: number | null, expected: number) {
  return value !== null && Math.abs(value - expected) < 1;
}

describe('Shared transition next to another animation', () => {
  test('keeps another animated view moving and lands at the last frame', async () => {
    await mockAnimationTimer(false);
    await render(<Screens active={false} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const otherTag = getTestComponent('other').getTag();

    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    const quarter = await sampleWidths(sourceTag, otherTag);
    await advanceAnimationTimer(300);
    const half = await sampleWidths(sourceTag, otherTag);

    expect(isNear(quarter.other, 75)).toBe(true);
    expect(isNear(half.other, 100)).toBe(true);
    expect(
      quarter.source !== null &&
        half.source !== null &&
        quarter.source > 60 &&
        half.source > quarter.source &&
        half.source < 150
    ).toBe(true);

    await advanceAnimationTimer(DURATION - 600);
    const end = await sampleWidths(sourceTag, otherTag);
    expect(isNear(end.source, 150)).toBe(true);
    expect(isNear(end.other, 150)).toBe(true);

    await waitForNotification('carrier-finished');
    await expectEventually(async () => {
      const props = await getTestComponent('target').getMountedViewProps();
      return !!props && props.opacity === 1 && isNear(props.width, 150);
    }).toBe(true);
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
  other: { marginTop: 20, height: 20, backgroundColor: '#22aa55' },
});
