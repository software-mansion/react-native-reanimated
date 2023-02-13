import { RefObject, useEffect, useRef } from 'react';

import type Animated from 'react-native-reanimated';
import { cancelAnimation } from '../animation';
import { SharedValue } from '../commonTypes';
import { makeMutable } from '../core';

export function useSharedValue<T>(
  init: T,
  oneWayReadsOnly = false,
  animatedRef?: RefObject<Animated.ScrollView>
): SharedValue<T> {
  const ref = useRef<SharedValue<T>>(
    makeMutable(init, oneWayReadsOnly, animatedRef)
  );

  if (ref.current === null) {
    ref.current = makeMutable(init, oneWayReadsOnly, animatedRef);
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
