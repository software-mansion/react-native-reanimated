'use strict';
import { executeOnUIRuntimeSync } from 'react-native-worklets';

import { withStyleAnimation } from '../animation';
import { SHOULD_BE_USE_WEB } from '../common';
import type {
  LayoutAnimation,
  LayoutAnimationStartFunction,
  LayoutAnimationValues,
  SharedValue,
} from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { legacy_makeMutableUI as makeMutableUI } from '../mutables';

const TAG_OFFSET = 1e9;

function startObservingProgress(
  tag: number,
  sharedValue: SharedValue<Record<string, unknown>>
): void {
  'worklet';
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    global._notifyAboutProgress(tag, sharedValue.value);
  });
}

function stopObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  removeView = false
): void {
  'worklet';
  sharedValue.removeListener(tag + TAG_OFFSET);
  global._notifyAboutEnd(tag, removeView);
}

function createLayoutAnimationManager(): {
  start: LayoutAnimationStartFunction;
  stop: (tag: number) => void;
} {
  'worklet';
  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();

  return {
    start(
      tag: number,
      type: LayoutAnimationType,
      /**
       * CreateLayoutAnimationManager creates an animation manager for Layout
       * animations.
       */
      yogaValues: Partial<LayoutAnimationValues>,
      config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation
    ) {
      const style = config(yogaValues);
      let currentAnimation = style.animations;

      // When layout animation is requested, but a previous one is still running, we merge
      // new layout animation targets into the ongoing animation
      const previousAnimation = currentAnimationForTag.get(tag);
      if (previousAnimation) {
        currentAnimation = { ...previousAnimation, ...style.animations };
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

      animation.callback = (finished?: boolean) => {
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
    stop(tag: number) {
      const value = mutableValuesForTag.get(tag);
      if (!value) {
        return;
      }
      stopObservingProgress(tag, value);
    },
  };
}

if (!SHOULD_BE_USE_WEB) {
  executeOnUIRuntimeSync(() => {
    'worklet';
    global.LayoutAnimationsManager = createLayoutAnimationManager();
  })();
}

export type LayoutAnimationsManager = ReturnType<
  typeof createLayoutAnimationManager
>;
