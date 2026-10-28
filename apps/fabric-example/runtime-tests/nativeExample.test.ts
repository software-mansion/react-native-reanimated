import {
  createWorkletRuntime,
  getCurrentThreadId,
  runOnRuntimeAsync,
} from 'react-native-worklets';

import {
  describe,
  expect,
  test,
} from '../../common-app/runtime-tests/ReJest/RuntimeTestsApi';
import NativeExample from '../specs/NativeExample';

declare global {
  var nativeAnswer: (() => number) | undefined;
}

describe('C++ documentation example', () => {
  test('installs a native function and returns 42 from a worker thread', async () => {
    const worker = createWorkletRuntime({ name: 'native-example' });
    expect(NativeExample.install(worker)).toBe(true);

    const result = await runOnRuntimeAsync(worker, () => {
      'worklet';
      return globalThis.nativeAnswer!();
    });

    expect(result).toBe(42);
    expect(typeof globalThis.nativeAnswer).toBe('undefined');

    const threadId = await runOnRuntimeAsync(worker, () => {
      'worklet';
      return getCurrentThreadId();
    });
    expect(threadId === getCurrentThreadId()).toBe(false);

    const otherWorker = createWorkletRuntime({
      name: 'without-native-example',
    });
    const otherType = await runOnRuntimeAsync(otherWorker, () => {
      'worklet';
      return typeof globalThis.nativeAnswer;
    });
    expect(otherType).toBe('undefined');
  });
});
