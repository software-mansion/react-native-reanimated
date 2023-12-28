'use strict';

import type { ScreenTransitionConfig } from './commonTypes';
import { configureProps } from '../../ConfigHelper';
import { applyStyle } from './styleUpdater';
import { swipeSimulator } from './swipeSimulator';

configureProps();

export function startScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const sharedEvent = screenTransitionConfig.sharedEvent;
  sharedEvent.addListener(screenTransitionConfig.stackTag, () => {
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
  let lockAxis: 'x' | 'y' | undefined;
  if (['swipeRight', 'swipeLeft', 'horizontalSwipe'].includes(goBackGesture)) {
    lockAxis = 'x';
  } else if (
    ['swipeUp', 'swipeDown', 'verticalSwipe'].includes(goBackGesture)
  ) {
    lockAxis = 'y';
  }
  const step = swipeSimulator(event, screenTransitionConfig, lockAxis);
  step();
}
