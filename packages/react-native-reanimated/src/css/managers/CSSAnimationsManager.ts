'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { CSSKeyframesRuleImpl } from '../models';
import type { NormalizedSingleCSSAnimationSettings } from '../platform/native';
import {
  createSingleCSSAnimationProperties,
  getAnimationSettingsUpdates,
  normalizeSingleCSSAnimationSettings,
  registerCSSAnimations,
  unregisterCSSAnimations,
  updateCSSAnimations,
} from '../platform/native';
import type {
  CSSAnimationKeyframes,
  ExistingCSSAnimationProperties,
} from '../types';

export type ProcessedAnimation = {
  normalizedSettings: NormalizedSingleCSSAnimationSettings;
  keyframesRule: CSSKeyframesRuleImpl;
};

export default class CSSAnimationsManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;

  private attachedAnimations: ProcessedAnimation[] = [];

  constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }

  detach() {
    if (this.attachedAnimations.length > 0) {
      unregisterCSSAnimations(this.viewTag);
      this.attachedAnimations = [];
    }
  }

  update(animationProperties: ExistingCSSAnimationProperties | null): void {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const [processedAnimations, areAllEqual] =
      this.processAnimations(animationProperties);

    // Attach new animations if there are no attached animations or if
    // the array of animations is different (e.g. length or order)
    if (!areAllEqual) {
      // We don't need to detach the old animations because CPP will
      // override them with new ones
      this.attachAnimations(processedAnimations);
      return;
    }

    // Update existing animations if all animations are the same but some
    // of the animation settings are different
    const settingsUpdates: {
      index: number;
      settings: Partial<NormalizedSingleCSSAnimationSettings>;
    }[] = [];

    for (let i = 0; i < processedAnimations.length; i++) {
      const updates = getAnimationSettingsUpdates(
        this.attachedAnimations[i].normalizedSettings,
        processedAnimations[i].normalizedSettings
      );
      if (Object.keys(updates).length > 0) {
        this.attachedAnimations[i].normalizedSettings =
          processedAnimations[i].normalizedSettings;
        settingsUpdates.push({ index: i, settings: updates });
      }
    }
    if (settingsUpdates.length > 0) {
      updateCSSAnimations(this.viewTag, settingsUpdates);
    }
  }

  private attachAnimations(processedAnimations: ProcessedAnimation[]) {
    if (processedAnimations.length === 0) {
      this.detach();
      return;
    }

    this.attachedAnimations = processedAnimations;
    registerCSSAnimations(
      this.shadowNodeWrapper,
      processedAnimations.map(
        ({ keyframesRule: { name }, normalizedSettings }) => ({
          name,
          settings: normalizedSettings,
        })
      )
    );
  }

  private processAnimations(
    animationProperties: ExistingCSSAnimationProperties
  ): [ProcessedAnimation[], boolean] {
    const singleAnimationPropertiesArray =
      createSingleCSSAnimationProperties(animationProperties);
    let areAllEqual =
      this.attachedAnimations.length === singleAnimationPropertiesArray.length;

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
          if (
            areAllEqual &&
            keyframes !== this.attachedAnimations[i]?.keyframesRule
          ) {
            areAllEqual = false;
          }
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
          areAllEqual = false;
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

    return [processedAnimations, areAllEqual];
  }
}
