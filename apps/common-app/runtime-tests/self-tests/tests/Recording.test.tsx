import { useEffect } from 'react';
import type { ComponentRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedRef,
  setNativeProps,
  withTiming,
} from 'react-native-reanimated';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';

import { compareSnapshots } from '../../ReJest/matchers/snapshotMatchers';
import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  stopRecordingAnimationUpdates,
  test,
  useTestRef,
  waitForAnimationUpdates,
  waitForFrames,
} from '../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../ReJest/utils/runOnUIBlocking';

function Box({
  name,
  progress,
  layout = false,
}: {
  name: string;
  progress: SharedValue<number>;
  layout?: boolean;
}) {
  const ref = useTestRef(name);
  const style = useAnimatedStyle(() =>
    layout ? { width: progress.value } : { opacity: progress.value }
  );
  return <Animated.View ref={ref} style={[{ width: 30, height: 30 }, style]} />;
}

function DirectBox({
  onReady,
  width,
}: {
  onReady: (ref: AnimatedRef<View>) => void;
  width?: SharedValue<number>;
}) {
  const ref = useAnimatedRef<View>();
  const testRef = useTestRef('direct');
  const initialWidth = useSharedValue(30);
  const value = width ?? initialWidth;
  const style = useAnimatedStyle(() => ({ width: value.value }));
  useEffect(() => {
    onReady(ref);
  }, [onReady, ref]);
  return (
    <Animated.View
      ref={(instance: ComponentRef<typeof View> | null) => {
        testRef.current = instance as typeof testRef.current;
        ref(instance);
      }}
      style={[{ height: 30 }, style]}
    />
  );
}

describe('animation recording', () => {
  test('paired snapshots keep two views and stay fixed after stop', async () => {
    const first = makeMutable(1);
    const second = makeMutable(0.8);
    await render(
      <View>
        <Box name="first" progress={first} />
        <Box name="second" progress={second} />
      </View>
    );
    await mockAnimationTimer();
    const recording = await recordAnimationUpdates({
      nativeSource: 'mountedView',
    });
    first.value = withTiming(0.2, { duration: 1000, easing: Easing.linear });
    second.value = withTiming(0.4, { duration: 1000, easing: Easing.linear });
    await waitForAnimationUpdates(12);
    await stopRecordingAnimationUpdates();
    for (const name of ['first', 'second']) {
      const component = getTestComponent(name);
      const captured = await recording.getSnapshots(component);
      expect(captured.updates.length >= 10).toBe(true);
      expect(captured.updates).toMatchNativeSnapshots(
        captured.nativeSnapshots,
        false,
        0
      );
      await waitForFrames(1);
      await waitForFrames(1);
      expect(await recording.getSnapshots(component)).toBe(captured);
      const raw = await recording.getUpdates(component);
      const native = await recording.getNativeSnapshots(component);
      expect(raw).toMatchNativeSnapshots(native);
      await waitForFrames(1);
      expect(await recording.getNativeSnapshots(component)).toBe(native);
      expect(raw.length >= captured.updates.length).toBe(true);
    }
    await expect(() => recording.getSnapshots()).toThrow('many views');
  });

  test('paired snapshots reject the real clock', async () => {
    const progress = makeMutable(1);
    await render(<Box name="realClock" progress={progress} />);
    const recording = await recordAnimationUpdates({
      nativeSource: 'mountedView',
    });
    progress.value = withTiming(0.2, { duration: 100 });
    await waitForFrames(1);
    await waitForFrames(1);
    await stopRecordingAnimationUpdates();
    await expect(() => recording.getSnapshots()).toThrow('mockAnimationTimer');
  });

  test('a second recording needs a stop', async () => {
    await recordAnimationUpdates();
    await expect(() => recordAnimationUpdates()).toThrow(
      'already being recorded'
    );
    await stopRecordingAnimationUpdates();
    await recordAnimationUpdates();
    await stopRecordingAnimationUpdates();
  });

  test('ShadowTree pairs check layout updates', async () => {
    const progress = makeMutable(30);
    await render(<Box name="layout" progress={progress} layout />);
    await mockAnimationTimer();
    const recording = await recordAnimationUpdates();
    progress.value = withTiming(100, { duration: 160, easing: Easing.linear });
    await waitForAnimationUpdates(6);
    await stopRecordingAnimationUpdates();
    const captured = await recording.getSnapshots(getTestComponent('layout'));
    expect(captured.updates.length >= 4).toBe(true);
    expect(captured.updates).toMatchNativeSnapshots(
      captured.nativeSnapshots,
      false,
      0
    );
  });

  test('a mounted recorder error keeps the app update and restores hooks', async () => {
    const progress = makeMutable(30);
    await render(<Box name="unsupported" progress={progress} layout />);
    const recording = await recordAnimationUpdates({
      nativeSource: 'mountedView',
    });
    progress.value = 64;
    await waitForFrames(1);
    await waitForFrames(1);
    await stopRecordingAnimationUpdates();
    await expect(() => recording.getUpdates()).toThrow(
      'Mounted snapshots do not support: width'
    );
    await expectEventually(() =>
      getTestComponent('unsupported').getAnimatedStyle('width')
    ).toBe(64);
    const next = await recordAnimationUpdates();
    progress.value = 80;
    await waitForFrames(1);
    await stopRecordingAnimationUpdates();
    expect(((await next.getUpdates())[0] as { width: number }).width).toBe(80);
    await expectEventually(() =>
      getTestComponent('unsupported').getAnimatedStyle('width')
    ).toBe(80);
  });

  test('two direct batches in one frame keep raw operations and one frame pair', async () => {
    let ref: AnimatedRef<View> | undefined;
    await render(
      <DirectBox
        onReady={(value) => {
          ref = value;
        }}
      />
    );
    await waitForFrames(1);
    await waitForFrames(1);
    await mockAnimationTimer();
    const recording = await recordAnimationUpdates();
    await runOnUIBlocking(() => {
      'worklet';
      setNativeProps(ref!, { width: 40 });
      setNativeProps(ref!, { width: 64 });
      global._maybeFlushUIUpdatesQueue();
    });
    await stopRecordingAnimationUpdates();
    const operations = await recording.getAllUpdates();
    expect(operations.length).toBe(2);
    expect((operations[0] as { width: number }).width).toBe(40);
    expect((operations[1] as { width: number }).width).toBe(64);
    const captured = await recording.getSnapshots();
    expect(captured.updates.length).toBe(1);
    expect(captured.updates).toMatchNativeSnapshots(
      captured.nativeSnapshots,
      false,
      0
    );
    await expectEventually(() =>
      getTestComponent('direct').getAnimatedStyle('width')
    ).toBe(64);
  });

  test('component reads reject unattributed direct updates', async () => {
    let ref: AnimatedRef<View> | undefined;
    const width = makeMutable(30);
    await render(
      <DirectBox
        width={width}
        onReady={(value) => {
          ref = value;
        }}
      />
    );
    await waitForFrames(1);
    await waitForFrames(1);
    await mockAnimationTimer();
    const recording = await recordAnimationUpdates();
    await runOnUIBlocking(() => {
      'worklet';
      setNativeProps(ref!, { width: 40 });
      width.value = 80;
    });
    await waitForFrames(1);
    await stopRecordingAnimationUpdates();
    const operations = await recording.getAllUpdates();
    expect(operations.length).toBe(2);
    expect((operations[0] as { width: number }).width).toBe(40);
    expect((operations[1] as { width: number }).width).toBe(80);
    await expect(() =>
      recording.getUpdates(getTestComponent('direct'))
    ).toThrow('unattributed');
  });

  test('an unknown update in the excluded frame does not fail mounted capture', async () => {
    let ref: AnimatedRef<View> | undefined;
    const progress = makeMutable(1);
    await render(
      <View>
        <Box name="recorded" progress={progress} />
        <DirectBox
          onReady={(value) => {
            ref = value;
          }}
        />
      </View>
    );
    await waitForFrames(1);
    await waitForFrames(1);
    await mockAnimationTimer();
    const recording = await recordAnimationUpdates({
      nativeSource: 'mountedView',
    });
    progress.value = withTiming(0.2, { duration: 1000 });
    await waitForAnimationUpdates(4);
    const stopping = stopRecordingAnimationUpdates();
    await runOnUIBlocking(() => {
      'worklet';
      requestAnimationFrame(() => {
        setNativeProps(ref!, { width: 64 });
        global._maybeFlushUIUpdatesQueue();
      });
    });
    await stopping;
    const captured = await recording.getSnapshots(getTestComponent('recorded'));
    expect(captured.updates).toMatchNativeSnapshots(
      captured.nativeSnapshots,
      false,
      0
    );
    await expectEventually(() =>
      getTestComponent('direct').getAnimatedStyle('width')
    ).toBe(64);
  });

  test('snapshot comparison checks the last value', () => {
    expect(
      compareSnapshots(
        [{ opacity: 0 }, { opacity: 1 }],
        [{ opacity: 0 }, { opacity: 0 }],
        false
      ) !== null
    ).toBe(true);
    expect(
      compareSnapshots([{}, { opacity: 0.2 }], [{ opacity: 0.4 }], true) !==
        null
    ).toBe(true);
    expect(
      compareSnapshots([{}, { opacity: 0.2 }], [{ opacity: 0.2 }], true)
    ).toBe(null);
  });
});
