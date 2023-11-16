'use strict';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type {
  EntryAnimationsValues,
  ExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

/**
 * Rotate to bottom from left edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInDownLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInDownLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '-90deg' },
            { translateX: values.targetWidth / 2 - values.targetHeight / 2 },
            { translateY: -(values.targetWidth / 2 - values.targetHeight / 2) },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to bottom from right edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInDownRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInDownRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '90deg' },
            { translateX: -(values.targetWidth / 2 - values.targetHeight / 2) },
            { translateY: -(values.targetWidth / 2 - values.targetHeight / 2) },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to top from left edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInUpLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInUpLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '90deg' },
            { translateX: values.targetWidth / 2 - values.targetHeight / 2 },
            { translateY: values.targetWidth / 2 - values.targetHeight / 2 },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to top from right edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInUpRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateInUpRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '-90deg' },
            { translateX: -(values.targetWidth / 2 - values.targetHeight / 2) },
            { translateY: values.targetWidth / 2 - values.targetHeight / 2 },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to bottom from left edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutDownLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutDownLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(
                  values.currentWidth / 2 - values.currentHeight / 2,
                  config
                )
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(
                  values.currentWidth / 2 - values.currentHeight / 2,
                  config
                )
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to bottom from right edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutDownRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutDownRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('-90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(
                  -(values.currentWidth / 2 - values.currentHeight / 2),
                  config
                )
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(
                  values.currentWidth / 2 - values.currentHeight / 2,
                  config
                )
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to top from left edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutUpLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutUpLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('-90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(
                  values.currentWidth / 2 - values.currentHeight / 2,
                  config
                )
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(
                  -(values.currentWidth / 2 - values.currentHeight / 2),
                  config
                )
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

/**
 * Rotate to top from right edge. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutUpRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RotateOutUpRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(
                  -(values.currentWidth / 2 - values.currentHeight / 2),
                  config
                )
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(
                  -(values.currentWidth / 2 - values.currentHeight / 2),
                  config
                )
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}
