import {
  createSynchronizable,
  getRuntimeKind,
  runOnRuntimeAsync,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  runOnUIAsync,
  runOnUISync,
  RuntimeKind,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  getWorkletRuntimeFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const DONE_NOTIFICATION = 'DONE';

const NOTHING_RAN = 0;
const ANIMATION_FRAME_RAN = 1;
const MICROTASK_RAN = 2;

describe('microtask draining', () => {
  const workletRuntime = getWorkletRuntimeFromPool('test');

  const microtaskDrainCount = createSynchronizable(0);
  const firstCallbackThatRan = createSynchronizable(NOTHING_RAN);

  const notifyDone = () => {
    notify(DONE_NOTIFICATION);
  };

  function restoreCallMicrotasks(runtimeId: number) {
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
      if (globalThis.originalCallMicrotasks) {
        globalThis.__callMicrotasks = globalThis.originalCallMicrotasks;
        globalThis.originalCallMicrotasks = undefined;
      }
    });
  }

  function startCountingMicrotaskDrains(runtimeId: number) {
    restoreCallMicrotasks(runtimeId);

    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
      const previousCallMicrotasks = globalThis.__callMicrotasks;
      globalThis.originalCallMicrotasks = previousCallMicrotasks;
      globalThis.__callMicrotasks = () => {
        microtaskDrainCount.setBlocking((count) => count + 1);
        previousCallMicrotasks();
      };
    });

    microtaskDrainCount.setBlocking(0);
  }

  function drainPendingMicrotasks(runtimeId: number) {
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
      globalThis.__callMicrotasks();
    });
  }

  /**
   * Queues a microtask that reports back once it runs. On the UI Runtime it
   * also queues an animation frame callback - `executeQueue` runs those before
   * draining, so if the callback records itself first, the frame loop drained
   * the microtask rather than the call under test. Only the first callback to
   * run records itself, which keeps the check free of races.
   */
  const probeDrainingCall = () => {
    'worklet';
    let animationFrameHandle: number | undefined;
    if (getRuntimeKind() === RuntimeKind.UI) {
      animationFrameHandle = requestAnimationFrame(() => {
        firstCallbackThatRan.setBlocking((first) =>
          first === NOTHING_RAN ? ANIMATION_FRAME_RAN : first
        );
      });
    }
    queueMicrotask(() => {
      // Cancelling here keeps the callback from outliving this case and
      // recording itself against the next one. If the frame loop got there
      // first it has already recorded itself and this is a no-op.
      if (animationFrameHandle !== undefined) {
        cancelAnimationFrame(animationFrameHandle);
      }
      firstCallbackThatRan.setBlocking((first) =>
        first === NOTHING_RAN ? MICROTASK_RAN : first
      );
      scheduleOnRN(notifyDone);
    });
  };

  /**
   * Leaves a microtask pending without reporting back, so the runtime has
   * microtask work to drain even when the call under test is not expected to
   * drain it.
   */
  const probeNonDrainingCall = () => {
    'worklet';
    queueMicrotask(() => {});
  };

  const cases: {
    name: string;
    runtimeId: number;
    expectedDrains: number;
    invoke: () => void | Promise<unknown>;
  }[] = [
    {
      name: 'scheduleOnUI',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => scheduleOnUI(probeDrainingCall),
    },
    {
      name: 'runOnUIAsync',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => runOnUIAsync(probeDrainingCall),
    },
    {
      name: 'runOnUISync',
      runtimeId: UIRuntimeId,
      expectedDrains: 0,
      invoke: () => runOnUISync(probeNonDrainingCall),
    },
    {
      name: 'scheduleOnRuntime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () => scheduleOnRuntime(workletRuntime, probeDrainingCall),
    },
    {
      name: 'scheduleOnRuntimeWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => scheduleOnRuntimeWithId(UIRuntimeId, probeDrainingCall),
    },
    {
      name: 'scheduleOnRuntimeWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () =>
        scheduleOnRuntimeWithId(workletRuntime.runtimeId, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeAsync',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () => runOnRuntimeAsync(workletRuntime, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeAsyncWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => runOnRuntimeAsyncWithId(UIRuntimeId, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeAsyncWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () =>
        runOnRuntimeAsyncWithId(workletRuntime.runtimeId, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeSync',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 0,
      invoke: () => runOnRuntimeSync(workletRuntime, probeNonDrainingCall),
    },
    {
      name: 'runOnRuntimeSyncWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      expectedDrains: 0,
      invoke: () => runOnRuntimeSyncWithId(UIRuntimeId, probeNonDrainingCall),
    },
    {
      name: 'runOnRuntimeSyncWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 0,
      invoke: () =>
        runOnRuntimeSyncWithId(workletRuntime.runtimeId, probeNonDrainingCall),
    },
  ];

  cases.forEach(({ name, runtimeId, expectedDrains, invoke }) => {
    describe(name, () => {
      beforeEach(() => {
        firstCallbackThatRan.setBlocking(NOTHING_RAN);
        startCountingMicrotaskDrains(runtimeId);
      });

      afterEach(() => {
        restoreCallMicrotasks(runtimeId);
        drainPendingMicrotasks(runtimeId);
      });

      test(`drains microtasks ${expectedDrains} time(s)`, async () => {
        await invoke();
        if (expectedDrains > 0) {
          await waitForNotification(DONE_NOTIFICATION);
        }

        const microtaskDrains = microtaskDrainCount.getBlocking();
        const didAnimationFrameRunFirst =
          firstCallbackThatRan.getBlocking() === ANIMATION_FRAME_RAN;

        expect(didAnimationFrameRunFirst).toBe(false);
        expect(microtaskDrains).toBe(expectedDrains);
      });
    });
  });
});
