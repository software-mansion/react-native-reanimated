import {
  createWorkletRuntime,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  runOnUISync,
  RuntimeKind,
  UIRuntimeId,
} from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('runOnRuntimeSyncWithId', () => {
  const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
  const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

  describe('from RN Runtime', () => {
    test('to UI Runtime', () => {
      const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
        'worklet';
        return globalThis.__RUNTIME_KIND;
      });

      expect(result).toBe(RuntimeKind.UI);
    });

    test('to Worker Runtime', () => {
      const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
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
          const resultOnUI = runOnRuntimeSyncWithId(UIRuntimeId, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });

          return resultOnUI;
        });

        expect(result).toBe(RuntimeKind.UI);
      });

      test('to Worker Runtime', () => {
        const result = runOnUISync(() => {
          'worklet';
          const resultOnUI = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
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
        const result = runOnRuntimeSync(workletRuntime1, () => {
          'worklet';
          const resultOnWorker = runOnRuntimeSyncWithId(UIRuntimeId, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });
          return resultOnWorker;
        });

        expect(result).toBe(RuntimeKind.UI);
      });

      test('to self', () => {
        const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          const resultOnWorker = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
            'worklet';
            return globalThis.__RUNTIME_KIND;
          });
          return resultOnWorker;
        });

        expect(result).toBe(RuntimeKind.Worker);
      });

      test('to other Worker Runtime', () => {
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
        const fun = () =>
          runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
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
