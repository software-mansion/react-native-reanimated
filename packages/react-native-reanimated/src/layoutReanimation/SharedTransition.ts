'use strict';
import { withTiming } from '../animation';
import { logger } from '../common';
import type {
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
  LayoutAnimation,
  LayoutAnimationFunction,
  StyleProps,
} from '../commonTypes';
import { Easing } from '../Easing';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

const DEFAULT_DURATION = 500;

export type FadeContentConfig = {
  /**
   * The fade-out of the children of the moving view. `end` is the progress of
   * the move, more than 0 and at most 1, at which they reach opacity 0. A value
   * below 0.000001 works as 0.000001. Defaults to 1.
   */
  fadeOut?: { end?: number };
  /**
   * The fade-in of the children of the target view after the move. `duration`
   * is in milliseconds. Defaults to half of the transition duration, or 250 ms
   * when `springify()` gets no duration.
   */
  fadeIn?: { duration?: number };
};

export type SharedTransitionContentFade = {
  fadeIn: EntryExitAnimationFunction;
  fadeOutEnd: number;
};

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

  fadeContentV?: FadeContentConfig;

  private customAnimationFactory?: CustomSharedTransitionAnimation;
  private progressAnimationFactory?: ProgressSharedTransitionAnimation;
  private transitionType: SharedTransitionType = SharedTransitionType.ANIMATION;

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
    const { fadeOut, fadeIn } = validFadeContentConfig(config);
    this.fadeContentV = {
      fadeOut: { end: validFadeOutEnd(validOptions('fadeOut', fadeOut)?.end) },
      fadeIn: {
        duration: validFadeInDuration(validOptions('fadeIn', fadeIn)?.duration),
      },
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
    this.durationV ??= DEFAULT_DURATION;
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (valuesUntyped) => {
      'worklet';
      const values =
        valuesUntyped as unknown as SharedTransitionAnimationsValues;
      const animationFactory = (
        value: number | string,
        contentOpacity = false
      ) => {
        return delayFunction(
          delay,
          animation(
            value,
            contentOpacity ? { ...config, overshootClamping: true } : config
          )
        );
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
            animations[key] = target.map((value) => animationFactory(value));
          } else {
            logger.error(`Unexpected array in SharedTransition: ${key}`);
          }
        } else {
          animations[key] = animationFactory(
            values.target[key] as number | string,
            key === 'contentOpacity'
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

function isOptionsObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validFadeContentConfig(config: unknown): FadeContentConfig {
  if (isOptionsObject(config)) {
    return config;
  }
  logger.warnOnce(
    `fadeContent: the config must be an object, got ${describeValue(config)}. The defaults are used.`,
    0
  );
  return {};
}

function validOptions<T extends object>(
  name: keyof FadeContentConfig,
  options: T | undefined
) {
  if (options === undefined || isOptionsObject(options)) {
    return options;
  }
  logger.warnOnce(
    `fadeContent: ${name} must be an object, got ${describeValue(options)}. The defaults are used.`,
    0
  );
  return undefined;
}

function validFadeOutEnd(end: number | undefined) {
  if (end === undefined || (typeof end === 'number' && end > 0 && end <= 1)) {
    return end;
  }
  logger.warnOnce(
    `fadeContent: fadeOut.end must be more than 0 and at most 1, got ${describeValue(end)}. The default 1 is used.`,
    0
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
  logger.warnOnce(
    `fadeContent: fadeIn.duration must be a finite number of milliseconds, 0 or more, got ${describeValue(duration)}. The default is used.`,
    0
  );
  return undefined;
}

function describeValue(value: unknown) {
  return typeof value === 'string' || Array.isArray(value)
    ? JSON.stringify(value)
    : String(value);
}
