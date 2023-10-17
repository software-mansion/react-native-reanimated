'use strict';
import { isChromeDebugger, isJest, shouldBeUseWeb } from '../PlatformChecker';

const IS_NATIVE = !shouldBeUseWeb();

export let setGestureState: (handlerTag: number, newState: number) => void;

function setGestureStateNative(handlerTag: number, newState: number) {
  'worklet';
  if (!_WORKLET) {
    console.warn(
      '[Reanimated] You can not use setGestureState in non-worklet function.'
    );
    return;
  }
  _setGestureState(handlerTag, newState);
}

function setGestureStateJest() {
  console.warn('[Reanimated] setGestureState() cannot be used with Jest.');
}

function setGestureStateChromeDebugger() {
  console.warn(
    '[Reanimated] setGestureState() cannot be used with Chrome Debugger.'
  );
}

function setGestureStateDefault() {
  console.warn(
    '[Reanimated] setGestureState() is not supported on this configuration.'
  );
}

if (IS_NATIVE) {
  setGestureState = setGestureStateNative;
} else if (isJest()) {
  setGestureState = setGestureStateJest;
} else if (isChromeDebugger()) {
  setGestureState = setGestureStateChromeDebugger;
} else {
  setGestureState = setGestureStateDefault;
}
