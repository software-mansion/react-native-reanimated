import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { Screen, ScreenContainer } from 'react-native-screens';

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

// A reversal makes the moving source view the target of the run.
function ReversedScreens({
  active,
  sourceWidth = 60,
}: {
  active: boolean;
  sourceWidth?: number;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <TaggedView
          name="source"
          sharedTag="retarget"
          style={[styles.source, { width: sourceWidth }]}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <TaggedView name="target" sharedTag="retarget" style={styles.target} />
      </SharedTransitionBoundary>
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

// The container detaches its inactive screen, like a native stack that has not shown a pushed screen yet.
function OffWindowTargetScreens({
  active,
}: {
  active: 'source' | 'offWindow' | 'target';
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={active === 'source'}>
        <TaggedView
          name="source"
          sharedTag="off-window"
          style={styles.source}
        />
      </SharedTransitionBoundary>
      <ScreenContainer style={StyleSheet.absoluteFill}>
        <Screen enabled activityState={0} style={StyleSheet.absoluteFill}>
          <SharedTransitionBoundary isActive={active === 'offWindow'}>
            <TaggedView
              name="offWindowTarget"
              sharedTag="off-window"
              style={styles.target}
            />
          </SharedTransitionBoundary>
        </Screen>
      </ScreenContainer>
      <SharedTransitionBoundary isActive={active === 'target'}>
        <TaggedView
          name="target"
          sharedTag="off-window"
          style={styles.secondTarget}
        />
      </SharedTransitionBoundary>
    </View>
  );
}

async function mountedWidth(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.width;
}

describe('Shared transition carrier changes during a run', () => {
  const observerTest = RuntimeTestObserver ? test : test.skip;

  test('retargets the carrier when it is the target view', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<ReversedScreens active={false} />);
    await waitForFrames();

    await render(<ReversedScreens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('source')).toBe(105, ComparisonMode.PIXEL);

    await render(<ReversedScreens active={false} />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    const reversing = await mountedWidth('source');
    expect(reversing).toBeWithinRange(61, 104);

    // Without the retarget, the carrier would land at width 60 after the next half run.
    await render(<ReversedScreens active={false} sourceWidth={160} />);
    await waitForFrames(3);
    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('source')).toBeWithinRange(
      (reversing ?? 0) + 1,
      159
    );

    await advanceAnimationTimer(DURATION / 2);
    await waitForNotification('carrier-finished');
    await expectEventually(async () => {
      const props = await getTestComponent('source').getMountedViewProps();
      return (
        !!props && props.opacity === 1 && Math.abs(props.width - 160) < 0.5
      );
    }).toBe(true);
  });

  const iosTest = Platform.OS === 'ios' ? test : test.skip;

  iosTest('moves on to a new target from a target off the window', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<OffWindowTargetScreens active="source" />);
    await waitForFrames();
    await render(<OffWindowTargetScreens active="offWindow" />);
    await waitForFrames(3);

    await render(<OffWindowTargetScreens active="target" />);
    await waitForFrames(3);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await advanceAnimationTimer(DURATION / 2);
    expect(await mountedWidth('source')).toBeWithinRange(61, 199);

    await advanceAnimationTimer(DURATION / 2);
    await waitForNotification('carrier-finished');
    await expectEventually(async () => {
      const props = await getTestComponent('target').getMountedViewProps();
      return (
        !!props && props.opacity === 1 && Math.abs(props.width - 200) < 0.5
      );
    }).toBe(true);
  });

  observerTest(
    'returns a moving carrier whose shared tag changes and moves the new pair',
    async () => {
      await mockAnimationTimer({ autoAdvance: false });
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
        await RuntimeTestObserver!.observeParent(
          getTestComponent('source').getTag()
        )
      ).toBe(getTestComponent('sourceScreen').getTag());

      await advanceAnimationTimer(DURATION / 2);
      expect(await mountedWidth('target')).toBe(105, ComparisonMode.PIXEL);

      await advanceAnimationTimer(DURATION / 2);
      await waitForNotification('carrier-finished');
      await expectEventually(async () => {
        const props = await getTestComponent('newSource').getMountedViewProps();
        return (
          !!props && props.opacity === 1 && Math.abs(props.width - 60) < 0.5
        );
      }).toBe(true);
    }
  );
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
  secondTarget: {
    marginTop: 200,
    marginLeft: 40,
    width: 200,
    height: 120,
    backgroundColor: '#22aa55',
  },
});
