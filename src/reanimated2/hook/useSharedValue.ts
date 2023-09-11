import { useEffect, useRef } from 'react';
import { cancelAnimation } from '../animation';
import type { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';

export function useSharedValue<T>(
  init: T,
  oneWayReadsOnly = false
): SharedValue<T> {
  const ref = useRef<SharedValue<T>>(makeMutable(init, oneWayReadsOnly));

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
