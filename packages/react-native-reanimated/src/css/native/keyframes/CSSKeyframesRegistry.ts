'use strict';
import { registerCSSKeyframes, unregisterCSSKeyframes } from '../proxy';
import type CSSKeyframesRuleImpl from './CSSKeyframesRuleImpl';

type KeyframesEntry = {
  keyframesRule: CSSKeyframesRuleImpl;
  usedBy: Record<string, Set<number>>;
};

/**
 * This class is responsible for managing the registry of CSS animation
 * keyframes. It keeps track of views that use specific animations and handles
 * native-side registration. Animation keyframes are registered on the native
 * side only when used for the first time and unregistered when removed from the
 * last view that uses them.
 */
class CSSKeyframesRegistry {
  private readonly cssTextToNames_: Map<string, Set<string>> = new Map();
  private readonly nameToKeyframes_: Map<string, KeyframesEntry> = new Map();

  get(nameOrCssText: string) {
    const result = this.nameToKeyframes_.get(nameOrCssText);
    if (result) {
      return result.keyframesRule;
    }

    const animationName = this.cssTextToNames_
      .get(nameOrCssText)
      ?.values()
      .next().value;
    if (animationName) {
      return this.nameToKeyframes_.get(animationName)?.keyframesRule;
    }
  }

  add(
    keyframesRule: CSSKeyframesRuleImpl,
    viewTag: number,
    compoundComponentName: string
  ) {
    const existingKeyframesEntry = this.nameToKeyframes_.get(
      keyframesRule.name
    );
    const existingComponentEntry =
      existingKeyframesEntry?.usedBy[compoundComponentName];

    if (existingComponentEntry) {
      // Just add the view tag to the existing component entry if keyframes
      // for the specific animation and component name are already registered
      existingComponentEntry.add(viewTag);
      return;
    }

    // Otherwise, we have to register keyframes preprocessed for the specific
    // component name
    if (existingKeyframesEntry) {
      existingKeyframesEntry.usedBy[compoundComponentName] = new Set([viewTag]);
    } else {
      this.nameToKeyframes_.set(keyframesRule.name, {
        keyframesRule,
        usedBy: { [compoundComponentName]: new Set([viewTag]) },
      });
    }

    // Store the keyframes to name mapping in order to reuse the same
    // animation name when possible (when the same inline keyframes object
    // is used). Multiple separately-constructed `CSSKeyframesRuleImpl`
    // instances may share the same `cssText` but have different names, so
    // every name with this content must be tracked to keep content-based
    // lookup working until the last same-content rule is removed.
    if (!this.cssTextToNames_.has(keyframesRule.cssText)) {
      this.cssTextToNames_.set(keyframesRule.cssText, new Set());
    }
    this.cssTextToNames_.get(keyframesRule.cssText)?.add(keyframesRule.name);

    // Register animation keyframes only if they are not already registered
    // (when they are added for the first time)
    const normalizedKeyframesConfig =
      keyframesRule.getNormalizedKeyframesConfig(compoundComponentName);
    registerCSSKeyframes(
      keyframesRule.name,
      compoundComponentName,
      normalizedKeyframesConfig
    );
  }

  remove(
    animationName: string,
    viewTag: number,
    compoundComponentName: string
  ) {
    const keyframesEntry = this.nameToKeyframes_.get(animationName);
    if (!keyframesEntry) {
      return;
    }

    const componentEntry = keyframesEntry.usedBy[compoundComponentName];
    componentEntry.delete(viewTag);

    if (componentEntry.size === 0) {
      delete keyframesEntry.usedBy[compoundComponentName];
      unregisterCSSKeyframes(animationName, compoundComponentName);
    }

    if (Object.keys(keyframesEntry.usedBy).length === 0) {
      this.nameToKeyframes_.delete(animationName);
      const namesForCssText = this.cssTextToNames_.get(
        keyframesEntry.keyframesRule.cssText
      );
      if (namesForCssText) {
        namesForCssText.delete(animationName);
        if (namesForCssText.size === 0) {
          this.cssTextToNames_.delete(keyframesEntry.keyframesRule.cssText);
        }
      }
    }
  }

  clear() {
    this.nameToKeyframes_.clear();
    this.cssTextToNames_.clear();
  }
}

const cssKeyframesRegistry = new CSSKeyframesRegistry();

export default cssKeyframesRegistry;
