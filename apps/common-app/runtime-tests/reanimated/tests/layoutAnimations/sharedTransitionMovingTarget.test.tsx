import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  advanceAnimationTimer,
  describe,
  expect,
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

const offset = makeMutable(0);
const transition = SharedTransition.duration(1200)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('moving-target-finished');
    }
  });

function Screens({ active, width = 90 }: { active: boolean; width?: number }) {
  const source = useTestRef('movingSource');
  const target = useTestRef('movingTarget');
  const parent = useTestRef('movingParent');
  const parentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="moving-target"
          sharedTransitionStyle={transition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View ref={parent} style={parentStyle}>
          <Animated.View
            ref={target}
            sharedTransitionTag="moving-target"
            sharedTransitionStyle={transition}
            style={[styles.target, { width }]}
          />
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

const completedTargets = makeMutable(0);
const coveringTransition = SharedTransition.duration(2400).easing(
  Easing.linear
);
const finalFrameTransition = SharedTransition.duration(600)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      offset.value = 100;
      notify('moving-final-frame-finished');
    }
  });

function FinalFrameScreens({ active }: { active: boolean }) {
  const innerSource = useTestRef('finalFrameSource');
  const parentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          sharedTransitionTag="final-frame-outer"
          sharedTransitionStyle={coveringTransition}
          style={{ width: 120, height: 120 }}>
          <Animated.View
            ref={innerSource}
            sharedTransitionTag="final-frame-inner"
            sharedTransitionStyle={finalFrameTransition}
            style={{ width: 30, height: 30, backgroundColor: 'red' }}
          />
        </Animated.View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View
          sharedTransitionTag="final-frame-outer"
          sharedTransitionStyle={coveringTransition}
          style={{ width: 240, height: 240, marginTop: 200 }}>
          <Animated.View style={parentStyle}>
            <Animated.View
              sharedTransitionTag="final-frame-inner"
              sharedTransitionStyle={finalFrameTransition}
              style={{ width: 60, height: 60, backgroundColor: 'blue' }}
            />
          </Animated.View>
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

const targetCount = 20;
const groupTransition = SharedTransition.duration(600).withCallback(
  (finished) => {
    'worklet';
    if (finished) {
      completedTargets.value += 1;
      if (completedTargets.value === targetCount) {
        notify('moving-target-group-finished');
      }
    }
  }
);

function GroupView({ index, target }: { index: number; target: boolean }) {
  const ref = useTestRef(`${target ? 'groupTarget' : 'groupSource'}${index}`);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={`moving-group-${index}`}
      sharedTransitionStyle={groupTransition}
      style={{ width: target ? 14 : 10, height: 10, backgroundColor: 'blue' }}
    />
  );
}

function GroupScreens({ active }: { active: boolean }) {
  const parentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  const indices = Array.from({ length: targetCount }, (_, index) => index);
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        {indices.map((index) => (
          <GroupView key={index} index={index} target={false} />
        ))}
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View style={parentStyle}>
          {indices.map((index) => (
            <GroupView key={index} index={index} target />
          ))}
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

async function setOffset(value: number) {
  scheduleOnUI(() => {
    offset.value = value;
  });
  await waitForFrames(3);
}

describe('Shared transition moving target', () => {
  test('keeps the final color when the target moves on the completion frame', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await setOffset(0);
    await render(<FinalFrameScreens active={false} />);
    await waitForFrames();
    await render(<FinalFrameScreens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    const before =
      await getTestComponent('finalFrameSource').getPresentedViewProps();
    expect(before?.backgroundColor).not.toBe('#0000ffff');
    await advanceAnimationTimer(300);
    await waitForNotification('moving-final-frame-finished');
    await waitForFrames(3);
    const completed =
      await getTestComponent('finalFrameSource').getPresentedViewProps();
    expect(completed?.width).toBe(60, ComparisonMode.PIXEL);
    expect(completed?.backgroundColor).toBe('#0000ffff');
    await advanceAnimationTimer(1800);
    await setOffset(0);
  });

  test('follows ancestor transforms without extending the run', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await setOffset(0);
    await render(<Screens active={false} />);
    await waitForFrames();
    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(300);
    const before =
      await getTestComponent('movingSource').getTransformObservation();
    await setOffset(100);
    await advanceAnimationTimer(300);
    const moved =
      await getTestComponent('movingSource').getTransformObservation();
    expect(
      !!before && !!moved && moved.translateX > before.translateX + 10
    ).toBe(true);
    await setOffset(200);
    await advanceAnimationTimer(600);
    await waitForNotification('moving-target-finished', 1000);
    const target =
      await getTestComponent('movingTarget').getPresentedViewProps();
    const parent =
      await getTestComponent('movingParent').getTransformObservation();
    expect(parent?.translateX).toBe(200, ComparisonMode.PIXEL);
    expect(target?.width).toBe(90, ComparisonMode.PIXEL);
    await setOffset(0);
  });

  test('uses a late target width at the original deadline', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await setOffset(0);
    await render(<Screens active={false} />);
    await waitForFrames();
    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(900);
    const before =
      await getTestComponent('movingSource').getPresentedViewProps();
    await render(<Screens active width={150} />);
    await waitForFrames(3);
    const after =
      await getTestComponent('movingSource').getPresentedViewProps();
    expect(after?.width).toBe(before?.width, ComparisonMode.PIXEL);
    await advanceAnimationTimer(300);
    await waitForNotification('moving-target-finished', 1000);
    const target =
      await getTestComponent('movingTarget').getPresentedViewProps();
    expect(target?.width).toBe(150, ComparisonMode.PIXEL);
  });

  test('updates twenty moving targets in the same batch', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await setOffset(0);
    scheduleOnUI(() => {
      completedTargets.value = 0;
    });
    await render(<GroupScreens active={false} />);
    await waitForFrames();
    await render(<GroupScreens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(150);
    await setOffset(100);
    await advanceAnimationTimer(150);
    for (let index = 0; index < targetCount; index += 1) {
      const transform = await getTestComponent(
        `groupSource${index}`
      ).getTransformObservation();
      expect((transform?.translateX ?? 0) > 10).toBe(true);
    }
    await setOffset(200);
    await advanceAnimationTimer(300);
    await waitForNotification('moving-target-group-finished', 1000);
    for (let index = 0; index < targetCount; index += 1) {
      const target = await getTestComponent(
        `groupTarget${index}`
      ).getPresentedViewProps();
      expect(target?.width).toBe(14, ComparisonMode.PIXEL);
    }
    await setOffset(0);
  });
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  source: { width: 30, height: 30, backgroundColor: 'red' },
  target: {
    marginLeft: 20,
    marginTop: 200,
    width: 90,
    height: 90,
    backgroundColor: 'blue',
  },
});
