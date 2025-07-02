'use strict';
import type { CSSKeyframesRuleImpl } from '../models';
import {
  registerCSSKeyframes,
  unregisterCSSKeyframes,
} from '../platform/native';

type KeyframesEntry = {
  keyframesRule: CSSKeyframesRuleImpl;
  viewTags: Set<number>;
};

/**
 * This class is responsible for managing the registry of CSS animation
 * keyframes. It keeps track of views that use specific animations and handles
 * native-side registration. Animation keyframes are registered on the native
 * side only when used for the first time and unregistered when removed from the
 * last view that uses them.
 */
class CSSKeyframesRegistry {
  private readonly cssTextToNameMap_: Map<string, string> = new Map();
  private readonly nameToKeyframes_: Map<string, KeyframesEntry> = new Map();

  get(nameOrCssText: string) {
    const result = this.nameToKeyframes_.get(nameOrCssText);
    if (result) {
      return result.keyframesRule;
    }

    const animationName = this.cssTextToNameMap_.get(nameOrCssText);
    if (animationName) {
      return this.nameToKeyframes_.get(animationName)?.keyframesRule;
    }
  }

  add(keyframesRule: CSSKeyframesRuleImpl, viewTag: number) {
    const existingEntry = this.nameToKeyframes_.get(keyframesRule.name);
    if (existingEntry) {
      existingEntry.viewTags.add(viewTag);
    } else {
      this.nameToKeyframes_.set(keyframesRule.name, {
        keyframesRule,
        viewTags: new Set([viewTag]),
      });

      // Store the keyframes to name mapping in order to reuse the same
      // animation name when possible (when the same inline keyframes object
      // is used)
      this.cssTextToNameMap_.set(keyframesRule.cssText, keyframesRule.name);

      // Register animation keyframes only if they are not already registered
      // (when they are added for the first time)
      registerCSSKeyframes(
        keyframesRule.name,
        keyframesRule.normalizedKeyframesConfig
      );
    }
  }

  remove(animationName: string, viewTag: number) {
    const entry = this.nameToKeyframes_.get(animationName);
    if (!entry) {
      return;
    }

    const viewTags = entry.viewTags;
    viewTags.delete(viewTag);

    if (viewTags.size === 0) {
      this.nameToKeyframes_.delete(animationName);
      this.cssTextToNameMap_.delete(entry.keyframesRule.cssText);
      // Unregister animation keyframes if there are no more references to them
      // (no more views that have an animation with this name)
      unregisterCSSKeyframes(animationName);
    }
  }

  clear() {
    this.nameToKeyframes_.clear();
    this.cssTextToNameMap_.clear();
  }
}

const cssKeyframesRegistry = new CSSKeyframesRegistry();

export default cssKeyframesRegistry;
