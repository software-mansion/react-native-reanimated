'use strict';

import { executeOnUIRuntimeSync } from 'react-native-worklets';
import { withStyleAnimation } from "../animation/index.js";
import { SHOULD_BE_USE_WEB } from "../common/index.js";
import { LayoutAnimationType } from "../commonTypes.js";
import { legacy_makeMutableUI as makeMutableUI } from "../mutables.js";
const TAG_OFFSET = 1e9;
function startObservingProgress(tag, sharedValue) {
  'worklet';

  sharedValue.addListener(tag + TAG_OFFSET, () => {
    global._notifyAboutProgress(tag, sharedValue.value);
  });
}
function stopObservingProgress(tag, sharedValue, removeView = false) {
  'worklet';

  sharedValue.removeListener(tag + TAG_OFFSET);
  global._notifyAboutEnd(tag, removeView);
}
function createLayoutAnimationManager() {
  'worklet';

  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();
  return {
    start(tag, type,
    /**
     * CreateLayoutAnimationManager creates an animation manager for Layout
     * animations.
     */
    yogaValues, config) {
      const style = config(yogaValues);
      let currentAnimation = style.animations;

      // When layout animation is requested, but a previous one is still running, we merge
      // new layout animation targets into the ongoing animation
      const previousAnimation = currentAnimationForTag.get(tag);
      if (previousAnimation) {
        currentAnimation = {
          ...previousAnimation,
          ...style.animations
        };
      }
      currentAnimationForTag.set(tag, currentAnimation);
      let value = mutableValuesForTag.get(tag);
      if (value === undefined) {
        value = makeMutableUI(style.initialValues);
        mutableValuesForTag.set(tag, value);
      } else {
        stopObservingProgress(tag, value);
        value._value = style.initialValues;
      }

      // @ts-ignore The line below started failing because I added types to the method – don't have time to fix it right now
      const animation = withStyleAnimation(currentAnimation);
      animation.callback = finished => {
        if (finished) {
          currentAnimationForTag.delete(tag);
          mutableValuesForTag.delete(tag);
          const shouldRemoveView = type === LayoutAnimationType.EXITING;
          stopObservingProgress(tag, value, shouldRemoveView);
        }
        if (style.callback) {
          style.callback(finished === undefined ? false : finished);
        }
      };
      startObservingProgress(tag, value);
      value.value = animation;
    },
    stop(tag) {
      const value = mutableValuesForTag.get(tag);
      if (!value) {
        return;
      }
      stopObservingProgress(tag, value);
    }
  };
}
if (!SHOULD_BE_USE_WEB) {
  executeOnUIRuntimeSync(() => {
    'worklet';

    global.LayoutAnimationsManager = createLayoutAnimationManager();
  })();
}
//# sourceMappingURL=animationsManager.js.map