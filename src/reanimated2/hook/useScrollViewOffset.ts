'use strict';
import { useEffect, useRef } from 'react';
import type { SharedValue } from '../commonTypes';
import { findNodeHandle } from 'react-native';
import type { EventHandlerInternal } from './useEvent';
import { useEvent } from './useEvent';
import { useSharedValue } from './useSharedValue';
import type { AnimatedScrollView } from '../component/ScrollView';
import type {
  AnimatedRef,
  RNNativeScrollEvent,
  ReanimatedScrollEvent,
} from './commonTypes';

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export function useScrollViewOffset(
  animatedRef: AnimatedRef<AnimatedScrollView>,
  initialRef?: SharedValue<number>
): SharedValue<number> {
  const offsetRef = useRef(
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
    // Read https://github.com/software-mansion/react-native-reanimated/pull/5056
    // for more information about this cast.
  ) as unknown as EventHandlerInternal<ReanimatedScrollEvent>;

  useEffect(() => {
    const viewTag = findNodeHandle(animatedRef.current);
    event.current?.registerForEvents(viewTag as number);

    return () => {
      event.current?.unregisterFromEvents();
    };
  }, [animatedRef.current]);

  return offsetRef.current;
}
