import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { DEFAULT_TIMEOUT_MS, sleep, withTimeout } from './waitFor';

const FRAME_INTERVAL_MS = 16;

export function waitForFrames(
  count: number = 1,
  timeout: number = DEFAULT_TIMEOUT_MS
) {
  const framesRendered = new Promise<void>((resolve) => {
    scheduleOnUI(() => {
      'worklet';
      let remaining = count;
      const onFrame = () => {
        'worklet';
        remaining -= 1;
        if (remaining > 0) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(resolve);
        }
      };
      requestAnimationFrame(onFrame);
    });
  });

  return withTimeout(framesRendered, {
    description: `${count} animation frame${count === 1 ? '' : 's'}`,
    timeout,
  });
}

export async function waitUntilSettled<TValue>(
  read: () => TValue | Promise<TValue>,
  {
    timeout = DEFAULT_TIMEOUT_MS,
    stableFrames = 2,
  }: { timeout?: number; stableFrames?: number } = {}
): Promise<TValue> {
  const startTime = performance.now();

  const readWithTimeout = () => {
    const remainingTime = timeout - (performance.now() - startTime);
    if (remainingTime <= 0) {
      throw new Error(
        `Timed out after ${timeout}ms while waiting for the value to settle.`
      );
    }
    return withTimeout((async () => read())(), {
      description: 'the value to be read',
      timeout: remainingTime,
    });
  };

  let previous = await readWithTimeout();
  let stable = 0;

  while (stable < stableFrames) {
    if (performance.now() - startTime > timeout) {
      throw new Error(
        `Timed out after ${timeout}ms while waiting for the value to settle. Last observed: ${String(previous)}.`
      );
    }
    await sleep(FRAME_INTERVAL_MS);
    const current = await readWithTimeout();
    stable = Object.is(current, previous) ? stable + 1 : 0;
    previous = current;
  }

  return previous;
}
