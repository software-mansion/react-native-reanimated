'use strict';
import { CSSKeyframesRuleImpl } from '../../models';
import type { NormalizedSingleCSSAnimationConfig } from '../../platform/native';
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

export default class NewCSSAnimationsManager implements ICSSAnimationsManager {
  private attachedAnimations: NormalizedSingleCSSAnimationConfig[] = [];
  private readonly id: number;

  static nextId = 0;
  static readonly animationKeyframesRegistry = new CSSKeyframesRegistry();

  constructor() {
    this.id = NewCSSAnimationsManager.nextId++;
  }

  update(
    animationProperties: ExistingCSSAnimationProperties
  ): NormalizedSingleCSSAnimationConfig[] {
    const processedAnimations = this.processCSSAnimations(animationProperties);
    this.registerKeyframesUsage(processedAnimations);

    this.attachedAnimations = processedAnimations;

    return processedAnimations;
  }

  private processCSSAnimations(
    animationProperties: ExistingCSSAnimationProperties
  ): NormalizedSingleCSSAnimationConfig[] {
    return createSingleCSSAnimationProperties(animationProperties).map(
      (properties) => this.parseSingleCSSAnimation(properties)
    );
  }

  unmountCleanup(): void {
    this.unregisterKeyframesUsage();
  }

  private parseSingleCSSAnimation(
    properties: SingleCSSAnimationProperties
  ): NormalizedSingleCSSAnimationConfig {
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
        NewCSSAnimationsManager.animationKeyframesRegistry.get(cssText);

      if (existingKeyframesRule) {
        keyframesRule = existingKeyframesRule.keyframesRule;
      } else {
        keyframesRule = new CSSKeyframesRuleImpl(
          keyframes as CSSAnimationKeyframes,
          cssText // Use already stringified object for optimization
        );
        NewCSSAnimationsManager.animationKeyframesRegistry.add(
          keyframesRule,
          this.id
        );
      }
    }

    return {
      ...normalizeSingleCSSAnimationSettings(properties),
      animationName: keyframesRule.name,
    };
  }

  private registerKeyframesUsage(processedKeyframes: CSSKeyframesRuleImpl[]) {
    // TODO - improve
    const newAnimationNames = new Set();

    // Register keyframes for all new animations
    processedKeyframes.forEach((keyframesRule) => {
      NewCSSAnimationsManager.animationKeyframesRegistry.add(
        keyframesRule,
        this.id
      );
      newAnimationNames.add(keyframesRule.name);
    });

    // Unregister keyframes for all old animations that are no longer attached
    // to the view
    this.attachedAnimationKeyframes.forEach(({ name }) => {
      if (!newAnimationNames.has(name)) {
        NewCSSAnimationsManager.animationKeyframesRegistry.remove(
          name,
          this.id
        );
      }
    });
  }

  private unregisterKeyframesUsage() {
    // Unregister keyframes usage by the view (it is necessary to clean up
    // keyframes from the CPP registry once all views that use them are unmounted)
    this.attachedAnimationKeyframes.forEach(({ name }) => {
      NewCSSAnimationsManager.animationKeyframesRegistry.remove(name, this.id);
    });
  }
}
