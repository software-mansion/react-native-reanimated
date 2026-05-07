'use strict';
import type {
  EntryExitAnimationFunction,
  EntryExitAnimationsValues,
  IEntryExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type { Rotate, TransformsConfig, TranslateX } from './types';
import { animateTransformToValues, pickTransformValues } from './utils';

/**
 * Roll from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#roll
 */
export class RollInLeft
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Rotate]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'RollInLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollInLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateX: 0 }, { rotate: '0deg' }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: -values.windowWidth }, { rotate: '-180deg' }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Roll from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#roll
 */
export class RollInRight
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Rotate]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'RollInRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollInRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateX: 0 }, { rotate: '0deg' }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: values.windowWidth }, { rotate: '180deg' }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Roll to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#roll
 */
export class RollOutLeft
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Rotate]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'RollOutLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollOutLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateX: -values.windowWidth }, { rotate: '-180deg' }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: 0 }, { rotate: '0deg' }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}

/**
 * Roll to right animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#roll
 */
export class RollOutRight
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Rotate]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'RollOutRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollOutRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateX: values.windowWidth }, { rotate: '180deg' }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: 0 }, { rotate: '0deg' }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}
