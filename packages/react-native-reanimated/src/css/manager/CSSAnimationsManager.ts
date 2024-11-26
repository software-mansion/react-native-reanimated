'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimations,
  unregisterCSSAnimations,
  updateCSSAnimations,
} from '../native';
import {
  getAnimationSettingsUpdates,
  normalizeCSSAnimationConfig,
} from '../normalization';
import type {
  CSSAnimationConfig,
  NormalizedSingleCSSAnimationConfig,
  NormalizedSingleCSSAnimationSettings,
} from '../types';

type AttachedAnimation = {
  animationConfig: NormalizedSingleCSSAnimationConfig;
  serializedKeyframes: string;
};

export default class CSSAnimationsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private attachedAnimations: AttachedAnimation[] = [];

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  detach() {
    if (this.attachedAnimations.length > 0) {
      this.attachedAnimations = [];
      unregisterCSSAnimations(this.viewTag);
    }
  }

  private attachAnimations(
    normalizedConfigs: NormalizedSingleCSSAnimationConfig[],
    serializedAnimationsKeyframes: string[]
  ) {
    if (normalizedConfigs.length === 0) {
      this.detach();
      return;
    }

    this.attachedAnimations = normalizedConfigs.map((normalizedConfig, i) => ({
      animationConfig: normalizedConfig,
      serializedKeyframes: serializedAnimationsKeyframes[i],
    }));
    registerCSSAnimations(this.shadowNodeWrapper, normalizedConfigs);
  }

  update(animationConfig: CSSAnimationConfig | null): void {
    if (!animationConfig) {
      this.detach();
      return;
    }

    const { animationName: keyframes } = animationConfig;
    const serializedKeyframes = (
      Array.isArray(keyframes) ? keyframes : [keyframes]
    ).map((singleKeyframes) => JSON.stringify(singleKeyframes));
    const normalizedConfigs = normalizeCSSAnimationConfig(animationConfig);

    // Attach new animations if there are no attached animations or if
    // the array of animations is different (e.g. length or order)
    if (
      this.attachedAnimations.length !== normalizedConfigs.length ||
      serializedKeyframes.some(
        (sk, i) => this.attachedAnimations[i].serializedKeyframes !== sk
      )
    ) {
      // We don't need to detach the old animations because CPP will
      // override them with new ones
      this.attachAnimations(normalizedConfigs, serializedKeyframes);
      return;
    }

    // Update existing animations if all animations are the same but some
    // of the animation settings are different
    const configUpdates: {
      index: number;
      settings: Partial<NormalizedSingleCSSAnimationSettings>;
    }[] = [];
    for (let i = 0; i < normalizedConfigs.length; i++) {
      const updates = getAnimationSettingsUpdates(
        this.attachedAnimations[i].animationConfig,
        normalizedConfigs[i]
      );
      if (Object.keys(updates).length > 0) {
        this.attachedAnimations[i].animationConfig = normalizedConfigs[i];
        configUpdates.push({ index: i, settings: updates });
      }
    }
    if (configUpdates.length > 0) {
      updateCSSAnimations(this.viewTag, configUpdates);
    }
  }
}
