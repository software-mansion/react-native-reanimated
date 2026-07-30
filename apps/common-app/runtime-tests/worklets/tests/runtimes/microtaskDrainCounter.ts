import type { Synchronizable } from 'react-native-worklets';
import {
  createSynchronizable,
  runOnRuntimeSyncWithId,
} from 'react-native-worklets';

export function startCountingMicrotaskDrains(runtimeId: number) {
  const microtaskDrainCount = createSynchronizable(0);

  runOnRuntimeSyncWithId(runtimeId, () => {
    'worklet';
    globalThis.originalCallMicrotasks = globalThis.__callMicrotasks;
    globalThis.__callMicrotasks = () => {
      microtaskDrainCount.setBlocking((count) => count + 1);
      globalThis.originalCallMicrotasks!();
    };
  });

  microtaskDrainCount.setBlocking(0);

  return microtaskDrainCount;
}

export function stopCountingMicrotaskDrains(
  runtimeId: number,
  microtaskDrainCount: Synchronizable<number>
) {
  runOnRuntimeSyncWithId(runtimeId, () => {
    'worklet';
    globalThis.__callMicrotasks = globalThis.originalCallMicrotasks!;
    globalThis.originalCallMicrotasks = undefined;
  });

  return microtaskDrainCount.getBlocking();
}
