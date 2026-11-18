import { runOnUISync } from 'react-native-worklets';

type NativeRequestAnimationFrame =
  typeof globalThis.__nativeRequestAnimationFrame;

type FrameRequestCounter = {
  count: number;
  original: NativeRequestAnimationFrame;
};

type GlobalWithCounter = typeof globalThis & {
  __nativeFrameRequestCounter?: FrameRequestCounter;
};

export async function countNativeFrameRequests(
  durationMs: number,
  trigger?: () => void
) {
  startCounting();
  let count: number;
  try {
    trigger?.();
    await sleepOnRN(durationMs);
  } finally {
    count = stopCounting();
  }
  return count;
}

export function sleepOnRN(durationMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}

function startCounting() {
  runOnUISync(() => {
    'worklet';
    const global = globalThis as GlobalWithCounter;
    const original = global.__nativeRequestAnimationFrame;
    const counter: FrameRequestCounter = { count: 0, original };
    global.__nativeFrameRequestCounter = counter;
    global.__nativeRequestAnimationFrame = (callback) => {
      counter.count++;
      original(callback);
    };
  });
}

function stopCounting() {
  return runOnUISync(() => {
    'worklet';
    const global = globalThis as GlobalWithCounter;
    const counter = global.__nativeFrameRequestCounter;
    if (!counter) {
      return -1;
    }
    global.__nativeRequestAnimationFrame = counter.original;
    global.__nativeFrameRequestCounter = undefined;
    return counter.count;
  });
}
