import {
  runOnRuntimeSyncWithId,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';
import {
  createOrderConstraint,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

describe('requestAnimationFrameFinalizer', () => {
  test('runs after the animation frame callbacks', async () => {
    const [confirmedOrder, order] = createOrderConstraint();

    scheduleOnUI(() => {
      'worklet';
      requestAnimationFrame(() => {
        order(1, 'callback');
      });
      globalThis.requestAnimationFrameFinalizer(() => {
        order(2, 'finalizer');
      });
    });

    await waitForNotifications(['callback', 'finalizer']);
    expect(confirmedOrder.value).toBe(2);
  });

  test('runs after the microtasks queued during the frame', async () => {
    const [confirmedOrder, order] = createOrderConstraint();

    scheduleOnUI(() => {
      'worklet';
      requestAnimationFrame(() => {
        queueMicrotask(() => {
          order(1, 'microtask');
        });
      });
      globalThis.requestAnimationFrameFinalizer(() => {
        order(2, 'finalizer');
      });
    });

    await waitForNotifications(['microtask', 'finalizer']);
    expect(confirmedOrder.value).toBe(2);
  });

  test('runs a finalizer registered during a frame in that same frame', async () => {
    let ranInSameFrame = false;
    const callback = (value: boolean) => {
      ranInSameFrame = value;
      notify('done');
    };

    scheduleOnUI(() => {
      'worklet';
      requestAnimationFrame(() => {
        const frameTimestamp = globalThis.__frameTimestamp;
        globalThis.requestAnimationFrameFinalizer(() => {
          scheduleOnRN(
            callback,
            globalThis.__frameTimestamp === frameTimestamp
          );
        });
      });
    });

    await waitForNotification('done');
    expect(ranInSameFrame).toBe(true);
  });

  test('defers a finalizer registered from a finalizer to a later frame', async () => {
    let ranInLaterFrame = false;
    const callback = (value: boolean) => {
      ranInLaterFrame = value;
      notify('done');
    };

    scheduleOnUI(() => {
      'worklet';
      globalThis.requestAnimationFrameFinalizer(() => {
        const frameTimestamp = globalThis.__frameTimestamp;
        globalThis.requestAnimationFrameFinalizer(() => {
          scheduleOnRN(
            callback,
            globalThis.__frameTimestamp !== frameTimestamp
          );
        });
      });
    });

    await waitForNotification('done');
    expect(ranInLaterFrame).toBe(true);
  });

  test('is not installed on Worker Runtimes', () => {
    const [workletRuntime] = getWorkletRuntimesFromPool(1);

    const finalizerType = runOnRuntimeSyncWithId(
      workletRuntime.runtimeId,
      () => {
        'worklet';
        return typeof globalThis.requestAnimationFrameFinalizer;
      }
    );

    expect(finalizerType).toBe('undefined');
  });
});
