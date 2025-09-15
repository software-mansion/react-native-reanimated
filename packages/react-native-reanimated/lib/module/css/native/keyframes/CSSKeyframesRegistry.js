'use strict';

import { registerCSSKeyframes, unregisterCSSKeyframes } from '../proxy';
/**
 * This class is responsible for managing the registry of CSS animation
 * keyframes. It keeps track of views that use specific animations and handles
 * native-side registration. Animation keyframes are registered on the native
 * side only when used for the first time and unregistered when removed from the
 * last view that uses them.
 */
class CSSKeyframesRegistry {
  cssTextToNameMap_ = new Map();
  nameToKeyframes_ = new Map();
  get(nameOrCssText) {
    const result = this.nameToKeyframes_.get(nameOrCssText);
    if (result) {
      return result.keyframesRule;
    }
    const animationName = this.cssTextToNameMap_.get(nameOrCssText);
    if (animationName) {
      return this.nameToKeyframes_.get(animationName)?.keyframesRule;
    }
  }
  add(keyframesRule, viewName, viewTag) {
    const existingKeyframesEntry = this.nameToKeyframes_.get(keyframesRule.name);
    const existingComponentEntry = existingKeyframesEntry?.usedBy[viewName];
    if (existingComponentEntry) {
      // Just add the view tag to the existing component entry if keyframes
      // for the specific animation and component name are already registered
      existingComponentEntry.add(viewTag);
      return;
    }

    // Otherwise, we have to register keyframes preprocessed for the specific
    // component name
    if (existingKeyframesEntry) {
      existingKeyframesEntry.usedBy[viewName] = new Set([viewTag]);
    } else {
      this.nameToKeyframes_.set(keyframesRule.name, {
        keyframesRule,
        usedBy: {
          [viewName]: new Set([viewTag])
        }
      });
    }

    // Store the keyframes to name mapping in order to reuse the same
    // animation name when possible (when the same inline keyframes object
    // is used)
    this.cssTextToNameMap_.set(keyframesRule.cssText, keyframesRule.name);

    // Register animation keyframes only if they are not already registered
    // (when they are added for the first time)
    registerCSSKeyframes(keyframesRule.name, viewName, keyframesRule.getNormalizedKeyframesConfig(viewName));
  }
  remove(animationName, viewName, viewTag) {
    const keyframesEntry = this.nameToKeyframes_.get(animationName);
    if (!keyframesEntry) {
      return;
    }
    const componentEntry = keyframesEntry.usedBy[viewName];
    componentEntry.delete(viewTag);
    if (componentEntry.size === 0) {
      delete keyframesEntry.usedBy[viewName];
      unregisterCSSKeyframes(animationName, viewName);
    }
    if (Object.keys(keyframesEntry.usedBy).length === 0) {
      this.nameToKeyframes_.delete(animationName);
      this.cssTextToNameMap_.delete(keyframesEntry.keyframesRule.cssText);
    }
  }
  clear() {
    this.nameToKeyframes_.clear();
    this.cssTextToNameMap_.clear();
  }
}
const cssKeyframesRegistry = new CSSKeyframesRegistry();
export default cssKeyframesRegistry;
//# sourceMappingURL=CSSKeyframesRegistry.js.map