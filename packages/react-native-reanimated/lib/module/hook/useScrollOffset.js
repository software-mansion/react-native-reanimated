'use strict';

import { useCallback, useEffect, useRef } from 'react';
import { IS_WEB, logger } from '../common';
import { useEvent } from './useEvent';
import { useSharedValue } from './useSharedValue';
const NOT_INITIALIZED_WARNING = 'animatedRef is not initialized in useScrollOffset. Make sure to pass the animated ref to the scrollable component to get scroll offset updates.';
const NATIVE_SCROLL_EVENT_NAMES = ['onScroll', 'onScrollBeginDrag', 'onScrollEndDrag', 'onMomentumScrollBegin', 'onMomentumScrollEnd'];

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
export const useScrollOffset = IS_WEB ? useScrollOffsetWeb : useScrollOffsetNative;
function useScrollOffsetWeb(animatedRef, providedOffset) {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;
  const eventHandler = useCallback(() => {
    'worklet';

    if (animatedRef?.current) {
      const element = getWebScrollableElement(animatedRef.current);
      // scrollLeft is the X axis scrolled offset, works properly also with RTL layout
      offset.value = element.scrollLeft === 0 ? element.scrollTop : element.scrollLeft;
    }
  }, [animatedRef, offset]);
  useEffect(() => {
    if (!animatedRef) {
      return;
    }
    return animatedRef.observe(tag => {
      if (!animatedRef.current || !tag) {
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
function useScrollOffsetNative(animatedRef, providedOffset) {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;
  const eventHandler = useEvent(event => {
    'worklet';

    offset.value = event.contentOffset.x === 0 ? event.contentOffset.y : event.contentOffset.x;
  }, NATIVE_SCROLL_EVENT_NAMES
  // Read https://github.com/software-mansion/react-native-reanimated/pull/5056
  // for more information about this cast.
  );
  useEffect(() => {
    if (!animatedRef) {
      return;
    }
    return animatedRef.observe(tag => {
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
function getWebScrollableElement(scrollComponent) {
  return scrollComponent?.getScrollableNode?.() ?? scrollComponent;
}
//# sourceMappingURL=useScrollOffset.js.map