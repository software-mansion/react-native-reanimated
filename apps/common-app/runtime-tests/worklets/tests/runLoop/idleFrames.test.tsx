import { runOnUISync, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';
import {
  countNativeFrameRequests,
  sleepOnRN,
} from '../../../ReJest/utils/nativeFrameRequests';

const SETTLE_MS = 200;
const WINDOW_MS = 300;
const GC_ROUNDS = 4;
const GC_ROUND_MS = 100;

type RetentionGlobal = typeof globalThis & {
  __completedCallbackCapture?: WeakRef<object>;
};

function isCompletedCallbackCaptureAlive() {
  return runOnUISync(() => {
    'worklet';
    globalThis.gc!();
    return (
      (globalThis as RetentionGlobal).__completedCallbackCapture?.deref() !==
      undefined
    );
  });
}

describe('native frame requests of the UI Runtime', () => {
  test('requests no frames while idle', async () => {
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS);

    expect(count).toBe(0);
  });

  test('requests one frame for a requestAnimationFrame callback', async () => {
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      scheduleOnUI(() => {
        'worklet';
        requestAnimationFrame(() => {});
      });
    });

    expect(count).toBe(1);
  });

  test('requests one frame for many callbacks queued together', async () => {
    await sleepOnRN(SETTLE_MS);

    let completedCount = 0;
    const onCompleted = () => {
      completedCount++;
    };

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      scheduleOnUI(() => {
        'worklet';
        requestAnimationFrame(() => {
          scheduleOnRN(onCompleted);
        });
        requestAnimationFrame(() => {
          scheduleOnRN(onCompleted);
        });
        globalThis.requestAnimationFrameFinalizer(() => {
          scheduleOnRN(onCompleted);
        });
      });
    });

    expect(count).toBe(1);
    expect(completedCount).toBe(3);
  });

  test('requests one frame for a finalizer', async () => {
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      scheduleOnUI(() => {
        'worklet';
        globalThis.requestAnimationFrameFinalizer(() => {});
      });
    });

    expect(count).toBe(1);
  });

  test('runs a microtask queued by a finalizer in the same frame', async () => {
    await sleepOnRN(SETTLE_MS);
    let ranInSameFrame = false;
    const onMicrotask = (value: boolean) => {
      ranInSameFrame = value;
    };

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      scheduleOnUI(() => {
        'worklet';
        globalThis.requestAnimationFrameFinalizer(() => {
          const frameTimestamp = globalThis.__frameTimestamp;
          queueMicrotask(() => {
            scheduleOnRN(
              onMicrotask,
              frameTimestamp !== undefined &&
                globalThis.__frameTimestamp === frameTimestamp
            );
          });
        });
      });
    });

    expect(count).toBe(1);
    expect(ranInSameFrame).toBe(true);
  });

  test('releases a completed callback while idle', async () => {
    expect(typeof globalThis.gc).toBe('function');
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      runOnUISync(() => {
        'worklet';
        const capture = {};
        (globalThis as RetentionGlobal).__completedCallbackCapture =
          new WeakRef(capture);
        requestAnimationFrame(() => {
          return capture;
        });
      });
    });

    let isAlive = true;
    for (let round = 0; round < GC_ROUNDS && isAlive; round++) {
      isAlive = isCompletedCallbackCaptureAlive();
      await sleepOnRN(GC_ROUND_MS);
    }

    expect(count).toBe(1);
    expect(isAlive).toBe(false);
  });

  test('requests frames only while callbacks request more', async () => {
    await sleepOnRN(SETTLE_MS);

    const count = await countNativeFrameRequests(WINDOW_MS, () => {
      scheduleOnUI(() => {
        'worklet';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {});
          });
        });
      });
    });

    expect(count).toBe(3);
  });
});
