'use strict';
import { withTiming } from '../animation';
import { logger } from '../common';
import type {
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../commonTypes';
import { Easing } from '../Easing';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

const DEFAULT_DURATION = 500;

export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SharedTransition';

  fadeContentV = false;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
  }

  /**
   * Fades the children of the shared view out while it moves, and fades the
   * children of the target view in when it lands. The shared view itself stays
   * visible. Use it when the two views have different children. Can be chained
   * alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   */
  static fadeContent<T extends typeof SharedTransition>(
    this: T
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.fadeContent();
  }

  fadeContent(): this {
    this.fadeContentV = true;
    return this;
  }

  // The children of the target view fade in after the move, in half of its duration.
  buildContentFadeIn(): EntryExitAnimationFunction | undefined {
    if (!this.fadeContentV) {
      return undefined;
    }
    const config = {
      duration: (this.durationV ?? DEFAULT_DURATION) / 2,
      easing: Easing.out(Easing.quad),
      reduceMotion: this.reduceMotionV,
    };
    const fadeIn = (
      values: EntryAnimationsValues & { targetOpacity?: number }
    ) => {
      'worklet';
      const { targetOpacity } = values;
      return {
        initialValues: { opacity: 0 },
        animations: { opacity: withTiming(targetOpacity ?? 1, config) },
      };
    };
    return fadeIn;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    if (!this.durationV) {
      this.durationV = DEFAULT_DURATION;
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
        callback,
      };
    };
  };
}
