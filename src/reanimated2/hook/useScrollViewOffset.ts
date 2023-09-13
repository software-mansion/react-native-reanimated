'use strict';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { SharedValue } from '../commonTypes';
import { findNodeHandle } from 'react-native';
import type { EventHandlerInternal } from './useEvent';
import { useEvent } from './useEvent';
import { useSharedValue } from './useSharedValue';
import type { AnimatedScrollView } from '../component/ScrollView';
import type { RNNativeScrollEvent, ReanimatedScrollEvent } from './commonTypes';

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export function useScrollViewOffset(
  aref: RefObject<AnimatedScrollView>,
  initialRef?: SharedValue<number>
): SharedValue<number> {
  const offsetRef = useRef(
    initialRef !== undefined ? initialRef : useSharedValue(0)
  );

  const event = useEvent<RNNativeScrollEvent>(
    (event: ReanimatedScrollEvent) => {
      'worklet';
      offsetRef.current.value =
        event.contentOffset.x === 0
          ? event.contentOffset.y
          : event.contentOffset.x;
    },
    scrollEventNames
  ) as unknown as EventHandlerInternal<ReanimatedScrollEvent>;

  useEffect(() => {
    const viewTag = findNodeHandle(aref.current);
    event.current?.registerForEvents(viewTag as number);
  }, [aref.current]);

  return offsetRef.current;
}
