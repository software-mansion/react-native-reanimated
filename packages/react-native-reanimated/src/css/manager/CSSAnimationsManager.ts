'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimation,
  unregisterCSSAnimation,
  updateCSSAnimation,
} from '../native';
import {
  getAnimationSettingsUpdates,
  normalizeCSSAnimationConfig,
} from '../normalization';
import type {
  CSSAnimationConfig,
  NormalizedSingleCSSAnimationConfig,
} from '../types';

type AttachedAnimation = {
  animationId: number;
  animationConfig: NormalizedSingleCSSAnimationConfig;
};

export default class CSSAnimationsManager {
  private attachedAnimations: Record<string, AttachedAnimation[]> = {};

  static _nextId = 0;

  private attachAnimation(
    normalizedConfig: NormalizedSingleCSSAnimationConfig,
    wrapper: ShadowNodeWrapper,
    serializedKeyframes: string
  ) {
    const animationId = CSSAnimationsManager._nextId++;
    registerCSSAnimation(wrapper, animationId, normalizedConfig);

    if (!this.attachedAnimations[serializedKeyframes]) {
      this.attachedAnimations[serializedKeyframes] = [];
    }

    this.attachedAnimations[serializedKeyframes].push({
      animationId,
      animationConfig: normalizedConfig,
    });
  }

  private maybeUpdateAnimation(
    animationToUpdate: AttachedAnimation,
    normalizedConfig: NormalizedSingleCSSAnimationConfig
  ) {
    const settingsUpdates = getAnimationSettingsUpdates(
      animationToUpdate.animationConfig,
      normalizedConfig
    );

    if (Object.keys(settingsUpdates).length > 0) {
      animationToUpdate.animationConfig = normalizedConfig;
      updateCSSAnimation(animationToUpdate.animationId, settingsUpdates);
    }
  }

  detach() {
    for (const serializedKeyframes in this.attachedAnimations) {
      for (const animation of this.attachedAnimations[serializedKeyframes]) {
        unregisterCSSAnimation(animation.animationId);
      }
    }
    this.attachedAnimations = {};
  }

  update(
    wrapper: ShadowNodeWrapper,
    animationConfig: CSSAnimationConfig | null
  ): void {
    const visitedAnimationCounts: Record<string, number> = {};

    if (animationConfig) {
      const normalizedConfigs = normalizeCSSAnimationConfig(animationConfig);

      // Update existing animations or attach new ones
      for (const normalizedConfig of normalizedConfigs) {
        const serializedKeyframes = JSON.stringify(
          normalizedConfig.keyframesStyle
        );

        // The same animation can be used multiple times with different animation
        // settings. In such a case, we would update animations with the same
        // keyframes in order, based on order in the new animation config
        const existingAnimations = this.attachedAnimations[serializedKeyframes];
        const animationIndex = visitedAnimationCounts[serializedKeyframes] ?? 0;
        const animationToUpdate = existingAnimations?.[animationIndex];

        if (animationToUpdate) {
          // If the animation already exists, update its settings if they have changed
          this.maybeUpdateAnimation(animationToUpdate, normalizedConfig);
        } else {
          // Otherwise, attach a new animation
          this.attachAnimation(normalizedConfig, wrapper, serializedKeyframes);
        }
        visitedAnimationCounts[serializedKeyframes] = animationIndex + 1;
      }
    }

    // Detach removed animations
    for (const serializedKeyframes in this.attachedAnimations) {
      const existingAnimations = this.attachedAnimations[serializedKeyframes];
      const visitedAnimationsCount =
        visitedAnimationCounts[serializedKeyframes] ?? 0;

      for (let i = visitedAnimationsCount; i < existingAnimations.length; i++) {
        unregisterCSSAnimation(existingAnimations[i].animationId);
      }
      this.attachedAnimations[serializedKeyframes].splice(
        visitedAnimationsCount
      );
    }
  }
}
