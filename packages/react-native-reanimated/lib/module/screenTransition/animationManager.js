'use strict';

import { applyStyle } from './styleUpdater';
import { getSwipeSimulator } from './swipeSimulator';
export function startScreenTransition(screenTransitionConfig) {
  'worklet';

  const {
    stackTag,
    sharedEvent
  } = screenTransitionConfig;
  sharedEvent.addListener(stackTag, () => {
    applyStyle(screenTransitionConfig, sharedEvent.value);
  });
}
function getLockAxis(goBackGesture) {
  'worklet';

  if (['swipeRight', 'swipeLeft', 'horizontalSwipe'].includes(goBackGesture)) {
    return 'x';
  } else if (['swipeUp', 'swipeDown', 'verticalSwipe'].includes(goBackGesture)) {
    return 'y';
  }
  return undefined;
}
export function finishScreenTransition(screenTransitionConfig) {
  'worklet';

  const {
    stackTag,
    sharedEvent,
    goBackGesture
  } = screenTransitionConfig;
  sharedEvent.removeListener(stackTag);
  const lockAxis = getLockAxis(goBackGesture);
  const step = getSwipeSimulator(sharedEvent.value, screenTransitionConfig, lockAxis);
  step();
}
//# sourceMappingURL=animationManager.js.map