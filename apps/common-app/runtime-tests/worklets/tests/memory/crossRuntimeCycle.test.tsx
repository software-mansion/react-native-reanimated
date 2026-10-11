import {
  runOnRuntimeAsyncWithId,
  scheduleOnRN,
  UIRuntimeId,
} from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  test,
  wait,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const CYCLES = 5;

async function collectBothRuntimes() {
  // Releasing a worklet that calls back into React Native takes alternating
  // collections: the React Native runtime frees the worklet's serializable,
  // which releases its UI copy, which releases the callback.
  for (let round = 0; round < 4; round++) {
    globalThis.gc!();
    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      globalThis.gc!();
    });
    await wait(100);
  }
}

describe('Worklet and callback cycle across runtimes', () => {
  test('is collected after the worklet ran on the UI runtime', async () => {
    expect(typeof globalThis.gc).toBe('function');
    const sentinels: WeakRef<object>[] = [];

    // The callback's closure reaches the worklet that schedules it, as when a
    // component scope holds both a `runOnJS` callback and the gesture or
    // handler that owns the worklet.
    const makeWorklet = () => {
      const sentinel = {};
      sentinels.push(new WeakRef(sentinel));
      const scope: { worklet?: () => void } = {};
      const callback = () => [sentinel, scope.worklet];
      const worklet = () => {
        'worklet';
        scheduleOnRN(callback);
      };
      scope.worklet = worklet;
      return worklet;
    };

    for (let i = 0; i < CYCLES; i++) {
      await runOnRuntimeAsyncWithId(UIRuntimeId, makeWorklet());
    }
    await collectBothRuntimes();

    const alive = sentinels.filter((ref) => ref.deref() !== undefined).length;
    expect(alive).toBe(0);
  });

  test('keeps a callback that only a UI-held worklet references callable', async () => {
    const CALLED = 'crossRuntimeCycle:uiHeld';
    const install = (() => {
      const callback = () => notify(CALLED);
      const handler = () => {
        'worklet';
        scheduleOnRN(callback);
      };
      return () => {
        'worklet';
        globalThis.__crossRuntimeCycleHandler = handler;
      };
    })();

    await runOnRuntimeAsyncWithId(UIRuntimeId, install);
    await collectBothRuntimes();
    await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      globalThis.__crossRuntimeCycleHandler!();
      delete globalThis.__crossRuntimeCycleHandler;
    });

    await waitForNotification(CALLED);
  });

  test('runs a worklet again after its serializable was collected', async () => {
    let calls = 0;
    const worklet = (() => {
      const callback = () => {
        calls++;
        notify(`crossRuntimeCycle:rerun${calls}`);
      };
      return () => {
        'worklet';
        scheduleOnRN(callback);
      };
    })();

    await runOnRuntimeAsyncWithId(UIRuntimeId, worklet);
    await waitForNotification('crossRuntimeCycle:rerun1');
    await collectBothRuntimes();
    await runOnRuntimeAsyncWithId(UIRuntimeId, worklet);
    await waitForNotification('crossRuntimeCycle:rerun2');

    expect(calls).toBe(2);
  });
});

declare global {
  var __crossRuntimeCycleHandler: (() => void) | undefined;
}
