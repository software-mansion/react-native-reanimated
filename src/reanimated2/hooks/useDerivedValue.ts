import { useEffect, useRef } from 'react';
import { initialUpdaterRun } from '../animations';
import { makeMutable, startMapper, stopMapper } from '../core';

export function useDerivedValue(processor, dependencies) {
  const initRef = useRef(null);
  const inputs = Object.values(processor._closure);

  // build dependencies
  if (dependencies === undefined) {
    dependencies = [...inputs, processor.__workletHash];
  } else {
    dependencies.push(processor.__workletHash);
  }

  if (initRef.current === null) {
    initRef.current = makeMutable(initialUpdaterRun(processor));
  }

  const sharedValue = initRef.current;

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
