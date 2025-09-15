'use strict';

import { useEffect, useRef } from 'react';
import { KeyboardState } from '../commonTypes';
import { makeMutable, subscribeForKeyboardEvents, unsubscribeFromKeyboardEvents } from '../core';

/**
 * Lets you synchronously get the position and state of the keyboard.
 *
 * @param options - An additional keyboard configuration options.
 * @returns An object with the current keyboard `height` and `state` as [shared
 *   values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedKeyboard
 */
export function useAnimatedKeyboard(options = {
  isStatusBarTranslucentAndroid: undefined,
  isNavigationBarTranslucentAndroid: undefined
}) {
  const ref = useRef(null);
  const listenerId = useRef(-1);
  const isSubscribed = useRef(false);
  if (ref.current === null) {
    const keyboardEventData = {
      state: makeMutable(KeyboardState.UNKNOWN),
      height: makeMutable(0)
    };
    listenerId.current = subscribeForKeyboardEvents((state, height) => {
      'worklet';

      keyboardEventData.state.value = state;
      keyboardEventData.height.value = height;
    }, options);
    ref.current = keyboardEventData;
    isSubscribed.current = true;
  }
  useEffect(() => {
    if (isSubscribed.current === false && ref.current !== null) {
      const keyboardEventData = ref.current;
      // subscribe again after Fast Refresh
      listenerId.current = subscribeForKeyboardEvents((state, height) => {
        'worklet';

        keyboardEventData.state.value = state;
        keyboardEventData.height.value = height;
      }, options);
      isSubscribed.current = true;
    }
    return () => {
      unsubscribeFromKeyboardEvents(listenerId.current);
      isSubscribed.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref.current;
}
//# sourceMappingURL=useAnimatedKeyboard.js.map