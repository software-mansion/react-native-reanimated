'use strict';
import type { Rotate, Scale } from '../../common';
import type {
  EntryExitAnimationFunction,
  IEntryExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import {
  ComplexAnimationBuilder,
  pickTransformInitialValue,
} from '../animationBuilder';

/**
 * Entry with change in rotation, scale, and opacity. You can modify the
 * behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#pinwheel
 */
export class PinwheelIn
  extends ComplexAnimationBuilder<{
    opacity: number;
    scale: Scale['scale'];
    rotate: Rotate['rotate'];
    /** @deprecated Pass `scale` and `rotate` as top-level properties instead. */
    transform?: [Scale, Rotate];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'PinwheelIn';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new PinwheelIn() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            {
              scale: delayFunction(delay, animation(1, config)),
            },
            {
              rotate: delayFunction(delay, animation('0rad', config)),
            },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: [
            {
              scale: pickTransformInitialValue(initialValues, 'scale', 0, 0),
            },
            {
              rotate: pickTransformInitialValue(
                initialValues,
                'rotate',
                1,
                '5rad'
              ),
            },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Exit with change in rotation, scale, and opacity. You can modify the behavior
 * by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#pinwheel
 */
export class PinwheelOut
  extends ComplexAnimationBuilder<{
    opacity: number;
    scale: Scale['scale'];
    rotate: Rotate['rotate'];
    /** @deprecated Pass `scale` and `rotate` as top-level properties instead. */
    transform?: [Scale, Rotate];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'PinwheelOut';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new PinwheelOut() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            {
              scale: delayFunction(delay, animation(0, config)),
            },
            {
              rotate: delayFunction(delay, animation('5rad', config)),
            },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: [
            {
              scale: pickTransformInitialValue(initialValues, 'scale', 0, 1),
            },
            {
              rotate: pickTransformInitialValue(
                initialValues,
                'rotate',
                1,
                '0rad'
              ),
            },
          ],
        },
        callback,
      };
    };
  };
}
