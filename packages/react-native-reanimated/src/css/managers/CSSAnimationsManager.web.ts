'use strict';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import CSSKeyframesRuleImpl from '../models/CSSKeyframesRule.web';
import type { NormalizedCSSAnimationProperties } from '../platform/web';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  maybeAddSuffixes,
  normalizeCSSAnimationProperties,
  parseTimingFunction,
  processKeyframeDefinitions,
  removeCSSAnimation,
} from '../platform/web';
import type { CSSAnimationKeyframes, CSSAnimationProperties } from '../types';
import { convertPropertiesToArrays, kebabizeCamelCase } from '../utils';

export const isCSSKeyframesRuleImpl = (
  keyframes: CSSAnimationProperties['animationName']
): keyframes is CSSKeyframesRuleImpl =>
  typeof keyframes === 'object' && 'processedKeyframes' in keyframes;

type ProcessedAnimation = {
  keyframesRule: CSSKeyframesRuleImpl;
  removable: boolean;
};

export default class CSSAnimationsManager {
  private readonly element: ReanimatedHTMLElement;

  // Keys are processed keyframes
  private attachedAnimations: Record<string, ProcessedAnimation> = {};

  constructor(element: ReanimatedHTMLElement) {
    configureWebCSSAnimations();

    this.element = element;
  }

  attach(animationProperties: CSSAnimationProperties | null) {
    this.update(animationProperties);
  }

  update(animationProperties: CSSAnimationProperties | null) {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const normalizedProps =
      normalizeCSSAnimationProperties(animationProperties);

    if (normalizedProps.animationName.length === 0) {
      this.detach();
      return;
    }

    const processedAnimations = definitions.map((definition) => {
      // If the CSSKeyframesRule instance was provided, we can just use it
      if (isCSSKeyframesRuleImpl(definition)) {
        return { keyframesRule: definition, removable: false };
      }

      // If keyframes was defined as an object, the additional processing is needed
      const keyframes = definition as CSSAnimationKeyframes;
      const processedKeyframes = processKeyframeDefinitions(keyframes);

      // If the animation with the same keyframes was already attached, we can reuse it
      if (this.attachedAnimations[processedKeyframes]) {
        return {
          keyframesRule:
            this.attachedAnimations[processedKeyframes].keyframesRule,
          removable: true,
        };
      }

      // Otherwise, we need to create a new CSSKeyframesRule object
      return {
        keyframesRule: new CSSKeyframesRuleImpl(keyframes, processedKeyframes),
        removable: true,
      };
    });

    const animationNames = processedAnimations.map(
      ({ keyframesRule: { name } }) => name
    );

    this.updateAttachedAnimations(processedAnimations);
    this.setElementAnimations(animationNames, animationSettings);
  }

  detach() {
    const attachedAnimations = Object.values(this.attachedAnimations);

    if (attachedAnimations.length === 0) {
      return;
    }

    this.element.style.animationDuration = '';
    this.element.style.animationDelay = '';
    this.element.style.animationDirection = '';
    this.element.style.animationFillMode = '';
    this.element.style.animationPlayState = '';
    this.element.style.animationTimingFunction = '';

    attachedAnimations.forEach(
      ({ keyframesRule: { name, processedKeyframes }, removable }) => {
        if (removable && processedKeyframes) {
          removeCSSAnimation(name);
        }
      }
    );
    this.attachedAnimations = {};
  }

  private updateAttachedAnimations(processedAnimations: ProcessedAnimation[]) {
    const newAttachedAnimations: Record<string, ProcessedAnimation> = {};

    processedAnimations.forEach((processedAnimation) => {
      const rule = processedAnimation.keyframesRule;
      if (rule.processedKeyframes) {
        // We always call insert as it will insert animation only if it doesn't exist
        insertCSSAnimation(rule.name, rule.processedKeyframes);
      }
      newAttachedAnimations[rule.processedKeyframes] = processedAnimation;
    });

    Object.values(this.attachedAnimations).forEach(
      ({ keyframesRule: rule, removable }) => {
        if (
          removable &&
          rule.processedKeyframes &&
          !newAttachedAnimations[rule.processedKeyframes]
        ) {
          removeCSSAnimation(rule.name);
        }
      }
    );

    this.attachedAnimations = newAttachedAnimations;
  }

  private setElementAnimations(
    animationProperties: NormalizedCSSAnimationProperties
  ) {
    this.element.style.animationName =
      animationProperties.animationName.join(',');

    this.element.style.animationDuration = maybeAddSuffixes(
      animationProperties,
      'animationDuration',
      'ms'
    ).join(',');

    this.element.style.animationDelay = maybeAddSuffixes(
      animationProperties,
      'animationDelay',
      'ms'
    ).join(',');

    this.element.style.animationIterationCount =
      animationProperties.animationIterationCount.join(',');

    this.element.style.animationDirection =
      animationProperties.animationDirection.map(kebabizeCamelCase).join(',');

    this.element.style.animationFillMode =
      animationProperties.animationFillMode.join(',');

    this.element.style.animationPlayState =
      animationProperties.animationPlayState.join(',');

    this.element.style.animationTimingFunction = parseTimingFunction(
      animationProperties.animationTimingFunction
    );
  }
}
