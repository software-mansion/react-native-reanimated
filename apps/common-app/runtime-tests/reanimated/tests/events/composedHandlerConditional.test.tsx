import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  configureReanimatedLogger,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
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
  registerValue,
  render,
  test,
  waitForFrames,
  waitUntilSettled,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

// useComposedEventHandler on an Animated.FlatList with handlers passed as null
// between renders: a handler that is off gets no scroll events, one that is on
// gets as many as one uncomposed handler on a freshly mounted list, and
// Reanimated logs nothing. Drag, fling and momentum are not covered.

const HANDLERS = ['first', 'second', 'third'] as const;
type HandlerName = (typeof HANDLERS)[number];
type Enabled = Record<HandlerName, boolean>;
const countName = (handler: HandlerName) =>
  `COMPOSED_CONDITIONAL_${handler.toUpperCase()}_COUNT`;

/** A new key remounts the list, the same key re-renders it. */
const REFERENCE_KEY = 'reference';
const COMPOSED_KEY = 'composed';

const ALL_ON: Enabled = { first: true, second: true, third: true };
const ALL_OFF: Enabled = { first: false, second: false, third: false };
const SECOND_OFF: Enabled = { first: true, second: false, third: true };

const ITEM_SIZE = 100;
const ITEMS = [...Array(20).keys()];
const SCROLL_STEP = 100;
/** Readiness nudges scroll by 1 px per attempt, far below SCROLL_STEP. */
const READY_ATTEMPTS = 10;
const FRAMES_PER_READY_ATTEMPT = 5;
/**
 * Reads, 16 ms apart, without a new call before a call count is final. The two
 * iOS events of one scrollTo arrive within a few ms of each other.
 */
const STABLE_CALL_READS = 10;
/**
 * With every handler off nothing counts the events, so the check waits a fixed
 * 20 frames, far longer than the few ms in which one scrollTo delivers them.
 */
const FRAMES_WITHOUT_HANDLERS = 20;

/** Written during render, read by the test. Reset in beforeEach. */
let listRef: AnimatedRef<Animated.FlatList<number>> | null = null;
/** Reanimated warnings and errors logged during the current test. */
const capturedLogs: string[] = [];

/** Without `enabled`, the list uses the first handler alone, uncomposed. */
function Scenario({ enabled }: { enabled?: Enabled }) {
  const animatedRef = useAnimatedRef<Animated.FlatList<number>>();
  listRef = animatedRef;

  const firstCount = useSharedValue(0);
  const secondCount = useSharedValue(0);
  const thirdCount = useSharedValue(0);
  registerValue(countName('first'), firstCount);
  registerValue(countName('second'), secondCount);
  registerValue(countName('third'), thirdCount);

  const firstHandler = useAnimatedScrollHandler({
    onScroll() {
      firstCount.value += 1;
    },
  });
  const secondHandler = useAnimatedScrollHandler({
    onScroll() {
      secondCount.value += 1;
    },
  });
  const thirdHandler = useAnimatedScrollHandler({
    onScroll() {
      thirdCount.value += 1;
    },
  });

  const composedHandler = useComposedEventHandler([
    enabled?.first ? firstHandler : null,
    enabled?.second ? secondHandler : null,
    enabled?.third ? thirdHandler : null,
  ]);

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={animatedRef}
        onScroll={enabled ? composedHandler : firstHandler}
        style={styles.list}
        data={ITEMS}
        keyExtractor={(item) => `${item}`}
        renderItem={() => <View style={styles.item} />}
      />
    </View>
  );
}

function sendScroll(offset: number) {
  const ref = listRef;
  if (!ref) {
    throw new Error('List ref was not set');
  }
  scheduleOnUI(() => {
    'worklet';
    scrollTo(ref, 0, offset, false);
  });
}

async function readCounts() {
  const counts = {} as Record<HandlerName, number>;
  for (const handler of HANDLERS) {
    counts[handler] = await getSharedValue<number>(countName(handler));
  }
  return counts;
}

async function totalCount() {
  const counts = await readCounts();
  return counts.first + counts.second + counts.third;
}

async function waitUntilCallsSettle() {
  await waitUntilSettled(totalCount, { stableFrames: STABLE_CALL_READS });
}

/**
 * A scroll command sent before the native list mounts is dropped. Nudges the
 * list until the first handler reports an event. The first handler is on.
 */
async function waitForScrollHandlerReady() {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt++) {
    const before = await getSharedValue<number>(countName('first'));
    sendScroll(attempt);
    await waitForFrames(FRAMES_PER_READY_ATTEMPT);
    if ((await getSharedValue<number>(countName('first'))) > before) {
      await waitUntilCallsSettle();
      return;
    }
  }
  throw new Error('Scroll handler never received an event');
}

/** Scrolls one step and returns how many calls each handler got for it. */
async function scrollAndCount(offset: number, enabled: Enabled) {
  const before = await readCounts();
  const totalBefore = before.first + before.second + before.third;
  sendScroll(offset);
  if (HANDLERS.some((handler) => enabled[handler])) {
    await expectEventually(totalCount).not.toBe(
      totalBefore,
      ComparisonMode.NUMBER
    );
    await waitUntilCallsSettle();
  } else {
    await waitForFrames(FRAMES_WITHOUT_HANDLERS);
  }
  const after = await readCounts();
  const calls = {} as Record<HandlerName, number>;
  for (const handler of HANDLERS) {
    calls[handler] = after[handler] - before[handler];
  }
  return calls;
}

/**
 * One scrollTo produces 2 onScroll events on iOS and 1 on Android, so the
 * number is measured on a freshly mounted list with one uncomposed handler.
 */
async function measureEventsPerScroll() {
  await render(<Scenario key={REFERENCE_KEY} />);
  await waitForScrollHandlerReady();
  const { first } = await scrollAndCount(SCROLL_STEP, ALL_ON);
  expect(first).toBeWithinRange(1, Number.MAX_SAFE_INTEGER);
  return first;
}

/** Mounts the composed list with every handler on, then renders `enabled`. */
async function renderComposed(enabled: Enabled) {
  await render(<Scenario key={COMPOSED_KEY} enabled={ALL_ON} />);
  await waitForScrollHandlerReady();
  // useEvent re-registers during render, which queues the registration on the
  // UI thread ahead of the next scrollTo, so no wait is needed.
  await render(<Scenario key={COMPOSED_KEY} enabled={enabled} />);
}

async function expectCallsPerScroll(
  offset: number,
  enabled: Enabled,
  eventsPerScroll: number
) {
  const calls = await scrollAndCount(offset, enabled);
  for (const handler of HANDLERS) {
    expect(calls[handler]).toBe(
      enabled[handler] ? eventsPerScroll : 0,
      ComparisonMode.NUMBER
    );
  }
}

describe('useComposedEventHandler with handlers switched on and off', () => {
  beforeEach(() => {
    listRef = null;
    capturedLogs.length = 0;
    configureReanimatedLogger({}, ({ message }) => {
      capturedLogs.push(message);
    });
  });

  afterEach(() => {
    // Back to the default config, without the onLog callback.
    configureReanimatedLogger({});
  });

  test.each([
    {
      description: 'the first handler off',
      enabled: { first: false, second: true, third: true },
    },
    { description: 'the second handler off', enabled: SECOND_OFF },
    {
      description: 'only the second handler on',
      enabled: { first: false, second: true, third: false },
    },
    { description: 'all handlers off', enabled: ALL_OFF },
  ])(
    'with ${description}, only the handlers that are on run, once per scroll event',
    async ({ enabled }) => {
      const eventsPerScroll = await measureEventsPerScroll();
      await renderComposed(enabled);

      await expectCallsPerScroll(SCROLL_STEP, enabled, eventsPerScroll);
      expect(capturedLogs.join('\n')).toBe('');
    }
  );

  test('handlers switched off and on again run once per scroll event again', async () => {
    const eventsPerScroll = await measureEventsPerScroll();
    await renderComposed(SECOND_OFF);
    await expectCallsPerScroll(SCROLL_STEP, SECOND_OFF, eventsPerScroll);

    const steps = [ALL_ON, ALL_OFF, ALL_ON];
    for (const [index, enabled] of steps.entries()) {
      await render(<Scenario key={COMPOSED_KEY} enabled={enabled} />);
      await expectCallsPerScroll(
        (index + 2) * SCROLL_STEP,
        enabled,
        eventsPerScroll
      );
    }
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
    backgroundColor: 'lightblue',
    borderBottomWidth: 1,
    height: ITEM_SIZE,
  },
});
