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
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import {
  countNativeFrameRequests,
  sleepOnRN,
} from '../../../ReJest/utils/nativeFrameRequests';

const BOX_REF = 'IDLE_FRAMES_BOX';
const SETTLE_MS = 300;
const WINDOW_MS = 300;
const INITIAL_WIDTH = 100;
const UPDATED_WIDTH = 200;

let widthValue: SharedValue<number> | null = null;

describe('native frame requests with animated components', () => {
  test('requests no frames for a static animated style', async () => {
    await render(<StaticBox />);
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS);

    expect(count).toBe(0);
  });

  test('applies a shared value write without an animation and goes idle again', async () => {
    await render(<ResizableBox />);
    const box = getTestComponent(BOX_REF);
    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      INITIAL_WIDTH,
      ComparisonMode.PIXEL
    );
    await sleepOnRN(SETTLE_MS);

    widthValue!.value = UPDATED_WIDTH;

    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH,
      ComparisonMode.PIXEL
    );
    await sleepOnRN(SETTLE_MS);
    const count = await countNativeFrameRequests(WINDOW_MS);
    expect(count).toBe(0);
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
