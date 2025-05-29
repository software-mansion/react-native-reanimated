'use strict';
import type { Component } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { ScrollView, ScrollViewProps } from 'react-native';

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

const NATIVE_SCROLL_EVENT_NAMES = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
] as const;

type ScrollableComponent = Component<
  Pick<ScrollViewProps, (typeof NATIVE_SCROLL_EVENT_NAMES)[number]>
> &
  Pick<ScrollView, 'getScrollableNode'>;

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
    const element = animatedRef?.current
      ? getWebScrollableElement(animatedRef.current)
      : null;

    if (element) {
      element.addEventListener('scroll', eventHandler);
    }
    return () => {
      if (element) {
        element.removeEventListener('scroll', eventHandler);
      }
    };
    // React here has a problem with `animatedRef.current` since a Ref .current
    // field shouldn't be used as a dependency. However, in this case we have
    // to do it this way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef?.current, eventHandler]);

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
    NATIVE_SCROLL_EVENT_NAMES
    // Read https://github.com/software-mansion/react-native-reanimated/pull/5056
    // for more information about this cast.
  ) as unknown as EventHandlerInternal<ReanimatedScrollEvent>;

  useEffect(() => {
    const elementTag = animatedRef?.getTag() ?? null;

    if (elementTag) {
      eventHandler.workletEventHandler.registerForEvents(elementTag);
    }
    return () => {
      if (elementTag) {
        eventHandler.workletEventHandler.unregisterFromEvents(elementTag);
      }
    };
    // React here has a problem with `animatedRef.current` since a Ref .current
    // field shouldn't be used as a dependency. However, in this case we have
    // to do it this way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef?.current, eventHandler]);

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
