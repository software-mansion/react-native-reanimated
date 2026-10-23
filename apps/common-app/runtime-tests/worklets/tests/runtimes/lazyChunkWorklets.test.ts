import {
  createWorkletRuntime,
  RuntimeKind,
  runOnRuntimeSync,
} from 'react-native-worklets';
import type { WorkletRuntime } from 'react-native-worklets';

import {
  createTestValue,
  describe,
  expect,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from '../runLoop/dispatchWorklet';

function importLazyWorkletModule() {
  return import('../../../../../fabric-example/runtime-tests/lazyWorkletModule');
}

type QueuelessConfig = 'queue: null' | 'useDefaultQueue: false';

const queuelessVariants: Record<
  QueuelessConfig,
  {
    createRuntime: (name: string) => WorkletRuntime;
    loadWorklet: () => Promise<(label: string) => string>;
    expectedLabel: string;
  }
> = {
  'queue: null': {
    createRuntime: (name) => createWorkletRuntime({ name, queue: null }),
    loadWorklet: async () =>
      (
        await import('../../../../../fabric-example/runtime-tests/lazyQueuelessWorkletModuleNullQueue')
      ).describeNullQueueRuntime,
    expectedLabel: 'null-queue',
  },
  'useDefaultQueue: false': {
    createRuntime: (name) =>
      createWorkletRuntime({ name, useDefaultQueue: false }),
    loadWorklet: async () =>
      (
        await import('../../../../../fabric-example/runtime-tests/lazyQueuelessWorkletModuleNoDefaultQueue')
      ).describeNoDefaultQueueRuntime,
    expectedLabel: 'no-default-queue',
  },
};

const queuelessConfigs = Object.keys(queuelessVariants) as QueuelessConfig[];

describe('worklets from a lazy chunk loaded on the RN Runtime', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'runs the worklet on an existing runtime, runtime: **%s**',
    async (runtimeKind) => {
      const { describeRuntime } = await importLazyWorkletModule();
      const notification = `lazy_chunk_worklet_done_${runtimeKind}`;
      const [result, setResult] = createTestValue<string>('not_run');

      dispatchWorklet(() => {
        'worklet';
        setResult(describeRuntime('lazy'), notification);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(result.value).toBe(`lazy:${runtimeKind}`);
    }
  );

  test('runs the worklet on a Worker Runtime created after the chunk was loaded', async () => {
    const { describeRuntime } = await importLazyWorkletModule();
    const workletRuntime = createWorkletRuntime({
      name: 'lazy chunk test runtime',
    });

    const result = runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      return describeRuntime('lazy');
    });

    expect(result).toBe(`lazy:${RuntimeKind.Worker}`);
  });

  test('runs an initializer defined in the chunk on a Worker Runtime created after the chunk was loaded', async () => {
    const { initializeLazyRuntime } = await importLazyWorkletModule();
    const workletRuntime = createWorkletRuntime({
      name: 'lazy chunk initializer test runtime',
      initializer: initializeLazyRuntime,
    });

    const initializerRanOn = runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      return (globalThis as Record<string, unknown>)
        .__lazyInitializerRanOn as RuntimeKind;
    });

    expect(initializerRanOn).toBe(RuntimeKind.Worker);
  });
});

describe('lazy chunks on a Worker Runtime without a queue', () => {
  test.each(queuelessConfigs)(
    'a runtime without a queue does not receive chunks loaded after it was created, config: **%s**',
    async (config) => {
      const { createRuntime, loadWorklet } = queuelessVariants[config];
      const workletRuntime = createRuntime(
        `queueless runtime created before the chunk, ${config}`
      );
      const lazyWorklet = await loadWorklet();

      await expect(() =>
        runOnRuntimeSync(workletRuntime, () => {
          'worklet';
          return lazyWorklet('lazy');
        })
      ).toThrow('Unable to resolve worklet with hash');
    }
  );

  test.each(queuelessConfigs)(
    'a runtime without a queue evaluates chunks loaded before it was created, config: **%s**',
    async (config) => {
      const { createRuntime, loadWorklet, expectedLabel } =
        queuelessVariants[config];
      const lazyWorklet = await loadWorklet();
      const workletRuntime = createRuntime(
        `queueless runtime created after the chunk, ${config}`
      );

      const result = runOnRuntimeSync(workletRuntime, () => {
        'worklet';
        return lazyWorklet('lazy');
      });

      expect(result).toBe(`lazy:${expectedLabel}:${RuntimeKind.Worker}`);
    }
  );
});
