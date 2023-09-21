'use strict';
import { useEffect, useRef } from 'react';
import { cancelAnimation } from '../animation';
import type { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';

export function useSharedValue<Value>(
  init: Value,
  oneWayReadsOnly = false
): SharedValue<Value> {
  const ref = useRef<SharedValue<Value>>(makeMutable(init, oneWayReadsOnly));

  if (ref.current === null) {
    ref.current = makeMutable(init, oneWayReadsOnly);
  }

  useEffect(() => {
    return () => {
      cancelAnimation(ref.current);
    };
  }, []);

  return ref.current;
}
