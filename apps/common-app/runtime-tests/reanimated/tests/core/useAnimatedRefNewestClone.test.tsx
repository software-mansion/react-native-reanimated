import React from 'react';
import { findNodeHandle, TextInput, View } from 'react-native';
import type { AnimatedRef, MeasuredDimensions } from 'react-native-reanimated';
import Animated, {
  dispatchCommand,
  measure,
  setNativeProps,
  useAnimatedRef,
} from 'react-native-reanimated';
import { runOnRuntimeAsyncWithId, UIRuntimeId } from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  render,
  test,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const WIDTHS = [10, 20, 30, 40, 50];
const SET_NATIVE_PROPS_OPACITY = 0.5;
const FOCUSED = 'NEWEST_CLONE_INPUT_FOCUSED';
const BLURRED = 'NEWEST_CLONE_INPUT_BLURRED';

let viewRef: AnimatedRef<Animated.View> | undefined;
let inputRef: AnimatedRef<TextInput> | undefined;

function ResizedView({ width }: { width: number }) {
  const animatedRef = useAnimatedRef<Animated.View>();
  viewRef = animatedRef;
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{ width, height: 10, backgroundColor: 'red' }}
      />
    </View>
  );
}

function ResizedInput({ width }: { width: number }) {
  const animatedRef = useAnimatedRef<TextInput>();
  inputRef = animatedRef;
  return (
    <View style={{ marginTop: 100 }}>
      <TextInput
        ref={animatedRef}
        style={{ width, height: 40, borderWidth: 1 }}
        onFocus={() => notify(FOCUSED)}
        onBlur={() => notify(BLURRED)}
      />
    </View>
  );
}

function measureOnUI(animatedRef: AnimatedRef<Animated.View>) {
  return runOnRuntimeAsyncWithId(UIRuntimeId, () => {
    'worklet';
    return measure(animatedRef);
  }) as Promise<MeasuredDimensions | null>;
}

async function renderEveryWidth(renderWidth: (width: number) => Promise<void>) {
  for (const width of WIDTHS) {
    await renderWidth(width);
    await waitForFrames(2);
  }
}

describe('useAnimatedRef on the UI runtime after React clones the view', () => {
  test('measure returns the layout of the newest clone', async () => {
    await renderEveryWidth((width) => render(<ResizedView width={width} />));
    await waitForFrames(3);

    const measured = await measureOnUI(viewRef!);
    expect(measured?.width).toBe(WIDTHS[WIDTHS.length - 1]);

    await render(null);
  });

  test('setNativeProps updates the newest clone', async () => {
    await renderEveryWidth((width) => render(<ResizedView width={width} />));
    await waitForFrames(3);
    const animatedRef = viewRef!;
    const tag = findNodeHandle(animatedRef.current) ?? -1;

    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      setNativeProps(animatedRef, { opacity: SET_NATIVE_PROPS_OPACITY });
      global._maybeFlushUIUpdatesQueue();
    });
    await waitForFrames(3);

    const mounted = await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      return global._obtainMountedViewProps(tag, false);
    });
    expect(mounted?.opacity).toBe(SET_NATIVE_PROPS_OPACITY);
    expect(mounted?.width).toBe(WIDTHS[WIDTHS.length - 1]);

    await render(null);
  });

  test('dispatchCommand reaches the native view of the newest clone', async () => {
    await renderEveryWidth((width) =>
      render(<ResizedInput width={width * 4} />)
    );
    await waitForFrames(3);
    const animatedRef = inputRef!;

    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      dispatchCommand(animatedRef, 'focus');
    });
    await waitForNotification(FOCUSED);

    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      dispatchCommand(animatedRef, 'blur');
    });
    await waitForNotification(BLURRED);

    await render(null);
  });
});
