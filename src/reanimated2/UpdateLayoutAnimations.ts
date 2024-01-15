'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import {
  configureLayoutAnimationBatch,
  makeShareableCloneRecursive,
} from './core';
import type {
  LayoutAnimationFunction,
  LayoutAnimationType,
} from './layoutReanimation';
import type {
  LayoutAnimationBatchItem,
  ProgressAnimationCallback,
  SharedTransitionAnimationsFunction,
} from './layoutReanimation/animationBuilder/commonTypes';

function createUpdateManager() {
  const animations: LayoutAnimationBatchItem[] = [];
  const deferredAnimations: LayoutAnimationBatchItem[] = [];

  return {
    update(batchItem: LayoutAnimationBatchItem, defer?: boolean) {
      if (defer) {
        deferredAnimations.push(batchItem);
      } else {
        animations.push(batchItem);
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
        config: config ? makeShareableCloneRecursive(config) : undefined,
        sharedTransitionTag,
      },
      defer
    );
}
