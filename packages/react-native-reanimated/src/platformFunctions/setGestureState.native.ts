'use strict';

import { RuntimeKind } from 'react-native-worklets';

import { IS_JEST, logger } from '../common';

type SetGestureState = (handlerTag: number, newState: number) => void;

export let setGestureState: SetGestureState;

function setGestureStateNative(handlerTag: number, newState: number) {
  'worklet';
  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    logger.warn('You can not use setGestureState in non-worklet function.');
    return;
  }
  global._setGestureState(handlerTag, newState);
}

function setGestureStateJest() {
  logger.warn('setGestureState() cannot be used with Jest.');
}

if (IS_JEST) {
  setGestureState = setGestureStateJest;
} else {
  setGestureState = setGestureStateNative;
}
