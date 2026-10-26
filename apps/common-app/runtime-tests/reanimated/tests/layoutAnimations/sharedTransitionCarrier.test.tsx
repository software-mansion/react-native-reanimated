import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

function Target({
  transition,
  opacity,
}: {
  transition: SharedTransition;
  opacity: number;
}) {
  const target = useTestRef('target');
  const targetChild = useTestRef('targetChild');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={target}
        sharedTransitionTag="carrier"
        sharedTransitionStyle={transition}
        style={[styles.target, { opacity }]}>
        <View ref={targetChild} collapsable={false} style={styles.child} />
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

function Screens({
  active,
  transition,
  removeSource = false,
  targetOpacity = 1,
}: {
  active: boolean;
  transition: SharedTransition;
  removeSource?: boolean;
  targetOpacity?: number;
}) {
  const source = useTestRef('source');
  const sourceChild = useTestRef('sourceChild');
  return (
    <View style={styles.container}>
      {!(active && removeSource) && (
        <SharedTransitionBoundary isActive={!active}>
          <Animated.View
            ref={source}
            sharedTransitionTag="carrier"
            sharedTransitionStyle={transition}
            style={styles.source}>
            <View ref={sourceChild} collapsable={false} style={styles.child} />
          </Animated.View>
        </SharedTransitionBoundary>
      )}
      {active && <Target transition={transition} opacity={targetOpacity} />}
    </View>
  );
}

function transitionWithNotification() {
  return SharedTransition.duration(1200).withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('carrier-finished');
    }
  });
}

async function expectMoving(name: string) {
  await expectEventually(async () => {
    const props = await getTestComponent(name).getMountedViewProps();
    return (
      !!props && props.opacity > 0 && props.width > 65 && props.width < 145
    );
  }).toBe(true);
}

async function expectAtHome(name: string, width: number, opacity: number) {
  await expectEventually(async () => {
    const props = await getTestComponent(name).getMountedViewProps();
    return (
      !!props &&
      Math.abs(props.width - width) < 0.5 &&
      Math.abs(props.opacity - opacity) < 0.01
    );
  }).toBe(true);
}

describe('Shared transition moves a real native view', () => {
  test('moves the source with its untagged child and keeps the target hidden', async () => {
    const transition = transitionWithNotification();
    await render(<Screens active={false} transition={transition} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} />);
    await expectMoving('source');
    expect(getTestComponent('source').getTag()).toBe(sourceTag);
    expect(getTestComponent('sourceChild').getTag()).toBe(childTag);
    const child = await getTestComponent('sourceChild').getMountedViewProps();
    expect(child?.width).toBe(20, ComparisonMode.PIXEL);
    expect(child?.height).toBe(15, ComparisonMode.PIXEL);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);

    await render(
      <Screens active transition={transition} targetOpacity={0.7} />
    );
    await waitForFrames();
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await waitForNotification('carrier-finished');
    await expectAtHome('source', 60, 0);
    await expectAtHome('target', 150, 0.7);
    expect(getTestComponent('sourceChild').getTag()).toBe(childTag);
  });

  test('moves the target when React removes the source in the same update', async () => {
    const transition = transitionWithNotification();
    await render(
      <Screens active={false} transition={transition} removeSource />
    );
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const childTag = getTestComponent('sourceChild').getTag();

    await render(<Screens active transition={transition} removeSource />);
    await expectMoving('target');
    const targetTag = getTestComponent('target').getTag();
    const targetChild = getTestComponent('targetChild');
    const targetChildTag = targetChild.getTag();
    expect((await targetChild.getMountedViewProps())?.width).toBe(
      20,
      ComparisonMode.PIXEL
    );

    await waitForNotification('carrier-finished');
    await expectAtHome('target', 150, 1);
    expect(getTestComponent('target').getTag()).toBe(targetTag);
    expect(getTestComponent('targetChild').getTag()).toBe(targetChildTag);
    await expectEventually(() => isViewMountedNatively(sourceTag)).toBe(false);
    await expectEventually(() => isViewMountedNatively(childTag)).toBe(false);
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
  child: { width: 20, height: 15, backgroundColor: '#ffffff' },
});
