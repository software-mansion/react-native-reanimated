'use strict';
import { logger } from '../common';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimation,
  LayoutAnimationFunction,
  StyleProps,
} from '../commonTypes';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

/**
 * Used to configure the `.defaultTransitionType()` shared transition modifier.
 *
 * @experimental
 */
export enum SharedTransitionType {
  /**
   * Use the regular animation for all transitions (screen transitions and swipe
   * back gesture).
   */
  ANIMATION = 'animation',
  /**
   * Use the progress-based animation for all transitions (screen transitions
   * and swipe back gesture).
   */
  PROGRESS_ANIMATION = 'progressAnimation',
}

/**
 * Properties available on both `source` and `target` snapshot objects.
 *
 * These are computed by `PropsDiffer::computeDiff()` in C++ and only include
 * properties whose values differ between the source and target views.
 *
 * Frame properties: `originX`, `originY`, `globalOriginX`, `globalOriginY`,
 * `width`, `height`.
 *
 * Visual properties: `opacity`, `backgroundColor`, `borderRadius` (and
 * per-corner variants), `borderWidth` (and per-side variants), `borderColor`
 * (and per-side variants), `transform`, `transformOrigin`, `boxShadow`,
 * `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`.
 */
export interface SharedTransitionSnapshotValues {
  originX: number;
  originY: number;
  globalOriginX: number;
  globalOriginY: number;
  width: number;
  height: number;
  opacity?: number;
  backgroundColor?: string;
  borderRadius?: number;
  transform?: Array<Record<string, number | string>>;
  transformOrigin?: number[];
  [key: string]: unknown;
}

/**
 * Values passed to shared transition animation worklets.
 *
 * This is the exact shape of the object created by `PropsDiffer::computeDiff()`
 * in C++. It contains `source` and `target` snapshot objects with the
 * properties that differ between the two views, plus window dimensions.
 */
export interface SharedTransitionAnimationsValues {
  source: SharedTransitionSnapshotValues;
  target: SharedTransitionSnapshotValues;
  windowWidth: number;
  windowHeight: number;
}

/**
 * A function that defines a custom shared transition animation. It receives the
 * source/target values and should return an object containing animations for
 * each property.
 */
export type CustomSharedTransitionAnimation = (
  values: SharedTransitionAnimationsValues
) => StyleProps;

/**
 * A function that defines a progress-based shared transition animation. It
 * receives the source/target values along with the progress (0-1) and should
 * return the interpolated style values.
 */
export type ProgressSharedTransitionAnimation = (
  values: SharedTransitionAnimationsValues,
  progress: number
) => StyleProps;

export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SharedTransition';

  private customAnimationFactory?: CustomSharedTransitionAnimation;
  private progressAnimationFactory?: ProgressSharedTransitionAnimation;
  private transitionType: SharedTransitionType = SharedTransitionType.ANIMATION;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
  }

  /**
   * Creates a shared transition with a custom animation worklet.
   *
   * @example
   *   ```tsx
   *   const transition = SharedTransition.custom((values) => {
   *     'worklet';
   *     return {
   *       width: withSpring(values.target.width),
   *       height: withSpring(values.target.height),
   *       originX: withSpring(values.target.originX),
   *       originY: withSpring(values.target.originY),
   *     };
   *   });
   *   ```;
   *
   * @param customAnimationFactory - A worklet function that receives the source
   *   and target values and returns an object containing animations for each
   *   property.
   */
  static custom(
    customAnimationFactory: CustomSharedTransitionAnimation
  ): SharedTransition {
    const instance = new SharedTransition();
    instance.customAnimationFactory = customAnimationFactory;
    return instance;
  }

  /**
   * Defines a progress-based animation for the shared transition. This
   * animation is used during swipe back gestures (iOS only) when
   * `defaultTransitionType` is set to `SharedTransitionType.ANIMATION`.
   *
   * @example
   *   ```tsx
   *   const transition = SharedTransition.custom((values) => {
   *     'worklet';
   *     return {
   *       width: withSpring(values.target.width),
   *       height: withSpring(values.target.height),
   *     };
   *   }).progressAnimation((values, progress) => {
   *     'worklet';
   *     return {
   *       width: values.source.width + progress * (values.target.width - values.source.width),
   *       height: values.source.height + progress * (values.target.height - values.source.height),
   *     };
   *   });
   *   ```;
   *
   * @param progressAnimationFactory - A worklet function that receives the
   *   source and target values along with the progress (0-1) and returns the
   *   interpolated style values.
   */
  progressAnimation(
    progressAnimationFactory: ProgressSharedTransitionAnimation
  ): this {
    this.progressAnimationFactory = progressAnimationFactory;
    return this;
  }

  /**
   * Sets the default transition type for the shared transition.
   *
   * - `SharedTransitionType.ANIMATION` - Uses the custom animation for screen
   *   transitions and the progress animation for swipe back gestures.
   * - `SharedTransitionType.PROGRESS_ANIMATION` - Uses the progress animation for
   *   both screen transitions and swipe back gestures.
   *
   * @param transitionType - The transition type to use.
   */
  defaultTransitionType(transitionType: SharedTransitionType): this {
    this.transitionType = transitionType;
    return this;
  }

  build = (): LayoutAnimationFunction => {
    const customAnimationFactory = this.customAnimationFactory;
    const progressAnimationFactory = this.progressAnimationFactory;
    const transitionType = this.transitionType;

    // If we have a custom animation factory, use it
    if (customAnimationFactory) {
      const callback = this.callbackV;

      return (valuesUntyped) => {
        'worklet';
        const values =
          valuesUntyped as unknown as SharedTransitionAnimationsValues;

        // Get animations from the custom factory
        const animations = customAnimationFactory(values);

        // Build initial values from source
        const initialValues: StyleProps = {};
        for (const key in values.source) {
          initialValues[key] = values.source[key];
        }

        return {
          initialValues,
          animations,
          callback,
        } as LayoutAnimation;
      };
    }

    // Default behavior - use the inherited ComplexAnimationBuilder logic
    const delayFunction = this.getDelayFunction();
    if (!this.durationV) {
      this.durationV = 500;
    }
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (valuesUntyped) => {
      'worklet';
      const values =
        valuesUntyped as unknown as SharedTransitionAnimationsValues;
      const animationFactory = (value: number | string) => {
        return delayFunction(delay, animation(value, config));
      };
      const initialValues: StyleProps = {};
      const animations: StyleProps = {};

      for (const key in values.source) {
        initialValues[key] = values.source[key];

        const target = values.target[key];
        if (Array.isArray(target)) {
          if (key === 'transform') {
            // TODO (future): do proper transform interpolation
            (animations as Record<string, unknown>)[key] = target.map(
              (item: Record<string, number | string>) => {
                const transformKey = Object.keys(item)[0];
                return {
                  [transformKey]: animationFactory(item[transformKey]),
                };
              }
            );
          } else if (key === 'boxShadow') {
            (animations as Record<string, unknown>)[key] = target.map(
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
          animations[key] = animationFactory(
            values.target[key] as number | string
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

  /**
   * Gets the progress animation factory if one was defined. This is used
   * internally by the layout animations system.
   */
  getProgressAnimation(): ProgressSharedTransitionAnimation | undefined {
    return this.progressAnimationFactory;
  }

  /**
   * Gets the transition type configured for this shared transition. This is
   * used internally by the layout animations system.
   */
  getTransitionType(): SharedTransitionType {
    return this.transitionType;
  }
}
