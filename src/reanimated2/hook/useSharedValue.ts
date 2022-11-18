import { useEffect, useRef } from 'react';
import { cancelAnimation } from '../animation';
import { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';

let ONE_WAY_READS_DEFAULT = true; // false on 2.x

export function enableDefaultFastOneWaySharedValues() {
  ONE_WAY_READS_DEFAULT = true;
}

export function useSharedValue<T>(
  init: T,
  oneWayReadsOnly_ = undefined
): SharedValue<T> {
  const oneWayReadsOnly =
    oneWayReadsOnly_ === undefined ? ONE_WAY_READS_DEFAULT : oneWayReadsOnly_;
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
