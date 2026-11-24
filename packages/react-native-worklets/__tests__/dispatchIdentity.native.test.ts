import {
  runOnRuntimeAsync,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
} from '../src/runtimes';
import { runOnUISync } from '../src/threads';
import type { WorkletRuntime } from '../src/types';
import { WorkletsModule } from '../src/WorkletsModule/NativeWorklets';

jest.mock('../src/memory/serializable', () => ({
  createSerializable: (value: unknown) => value,
  makeShareableCloneOnUIRecursive: (value: unknown) => value,
}));

jest.mock('../src/debug/bundleMode', () => ({
  isBundleModeEnabled: () => true,
}));

jest.mock('../src/featureFlags/featureFlags', () => ({
  getStaticFeatureFlag: () => false,
}));

jest.mock('../src/WorkletsModule/NativeWorklets', () => ({
  WorkletsModule: {
    runOnUISync: jest.fn(),
    runOnRuntimeSync: jest.fn(),
    runOnRuntimeSyncWithId: jest.fn(),
    scheduleOnRuntime: jest.fn(),
    scheduleOnRuntimeWithId: jest.fn(),
  },
}));

const runtime = { runtimeId: 7 } as WorkletRuntime;

function add(value: number, increment: number): number {
  'worklet';
  return value + increment;
}

describe('native dispatch identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('schedules the original worklet with separate arguments', () => {
    scheduleOnRuntime(runtime, add, 1, 2);
    scheduleOnRuntime(runtime, add, 3, 4);

    const calls = jest.mocked(WorkletsModule.scheduleOnRuntime).mock.calls;
    expect(calls[0][1]).toBe(add);
    expect(calls[1][1]).toBe(add);
    expect(calls[0][2]).toEqual([1, 2]);
    expect(calls[1][2]).toEqual([3, 4]);
  });

  test('reuses the synchronous runtime dispatcher', () => {
    runOnRuntimeSync(runtime, add, 1, 2);
    runOnRuntimeSync(runtime, add, 3, 4);

    const calls = jest.mocked(WorkletsModule.runOnRuntimeSync).mock.calls;
    expect(calls[0][1]).toBe(calls[1][1]);
    expect(calls[0][2]).toEqual([add, [1, 2]]);
    expect(calls[1][2]).toEqual([add, [3, 4]]);
  });

  test('reuses the synchronous UI dispatcher', () => {
    runOnUISync(add, 1, 2);
    runOnUISync(add, 3, 4);

    const calls = jest.mocked(WorkletsModule.runOnUISync).mock.calls;
    expect(calls[0][0]).toBe(calls[1][0]);
    expect(calls[0][1]).toEqual([add, [1, 2]]);
    expect(calls[1][1]).toEqual([add, [3, 4]]);
  });

  test('reuses the asynchronous runtime dispatcher', () => {
    void runOnRuntimeAsync(runtime, add, 1, 2);
    void runOnRuntimeAsync(runtime, add, 3, 4);

    const calls = jest.mocked(WorkletsModule.scheduleOnRuntime).mock.calls;
    expect(calls[0][1]).toBe(calls[1][1]);
    expect(calls[0][2]).toEqual([
      add,
      [1, 2],
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(calls[1][2]).toEqual([
      add,
      [3, 4],
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  test('uses the same identity model for runtime ids', () => {
    scheduleOnRuntimeWithId(7, add, 1, 2);
    scheduleOnRuntimeWithId(7, add, 3, 4);
    runOnRuntimeSyncWithId(7, add, 1, 2);
    runOnRuntimeSyncWithId(7, add, 3, 4);
    void runOnRuntimeAsyncWithId(7, add, 1, 2);
    void runOnRuntimeAsyncWithId(7, add, 3, 4);

    const scheduleCalls = jest.mocked(WorkletsModule.scheduleOnRuntimeWithId)
      .mock.calls;
    expect(scheduleCalls[0][1]).toBe(add);
    expect(scheduleCalls[1][1]).toBe(add);
    expect(scheduleCalls[0][2]).toEqual([1, 2]);
    expect(scheduleCalls[1][2]).toEqual([3, 4]);

    const syncCalls = jest.mocked(WorkletsModule.runOnRuntimeSyncWithId).mock
      .calls;
    expect(syncCalls[0][1]).toBe(syncCalls[1][1]);
    expect(syncCalls[0][2]).toEqual([add, [1, 2]]);
    expect(syncCalls[1][2]).toEqual([add, [3, 4]]);

    const asyncCalls = jest.mocked(WorkletsModule.scheduleOnRuntimeWithId).mock
      .calls;
    expect(asyncCalls[2][1]).toBe(asyncCalls[3][1]);
    expect(asyncCalls[2][2]).toEqual([
      add,
      [1, 2],
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(asyncCalls[3][2]).toEqual([
      add,
      [3, 4],
      expect.any(Function),
      expect.any(Function),
    ]);
  });
});
