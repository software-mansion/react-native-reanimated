'use strict';
import { logger } from '../common';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../commonTypes';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SharedTransition';

  crossfadeV = false;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
  }

  /**
   * Shows both views during the transition: the source view fades out and the
   * target view fades in, in the same moving frame. Use it when the two views
   * have different children. Can be chained alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   */
  static crossfade<T extends typeof SharedTransition>(
    this: T
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.crossfade();
  }

  crossfade(): this {
    this.crossfadeV = true;
    return this;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    if (!this.durationV) {
      this.durationV = 500;
    }
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (valuesUntyped) => {
      'worklet';
      const values = valuesUntyped as unknown as {
        source: Record<string, number | string>;
        target: Record<string, number | string>;
        fadesOut?: boolean;
      };
      const animationFactory = (value: number | string) => {
        return delayFunction(delay, animation(value, config));
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initialValues: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const animations: any = {};
      for (let key in values.source) {
        initialValues[key] = values.source[key];

        const target = values.target[key];
        if (Array.isArray(target)) {
          if (key === 'transform') {
            // TODO (future): do proper transform interpolation
            animations[key] = target.map(
              (item: Record<string, number | string>) => {
                key = Object.keys(item)[0];
                return {
                  [key]: animationFactory(item[key]),
                };
              }
            );
          } else if (key === 'boxShadow') {
            animations[key] = target.map(
              (item: Record<string, number | string>) => {
                const boxShadow: Record<string, unknown> = {};
                for (const shadowKey of Object.keys(item)) {
                  boxShadow[shadowKey] = animationFactory(item[shadowKey]);
                }
                return boxShadow;
              }
            );
          } else if (key === 'transformOrigin') {
            animations[key] = target.map(animationFactory);
          } else {
            logger.error(`Unexpected array in SharedTransition: ${key}`);
          }
        } else {
          animations[key] = animationFactory(values.target[key]);
        }
      }

      return {
        initialValues,
        animations,
        // In a crossfade both views animate, and the callback runs for the view that fades in.
        callback: values.fadesOut ? undefined : callback,
      };
    };
  };
}
