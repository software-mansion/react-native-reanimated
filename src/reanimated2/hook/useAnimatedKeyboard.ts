import { useEffect, useRef } from 'react';
import NativeReanimated from '../NativeReanimated';
import { makeMutable } from '../core';
import { AnimatedKeyboardInfo } from '../commonTypes';

export function useAnimatedKeyboard(): AnimatedKeyboardInfo {
  const ref = useRef<AnimatedKeyboardInfo | null>(null);
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
