import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';

type LogEntry = [kind: number, time: number, offset: number];

type LogGlobal = typeof globalThis & { __scrollDrivenStyleLog?: LogEntry[] };

const KIND_EVENT = 0;
const KIND_STYLE = 1;
const ROW_COUNT = 40;
const ROW_HEIGHT = 80;
const SCROLL_ATTEMPTS = 5;
const SCROLL_STEP = 300;
const SCROLL_SETTLE_MS = 1200;
const MIN_EVENTS = 5;
const SAME_CALL_MAX_DELAY_MS = 4;

let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;

describe('scroll-driven animated style', () => {
  beforeEach(() => {
    scrollViewRef = null;
  });

  test('is computed right after each event of an animated scroll', async () => {
    await render(<Scene />);
    startLog();

    const delays = await scrollUntilEventsArrive();

    expect(delays.length >= MIN_EVENTS).toBe(true);
    expect(Math.max(...delays) < SAME_CALL_MAX_DELAY_MS).toBe(true);
  });
});

async function scrollUntilEventsArrive() {
  for (let attempt = 1; attempt <= SCROLL_ATTEMPTS; attempt++) {
    scrollViewRef?.current?.scrollTo({
      y: attempt * SCROLL_STEP,
      animated: true,
    });
    await wait(SCROLL_SETTLE_MS);
    const delays = getDelays(readLog());
    if (delays.length >= MIN_EVENTS) {
      return delays;
    }
  }
  return getDelays(readLog());
}

function getDelays(entries: LogEntry[]) {
  const eventTimeByOffset = new Map<number, number>();
  const delays: number[] = [];
  for (const [kind, time, offset] of entries) {
    if (kind === KIND_EVENT) {
      eventTimeByOffset.set(offset, time);
    } else {
      const eventTime = eventTimeByOffset.get(offset);
      if (eventTime !== undefined) {
        delays.push(time - eventTime);
        eventTimeByOffset.delete(offset);
      }
    }
  }
  return delays;
}

function startLog() {
  runOnUISync(() => {
    'worklet';
    (globalThis as LogGlobal).__scrollDrivenStyleLog = [];
  });
}

function readLog() {
  return runOnUISync(() => {
    'worklet';
    return (globalThis as LogGlobal).__scrollDrivenStyleLog ?? [];
  });
}

function Scene() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  scrollViewRef = scrollRef;
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    const offset = event.contentOffset.y;
    (globalThis as LogGlobal).__scrollDrivenStyleLog?.push([
      KIND_EVENT,
      performance.now(),
      offset,
    ]);
    scrollY.value = offset;
  });

  const stickyStyle = useAnimatedStyle(() => {
    const offset = scrollY.value;
    (globalThis as LogGlobal).__scrollDrivenStyleLog?.push([
      KIND_STYLE,
      performance.now(),
      offset,
    ]);
    return { transform: [{ translateY: offset }] };
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={1}
        style={styles.list}>
        {[...Array(ROW_COUNT).keys()].map((i) => (
          <View key={i} style={styles.row} />
        ))}
        <Animated.View style={[styles.sticky, stickyStyle]} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  row: {
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: 'gray',
  },
  sticky: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'red',
  },
});
