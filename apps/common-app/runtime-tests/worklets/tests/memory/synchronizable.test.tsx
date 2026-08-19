import {
  createSynchronizable,
  type FixedSynchronizable,
  isSynchronizable,
  runOnRuntimeSync,
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
  type Synchronizable,
  type SynchronizableConfig,
  type WorkletRuntime,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const NOTIFICATION = 'NOTIFICATION';
const [workletRuntime] = getWorkletRuntimesFromPool(1);

type SynchronizableVariant = {
  variantName: string;
  config?: SynchronizableConfig;
};

const VARIANTS: SynchronizableVariant[] = [
  { variantName: 'dynamic' },
  { variantName: 'fixed', config: { fixedType: true } },
];

const initialValue = 0;

const targetValue = 32768;

function getDirtySetBlocking(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    const value = synchronizable.getDirty();
    synchronizable.setBlocking(value + 1);
  }
  return synchronizable.getBlocking();
}

function getBlockingSetBlocking(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    const value = synchronizable.getBlocking();
    synchronizable.setBlocking(value + 1);
  }
  return synchronizable.getBlocking();
}

function transactionGetSet(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    synchronizable.setBlocking((prev) => prev + 1);
  }
  return synchronizable.getBlocking();
}

function imperativeLockGetSet(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    synchronizable.lock();
    const value = synchronizable.getBlocking();
    synchronizable.setBlocking(value + 1);
    synchronizable.unlock();
  }
  return synchronizable.getBlocking();
}

function dispatch(
  runtime: WorkletRuntime,
  synchronizable: Synchronizable<number>,
  method: (synchronizable: Synchronizable<number>) => number,
  callbackRN: (value: number) => void,
  callbackUI: (value: number) => void,
  callbackBG: (value: number) => void
) {
  scheduleOnRuntime(runtime, () => {
    'worklet';
    const value = method(synchronizable);
    scheduleOnRN(callbackBG, value);
  });

  scheduleOnUI(() => {
    'worklet';
    const value = method(synchronizable);
    scheduleOnRN(callbackUI, value);
  });

  queueMicrotask(() => {
    const value = method(synchronizable);
    scheduleOnRN(callbackRN, value);
  });
}

async function runDispatched(
  config: SynchronizableConfig | undefined,
  method: (synchronizable: Synchronizable<number>) => number
) {
  const values = { valueRN: 0, valueUI: 0, valueBG: 0 };

  const maybeNotify = () => {
    if (values.valueRN > 0 && values.valueUI > 0 && values.valueBG > 0) {
      notify(NOTIFICATION);
    }
  };
  const setValueRN = (value: number) => {
    values.valueRN = value;
    maybeNotify();
  };
  const setValueUI = (value: number) => {
    values.valueUI = value;
    maybeNotify();
  };
  const setValueBG = (value: number) => {
    values.valueBG = value;
    maybeNotify();
  };

  dispatch(
    workletRuntime,
    createSynchronizable(initialValue, config),
    method,
    setValueRN,
    setValueUI,
    setValueBG
  );

  await waitForNotification(NOTIFICATION);

  return values;
}

for (const { variantName, config } of VARIANTS) {
  describe(`Test Synchronizable creation and serialization (${variantName})`, () => {
    test('createSynchronizable returns Synchronizable', () => {
      const synchronizable = createSynchronizable(0, config);

      expect(isSynchronizable(synchronizable)).toBe(true);
    });

    test('Synchronizable serializes correctly from RN Runtime to UI Runtime', () => {
      const synchronizable = createSynchronizable(0, config);
      const value = runOnUISync(() => {
        return synchronizable.getBlocking();
      });

      expect(value).toBe(0);
    });

    test('Synchronizable serializes correctly from RN Runtime to BG Runtime', async () => {
      const synchronizable = createSynchronizable(42, config);

      let readValue = 0;
      const onJSCallback = (value: number) => {
        readValue = value;
        notify(NOTIFICATION);
      };

      // Act
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        const value = synchronizable.getBlocking();
        scheduleOnRN(onJSCallback, value);
      });
      await waitForNotification(NOTIFICATION);

      // Assert
      expect(readValue).toBe(42);
    });

    test('Synchronizable serializes correctly from UI Runtime to RN runtime', () => {
      const synchronizable = createSynchronizable(0, config);
      const synchronizableCopy = runOnUISync(() => {
        return synchronizable;
      });

      const value = synchronizableCopy.getBlocking();
      expect(value).toBe(0);
    });

    test('Synchronizable serializes correctly from BG Runtime to RN Runtime', async () => {
      const synchronizable = createSynchronizable(42, config);
      let synchronizableCopy: Synchronizable<number>;

      const onJSCallback = (value: Synchronizable<number>) => {
        synchronizableCopy = value;
        notify(NOTIFICATION);
      };

      // Act
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        scheduleOnRN(onJSCallback, synchronizable);
      });
      await waitForNotification(NOTIFICATION);

      const value = synchronizableCopy!.getBlocking();
      expect(value).toBe(42);
    });

    // TODO: There is no test for serialization from UI Runtime to BG Runtime
    // because nested `scheduleOnRN` isn't copied properly.
    // It will be fixed when BundleMode™ becomes the standard.
  });

  describe(`Test Synchronizable access (${variantName})`, () => {
    // The three runtimes can complete their loops without overlapping,
    // keeping every update.
    const intermediateUpperBound = targetValue * 3;

    test('dirty reading yields intermediate values', async () => {
      const { valueRN, valueUI, valueBG } = await runDispatched(
        config,
        getDirtySetBlocking
      );

      expect(valueRN).toBeWithinRange(initialValue + 1, intermediateUpperBound);
      expect(valueUI).toBeWithinRange(initialValue + 1, intermediateUpperBound);
      expect(valueBG).toBeWithinRange(initialValue + 1, intermediateUpperBound);
    });

    test('blocking reading yields intermediate values', async () => {
      const { valueRN, valueUI, valueBG } = await runDispatched(
        config,
        getBlockingSetBlocking
      );

      expect(valueRN).toBeWithinRange(initialValue + 1, intermediateUpperBound);
      expect(valueUI).toBeWithinRange(initialValue + 1, intermediateUpperBound);
      expect(valueBG).toBeWithinRange(initialValue + 1, intermediateUpperBound);
    });

    test('transaction reading is atomic', async () => {
      const { valueRN, valueUI, valueBG } = await runDispatched(
        config,
        transactionGetSet
      );

      expect(Math.max(valueRN, valueUI, valueBG)).toBe(targetValue * 3);
    });

    test('imperative locking reading is atomic', async () => {
      const { valueRN, valueUI, valueBG } = await runDispatched(
        config,
        imperativeLockGetSet
      );

      expect(Math.max(valueRN, valueUI, valueBG)).toBe(targetValue * 3);
    });
  });

  describe(`Test Synchronizable serialization (${variantName})`, () => {
    test('Synchronizable accepts primitives', () => {
      const synchronizable = createSynchronizable(0, config);

      // RN Runtime
      synchronizable.setBlocking(1);
      expect(synchronizable.getBlocking()).toBe(1);

      // UI Runtime
      runOnUISync(() => {
        'worklet';
        synchronizable.setBlocking(2);
      });
      expect(synchronizable.getBlocking()).toBe(2);

      // Worker Runtime
      runOnRuntimeSync(workletRuntime, () => {
        'worklet';
        synchronizable.setBlocking(3);
      });
      expect(synchronizable.getBlocking()).toBe(3);
    });

    test('functional setBlocking updates the value', () => {
      const synchronizable = createSynchronizable(1, config);

      synchronizable.setBlocking((prev) => prev + 41);

      expect(synchronizable.getBlocking()).toBe(42);
    });
  });
}

describe('Test dynamic Synchronizable serialization', () => {
  test('Synchronizable accepts objects', () => {
    const synchronizable = createSynchronizable({ a: 0 });

    // RN Runtime
    synchronizable.setBlocking({ a: 1 });
    expect(synchronizable.getBlocking().a).toBe(1);

    // UI Runtime
    runOnUISync(() => {
      'worklet';
      synchronizable.setBlocking({ a: 2 });
    });
    expect(synchronizable.getBlocking().a).toBe(2);

    // Worker Runtime
    runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      synchronizable.setBlocking({ a: 3 });
    });
    expect(synchronizable.getBlocking().a).toBe(3);
  });

  test('dynamic Synchronizable has no setDirty', () => {
    const synchronizable = createSynchronizable(0);

    expect('setDirty' in synchronizable).toBe(false);
  });
});

describe('Test fixed-type Synchronizable creation', () => {
  test('createSynchronizable with fixedType returns FixedSynchronizable', () => {
    const synchronizable = createSynchronizable(0, { fixedType: true });

    expect(isSynchronizable(synchronizable)).toBe(true);
    expect(typeof synchronizable.setDirty).toBe('function');
  });

  test('fixed number keeps its initial value', () => {
    const synchronizable = createSynchronizable(42, { fixedType: true });

    expect(synchronizable.getDirty()).toBe(42);
    expect(synchronizable.getBlocking()).toBe(42);
  });

  test('fixed boolean keeps its type', () => {
    const synchronizable = createSynchronizable(true, { fixedType: true });

    expect(typeof synchronizable.getDirty()).toBe('boolean');
    expect(typeof synchronizable.getBlocking()).toBe('boolean');
    expect(synchronizable.getDirty()).toBe(true);

    synchronizable.setDirty(false);
    expect(typeof synchronizable.getDirty()).toBe('boolean');
    expect(synchronizable.getDirty()).toBe(false);
  });

  test('fixedType with an unsupported initial value throws in dev', async () => {
    await expect(() => {
      createSynchronizable('string' as unknown as number, {
        fixedType: true,
      });
    }).toThrow(
      '[Worklets] `fixedType` requires a number or boolean initial value.'
    );
  });
});

describe('Test fixed-type Synchronizable writes', () => {
  test('setDirty is visible through getDirty and getBlocking', () => {
    const synchronizable = createSynchronizable(0, { fixedType: true });

    synchronizable.setDirty(1);

    expect(synchronizable.getDirty()).toBe(1);
    expect(synchronizable.getBlocking()).toBe(1);
  });

  test('setBlocking is visible through getDirty', () => {
    const synchronizable = createSynchronizable(0, { fixedType: true });

    synchronizable.setBlocking(2);

    expect(synchronizable.getDirty()).toBe(2);
  });
});

describe('Test fixed-type Synchronizable serialization', () => {
  test('fixed Synchronizable works across RN, UI and Worker Runtimes', () => {
    const synchronizable = createSynchronizable(0, { fixedType: true });

    synchronizable.setDirty(1);
    expect(synchronizable.getBlocking()).toBe(1);

    runOnUISync(() => {
      'worklet';
      synchronizable.setDirty(2);
    });
    expect(synchronizable.getBlocking()).toBe(2);

    runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      synchronizable.setBlocking(3);
    });
    expect(synchronizable.getDirty()).toBe(3);
  });

  test('fixed boolean Synchronizable works across RN, UI and Worker Runtimes', async () => {
    const synchronizable = createSynchronizable(false, { fixedType: true });

    runOnUISync(() => {
      'worklet';
      synchronizable.setDirty(true);
    });
    expect(typeof synchronizable.getBlocking()).toBe('boolean');
    expect(synchronizable.getBlocking()).toBe(true);

    let readValue: boolean | undefined;
    const onJSCallback = (value: boolean) => {
      readValue = value;
      notify(NOTIFICATION);
    };

    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      const value = synchronizable.getDirty();
      synchronizable.setBlocking(false);
      scheduleOnRN(onJSCallback, value);
    });
    await waitForNotification(NOTIFICATION);

    expect(readValue).toBe(true);
    expect(typeof synchronizable.getDirty()).toBe('boolean');
    expect(synchronizable.getDirty()).toBe(false);
  });

  test('fixed Synchronizable keeps setDirty after RN to UI to RN roundtrip', () => {
    const synchronizable = createSynchronizable(7, { fixedType: true });
    const synchronizableCopy = runOnUISync(() => {
      'worklet';
      return synchronizable;
    });

    expect(typeof synchronizableCopy.setDirty).toBe('function');
    synchronizableCopy.setDirty(8);
    expect(synchronizable.getDirty()).toBe(8);
  });

  test('fixed Synchronizable keeps setDirty after BG to RN hop', async () => {
    const synchronizable = createSynchronizable(42, { fixedType: true });
    let synchronizableCopy: FixedSynchronizable<number>;

    const onJSCallback = (value: FixedSynchronizable<number>) => {
      synchronizableCopy = value;
      notify(NOTIFICATION);
    };

    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      synchronizable.setDirty(43);
      scheduleOnRN(onJSCallback, synchronizable);
    });
    await waitForNotification(NOTIFICATION);

    expect(typeof synchronizableCopy!.setDirty).toBe('function');
    expect(synchronizableCopy!.getBlocking()).toBe(43);
  });
});

describe('Test fixed-type Synchronizable access', () => {
  test('concurrent setDirty never yields torn values', async () => {
    const synchronizable = createSynchronizable(0, { fixedType: true });
    const evenValue = 2;
    const oddValue = 3;

    let done = false;
    const onBGDone = () => {
      done = true;
    };

    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      for (let i = 0; i < targetValue; i++) {
        synchronizable.setDirty(oddValue);
      }
      scheduleOnRN(onBGDone);
    });

    scheduleOnUI(() => {
      'worklet';
      for (let i = 0; i < targetValue; i++) {
        synchronizable.setDirty(evenValue);
      }
    });

    while (!done) {
      const observed = synchronizable.getDirty();
      expect(
        observed === 0 || observed === evenValue || observed === oddValue
      ).toBe(true);
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
    }

    const final = synchronizable.getDirty();
    expect(final === evenValue || final === oddValue).toBe(true);
  });

  test('setDirty waits for a foreign lock', async () => {
    const LOCK_HOLDER_DONE = 'LOCK_HOLDER_DONE';
    const DIRTY_WRITER_DONE = 'DIRTY_WRITER_DONE';
    const holdDurationMs = 200;

    const synchronizable = createSynchronizable(0, { fixedType: true });
    const lockTaken = createSynchronizable(false, { fixedType: true });

    let lockHolderResult = { firstRead: -1, secondRead: -1, unlockedAt: -1 };
    let dirtyWriterReturnedAt = -1;

    const onLockHolderDone = (result: typeof lockHolderResult) => {
      lockHolderResult = result;
      notify(LOCK_HOLDER_DONE);
    };
    const onDirtyWriterDone = (returnedAt: number) => {
      dirtyWriterReturnedAt = returnedAt;
      notify(DIRTY_WRITER_DONE);
    };

    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      synchronizable.lock();
      lockTaken.setDirty(true);
      const firstRead = synchronizable.getBlocking();
      const start = Date.now();
      let now = start;
      while (now - start < holdDurationMs) {
        now = Date.now();
      }
      const secondRead = synchronizable.getBlocking();
      synchronizable.unlock();
      const unlockedAt = Date.now();
      scheduleOnRN(onLockHolderDone, { firstRead, secondRead, unlockedAt });
    });

    scheduleOnUI(() => {
      'worklet';
      let taken = lockTaken.getDirty();
      while (!taken) {
        taken = lockTaken.getDirty();
      }
      synchronizable.setDirty(42);
      const returnedAt = Date.now();
      scheduleOnRN(onDirtyWriterDone, returnedAt);
    });

    await waitForNotification(LOCK_HOLDER_DONE);
    await waitForNotification(DIRTY_WRITER_DONE);

    expect(lockHolderResult.firstRead).toBe(0);
    expect(lockHolderResult.secondRead).toBe(0);
    expect(dirtyWriterReturnedAt >= lockHolderResult.unlockedAt).toBe(true);
    expect(synchronizable.getBlocking()).toBe(42);
  });
});

describe('Test Synchronizable error handling', () => {
  const lockReleaseTest = __DEV__ ? test : test.skip;

  for (const { variantName, config } of VARIANTS) {
    lockReleaseTest(
      `a throwing setter function releases the lock (${variantName})`,
      async () => {
        const READ_DONE = 'READ_DONE';
        const synchronizable = createSynchronizable(initialValue, config);

        await expect(() => {
          synchronizable.setBlocking(() => {
            throw new Error('setter failure');
          });
        }).toThrow('setter failure');

        let observed = -1;
        const onReadDone = (value: number) => {
          observed = value;
          notify(READ_DONE);
        };

        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          scheduleOnRN(onReadDone, synchronizable.getBlocking());
        });

        await waitForNotification(READ_DONE);
        expect(observed).toBe(initialValue);
      }
    );
  }
});
