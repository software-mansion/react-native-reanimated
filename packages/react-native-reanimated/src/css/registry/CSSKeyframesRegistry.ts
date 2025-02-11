'use strict';
import { ReanimatedError } from '../errors';
import type { CSSKeyframesRuleImpl } from '../models';
import { unregisterCSSKeyframes } from '../platform/native';

// TODO - add comment
export default class CSSKeyframesRegistry {
  private readonly cleanupInterval_: number;
  private readonly usageRegistry_: Map<string, Set<number>>;
  private readonly keyframesRegistry_: Map<
    string,
    WeakRef<CSSKeyframesRuleImpl>
  >;

  // We will loop only over unused animations in the cleanup loop to optimize
  // the cleanup process.
  private unusedAnimationNames_: Set<string>;

  private cleanupIntervalId_: NodeJS.Timeout | null;

  constructor(cleanupInterval = 5000) {
    this.cleanupInterval_ = cleanupInterval;
    this.keyframesRegistry_ = new Map();
    this.usageRegistry_ = new Map();
    this.unusedAnimationNames_ = new Set();
    this.cleanupIntervalId_ = null;
  }

  registerKeyframes(keyframesRule: CSSKeyframesRuleImpl) {
    this.keyframesRegistry_.set(keyframesRule.name, new WeakRef(keyframesRule));
    this.unusedAnimationNames_.add(keyframesRule.name);
    this.maybeStartCleanupLoop();
  }

  registerUsage(animationName: string, viewTag: number) {
    if (!this.keyframesRegistry_.has(animationName)) {
      throw new ReanimatedError(
        `Animation with name ${animationName} is not registered. Make sure that the animation exists before attempting to use it.`
      );
    }

    if (!this.usageRegistry_.has(animationName)) {
      this.usageRegistry_.set(animationName, new Set());
      this.unusedAnimationNames_.delete(animationName);
    }

    this.usageRegistry_.get(animationName)?.add(viewTag);
  }

  unregisterUsage(animationName: string, viewTag: number) {
    if (!this.usageRegistry_.has(animationName)) {
      return;
    }

    this.usageRegistry_.get(animationName)?.delete(viewTag);

    if (this.usageRegistry_.get(animationName)?.size === 0) {
      this.usageRegistry_.delete(animationName);
      this.unusedAnimationNames_.add(animationName);
      this.maybeStartCleanupLoop();
    }
  }

  private cleanup() {
    for (const animationName of this.unusedAnimationNames_) {
      const keyframesRule = this.keyframesRegistry_.get(animationName)?.deref();
      if (!keyframesRule) {
        this.keyframesRegistry_.delete(animationName);
        this.unusedAnimationNames_.delete(animationName);
        // Unregister native keyframes object if JS instance was garbage collected.
        unregisterCSSKeyframes(animationName);
      }
    }

    if (
      this.cleanupIntervalId_ !== null &&
      this.unusedAnimationNames_.size === 0
    ) {
      // Stop the cleanup loop if there are no more unused animations.
      clearInterval(this.cleanupIntervalId_);
      this.cleanupIntervalId_ = null;
    }
  }

  private maybeStartCleanupLoop() {
    if (!this.cleanupIntervalId_) {
      this.cleanupIntervalId_ = setInterval(
        this.cleanup.bind(this),
        this.cleanupInterval_
      );
    }
  }
}
