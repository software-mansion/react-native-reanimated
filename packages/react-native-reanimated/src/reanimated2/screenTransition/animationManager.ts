'use strict';

import type { LockAxis, ScreenTransitionConfig } from './commonTypes';
import { configureProps } from '../../ConfigHelper';
import { applyStyle } from './styleUpdater';
import { getSwipeSimulator } from './swipeSimulator';

configureProps();

export function startScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const { stackTag, sharedEvent } = screenTransitionConfig;
  sharedEvent.addListener(stackTag, () => {
    applyStyle(screenTransitionConfig, sharedEvent.value);
  });
}

function getLockAxis(goBackGesture: string): LockAxis {
  'worklet';
  if (['swipeRight', 'swipeLeft', 'horizontalSwipe'].includes(goBackGesture)) {
    return 'x';
  } else if (
    ['swipeUp', 'swipeDown', 'verticalSwipe'].includes(goBackGesture)
  ) {
    return 'y';
  }
  return undefined;
}

export function finishScreenTransition(
  screenTransitionConfig: ScreenTransitionConfig
) {
  'worklet';
  const { stackTag, sharedEvent, goBackGesture } = screenTransitionConfig;
  sharedEvent.removeListener(stackTag);
  const lockAxis = getLockAxis(goBackGesture);
  const step = getSwipeSimulator(
    sharedEvent.value,
    screenTransitionConfig,
    lockAxis
  );
  step();
}
