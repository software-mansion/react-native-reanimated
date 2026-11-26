import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  expectEventually,
  getSharedValue,
  registerValue,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const FIRST_OFFSET = 'SCROLL_OFFSET_SWAP_FIRST';
const SECOND_OFFSET = 'SCROLL_OFFSET_SWAP_SECOND';

const ITEM_SIZE = 100;
const ITEM_COUNT = 10;
const SCROLL_STEP = 50;
const READY_ATTEMPTS = 10;
const FRAMES_PER_READY_ATTEMPT = 5;

let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;

function Scenario({ useSecond }: { useSecond: boolean }) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;

  const first = useSharedValue(-1);
  const second = useSharedValue(-1);
  registerValue(FIRST_OFFSET, first);
  registerValue(SECOND_OFFSET, second);

  useScrollOffset(scrollRef, useSecond ? second : first);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        horizontal
        style={styles.list}>
        {[...Array(ITEM_COUNT).keys()].map((i) => (
          <View
            key={i}
            style={[
              styles.item,
              { backgroundColor: `hsl(${i * 36}, 50%, 50%)` },
            ]}
          />
        ))}
      </Animated.ScrollView>
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
    scrollTo(ref, offset, 0, false);
  });
}

async function waitForFirstOffsetReady() {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt++) {
    sendScroll(attempt);
    await waitForFrames(FRAMES_PER_READY_ATTEMPT);
    if ((await getSharedValue<number>(FIRST_OFFSET)) >= 0) {
      return;
    }
  }
  throw new Error('useScrollOffset never received a scroll event');
}

describe('useScrollOffset with a swapped providedOffset', () => {
  test('writes the scroll offset to the shared value from the latest render', async () => {
    await render(<Scenario useSecond={false} />);
    await waitForFirstOffsetReady();
    sendScroll(SCROLL_STEP);
    await expectEventually(() => getSharedValue<number>(FIRST_OFFSET)).toBe(
      SCROLL_STEP,
      ComparisonMode.PIXEL
    );

    await render(<Scenario useSecond />);
    sendScroll(SCROLL_STEP * 2);

    await expectEventually(() => getSharedValue<number>(SECOND_OFFSET)).toBe(
      SCROLL_STEP * 2,
      ComparisonMode.PIXEL
    );
    expect(await getSharedValue<number>(FIRST_OFFSET)).toBe(
      SCROLL_STEP,
      ComparisonMode.PIXEL
    );
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    flexGrow: 0,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
});
