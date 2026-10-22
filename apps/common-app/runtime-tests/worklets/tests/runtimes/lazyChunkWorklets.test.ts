import {
  createWorkletRuntime,
  RuntimeKind,
  runOnRuntimeSync,
} from 'react-native-worklets';

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
