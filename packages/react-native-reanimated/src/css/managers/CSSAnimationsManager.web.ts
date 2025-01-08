import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import type {
  ConvertValuesToArrays,
  CSSAnimationKeyframes,
  CSSAnimationProperties,
  CSSAnimationSettings,
} from '../types';
import CSSKeyframesRuleImpl from '../models/CSSKeyframesRule.web';
import {
  configureWebCSSAnimations,
  removeCSSAnimation,
  kebabize,
  maybeAddSuffix,
  parseTimingFunction,
  processKeyframeDefinitions,
  insertCSSAnimation,
} from '../web';
import { convertConfigPropertiesToArrays } from '../utils';

type ProcessedAnimation = {
  keyframesRule: CSSKeyframesRuleImpl;
  removable: boolean;
};

type ProcessedSettings = ConvertValuesToArrays<CSSAnimationSettings>;

export default class CSSAnimationsManager {
  private readonly element: ReanimatedHTMLElement;

  // Keys are processed keyframes
  private attachedAnimations: Record<string, ProcessedAnimation> = {};

  constructor(element: ReanimatedHTMLElement) {
    configureWebCSSAnimations();

    this.element = element;
  }

  attach(animationProperties: CSSAnimationProperties | null) {
    if (!animationProperties) {
      return;
    }

    this.update(animationProperties);
  }

  update(animationProperties: CSSAnimationProperties | null) {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const { animationName: definitions, ...animationSettings } =
      convertConfigPropertiesToArrays(animationProperties);

    if (definitions.length === 0) {
      this.detach();
      return;
    }

    const processedAnimations = definitions.map((definition) => {
      // If the CSSKeyframesRule instance was provided, we can just use it
      if (definition instanceof CSSKeyframesRuleImpl) {
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

    attachedAnimations.forEach(({ keyframesRule: { name }, removable }) => {
      if (removable) {
        removeCSSAnimation(name);
      }
    });
    this.attachedAnimations = {};
  }

  private updateAttachedAnimations(processedAnimations: ProcessedAnimation[]) {
    const newAttachedAnimations: Record<string, ProcessedAnimation> = {};

    processedAnimations.forEach((processedAnimation) => {
      const rule = processedAnimation.keyframesRule;
      if (!this.attachedAnimations[rule.processedKeyframes]) {
        insertCSSAnimation(rule.name, rule.processedKeyframes);
      }
      newAttachedAnimations[rule.processedKeyframes] = processedAnimation;
    });

    Object.values(this.attachedAnimations).forEach(
      ({ keyframesRule: rule, removable }) => {
        if (removable && !newAttachedAnimations[rule.processedKeyframes]) {
          removeCSSAnimation(rule.name);
        }
      }
    );

    this.attachedAnimations = newAttachedAnimations;
  }

  private setElementAnimations(
    animationNames: string[],
    animationSettings: ProcessedSettings
  ) {
    this.element.style.animationName = animationNames.join(',');

    const maybeDuration = maybeAddSuffix(
      animationSettings,
      'animationDuration',
      'ms'
    );

    if (maybeDuration) {
      this.element.style.animationDuration = maybeDuration.join(',');
    }

    const maybeDelay = maybeAddSuffix(
      animationSettings,
      'animationDelay',
      'ms'
    );
    if (maybeDelay) {
      this.element.style.animationDelay = maybeDelay.join(',');
    }

    if (animationSettings.animationIterationCount) {
      this.element.style.animationIterationCount =
        animationSettings.animationIterationCount.join(',');
    }

    if (animationSettings.animationDirection) {
      this.element.style.animationDirection =
        animationSettings.animationDirection.map(kebabize).join(',');
    }

    if (animationSettings.animationFillMode) {
      this.element.style.animationFillMode =
        animationSettings.animationFillMode.join(',');
    }

    if (animationSettings.animationPlayState) {
      this.element.style.animationPlayState =
        animationSettings.animationPlayState.join(',');
    }

    if (animationSettings.animationTimingFunction) {
      this.element.style.animationTimingFunction = parseTimingFunction(
        animationSettings.animationTimingFunction
      );
    }
  }
}
