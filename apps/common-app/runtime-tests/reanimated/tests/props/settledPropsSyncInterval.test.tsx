import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const BOX_REF = 'SETTLED_PROPS_SYNC_INTERVAL_BOX';
const INITIAL_WIDTH = 100;
const UPDATED_WIDTH = 200;
const FLUSH_INTERVAL_MS = 500;
const SETTLE_THRESHOLD_MS = 1000;
const IDLE_WAIT_MS = FLUSH_INTERVAL_MS * 3;
const SYNC_AND_EVICT_WAIT_MS = SETTLE_THRESHOLD_MS + FLUSH_INTERVAL_MS * 4;

let widthValue: SharedValue<number> | null = null;

const { PropsRegistryGarbageCollector } =
  require('react-native-reanimated/src/PropsRegistryGarbageCollector') as {
    PropsRegistryGarbageCollector: { intervalId: unknown };
  };

function isSyncRunning() {
  return PropsRegistryGarbageCollector.intervalId !== null;
}

describe('settled props sync interval', () => {
  test('stops when the mounted views have nothing to sync', async () => {
    await render(<StaticBox />);

    await wait(IDLE_WAIT_MS);

    expect(isSyncRunning()).toBe(false);
  });

  test('runs after an animated write and stops once the value is synced', async () => {
    await render(<ResizableBox />);
    const box = getTestComponent(BOX_REF);
    await wait(IDLE_WAIT_MS);
    expect(isSyncRunning()).toBe(false);

    widthValue!.value = UPDATED_WIDTH;
    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH,
      ComparisonMode.PIXEL
    );

    await expectEventually(() => isSyncRunning()).toBe(true);
    await wait(SYNC_AND_EVICT_WAIT_MS);
    expect(isSyncRunning()).toBe(false);
  });
});

function StaticBox() {
  const animatedStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

function ResizableBox() {
  const width = useSharedValue(INITIAL_WIDTH);
  widthValue = width;
  const ref = useTestRef(BOX_REF);
  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    width: INITIAL_WIDTH,
    height: 50,
    backgroundColor: 'teal',
  },
});
