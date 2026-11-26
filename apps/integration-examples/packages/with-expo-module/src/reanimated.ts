import { installOnUIRuntime } from 'expo';
import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  createSerializable,
  getUIRuntimeHolder,
  isWorkletFunction,
} from 'react-native-worklets';

import NativeCounter from './NativeCounter';

let isInstalledOnUIRuntime = false;

export function addCounterWorkletListener(worklet: (count: number) => void): {
  remove(): void;
} {
  const id = NativeCounter.addWorkletListener(prepareWorklet(worklet));
  return { remove: () => NativeCounter.removeWorkletListener(id) };
}

export function addCounterFrameWorkletListener(
  worklet: (count: number) => void
): { remove(): void } {
  const id = NativeCounter.addFrameWorkletListener(prepareWorklet(worklet));
  return { remove: () => NativeCounter.removeFrameWorkletListener(id) };
}

export function useCounter(): SharedValue<number> {
  return useCounterFrom(addCounterWorkletListener);
}

export function useCounterOnEachFrame(): SharedValue<number> {
  return useCounterFrom(addCounterFrameWorkletListener);
}

function useCounterFrom(
  addListener: (worklet: (count: number) => void) => { remove(): void }
): SharedValue<number> {
  const count = useSharedValue(() => NativeCounter.getCount());

  useEffect(() => {
    const subscription = addListener((newCount) => {
      'worklet';
      count.set(newCount);
    });
    return () => subscription.remove();
  }, [addListener, count]);

  return count;
}

function prepareWorklet(worklet: (count: number) => void): object {
  if (!isWorkletFunction(worklet)) {
    throw new Error(
      "The counter listener must be a worklet. Add the 'worklet' directive."
    );
  }
  if (!isInstalledOnUIRuntime) {
    installOnUIRuntime(getUIRuntimeHolder());
    isInstalledOnUIRuntime = true;
  }
  return createSerializable(worklet);
}
