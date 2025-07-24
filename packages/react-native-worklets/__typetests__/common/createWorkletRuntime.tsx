import { createWorkletRuntime } from '../../src/runtimes';
import type { WorkletFunction } from '../../src/workletTypes';

export function createWorkletRuntimeTest() {
  createWorkletRuntime({
    name: 'test',
    initializer: (() => {
      'worklet';
      console.log('test');
    }) as WorkletFunction<[], void>,
  });

  createWorkletRuntime('test', () => {
    'worklet';
    console.log('test');
  });
}
