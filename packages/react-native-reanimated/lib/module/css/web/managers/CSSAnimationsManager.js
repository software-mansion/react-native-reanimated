'use strict';

import { convertPropertiesToArrays, kebabizeCamelCase } from "../../utils/index.js";
import { processKeyframeDefinitions } from "../animationParser.js";
import { configureWebCSSAnimations, insertCSSAnimation, removeCSSAnimation } from "../domUtils.js";
import { CSSKeyframesRuleImpl } from "../keyframes/index.js";
import { maybeAddSuffixes, parseTimingFunction } from "../utils.js";
const isCSSKeyframesRuleImpl = keyframes => typeof keyframes === 'object' && 'processedKeyframes' in keyframes;
export default class CSSAnimationsManager {
  // Keys are processed keyframes
  attachedAnimations = {};
  constructor(element) {
    configureWebCSSAnimations();
    this.element = element;
  }
  update(animationProperties) {
    if (!animationProperties) {
      this.detach();
      return;
    }
    const {
      animationName: definitions,
      ...animationSettings
    } = convertPropertiesToArrays(animationProperties);
    if (definitions.length === 0) {
      this.detach();
      return;
    }
    const processedAnimations = definitions.map(definition => {
      // If the CSSKeyframesRule instance was provided, we can just use it
      if (isCSSKeyframesRuleImpl(definition)) {
        return {
          keyframesRule: definition,
          removable: false
        };
      }

      // If keyframes was defined as an object, the additional processing is needed
      const keyframes = definition;
      const processedKeyframes = processKeyframeDefinitions(keyframes);

      // If the animation with the same keyframes was already attached, we can reuse it
      if (this.attachedAnimations[processedKeyframes]) {
        return {
          keyframesRule: this.attachedAnimations[processedKeyframes].keyframesRule,
          removable: true
        };
      }

      // Otherwise, we need to create a new CSSKeyframesRule object
      return {
        keyframesRule: new CSSKeyframesRuleImpl(keyframes, processedKeyframes),
        removable: true
      };
    });
    const animationNames = processedAnimations.map(({
      keyframesRule: {
        name
      }
    }) => name);
    this.updateAttachedAnimations(processedAnimations);
    this.setElementAnimations(animationNames, animationSettings);
  }
  unmountCleanup() {
    // We use setTimeout to ensure that the animation is removed after the
    // component is unmounted (it puts the detach call at the end of the event loop)
    setTimeout(this.detach.bind(this));
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
    attachedAnimations.forEach(({
      keyframesRule: {
        name,
        processedKeyframes
      },
      removable
    }) => {
      if (removable && processedKeyframes) {
        removeCSSAnimation(name);
      }
    });
    this.attachedAnimations = {};
  }
  updateAttachedAnimations(processedAnimations) {
    const newAttachedAnimations = {};
    processedAnimations.forEach(processedAnimation => {
      const rule = processedAnimation.keyframesRule;
      if (rule.processedKeyframes) {
        // We always call insert as it will insert animation only if it doesn't exist
        insertCSSAnimation(rule.name, rule.processedKeyframes);
      }
      newAttachedAnimations[rule.processedKeyframes] = processedAnimation;
    });
    Object.values(this.attachedAnimations).forEach(({
      keyframesRule: rule,
      removable
    }) => {
      if (removable && rule.processedKeyframes && !newAttachedAnimations[rule.processedKeyframes]) {
        removeCSSAnimation(rule.name);
      }
    });
    this.attachedAnimations = newAttachedAnimations;
  }
  setElementAnimations(animationNames, animationSettings) {
    this.element.style.animationName = animationNames.join(',');
    this.element.style.animationDuration = maybeAddSuffixes(animationSettings, 'animationDuration', 'ms').join(',');
    this.element.style.animationDelay = maybeAddSuffixes(animationSettings, 'animationDelay', 'ms').join(',');
    if (animationSettings.animationIterationCount) {
      this.element.style.animationIterationCount = animationSettings.animationIterationCount.join(',');
    }
    if (animationSettings.animationDirection) {
      this.element.style.animationDirection = animationSettings.animationDirection.map(kebabizeCamelCase).join(',');
    }
    if (animationSettings.animationFillMode) {
      this.element.style.animationFillMode = animationSettings.animationFillMode.join(',');
    }
    if (animationSettings.animationPlayState) {
      this.element.style.animationPlayState = animationSettings.animationPlayState.join(',');
    }
    if (animationSettings.animationTimingFunction) {
      this.element.style.animationTimingFunction = parseTimingFunction(animationSettings.animationTimingFunction);
    }
  }
}
//# sourceMappingURL=CSSAnimationsManager.js.map