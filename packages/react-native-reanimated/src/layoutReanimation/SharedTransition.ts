'use strict';
import { withTiming } from '../animation';
import type {
  ILayoutAnimationBuilder,
} from '../commonTypes';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

/**
 * Linearly transforms the layout from one position to another. You can modify
 * the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#linear-transition
 */
export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'LinearTransition';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
  }

  build = (): any => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (values: any) => {
      'worklet';
      
      const initialValues: any = {};
      const animations: any = {};
      for (const key in values.source) {
        initialValues[key] = values.source[key];

        const target = values.target[key];
        if (Array.isArray(target)) {
          if (key === 'transform') {
            animations[key] = target.map((item: Record<string, unknown>) => {
              const key = Object.keys(item)[0];
              return {
                [key]: delayFunction(delay, animation(item[key], config)),
              }
            });
          } else if (key === 'boxShadow') {
            animations[key] = target.map((item: Record<string, unknown>) => {
              const boxShadow:Record<string, unknown> = {};
              for (const shadowKey of Object.keys(item)) {
                boxShadow[shadowKey] = delayFunction(
                  delay,
                  animation(item[shadowKey], config)
                );
              }
              return boxShadow;
            });
          } else {
            console.error('Unexpected array in SharedTransition:', key);
          }
        } else {
          animations[key] = delayFunction(
            delay,
            animation(values.target[key], config)
          );
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
