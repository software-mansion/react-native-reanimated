import React, { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { runOnRuntimeAsyncWithId, UIRuntimeId } from 'react-native-worklets';

import {
  describe,
  expect,
  render,
  test,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const RERENDERS = 5;

type HostInstance = {
  __internalInstanceHandle?: { stateNode?: { node?: object } };
};

let mountTimeWrapper: WeakRef<object> | undefined;

function rememberMountTimeWrapper(instance: unknown) {
  if (instance === null || mountTimeWrapper !== undefined) {
    return;
  }
  const wrapper = (instance as HostInstance).__internalInstanceHandle?.stateNode
    ?.node;
  if (wrapper !== undefined) {
    mountTimeWrapper = new WeakRef(wrapper);
  }
}

function AnimatedBox({ generation }: { generation: number }) {
  const ref = useCallback(
    (instance: unknown) => rememberMountTimeWrapper(instance),
    []
  );
  return (
    <Animated.View ref={ref} style={{ width: 100 + generation, height: 100 }}>
      <View key={generation} style={{ width: 10 + generation, height: 10 }} />
    </Animated.View>
  );
}

async function collectBothRuntimes() {
  for (let round = 0; round < 4; round++) {
    globalThis.gc!();
    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      globalThis.gc!();
    });
    await wait(100);
  }
}

describe('shadow node wrapper retention', () => {
  test('a mounted Animated.View does not keep its mount-time shadow node wrapper alive', async () => {
    expect(typeof globalThis.gc).toBe('function');
    mountTimeWrapper = undefined;

    for (let generation = 0; generation <= RERENDERS; generation++) {
      await render(<AnimatedBox generation={generation} />);
      await waitForFrames(3);
    }
    await collectBothRuntimes();

    expect(mountTimeWrapper).not.toBe(undefined);
    expect(mountTimeWrapper!.deref() === undefined).toBe(true);

    await render(null);
  });
});
