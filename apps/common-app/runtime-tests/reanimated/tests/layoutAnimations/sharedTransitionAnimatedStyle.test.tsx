import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { runOnUIAsync } from 'react-native-worklets';

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

const transition = SharedTransition.duration(DURATION)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('carrier-finished');
    }
  });

function Target() {
  const target = useTestRef('target');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={target}
        sharedTransitionTag="animated-style"
        sharedTransitionStyle={transition}
        style={styles.target}
      />
    </SharedTransitionBoundary>
  );
}

function Screens({ active }: { active: boolean }) {
  const source = useTestRef('source');
  const other = useTestRef('other');
  const width = useSharedValue(50);
  useEffect(() => {
    if (active) {
      width.value = withTiming(170, {
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
      {active && <Target />}
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

describe('Shared transition next to another animation', () => {
  test('keeps another animated view moving and ends the run on time', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Screens active={false} />);
    await waitForFrames();
    const sourceTag = getTestComponent('source').getTag();
    const otherTag = getTestComponent('other').getTag();

    await render(<Screens active />);
    await waitForFrames(3);
    await advanceAnimationTimer(400);
    const third = await sampleWidths(sourceTag, otherTag);
    expect(third.other).toBe(90, ComparisonMode.PIXEL);
    expect(third.source).toBe(90, ComparisonMode.PIXEL);

    await advanceAnimationTimer(600);
    const nearEnd = await sampleWidths(sourceTag, otherTag);
    expect(nearEnd.other).toBe(150, ComparisonMode.PIXEL);
    expect(nearEnd.source).toBe(135, ComparisonMode.PIXEL);

    await advanceAnimationTimer(DURATION - 1000);
    await waitForNotification('carrier-finished');
    await expectEventually(async () => {
      const props = await getTestComponent('target').getMountedViewProps();
      return (
        !!props && props.opacity === 1 && Math.abs(props.width - 150) < 0.5
      );
    }).toBe(true);
  });
});
const hidingTransition = SharedTransition.duration(DURATION)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('hiding-finished');
    }
  });

function OpacityView({
  name,
  opacity,
  style,
}: {
  name: string;
  opacity: SharedValue<number | null>;
  style: StyleProp<ViewStyle>;
}) {
  const ref = useTestRef(name);
  // null resets the opacity to its default value
  const opacityStyle = useAnimatedStyle(() => ({
    opacity: opacity.value as number,
  }));
  return (
    <Animated.View
      ref={ref}
      sharedTransitionTag="animated-opacity"
      sharedTransitionStyle={hidingTransition}
      style={[style, opacityStyle]}
    />
  );
}

function OpacityScreens({
  active,
  sourceOpacity,
  targetOpacity,
}: {
  active: boolean;
  sourceOpacity: SharedValue<number | null>;
  targetOpacity: SharedValue<number | null>;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <OpacityView
          name="opacity-source"
          opacity={sourceOpacity}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      {active && (
        <SharedTransitionBoundary isActive>
          <OpacityView
            name="opacity-target"
            opacity={targetOpacity}
            style={styles.target}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

async function mountedOpacity(name: string) {
  return (await getTestComponent(name).getMountedViewProps())?.opacity;
}

async function expectOpacityForFrames(name: string, opacity: number) {
  for (let frame = 0; frame < 6; frame++) {
    await waitForFrames();
    expect(await mountedOpacity(name)).toBe(opacity);
  }
}

describe('Shared transition of views with an animated opacity', () => {
  test('starts with the latest opacity written before the move', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const sourceOpacity = makeMutable<number | null>(0.4);
    const targetOpacity = makeMutable<number | null>(0.4);
    await render(
      <OpacityScreens
        active={false}
        sourceOpacity={sourceOpacity}
        targetOpacity={targetOpacity}
      />
    );
    await waitForFrames();
    sourceOpacity.value = 0.6;
    await expectEventually(() => mountedOpacity('opacity-source')).toBe(0.6);
    await render(
      <OpacityScreens
        active
        sourceOpacity={sourceOpacity}
        targetOpacity={targetOpacity}
      />
    );
    await waitForFrames(3);
    await expectOpacityForFrames('opacity-source', 0.6);
    await advanceAnimationTimer(DURATION);
    await waitForNotification('hiding-finished');
  });

  test('keeps hidden views at opacity 0 and shows the newest opacity at the end', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const sourceOpacity = makeMutable<number | null>(1);
    const targetOpacity = makeMutable<number | null>(1);
    await render(
      <OpacityScreens
        active={false}
        sourceOpacity={sourceOpacity}
        targetOpacity={targetOpacity}
      />
    );
    await waitForFrames();

    await render(
      <OpacityScreens
        active
        sourceOpacity={sourceOpacity}
        targetOpacity={targetOpacity}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(400);
    await runOnUIAsync(() => {
      targetOpacity.value = 0.5;
    });
    await expectOpacityForFrames('opacity-target', 0);

    await advanceAnimationTimer(DURATION);
    await waitForNotification('hiding-finished');
    await expectEventually(() => mountedOpacity('opacity-target')).toBe(0.5);
    await expectEventually(() => mountedOpacity('opacity-source')).toBe(0);

    await runOnUIAsync(() => {
      sourceOpacity.value = 0.5;
    });
    await expectOpacityForFrames('opacity-source', 0);
  });

  test('keeps a hidden view at opacity 0 when its opacity resets', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    const sourceOpacity = makeMutable<number | null>(1);
    const targetOpacity = makeMutable<number | null>(0.5);
    await render(
      <OpacityScreens
        active={false}
        sourceOpacity={sourceOpacity}
        targetOpacity={targetOpacity}
      />
    );
    await waitForFrames();

    await render(
      <OpacityScreens
        active
        sourceOpacity={sourceOpacity}
        targetOpacity={targetOpacity}
      />
    );
    await waitForFrames(3);
    await advanceAnimationTimer(400);
    await runOnUIAsync(() => {
      targetOpacity.value = null;
    });
    await expectOpacityForFrames('opacity-target', 0);

    await advanceAnimationTimer(DURATION);
    await waitForNotification('hiding-finished');
    await expectEventually(() => mountedOpacity('opacity-target')).toBe(1);
  });
});

function BackendOpacityTarget() {
  const target = useTestRef('backend-target');
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={target}
        sharedTransitionTag="backend-opacity"
        sharedTransitionStyle={hidingTransition}
        style={styles.target}
      />
    </SharedTransitionBoundary>
  );
}

function BackendOpacityScreens({
  active,
  revision = 0,
}: {
  active: boolean;
  revision?: number;
}) {
  const source = useTestRef('backend-source');
  return (
    <View
      style={styles.container}
      accessibilityLabel={`backend revision ${revision}`}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="backend-opacity"
          sharedTransitionStyle={hidingTransition}
          style={styles.source}
        />
      </SharedTransitionBoundary>
      {active && <BackendOpacityTarget />}
    </View>
  );
}

const backendTest =
  Platform.OS === 'android' && getStaticFeatureFlag('USE_ANIMATION_BACKEND')
    ? test
    : test.skip;

describe('Shared transition opacity from backend native events', () => {
  for (const flushFirst of [false, true]) {
    backendTest(
      `keeps the newest raw opacity across draw and safe events (flush first: ${flushFirst})`,
      async () => {
        await mockAnimationTimer({ autoAdvance: false });
        await render(<BackendOpacityScreens active={false} />);
        await waitForFrames();
        await render(<BackendOpacityScreens active />);
        await waitForFrames(3);
        await advanceAnimationTimer(400);
        const wrapper =
          getTestComponent('backend-target').getShadowNodeWrapper();
        const targetTag = getTestComponent('backend-target').getTag();
        const immediate = await runOnUIAsync(() => {
          'worklet';
          global._testAnimationBackendUpdate!(
            wrapper,
            { opacity: null, backgroundColor: -13408615 },
            true
          );
          const mounted = global._obtainMountedViewProps(targetTag, false);
          if (!flushFirst)
            global._testAnimationBackendUpdate!(
              wrapper,
              { opacity: 0.8 },
              false
            );
          return mounted;
        });
        expect(immediate?.opacity).toBe(0);
        expect(immediate?.backgroundColor).toBe('#336699ff');
        await expectOpacityForFrames('backend-target', 0);
        if (flushFirst) {
          await runOnUIAsync(() => {
            'worklet';
            global._testAnimationBackendUpdate!(
              wrapper,
              { opacity: 0.8 },
              false
            );
          });
        }
        await expectOpacityForFrames('backend-target', 0);
        expect(
          (await getTestComponent('backend-target').getMountedViewProps())
            ?.backgroundColor
        ).toBe('#336699ff');
        await advanceAnimationTimer(DURATION);
        await waitForNotification('hiding-finished');
        await expectEventually(() => mountedOpacity('backend-target')).toBe(
          0.8
        );
        await render(<BackendOpacityScreens active revision={1} />);
        await waitForFrames(3);
        await expectOpacityForFrames('backend-target', 0.8);
      }
    );
  }
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
