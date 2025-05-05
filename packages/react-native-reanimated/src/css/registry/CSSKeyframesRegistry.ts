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
  private readonly cssTextToNameMap_: Map<string, string> = new Map();
  private readonly registry_: Map<
    string,
    {
      keyframesRule: CSSKeyframesRuleImpl;
      refIds: Set<number>;
    }
  > = new Map();

  get(key: string /* animation name or css text */) {
    const result = this.registry_.get(key);
    if (result) {
      return result;
    }

    const animationName = this.cssTextToNameMap_.get(key);
    if (animationName) {
      return this.registry_.get(animationName);
    }
  }

  add(keyframesRule: CSSKeyframesRuleImpl, refId: number) {
    const existingKeyframesRule = this.get(keyframesRule.name);
    if (existingKeyframesRule) {
      existingKeyframesRule.refIds.add(refId);
    } else {
      this.registry_.set(keyframesRule.name, {
        keyframesRule,
        refIds: new Set([refId]),
      });

      // Store the keyframes to name mapping in order to reuse the same
      // animation name when possible (when the same inline keyframes object
      // is used)
      this.cssTextToNameMap_.set(keyframesRule.cssText, keyframesRule.name);

      // Register animation keyframes only if they are not already registered
      // (when they are added for the first time)
      // TODO - batch css keyframes registration calls
      registerCSSKeyframes(
        keyframesRule.name,
        keyframesRule.normalizedKeyframesConfig
      );
    }
  }

  remove(animationName: string, refId: number) {
    const entry = this.registry_.get(animationName);
    if (!entry) {
      return;
    }

    const refIds = entry.refIds;
    refIds.delete(refId);

    if (refIds.size === 0) {
      this.registry_.delete(animationName);
      this.cssTextToNameMap_.delete(entry.keyframesRule.cssText);
      // Unregister animation keyframes if there are no more references to them
      // (no more views that have an animation with this name)
      unregisterCSSKeyframes(animationName);
    }
  }
}
