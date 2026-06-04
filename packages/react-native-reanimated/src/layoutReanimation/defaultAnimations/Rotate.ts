'use strict';
import type {
  AnimationConfigFunction,
  EntryAnimationsValues,
  ExitAnimationsValues,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type { Rotate, TransformsConfig, TranslateX, TranslateY } from './types';
import { animateTransformToValues, pickTransformValues } from './utils';

/**
 * Rotate to bottom from left edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInDownLeft
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IEntryAnimationBuilder
{
  static presetName = 'RotateInDownLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInDownLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 1, config)
          ),
          transform: animateTransformToValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: pickTransformValues(
            [
              { rotate: '-90deg' },
              { translateX: values.targetWidth / 2 - values.targetHeight / 2 },
              {
                translateY: -(values.targetWidth / 2 - values.targetHeight / 2),
              },
            ],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to bottom from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInDownRight
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IEntryAnimationBuilder
{
  static presetName = 'RotateInDownRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInDownRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 1, config)
          ),
          transform: animateTransformToValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: pickTransformValues(
            [
              { rotate: '90deg' },
              {
                translateX: -(values.targetWidth / 2 - values.targetHeight / 2),
              },
              {
                translateY: -(values.targetWidth / 2 - values.targetHeight / 2),
              },
            ],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to top from left edge. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInUpLeft
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IEntryAnimationBuilder
{
  static presetName = 'RotateInUpLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInUpLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 1, config)
          ),
          transform: animateTransformToValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: pickTransformValues(
            [
              { rotate: '90deg' },
              { translateX: values.targetWidth / 2 - values.targetHeight / 2 },
              { translateY: values.targetWidth / 2 - values.targetHeight / 2 },
            ],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to top from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInUpRight
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IEntryAnimationBuilder
{
  static presetName = 'RotateInUpRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInUpRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 1, config)
          ),
          transform: animateTransformToValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: pickTransformValues(
            [
              { rotate: '-90deg' },
              {
                translateX: -(values.targetWidth / 2 - values.targetHeight / 2),
              },
              { translateY: values.targetWidth / 2 - values.targetHeight / 2 },
            ],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to bottom from left edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutDownLeft
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IExitAnimationBuilder
{
  static presetName = 'RotateOutDownLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutDownLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 0, config)
          ),
          transform: animateTransformToValues(
            [
              { rotate: '90deg' },
              {
                translateX: values.currentWidth / 2 - values.currentHeight / 2,
              },
              {
                translateY: values.currentWidth / 2 - values.currentHeight / 2,
              },
            ],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: pickTransformValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to bottom from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutDownRight
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IExitAnimationBuilder
{
  static presetName = 'RotateOutDownRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutDownRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 0, config)
          ),
          transform: animateTransformToValues(
            [
              { rotate: '-90deg' },
              {
                translateX: -(
                  values.currentWidth / 2 -
                  values.currentHeight / 2
                ),
              },
              {
                translateY: values.currentWidth / 2 - values.currentHeight / 2,
              },
            ],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: pickTransformValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to top from left edge. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutUpLeft
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IExitAnimationBuilder
{
  static presetName = 'RotateOutUpLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutUpLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 0, config)
          ),
          transform: animateTransformToValues(
            [
              { rotate: '-90deg' },
              {
                translateX: values.currentWidth / 2 - values.currentHeight / 2,
              },
              {
                translateY: -(
                  values.currentWidth / 2 -
                  values.currentHeight / 2
                ),
              },
            ],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: pickTransformValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to top from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutUpRight
  extends ComplexAnimationBuilder<
    { opacity: number } & TransformsConfig<[Rotate, TranslateX, TranslateY]>
  >
  implements IExitAnimationBuilder
{
  static presetName = 'RotateOutUpRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutUpRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const [animation, config] = animationAndConfig;
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(
            delay,
            animation(targetValues?.opacity ?? 0, config)
          ),
          transform: animateTransformToValues(
            [
              { rotate: '90deg' },
              {
                translateX: -(
                  values.currentWidth / 2 -
                  values.currentHeight / 2
                ),
              },
              {
                translateY: -(
                  values.currentWidth / 2 -
                  values.currentHeight / 2
                ),
              },
            ],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: pickTransformValues(
            [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}
