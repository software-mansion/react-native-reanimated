'use strict';
import { isChromeDebugger, isJest, shouldBeUseWeb } from './PlatformChecker';

const IS_NATIVE = !shouldBeUseWeb();

export let setGestureState: (handlerTag: number, newState: number) => void;
if (IS_NATIVE) {
  setGestureState = (handlerTag, newState) => {
    'worklet';
    if (!_WORKLET) {
      console.warn(
        '[Reanimated] You can not use setGestureState in non-worklet function.'
      );
      return;
    }
    _setGestureState(handlerTag, newState);
  };
} else if (isJest()) {
  setGestureState = () => {
    console.warn('[Reanimated] setGestureState() cannot be used with Jest.');
  };
} else if (isChromeDebugger()) {
  setGestureState = () => {
    console.warn(
      '[Reanimated] setGestureState() cannot be used with Chrome Debugger.'
    );
  };
} else {
  setGestureState = () => {
    console.warn(
      '[Reanimated] setGestureState() is not supported on this configuration.'
    );
  };
}
