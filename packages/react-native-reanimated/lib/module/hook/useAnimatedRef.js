'use strict';

import { useRef } from 'react';
import { makeShareableCloneRecursive, shareableMappingCache } from 'react-native-worklets';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { isWeb } from "../PlatformChecker.js";
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { useSharedValue } from "./useSharedValue.js";
const IS_WEB = isWeb();
function getComponentOrScrollable(component) {
  if (component.getNativeScrollRef) {
    return component.getNativeScrollRef();
  }
  if (component.getScrollableNode) {
    return component.getScrollableNode();
  }
  return component;
}

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of a
 *   component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export function useAnimatedRef() {
  const tag = useSharedValue(null);
  const ref = useRef(null);
  if (!ref.current) {
    const fun = component => {
      // enters when ref is set by attaching to a component
      if (component) {
        const getTagOrShadowNodeWrapper = () => {
          return IS_WEB ? getComponentOrScrollable(component) : getShadowNodeWrapperFromRef(getComponentOrScrollable(component));
        };
        tag.value = getTagOrShadowNodeWrapper();

        // On Fabric we have to unwrap the tag from the shadow node wrapper
        // TODO: remove casting
        fun.getTag = () => findNodeHandle(getComponentOrScrollable(component));
        fun.current = component;
      }
      return tag.value;
    };
    fun.current = null;
    const animatedRefShareableHandle = makeShareableCloneRecursive({
      __init: () => {
        'worklet';

        return () => tag.value;
      }
    });
    shareableMappingCache.set(fun, animatedRefShareableHandle);
    ref.current = fun;
  }
  return ref.current;
}
//# sourceMappingURL=useAnimatedRef.js.map