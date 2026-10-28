'use strict';
import { logger } from '../common';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../commonTypes';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';
import type { CrossfadeWindow } from './crossfadeWindow';
import { withCrossfadeWindow } from './crossfadeWindow';

/**
 * The part of the way, from 0 to 1, in which the views of a shared transition
 * fade. The way follows the easing or spring of the transition, so it is not
 * the same as the part of the duration. The default is the whole transition.
 */
export interface SharedTransitionCrossfadeWindow {
  start?: number;
  end?: number;
}

export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SharedTransition';

  crossfadeV?: CrossfadeWindow;

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
   *
   * @param window - The part of the way, from 0 to 1, in which the views fade,
   *   for example `{ end: 0.3 }` for a short fade at the start. Defaults to the
   *   whole transition.
   */
  static crossfade<T extends typeof SharedTransition>(
    this: T,
    window?: SharedTransitionCrossfadeWindow
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.crossfade(window);
  }

  crossfade({
    start = 0,
    end = 1,
  }: SharedTransitionCrossfadeWindow = {}): this {
    const isProgress = (value: unknown) =>
      typeof value === 'number' && value >= 0 && value <= 1;
    if (!isProgress(start) || !isProgress(end) || start >= end) {
      throw new Error(
        `[Reanimated] The crossfade window must have 0 <= start < end <= 1, got start ${start} and end ${end}.`
      );
    }
    this.crossfadeV = { start, end };
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
    const crossfade = this.crossfadeV;
    const fadeWindow =
      crossfade && (crossfade.start > 0 || crossfade.end < 1)
        ? crossfade
        : undefined;

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
        } else if (key === 'opacity' && fadeWindow) {
          animations[key] = delayFunction(
            delay,
            withCrossfadeWindow(
              target as number,
              fadeWindow,
              animation(1, config)
            )
          );
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
