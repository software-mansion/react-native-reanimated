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
import { isWeb } from '../PlatformChecker';

const IS_WEB = isWeb();

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

/**
 * Lets you synchronously get the current offset of a `ScrollView`.
 *
 * @param animatedRef - An [animated ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef) attached to an Animated.ScrollView component.
 * @returns A shared value which holds the current offset of the `ScrollView`.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollViewOffset
 */
export function useScrollViewOffset(
  animatedRef: AnimatedRef<AnimatedScrollView>,
  initialRef?: SharedValue<number>
): SharedValue<number> {
  const offsetRef = useRef(
    // eslint-disable-next-line react-hooks/rules-of-hooks
    initialRef !== undefined ? initialRef : useSharedValue(0)
  );

  const eventHandler = useEvent<RNNativeScrollEvent>(
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
    const component = animatedRef.current;
    const viewTag = IS_WEB ? component : findNodeHandle(component);

    eventHandler.workletEventHandler.registerForEvents(viewTag as number);

    return () => {
      eventHandler.workletEventHandler?.unregisterFromEvents();
    };
    // React here has a problem with `animatedRef.current` since a Ref .current
    // field shouldn't be used as a dependency. However, in this case we have
    // to do it this way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef.current, eventHandler]);

  return offsetRef.current;
}
