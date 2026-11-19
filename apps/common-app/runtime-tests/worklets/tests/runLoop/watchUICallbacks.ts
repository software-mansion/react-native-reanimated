import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';

type UICallbackName = 'requestAnimationFrame' | 'setTimeout';
type FiredUICallbacks = Record<UICallbackName, boolean>;

interface UICallbacksWatch {
  snapshot: () => FiredUICallbacks;
  waitForAll: () => Promise<FiredUICallbacks>;
}

const UI_CALLBACKS_TIMEOUT_MS = 2000;

/**
 * Requests an animation frame and a 50 ms timeout on the UI Runtime, and
 * reports which of the two callbacks fired.
 */
export function watchUICallbacks(): UICallbacksWatch {
  const fired: FiredUICallbacks = {
    requestAnimationFrame: false,
    setTimeout: false,
  };
  let onAllFired = () => {};
  const allFired = new Promise<void>((resolve) => {
    onAllFired = resolve;
  });
  const onFired = (name: UICallbackName) => {
    fired[name] = true;
    if (fired.requestAnimationFrame && fired.setTimeout) {
      onAllFired();
    }
  };

  scheduleOnUI(() => {
    'worklet';
    requestAnimationFrame(() => scheduleOnRN(onFired, 'requestAnimationFrame'));
    setTimeout(() => scheduleOnRN(onFired, 'setTimeout'), 50);
  });

  return {
    snapshot: () => ({ ...fired }),
    waitForAll: async () => {
      await Promise.race([
        allFired,
        RuntimeTestObserver!.delay(UI_CALLBACKS_TIMEOUT_MS),
      ]);
      return { ...fired };
    },
  };
}
