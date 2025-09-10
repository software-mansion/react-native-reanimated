'use strict';

import { cssKeyframesRegistry, CSSKeyframesRuleImpl } from "../keyframes/index.js";
import { createSingleCSSAnimationProperties, getAnimationSettingsUpdates, normalizeSingleCSSAnimationSettings } from "../normalization/index.js";
import { applyCSSAnimations, unregisterCSSAnimations } from "../proxy.js";
export default class CSSAnimationsManager {
  attachedAnimations = [];
  constructor(shadowNodeWrapper, viewName, viewTag) {
    this.shadowNodeWrapper = shadowNodeWrapper;
    this.viewName = viewName;
    this.viewTag = viewTag;
  }
  update(animationProperties) {
    if (!animationProperties) {
      this.detach();
      return;
    }
    const processedAnimations = this.processAnimations(animationProperties);
    this.registerKeyframesUsage(processedAnimations);
    const animationUpdates = this.getAnimationUpdates(processedAnimations);
    this.attachedAnimations = processedAnimations;
    if (animationUpdates) {
      if (animationUpdates.animationNames && animationUpdates.animationNames.length === 0) {
        this.detach();
        return;
      }
      applyCSSAnimations(this.shadowNodeWrapper, animationUpdates);
    }
  }
  unmountCleanup() {
    this.unregisterKeyframesUsage();
  }
  detach() {
    if (this.attachedAnimations.length > 0) {
      unregisterCSSAnimations(this.viewTag);
      this.unregisterKeyframesUsage();
      this.attachedAnimations = [];
    }
  }
  registerKeyframesUsage(processedAnimations) {
    const newAnimationNames = new Set();

    // Register keyframes for all new animations
    processedAnimations.forEach(({
      keyframesRule
    }) => {
      cssKeyframesRegistry.add(keyframesRule, this.viewName, this.viewTag);
      newAnimationNames.add(keyframesRule.name);
    });

    // Unregister keyframes for all old animations that are no longer attached
    // to the view
    this.attachedAnimations.forEach(({
      keyframesRule: {
        name
      }
    }) => {
      if (!newAnimationNames.has(name)) {
        cssKeyframesRegistry.remove(name, this.viewName, this.viewTag);
      }
    });
  }
  unregisterKeyframesUsage() {
    // Unregister keyframes usage by the view (it is necessary to clean up
    // keyframes from the CPP registry once all views that use them are unmounted)
    this.attachedAnimations.forEach(({
      keyframesRule: {
        name
      }
    }) => {
      cssKeyframesRegistry.remove(name, this.viewName, this.viewTag);
    });
  }
  processAnimations(animationProperties) {
    const singleAnimationPropertiesArray = createSingleCSSAnimationProperties(animationProperties);
    const processedAnimations = singleAnimationPropertiesArray.map(properties => {
      const keyframes = properties.animationName;
      let keyframesRule;
      if (keyframes instanceof CSSKeyframesRuleImpl) {
        // If the instance of the CSSKeyframesRule class was passed, we can just compare
        // references to the instance (css.keyframes() call should be memoized in order
        // to preserve the same animation. If used inline, it will restart the animation
        // on every component re-render)
        keyframesRule = keyframes;
      } else {
        // If the keyframes are not an instance of the CSSKeyframesRule class (e.g. someone
        // passes a keyframes object inline in the component's style without using css.keyframes()
        // function), we don't want to restart the animation on every component re-render.
        // In this case, we need to check if the animation with the same keyframes is already
        // registered in the registry. If it is, we can just use the existing keyframes rule.
        // Otherwise, we need to create a new keyframes rule.
        const cssText = JSON.stringify(keyframes);
        keyframesRule = cssKeyframesRegistry.get(cssText) ?? new CSSKeyframesRuleImpl(keyframes, cssText);
      }
      return {
        normalizedSettings: normalizeSingleCSSAnimationSettings(properties),
        keyframesRule
      };
    });
    return processedAnimations;
  }
  buildAnimationsMap(animations) {
    // Iterate over attached animations from last to first for faster pop from
    // the end of the array when removing used animations
    return animations.reduceRight((acc, animation) => {
      const name = animation.keyframesRule.name;
      if (!acc[name]) {
        acc[name] = [animation];
      } else {
        acc[name].push(animation);
      }
      return acc;
    }, {});
  }
  getAnimationUpdates(processedAnimations) {
    const newAnimationSettings = {};
    const settingsUpdates = {};
    let animationsArrayChanged = this.attachedAnimations.length !== processedAnimations.length;
    let hasNewAnimations = false;
    let hasSettingsUpdates = false;
    const oldAnimations = this.buildAnimationsMap(this.attachedAnimations);
    processedAnimations.forEach(({
      keyframesRule,
      normalizedSettings
    }, i) => {
      const oldAnimation = oldAnimations[keyframesRule.name]?.pop();
      if (!oldAnimation) {
        hasNewAnimations = true;
        animationsArrayChanged = true;
        newAnimationSettings[i] = normalizedSettings;
        return;
      }
      const updates = getAnimationSettingsUpdates(oldAnimation.normalizedSettings, normalizedSettings);
      if (Object.keys(updates).length > 0) {
        hasSettingsUpdates = true;
        settingsUpdates[i] = updates;
      }
      if (oldAnimation.keyframesRule.name !== keyframesRule.name) {
        animationsArrayChanged = true;
      }
    });
    const result = {};
    if (animationsArrayChanged) {
      result.animationNames = processedAnimations.map(({
        keyframesRule
      }) => keyframesRule.name);
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
//# sourceMappingURL=CSSAnimationsManager.js.map