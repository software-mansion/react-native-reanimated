import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  AnimatedRef,
  ScrollHandlerProcessed,
} from 'react-native-reanimated';
import Animated, {
  configureReanimatedLogger,
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
  afterEach,
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

// A component composes its own scroll handler with one passed by its parent.
// Each handler must run once per scroll event, counted against the same list
// with its own handler uncomposed. A new passed handler must replace the old
// one, and Reanimated must log nothing. The internal handler drives the list's
// backgroundColor, read from the shadow tree. User drag, fling, momentum and
// begin/end-drag events are not covered.

const LIST_REF = 'COMPOSED_MERGING_LIST';
const OFFSET_A = 'COMPOSED_MERGING_OFFSET_A';
const OFFSET_B = 'COMPOSED_MERGING_OFFSET_B';
const CALLS_A = 'COMPOSED_MERGING_CALLS_A';
const CALLS_B = 'COMPOSED_MERGING_CALLS_B';
const INTERNAL_OFFSET = 'COMPOSED_MERGING_INTERNAL_OFFSET';
const INTERNAL_CALLS = 'COMPOSED_MERGING_INTERNAL_CALLS';

/** A new key remounts the list, the same key re-renders it. */
const REFERENCE_KEY = 'reference';
const COMPOSED_KEY = 'composed';

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
/**
 * Reads, 16 ms apart, without a new call before a call count is final. The two
 * iOS events of one scrollTo arrive within a few ms of each other.
 */
const STABLE_CALL_READS = 10;
const NO_OFFSET = -1;

/** Written during render, read by the test. Reset in beforeEach. */
let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;
/** Reanimated warnings and errors logged during the current test. */
const capturedLogs: string[] = [];

/** Without a passed handler, the list uses its own handler uncomposed. */
function ColorChangingList({
  additionalHandler,
}: {
  additionalHandler: ScrollHandlerProcessed | null;
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
      onScroll={additionalHandler ? composedHandler : internalHandler}
      style={[styles.list, animatedStyle]}>
      {[...Array(ITEM_COUNT).keys()].map((i) => (
        <View key={i} style={styles.item} />
      ))}
    </Animated.ScrollView>
  );
}

function Scenario({ passed }: { passed?: 'A' | 'B' }) {
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

  let passedHandler: ScrollHandlerProcessed | null = null;
  if (passed === 'A') {
    passedHandler = handlerA;
  } else if (passed === 'B') {
    passedHandler = handlerB;
  }

  return (
    <View style={styles.container}>
      <ColorChangingList additionalHandler={passedHandler} />
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
    if ((await readInternalOffset()) > 0) {
      await waitUntilSettled(() => readValue(INTERNAL_CALLS), {
        stableFrames: STABLE_CALL_READS,
      });
      return;
    }
  }
  throw new Error('Scroll handler never received an event');
}

async function scrollToAndSettle(offset: number) {
  sendScroll(offset);
  await expectEventually(readInternalOffset).toBe(offset, ComparisonMode.PIXEL);
  await waitUntilSettled(() => readValue(INTERNAL_CALLS), {
    stableFrames: STABLE_CALL_READS,
  });
}

/**
 * The number of onScroll events one scrollTo produces differs between platforms
 * (2 on iOS, 1 on Android), so it is measured on a freshly mounted list whose
 * handler is not composed.
 */
async function measureEventsPerScroll() {
  await render(<Scenario key={REFERENCE_KEY} />);
  await waitForScrollHandlerReady();
  const callsBefore = await readValue(INTERNAL_CALLS);
  await scrollToAndSettle(FIRST_OFFSET);
  const eventsPerScroll = (await readValue(INTERNAL_CALLS)) - callsBefore;
  expect(eventsPerScroll).toBeWithinRange(1, Number.MAX_SAFE_INTEGER);
  return eventsPerScroll;
}

async function expectCallsSince(
  counter: string,
  callsBefore: number,
  expectedCalls: number
) {
  expect((await readValue(counter)) - callsBefore).toBe(
    expectedCalls,
    ComparisonMode.NUMBER
  );
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
    capturedLogs.length = 0;
    configureReanimatedLogger({}, ({ message }) => {
      capturedLogs.push(message);
    });
  });

  afterEach(() => {
    // Back to the default config, without the onLog callback.
    configureReanimatedLogger({});
  });

  test('both the internal and the passed handler run once for every scroll event', async () => {
    const eventsPerScroll = await measureEventsPerScroll();

    await render(<Scenario key={COMPOSED_KEY} passed="A" />);
    await waitForScrollHandlerReady();
    const internalCallsBefore = await readValue(INTERNAL_CALLS);
    const callsABefore = await readValue(CALLS_A);
    await scrollToAndSettle(FIRST_OFFSET);

    await expectCallsSince(
      INTERNAL_CALLS,
      internalCallsBefore,
      eventsPerScroll
    );
    await expectCallsSince(CALLS_A, callsABefore, eventsPerScroll);
    expect(await readValue(OFFSET_A)).toBe(FIRST_OFFSET, ComparisonMode.PIXEL);
    await expectListColorAt(FIRST_OFFSET);
    expect(capturedLogs.join('\n')).toBe('');
  });

  test('a new passed handler replaces the old one, and the internal handler keeps working', async () => {
    const eventsPerScroll = await measureEventsPerScroll();

    await render(<Scenario key={COMPOSED_KEY} passed="A" />);
    await waitForScrollHandlerReady();
    await scrollToAndSettle(FIRST_OFFSET);

    await render(<Scenario key={COMPOSED_KEY} passed="B" />);
    const callsABeforeSwap = await readValue(CALLS_A);
    const internalCallsBeforeSwap = await readValue(INTERNAL_CALLS);
    await scrollToAndSettle(SECOND_OFFSET);

    await expectCallsSince(
      INTERNAL_CALLS,
      internalCallsBeforeSwap,
      eventsPerScroll
    );
    await expectCallsSince(CALLS_B, 0, eventsPerScroll);
    expect(await readValue(OFFSET_B)).toBe(SECOND_OFFSET, ComparisonMode.PIXEL);
    // The replaced handler saw nothing after the new render.
    expect(await readValue(OFFSET_A)).toBe(FIRST_OFFSET, ComparisonMode.PIXEL);
    expect(await readValue(CALLS_A)).toBe(
      callsABeforeSwap,
      ComparisonMode.NUMBER
    );
    await expectListColorAt(SECOND_OFFSET);
    expect(capturedLogs.join('\n')).toBe('');
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
