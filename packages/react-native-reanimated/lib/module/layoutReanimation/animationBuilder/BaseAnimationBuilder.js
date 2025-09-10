'use strict';

import { withDelay } from "../../animation/index.js";
import { getReduceMotionFromConfig } from "../../animation/util.js";
import { ReanimatedError } from "../../common/index.js";
import { ReduceMotion } from "../../commonTypes.js";
export class BaseAnimationBuilder {
  reduceMotionV = ReduceMotion.System;
  randomizeDelay = false;
  build = () => {
    throw new ReanimatedError('Unimplemented method in child class.');
  };

  /**
   * Lets you adjust the animation duration. Can be chained alongside other
   * [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param durationMs - Length of the animation (in milliseconds).
   */
  static duration(durationMs) {
    const instance = this.createInstance();
    return instance.duration(durationMs);
  }
  duration(durationMs) {
    this.durationV = durationMs;
    return this;
  }

  /**
   * Lets you adjust the delay before the animation starts (in milliseconds).
   * Can be chained alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param delayMs - Delay before the animation starts (in milliseconds).
   */
  static delay(delayMs) {
    const instance = this.createInstance();
    return instance.delay(delayMs);
  }
  delay(delayMs) {
    this.delayV = delayMs;
    return this;
  }

  /**
   * The callback that will fire after the animation ends. Can be chained
   * alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param callback - Callback that will fire after the animation ends.
   */
  static withCallback(callback) {
    const instance = this.createInstance();
    return instance.withCallback(callback);
  }
  withCallback(callback) {
    this.callbackV = callback;
    return this;
  }

  /**
   * Lets you adjust the behavior when the device's reduced motion accessibility
   * setting is turned on. Can be chained alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param reduceMotion - Determines how the animation responds to the device's
   *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
   *   {@link ReduceMotion}.
   */
  static reduceMotion(reduceMotion) {
    const instance = this.createInstance();
    return instance.reduceMotion(reduceMotion);
  }
  reduceMotion(reduceMotionV) {
    this.reduceMotionV = reduceMotionV;
    return this;
  }

  // 300ms is the default animation duration. If any animation has different default has to override this method.
  static getDuration() {
    return 300;
  }
  getDuration() {
    return this.durationV ?? 300;
  }

  /** @deprecated Use `.delay()` with `Math.random()` instead */
  static randomDelay() {
    const instance = this.createInstance();
    return instance.randomDelay();
  }
  randomDelay() {
    this.randomizeDelay = true;
    return this;
  }

  // when randomizeDelay is set to true, randomize delay between 0 and provided value (or 1000ms if delay is not provided)
  getDelay() {
    return this.randomizeDelay ? Math.random() * (this.delayV ?? 1000) : this.delayV ?? 0;
  }
  getReduceMotion() {
    return this.reduceMotionV;
  }
  getDelayFunction() {
    const isDelayProvided = this.randomizeDelay || this.delayV;
    const reduceMotion = this.getReduceMotion();
    return isDelayProvided ? (delay, animation) => {
      'worklet';

      return withDelay(delay, animation, reduceMotion);
    } : (_, animation) => {
      'worklet';

      animation.reduceMotion = getReduceMotionFromConfig(reduceMotion);
      return animation;
    };
  }
  static build() {
    const instance = this.createInstance();
    return instance.build();
  }
}
//# sourceMappingURL=BaseAnimationBuilder.js.map