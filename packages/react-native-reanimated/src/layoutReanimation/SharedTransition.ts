'use strict';
import { logger } from '../common';
import type {
  ILayoutAnimationBuilder,
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

/** Values passed to shared transition animation worklets. */
export type SharedTransitionAnimationsValues = {
  targetOriginX: number;
  targetOriginY: number;
  targetGlobalOriginX: number;
  targetGlobalOriginY: number;
  targetWidth: number;
  targetHeight: number;
  targetBorderRadius: number;
  targetOpacity: number;
  targetBackgroundColor: string;
  // TODO: check before merge
  targetTransform: Array<Record<string, number | string>>;
  // TODO: check before merge
  targetTransformOrigin: number[];
  currentOriginX: number;
  currentOriginY: number;
  currentGlobalOriginX: number;
  currentGlobalOriginY: number;
  currentWidth: number;
  currentHeight: number;
  currentBorderRadius: number;
  currentOpacity: number;
  currentBackgroundColor: string;
  // TODO: check before merge
  currentTransform: Array<Record<string, number | string>>;
  // TODO: check before merge
  currentTransformOrigin: number[];
  windowWidth: number;
  windowHeight: number;
};

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
   *       width: withSpring(values.targetWidth),
   *       height: withSpring(values.targetHeight),
   *       originX: withSpring(values.targetOriginX),
   *       originY: withSpring(values.targetOriginY),
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
   *       width: withSpring(values.targetWidth),
   *       height: withSpring(values.targetHeight),
   *     };
   *   }).progressAnimation((values, progress) => {
   *     'worklet';
   *     return {
   *       width: values.currentWidth + progress * (values.targetWidth - values.currentWidth),
   *       height: values.currentHeight + progress * (values.targetHeight - values.currentHeight),
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

    // If we have a custom animation factory, use it
    if (customAnimationFactory) {
      const callback = this.callbackV;

      return (layoutAnimationValues) => {
        'worklet';
        const values =
          layoutAnimationValues as SharedTransitionAnimationsValues;
        const animations = customAnimationFactory(values);
        const initialValues: StyleProps = {};
        for (const key in values) {
          if (key.startsWith('current')) {
            const prop = (key[7].toLowerCase() +
              key.slice(8)) as keyof StyleProps;
            initialValues[prop] =
              values[key as keyof SharedTransitionAnimationsValues];
          }
        }
        return {
          initialValues,
          animations,
          callback,
        };
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
      const valuesRecord = values as unknown as Record<string, unknown>;
      const animationFactory = (value: number | string) => {
        return delayFunction(delay, animation(value, config));
      };
      const initialValues: StyleProps = {};
      const animations: StyleProps = {};

      for (const sourceKey in valuesRecord) {
        if (!sourceKey.startsWith('current')) {
          continue;
        }
        const prop = sourceKey[7].toLowerCase() + sourceKey.slice(8);
        const targetKey =
          'target' + sourceKey[7].toUpperCase() + sourceKey.slice(8);
        initialValues[prop] = valuesRecord[sourceKey] as number | string;

        const target = valuesRecord[targetKey];
        if (Array.isArray(target)) {
          if (prop === 'transform') {
            // TODO (future): do proper transform interpolation
            const transforms = target as Array<Record<string, number | string>>;
            (animations as Record<string, unknown>)[prop] = transforms.map(
              (item) => {
                const transformKey = Object.keys(item)[0];
                return {
                  [transformKey]: animationFactory(item[transformKey]),
                };
              }
            );
          } else if (prop === 'boxShadow') {
            const shadows = target as Array<Record<string, number | string>>;
            (animations as Record<string, unknown>)[prop] = shadows.map(
              (item) => {
                const boxShadow: Record<string, unknown> = {};
                for (const shadowKey of Object.keys(item)) {
                  boxShadow[shadowKey] = animationFactory(item[shadowKey]);
                }
                return boxShadow;
              }
            );
          } else if (prop === 'transformOrigin') {
            const origin = target as Array<number | string>;
            animations[prop] = origin.map(animationFactory);
          } else {
            logger.error(`Unexpected array in SharedTransition: ${prop}`);
          }
        } else {
          animations[prop] = animationFactory(target as number | string);
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
