'use strict';

import { useCallback, useEffect, useRef } from 'react';
import { isWeb } from "../PlatformChecker.js";
import { useEvent } from "./useEvent.js";
import { useSharedValue } from "./useSharedValue.js";
const IS_WEB = isWeb();

/**
 * Lets you synchronously get the current offset of a `ScrollView`.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef)
 *   attached to an Animated.ScrollView component.
 * @returns A shared value which holds the current offset of the `ScrollView`.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollViewOffset
 */
export const useScrollViewOffset = IS_WEB ? useScrollViewOffsetWeb : useScrollViewOffsetNative;
function useScrollViewOffsetWeb(animatedRef, providedOffset) {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;
  const eventHandler = useCallback(() => {
    'worklet';

    if (animatedRef) {
      const element = getWebScrollableElement(animatedRef.current);
      // scrollLeft is the X axis scrolled offset, works properly also with RTL layout
      offset.value = element.scrollLeft === 0 ? element.scrollTop : element.scrollLeft;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedRef, animatedRef?.current]);
  useEffect(() => {
    const element = animatedRef?.current ? getWebScrollableElement(animatedRef.current) : null;
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
function useScrollViewOffsetNative(animatedRef, providedOffset) {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;
  const eventHandler = useEvent(event => {
    'worklet';

    offset.value = event.contentOffset.x === 0 ? event.contentOffset.y : event.contentOffset.x;
  }, scrollNativeEventNames
  // Read https://github.com/software-mansion/react-native-reanimated/pull/5056
  // for more information about this cast.
  );
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
function getWebScrollableElement(scrollComponent) {
  return scrollComponent?.getScrollableNode() ?? scrollComponent;
}
const scrollNativeEventNames = ['onScroll', 'onScrollBeginDrag', 'onScrollEndDrag', 'onMomentumScrollBegin', 'onMomentumScrollEnd'];
//# sourceMappingURL=useScrollViewOffset.js.map