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
const SCROLL_DRIVEN_BOX_REF = 'IDLE_FRAMES_SCROLL_DRIVEN_BOX';
const SETTLE_MS = 300;
const WINDOW_MS = 300;
const INITIAL_WIDTH = 100;
const UPDATED_WIDTH = 200;
const SCROLL_ATTEMPTS = 10;
const SCROLL_ATTEMPT_MS = 100;
const FINALIZER_ERROR = 'error thrown by a frame finalizer';
const SCROLL_OFFSET = 120;

let widthValue: SharedValue<number> | null = null;
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;
let scrollEventCount = 0;

type MapperRunGlobal = typeof globalThis & {
  __mapperRun?: () => void;
  __savedMapperRun?: () => void;
  __runEventHandler?: (handler: () => void) => void;
  __savedRunEventHandler?: (handler: () => void) => void;
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
    global.__savedRunEventHandler = global.__runEventHandler;
    global.__runEventHandler = undefined;
  });
}

function restoreMapperRun() {
  runOnUISync(() => {
    'worklet';
    const global = globalThis as MapperRunGlobal;
    global.__mapperRun = global.__savedMapperRun;
    global.__savedMapperRun = undefined;
    global.__runEventHandler = global.__savedRunEventHandler;
    global.__savedRunEventHandler = undefined;
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
  const debugTest = __DEV__ ? test : test.skip;

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

  debugTest(
    'keeps running mappers after another frame finalizer throws',
    async () => {
      await render(<ResizableBox />);
      const box = getTestComponent(BOX_REF);
      await expectEventually(() => box.getAnimatedStyle('width')).toBe(
        INITIAL_WIDTH,
        ComparisonMode.PIXEL
      );
      await sleepOnRN(SETTLE_MS);
      const width = widthValue!;

      await expect(() => {
        runOnUISync(() => {
          'worklet';
          globalThis.requestAnimationFrameFinalizer(() => {
            throw new Error(FINALIZER_ERROR);
          });
          width.value = UPDATED_WIDTH;
        });
      }).toThrow(FINALIZER_ERROR);

      await expectEventually(() => box.getAnimatedStyle('width')).toBe(
        UPDATED_WIDTH,
        ComparisonMode.PIXEL
      );

      width.value = INITIAL_WIDTH;

      await expectEventually(() => box.getAnimatedStyle('width')).toBe(
        INITIAL_WIDTH,
        ComparisonMode.PIXEL
      );
      await sleepOnRN(SETTLE_MS);
      const count = await countNativeFrameRequests(WINDOW_MS);
      expect(count).toBe(0);
    }
  );

  test('requests no frames for a scroll event that only moves an animated style', async () => {
    scrollEventCount = 0;
    await render(<ScrollDrivenBox />);
    const box = getTestComponent(SCROLL_DRIVEN_BOX_REF);
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      scrollViewRef?.current?.scrollTo({ y: SCROLL_OFFSET, animated: false });
    });

    expect(scrollEventCount > 0).toBe(true);
    expect(count).toBe(0);
    await expectEventually(() => box.getAnimatedStyle('top')).toBe(
      SCROLL_OFFSET,
      ComparisonMode.PIXEL
    );
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

function ScrollDrivenBox() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;
  const scrollY = useSharedValue(0);
  const ref = useTestRef(SCROLL_DRIVEN_BOX_REF);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    scheduleOnRN(onScrollEvent);
  });
  const animatedStyle = useAnimatedStyle(() => ({ top: scrollY.value }));
  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <View style={styles.tallContent} />
        <Animated.View
          ref={ref}
          style={[styles.scrollDrivenBox, animatedStyle]}
        />
      </Animated.ScrollView>
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
  scrollDrivenBox: {
    position: 'absolute',
    left: 0,
    width: INITIAL_WIDTH,
    height: 50,
    backgroundColor: 'teal',
  },
  box: {
    width: INITIAL_WIDTH,
    height: 50,
    backgroundColor: 'teal',
  },
});
