import {
  getCurrentThreadId,
  runOnRuntimeAsync,
  runOnRuntimeSync,
  runOnUIAsync,
  runOnUISync,
} from 'react-native-worklets';
import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

describe('getCurrentThreadId', () => {
  const [workletRuntime1, workletRuntime2] = getWorkletRuntimesFromPool(2);

  const readThreadId = () => {
    'worklet';
    return getCurrentThreadId();
  };

  test('returns a non-empty string on the RN Runtime', () => {
    const threadId = getCurrentThreadId();

    expect(typeof threadId).toBe('string');
    expect(threadId.length > 0).toBe(true);
  });

  test('returns the same id for every call on the RN Runtime', () => {
    expect(getCurrentThreadId()).toBe(getCurrentThreadId());
  });

  test('returns a different id on the UI Runtime than on the RN Runtime', async () => {
    const rnThreadId = getCurrentThreadId();

    const uiThreadId = await runOnUIAsync(readThreadId);

    expect(uiThreadId.length > 0).toBe(true);
    expect(uiThreadId).not.toBe(rnThreadId);
  });

  test('returns the same id for every job on the UI Runtime', async () => {
    const firstThreadId = await runOnUIAsync(readThreadId);
    const secondThreadId = await runOnUIAsync(readThreadId);

    expect(secondThreadId).toBe(firstThreadId);
  });

  test('returns a different id on a Worker Runtime than on the RN and UI Runtimes', async () => {
    const rnThreadId = getCurrentThreadId();
    const uiThreadId = await runOnUIAsync(readThreadId);

    const workerThreadId = await runOnRuntimeAsync(
      workletRuntime1,
      readThreadId
    );

    expect(workerThreadId.length > 0).toBe(true);
    expect(workerThreadId).not.toBe(rnThreadId);
    expect(workerThreadId).not.toBe(uiThreadId);
  });

  test('returns the same id for every job on a single Worker Runtime', async () => {
    const firstThreadId = await runOnRuntimeAsync(
      workletRuntime1,
      readThreadId
    );
    const secondThreadId = await runOnRuntimeAsync(
      workletRuntime1,
      readThreadId
    );

    expect(secondThreadId).toBe(firstThreadId);
  });

  test('returns a different id for each Worker Runtime', async () => {
    const firstThreadId = await runOnRuntimeAsync(
      workletRuntime1,
      readThreadId
    );
    const secondThreadId = await runOnRuntimeAsync(
      workletRuntime2,
      readThreadId
    );

    expect(secondThreadId).not.toBe(firstThreadId);
  });

  test('returns the calling thread id inside runOnRuntimeSync', () => {
    const rnThreadId = getCurrentThreadId();

    const syncThreadId = runOnRuntimeSync(workletRuntime1, readThreadId);

    expect(syncThreadId).toBe(rnThreadId);
  });

  test('returns the calling thread id inside runOnUISync', () => {
    const rnThreadId = getCurrentThreadId();

    const syncThreadId = runOnUISync(readThreadId);

    expect(syncThreadId).toBe(rnThreadId);
  });

  test('returns a different id for runOnRuntimeSync and runOnRuntimeAsync on the same Worker Runtime', async () => {
    const syncThreadId = runOnRuntimeSync(workletRuntime1, readThreadId);
    const asyncThreadId = await runOnRuntimeAsync(
      workletRuntime1,
      readThreadId
    );

    expect(asyncThreadId).not.toBe(syncThreadId);
  });
});
