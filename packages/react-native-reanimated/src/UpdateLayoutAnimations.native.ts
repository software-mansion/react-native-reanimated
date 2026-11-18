'use strict';
import { createSerializable } from 'react-native-worklets';

import type {
  LayoutAnimationBatchItem,
  LayoutAnimationFunction,
  LayoutAnimationType,
} from './commonTypes';
import { configureLayoutAnimationBatch } from './core';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';
import { initializeLayoutAnimationsManager } from './layoutReanimation/animationsManager';
import type {
  ProgressSharedTransitionAnimation,
  SharedTransitionContentFade,
} from './layoutReanimation/SharedTransition';

function createUpdateManager() {
  const animations: LayoutAnimationBatchItem[] = [];
  // When a stack is rerendered we reconfigure all the shared elements.
  // To do that we want them to appear in our batch in the correct order,
  // so we defer some of the updates to appear at the end of the batch.
  const deferredAnimations: LayoutAnimationBatchItem[] = [];

  return {
    update(batchItem: LayoutAnimationBatchItem, isUnmounting?: boolean) {
      initializeLayoutAnimationsManager();
      if (isUnmounting) {
        deferredAnimations.push(batchItem);
      } else {
        animations.push(batchItem);
      }
      if (animations.length + deferredAnimations.length === 1) {
        this.flush();
      }
    },
    flush(this: void) {
      const batch = animations.concat(deferredAnimations);
      animations.length = 0;
      deferredAnimations.length = 0;
      configureLayoutAnimationBatch(batch);
    },
  };
}

/**
 * Lets you update the current configuration of the layout animation or shared
 * element transition for a given component. Configurations are batched and
 * applied at the end of the current execution block, right before sending the
 * response back to native.
 *
 * @param viewTag - The tag of the component you'd like to configure.
 * @param type - The type of the animation you'd like to configure -
 *   {@link LayoutAnimationType}.
 * @param config - The animation configuration - {@link LayoutAnimationFunction}
 *   or {@link Keyframe}. Passing `undefined` will remove the animation.
 * @param isUnmounting - Determines whether the configuration should be included
 *   at the end of the batch, after all the non-deferred configurations (even
 *   those that were updated later). This is used to retain the correct ordering
 *   of shared elements. Defaults to `false`.
 * @param sharedTransitionTag - The shared tag that pairs the views.
 * @param sharedTransitionContentFade - The content fade settings of the run.
 * @param sharedTransitionCallback - The callback of the run.
 * @param sharedTransitionFollowsTarget - Whether the animation aims at the
 *   current geometry of the target in each frame.
 */
const updateLayoutAnimationsManager = createUpdateManager();

export const updateLayoutAnimations: (
  viewTag: number,
  type: LayoutAnimationType,
  config?:
    | ReanimatedKeyframe
    | LayoutAnimationFunction
    | ProgressSharedTransitionAnimation,
  isUnmounting?: boolean,
  sharedTransitionTag?: string,
  sharedTransitionContentFade?: SharedTransitionContentFade,
  sharedTransitionCallback?: (finished: boolean) => void,
  sharedTransitionFollowsTarget?: boolean
) => void = (
  viewTag,
  type,
  config,
  isUnmounting,
  sharedTransitionTag,
  sharedTransitionContentFade,
  sharedTransitionCallback,
  sharedTransitionFollowsTarget
) =>
  updateLayoutAnimationsManager.update(
    {
      viewTag,
      type,
      config: config ? createSerializable(config) : undefined,
      sharedTransitionTag,
      sharedTransitionCallback: sharedTransitionCallback
        ? createSerializable(sharedTransitionCallback)
        : undefined,
      sharedTransitionContentFade: sharedTransitionContentFade
        ? {
            fadeIn: createSerializable(sharedTransitionContentFade.fadeIn),
            fadeOutEnd: sharedTransitionContentFade.fadeOutEnd,
          }
        : undefined,
      sharedTransitionFollowsTarget,
    },
    isUnmounting
  );
