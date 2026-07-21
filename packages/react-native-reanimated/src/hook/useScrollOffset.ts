'use strict';
import { useCallback, useEffect, useRef } from 'react';

import type { Maybe } from '../common';
import { logger } from '../common';
import type {
  InstanceOrElement,
  InternalHostInstance,
  SharedValue,
} from '../commonTypes';
import type { AnimatedRef } from './commonTypes';
import { useSharedValue } from './useSharedValue';

const NOT_INITIALIZED_WARNING =
  'animatedRef is not initialized in useScrollOffset. Make sure to pass the animated ref to the scrollable component to get scroll offset updates.';

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
export function useScrollOffset<TRef extends InstanceOrElement>(
  animatedRef: Maybe<AnimatedRef<TRef>>,
  providedOffset?: SharedValue<number>
): SharedValue<number> {
  const internalOffset = useSharedValue(0);
  const offset = useRef(providedOffset ?? internalOffset).current;

  const eventHandler = useCallback(() => {
    'worklet';
    if (animatedRef?.current) {
      const element = getWebScrollableElement(animatedRef.current);
      // scrollLeft is the X axis scrolled offset, works properly also with RTL layout
      offset.value =
        element.scrollLeft === 0 ? element.scrollTop : element.scrollLeft;
    }
  }, [animatedRef, offset]);

  useEffect(() => {
    if (!animatedRef) {
      return;
    }

    return animatedRef.observe((tag) => {
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

function getWebScrollableElement(
  scrollComponent: InternalHostInstance
): HTMLElement {
  return scrollComponent?.getScrollableNode?.() ?? scrollComponent;
}
