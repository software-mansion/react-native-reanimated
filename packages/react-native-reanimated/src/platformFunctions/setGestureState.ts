'use strict';

import { logger } from 'react-native-worklets';

import { isJest, shouldBeUseWeb } from '../PlatformChecker';

type SetGestureState = (handlerTag: number, newState: number) => void;

export let setGestureState: SetGestureState;

function setGestureStateNative(handlerTag: number, newState: number) {
  'worklet';
  if (!globalThis._WORKLET) {
    logger.warn('You can not use setGestureState in non-worklet function.');
    return;
  }
  global._setGestureState(handlerTag, newState);
}

function setGestureStateJest() {
  logger.warn('setGestureState() cannot be used with Jest.');
}

function setGestureStateDefault() {
  logger.warn('setGestureState() is not supported on this configuration.');
}

if (!shouldBeUseWeb()) {
  setGestureState = setGestureStateNative;
} else if (isJest()) {
  setGestureState = setGestureStateJest;
} else {
  setGestureState = setGestureStateDefault;
}
