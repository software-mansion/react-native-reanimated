'use strict';
import type {
  Perspective,
  RotateX,
  RotateY,
  TranslateX,
  TranslateY,
} from '../../common';
import type {
  AnimationConfigFunction,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
  IEntryAnimationBuilder,
  IEntryExitAnimationBuilder,
  IExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import {
  ComplexAnimationBuilder,
  pickTransformInitialValue,
} from '../animationBuilder';

/**
 * Rotate from top on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipInXUp
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateX: RotateX['rotateX'];
    translateY: TranslateY['translateY'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateX, TranslateY];
  }>
  implements IEntryAnimationBuilder
{
  static presetName = 'FlipInXUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipInXUp() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateX: pickTransformInitialValue(
                initialValues,
                'rotateX',
                1,
                '90deg'
              ),
            },
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                2,
                -targetValues.targetHeight
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: 500 },
            { rotateX: delayFunction(delay, animation('0deg', config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Rotate from left on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipInYLeft
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateY: RotateY['rotateY'];
    translateX: TranslateX['translateX'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateY, TranslateX];
  }>
  implements IEntryAnimationBuilder
{
  static presetName = 'FlipInYLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipInYLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateY: pickTransformInitialValue(
                initialValues,
                'rotateY',
                1,
                '-90deg'
              ),
            },
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                2,
                -targetValues.targetWidth
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Rotate from bottom on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipInXDown
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateX: RotateX['rotateX'];
    translateY: TranslateY['translateY'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateX, TranslateY];
  }>
  implements IEntryAnimationBuilder
{
  static presetName = 'FlipInXDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipInXDown() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateX: pickTransformInitialValue(
                initialValues,
                'rotateX',
                1,
                '-90deg'
              ),
            },
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                2,
                targetValues.targetHeight
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('0deg', config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Rotate from right on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipInYRight
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateY: RotateY['rotateY'];
    translateX: TranslateX['translateX'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateY, TranslateX];
  }>
  implements IEntryAnimationBuilder
{
  static presetName = 'FlipInYRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipInYRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateY: pickTransformInitialValue(
                initialValues,
                'rotateY',
                1,
                '90deg'
              ),
            },
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                2,
                targetValues.targetWidth
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Eased rotate in on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipInEasyX
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateX: RotateX['rotateX'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FlipInEasyX';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipInEasyX() as InstanceType<T>;
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
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateX: pickTransformInitialValue(
                initialValues,
                'rotateX',
                1,
                '90deg'
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Eased rotate in on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipInEasyY
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateY: RotateY['rotateY'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FlipInEasyY';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipInEasyY() as InstanceType<T>;
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
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateY: pickTransformInitialValue(
                initialValues,
                'rotateY',
                1,
                '90deg'
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Rotate to top animation on the X axis. You can modify the behavior by
 * chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipOutXUp
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateX: RotateX['rotateX'];
    translateY: TranslateY['translateY'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateX, TranslateY];
  }>
  implements IExitAnimationBuilder
{
  static presetName = 'FlipOutXUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipOutXUp() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateX: pickTransformInitialValue(
                initialValues,
                'rotateX',
                1,
                '0deg'
              ),
            },
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                2,
                0
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('90deg', config)) },
            {
              translateY: delayFunction(
                delay,
                animation(-targetValues.currentHeight, config)
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
 * Rotate to left on the Y axis. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipOutYLeft
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateY: RotateY['rotateY'];
    translateX: TranslateX['translateX'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateY, TranslateX];
  }>
  implements IExitAnimationBuilder
{
  static presetName = 'FlipOutYLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipOutYLeft() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateY: pickTransformInitialValue(
                initialValues,
                'rotateY',
                1,
                '0deg'
              ),
            },
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                2,
                0
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('-90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(-targetValues.currentWidth, config)
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
 * Rotate to bottom on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipOutXDown
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateX: RotateX['rotateX'];
    translateY: TranslateY['translateY'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateX, TranslateY];
  }>
  implements IExitAnimationBuilder
{
  static presetName = 'FlipOutXDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipOutXDown() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateX: pickTransformInitialValue(
                initialValues,
                'rotateX',
                1,
                '0deg'
              ),
            },
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                2,
                0
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('-90deg', config)) },
            {
              translateY: delayFunction(
                delay,
                animation(targetValues.currentHeight, config)
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
 * Rotate to right animation on the Y axis. You can modify the behavior by
 * chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipOutYRight
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateY: RotateY['rotateY'];
    translateX: TranslateX['translateX'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateY, TranslateX];
  }>
  implements IExitAnimationBuilder
{
  static presetName = 'FlipOutYRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipOutYRight() as InstanceType<T>;
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (targetValues) => {
      'worklet';
      return {
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateY: pickTransformInitialValue(
                initialValues,
                'rotateY',
                1,
                '0deg'
              ),
            },
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                2,
                0
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(targetValues.currentWidth, config)
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
 * Eased rotate on the X axis. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipOutEasyX
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateX: RotateX['rotateX'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FlipOutEasyX';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipOutEasyX() as InstanceType<T>;
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
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateX: pickTransformInitialValue(
                initialValues,
                'rotateX',
                1,
                '0deg'
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('90deg', config)) },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Eased rotate on the Y axis. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#flip
 */
export class FlipOutEasyY
  extends ComplexAnimationBuilder<{
    perspective: Perspective['perspective'];
    rotateY: RotateY['rotateY'];
    /** @deprecated Use flat top-level props instead. */
    transform?: [Perspective, RotateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FlipOutEasyY';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FlipOutEasyY() as InstanceType<T>;
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
        initialValues: {
          transform: [
            {
              perspective: pickTransformInitialValue(
                initialValues,
                'perspective',
                0,
                500
              ),
            },
            {
              rotateY: pickTransformInitialValue(
                initialValues,
                'rotateY',
                1,
                '0deg'
              ),
            },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('90deg', config)) },
          ],
        },
        callback,
      };
    };
  };
}
