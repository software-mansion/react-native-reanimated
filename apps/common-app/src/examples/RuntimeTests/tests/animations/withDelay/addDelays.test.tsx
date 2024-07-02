import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import {
  describe,
  test,
  render,
  useTestRef,
  getTestComponent,
  wait,
  mockAnimationTimer,
  recordAnimationUpdates,
  unmockAnimationTimer,
  expect,
  clearRenderOutput,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

const WIDTH_COMPONENT_ACTIVE_REF = 'WidthComponentActive';
const WIDTH_COMPONENT_PASSIVE_REF = 'WidthComponentPassive';
const WIDTH_COMPONENT_INLINE_REF = 'WidthComponentInline';

enum ComponentType {
  'ACTIVE' = WIDTH_COMPONENT_ACTIVE_REF,
  'PASSIVE' = WIDTH_COMPONENT_PASSIVE_REF,
  'INLINE' = WIDTH_COMPONENT_INLINE_REF,
}

const ActiveWidthComponent = ({ delays }: { delays: [number] | [number, number, number] }) => {
  const widthActiveSV = useSharedValue(0);
  const refActive = useTestRef(ComponentType.ACTIVE);

  const styleActive = useAnimatedStyle(() => {
    return {
      width:
        delays.length === 1
          ? withDelay(delays[0], withTiming(widthActiveSV.value, { duration: 100 }))
          : withDelay(
              delays[0],
              withDelay(delays[1], withDelay(delays[2], withTiming(widthActiveSV.value, { duration: 100 }))),
            ),
    };
  });

  useEffect(() => {
    widthActiveSV.value = 300;
  }, [widthActiveSV]);

  return (
    <View style={styles.container}>
      <Animated.View ref={refActive} style={[styles.animatedBox, { backgroundColor: 'powderblue' }, styleActive]} />
    </View>
  );
};

const NonActiveWidthComponents = ({ delays }: { delays: [number] | [number, number, number] }) => {
  const widthPassiveSV = useSharedValue(0);

  const refPassive = useTestRef(ComponentType.PASSIVE);
  const refInline = useTestRef(ComponentType.INLINE);

  const stylePassive = useAnimatedStyle(() => {
    return {
      width: widthPassiveSV.value,
    };
  });

  useEffect(() => {
    widthPassiveSV.value =
      delays.length === 1
        ? withDelay(delays[0], withTiming(300, { duration: 100 }))
        : withDelay(delays[0], withDelay(delays[1], withDelay(delays[2], withTiming(300, { duration: 100 }))));
  });

  return (
    <View style={styles.container}>
      <Animated.View
        ref={refPassive}
        style={[styles.animatedBox, { backgroundColor: 'cornflowerblue' }, stylePassive]}
      />
      <Animated.View
        ref={refInline}
        style={[styles.animatedBox, { backgroundColor: 'steelblue', width: widthPassiveSV }]}
      />
    </View>
  );
};

/**
    Make sure that
    withDelay( A, withDelay( B, withDelay( C, some_animation) and
    withDelay( A + B + C, some_animation) are equal.
 */
describe('Add three delays', () => {
  async function getSnapshotUpdates(delays: [number] | [number, number, number], componentType: ComponentType) {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();

    if (componentType === ComponentType.ACTIVE) {
      await render(<ActiveWidthComponent delays={delays} />);
    } else {
      await render(<NonActiveWidthComponents delays={delays} />);
    }
    const delaySum = delays.reduce((current, sum) => sum + current, 0);
    await wait(150 + delaySum);

    const updates = updatesContainer.getUpdates(getTestComponent(componentType));
    const updatesNative = await updatesContainer.getNativeSnapshots(getTestComponent(componentType));
    await unmockAnimationTimer();
    await clearRenderOutput();

    return [updates, updatesNative];
  }

  test.each([
    [[10, 20, 30], 'ACTIVE'],
    [[10, 0, 30], 'ACTIVE'],
    [[0, 30, 30], 'ACTIVE'],
    [[40, 30, 0], 'ACTIVE'],

    [[10, 20, 30], 'INLINE'],
    [[10, 0, 30], 'INLINE'],
    [[0, 30, 30], 'INLINE'],
    [[40, 30, 0], 'INLINE'],
  ] as Array<[[number, number, number], keyof typeof ComponentType]>)(
    'Sum of delays ${0} is *****one frame longer***** than the delay of the sum, **${1}** component',
    async ([delays, componentType]) => {
      const [updates, nativeUpdates] = await getSnapshotUpdates(delays, ComponentType[componentType]);
      const delaySum = delays.reduce((current, sum) => sum + current, 0);
      const [updatesOneDelay, nativeUpdatesOneDelay] = await getSnapshotUpdates(
        [delaySum],
        ComponentType[componentType],
      );

      expect([{ width: 0 }, ...updatesOneDelay]).toMatchSnapshots(updates);
      if (componentType !== 'INLINE' || Platform.OS !== 'android') {
        // Inline components record error log "Unable to resolve view"
        expect(updatesOneDelay).toMatchNativeSnapshots(nativeUpdatesOneDelay);
        expect(updates).toMatchNativeSnapshots(nativeUpdates);
      }
    },
  );

  test.each([
    [[0, 0, 30], 'ACTIVE'],
    [[40, 0, 0], 'ACTIVE'],
    [[0, 55, 0], 'ACTIVE'],
    [[0, 0, 0], 'ACTIVE'],

    [[0, 0, 30], 'INLINE'],
    [[40, 0, 0], 'INLINE'],
    [[0, 55, 0], 'INLINE'],
    [[0, 0, 0], 'INLINE'],
  ] as Array<[[number, number, number], keyof typeof ComponentType]>)(
    'Sum of delays ${0} is *****two frames longer***** than the delay of the sum, **${1}** component',
    async ([delays, componentType]) => {
      const [updates, nativeUpdates] = await getSnapshotUpdates(delays, ComponentType[componentType]);
      const delaySum = delays.reduce((current, sum) => sum + current, 0);
      const [updatesOneDelay, nativeUpdatesOneDelay] = await getSnapshotUpdates(
        [delaySum],
        ComponentType[componentType],
      );

      expect([{ width: 0 }, { width: 0 }, ...updatesOneDelay]).toMatchSnapshots(updates);
      if (componentType !== 'INLINE' || Platform.OS !== 'android') {
        expect(updatesOneDelay).toMatchNativeSnapshots(nativeUpdatesOneDelay);
        expect(updates).toMatchNativeSnapshots(nativeUpdates);
      }
    },
  );

  test.each([
    [[10, 20, 30], 'PASSIVE'],
    [[10, 0, 30], 'PASSIVE'],
    [[0, 30, 30], 'PASSIVE'],
    [[40, 30, 0], 'PASSIVE'],

    [[0, 0, 30], 'PASSIVE'],
    [[40, 0, 0], 'PASSIVE'],
    [[0, 55, 0], 'PASSIVE'],
    [[0, 0, 0], 'PASSIVE'],
  ] as Array<[[number, number, number], keyof typeof ComponentType]>)(
    'Sum of delays ${0} *****exactly matches***** than the delay of the sum, **${1}** component',
    async ([delays, componentType]) => {
      const [updates, nativeUpdates] = await getSnapshotUpdates(delays, ComponentType[componentType]);
      const delaySum = delays.reduce((current, sum) => sum + current, 0);
      const [updatesOneDelay, nativeUpdatesOneDelay] = await getSnapshotUpdates(
        [delaySum],
        ComponentType[componentType],
      );

      expect(updatesOneDelay).toMatchSnapshots(updates);
      expect(updatesOneDelay).toMatchNativeSnapshots(nativeUpdatesOneDelay);
      expect(updates).toMatchNativeSnapshots(nativeUpdates);
    },
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 0,
    height: 80,
    marginHorizontal: 30,
  },
});
