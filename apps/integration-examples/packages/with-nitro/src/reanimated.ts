import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  createSynchronizable,
  getUIRuntimeHolder,
  getUISchedulerHolder,
  isWorkletFunction,
  scheduleOnUI,
} from 'react-native-worklets';

import { counter } from './index';
import type { Counter } from './specs/Counter.nitro';

type CounterWithUIRuntimeDispatcher = Counter & {
  installUIRuntimeDispatcher(
    uiRuntimeHolder: object,
    uiSchedulerHolder: object
  ): void;
};

let isDispatcherInstalled = false;

export function addCounterWorkletListener(worklet: (count: number) => void): {
  remove(): void;
} {
  if (!isWorkletFunction(worklet)) {
    throw new Error(
      "The counter listener must be a worklet. Add the 'worklet' directive."
    );
  }
  if (!isDispatcherInstalled) {
    (counter as CounterWithUIRuntimeDispatcher).installUIRuntimeDispatcher(
      getUIRuntimeHolder(),
      getUISchedulerHolder()
    );
    isDispatcherInstalled = true;
  }
  const listenerId = createSynchronizable(0);
  scheduleOnUI(() => {
    'worklet';
    listenerId.setBlocking(counter.addListener(worklet));
  });
  return {
    remove: () =>
      scheduleOnUI(() => {
        'worklet';
        counter.removeListener(listenerId.getBlocking());
      }),
  };
}

export function useCounter(): SharedValue<number> {
  const count = useSharedValue(() => counter.count);

  useEffect(() => {
    const subscription = addCounterWorkletListener((newCount) => {
      'worklet';
      count.set(newCount);
    });
    return () => subscription.remove();
  }, [count]);

  return count;
}
