'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { CSSKeyframesRuleImpl } from '../models';
import type {
  CSSAnimationUpdates,
  NormalizedSingleCSSAnimationSettings,
} from '../platform/native';
import {
  applyCSSAnimations,
  createSingleCSSAnimationProperties,
  getAnimationSettingsUpdates,
  normalizeSingleCSSAnimationSettings,
  unregisterCSSAnimations,
} from '../platform/native';
import type {
  CSSAnimationKeyframes,
  ExistingCSSAnimationProperties,
} from '../types';
import type { ICSSAnimationsManager } from '../types/interfaces';

type ProcessedAnimation = {
  normalizedSettings: NormalizedSingleCSSAnimationSettings;
  keyframesRule: CSSKeyframesRuleImpl;
};

export default class CSSAnimationsManager implements ICSSAnimationsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private attachedAnimations: ProcessedAnimation[] = [];

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  update(animationProperties: ExistingCSSAnimationProperties | null): void {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const processedAnimations = this.processAnimations(animationProperties);

    const animationUpdates = this.getAnimationUpdates(processedAnimations);
    this.attachedAnimations = processedAnimations;

    if (animationUpdates) {
      if (
        animationUpdates.animationTags &&
        animationUpdates.animationTags.length === 0
      ) {
        this.detach();
        return;
      }

      applyCSSAnimations(this.shadowNodeWrapper, animationUpdates);
    }
  }

  private detach() {
    if (this.attachedAnimations.length > 0) {
      unregisterCSSAnimations(this.viewTag);
      this.attachedAnimations = [];
    }
  }

  private processAnimations(
    animationProperties: ExistingCSSAnimationProperties
  ): ProcessedAnimation[] {
    const singleAnimationPropertiesArray =
      createSingleCSSAnimationProperties(animationProperties);

    const processedAnimations = singleAnimationPropertiesArray.map(
      (properties, i) => {
        const keyframes = properties.animationName;
        let keyframesRule: CSSKeyframesRuleImpl;

        if (keyframes instanceof CSSKeyframesRuleImpl) {
          // If the instance of the CSSKeyframesRule class was passed, we can just compare
          // references to the instance (css.keyframes() call should be memoized in order
          // to preserve the same animation. If used inline, it will restart the animation
          // on every component re-render)
          keyframesRule = keyframes;
        } else if (
          this.attachedAnimations[i]?.keyframesRule.cssText !==
          JSON.stringify(keyframes)
        ) {
          // If the keyframes are not an instance of the CSSKeyframesRule class (e.g. someone
          // passes a keyframes object inline in the component's style without using css.keyframes()
          // function), we don't want to restart the animation on every component re-render.
          // In this case, we need to compare the stringified keyframes of the old and the new
          // animation configuration object to determine if the animation has changed.
          keyframesRule = new CSSKeyframesRuleImpl(
            keyframes as CSSAnimationKeyframes
          );
        } else {
          // Otherwise, if keyframes are the same, we can just use the existing keyframes rule
          // instance
          keyframesRule = this.attachedAnimations[i]?.keyframesRule;
        }

        return {
          normalizedSettings: normalizeSingleCSSAnimationSettings(properties),
          keyframesRule,
        };
      }
    );

    return processedAnimations;
  }

  private buildAnimationsMap(animations: ProcessedAnimation[]) {
    // Iterate over attached animations from last to first for faster pop from
    // the end of the array when removing used animations
    return animations.reduceRight<Record<string, ProcessedAnimation[]>>(
      (acc, animation) => {
        const tag = animation.keyframesRule.tag;
        if (!acc[tag]) {
          acc[tag] = [animation];
        } else {
          acc[tag].push(animation);
        }
        return acc;
      },
      {}
    );
  }

  private getAnimationUpdates(
    processedAnimations: ProcessedAnimation[]
  ): CSSAnimationUpdates | null {
    const newAnimationSettings: Record<
      number,
      NormalizedSingleCSSAnimationSettings
    > = {};
    const settingsUpdates: Record<
      number,
      Partial<NormalizedSingleCSSAnimationSettings>
    > = {};

    let animationsArrayChanged =
      this.attachedAnimations.length !== processedAnimations.length;
    let hasNewAnimations = false;
    let hasSettingsUpdates = false;

    const oldAnimations = this.buildAnimationsMap(this.attachedAnimations);

    processedAnimations.forEach(({ keyframesRule, normalizedSettings }, i) => {
      const oldAnimation = oldAnimations[keyframesRule.tag]?.pop();

      if (!oldAnimation) {
        hasNewAnimations = true;
        animationsArrayChanged = true;
        newAnimationSettings[i] = normalizedSettings;
        return;
      }

      const updates = getAnimationSettingsUpdates(
        oldAnimation.normalizedSettings,
        normalizedSettings
      );

      if (Object.keys(updates).length > 0) {
        hasSettingsUpdates = true;
        settingsUpdates[i] = updates;
      }

      if (oldAnimation.keyframesRule.tag !== keyframesRule.tag) {
        animationsArrayChanged = true;
      }
    });

    const result: CSSAnimationUpdates = {};
    if (animationsArrayChanged) {
      result.animationTags = processedAnimations.map(
        ({ keyframesRule }) => keyframesRule.tag
      );
    }
    if (hasNewAnimations) {
      result.newAnimationSettings = newAnimationSettings;
    }
    if (hasSettingsUpdates) {
      result.settingsUpdates = settingsUpdates;
    }

    if (hasNewAnimations || hasSettingsUpdates || animationsArrayChanged) {
      return result;
    }

    return null;
  }
}
