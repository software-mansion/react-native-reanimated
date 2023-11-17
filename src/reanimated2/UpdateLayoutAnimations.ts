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

const updateLayoutAnimationsManager = createUpdateManager();

export function updateLayoutAnimations(
  viewTag: number,
  type: LayoutAnimationType,
  config?: Keyframe | LayoutAnimationFunction
) {
  updateLayoutAnimationsManager.update({ viewTag, type, config });
}
