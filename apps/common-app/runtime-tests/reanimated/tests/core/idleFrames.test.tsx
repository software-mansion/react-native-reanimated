import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnRN } from 'react-native-worklets';

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
const SCROLL_ATTEMPTS = 10;
const SCROLL_ATTEMPT_MS = 100;

let widthValue: SharedValue<number> | null = null;
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;
let scrollEventCount = 0;

type MapperRunGlobal = typeof globalThis & {
  __mapperRun?: () => void;
  __savedMapperRun?: () => void;
};

function onScrollEvent() {
  scrollEventCount++;
}

function hideMapperRun() {
  runOnUISync(() => {
    'worklet';
    const global = globalThis as MapperRunGlobal;
    global.__savedMapperRun = global.__mapperRun;
    global.__mapperRun = undefined;
  });
}

function restoreMapperRun() {
  runOnUISync(() => {
    'worklet';
    const global = globalThis as MapperRunGlobal;
    global.__mapperRun = global.__savedMapperRun;
    global.__savedMapperRun = undefined;
  });
}

async function scrollUntilAnEventArrives() {
  for (let attempt = 1; attempt <= SCROLL_ATTEMPTS; attempt++) {
    const countBefore = scrollEventCount;
    scrollViewRef?.current?.scrollTo({ y: attempt * 10, animated: false });
    await sleepOnRN(SCROLL_ATTEMPT_MS);
    if (scrollEventCount > countBefore) {
      return true;
    }
  }
  return false;
}

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

  test('requests no frames after an event when no mapper was ever started', async () => {
    scrollEventCount = 0;
    await render(<ScrollList />);
    await sleepOnRN(SETTLE_MS);
    hideMapperRun();
    try {
      const receivedEvent = await scrollUntilAnEventArrives();
      await sleepOnRN(SETTLE_MS);

      const count = await countNativeFrameRequests(WINDOW_MS);

      expect(receivedEvent).toBe(true);
      expect(count).toBe(0);
    } finally {
      restoreMapperRun();
    }
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

function ScrollList() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;
  const onScroll = useAnimatedScrollHandler(() => {
    scheduleOnRN(onScrollEvent);
  });
  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <View style={styles.tallContent} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tallContent: {
    height: 3000,
  },
  box: {
    width: INITIAL_WIDTH,
    height: 50,
    backgroundColor: 'teal',
  },
});
