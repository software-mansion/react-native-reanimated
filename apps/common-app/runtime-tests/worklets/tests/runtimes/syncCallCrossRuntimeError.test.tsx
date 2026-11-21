import type { WorkletRuntime } from 'react-native-worklets';
import {
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  runOnUISync,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const UNKNOWN_MODULE_ID = 65000;
const UNPACK_ERROR_MESSAGE = `Requiring unknown module "${UNKNOWN_MODULE_ID}".`;
const BODY_ERROR_MESSAGE = 'worklet body failure';

type ErrorProbe = {
  caught: boolean;
  isError: boolean;
  hasRNErrorPrototype: boolean;
  message: string;
};

describe('synchronous calls rethrow errors as objects of the calling runtime', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('runOnRuntimeSync, the worklet cannot be unpacked on the Worker Runtime', () => {
      const error = catchError(() =>
        runOnRuntimeSync(
          workletRuntime,
          (fn: unknown) => {
            'worklet';
            return typeof fn;
          },
          createUnresolvableImport()
        )
      );

      expectErrorOfRNRuntime(probeError(error), UNPACK_ERROR_MESSAGE);
    });

    test('runOnRuntimeSyncWithId, the worklet cannot be unpacked on the Worker Runtime', () => {
      const error = catchError(() =>
        runOnRuntimeSyncWithId(
          workletRuntime.runtimeId,
          (fn: unknown) => {
            'worklet';
            return typeof fn;
          },
          createUnresolvableImport()
        )
      );

      expectErrorOfRNRuntime(probeError(error), UNPACK_ERROR_MESSAGE);
    });

    test('runOnUISync, the worklet cannot be unpacked on the UI Runtime', () => {
      const error = catchError(() =>
        runOnUISync((fn: unknown) => {
          'worklet';
          return typeof fn;
        }, createUnresolvableImport())
      );

      expectErrorOfRNRuntime(probeError(error), UNPACK_ERROR_MESSAGE);
    });
  }

  if (!__DEV__) {
    test('runOnRuntimeSync, the worklet throws on the Worker Runtime', () => {
      const error = catchError(() =>
        runOnRuntimeSync(workletRuntime, () => {
          'worklet';
          throw new Error(BODY_ERROR_MESSAGE);
        })
      );

      expectErrorOfRNRuntime(probeError(error), BODY_ERROR_MESSAGE);
    });
  }

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('runOnRuntimeSync, the error stays readable after garbage collection', async () => {
      const error = catchError(() =>
        runOnRuntimeSync(
          workletRuntime,
          (fn: unknown) => {
            'worklet';
            return typeof fn;
          },
          createUnresolvableImport()
        )
      );

      await collectGarbage(workletRuntime);

      expectErrorOfRNRuntime(probeError(error), UNPACK_ERROR_MESSAGE);
    });
  }
});

function createUnresolvableImport() {
  return Object.assign(() => undefined, {
    __bundleData: { source: UNKNOWN_MODULE_ID, imported: 'default' },
  });
}

function catchError(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  return undefined;
}

async function collectGarbage(workletRuntime: WorkletRuntime) {
  for (let round = 0; round < 5; round++) {
    allocateGarbage();
    runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      const garbage: number[][] = [];
      for (let i = 0; i < 2000; i++) {
        garbage.push(new Array<number>(1000).fill(i));
      }
      (globalThis as { gc?: () => void }).gc?.();
      return garbage.length;
    });
    await waitForFrames(5);
  }
}

function allocateGarbage() {
  const garbage: number[][] = [];
  for (let i = 0; i < 2000; i++) {
    garbage.push(new Array<number>(1000).fill(i));
  }
  (globalThis as { gc?: () => void }).gc?.();
  return garbage.length;
}

function probeError(error: unknown): ErrorProbe {
  return {
    caught: error !== undefined,
    isError: error instanceof Error,
    hasRNErrorPrototype:
      typeof error === 'object' &&
      error !== null &&
      Object.getPrototypeOf(error) === Error.prototype,
    message: String((error as { message?: unknown } | undefined)?.message),
  };
}

function expectErrorOfRNRuntime(probe: ErrorProbe, expectedMessage: string) {
  console.log(`[syncCallCrossRuntimeError] ${JSON.stringify(probe)}`);
  expect(probe.caught).toBe(true);
  expect(probe.isError).toBe(true);
  expect(probe.hasRNErrorPrototype).toBe(true);
  expect(probe.message.includes(expectedMessage)).toBe(true);
}
