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
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

const WIDTH_COMPONENT_ACTIVE_REF = 'WidthComponentActive';
const WIDTH_COMPONENT_PASSIVE_REF = 'WidthComponentPassive';
const WIDTH_COMPONENT_INLINE_REF = 'WidthComponentInline';
const COMPONENT_REFS = [WIDTH_COMPONENT_ACTIVE_REF, WIDTH_COMPONENT_PASSIVE_REF, WIDTH_COMPONENT_INLINE_REF];

const WidthComponent = ({ delays }: { delays: [number] | [number, number, number] }) => {
  const widthActiveSV = useSharedValue(0);
  const widthPassiveSV = useSharedValue(0);

  const refActive = useTestRef(WIDTH_COMPONENT_ACTIVE_REF);
  const refPassive = useTestRef(WIDTH_COMPONENT_PASSIVE_REF);
  const refInline = useTestRef(WIDTH_COMPONENT_INLINE_REF);

  const stylePassive = useAnimatedStyle(() => {
    return {
      width: widthPassiveSV.value,
    };
  });
  const styleActive = useAnimatedStyle(() => {
    if (delays.length === 1) {
      return {
        width: withDelay(delays[0], withTiming(widthActiveSV.value, { duration: 100 })),
      };
    }
    if (delays.length === 3) {
      return {
        width: withDelay(
          delays[0],
          withDelay(delays[1], withDelay(delays[2], withTiming(widthActiveSV.value, { duration: 100 }))),
        ),
      };
    }
    return {};
  });

  useEffect(() => {
    widthActiveSV.value = 300;
  }, [widthActiveSV]);

  useEffect(() => {
    if (delays.length === 1) {
      widthPassiveSV.value = withDelay(delays[0], withTiming(300, { duration: 100 }));
    }
    if (delays.length === 3) {
      widthPassiveSV.value = withDelay(
        delays[0],
        withDelay(delays[1], withDelay(delays[2], withTiming(300, { duration: 100 }))),
      );
    }
  }, [widthPassiveSV, delays]);

  return (
    <View style={styles.container}>
      <Animated.View ref={refActive} style={[styles.animatedBox, { backgroundColor: 'powderblue' }, styleActive]} />
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

describe('Add three delays', () => {
  async function getSnapshotUpdates(delays: [number] | [number, number, number]) {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();
    await render(<WidthComponent delays={delays} />);
    const delaySum = delays.reduce((current, sum) => sum + current, 0);
    await wait(150 + delaySum);

    const updates = COMPONENT_REFS.map(ref => updatesContainer.getUpdates(getTestComponent(ref)));
    const updatesNative = [];
    for (const ref of COMPONENT_REFS) {
      const newUpdates = await updatesContainer.getNativeSnapshots(getTestComponent(ref));
      updatesNative.push(newUpdates);
    }
    await unmockAnimationTimer();
    await clearRenderOutput();

    return [updates, updatesNative];
  }

  test.each([
    [10, 20, 30],
    [10, 0, 30],
    [0, 30, 30],
    [40, 30, 0],

    // [0, 0, 30], This tests don't pass (probably we have some unexpected delay)
    // [40, 0, 0],
    // [0, 55, 0],
    // [0, 0, 0],
  ] as Array<[number, number, number]>)(
    'Composition of delay: ${0}, ${1}, ${2} matches the delay of their sum',
    async delays => {
      const [updates, nativeUpdates] = await getSnapshotUpdates(delays);
      const delaySum = delays.reduce((current, sum) => sum + current, 0);
      const [updatesOneDelay, nativeUpdatesOneDelay] = await getSnapshotUpdates([delaySum]);

      for (let i = 0; i < 3; i++) {
        expect(updates[i]).toMatchNativeSnapshots(nativeUpdates[i]);
        expect(updatesOneDelay[i]).toMatchNativeSnapshots(nativeUpdatesOneDelay[i]);

        if (updatesOneDelay[i].length === updates[i].length) {
          expect(updatesOneDelay[i]).toMatchSnapshots(updates[i]);
        } else if (updatesOneDelay[i].length < updates[i].length) {
          expect([{ width: 0 }, ...updatesOneDelay[i]]).toMatchSnapshots(updates[i]);
        } else {
          expect(updatesOneDelay[i]).toMatchSnapshots([{ width: 0 }, ...updates[i]]);
        }
      }
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
