import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import type Animated from '../../index'; // TODO: fixme?
import type { ScrollEvent } from './useAnimatedScrollHandler';
import type { SharedValue } from '../commonTypes';
import { findNodeHandle } from 'react-native';
import { useEvent } from './utils';
import { useSharedValue } from './useSharedValue';

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export function useScrollViewOffset(
  aref: RefObject<Animated.ScrollView>,
  initialRef?: SharedValue<number>
): SharedValue<number> {
  const offsetRef = useRef(
    initialRef !== undefined ? initialRef : useSharedValue(0)
  );

  const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    offsetRef.current.value =
      event.contentOffset.x === 0
        ? event.contentOffset.y
        : event.contentOffset.x;
  }, scrollEventNames);

  useEffect(() => {
    const viewTag = findNodeHandle(aref.current);
    // @ts-ignore TODO TYPESCRIPT This happens because of
    // how we had to type `useEvent` to get rid of .d.ts file.
    event.current?.registerForEvents(viewTag as number);
  }, [aref.current]);

  return offsetRef.current;
}
