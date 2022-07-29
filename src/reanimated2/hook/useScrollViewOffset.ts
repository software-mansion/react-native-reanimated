import { RefObject, useEffect, useRef } from 'react';

import { findNodeHandle } from 'react-native';
import type Animated from 'react-native-reanimated';
import { useEvent, useSharedValue } from '.';
import { SharedValue } from '../commonTypes';
import { ScrollEvent } from './useAnimatedScrollHandler';

const subscribeForEvents = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export function useScrollViewOffset(
  aref: RefObject<Animated.ScrollView>
): SharedValue<number> {
  const offsetRef = useRef(useSharedValue(0));

  const eventX = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    offsetRef.current.value = event.contentOffset.x;
  }, subscribeForEvents);

  const eventY = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    offsetRef.current.value = event.contentOffset.y;
  }, subscribeForEvents);

  useEffect(() => {
    const viewTag = findNodeHandle(aref.current);
    console.log(aref.current);
    const horizontal = _IS_FABRIC
      ? aref.current?.currentProps.horizontal
      : aref.current?._internalFiberInstanceHandleDEV._debugOwner.memoizedProps
          .horizontal;
    const event = horizontal ? eventX : eventY;

    event.current?.registerForEvents(viewTag as number);
  }, [aref.current]);

  return offsetRef.current;
}
