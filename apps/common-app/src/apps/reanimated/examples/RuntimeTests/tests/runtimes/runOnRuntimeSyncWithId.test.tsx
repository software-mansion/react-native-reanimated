import {
  createWorkletRuntime,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  runOnUISync,
  RuntimeKind,
  UIRuntimeID,
} from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('runOnRuntimeSyncWithId', () => {
  describe('from RN Runtime', () => {
    test('to UI Runtime', () => {
      const result = runOnRuntimeSyncWithId(UIRuntimeID, () => {
        'worklet';
        return globalThis.__RUNTIME_KIND;
      });

      expect(result).toBe(RuntimeKind.UI);
    });

    test('to Worker Runtime', () => {
      const workletRuntime = createWorkletRuntime({ name: 'test' });
      const result = runOnRuntimeSyncWithId(workletRuntime.runtimeId, () => {
        'worklet';
        return globalThis.__RUNTIME_KIND;
      });

      expect(result).toBe(RuntimeKind.Worker);
    });

    test('to non-existing Runtime', async () => {
      const fun = () =>
        runOnRuntimeSyncWithId(9999, () => {
          'worklet';
          return globalThis.__RUNTIME_KIND;
        });

      await expect(fun).toThrow();
    });
  });

  describe('from UI Runtime', () => {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      test('to UI Runtime', () => {
        const result = runOnUISync(() => {
          const resultOnUI = runOnRuntimeSyncWithId(UIRuntimeID, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });

          return resultOnUI;
        });

        expect(result).toBe(RuntimeKind.UI);
      });

      test('to Worker Runtime', () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        const result = runOnUISync(() => {
          'worklet';
          const resultOnUI = runOnRuntimeSyncWithId(workletRuntime.runtimeId, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });

          return resultOnUI;
        });

        expect(result).toBe(RuntimeKind.Worker);
      });

      test('to non-existing Runtime', async () => {
        const fun = () =>
          runOnUISync(() => {
            const resultOnUI = runOnRuntimeSyncWithId(9999, () => {
              'worklet';
              return globalThis.__RUNTIME_KIND;
            });
            return resultOnUI;
          });

        await expect(fun).toThrow();
      });
    }
  });

  describe('from Worker Runtime', () => {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      test('to UI Runtime', () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });

        const result = runOnRuntimeSync(workletRuntime, () => {
          'worklet';
          const resultOnWorker = runOnRuntimeSyncWithId(UIRuntimeID, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });
          return resultOnWorker;
        });

        expect(result).toBe(RuntimeKind.UI);
      });

      test('to self', () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        const result = runOnRuntimeSyncWithId(workletRuntime.runtimeId, () => {
          'worklet';
          const resultOnWorker = runOnRuntimeSyncWithId(workletRuntime.runtimeId, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });
          return resultOnWorker;
        });

        expect(result).toBe(RuntimeKind.Worker);
      });

      test('to other Worker Runtime', () => {
        const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
        const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

        const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          const resultOnWorker = runOnRuntimeSyncWithId(workletRuntime2.runtimeId, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });
          return resultOnWorker;
        });

        expect(result).toBe(RuntimeKind.Worker);
      });

      test('to non-existing Runtime', async () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        const fun = () =>
          runOnRuntimeSyncWithId(workletRuntime.runtimeId, () => {
            'worklet';
            const resultOnWorker = runOnRuntimeSyncWithId(9999, () => {
              'worklet';
              return globalThis.__RUNTIME_KIND;
            });
            return resultOnWorker;
          });

        await expect(fun).toThrow();
      });
    }
  });
});
