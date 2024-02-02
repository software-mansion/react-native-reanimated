'use strict';
import { useEffect, useRef } from 'react';
import {
  makeMutable,
  subscribeForKeyboardEvents,
  unsubscribeFromKeyboardEvents,
} from '../core';
import type {
  AnimatedKeyboardInfo,
  AnimatedKeyboardOptions,
} from '../commonTypes';
import { KeyboardState } from '../commonTypes';

/**
 * Lets you synchronously get the position and state of the keyboard.
 *
 * @param options - An additional keyboard configuration options.
 * @returns An object with the current keyboard `height` and `state` as [shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedKeyboard
 */
export function useAnimatedKeyboard(
  options: AnimatedKeyboardOptions = { isStatusBarTranslucentAndroid: false }
): AnimatedKeyboardInfo {
  const ref = useRef<AnimatedKeyboardInfo | null>(null);
  const listenerId = useRef<number>(-1);
  const isSubscribed = useRef<boolean>(false);

  if (ref.current === null) {
    const keyboardEventData: AnimatedKeyboardInfo = {
      state: makeMutable<KeyboardState>(KeyboardState.UNKNOWN),
      height: makeMutable(0),
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
  }, []);
  return ref.current;
}
