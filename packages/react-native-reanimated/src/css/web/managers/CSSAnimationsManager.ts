'use strict';
import { maybeAddSuffix } from '../../../common';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type {
  ConvertValuesToArrays,
  CSSAnimationKeyframes,
  CSSAnimationSettings,
  ExistingCSSAnimationProperties,
  ICSSAnimationsManager,
} from '../../types';
import {
  convertPropertiesToArrays,
  kebabizeCamelCase,
  normalizeTimeUnit,
} from '../../utils';
import { processKeyframeDefinitions } from '../animationParser';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  removeCSSAnimation,
} from '../domUtils';
import { CSSKeyframesRuleImpl } from '../keyframes';
import { maybeAddSuffixes, parseTimingFunction } from '../utils';

const isCSSKeyframesRuleImpl = (
  keyframes: ExistingCSSAnimationProperties['animationName']
): keyframes is CSSKeyframesRuleImpl =>
  typeof keyframes === 'object' && 'processedKeyframes' in keyframes;

type ProcessedAnimation = {
  keyframesRule: CSSKeyframesRuleImpl;
  removable: boolean;
  creationTimestamp: number;
  elapsedTime?: number;
};

type ProcessedSettings = ConvertValuesToArrays<CSSAnimationSettings>;

export default class CSSAnimationsManager implements ICSSAnimationsManager {
  private readonly element: ReanimatedHTMLElement;

  // Keys are processed keyframes
  private attachedAnimations: Record<string, ProcessedAnimation> = {};
  private unmountCleanupCalled = false;

  constructor(element: ReanimatedHTMLElement) {
    configureWebCSSAnimations();

    this.element = element;
  }

  update(animationProperties: ExistingCSSAnimationProperties | null) {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const { animationName: definitions, ...animationSettings } =
      convertPropertiesToArrays(animationProperties);

    if (definitions.length === 0) {
      this.detach();
      return;
    }

    const timestamp = Date.now();
    const processedAnimations = definitions.map((definition) => {
      let processedAnimation: ProcessedAnimation;

      // If the CSSKeyframesRule instance was provided, we can just use it
      if (isCSSKeyframesRuleImpl(definition)) {
        processedAnimation = this.attachedAnimations[
          definition.processedKeyframes
        ] ?? {
          keyframesRule: definition,
          removable: false,
          creationTimestamp: timestamp,
        };
      } else {
        // If keyframes was defined as an object, the additional processing is needed
        const keyframes = definition as CSSAnimationKeyframes;
        const processedKeyframes = processKeyframeDefinitions(keyframes);

        // If the animation with the same keyframes was already attached, we can reuse it
        // Otherwise, we need to create a new CSSKeyframesRule object
        processedAnimation = this.attachedAnimations[processedKeyframes] ?? {
          keyframesRule: new CSSKeyframesRuleImpl(
            keyframes,
            processedKeyframes
          ),
          removable: true,
          creationTimestamp: timestamp,
        };
      }

      if (this.unmountCleanupCalled) {
        // unmountCleanup is called not only when the component truly unmounts, but also
        // when display property is set to 'none' (e.g. during navigation between screens)
        // In such a case, we don't want to restart the animation after re-entering the
        // screen so we have to shift its delay by the time elapsed since the animation
        // was started for the first time.
        processedAnimation.elapsedTime =
          timestamp - processedAnimation.creationTimestamp;
      }

      return processedAnimation;
    });

    this.unmountCleanupCalled = false;
    this.updateAttachedAnimations(processedAnimations);
    this.setElementAnimations(processedAnimations, animationSettings);
  }

  unmountCleanup(): void {
    if (!this.unmountCleanupCalled) {
      this.unmountCleanupCalled = true;
      // We use setTimeout to ensure that the animation is removed after the
      // component is unmounted (it puts the detach call at the end of the event loop)
      // We just remove the animation definition from the style sheet as there is no
      // need to clean up view props if it is removed from the DOM.
      setTimeout(() => {
        this.removeAnimationsFromStyleSheet(
          Object.values(this.attachedAnimations)
        );
      });
    }
  }

  private detach() {
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

    this.removeAnimationsFromStyleSheet(attachedAnimations);
    this.unmountCleanupCalled = false;
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
    processedAnimations: ProcessedAnimation[],
    animationSettings: ProcessedSettings
  ) {
    this.element.style.animationName = processedAnimations
      .map(({ keyframesRule: { name } }) => name)
      .join(',');

    this.element.style.animationDuration = maybeAddSuffixes(
      animationSettings,
      'animationDuration',
      'ms'
    ).join(',');

    const animationDelays = animationSettings.animationDelay ?? [];
    this.element.style.animationDelay = processedAnimations
      .map(({ elapsedTime }, i) => {
        const providedDelay = animationDelays[i] ?? 0;
        return maybeAddSuffix(
          elapsedTime
            ? (normalizeTimeUnit(providedDelay) ?? 0) - elapsedTime
            : providedDelay,
          'ms'
        );
      })
      .join(',');

    if (animationSettings.animationIterationCount) {
      this.element.style.animationIterationCount =
        animationSettings.animationIterationCount.join(',');
    }

    if (animationSettings.animationDirection) {
      this.element.style.animationDirection =
        animationSettings.animationDirection.map(kebabizeCamelCase).join(',');
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

  private removeAnimationsFromStyleSheet(animations: ProcessedAnimation[]) {
    animations.forEach(
      ({ keyframesRule: { name, processedKeyframes }, removable }) => {
        if (removable && processedKeyframes) {
          removeCSSAnimation(name);
        }
      }
    );
  }
}
