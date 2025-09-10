'use strict';

import { useRef, useState } from 'react';
import { createSerializable, serializableMappingCache } from 'react-native-worklets';
import { SHOULD_BE_USE_WEB } from "../common/constants.js";
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeMutable } from "../mutables.js";
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
function getComponentOrScrollable(ref) {
  return ref.getNativeScrollRef?.() ?? ref.getScrollableNode?.() ?? ref;
}
function useAnimatedRefBase(getWrapper) {
  const observers = useRef(new Map()).current;
  const wrapperRef = useRef(null);
  const resultRef = useRef(null);
  if (!resultRef.current) {
    const fun = ref => {
      if (ref) {
        wrapperRef.current = getWrapper(ref);

        // We have to unwrap the tag from the shadow node wrapper.
        fun.getTag = () => findNodeHandle(getComponentOrScrollable(ref));
        fun.current = ref;
        if (observers.size) {
          const currentTag = fun?.getTag?.() ?? null;
          observers.forEach((cleanup, observer) => {
            // Perform the cleanup before calling the observer again.
            // This ensures that all events that were set up in the observer
            // are cleaned up before the observer sets up new events during
            // the next call.
            cleanup?.();
            observers.set(observer, observer(currentTag));
          });
        }
      }
      return wrapperRef.current;
    };
    fun.observe = observer => {
      // Call observer immediately to get the initial value
      const cleanup = observer(fun?.getTag?.() ?? null);
      observers.set(observer, cleanup);
      return () => {
        observers.get(observer)?.();
        observers.delete(observer);
      };
    };
    fun.current = null;
    resultRef.current = fun;
  }
  return resultRef.current;
}
function useAnimatedRefNative() {
  const [sharedWrapper] = useState(() => makeMutable(null));
  const resultRef = useAnimatedRefBase(ref => {
    const currentWrapper = getShadowNodeWrapperFromRef(getComponentOrScrollable(ref));
    sharedWrapper.value = currentWrapper;
    return currentWrapper;
  });
  if (!serializableMappingCache.get(resultRef)) {
    const animatedRefSerializableHandle = createSerializable({
      __init: () => {
        'worklet';

        return () => sharedWrapper.value;
      }
    });
    serializableMappingCache.set(resultRef, animatedRefSerializableHandle);
  }
  return resultRef;
}
function useAnimatedRefWeb() {
  return useAnimatedRefBase(ref => getComponentOrScrollable(ref));
}

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of
 *   the reference object.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export const useAnimatedRef = SHOULD_BE_USE_WEB ? useAnimatedRefWeb : useAnimatedRefNative;
//# sourceMappingURL=useAnimatedRef.js.map