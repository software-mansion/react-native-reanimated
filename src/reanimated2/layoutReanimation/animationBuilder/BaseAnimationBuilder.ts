import { withDelay } from '../../animation';
import {
  EntryExitAnimationFunction,
  AnimationFunction,
  LayoutAnimationFunction,
} from './commonTypes';

export class BaseAnimationBuilder {
  durationV?: number;
  delayV?: number;
  callbackV?: (finished: boolean) => void;

  static createInstance: () => BaseAnimationBuilder;
  build = (): EntryExitAnimationFunction | LayoutAnimationFunction => {
    throw Error('Unimplemented method in child class.');
  };

  static duration(durationMs: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.duration(durationMs);
  }

  duration(durationMs: number): BaseAnimationBuilder {
    this.durationV = durationMs;
    return this;
  }

  static delay(delayMs: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.delay(delayMs);
  }

  delay(delayMs: number): BaseAnimationBuilder {
    this.delayV = delayMs;
    return this;
  }

  static withCallback(
    callback: (finished: boolean) => void
  ): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.withCallback(callback);
  }

  withCallback(callback: (finsihed: boolean) => void): BaseAnimationBuilder {
    this.callbackV = callback;
    return this;
  }

  getDelayFunction(): AnimationFunction {
    const delay = this.delayV;
    return delay
      ? withDelay
      : (_, animation) => {
          'worklet';
          return animation;
        };
  }

  static build(): EntryExitAnimationFunction | LayoutAnimationFunction {
    const instance = this.createInstance();
    return instance.build();
  }
}
