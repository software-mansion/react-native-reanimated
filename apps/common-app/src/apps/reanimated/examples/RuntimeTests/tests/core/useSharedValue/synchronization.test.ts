import { runOnUISync, runOnUIAsync, scheduleOnUI } from 'react-native-worklets';
import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';
import { makeMutable } from 'react-native-reanimated';

describe('Synchronization of Shared Value between the RN Runtime and UI Runtime', () => {
  test('reading from shared value on the RN runtime immediately after initializing', () => {
    const sv = makeMutable(42);
    const value = sv.value;
    expect(value).toBe(42);
  });

  test('reading from shared value on the RN runtime after synchronous update', () => {
    const sv = makeMutable(42);
    runOnUISync(() => {
      sv.value = 84;
    });

    const value = sv.value;
    expect(value).toBe(84);
  });

  test('reading from shared value on the RN runtime before asynchronous update', () => {
    const sv = makeMutable(42);
    scheduleOnUI(() => {
      sv.value = 84;
    });

    const value = sv.value;
    expect(value).toBe(42);
  });

  test('reading from shared value on the RN runtime after asynchronous update', async () => {
    const sv = makeMutable(42);
    await runOnUIAsync(() => {
      sv.value = 84;
    });

    const value = sv.value;
    expect(value).toBe(84);
  });
});
