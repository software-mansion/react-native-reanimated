import {
  abortWorkletRuntime,
  createSynchronizable,
  createWorkletRuntime,
  registerCustomSerializable,
  runOnRuntimeAsync,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSync,
  scheduleOnRN,
  scheduleOnRuntime,
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

const STARTED_NOTIFICATION = 'STARTED_NOTIFICATION';

const bundleModeTest = globalThis._WORKLETS_BUNDLE_MODE_ENABLED
  ? test
  : test.skip;

describe('abortWorkletRuntime', () => {
  test('interrupts JavaScript that is stuck in an infinite loop', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-loop',
      abortable: true,
    });
    const onStarted = () => {
      notify(STARTED_NOTIFICATION);
    };
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (true) {
        // Spin until the runtime is aborted.
      }
    });
    await waitForNotification(STARTED_NOTIFICATION);

    // Act
    abortWorkletRuntime(runtime.runtimeId);
    await wait(200);

    // Assert
    await expect(() => scheduleOnRuntime(runtime, () => {})).toThrow('aborted');
  });

  test('drops jobs that are still pending', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-pending',
      abortable: true,
    });
    const ran = createSynchronizable(false);
    const onStarted = () => {
      notify(STARTED_NOTIFICATION);
    };
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (true) {
        // Spin until the runtime is aborted.
      }
    });
    scheduleOnRuntime(runtime, () => {
      'worklet';
      ran.setBlocking(true);
    });
    await waitForNotification(STARTED_NOTIFICATION);

    // Act
    abortWorkletRuntime(runtime.runtimeId);
    await wait(200);

    // Assert
    expect(ran.getBlocking()).toBe(false);
  });

  test('is a no-op when the runtime is already aborted', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-twice',
      abortable: true,
    });
    abortWorkletRuntime(runtime.runtimeId);

    // Act & Assert
    await expect(() => abortWorkletRuntime(runtime.runtimeId)).not.toThrow();
  });

  test('throws when aborting the UI Runtime', async () => {
    await expect(() => abortWorkletRuntime(UIRuntimeId)).toThrow(
      'only Worker Runtimes can be aborted'
    );
  });

  test('throws when the runtime does not exist', async () => {
    await expect(() => abortWorkletRuntime(987654)).toThrow(
      'no worklet runtime found'
    );
  });

  test('rejects the promises of running and pending runOnRuntimeAsync calls', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-promises',
      abortable: true,
    });
    const onStarted = () => {
      notify(STARTED_NOTIFICATION);
    };
    const running = runOnRuntimeAsync(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (true) {
        // Spin until the runtime is aborted.
      }
    });
    const pending = runOnRuntimeAsync(runtime, () => {
      'worklet';
      return 42;
    });
    await waitForNotification(STARTED_NOTIFICATION);

    // Act
    abortWorkletRuntime(runtime.runtimeId);
    const messages = await Promise.all(
      [running, pending].map((promise) =>
        promise.then(
          () => 'resolved',
          (error: Error) => error.message
        )
      )
    );

    // Assert
    const abortedMessage =
      '[Worklets] The Worklet Runtime was aborted or destroyed before the worklet finished.';
    expect(messages[0]).toBe(abortedMessage);
    expect(messages[1]).toBe(abortedMessage);
  });

  test('rejects the promise of a runOnRuntimeAsyncWithId call', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-promise-with-id',
      abortable: true,
    });
    const onStarted = () => {
      notify(STARTED_NOTIFICATION);
    };
    const running = runOnRuntimeAsyncWithId(runtime.runtimeId, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (true) {
        // Spin until the runtime is aborted.
      }
    });
    await waitForNotification(STARTED_NOTIFICATION);

    // Act
    abortWorkletRuntime(runtime.runtimeId);
    const message = await running.then(
      () => 'resolved',
      (error: Error) => error.message
    );

    // Assert
    expect(message).toBe(
      '[Worklets] The Worklet Runtime was aborted or destroyed before the worklet finished.'
    );
  });

  test('throws when the runtime id is not a non-negative integer', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-invalid-id',
      abortable: true,
    });

    // Act & Assert
    await expect(() => abortWorkletRuntime(runtime.runtimeId + 0.5)).toThrow(
      'non-negative safe integer'
    );
    await expect(() => abortWorkletRuntime(-1)).toThrow(
      'non-negative safe integer'
    );
  });

  test('throws when creating an abortable runtime with a custom queue', async () => {
    await expect(() =>
      createWorkletRuntime({ abortable: true, queue: {} })
    ).toThrow('only with the default queue');
  });

  test('registers a custom serializable after a runtime was aborted', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-registration',
      abortable: true,
    });
    abortWorkletRuntime(runtime.runtimeId);

    // Act & Assert
    await expect(() =>
      registerCustomSerializable({
        name: 'abort registration test',
        determine: (value: object): value is { __abortTest: true } => {
          'worklet';
          return (value as Record<string, unknown>).__abortTest === true;
        },
        pack: () => {
          'worklet';
          return {};
        },
        unpack: () => {
          'worklet';
          return { __abortTest: true };
        },
      })
    ).not.toThrow();
  });

  bundleModeTest(
    'throws from runOnRuntimeSync when the runtime is aborted mid-call',
    async () => {
      // Arrange
      const runtime = createWorkletRuntime({
        name: 'abort-sync',
        abortable: true,
      });
      const killer = createWorkletRuntime({ name: 'abort-sync-killer' });
      const runtimeId = runtime.runtimeId;
      scheduleOnRuntime(killer, () => {
        'worklet';
        setTimeout(() => {
          abortWorkletRuntime(runtimeId);
        }, 200);
      });

      // Act & Assert
      await expect(() =>
        runOnRuntimeSync(runtime, () => {
          'worklet';
          while (true) {
            // Spin until the runtime is aborted.
          }
        })
      ).toThrow('aborted');
    }
  );

  test('throws when the runtime was not created as abortable', async () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'not-abortable' });

    // Act & Assert
    await expect(() => abortWorkletRuntime(runtime.runtimeId)).toThrow(
      'abortable: true'
    );
  });

  test('releases the Synchronizable locks held by the aborted runtime', async () => {
    // Arrange
    const holder = createWorkletRuntime({
      name: 'abort-lock-holder',
      abortable: true,
    });
    const waiter = createWorkletRuntime({ name: 'abort-lock-waiter' });
    const synchronizable = createSynchronizable(0);
    const acquired = createSynchronizable(false);
    const onStarted = () => {
      notify(STARTED_NOTIFICATION);
    };
    scheduleOnRuntime(holder, () => {
      'worklet';
      synchronizable.lock();
      scheduleOnRN(onStarted);
      while (true) {
        // Spin until the runtime is aborted.
      }
    });
    await waitForNotification(STARTED_NOTIFICATION);

    // Act
    abortWorkletRuntime(holder.runtimeId);
    scheduleOnRuntime(waiter, () => {
      'worklet';
      synchronizable.lock();
      acquired.setBlocking(true);
      synchronizable.unlock();
    });
    await wait(500);

    // Assert
    expect(acquired.getBlocking()).toBe(true);
  });
});
