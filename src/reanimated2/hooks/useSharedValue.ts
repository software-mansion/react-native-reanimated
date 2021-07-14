import { useEffect, useRef } from 'react';
import { cancelAnimation } from '../animations';
import { makeMutable } from '../core';

export interface SharedValue<T> {
  value: T;
}

export function useSharedValue<T>(init: T): SharedValue<T> {
  const ref = useRef<SharedValue<T>>(null);

  if (ref.current === null) {
    ref.current = makeMutable(init);
  }

  useEffect(() => {
    return () => {
      cancelAnimation(ref.current);
    };
  }, []);

  return ref.current;
}
