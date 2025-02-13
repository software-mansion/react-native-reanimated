'use strict';
import type { CSSKeyframesRuleImpl } from '../models';
import {
  registerCSSKeyframes,
  unregisterCSSKeyframes,
} from '../platform/native';

/**
 * This class is responsible for managing the registry of CSS animation
 * keyframes. It keeps track of views that use specific animations and handles
 * native-side registration. Animation keyframes are registered on the native
 * side only when used for the first time and unregistered when removed from the
 * last view that uses them.
 */
export default class CSSKeyframesRegistry {
  private readonly registry_: Map<
    string,
    {
      keyframesRule: CSSKeyframesRuleImpl;
      viewTags: Set<number>;
    }
  > = new Map();

  has(animationName: string) {
    return this.registry_.has(animationName);
  }

  add(keyframesRule: CSSKeyframesRuleImpl, viewTag: number) {
    if (this.has(keyframesRule.name)) {
      this.registry_.get(keyframesRule.name)!.viewTags.add(viewTag);
    } else {
      this.registry_.set(keyframesRule.name, {
        keyframesRule,
        viewTags: new Set([viewTag]),
      });
      // Register animation keyframes only if they are not already registered
      // (when they are added for the first time)
      registerCSSKeyframes(
        keyframesRule.name,
        keyframesRule.normalizedKeyframesConfig
      );
    }
  }

  remove(animationName: string, viewTag: number) {
    const entry = this.registry_.get(animationName);
    if (!entry) {
      return;
    }

    const viewTags = entry.viewTags;
    viewTags.delete(viewTag);

    if (viewTags.size === 0) {
      this.registry_.delete(animationName);
      // Unregister animation keyframes if there are no more references to them
      // (no more views that have an animation with this name)
      unregisterCSSKeyframes(animationName);
    }
  }
}
