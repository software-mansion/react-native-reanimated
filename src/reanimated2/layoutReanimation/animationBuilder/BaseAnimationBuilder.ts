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

  static withCallback<T extends typeof BaseAnimationBuilder>(
    this: T,
    callback: (finished: boolean) => void
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.withCallback(callback);
  }

  withCallback(callback: (finsihed: boolean) => void): this {
    this.callbackV = callback;
    return this;
  }

  static reduceMotion<T extends typeof BaseAnimationBuilder>(
    this: T,
    reduceMotionV: ReduceMotion
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.reduceMotion(reduceMotionV);
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
