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
import type { LayoutAnimationBatchItem } from './layoutReanimation/animationBuilder/commonTypes';

function createUpdateManager() {
  const animations: LayoutAnimationBatchItem[] = [];

  return {
    update(batchItem: LayoutAnimationBatchItem) {
      animations.push(batchItem);
      if (animations.length === 1) {
        setImmediate(this.flush);
      }
    },
    flush(this: void) {
      configureLayoutAnimationBatch(animations);
      animations.length = 0;
    },
  };
}

export let updateLayoutAnimations: (
  viewTag: number,
  type: LayoutAnimationType,
  config?: Keyframe | LayoutAnimationFunction
) => void;

if (shouldBeUseWeb()) {
  updateLayoutAnimations = () => {
    // no-op
  };
} else {
  const updateLayoutAnimationsManager = createUpdateManager();
  updateLayoutAnimations = (viewTag, type, config) =>
    updateLayoutAnimationsManager.update({
      viewTag,
      type,
      config: config ? makeShareableCloneRecursive(config) : undefined,
    });
}
