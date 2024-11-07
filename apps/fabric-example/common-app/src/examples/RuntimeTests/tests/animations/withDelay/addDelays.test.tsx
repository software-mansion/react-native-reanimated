import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
} from '../../../ReJest/RuntimeTestsApi';

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
describe('Compare a sequence of three delays, with one delay of their sum', () => {
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
    updatesNative.forEach(update => {
      if ('width' in update && update.width === '[Reanimated] Unable to resolve view') {
        // We use this hack because component with inline props gets mounted a bit later
        update.width = 0;
      }
    });

    await unmockAnimationTimer();
    await clearRenderOutput();

    return [updates, updatesNative];
  }

  test.each([
    [10, 20, 30],
    [16, 32, 64],
    [10, 0, 30],
    [0, 30, 30],
    [40, 30, 0],
    [0, 0, 30],
    [40, 0, 0],
    [0, 55, 0],
    [0, 0, 0],
  ] as Array<[number, number, number]>)('Sum of delays **%p** matches the delay of the sum', async delays => {
    const delaySum = delays.reduce((current, sum) => sum + current, 0);

    for (const componentType of ['PASSIVE', 'ACTIVE', 'INLINE'] as const) {
      const [updatesDelaySequence, nativeUpdatesDelaySequence] = await getSnapshotUpdates(
        delays,
        ComponentType[componentType],
      );
      const [updatesOneDelay, nativeUpdatesOneDelay] = await getSnapshotUpdates(
        [delaySum],
        ComponentType[componentType],
      );

      const fillerSize = updatesDelaySequence.length - updatesOneDelay.length;
      const filler = Array.from({ length: fillerSize }, () => {
        return {
          width: 0,
        };
      });

      expect([...filler, ...updatesOneDelay]).toMatchSnapshots(updatesDelaySequence);
      expect(fillerSize <= 1).toBe(true); // The additional delay should be at most of one frame

      expect(updatesOneDelay).toMatchNativeSnapshots(nativeUpdatesOneDelay);
      expect(updatesDelaySequence).toMatchNativeSnapshots(nativeUpdatesDelaySequence);
    }
  });
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
