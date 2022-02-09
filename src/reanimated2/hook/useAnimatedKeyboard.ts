import { useEffect, useRef } from 'react';
import NativeReanimated from '../NativeReanimated';
import { makeMutable } from '../core';
import { SharedValue } from '../commonTypes';

export interface AnimatedKeyboardInfo {
  isShown: SharedValue<boolean>;
  isAnimating: SharedValue<boolean>;
  height: SharedValue<number>;
}

export function useAnimatedKeyboard(): AnimatedKeyboardInfo {
  const ref = useRef<AnimatedKeyboardInfo>(null);
  if (ref.current === null) {
    const keyboardEventData: AnimatedKeyboardInfo = {
      isShown: makeMutable(false),
      isAnimating: makeMutable(false),
      height: makeMutable(0),
    };
    NativeReanimated.subscribeForKeyboardEvents(keyboardEventData);
    ref.current = keyboardEventData;
  }
  useEffect(() => {
    return () => {
      NativeReanimated.unsubscribeFromKeyboardEvents();
    };
  }, []);
  return ref.current;
}
