import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatedRef, ScrollEvent } from 'react-native-reanimated';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useSharedValue,
} from 'react-native-reanimated';
import { createSerializable, scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expectEventually,
  getSharedValue,
  isViewMountedNatively,
  registerValue,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const LAST_OFFSET = 'UNTAGGED_SCROLL_LAST_OFFSET';

// The emitter tag the native registry reads as "any view".
const WITHOUT_VIEW_TAG = -1;

const ITEM_SIZE = 100;
const ITEM_COUNT = 10;
const SCROLL_OFFSET = 50;

// Written during render, read by the test.
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;

/**
 * The scroll view has no handler of its own, so only the untagged one waits for
 * its events.
 */
function Scenario() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;

  const lastOffset = useSharedValue(-1);
  registerValue(LAST_OFFSET, lastOffset);

  useEffect(() => {
    const registrationId =
      globalThis.__reanimatedModuleProxy.registerEventHandler(
        createSerializable((_eventTimestamp: number, event: ScrollEvent) => {
          'worklet';
          lastOffset.value = event.contentOffset.x;
        }),
        'onScroll',
        WITHOUT_VIEW_TAG
      );
    return () =>
      globalThis.__reanimatedModuleProxy.unregisterEventHandler(registrationId);
  }, [lastOffset]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        horizontal
        style={styles.list}>
        {[...Array(ITEM_COUNT).keys()].map((i) => (
          <View
            key={i}
            style={[
              styles.item,
              { backgroundColor: `hsl(${i * 36}, 50%, 50%)` },
            ]}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

describe('Event handler registered without a view tag', () => {
  test('receives the scroll events of a view with no handler of its own', async () => {
    await render(<Scenario />);
    const ref = scrollViewRef;
    const tag = ref?.getTag?.();
    if (!ref || tag === null || tag === undefined) {
      throw new Error('Scroll view ref was not set');
    }
    // A scroll command sent before the native scroll view mounts is dropped.
    await expectEventually(() => isViewMountedNatively(tag)).toBe(true);

    scheduleOnUI(() => {
      'worklet';
      scrollTo(ref, SCROLL_OFFSET, 0, false);
    });

    await expectEventually(() => getSharedValue<number>(LAST_OFFSET)).toBe(
      SCROLL_OFFSET,
      ComparisonMode.PIXEL
    );
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    flexGrow: 0,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
});
