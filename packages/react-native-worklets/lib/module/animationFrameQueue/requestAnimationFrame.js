'use strict';

import { callMicrotasks } from "../threads.js";
export function setupRequestAnimationFrame() {
  'worklet';

  // Jest mocks requestAnimationFrame API and it does not like if that mock gets overridden
  // so we avoid doing requestAnimationFrame batching in Jest environment.
  const nativeRequestAnimationFrame = global.requestAnimationFrame;
  let animationFrameCallbacks = [];
  let flushRequested = false;
  global.__flushAnimationFrame = frameTimestamp => {
    const currentCallbacks = animationFrameCallbacks;
    animationFrameCallbacks = [];
    currentCallbacks.forEach(f => f(frameTimestamp));
    callMicrotasks();
  };
  global.requestAnimationFrame = callback => {
    animationFrameCallbacks.push(callback);
    if (!flushRequested) {
      flushRequested = true;
      nativeRequestAnimationFrame(timestamp => {
        flushRequested = false;
        global.__frameTimestamp = timestamp;
        global.__flushAnimationFrame(timestamp);
        global.__frameTimestamp = undefined;
      });
    }
    // Reanimated currently does not support cancelling callbacks requested with
    // requestAnimationFrame. We return -1 as identifier which isn't in line
    // with the spec but it should give users better clue in case they actually
    // attempt to store the value returned from rAF and use it for cancelling.
    return -1;
  };
}
//# sourceMappingURL=requestAnimationFrame.js.map