import type React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  css,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  recordAnimationUpdates,
  render,
  test,
  useTestRef,
  wait,
} from '../../ReJest/RuntimeTestsApi';
import type { RecordedNativeMutation } from '../../ReJest/types';

/**
 * Verifies the new-architecture native-update interception.
 *
 * On the new architecture the value sent to a native view is no longer readable
 * synchronously from the shadow node - it is applied through Fabric commits /
 * mutations, and a synchronous `getNewestCloneOfShadowNode` read deadlocks
 * against the in-flight commits. Instead, the `NativeMutationsRegistry` (C++)
 * records the `ShadowViewMutation`s that Reanimated sends to the platform (from
 * the same `pullTransaction` funnel the layout-animations delegate owns), and
 * ReJest reads them back via `getRecordedNativeMutations` /
 * `getNativeSnapshots`.
 *
 * Recording is gated behind the `RUNTIME_TEST_FLAG` static feature flag, which
 * is enabled in this app.
 *
 * NOTE: layout animations and shared element transitions flow through the very
 * same recording call site (the experimental proxy's `filteredMutations`), so
 * they are covered by the same mechanism exercised here.
 */

const OPACITY_REF = 'OpacityBox';

function nativeValuesForTag(
  recorded: RecordedNativeMutation[],
  tag: number,
  prop: string
): number[] {
  return recorded
    .filter(
      (mutation) =>
        mutation.tag === tag && mutation.snapshot?.[prop] !== undefined
    )
    .map((mutation) => Number(mutation.snapshot![prop]));
}

describe('Native mutations recording (new architecture)', () => {
  const OpacityComponent = ({ duration }: { duration: number }) => {
    const opacity = useSharedValue(1);
    const ref = useTestRef(OPACITY_REF);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    useEffect(() => {
      opacity.value = withTiming(0, { duration });
    }, [opacity, duration]);
    return (
      <View style={styles.container}>
        <Animated.View ref={ref} style={[styles.box, style]} />
      </View>
    );
  };

  async function recordRendered(component: React.JSX.Element, waitMs = 600) {
    const updatesContainer = await recordAnimationUpdates();
    await render(component);
    await wait(waitMs);
    return updatesContainer;
  }

  test('records the native opacity mutations sent to the platform', async () => {
    const updatesContainer = await recordRendered(
      <OpacityComponent duration={300} />
    );
    const recorded = await updatesContainer.getRecordedNativeMutations();
    const tag = getTestComponent(OPACITY_REF).getTag();
    const opacities = nativeValuesForTag(recorded, tag, 'opacity');

    // A real recording: several native opacity values that start opaque and
    // settle at zero - the values actually mounted on the platform.
    expect(opacities.length).toBeWithinRange(2, 100000);
    expect(opacities[0]).toBeWithinRange(0.9, 1);
    expect(opacities[opacities.length - 1]).toBeWithinRange(0, 0.1);
  });

  test('native snapshots track the JS-computed values of an animation', async () => {
    const updatesContainer = await recordRendered(
      <OpacityComponent duration={300} />
    );
    const component = getTestComponent(OPACITY_REF);
    const updates = updatesContainer.getUpdates(component, ['opacity']);
    const nativeUpdates = await updatesContainer.getNativeSnapshots(component, [
      'opacity',
    ]);
    // The native channel (reconstructed from the recorded mutations) tracks the
    // JS channel (the values the worklet computed). This is the cross-check the
    // framework lost on the new architecture.
    expect(updates).toMatchNativeSnapshots(nativeUpdates);
  });
});

const styles = css.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  box: {
    width: 80,
    height: 80,
    margin: 30,
    backgroundColor: 'tomato',
  },
});
