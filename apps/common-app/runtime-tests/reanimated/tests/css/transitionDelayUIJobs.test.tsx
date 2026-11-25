import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  setNativeProps,
  useAnimatedRef,
} from 'react-native-reanimated';
import { createSynchronizable, scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

// A delayed transition property re-schedules the loop under the updates registry
// lock each frame. That must not run queued JS jobs, since setNativeProps takes
// the same lock. A deadlock shows as a stuck run; details are in the device log.

const PROPERTIES = [
  'opacity',
  'width',
  'height',
  'borderRadius',
  'marginLeft',
  'backgroundColor',
] as const;
const FROM = {
  opacity: 1,
  width: 20,
  height: 20,
  borderRadius: 0,
  marginLeft: 0,
  backgroundColor: 'red',
};
const TO = {
  opacity: 0.2,
  width: 40,
  height: 30,
  borderRadius: 10,
  marginLeft: 10,
  backgroundColor: 'blue',
};
const LONG_MS = 60_000;
// Each box runs a different property, so whatever order the transition keeps
// its properties in, most boxes see a delayed one first.
const BOX_COUNT = PROPERTIES.length * 4;
const HANDSHAKE_ROUNDS = 20;
const STRESS_DURATION_MS = 3000;
const UI_RESPONSE_TIMEOUT_MS = 3000;

let targetRef: AnimatedRef<View> | null = null;

function TransitionBox({ index, active }: { index: number; active: boolean }) {
  const running = index % PROPERTIES.length;
  return (
    <Animated.View
      style={{
        ...(active ? TO : FROM),
        transitionProperty: [...PROPERTIES],
        transitionDuration: LONG_MS,
        transitionDelay: PROPERTIES.map((_, i) =>
          i === running ? 0 : LONG_MS
        ),
        transitionTimingFunction: 'linear',
      }}
    />
  );
}

function Scene({ active }: { active: boolean }) {
  const ref = useAnimatedRef<View>();
  useEffect(() => {
    targetRef = ref;
    return () => {
      targetRef = null;
    };
  }, [ref]);
  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={styles.target} />
      {Array.from({ length: BOX_COUNT }, (_, index) => (
        <TransitionBox key={index} index={index} active={active} />
      ))}
    </View>
  );
}

async function startTransitions() {
  await render(<Scene active={false} />);
  await waitForFrames(2);
  await render(<Scene active />);
  await waitForFrames(5);
  return targetRef!;
}

function queueSetNativeProps(ref: AnimatedRef<View>) {
  scheduleOnUI(() => {
    setNativeProps(ref, { opacity: Math.random() });
  });
}

// JS timers fire on the UI thread, so only microtasks can wait for it.
async function waitOnJS(condition: () => boolean, timeoutMs: number) {
  const start = performance.now();
  while (!condition() && performance.now() - start < timeoutMs) {
    await Promise.resolve();
  }
  return condition();
}

async function uiThreadResponds() {
  const responded = createSynchronizable(false);
  scheduleOnUI(() => {
    responded.setBlocking(true);
  });
  return waitOnJS(() => responded.getBlocking(), UI_RESPONSE_TIMEOUT_MS);
}

// Queues the job while the UI thread is inside a frame callback, so the job is
// still waiting when the CSS transitions update later in the same frame.
async function queueSetNativePropsDuringFrame(ref: AnimatedRef<View>) {
  const inFrame = createSynchronizable(false);
  const queued = createSynchronizable(false);
  scheduleOnUI(() => {
    requestAnimationFrame(() => {
      inFrame.setBlocking(true);
      const start = performance.now();
      while (!queued.getBlocking() && performance.now() - start < 1000) {
        // wait for the JS thread to queue the job
      }
    });
  });
  if (!(await waitOnJS(() => inFrame.getBlocking(), 2000))) {
    return false;
  }
  queueSetNativeProps(ref);
  queueMicrotask(() => queued.setBlocking(true));
  await Promise.resolve();
  return true;
}

describe('CSS transition with a delayed property and UI jobs queued from JS', () => {
  test('setNativeProps queued during a frame', async () => {
    const ref = await startTransitions();
    let stuckAfterRound = -1;
    for (let round = 0; round < HANDSHAKE_ROUNDS; round++) {
      const queued = await queueSetNativePropsDuringFrame(ref);
      if (!queued || !(await uiThreadResponds())) {
        stuckAfterRound = round;
        console.error(`UI thread is stuck in round ${round}`);
        break;
      }
    }
    expect(stuckAfterRound).toBe(-1);
    if (stuckAfterRound === -1) {
      await render(null);
    }
  });

  test('setNativeProps queued at random times', async () => {
    const ref = await startTransitions();
    const done = createSynchronizable(0);
    const start = performance.now();
    let queued = 0;
    let stuck = false;
    while (performance.now() - start < STRESS_DURATION_MS) {
      queued += 1;
      scheduleOnUI(() => {
        setNativeProps(ref, { opacity: Math.random() });
        done.setBlocking(done.getBlocking() + 1);
      });
      const target = queued;
      if (
        !(await waitOnJS(
          () => done.getBlocking() >= target,
          UI_RESPONSE_TIMEOUT_MS
        ))
      ) {
        stuck = true;
        console.error(`UI thread is stuck after ${queued} jobs`);
        break;
      }
      const pause = performance.now() + Math.random() * 4;
      while (performance.now() < pause) {
        // spread the jobs over the frame
      }
    }
    expect(stuck).toBe(false);
    if (!stuck) {
      await render(null);
    }
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  target: {
    width: 20,
    height: 20,
    backgroundColor: 'green',
  },
});
