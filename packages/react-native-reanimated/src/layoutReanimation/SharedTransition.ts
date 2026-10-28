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

export type FadeContentConfig = {
  /**
   * The fade-out of the children of the moving view. `end` is the part of the
   * move, more than 0 and at most 1, at which they reach opacity 0. Defaults to
   * 1.
   */
  fadeOut?: { end?: number };
  /**
   * The fade-in of the children of the target view after the move. `duration`
   * is in milliseconds. Defaults to half of the transition duration.
   */
  fadeIn?: { duration?: number };
};

export type SharedTransitionContentFade = {
  fadeIn: EntryExitAnimationFunction;
  fadeOutEnd: number;
};

export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SharedTransition';

  fadeContentV?: FadeContentConfig;

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
   *
   * @param config - When the fade-out ends and how long the fade-in lasts.
   */
  static fadeContent<T extends typeof SharedTransition>(
    this: T,
    config?: FadeContentConfig
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.fadeContent(config);
  }

  fadeContent(config: FadeContentConfig = {}): this {
    this.fadeContentV = {
      fadeOut: { end: validFadeOutEnd(config.fadeOut?.end) },
      fadeIn: { duration: validFadeInDuration(config.fadeIn?.duration) },
    };
    return this;
  }

  buildContentFade(): SharedTransitionContentFade | undefined {
    if (!this.fadeContentV) {
      return undefined;
    }
    const { fadeOut, fadeIn } = this.fadeContentV;
    return {
      fadeIn: this.buildContentFadeIn(
        fadeIn?.duration ?? (this.durationV ?? DEFAULT_DURATION) / 2
      ),
      fadeOutEnd: fadeOut?.end ?? 1,
    };
  }

  private buildContentFadeIn(duration: number): EntryExitAnimationFunction {
    const config = {
      duration,
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

function validFadeOutEnd(end: number | undefined) {
  if (end === undefined || (typeof end === 'number' && end > 0 && end <= 1)) {
    return end;
  }
  logger.warn(
    `fadeContent: fadeOut.end must be more than 0 and at most 1, got ${end}. The default 1 is used.`
  );
  return undefined;
}

function validFadeInDuration(duration: number | undefined) {
  if (
    duration === undefined ||
    (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0)
  ) {
    return duration;
  }
  logger.warn(
    `fadeContent: fadeIn.duration must be a finite number of milliseconds, 0 or more, got ${duration}. The default is used.`
  );
  return undefined;
}
