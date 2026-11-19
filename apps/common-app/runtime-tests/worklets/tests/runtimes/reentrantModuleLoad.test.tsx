import {
  createWorkletRuntime,
  isBundleModeEnabled,
  runOnRuntimeSync,
} from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';
import { evaluationLog } from './reentrantModule';

type ReentrantModuleGlobal = typeof globalThis & {
  __reentrantModuleRuntimeId?: number;
};

describe('module loaded while a worklet is unpacked', () => {
  const reentrantModuleTest = isBundleModeEnabled() ? test : test.skip;

  reentrantModuleTest(
    'runs microtasks queued by the module after the worklet',
    () => {
      const runtime = createWorkletRuntime({
        name: 'reentrant module load',
      });
      runOnRuntimeSync(
        runtime,
        (runtimeId: number) => {
          'worklet';
          (globalThis as ReentrantModuleGlobal).__reentrantModuleRuntimeId =
            runtimeId;
        },
        runtime.runtimeId
      );

      runOnRuntimeSync(runtime, () => {
        'worklet';
        evaluationLog.push('worklet body');
      });
      const log = runOnRuntimeSync(runtime, () => {
        'worklet';
        return evaluationLog.join(', ');
      });

      expect(log).toBe('module begins, module ends, worklet body, microtask');
    }
  );
});
