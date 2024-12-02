'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimations,
  unregisterCSSAnimations,
  updateCSSAnimations,
} from '../native';
import {
  getAnimationSettingsUpdates,
  normalizeCSSAnimationProperties,
} from '../normalization';
import type {
  CSSAnimationProperties,
  NormalizedSingleCSSAnimationConfig,
  NormalizedSingleCSSAnimationSettings,
} from '../types';

type AttachedAnimation = {
  animationProperties: NormalizedSingleCSSAnimationConfig;
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
    animationConfigs: NormalizedSingleCSSAnimationConfig[],
    serializedAnimationsKeyframes: string[]
  ) {
    if (animationConfigs.length === 0) {
      this.detach();
      return;
    }

    this.attachedAnimations = animationConfigs.map(
      (animationProperties, i) => ({
        animationProperties,
        serializedKeyframes: serializedAnimationsKeyframes[i],
      })
    );
    registerCSSAnimations(this.shadowNodeWrapper, animationConfigs);
  }

  update(animationProperties: CSSAnimationProperties | null): void {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const { animationName: keyframes } = animationProperties;
    const serializedKeyframes = (
      Array.isArray(keyframes) ? keyframes : [keyframes]
    ).map((singleKeyframes) => JSON.stringify(singleKeyframes));
    const animationConfigs =
      normalizeCSSAnimationProperties(animationProperties);

    // Attach new animations if there are no attached animations or if
    // the array of animations is different (e.g. length or order)
    if (
      this.attachedAnimations.length !== animationConfigs.length ||
      serializedKeyframes.some(
        (sk, i) => this.attachedAnimations[i].serializedKeyframes !== sk
      )
    ) {
      // We don't need to detach the old animations because CPP will
      // override them with new ones
      this.attachAnimations(animationConfigs, serializedKeyframes);
      return;
    }

    // Update existing animations if all animations are the same but some
    // of the animation settings are different
    const configUpdates: {
      index: number;
      settings: Partial<NormalizedSingleCSSAnimationSettings>;
    }[] = [];
    for (let i = 0; i < animationConfigs.length; i++) {
      const updates = getAnimationSettingsUpdates(
        this.attachedAnimations[i].animationProperties,
        animationConfigs[i]
      );
      if (Object.keys(updates).length > 0) {
        this.attachedAnimations[i].animationProperties = animationConfigs[i];
        configUpdates.push({ index: i, settings: updates });
      }
    }
    if (configUpdates.length > 0) {
      updateCSSAnimations(this.viewTag, configUpdates);
    }
  }
}
