'use strict';
import { useEffect, useRef, useCallback } from 'react';
import type { SharedValue } from '../commonTypes';
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

/**
 * Lets you synchronously get the current offset of a `ScrollView`.
 *
 * @param animatedRef - An [animated ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef) attached to an Animated.ScrollView component.
 * @returns A shared value which holds the current offset of the `ScrollView`.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollViewOffset
 */
export const useScrollViewOffset = IS_WEB
  ? useScrollViewOffsetWeb
  : useScrollViewOffsetNative;

function useScrollViewOffsetWeb(
  animatedRef: AnimatedRef<AnimatedScrollView>,
  providedOffset?: SharedValue<number>
): SharedValue<number> {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;
  const scrollRef = useRef<AnimatedScrollView | null>(null);

  const eventHandler = useCallback(() => {
    'worklet';
    const element = getWebScrollableElement(animatedRef.current);
    // scrollLeft is the X axis scrolled offset, works properly also with RTL layout
    offset.value =
      element.scrollLeft === 0 ? element.scrollTop : element.scrollLeft;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef.current]);

  useEffect(() => {
    // We need to make sure that listener for old animatedRef value is removed
    if (scrollRef.current !== null) {
      getWebScrollableElement(scrollRef.current).removeEventListener(
        'scroll',
        eventHandler
      );
    }
    scrollRef.current = animatedRef.current;

    const element = getWebScrollableElement(animatedRef.current);
    element.addEventListener('scroll', eventHandler);
    return () => {
      element.removeEventListener('scroll', eventHandler);
    };
    // React here has a problem with `animatedRef.current` since a Ref .current
    // field shouldn't be used as a dependency. However, in this case we have
    // to do it this way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef.current, eventHandler]);

  return offset;
}

function useScrollViewOffsetNative(
  animatedRef: AnimatedRef<AnimatedScrollView>,
  providedOffset?: SharedValue<number>
): SharedValue<number> {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;
  const scrollRef = useRef<AnimatedScrollView | null>(null);
  const scrollRefTag = useRef<number | null>(null);

  const eventHandler = useEvent<RNNativeScrollEvent>(
    (event: ReanimatedScrollEvent) => {
      'worklet';
      offset.value =
        event.contentOffset.x === 0
          ? event.contentOffset.y
          : event.contentOffset.x;
    },
    scrollNativeEventNames
    // Read https://github.com/software-mansion/react-native-reanimated/pull/5056
    // for more information about this cast.
  ) as unknown as EventHandlerInternal<ReanimatedScrollEvent>;

  useEffect(() => {
    // We need to make sure that listener for old animatedRef value is removed
    if (scrollRef.current !== null && scrollRefTag.current !== null) {
      eventHandler.workletEventHandler.unregisterFromEvents(
        scrollRefTag.current
      );
    }

    // Store the ref and viewTag for future cleanup
    scrollRef.current = animatedRef.current;
    scrollRefTag.current = animatedRef.getTag();

    if (scrollRefTag === null) {
      console.warn(
        '[Reanimated] ScrollViewOffset failed to resolve the view tag from animated ref. Did you forget to attach the ref to a component?'
      );
    } else {
      eventHandler.workletEventHandler.registerForEvents(scrollRefTag.current);
    }

    return () => {
      if (scrollRefTag.current !== null) {
        eventHandler.workletEventHandler.unregisterFromEvents(
          scrollRefTag.current
        );
      }
    };
    // React here has a problem with `animatedRef.current` since a Ref .current
    // field shouldn't be used as a dependency. However, in this case we have
    // to do it this way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef.current, eventHandler]);

  return offset;
}

function getWebScrollableElement(
  scrollComponent: AnimatedScrollView | null
): HTMLElement {
  return (
    (scrollComponent?.getScrollableNode() as unknown as HTMLElement) ??
    scrollComponent
  );
}

const scrollNativeEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];
