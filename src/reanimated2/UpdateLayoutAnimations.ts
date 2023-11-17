'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import { configureLayoutAnimationBatch } from './core';
import type {
  LayoutAnimationFunction,
  LayoutAnimationType,
} from './layoutReanimation';

function createUpdateManager() {
  const animations: {
    viewTag: number;
    type: LayoutAnimationType;
    config?: Keyframe | LayoutAnimationFunction;
  }[] = [];

  return {
    update(config: {
      viewTag: number;
      type: LayoutAnimationType;
      config?: Keyframe | LayoutAnimationFunction;
    }) {
      animations.push(config);
      if (animations.length === 1) {
        setImmediate(this.flush);
      }
    },
    flush() {
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
    updateLayoutAnimationsManager.update({ viewTag, type, config });
}
