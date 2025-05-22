'use strict';
import { CSSKeyframesRuleImpl } from '../../models';
import type {
  NormalizedSingleCSSAnimationConfig,
  NormalizedSingleCSSAnimationSettings,
} from '../../platform/native';
import {
  createSingleCSSAnimationProperties,
  normalizeSingleCSSAnimationSettings,
} from '../../platform/native';
import { CSSKeyframesRegistry } from '../../registry';
import type {
  CSSAnimationKeyframes,
  ExistingCSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../types';
import type { ICSSAnimationsManager } from '../../types/interfaces';

type ProcessedAnimation = {
  normalizedSettings: NormalizedSingleCSSAnimationSettings;
  keyframesRule: CSSKeyframesRuleImpl;
};

export default class CSSAnimationsManager implements ICSSAnimationsManager {
  private attachedAnimationKeyframes: CSSKeyframesRuleImpl[] = [];
  private animationConfigs: NormalizedSingleCSSAnimationConfig[] = [];

  private readonly id: number;

  static nextId = 0;
  static readonly animationKeyframesRegistry = new CSSKeyframesRegistry();

  constructor() {
    this.id = CSSAnimationsManager.nextId++;
  }

  getConfig(): NormalizedSingleCSSAnimationConfig[] {
    return this.animationConfigs;
  }

  update(animationProperties: ExistingCSSAnimationProperties | null): void {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const processedAnimations = this.processCSSAnimations(animationProperties);
    this.updateKeyframesUsage(processedAnimations);

    this.attachedAnimationKeyframes = processedAnimations.map(
      ({ keyframesRule }) => keyframesRule
    );
    this.animationConfigs = processedAnimations.map(
      ({ normalizedSettings, keyframesRule: { name } }) => ({
        ...normalizedSettings,
        name,
      })
    );
  }

  unmountCleanup(): void {
    this.unregisterKeyframesUsage();
  }

  private detach() {
    if (this.attachedAnimationKeyframes.length > 0) {
      this.unregisterKeyframesUsage();
      this.attachedAnimationKeyframes = [];
      this.animationConfigs = [];
    }
  }

  private updateKeyframesUsage(processedAnimations: ProcessedAnimation[]) {
    const processedAnimationNames = new Set();

    // Register keyframes for all animations present in the processed animations
    // array (if they are already registered, this call will be a no-op)
    processedAnimations.forEach(({ keyframesRule }) => {
      CSSAnimationsManager.animationKeyframesRegistry.add(
        keyframesRule,
        this.id
      );
      processedAnimationNames.add(keyframesRule.name);
    });

    // Unregister keyframes for all old animations that are no longer attached
    // to the view
    this.attachedAnimationKeyframes.forEach(({ name }) => {
      if (!processedAnimationNames.has(name)) {
        CSSAnimationsManager.animationKeyframesRegistry.remove(name, this.id);
      }
    });
  }

  private unregisterKeyframesUsage() {
    // Unregister keyframes usage by the view (it is necessary to clean up
    // keyframes from the CPP registry once all views that use them are unmounted)
    this.attachedAnimationKeyframes.forEach(({ name }) => {
      CSSAnimationsManager.animationKeyframesRegistry.remove(name, this.id);
    });
  }

  private processCSSAnimations(
    animationProperties: ExistingCSSAnimationProperties
  ): ProcessedAnimation[] {
    return createSingleCSSAnimationProperties(animationProperties).map(
      (properties) => this.parseSingleCSSAnimation(properties)
    );
  }

  private parseSingleCSSAnimation(
    properties: SingleCSSAnimationProperties
  ): ProcessedAnimation {
    const keyframes = properties.animationName;
    let keyframesRule: CSSKeyframesRuleImpl;

    if (keyframes instanceof CSSKeyframesRuleImpl) {
      // If the instance of the CSSKeyframesRule class was passed,
      // we can just use it directly without further processing
      keyframesRule = keyframes;
    } else {
      // Otherwise, we have to check if the same keyframes already
      // exist and we can reuse them or if we need to create a new
      // CSSKeyframesRule instance
      const cssText = JSON.stringify(keyframes);
      const existingKeyframesRule =
        CSSAnimationsManager.animationKeyframesRegistry.get(cssText);

      if (existingKeyframesRule) {
        keyframesRule = existingKeyframesRule.keyframesRule;
      } else {
        keyframesRule = new CSSKeyframesRuleImpl(
          keyframes as CSSAnimationKeyframes,
          cssText // Use already stringified object for optimization
        );
      }
    }

    return {
      normalizedSettings: normalizeSingleCSSAnimationSettings(properties),
      keyframesRule,
    };
  }
}
