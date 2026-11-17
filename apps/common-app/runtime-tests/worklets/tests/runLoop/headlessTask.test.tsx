import { AppRegistry, Platform } from 'react-native';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

type UICallbackName = 'requestAnimationFrame' | 'setTimeout';
type FiredUICallbacks = Record<UICallbackName, boolean>;

const HEADLESS_TASK_KEY = 'RuntimeTestsHeadlessTask';
const UI_CALLBACKS_TIMEOUT_MS = 2000;

let headlessTask: (() => Promise<void>) | null = null;

AppRegistry.registerHeadlessTask(HEADLESS_TASK_KEY, () => async () => {
  await headlessTask?.();
});

describe('Test headless JS task', () => {
  const androidTest =
    Platform.OS === 'android' && RuntimeTestObserver ? test : test.skip;

  androidTest(
    'runs frame callbacks and timers of the UI Runtime while the host is paused',
    async () => {
      const fired = await runInHeadlessTaskWhileHostPaused(collectUICallbacks);

      expect(fired.requestAnimationFrame).toBe(true);
      expect(fired.setTimeout).toBe(true);
    }
  );
});

async function runInHeadlessTaskWhileHostPaused<T>(
  body: () => Promise<T>
): Promise<T> {
  await RuntimeTestObserver!.pauseHost();
  try {
    return await new Promise<T>((resolve, reject) => {
      headlessTask = () => body().then(resolve, reject);
      RuntimeTestObserver!.startHeadlessTask(HEADLESS_TASK_KEY).catch(reject);
    });
  } finally {
    headlessTask = null;
    await RuntimeTestObserver!.resumeHost();
  }
}

function collectUICallbacks(): Promise<FiredUICallbacks> {
  return new Promise((resolve) => {
    const fired: FiredUICallbacks = {
      requestAnimationFrame: false,
      setTimeout: false,
    };
    const timeout = setTimeout(() => resolve(fired), UI_CALLBACKS_TIMEOUT_MS);
    const onFired = (name: UICallbackName) => {
      fired[name] = true;
      if (fired.requestAnimationFrame && fired.setTimeout) {
        clearTimeout(timeout);
        resolve(fired);
      }
    };

    scheduleOnUI(() => {
      'worklet';
      requestAnimationFrame(() =>
        scheduleOnRN(onFired, 'requestAnimationFrame')
      );
      setTimeout(() => scheduleOnRN(onFired, 'setTimeout'), 50);
    });
  });
}
