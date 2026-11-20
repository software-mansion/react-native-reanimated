import { StyleSheet, View } from 'react-native';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  notify,
  render,
  test,
  wait,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const MODE_COUNT_ONLY = 0;
const MODE_PROMISE = 1;
const MODE_QUEUE_MICROTASK = 2;

const ITEM_SIZE = 100;
const ITEM_COUNT = 10;
const READY_ATTEMPTS = 10;
const READY_ATTEMPT_MS = 100;
const IDLE_MS = 300;
const MICROTASK_TIMEOUT_MS = 2000;
const MICROTASK_NOTIFICATION = 'EVENT_HANDLER_MICROTASK';
const SCROLL_OFFSET = 50;

let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;
let modeValue: SharedValue<number> | null = null;
let eventCount = 0;

function onEvent() {
  eventCount++;
}

function onMicrotask() {
  notify(MICROTASK_NOTIFICATION);
}

describe('microtasks queued by an event handler', () => {
  beforeEach(() => {
    scrollViewRef = null;
    modeValue = null;
    eventCount = 0;
  });

  test('runs a promise reaction after the event without further input', async () => {
    await renderIdleListInMode(MODE_PROMISE);
    const eventCountBefore = eventCount;

    sendScroll(SCROLL_OFFSET);

    await waitForNotification(MICROTASK_NOTIFICATION, MICROTASK_TIMEOUT_MS);
    expect(eventCount > eventCountBefore).toBe(true);
  });

  test('runs a queueMicrotask callback after the event without further input', async () => {
    await renderIdleListInMode(MODE_QUEUE_MICROTASK);
    const eventCountBefore = eventCount;

    sendScroll(SCROLL_OFFSET);

    await waitForNotification(MICROTASK_NOTIFICATION, MICROTASK_TIMEOUT_MS);
    expect(eventCount > eventCountBefore).toBe(true);
  });
});

async function renderIdleListInMode(mode: number) {
  await render(<ScrollList />);
  await waitForScrollHandlerReady();
  modeValue!.value = mode;
  await wait(IDLE_MS);
}

async function waitForScrollHandlerReady() {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt++) {
    const countBefore = eventCount;
    sendScroll(attempt);
    await wait(READY_ATTEMPT_MS);
    if (eventCount > countBefore) {
      await wait(IDLE_MS);
      return;
    }
  }
  throw new Error('Scroll handler never received an event');
}

function sendScroll(offset: number) {
  const ref = scrollViewRef;
  if (!ref) {
    throw new Error('Scroll view ref was not set');
  }
  ref.current?.scrollTo({ y: offset, animated: false });
}

function ScrollList() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;
  const mode = useSharedValue(MODE_COUNT_ONLY);
  modeValue = mode;

  const onScroll = useAnimatedScrollHandler(() => {
    scheduleOnRN(onEvent);
    if (mode.value === MODE_PROMISE) {
      Promise.resolve()
        .then(() => {
          scheduleOnRN(onMicrotask);
        })
        .catch(() => {});
    } else if (mode.value === MODE_QUEUE_MICROTASK) {
      queueMicrotask(() => {
        scheduleOnRN(onMicrotask);
      });
    }
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.list}>
        {[...Array(ITEM_COUNT).keys()].map((i) => (
          <View key={i} style={styles.item} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    height: ITEM_SIZE * 2,
  },
  item: {
    height: ITEM_SIZE,
    backgroundColor: 'teal',
    marginBottom: 1,
  },
});
