import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import {
  runOnRuntimeAsyncWithId,
  scheduleOnRN,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';

import {
  describe,
  expect,
  render,
  test,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const MOUNTS = 5;
const sentinels: WeakRef<object>[] = [];

// The scroll worklet schedules `report` on the RN runtime, so the worklet's UI
// copy holds `report` strongly. `report` closes over the animated ref, so if the
// ref still points at the unmounted ScrollView after unmount, the ScrollView's
// props reach the scroll worklet again and nothing in the cycle is ever freed.
function ScrollingComponent() {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  const [sentinel] = useState(() => {
    const object = {};
    sentinels.push(new WeakRef(object));
    return object;
  });

  const report = useCallback(() => {
    // Stands in for app code that reads component state and the ref.
    return [sentinel, animatedRef.current];
  }, [sentinel, animatedRef]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: () => {
      'worklet';
      scheduleOnRN(report);
    },
  });

  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      scrollTo(animatedRef, 0, 100, false);
    });
  }, [animatedRef]);

  return (
    <Animated.ScrollView
      ref={animatedRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ height: 200 }}>
      <View style={{ height: 2000 }} />
    </Animated.ScrollView>
  );
}

async function collectBothRuntimes() {
  // Releasing the cycle takes alternating collections: the RN runtime frees the
  // worklet's serializable, which releases the UI copy, which releases `report`.
  for (let round = 0; round < 4; round++) {
    globalThis.gc!();
    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      globalThis.gc!();
    });
    await wait(100);
  }
}

describe('useAnimatedRef retention', () => {
  test('does not keep an unmounted component alive through a scheduled callback', async () => {
    expect(typeof globalThis.gc).toBe('function');

    for (let i = 0; i < MOUNTS; i++) {
      await render(<ScrollingComponent key={i} />);
      await waitForFrames(10);
    }
    await render(null);
    await collectBothRuntimes();

    const alive = sentinels.filter((ref) => ref.deref() !== undefined).length;
    expect(alive).toBe(0);
  });
});
