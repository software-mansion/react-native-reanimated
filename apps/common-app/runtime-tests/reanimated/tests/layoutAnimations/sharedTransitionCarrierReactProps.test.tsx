import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
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
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const DURATION = 1200;
const START_COLOR = '#dd5522';
const NEW_COLOR = '#22aa55';

function notifyFinished(finished: boolean) {
  'worklet';
  if (finished) {
    notify('react-props-finished');
  }
}

const geometryTransition = SharedTransition.custom((values) => {
  'worklet';
  const config = { duration: DURATION, easing: Easing.linear };
  return {
    width: withTiming(values.targetWidth, config),
    height: withTiming(values.targetHeight, config),
    originX: withTiming(values.targetOriginX, config),
    originY: withTiming(values.targetOriginY, config),
  };
}).withCallback(notifyFinished);

const builtInTransition = SharedTransition.duration(DURATION)
  .easing(Easing.linear)
  .withCallback(notifyFinished);

function Screens({
  active,
  transition,
  sourceColor = START_COLOR,
}: {
  active: boolean;
  transition: SharedTransition;
  sourceColor?: string;
}) {
  const source = useTestRef('source');
  const target = useTestRef('target');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="react-props"
          sharedTransitionStyle={transition}
          style={[styles.source, { backgroundColor: sourceColor }]}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View
          ref={target}
          sharedTransitionTag="react-props"
          sharedTransitionStyle={transition}
          style={styles.target}
        />
      </SharedTransitionBoundary>
    </View>
  );
}

function carrierProps(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
}

async function startHalfway(transition: SharedTransition) {
  await mockAnimationTimer({ autoAdvance: false });
  await render(<Screens active={false} transition={transition} />);
  await waitForFrames();
  const carrierTag = getTestComponent('source').getTag();
  await render(<Screens active transition={transition} />);
  await waitForFrames(3);
  await advanceAnimationTimer(DURATION / 2);
  expect((await carrierProps(carrierTag))?.width).toBe(
    105,
    ComparisonMode.PIXEL
  );
  return carrierTag;
}

describe('Shared transition shows React props of the moving view', () => {
  test('shows a style that the transition does not animate before landing', async () => {
    const carrierTag = await startHalfway(geometryTransition);

    await render(
      <Screens active transition={geometryTransition} sourceColor={NEW_COLOR} />
    );
    await expectEventually(
      async () => (await carrierProps(carrierTag))?.backgroundColor
    ).toBe(NEW_COLOR, ComparisonMode.COLOR);
    expect((await carrierProps(carrierTag))?.width).toBe(
      105,
      ComparisonMode.PIXEL
    );

    await advanceAnimationTimer(DURATION / 4);
    const carrier = await carrierProps(carrierTag);
    expect(carrier?.width).toBe(127.5, ComparisonMode.PIXEL);
    expect(carrier?.backgroundColor).toBe(NEW_COLOR, ComparisonMode.COLOR);

    await advanceAnimationTimer(DURATION / 4);
    await waitForNotification('react-props-finished');
    await expectEventually(
      async () =>
        (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(1);
    expect(
      (await getTestComponent('source').getMountedViewProps())?.backgroundColor
    ).toBe(NEW_COLOR, ComparisonMode.COLOR);
  });

  test('keeps animating a style that the transition animates', async () => {
    const carrierTag = await startHalfway(builtInTransition);
    const halfway = (await carrierProps(carrierTag))?.backgroundColor;
    expect(halfway).not.toBe(START_COLOR, ComparisonMode.COLOR);

    await render(
      <Screens active transition={builtInTransition} sourceColor={NEW_COLOR} />
    );
    await waitForFrames(3);
    expect((await carrierProps(carrierTag))?.backgroundColor).toBe(
      halfway,
      ComparisonMode.COLOR
    );

    await advanceAnimationTimer(DURATION / 2);
    await waitForNotification('react-props-finished');
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  source: { width: 60, height: 60 },
  target: {
    marginTop: 100,
    marginLeft: 60,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
