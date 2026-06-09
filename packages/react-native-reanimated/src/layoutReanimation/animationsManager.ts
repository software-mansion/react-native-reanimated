'use strict';

import { runOnUISync } from 'react-native-worklets';

import { withStyleAnimation } from '../animation';
import { SHOULD_BE_USE_WEB } from '../common';
import type {
  LayoutAnimation,
  LayoutAnimationStartFunction,
  LayoutAnimationValues,
  SharedValue,
} from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { getStaticFeatureFlag } from '../featureFlags';
import { makeMutableUI } from '../mutables';

const TAG_OFFSET = 1e9;

const USE_ANIMATION_BACKEND = getStaticFeatureFlag('USE_ANIMATION_BACKEND');

function startObservingProgress(
  tag: number,
  sharedValue: SharedValue<Record<string, unknown>>,
  scheduleFlush: () => void
): void {
  'worklet';
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    global._notifyAboutProgress(tag, sharedValue.value);
    scheduleFlush();
  });
}

function stopObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  scheduleFlush: () => void,
  removeView = false
): void {
  'worklet';
  sharedValue.removeListener(tag + TAG_OFFSET);
  global._notifyAboutEnd(tag, removeView);
  scheduleFlush();
}

function createLayoutAnimationManager(): {
  start: LayoutAnimationStartFunction;
  stop: (tag: number) => void;
} {
  'worklet';
  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();

  // Flush layout-animation progress once per frame via the frame finalizer
  // (after all `requestAnimationFrame` callbacks), reusing the same
  // `_maybeFlushUIUpdatesQueue` path as animated-prop updates.
  // This finalizer runs after the mapper run (which re-queues itself a frame
  // ahead, so it sits earlier in the finalizer queue). When a mapper-driven
  // animation is also active, its flush runs first and already commits the
  // layout-animation updates too, so our `_maybeFlushUIUpdatesQueue` here is a
  // no-op; when only layout animations run, this is the single flush.
  // The backend drives its own flush from `runGrandCallback`, so this is non-backend only.
  let flushRequested = false;
  const scheduleFlush = () => {
    if (USE_ANIMATION_BACKEND || flushRequested) {
      return;
    }
    flushRequested = true;
    globalThis.requestAnimationFrameFinalizer(() => {
      flushRequested = false;
      global._maybeFlushUIUpdatesQueue();
    });
  };

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
        stopObservingProgress(tag, value, scheduleFlush);
        value._value = style.initialValues;
      }

      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          currentAnimationForTag.delete(tag);
          mutableValuesForTag.delete(tag);
          const shouldRemoveView = type === LayoutAnimationType.EXITING;
          stopObservingProgress(tag, value, scheduleFlush, shouldRemoveView);
        }
        if (style.callback) {
          style.callback(finished === undefined ? false : finished);
        }
      };

      startObservingProgress(tag, value, scheduleFlush);
      value.value = animation;
    },
    stop(tag: number) {
      const value = mutableValuesForTag.get(tag);
      if (!value) {
        return;
      }
      stopObservingProgress(tag, value, scheduleFlush);
    },
  };
}

// is-tree-shakable-suppress
if (!SHOULD_BE_USE_WEB) {
  runOnUISync(() => {
    'worklet';
    global.LayoutAnimationsManager = createLayoutAnimationManager();
  });
}

export type LayoutAnimationsManager = ReturnType<
  typeof createLayoutAnimationManager
>;
