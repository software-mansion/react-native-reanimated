import { RefObject, useEffect, useRef } from 'react';

import { findNodeHandle } from 'react-native';
import type Animated from 'react-native-reanimated';
import { useEvent, useSharedValue } from '.';
import { SharedValue } from '../commonTypes';
import { ScrollEvent } from './useAnimatedScrollHandler';

export function useScrollViewPosition(
  aref: RefObject<Animated.ScrollView>
): SharedValue<number> {
  const offsetRef = useRef(useSharedValue(0));

  const subscribeForEvents = [
    'onScroll',
    'onScrollBeginDrag',
    'onScrollEndDrag',
    'onMomentumScrollBegin',
    'onMomentumScrollEnd',
  ];

  const horizontal = false;
  const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    if (horizontal) {
      offsetRef.current.value = event.contentOffset.x;
    } else {
      offsetRef.current.value = event.contentOffset.y;
    }
  }, subscribeForEvents);

  useEffect(() => {
    const viewTag = findNodeHandle(aref.current);

    event.current?.registerForEvents(viewTag as number, 'onScroll');
  }, [aref.current]);

  return offsetRef.current;
}
