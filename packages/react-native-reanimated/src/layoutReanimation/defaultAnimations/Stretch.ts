'use strict';
import type {
  EntryExitAnimationFunction,
  IEntryExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type { ScaleX, ScaleY, TransformsConfig } from './types';
import { animateTransformToValues, pickTransformValues } from './utils';

/**
 * Stretch animation on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchInX
  extends ComplexAnimationBuilder<TransformsConfig<[ScaleX]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'StretchInX';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchInX() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ scaleX: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues([{ scaleX: 0 }], initialValues),
        },
        callback,
      };
    };
  };
}

/**
 * Stretch animation on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchInY
  extends ComplexAnimationBuilder<TransformsConfig<[ScaleY]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'StretchInY';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchInY() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ scaleY: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues([{ scaleY: 0 }], initialValues),
        },
        callback,
      };
    };
  };
}

/**
 * Stretch animation on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchOutX
  extends ComplexAnimationBuilder<TransformsConfig<[ScaleX]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'StretchOutX';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchOutX() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ scaleX: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues([{ scaleX: 1 }], initialValues),
        },
        callback,
      };
    };
  };
}

/**
 * Stretch animation on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchOutY
  extends ComplexAnimationBuilder<TransformsConfig<[ScaleY]>>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'StretchOutY';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchOutY() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ scaleY: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues([{ scaleY: 1 }], initialValues),
        },
        callback,
      };
    };
  };
}
