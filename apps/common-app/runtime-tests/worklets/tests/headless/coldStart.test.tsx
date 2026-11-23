import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';
import { watchUICallbacks } from '../runLoop/watchUICallbacks';

describe('Test UI Runtime in a process without an Activity', () => {
  test('runs without an Activity', async () => {
    const hasCurrentActivity = await RuntimeTestObserver!.hasCurrentActivity();

    expect(hasCurrentActivity).toBe(false);
  });

  test('runs frame callbacks and timers of the UI Runtime', async () => {
    const fired = await watchUICallbacks().waitForAll();

    expect(fired.requestAnimationFrame).toBe(true);
    expect(fired.setTimeout).toBe(true);
  });
});
