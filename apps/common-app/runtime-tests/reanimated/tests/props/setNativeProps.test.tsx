import React from 'react';
import { findNodeHandle, View } from 'react-native';
import type { AnimatedRef, MeasuredDimensions } from 'react-native-reanimated';
import Animated, {
  measure,
  setNativeProps,
  useAnimatedRef,
} from 'react-native-reanimated';
import { runOnRuntimeAsyncWithId, UIRuntimeId } from 'react-native-worklets';

import {
  describe,
  expect,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const INITIAL_WIDTH = 100;
const NEW_WIDTH = 160;
const NEW_OPACITY = 0.5;

let boxRef: AnimatedRef<Animated.View> | undefined;

function Box() {
  const animatedRef = useAnimatedRef<Animated.View>();
  boxRef = animatedRef;
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{ width: INITIAL_WIDTH, height: 50, backgroundColor: 'red' }}
      />
    </View>
  );
}

async function renderBox() {
  await render(<Box />);
  await waitForFrames(3);
  return boxRef!;
}

function mountedProps(tag: number) {
  return runOnRuntimeAsyncWithId(UIRuntimeId, () => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
}

function measureOnUI(animatedRef: AnimatedRef<Animated.View>) {
  return runOnRuntimeAsyncWithId(UIRuntimeId, () => {
    'worklet';
    return measure(animatedRef);
  }) as Promise<MeasuredDimensions | null>;
}

describe('setNativeProps called on the UI runtime outside a frame', () => {
  test('applies a non-layout prop', async () => {
    const animatedRef = await renderBox();
    const tag = findNodeHandle(animatedRef.current) ?? -1;

    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      setNativeProps(animatedRef, { opacity: NEW_OPACITY });
    });
    await waitForFrames(3);

    expect((await mountedProps(tag))?.opacity).toBe(NEW_OPACITY);

    await render(null);
  });

  test('applies a layout prop that measure then reports', async () => {
    const animatedRef = await renderBox();

    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      setNativeProps(animatedRef, { width: NEW_WIDTH });
    });
    await waitForFrames(3);

    expect((await measureOnUI(animatedRef))?.width).toBe(NEW_WIDTH);

    await render(null);
  });
});
