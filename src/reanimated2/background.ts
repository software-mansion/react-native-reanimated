import type { ComplexWorkletFunction } from './commonTypes';
import { createWorkletRuntime } from './runtimes';
import type { WorkletRuntime } from './runtimes';
import { runOnJS, runOnRuntime } from './threads';

export interface BackgroundTaskConfig {
  runtime?: WorkletRuntime;
}

export function backgroundTask<T>(
  worklet: ComplexWorkletFunction<[], T>,
  config?: BackgroundTaskConfig
): Promise<T> {
  const runtime = config?.runtime ?? createWorkletRuntime('Background');
  return new Promise((resolve, reject) => {
    runOnRuntime(runtime, () => {
      'worklet';
      try {
        const result = worklet();
        runOnJS(resolve)(result);
      } catch (error) {
        runOnJS(reject)(error);
      }
    })();
  });
}
