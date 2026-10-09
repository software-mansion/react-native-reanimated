import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

export type ThreadLoad = { busyMs: number; periodMs: number };

export const THREAD_LOAD: ThreadLoad = { busyMs: 150, periodMs: 700 };

/**
 * A suite that keeps a thread busy from its test to the end of the run. `start`
 * gives the length of the first busy time.
 */
export function describeLoad(
  thread: string,
  start: (load: ThreadLoad) => Promise<number>
) {
  describe(`native layout load: busy ${thread}`, () => {
    test(`the ${thread} is busy from this test to the end of the run`, async () => {
      const { busyMs, periodMs } = THREAD_LOAD;
      console.log(`LOAD | ${thread} | ${busyMs} ms each ${periodMs} ms`);
      expect((await start(THREAD_LOAD)) >= busyMs).toBe(true);
    });
  });
}

export function startBusyJSThread({ busyMs, periodMs }: ThreadLoad) {
  return new Promise<number>((resolve) => {
    setInterval(() => {
      const start = performance.now();
      while (performance.now() - start < busyMs) {
        continue;
      }
      resolve(performance.now() - start);
    }, periodMs);
  });
}

/**
 * A timer of the JS thread starts each busy time, so a busy JS thread makes it
 * late.
 */
export function startBusyMainThread({ busyMs, periodMs }: ThreadLoad) {
  return new Promise<number>((resolve) => {
    let isFirst = true;
    setInterval(() => {
      const reports = isFirst;
      isFirst = false;
      scheduleOnUI(() => {
        'worklet';
        const start = global._getAnimationTimestamp();
        blockUIThread(busyMs);
        if (reports) {
          scheduleOnRN(resolve, global._getAnimationTimestamp() - start);
        }
      });
    }, periodMs);
  });
}

export function blockUIThread(durationMs: number) {
  'worklet';
  const end = global._getAnimationTimestamp() + durationMs;
  while (global._getAnimationTimestamp() < end) {
    continue;
  }
}
