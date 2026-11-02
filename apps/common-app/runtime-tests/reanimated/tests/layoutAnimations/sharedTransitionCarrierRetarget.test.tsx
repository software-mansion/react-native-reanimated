import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
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

const DURATION = 1200;

const transition = SharedTransition.duration(DURATION)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('carrier-finished');
    }
  });

function TaggedView({
  name,
  sharedTag,
  style,
}: {
  name: string;
  sharedTag: string;
  style: StyleProp<ViewStyle>;
}) {
  const ref = useTestRef(name);
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag={sharedTag}
      sharedTransitionStyle={transition}
      style={style}
    />
  );
}

function RemovedSourceScreens({
  active,
  targetWidth = 150,
}: {
  active: boolean;
  targetWidth?: number;
}) {
  return (
    <View style={styles.container}>
      {!active && (
        <SharedTransitionBoundary isActive>
          <TaggedView
            name="source"
            sharedTag="retarget"
            style={styles.source}
          />
        </SharedTransitionBoundary>
      )}
      {active && (
        <SharedTransitionBoundary isActive>
          <TaggedView
            name="target"
            sharedTag="retarget"
            style={[styles.target, { width: targetWidth }]}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

function RenamedCarrierScreens({
  active,
  renamed = false,
}: {
  active: boolean;
  renamed?: boolean;
}) {
  const sourceScreen = useTestRef('sourceScreen');
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <View ref={sourceScreen} collapsable={false}>
          <TaggedView
            name="source"
            sharedTag={renamed ? 'renamed' : 'carrier'}
            style={styles.source}
          />
          {renamed && (
            <TaggedView
              name="newSource"
              sharedTag="carrier"
              style={styles.source}
            />
          )}
        </View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <TaggedView name="target" sharedTag="carrier" style={styles.target} />
      </SharedTransitionBoundary>
    </View>
  );
}

async function mountedWidth(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.width;
}

describe('Shared transition carrier changes during a run', () => {
  test('retargets the carrier when it is the target view', async () => {
    await mockAnimationTimer(false);
    await render(<RemovedSourceScreens active={false} />);
    await waitForFrames();

    await render(<RemovedSourceScreens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('target')).toBe(105, ComparisonMode.PIXEL);

    await render(<RemovedSourceScreens active targetWidth={205} />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('target')).toBe(155, ComparisonMode.PIXEL);

    await advanceAnimationTimer(DURATION / 2);
    await waitForNotification('carrier-finished');
    await expectEventually(async () => {
      const props = await getTestComponent('target').getMountedViewProps();
      return (
        !!props && props.opacity === 1 && Math.abs(props.width - 205) < 0.5
      );
    }).toBe(true);
  });

  test('returns a moving carrier whose shared tag changes and moves the new pair', async () => {
    await mockAnimationTimer(false);
    await render(<RenamedCarrierScreens active={false} />);
    await waitForFrames();

    await render(<RenamedCarrierScreens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('source')).toBe(105, ComparisonMode.PIXEL);

    await render(<RenamedCarrierScreens active={false} renamed />);
    await waitForFrames(3);
    const source = await getTestComponent('source').getMountedViewProps();
    expect(source?.width).toBe(60, ComparisonMode.PIXEL);
    expect(source?.opacity).toBe(1);
    expect(
      await RuntimeTestObserver?.observeParent(
        getTestComponent('source').getTag()
      )
    ).toBe(getTestComponent('sourceScreen').getTag());

    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('target')).toBe(105, ComparisonMode.PIXEL);

    await advanceAnimationTimer(DURATION / 2);
    await waitForNotification('carrier-finished');
    await expectEventually(async () => {
      const props = await getTestComponent('newSource').getMountedViewProps();
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
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
