'use strict';
import { useEffect, useRef } from 'react';
import { initialUpdaterRun } from '../animation';
import type { SharedValue, WorkletFunction } from '../commonTypes';
import { makeMutable, startMapper, stopMapper } from '../core';
import type { DependencyList } from './commonTypes';
import { shouldBeUseWeb } from '../PlatformChecker';

export type DerivedValue<Value> = Readonly<SharedValue<Value>>;

// @ts-expect-error This overload is required by our API.
export function useDerivedValue<Value>(
  processor: () => Value,
  dependencies?: DependencyList
): DerivedValue<Value>;

export function useDerivedValue<Value>(
  processor: WorkletFunction<[], Value>,
  dependencies?: DependencyList
): DerivedValue<Value> {
  const initRef = useRef<SharedValue<Value> | null>(null);
  let inputs = Object.values(processor.__closure ?? {});
  if (shouldBeUseWeb()) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Babel/SWC plugin
      inputs = dependencies;
    }
  }

  // build dependencies
  if (dependencies === undefined) {
    dependencies = [...inputs, processor.__workletHash];
  } else {
    dependencies.push(processor.__workletHash);
  }

  if (initRef.current === null) {
    initRef.current = makeMutable(initialUpdaterRun(processor));
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const sharedValue: SharedValue<Value> = initRef.current!;

  useEffect(() => {
    const fun = () => {
      'worklet';
      sharedValue.value = processor();
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
