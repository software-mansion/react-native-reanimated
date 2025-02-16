'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { ReanimatedError } from '../errors';
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
import type { CSSAnimationKeyframes, CSSAnimationProperties } from '../types';

export type ProcessedAnimation = {
  normalizedSettings: NormalizedSingleCSSAnimationSettings;
  animationName: CSSKeyframesRuleImpl | string;
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

  update(animationProperties: CSSAnimationProperties | null): void {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const processResult = this.processAnimations(animationProperties);
    const [processedAnimations, areAllEqual] = processResult;

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
      processedAnimations.map(({ animationName, normalizedSettings }) => ({
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        name: animationName.toString(),
        settings: normalizedSettings,
      }))
    );
  }

  private processAnimations(
    animationProperties: CSSAnimationProperties
  ): [ProcessedAnimation[], boolean] {
    const singleAnimationPropertiesArray =
      createSingleCSSAnimationProperties(animationProperties);

    let areAllEqual =
      this.attachedAnimations.length === singleAnimationPropertiesArray.length;

    const processedAnimations = singleAnimationPropertiesArray.map(
      (properties, i) => {
        const animationName = properties.animationName;
        const attachedAnimationName = this.attachedAnimations[i]?.animationName;
        let processedAnimationName = attachedAnimationName;

        // KeyframesRule instance or animation shorthand string
        if (
          animationName instanceof CSSKeyframesRuleImpl ||
          typeof animationName === 'string' // for animation shorthand
        ) {
          // If the instance of the CSSKeyframesRule class was passed, we can just compare
          // references to the instance (css.keyframes() call should be memoized in order
          // to preserve the same animation. If used inline, it will restart the animation
          // on every component re-render). The same applies to the animation name string.
          processedAnimationName = animationName;
          if (
            areAllEqual &&
            !this.isSameAnimation(animationName, attachedAnimationName)
          ) {
            areAllEqual = false;
          }
        }
        // Inline keyframes object
        else if (typeof animationName === 'object') {
          if (
            // If the animation shorthand was replaced with the inline keyframes object
            !(attachedAnimationName instanceof CSSKeyframesRuleImpl) ||
            // or if the stringified keyframes object is different from the attached one
            attachedAnimationName?.cssText !== JSON.stringify(animationName)
          ) {
            processedAnimationName = new CSSKeyframesRuleImpl(
              animationName as CSSAnimationKeyframes
            );
            areAllEqual = false;
          }
        }
        // Otherwise, keyframes are invalid
        else {
          throw new ReanimatedError(
            `Invalid animation keyframes object for animation: ${JSON.stringify(
              animationName
            )}. Please provide a valid keyframes object or a valid animation name string.`
          );
        }

        return {
          normalizedSettings: normalizeSingleCSSAnimationSettings(properties),
          animationName: processedAnimationName,
        };
      }
    );

    return [processedAnimations, areAllEqual];
  }

  private isSameAnimation(
    animationName: CSSKeyframesRuleImpl | string,
    attachedAnimationName: CSSKeyframesRuleImpl | string | undefined
  ) {
    if (!attachedAnimationName) {
      return false;
    }

    return (
      this.getNameString(animationName) ===
      this.getNameString(attachedAnimationName)
    );
  }

  private getNameString(animationName: CSSKeyframesRuleImpl | string) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return animationName.toString(); // this is fine, since the CSSKeyframesRuleImpl implements toString()
  }
}
