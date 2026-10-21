import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  AnimatedRef,
  ScrollHandlerProcessed,
} from 'react-native-reanimated';
import Animated, {
  interpolateColor,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
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

// A component composes its own scroll handler with one passed by its parent,
// and each handler must run once per scroll event. The internal handler drives
// the list's backgroundColor, read from the shadow tree. User drag and fling,
// and events other than onScroll, stay manual.

const LIST_REF = 'COMPOSED_MERGING_LIST';
const OFFSET_A = 'COMPOSED_MERGING_OFFSET_A';
const OFFSET_B = 'COMPOSED_MERGING_OFFSET_B';
const CALLS_A = 'COMPOSED_MERGING_CALLS_A';
const CALLS_B = 'COMPOSED_MERGING_CALLS_B';
const INTERNAL_OFFSET = 'COMPOSED_MERGING_INTERNAL_OFFSET';
const INTERNAL_CALLS = 'COMPOSED_MERGING_INTERNAL_CALLS';

const ITEM_SIZE = 100;
const ITEM_COUNT = 20;
/** Offsets inside the [0, COLOR_RANGE] input range of the list's color. */
const FIRST_OFFSET = 100;
const SECOND_OFFSET = 200;
const COLOR_RANGE = 300;
const COLOR_FROM = 'blue';
const COLOR_TO = 'purple';
/** Readiness nudges scroll by 1 px per attempt, far below FIRST_OFFSET. */
const READY_ATTEMPTS = 10;
const FRAMES_PER_READY_ATTEMPT = 5;
const NO_OFFSET = -1;

/** Written during render, read by the test. Reset in beforeEach. */
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;

type ScrollHandler = ScrollHandlerProcessed<Record<string, unknown>>;

function ColorChangingList({
  additionalHandler,
}: {
  additionalHandler: ScrollHandler;
}) {
  const testRef = useTestRef(LIST_REF);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;
  const setRef = useCallback(
    (node: Animated.ScrollView | null) => {
      testRef.current = node;
      scrollRef(node);
    },
    [testRef, scrollRef]
  );

  const internalOffset = useSharedValue(NO_OFFSET);
  const internalCalls = useSharedValue(0);
  registerValue(INTERNAL_OFFSET, internalOffset);
  registerValue(INTERNAL_CALLS, internalCalls);
  const internalHandler = useAnimatedScrollHandler({
    onScroll(e) {
      internalOffset.value = e.contentOffset.y;
      internalCalls.value += 1;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      Math.max(internalOffset.value, 0),
      [0, COLOR_RANGE],
      [COLOR_FROM, COLOR_TO]
    ),
  }));

  const composedHandler = useComposedEventHandler([
    internalHandler,
    additionalHandler,
  ]);

  return (
    <Animated.ScrollView
      ref={setRef}
      onScroll={composedHandler}
      scrollEventThrottle={16}
      style={[styles.list, animatedStyle]}>
      {[...Array(ITEM_COUNT).keys()].map((i) => (
        <View key={i} style={styles.item} />
      ))}
    </Animated.ScrollView>
  );
}

function Scenario({ passed }: { passed: 'A' | 'B' }) {
  const offsetA = useSharedValue(NO_OFFSET);
  const offsetB = useSharedValue(NO_OFFSET);
  const callsA = useSharedValue(0);
  const callsB = useSharedValue(0);
  registerValue(OFFSET_A, offsetA);
  registerValue(OFFSET_B, offsetB);
  registerValue(CALLS_A, callsA);
  registerValue(CALLS_B, callsB);

  const handlerA = useAnimatedScrollHandler({
    onScroll(e) {
      offsetA.value = e.contentOffset.y;
      callsA.value += 1;
    },
  });
  const handlerB = useAnimatedScrollHandler({
    onScroll(e) {
      offsetB.value = e.contentOffset.y;
      callsB.value += 1;
    },
  });

  return (
    <View style={styles.container}>
      <ColorChangingList
        additionalHandler={passed === 'A' ? handlerA : handlerB}
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
    scrollTo(ref, 0, offset, false);
  });
}

const readValue = (name: string) => getSharedValue<number>(name);
const readInternalOffset = () => readValue(INTERNAL_OFFSET);

/** A scroll command sent before the native scroll view mounts is dropped. */
async function waitForScrollHandlerReady() {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt++) {
    sendScroll(attempt);
    await waitForFrames(FRAMES_PER_READY_ATTEMPT);
    if ((await readInternalOffset()) !== NO_OFFSET) {
      await waitUntilSettled(readInternalOffset);
      return;
    }
  }
  throw new Error('Scroll handler never received an event');
}

async function scrollToAndSettle(offset: number) {
  sendScroll(offset);
  await expectEventually(readInternalOffset).toBe(offset, ComparisonMode.PIXEL);
  await waitUntilSettled(() => readValue(INTERNAL_CALLS));
}

/**
 * The two counters are read one after the other, so a late scroll event between
 * the reads can make them differ by one for a moment.
 */
async function expectCallsMatch(
  passedCalls: string,
  internalCallsBefore: number
) {
  await expectEventually(
    async () =>
      (await readValue(INTERNAL_CALLS)) -
      internalCallsBefore -
      (await readValue(passedCalls))
  ).toBe(0, ComparisonMode.NUMBER);
}

async function expectListColorAt(offset: number) {
  const expected = interpolateColor(
    offset,
    [0, COLOR_RANGE],
    [COLOR_FROM, COLOR_TO]
  );
  await expectEventually(() =>
    getTestComponent(LIST_REF).getAnimatedStyle('backgroundColor')
  ).toBe(expected, ComparisonMode.COLOR);
}

describe('useComposedEventHandler merging an internal and a passed handler', () => {
  beforeEach(() => {
    scrollViewRef = null;
  });

  test('both the internal and the passed handler run once for every scroll event', async () => {
    await render(<Scenario passed="A" />);
    await waitForScrollHandlerReady();

    await scrollToAndSettle(FIRST_OFFSET);

    expect(await readValue(OFFSET_A)).toBe(FIRST_OFFSET, ComparisonMode.PIXEL);
    // Both run inside one composed worklet, so they see the same events.
    await expectCallsMatch(CALLS_A, 0);
    await expectListColorAt(FIRST_OFFSET);
  });

  test('a new passed handler replaces the old one, and the internal handler keeps working', async () => {
    await render(<Scenario passed="A" />);
    await waitForScrollHandlerReady();
    await scrollToAndSettle(FIRST_OFFSET);

    await render(<Scenario passed="B" />);
    const callsABeforeSwap = await readValue(CALLS_A);
    const internalCallsBeforeSwap = await readValue(INTERNAL_CALLS);
    await scrollToAndSettle(SECOND_OFFSET);

    expect(await readValue(OFFSET_B)).toBe(SECOND_OFFSET, ComparisonMode.PIXEL);
    await expectCallsMatch(CALLS_B, internalCallsBeforeSwap);
    // The replaced handler saw nothing after the new render.
    expect(await readValue(OFFSET_A)).toBe(FIRST_OFFSET, ComparisonMode.PIXEL);
    expect(await readValue(CALLS_A)).toBe(
      callsABeforeSwap,
      ComparisonMode.NUMBER
    );
    await expectListColorAt(SECOND_OFFSET);
  });
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    height: 2 * ITEM_SIZE,
    width: ITEM_SIZE,
  },
  item: {
    borderBottomWidth: 1,
    height: ITEM_SIZE,
  },
});
