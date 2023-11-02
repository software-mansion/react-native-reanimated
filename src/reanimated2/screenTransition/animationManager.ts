'use strict';

import type { ScreenTransitionConfig } from './commonTypes';
import { configureProps } from '../../ConfigHelper';
import { applyStyle } from './styleUpdater';
import {
  getSwipeDownSimulator,
  getSwipeLeftSimulator,
  getSwipeRightSimulator,
  getSwipeUpSimulator,
} from './gestureSimulator';

configureProps();

export function startScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const sharedEvent = screenTransitionConfig.sharedEvent;
  sharedEvent.addListener(screenTransitionConfig.stackTag, () => {
    'worklet';
    applyStyle(screenTransitionConfig, sharedEvent.value);
  });
}

export function finishScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  screenTransitionConfig.sharedEvent.removeListener(
    screenTransitionConfig.stackTag
  );
  const event = { ...screenTransitionConfig.sharedEvent.value };
  const goBackGesture = screenTransitionConfig.goBackGesture;

  let step = () => {
    // noop
  };
  if (goBackGesture === 'swipeRight') {
    step = getSwipeRightSimulator(event, screenTransitionConfig);
  } else if (goBackGesture === 'swipeLeft') {
    step = getSwipeLeftSimulator(event, screenTransitionConfig);
  } else if (goBackGesture === 'swipeUp') {
    step = getSwipeUpSimulator(event, screenTransitionConfig);
  } else if (goBackGesture === 'swipeDown') {
    step = getSwipeDownSimulator(event, screenTransitionConfig);
  }
  step();
}
