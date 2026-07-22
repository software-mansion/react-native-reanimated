'use strict';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';

import { initialUpdaterRun } from '../animation';
import type { SharedValue } from '../commonTypes';
import { makeMutable, startMapper, stopMapper } from '../core';
import type { DependencyList } from './commonTypes';

export interface DerivedValue<Value = unknown> extends Readonly<
  Omit<SharedValue<Value>, 'set'>
> {
  /**
   * @deprecated Derived values are readonly, don't use this method. It's here
   *   only to prevent breaking changes in TypeScript types. It will be removed
   *   in the future.
   */
  set: SharedValue<Value>['set'];
}

export function useDerivedValueBase<Value>(
  updater: WorkletFunction<[], Value>,
  dependencies: DependencyList,
  inputs: unknown[]
): DerivedValue<Value> {
  const initRef = useRef<SharedValue<Value> | null>(null);

  // build dependencies
  if (dependencies === undefined) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }

  if (initRef.current === null) {
    initRef.current = makeMutable(initialUpdaterRun(updater));
  }

  const sharedValue: SharedValue<Value> = initRef.current;

  useEffect(() => {
    const fun = () => {
      'worklet';
      sharedValue.value = updater();
    };
    const mapperId = startMapper(fun, inputs, [
      sharedValue as SharedValue<unknown>,
    ]);
    return () => {
      stopMapper(mapperId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return sharedValue;
}
