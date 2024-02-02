'use strict';
import { withDelay } from '../../animation';
import type {
  EntryExitAnimationFunction,
  AnimationFunction,
  LayoutAnimationFunction,
} from './commonTypes';

import { ReduceMotion } from '../../commonTypes';
import { getReduceMotionFromConfig } from '../../animation/util';

export class BaseAnimationBuilder {
  durationV?: number;
  delayV?: number;
  reduceMotionV: ReduceMotion = ReduceMotion.System;
  randomizeDelay = false;
  callbackV?: (finished: boolean) => void;

  static createInstance: <T extends typeof BaseAnimationBuilder>(
    this: T
  ) => InstanceType<T>;

  build = (): EntryExitAnimationFunction | LayoutAnimationFunction => {
    throw new Error('[Reanimated] Unimplemented method in child class.');
  };

  /**
   * Lets you adjust the animation duration. Can be chained alongside other [layout animation modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param durationMs - Length of the animation (in milliseconds).
   */
  static duration<T extends typeof BaseAnimationBuilder>(
    this: T,
    durationMs: number
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.duration(durationMs);
  }

  duration(durationMs: number): this {
    this.durationV = durationMs;
    return this;
  }

  /**
   * Lets you adjust the delay before the animation starts (in milliseconds). Can be chained alongside other [layout animation modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param delayMs - Delay before the animation starts (in milliseconds).
   */
  static delay<T extends typeof BaseAnimationBuilder>(
    this: T,
    delayMs: number
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.delay(delayMs);
  }

  delay(delayMs: number): this {
    this.delayV = delayMs;
    return this;
  }

  /**
   * The callback that will fire after the animation ends. Can be chained alongside other [layout animation modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param callback - Callback that will fire after the animation ends.
   */
  static withCallback<T extends typeof BaseAnimationBuilder>(
    this: T,
    callback: (finished: boolean) => void
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.withCallback(callback);
  }

  withCallback(callback: (finished: boolean) => void): this {
    this.callbackV = callback;
    return this;
  }

  /**
   * Lets you adjust the behavior when the device's reduced motion accessibility setting is turned on.  Can be chained alongside other [layout animation modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param reduceMotion - Determines how the animation responds to the device's reduced motion accessibility setting. Default to `ReduceMotion.System` - {@link ReduceMotion}.
   */
  static reduceMotion<T extends typeof BaseAnimationBuilder>(
    this: T,
    reduceMotion: ReduceMotion
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.reduceMotion(reduceMotion);
  }

  reduceMotion(reduceMotionV: ReduceMotion): this {
    this.reduceMotionV = reduceMotionV;
    return this;
  }

  // 300ms is the default animation duration. If any animation has different default has to override this method.
  static getDuration(): number {
    return 300;
  }

  getDuration(): number {
    return this.durationV ?? 300;
  }

  /**
   * @deprecated Use `.delay()` with `Math.random()` instead
   */
  static randomDelay<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.randomDelay();
  }

  randomDelay(): this {
    this.randomizeDelay = true;
    return this;
  }

  // when randomizeDelay is set to true, randomize delay between 0 and provided value (or 1000ms if delay is not provided)
  getDelay(): number {
    return this.randomizeDelay
      ? Math.random() * (this.delayV ?? 1000)
      : this.delayV ?? 0;
  }

  getReduceMotion(): ReduceMotion {
    return this.reduceMotionV;
  }

  getDelayFunction(): AnimationFunction {
    const isDelayProvided = this.randomizeDelay || this.delayV;
    const reduceMotion = this.getReduceMotion();
    return isDelayProvided
      ? (delay, animation) => {
          'worklet';
          return withDelay(delay, animation, reduceMotion);
        }
      : (_, animation) => {
          'worklet';
          animation.reduceMotion = getReduceMotionFromConfig(reduceMotion);
          return animation;
        };
  }

  static build<T extends typeof BaseAnimationBuilder>(
    this: T
  ): EntryExitAnimationFunction | LayoutAnimationFunction {
    const instance = this.createInstance();
    return instance.build();
  }
}
