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

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
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
      };
      const animationFactory = (value: number | string) => {
        return delayFunction(delay, animation(value, config));
      };
      const initialValues: any = {};
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
        callback,
      };
    };
  };
}
