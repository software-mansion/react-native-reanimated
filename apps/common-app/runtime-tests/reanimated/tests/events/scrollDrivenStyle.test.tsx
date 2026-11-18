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

type LogEntry = [kind: number, offset: number, frameTimestamp: number];

type LogGlobal = typeof globalThis & { __scrollDrivenStyleLog?: LogEntry[] };

const KIND_EVENT = 0;
const KIND_STYLE = 1;
const ROW_COUNT = 40;
const ROW_HEIGHT = 80;
const SCROLL_ATTEMPTS = 5;
const SCROLL_STEP = 300;
const SCROLL_START_MS = 700;
const SCROLL_SETTLE_MS = 500;
const INITIAL_OFFSET = 0;
const OUTSIDE_FRAME = -1;
const MIN_EVENTS = 5;

let scrollViewRef: AnimatedRef<Animated.ScrollView> | null = null;

describe('scroll-driven animated style', () => {
  beforeEach(() => {
    scrollViewRef = null;
  });

  test('is computed right after each event of an animated scroll', async () => {
    await render(<Scene />);
    startLog();

    const { offsetChanges, lateStyles } = await scrollUntilEventsArrive();

    expect(offsetChanges >= MIN_EVENTS).toBe(true);
    expect(lateStyles).toBe(0);
  });
});

async function scrollUntilEventsArrive() {
  for (let attempt = 1; attempt <= SCROLL_ATTEMPTS; attempt++) {
    scrollViewRef?.current?.scrollTo({
      y: attempt * SCROLL_STEP,
      animated: true,
    });
    const result = analyzeLog(await readSettledLog());
    if (result.offsetChanges >= MIN_EVENTS) {
      return result;
    }
  }
  return analyzeLog(await readSettledLog());
}

async function readSettledLog() {
  await wait(SCROLL_START_MS);
  let entries = readLog();
  for (;;) {
    await wait(SCROLL_SETTLE_MS);
    const nextEntries = readLog();
    if (nextEntries.length === entries.length) {
      return nextEntries;
    }
    entries = nextEntries;
  }
}

function analyzeLog(entries: LogEntry[]) {
  let offsetChanges = 0;
  let lateStyles = 0;
  let lastOffset = INITIAL_OFFSET;
  entries.forEach(([kind, offset], index) => {
    if (kind !== KIND_EVENT || offset === lastOffset) {
      return;
    }
    lastOffset = offset;
    offsetChanges++;
    const next = entries[index + 1];
    const isComputedInEventCall =
      next !== undefined &&
      next[0] === KIND_STYLE &&
      next[1] === offset &&
      next[2] === OUTSIDE_FRAME;
    if (!isComputedInEventCall) {
      lateStyles++;
    }
  });
  return { offsetChanges, lateStyles };
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
  const scrollY = useSharedValue(INITIAL_OFFSET);

  const onScroll = useAnimatedScrollHandler((event) => {
    const offset = event.contentOffset.y;
    (globalThis as LogGlobal).__scrollDrivenStyleLog?.push([
      KIND_EVENT,
      offset,
      OUTSIDE_FRAME,
    ]);
    scrollY.value = offset;
  });

  const stickyStyle = useAnimatedStyle(() => {
    const offset = scrollY.value;
    (globalThis as LogGlobal).__scrollDrivenStyleLog?.push([
      KIND_STYLE,
      offset,
      globalThis.__frameTimestamp ?? OUTSIDE_FRAME,
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
