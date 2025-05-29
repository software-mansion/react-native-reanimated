'use strict';
import type { Component } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { logger } from 'react-native-worklets';

import { IS_WEB } from '../common';
import type { SharedValue } from '../commonTypes';
import type {
  AnimatedRef,
  ReanimatedScrollEvent,
  RNNativeScrollEvent,
} from './commonTypes';
import type { EventHandlerInternal } from './useEvent';
import { useEvent } from './useEvent';
import { useSharedValue } from './useSharedValue';

const NOT_INITIALIZED_WARNING =
  'animatedRef is not initialized in useScrollViewOffset. Make sure to pass the animated ref to the scrollable component to get scroll offset updates.';

interface ScrollableComponent extends Component {
  getScrollableNode(): Component;
}

/**
 * Lets you synchronously get the current offset of a scrollable component.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef)
 *   attached to a scrollable component.
 * @returns A shared value which holds the current scroll offset of the
 *   scrollable component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollOffset
 */
export const useScrollOffset = IS_WEB
  ? useScrollOffsetWeb
  : useScrollOffsetNative;

function useScrollOffsetWeb<C extends ScrollableComponent>(
  animatedRef: AnimatedRef<C> | null,
  providedOffset?: SharedValue<number>
): SharedValue<number> {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;

  const eventHandler = useCallback(() => {
    'worklet';
    if (animatedRef) {
      const element = getWebScrollableElement(animatedRef.current);
      // scrollLeft is the X axis scrolled offset, works properly also with RTL layout
      offset.value =
        element.scrollLeft === 0 ? element.scrollTop : element.scrollLeft;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef?.current]);

  useEffect(() => {
    if (!animatedRef) {
      return;
    }

    return animatedRef.observe((tag) => {
      if (!tag) {
        logger.warn(NOT_INITIALIZED_WARNING);
        return;
      }

      const element = getWebScrollableElement(animatedRef.current);
      element.addEventListener('scroll', eventHandler);

      return () => {
        element.removeEventListener('scroll', eventHandler);
      };
    });
  }, [animatedRef, eventHandler]);

  return offset;
}

function useScrollOffsetNative<C extends ScrollableComponent>(
  animatedRef: AnimatedRef<C> | null,
  providedOffset?: SharedValue<number>
): SharedValue<number> {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;

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
    if (!animatedRef) {
      return;
    }

    return animatedRef.observe((tag) => {
      if (!tag) {
        logger.warn(NOT_INITIALIZED_WARNING);
        return;
      }

      eventHandler.workletEventHandler.registerForEvents(tag);
      return () => {
        eventHandler.workletEventHandler.unregisterFromEvents(tag);
      };
    });
  }, [animatedRef, eventHandler]);

  return offset;
}

function getWebScrollableElement(
  scrollComponent: ScrollableComponent | null
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
