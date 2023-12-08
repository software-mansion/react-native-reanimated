'use strict';
import { useEffect, useRef } from 'react';
import { initialUpdaterRun } from '../animation';
import type { SharedValue, WorkletFunction } from '../commonTypes';
import { makeMutable, startMapper, stopMapper } from '../core';
import type { DependencyList } from './commonTypes';
import { shouldBeUseWeb } from '../PlatformChecker';

export type DerivedValue<Value> = Readonly<SharedValue<Value>>;

/**
 * Lets you create new shared values based on existing ones while keeping them reactive.
 *
 * @param updater - A function called whenever at least one of the shared values or state used in the function body changes.
 * @param dependencies - An optional array of dependencies. Only relevant when using Reanimated without the Babel plugin on the Web.
 * @returns A new readonly shared value based on a value returned from the updater function
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useDerivedValue
 */
// @ts-expect-error This overload is required by our API.
export function useDerivedValue<Value>(
  updater: () => Value,
  dependencies?: DependencyList
): DerivedValue<Value>;

export function useDerivedValue<Value>(
  updater: WorkletFunction<[], Value>,
  dependencies?: DependencyList
): DerivedValue<Value> {
  const initRef = useRef<SharedValue<Value> | null>(null);
  let inputs = Object.values(updater.__closure ?? {});
  if (shouldBeUseWeb()) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Babel/SWC plugin
      inputs = dependencies;
    }
  }

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
    const mapperId = startMapper(fun, inputs, [sharedValue]);
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  return sharedValue;
}
