import {
  abortWorkletRuntime,
  createSynchronizable,
  createWorkletRuntime,
  registerCustomSerializable,
  runOnRuntimeAsync,
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

describe('abortWorkletRuntime', () => {
  test('interrupts JavaScript that is stuck in an infinite loop', async () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'abort-loop' });
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
    const runtime = createWorkletRuntime({ name: 'abort-pending' });
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
    const runtime = createWorkletRuntime({ name: 'abort-twice' });
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
    const runtime = createWorkletRuntime({ name: 'abort-promises' });
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

  test('registers a custom serializable after a runtime was aborted', async () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'abort-registration' });
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

  test('throws from runOnRuntimeSync when the runtime is aborted mid-call', async () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'abort-sync' });
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
  });
});
