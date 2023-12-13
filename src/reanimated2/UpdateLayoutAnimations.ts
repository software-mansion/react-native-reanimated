'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import { configureLayoutAnimationBatch } from './core';
import type {
  LayoutAnimationFunction,
  LayoutAnimationType,
} from './layoutReanimation';
import type {
  SharedTransitionAnimationsFunction,
  ProgressAnimationCallback,
} from './layoutReanimation/animationBuilder/commonTypes';

function createUpdateManager() {
  const animations: {
    viewTag: number;
    type: LayoutAnimationType;
    config?:
      | Keyframe
      | LayoutAnimationFunction
      | SharedTransitionAnimationsFunction
      | ProgressAnimationCallback;
    sharedTransitionTag?: string;
  }[] = [];

  const deferredAnimations: {
    viewTag: number;
    type: LayoutAnimationType;
    config?:
      | Keyframe
      | LayoutAnimationFunction
      | SharedTransitionAnimationsFunction
      | ProgressAnimationCallback;
    sharedTransitionTag?: string;
  }[] = [];

  return {
    update(
      config: {
        viewTag: number;
        type: LayoutAnimationType;
        config?:
          | Keyframe
          | LayoutAnimationFunction
          | SharedTransitionAnimationsFunction
          | ProgressAnimationCallback;
        sharedTransitionTag?: string;
      },
      defer?: boolean
    ) {
      if (defer) {
        deferredAnimations.push(config);
      } else {
        animations.push(config);
      }
      if (animations.length + deferredAnimations.length === 1) {
        setImmediate(this.flush);
      }
    },
    flush() {
      configureLayoutAnimationBatch(animations.concat(deferredAnimations));
      animations.length = 0;
      deferredAnimations.length = 0;
    },
  };
}

export let updateLayoutAnimations: (
  viewTag: number,
  type: LayoutAnimationType,
  config?:
    | Keyframe
    | LayoutAnimationFunction
    | SharedTransitionAnimationsFunction
    | ProgressAnimationCallback,
  sharedTransitionTag?: string,
  defer?: boolean
) => void;

if (shouldBeUseWeb()) {
  updateLayoutAnimations = () => {
    // no-op
  };
} else {
  const updateLayoutAnimationsManager = createUpdateManager();
  updateLayoutAnimations = (
    viewTag,
    type,
    config,
    sharedTransitionTag,
    defer
  ) =>
    updateLayoutAnimationsManager.update(
      {
        viewTag,
        type,
        config,
        sharedTransitionTag,
      },
      defer
    );
}
