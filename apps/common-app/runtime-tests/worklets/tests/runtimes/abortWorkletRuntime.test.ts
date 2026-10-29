import {
  abortWorkletRuntime,
  createSynchronizable,
  createWorkletRuntime,
  registerCustomSerializable,
  runOnRuntimeAsync,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSync,
  runOnUI,
  runOnUIAsync,
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
const ABORTED_MESSAGE =
  '[Worklets] The Worklet Runtime was aborted or destroyed before the worklet finished.';

const bundleModeTest = globalThis._WORKLETS_BUNDLE_MODE_ENABLED
  ? test
  : test.skip;

const ABORTED_NOTIFICATION = 'ABORTED_NOTIFICATION';

const onAborted = () => {
  notify(ABORTED_NOTIFICATION);
};

const onStarted = () => {
  notify(STARTED_NOTIFICATION);
};

describe('abortWorkletRuntime', () => {
  test('lets the running job finish and drops the jobs that are still pending', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-pending',
      abortable: true,
    });
    const release = createSynchronizable(false);
    const finished = createSynchronizable(false);
    const pendingRan = createSynchronizable(false);
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (!release.getBlocking()) {
        // Wait until the test releases the job.
      }
      finished.setBlocking(true);
    });
    scheduleOnRuntime(runtime, () => {
      'worklet';
      pendingRan.setBlocking(true);
    });
    // Act
    try {
      await waitForNotification(STARTED_NOTIFICATION);
      abortWorkletRuntime(runtime.runtimeId);
    } finally {
      release.setBlocking(true);
    }
    await wait(200);

    // Assert
    expect(finished.getBlocking()).toBe(true);
    expect(pendingRan.getBlocking()).toBe(false);
  });

  test('lets the running job schedule work on its own aborted runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-reschedule',
      abortable: true,
    });
    const release = createSynchronizable(false);
    const finished = createSynchronizable(false);
    const rescheduledRan = createSynchronizable(false);
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (!release.getBlocking()) {
        // Wait until the test releases the job.
      }
      scheduleOnRuntime(runtime, () => {
        'worklet';
        rescheduledRan.setBlocking(true);
      });
      finished.setBlocking(true);
    });

    // Act
    try {
      await waitForNotification(STARTED_NOTIFICATION);
      abortWorkletRuntime(runtime.runtimeId);
    } finally {
      release.setBlocking(true);
    }
    await wait(200);

    // Assert
    expect(finished.getBlocking()).toBe(true);
    expect(rescheduledRan.getBlocking()).toBe(false);
  });

  test('throws when scheduling work on an aborted runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-schedule',
      abortable: true,
    });
    abortWorkletRuntime(runtime.runtimeId);

    // Act & Assert
    await expect(() => scheduleOnRuntime(runtime, () => {})).toThrow('aborted');
  });

  bundleModeTest(
    'lets the running job run work synchronously on its own aborted runtime',
    async () => {
      // Arrange
      const runtime = createWorkletRuntime({
        name: 'abort-sync-self',
        abortable: true,
      });
      const release = createSynchronizable(false);
      const syncResult = createSynchronizable(0);
      scheduleOnRuntime(runtime, () => {
        'worklet';
        scheduleOnRN(onStarted);
        while (!release.getBlocking()) {
          // Wait until the test releases the job.
        }
        syncResult.setBlocking(
          runOnRuntimeSync(runtime, () => {
            'worklet';
            return 42;
          })
        );
      });

      // Act
      try {
        await waitForNotification(STARTED_NOTIFICATION);
        abortWorkletRuntime(runtime.runtimeId);
      } finally {
        release.setBlocking(true);
      }
      await wait(200);

      // Assert
      expect(syncResult.getBlocking()).toBe(42);
    }
  );

  test('rejects runOnRuntimeAsync on an aborted runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-async-after',
      abortable: true,
    });
    abortWorkletRuntime(runtime.runtimeId);

    // Act
    const message = await runOnRuntimeAsync(runtime, () => {
      'worklet';
      return 1;
    }).then(
      () => 'resolved',
      (error: Error) => error.message
    );

    // Assert
    expect(message).toBe(
      '[Worklets] Cannot schedule work on an aborted Worklet Runtime.'
    );
  });

  test('throws when running work synchronously on an aborted runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-sync',
      abortable: true,
    });
    abortWorkletRuntime(runtime.runtimeId);

    // Act & Assert
    await expect(() =>
      runOnRuntimeSync(runtime, () => {
        'worklet';
        return 1;
      })
    ).toThrow('aborted');
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

  test('can be called from the UI Runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-from-ui',
      abortable: true,
    });
    const runtimeId = runtime.runtimeId;

    // Act
    runOnUI(() => {
      'worklet';
      abortWorkletRuntime(runtimeId);
      scheduleOnRN(onAborted);
    })();
    await waitForNotification(ABORTED_NOTIFICATION);

    // Assert
    await expect(() => scheduleOnRuntime(runtime, () => {})).toThrow('aborted');
  });

  test('can be called from a Worker Runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-from-worker',
      abortable: true,
    });
    const caller = createWorkletRuntime({ name: 'abort-caller' });
    const runtimeId = runtime.runtimeId;

    // Act
    scheduleOnRuntime(caller, () => {
      'worklet';
      abortWorkletRuntime(runtimeId);
      scheduleOnRN(onAborted);
    });
    await waitForNotification(ABORTED_NOTIFICATION);

    // Assert
    await expect(() => scheduleOnRuntime(runtime, () => {})).toThrow('aborted');
  });

  test('throws when the runtime does not exist', async () => {
    await expect(() => abortWorkletRuntime(987654)).toThrow(
      'no worklet runtime found'
    );
  });

  test('throws when the runtime was not created as abortable', async () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'not-abortable' });

    // Act & Assert
    await expect(() => abortWorkletRuntime(runtime.runtimeId)).toThrow(
      'abortable: true'
    );
  });

  test('throws when creating an abortable runtime with a custom queue', async () => {
    await expect(() =>
      createWorkletRuntime({ abortable: true, queue: {} })
    ).toThrow('only with the default queue');
  });

  test('resolves the running runOnRuntimeAsync call and rejects the pending one', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-promises',
      abortable: true,
    });
    const release = createSynchronizable(false);
    const running = runOnRuntimeAsync(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (!release.getBlocking()) {
        // Wait until the test releases the job.
      }
      return 1;
    });
    const pending = runOnRuntimeAsync(runtime, () => {
      'worklet';
      return 2;
    });
    // Act
    try {
      await waitForNotification(STARTED_NOTIFICATION);
      abortWorkletRuntime(runtime.runtimeId);
    } finally {
      release.setBlocking(true);
    }
    const results = await Promise.all(
      [running, pending].map((promise) =>
        promise.then(
          (value) => `resolved ${value}`,
          (error: Error) => error.message
        )
      )
    );

    // Assert
    expect(results[0]).toBe('resolved 1');
    expect(results[1]).toBe(ABORTED_MESSAGE);
  });

  bundleModeTest(
    'does not crash when the aborted runtime queued a runOnRuntimeAsync call on itself',
    async () => {
      // Arrange
      const runtime = createWorkletRuntime({
        name: 'abort-self-queued',
        abortable: true,
      });
      const release = createSynchronizable(false);
      scheduleOnRuntime(runtime, () => {
        'worklet';
        runOnRuntimeAsync(runtime, () => {
          'worklet';
          return 1;
        }).catch(() => {});
        scheduleOnRN(onStarted);
        while (!release.getBlocking()) {
          // Wait until the test releases the job.
        }
      });
      // Act
      try {
        await waitForNotification(STARTED_NOTIFICATION);
        abortWorkletRuntime(runtime.runtimeId);
      } finally {
        release.setBlocking(true);
      }
      await wait(200);

      // Assert
      await expect(() => scheduleOnRuntime(runtime, () => {})).toThrow(
        'aborted'
      );
    }
  );

  bundleModeTest(
    'does not crash when a promise of the aborted runtime settles on another runtime',
    async () => {
      // Arrange
      const runtime = createWorkletRuntime({
        name: 'abort-ui-promise',
        abortable: true,
      });
      const release = createSynchronizable(false);
      scheduleOnRuntime(runtime, () => {
        'worklet';
        runOnUIAsync(() => {
          'worklet';
          scheduleOnRN(onStarted);
          while (!release.getBlocking()) {
            // Wait until the test releases the job.
          }
          return 1;
        }).catch(() => {});
      });
      // Act
      try {
        await waitForNotification(STARTED_NOTIFICATION);
        abortWorkletRuntime(runtime.runtimeId);
      } finally {
        release.setBlocking(true);
      }

      // Assert
      const value = await runOnUIAsync(() => {
        'worklet';
        return 42;
      });
      expect(value).toBe(42);
    }
  );

  test('rejects the pending runOnRuntimeAsyncWithId call', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-promise-with-id',
      abortable: true,
    });
    const release = createSynchronizable(false);
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(onStarted);
      while (!release.getBlocking()) {
        // Wait until the test releases the job.
      }
    });
    const pending = runOnRuntimeAsyncWithId(runtime.runtimeId, () => {
      'worklet';
      return 1;
    });
    // Act
    try {
      await waitForNotification(STARTED_NOTIFICATION);
      abortWorkletRuntime(runtime.runtimeId);
    } finally {
      release.setBlocking(true);
    }
    const message = await pending.then(
      () => 'resolved',
      (error: Error) => error.message
    );

    // Assert
    expect(message).toBe(ABORTED_MESSAGE);
  });

  test('stops the timers of the aborted runtime', async () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'abort-timers',
      abortable: true,
    });
    const ticks = createSynchronizable(0);
    scheduleOnRuntime(runtime, () => {
      'worklet';
      setInterval(() => {
        ticks.setBlocking((prev) => prev + 1);
      }, 10);
      scheduleOnRN(onStarted);
    });
    await waitForNotification(STARTED_NOTIFICATION);
    await wait(100);

    // Act
    abortWorkletRuntime(runtime.runtimeId);
    await wait(50);
    const ticksAfterAbort = ticks.getBlocking();
    await wait(200);

    // Assert
    expect(ticksAfterAbort > 0).toBe(true);
    expect(ticks.getBlocking()).toBe(ticksAfterAbort);
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
});
