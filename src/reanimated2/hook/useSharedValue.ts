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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      cancelAnimation(ref.current!);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return ref.current!;
}
