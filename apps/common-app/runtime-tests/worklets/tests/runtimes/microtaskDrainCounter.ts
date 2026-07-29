import { runOnRuntimeSyncWithId } from 'react-native-worklets';

export function startCountingMicrotaskDrains(runtimeId: number) {
  runOnRuntimeSyncWithId(runtimeId, () => {
    'worklet';
    globalThis.microtaskDrainCount = 0;
    globalThis.originalCallMicrotasks = globalThis.__callMicrotasks;
    globalThis.__callMicrotasks = () => {
      globalThis.microtaskDrainCount! += 1;
      globalThis.originalCallMicrotasks!();
    };
  });
}

export function stopCountingMicrotaskDrains(runtimeId: number) {
  return runOnRuntimeSyncWithId(runtimeId, () => {
    'worklet';
    const result = globalThis.microtaskDrainCount!;
    globalThis.__callMicrotasks = globalThis.originalCallMicrotasks!;
    globalThis.originalCallMicrotasks = undefined;
    globalThis.microtaskDrainCount = undefined;
    return result;
  });
}
