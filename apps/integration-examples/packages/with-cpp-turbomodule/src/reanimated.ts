import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  createSerializable,
  getUIRuntimeHolder,
  getUISchedulerHolder,
  isWorkletFunction,
} from 'react-native-worklets';

import NativeCppCounter from './NativeCppCounter';

export function addCounterWorkletListener(worklet: (count: number) => void): {
  remove(): void;
} {
  if (!isWorkletFunction(worklet)) {
    throw new Error(
      "The counter listener must be a worklet. Add the 'worklet' directive."
    );
  }
  const id = NativeCppCounter.addWorkletListener(
    getUIRuntimeHolder(),
    getUISchedulerHolder(),
    createSerializable(worklet)
  );
  return { remove: () => NativeCppCounter.removeWorkletListener(id) };
}

export function useCounter(): SharedValue<number> {
  const count = useSharedValue(() => NativeCppCounter.getCount());

  useEffect(() => {
    const subscription = addCounterWorkletListener((newCount) => {
      'worklet';
      count.set(newCount);
    });
    return () => subscription.remove();
  }, [count]);

  return count;
}
