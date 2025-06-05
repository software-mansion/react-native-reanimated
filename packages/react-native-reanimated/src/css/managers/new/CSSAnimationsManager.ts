'use strict';
import { CSSKeyframesRuleImpl } from '../../models';
import type { NormalizedSingleCSSAnimationConfig } from '../../platform/native';
import {
  createSingleCSSAnimationProperties,
  normalizeAnimationKeyframes,
  normalizeSingleCSSAnimationSettings,
} from '../../platform/native';
import type {
  CSSAnimationKeyframes,
  ExistingCSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../types';
import type { ICSSAnimationsManager } from '../../types/interfaces';

export default class CSSAnimationsManager implements ICSSAnimationsManager {
  private animationConfigs: NormalizedSingleCSSAnimationConfig[] | null = null;

  getConfig(): NormalizedSingleCSSAnimationConfig[] | null {
    return this.animationConfigs;
  }

  update(animationProperties: ExistingCSSAnimationProperties | null): void {
    if (!animationProperties) {
      this.animationConfigs = null;
      return;
    }

    this.animationConfigs = this.processCSSAnimations(animationProperties);
  }

  private processCSSAnimations(
    animationProperties: ExistingCSSAnimationProperties
  ): NormalizedSingleCSSAnimationConfig[] {
    return createSingleCSSAnimationProperties(animationProperties).map(
      (properties) => this.parseSingleCSSAnimation(properties)
    );
  }

  private parseSingleCSSAnimation(
    properties: SingleCSSAnimationProperties
  ): NormalizedSingleCSSAnimationConfig {
    const animation = properties.animationName;
    const settings = normalizeSingleCSSAnimationSettings(properties);

    if (animation instanceof CSSKeyframesRuleImpl) {
      // If the instance of the CSSKeyframesRule class was passed,
      // we can just use it directly without further processing
      return {
        ...animation.normalizedKeyframesConfig,
        ...settings,
        name: animation.name,
      };
    }

    return {
      ...normalizeAnimationKeyframes(animation as CSSAnimationKeyframes),
      ...settings,
      // TODO - add keyframes hashing to generate the unique animation name from keyframes or something
      // else that would be better than JSON.stringify
      name: JSON.stringify(animation),
    };
  }
}
