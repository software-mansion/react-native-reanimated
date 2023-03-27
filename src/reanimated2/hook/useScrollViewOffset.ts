import { RefObject, useEffect, useRef } from 'react';

import type Animated from 'react-native-reanimated';
import { ScrollEvent } from './useAnimatedScrollHandler';
import { SharedValue } from '../commonTypes';
import { findNodeHandle } from 'react-native';
import { useEvent } from './utils';
import { makeMutable } from '../core';
import { cancelAnimation } from '../animation';
import { scrollValueSetter } from '../scrollValueSetter';

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export function useScrollViewOffset(
  aref: RefObject<Animated.ScrollView>
): SharedValue<number> {
  const offsetRef = useRef(useScrollToSharedValue(0, false, aref));

  const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    // @ts-ignore Omit the setter to prevent unnecessary scroll call
    offsetRef.current._value =
      event.contentOffset.x === 0
        ? event.contentOffset.y
        : event.contentOffset.x;
  }, scrollEventNames);

  useEffect(() => {
    const viewTag = findNodeHandle(aref.current);
    event.current?.registerForEvents(viewTag as number);
  }, [aref.current]);

  return offsetRef.current;
}

function useScrollToSharedValue<T>(
  init: T,
  oneWayReadsOnly = false,
  aref: any
): SharedValue<T> {
  const scrollSetter = (sv: any, newValue: any) => {
    'worklet';
    scrollValueSetter(sv, newValue, aref);
  };
  const ref = useRef<SharedValue<T>>(
    makeMutable(init, oneWayReadsOnly, scrollSetter)
  );

  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      cancelAnimation(ref.current!);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return ref.current!;
}
