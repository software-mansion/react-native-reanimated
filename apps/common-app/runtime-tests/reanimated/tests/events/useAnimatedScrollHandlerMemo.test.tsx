import { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type {
  AnimatedRef,
  AnimatedStyle,
  ScrollHandlerProcessed,
} from 'react-native-reanimated';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  expectEventually,
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

// Regression coverage for https://github.com/software-mansion/react-native-reanimated/issues/5364
// (fixed in #5743): a scroll handler passed through React.memo must not keep a stale closure.

const SEEN_VALUE = 'MEMO_SCROLL_SEEN_VALUE';
const LAST_OFFSET = 'MEMO_SCROLL_LAST_OFFSET';
const CALL_COUNT = 'MEMO_SCROLL_CALL_COUNT';
const BOX_REF = 'MEMO_SCROLL_BOX';

const ITEM_SIZE = 100;
const ITEM_COUNT = 10;
const SCROLL_STEP = 50;
const REBUILD_COUNT = 3;
// Readiness nudges scroll by 1 px per attempt, far below SCROLL_STEP.
const READY_ATTEMPTS = 10;
const FRAMES_PER_READY_ATTEMPT = 5;

// The square mirrors MemoExample: its width follows the scroll offset. Its
// color comes from the captured value, so a stale closure shows on screen.
const BOX_BASE_WIDTH = 100;
const BOX_WIDTH_DIVISOR = 5;
const BOX_HEIGHT = 50;
const BOX_INITIAL_COLOR = '#808080';
const BOX_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

// Written during render, read by the test. Reset in beforeEach.
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;
let childRenderCount = 0;

type ScrollListProps = {
  onScroll: ScrollHandlerProcessed<Record<string, unknown>>;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  boxStyle?: AnimatedStyle<ViewStyle>;
};

function Square({
  animatedStyle,
}: {
  animatedStyle: AnimatedStyle<ViewStyle>;
}) {
  const ref = useTestRef(BOX_REF);
  return <Animated.View ref={ref} style={[styles.box, animatedStyle]} />;
}

const MemoizedScrollList = memo(
  ({ onScroll, scrollRef, boxStyle }: ScrollListProps) => {
    childRenderCount += 1;
    return (
      <>
        {boxStyle && <Square animatedStyle={boxStyle} />}
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
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
      </>
    );
  }
);

/**
 * `capturedValue` is read inside the scroll worklet, so changing it changes the
 * worklet closure. `unrelatedValue` only re-renders the parent. `withBox` adds
 * the animated square, passed through the memo child like in MemoExample.
 */
function Scenario({
  capturedValue,
  withBox = false,
}: {
  capturedValue: number;
  unrelatedValue: number;
  withBox?: boolean;
}) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;

  const seenValue = useSharedValue(-1);
  const lastOffset = useSharedValue(-1);
  const callCount = useSharedValue(0);
  registerValue(SEEN_VALUE, seenValue);
  registerValue(LAST_OFFSET, lastOffset);
  registerValue(CALL_COUNT, callCount);

  const boxWidth = useSharedValue(BOX_BASE_WIDTH);
  const boxColor = useSharedValue(BOX_INITIAL_COLOR);

  const onScroll = useAnimatedScrollHandler((event) => {
    seenValue.value = capturedValue;
    lastOffset.value = event.contentOffset.x;
    callCount.value += 1;
    boxWidth.value = BOX_BASE_WIDTH + event.contentOffset.x / BOX_WIDTH_DIVISOR;
    boxColor.value = BOX_COLORS[capturedValue % BOX_COLORS.length];
  });

  const boxStyle = useAnimatedStyle(() => ({
    width: boxWidth.value,
    backgroundColor: boxColor.value,
  }));

  return (
    <View style={styles.container}>
      <MemoizedScrollList
        onScroll={onScroll}
        scrollRef={scrollRef}
        boxStyle={withBox ? boxStyle : undefined}
      />
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

/**
 * `render` does not wait for the native scroll view to mount, and a scroll
 * command that arrives before it does is dropped. Nudge the list until the
 * handler reports an event, then let the events settle. Call once after the
 * first render, before any measured scroll.
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

/** Scrolls to a new offset and waits until every resulting event was handled. */
async function scrollToAndSettle(offset: number) {
  sendScroll(offset);
  await expectEventually(() => getSharedValue<number>(LAST_OFFSET)).toBe(
    offset,
    ComparisonMode.PIXEL
  );
  return waitUntilSettled(() => getSharedValue<number>(CALL_COUNT));
}

describe('useAnimatedScrollHandler passed through React.memo', () => {
  beforeEach(() => {
    scrollViewRef = null;
    childRenderCount = 0;
  });

  test('scroll worklet sees the value from the latest render', async () => {
    await render(<Scenario capturedValue={0} unrelatedValue={0} />);
    await waitForScrollHandlerReady();
    await scrollToAndSettle(SCROLL_STEP);
    expect(await getSharedValue<number>(SEEN_VALUE)).toBe(
      0,
      ComparisonMode.NUMBER
    );

    for (let value = 1; value <= REBUILD_COUNT; value++) {
      await render(<Scenario capturedValue={value} unrelatedValue={0} />);
      await scrollToAndSettle(SCROLL_STEP * (value + 1));
      expect(await getSharedValue<number>(SEEN_VALUE)).toBe(
        value,
        ComparisonMode.NUMBER
      );
    }
  });

  test('handler reference changes when the worklet closure changes', async () => {
    await render(<Scenario capturedValue={0} unrelatedValue={0} />);
    expect(childRenderCount).toBe(1, ComparisonMode.NUMBER);

    for (let value = 1; value <= REBUILD_COUNT; value++) {
      await render(<Scenario capturedValue={value} unrelatedValue={0} />);
      // The memo child re-renders only if it receives a new handler object.
      expect(childRenderCount).toBe(value + 1, ComparisonMode.NUMBER);
    }
  });

  test('handler reference stays the same when the worklet closure does not change', async () => {
    await render(<Scenario capturedValue={0} unrelatedValue={0} />);
    expect(childRenderCount).toBe(1, ComparisonMode.NUMBER);

    for (let unrelated = 1; unrelated <= REBUILD_COUNT; unrelated++) {
      await render(<Scenario capturedValue={0} unrelatedValue={unrelated} />);
    }
    expect(childRenderCount).toBe(1, ComparisonMode.NUMBER);
  });

  test('rebuilding the handler does not register it twice', async () => {
    await render(<Scenario capturedValue={0} unrelatedValue={0} />);
    await waitForScrollHandlerReady();
    const countBeforeReference = await getSharedValue<number>(CALL_COUNT);
    const countAfterReference = await scrollToAndSettle(SCROLL_STEP);
    const callsPerScrollBefore = countAfterReference - countBeforeReference;
    expect(callsPerScrollBefore).toBeWithinRange(1, Number.MAX_SAFE_INTEGER);

    for (let value = 1; value <= REBUILD_COUNT; value++) {
      await render(<Scenario capturedValue={value} unrelatedValue={0} />);
    }

    const countAfterRebuilds = await scrollToAndSettle(SCROLL_STEP * 2);
    // With a leaked registration, every stale handler runs too.
    expect(countAfterRebuilds - countAfterReference).toBe(
      callsPerScrollBefore,
      ComparisonMode.NUMBER
    );
  });

  test('square on screen follows the scroll offset and the latest captured value', async () => {
    for (let value = 0; value <= REBUILD_COUNT; value++) {
      await render(
        <Scenario capturedValue={value} unrelatedValue={0} withBox />
      );
      if (value === 0) {
        await waitForScrollHandlerReady();
      }
      const offset = SCROLL_STEP * (value + 1);
      await scrollToAndSettle(offset);

      const box = getTestComponent(BOX_REF);
      await expectEventually(async () =>
        Number(await box.getAnimatedStyle('width'))
      ).toBe(BOX_BASE_WIDTH + offset / BOX_WIDTH_DIVISOR, ComparisonMode.PIXEL);
      await expectEventually(() =>
        box.getAnimatedStyle('backgroundColor')
      ).toBe(BOX_COLORS[value], ComparisonMode.COLOR);
    }
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
  box: {
    height: BOX_HEIGHT,
    margin: 10,
  },
});
