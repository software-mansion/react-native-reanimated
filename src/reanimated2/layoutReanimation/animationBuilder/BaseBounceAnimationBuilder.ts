import { withDelay, withTiming } from '../../animations';
import {
  EntryExitAnimationFunction,
  AnimationFunction,
  LayoutAnimationAndConfig,
  BounceBuilderAnimationConfig,
  EntryExitAnimationBuild,
} from './commonTypes';

export class BaseBounceAnimationBuilder {
  durationV?: number;
  delayV?: number;

  static createInstance: () => BaseBounceAnimationBuilder;
  build: EntryExitAnimationBuild = () => {
    throw Error('Unimplemented method in child class.');
  };

  static duration(durationMs: number): BaseBounceAnimationBuilder {
    const instance = this.createInstance();
    return instance.duration(durationMs);
  }

  duration(durationMs: number): BaseBounceAnimationBuilder {
    this.durationV = durationMs;
    return this;
  }

  static delay(delayMs: number): BaseBounceAnimationBuilder {
    const instance = this.createInstance();
    return instance.delay(delayMs);
  }

  delay(delayMs: number): BaseBounceAnimationBuilder {
    this.delayV = delayMs;
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

  getAnimationAndConfig(): LayoutAnimationAndConfig {
    const duration = this.durationV;
    const type = withTiming;
    const animation = type;

    const config: BounceBuilderAnimationConfig = {};

    if (duration) {
      config.duration = duration;
    }

    return [animation, config];
  }

  static build(): EntryExitAnimationFunction {
    const instance = this.createInstance();
    return instance.build();
  }
}
