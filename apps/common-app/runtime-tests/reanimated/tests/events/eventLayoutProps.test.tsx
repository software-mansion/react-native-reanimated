import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  getSharedValue,
  getTestComponent,
  registerValue,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitUntilSettled,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

// On Android, the layout work that an event causes waits for the next frame callback.
// This test makes sure that it does not wait longer.

const BOX_REF = 'EVENT_LAYOUT_BOX';
const OFFSET = 'EVENT_LAYOUT_OFFSET';
const CALL_COUNT = 'EVENT_LAYOUT_CALL_COUNT';

const BOX_BASE_HEIGHT = 50;
const LIST_HEIGHT = 300;
const CONTENT_HEIGHT = 2000;
const SCROLL_OFFSET = 120;
const FRAMES_TO_MOUNT = 4;
const READY_ATTEMPTS = 10;
const FRAMES_PER_READY_ATTEMPT = 5;

// Written during render, read by the test.
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;

function Scenario() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;
  const boxRef = useTestRef(BOX_REF);

  const offset = useSharedValue(0);
  const callCount = useSharedValue(0);
  registerValue(OFFSET, offset);
  registerValue(CALL_COUNT, callCount);

  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
    callCount.value += 1;
  });

  const boxStyle = useAnimatedStyle(() => ({
    height: BOX_BASE_HEIGHT + offset.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={1}
        style={styles.list}>
        <View style={styles.content} />
      </Animated.ScrollView>
      <Animated.View ref={boxRef} style={[styles.box, boxStyle]} />
    </View>
  );
}

function sendScroll(offset: number) {
  const ref = scrollViewRef;
  if (!ref) {
    throw new Error('Scroll view ref was not set');
  }
  scheduleOnUI(() => {
    'worklet';
    scrollTo(ref, 0, offset, false);
  });
}

/**
 * A scroll command that arrives before the native scroll view mounts is
 * dropped.
 */
async function waitForScrollHandlerReady() {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt++) {
    const countBefore = await getSharedValue<number>(CALL_COUNT);
    sendScroll(attempt);
    await waitForFrames(FRAMES_PER_READY_ATTEMPT);
    if ((await getSharedValue<number>(CALL_COUNT)) > countBefore) {
      await waitUntilSettled(() => getSharedValue<number>(CALL_COUNT));
      return;
    }
  }
  throw new Error('Scroll handler never received an event');
}

async function getMountedBoxHeight() {
  const props = await getTestComponent(BOX_REF).getMountedViewProps();
  if (!props) {
    throw new Error('Box is not mounted');
  }
  return props.height;
}

describe('Layout props that a scroll event sets', () => {
  test('mount within a few frames after the event', async () => {
    await render(<Scenario />);
    await waitForScrollHandlerReady();

    sendScroll(SCROLL_OFFSET);
    await waitForFrames(FRAMES_TO_MOUNT);

    expect(await getSharedValue<number>(OFFSET)).toBe(
      SCROLL_OFFSET,
      ComparisonMode.PIXEL
    );
    expect(await getMountedBoxHeight()).toBe(
      BOX_BASE_HEIGHT + SCROLL_OFFSET,
      ComparisonMode.PIXEL
    );
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    height: LIST_HEIGHT,
    flexGrow: 0,
  },
  content: {
    height: CONTENT_HEIGHT,
    backgroundColor: 'lightblue',
  },
  box: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    backgroundColor: 'orange',
  },
});
