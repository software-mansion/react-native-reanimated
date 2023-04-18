import { useEffect } from 'react';
import { registerEventHandler, runOnUI, unregisterEventHandler } from '../core';
import {
  AnimatedKeyboardInfo,
  AnimatedKeyboardOptions,
  KeyboardState,
} from '../commonTypes';
import { useSharedValue } from './useSharedValue';

type KeyboardEvent = {
  state: number;
  height: number;
};

type KeyboardListener = (ev: KeyboardEvent) => void;

const KEYBOARD_LISTENERS = {
  __init() {
    'worklet';
    return new Set<KeyboardListener>();
  },
};
let keyboardUpdatesRequested = false;

function keyboardEventHandler(ev: KeyboardEvent) {
  'worklet';
  console.log('Trollo', KEYBOARD_LISTENERS.size);
  for (const listener of KEYBOARD_LISTENERS) {
    listener(ev);
  }
}

function addListener(listener: KeyboardListener) {
  if (!keyboardUpdatesRequested) {
    keyboardUpdatesRequested = true;
    registerEventHandler('REAKeyboard', keyboardEventHandler);
    runOnUI(() => {
      'worklet';
      KEYBOARD_LISTENERS.add(listener);
      console.log('ADD listeners', KEYBOARD_LISTENERS.size);
    })();
  }
}

function removeListener(listener: KeyboardListener) {
  console.log('REMOVE!!!');
  runOnUI(() => {
    'worklet';
    KEYBOARD_LISTENERS.delete(listener);
    console.log('DELETE listeners', KEYBOARD_LISTENERS.size);
  })();
}

export function useAnimatedKeyboard(
  options: AnimatedKeyboardOptions = { isStatusBarTranslucentAndroid: false }
): AnimatedKeyboardInfo {
  const state = useSharedValue<KeyboardState>(KeyboardState.UNKNOWN);
  const height = useSharedValue(0);

  useEffect(() => {
    const listener = (ev: KeyboardEvent) => {
      'worklet';
      console.log('HERE I AM');
      state.value = ev.state;
      height.value = ev.height;
    };
    addListener(listener);

    return () => {
      removeListener(listener);
    };
  }, []);
  return { state, height };
}
