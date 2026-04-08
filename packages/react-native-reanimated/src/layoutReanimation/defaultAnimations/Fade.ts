'use strict';
import type { TranslateX, TranslateY } from '../../common';
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
 * Fade in animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeIn
  extends ComplexAnimationBuilder<{ opacity: number }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeIn';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeIn() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
        },
        callback,
      };
    };
  };
}

/**
 * Fade from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInRight
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeInRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeInRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: [
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                0,
                25
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
 * Fade from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInLeft
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeInLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeInLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: [
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                0,
                -25
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
 * Fade from top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInUp
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeInUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeInUp() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: [
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                0,
                -25
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
 * Fade from bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInDown
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeInDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeInDown() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 0,
          transform: [
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                0,
                25
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
 * Fade out animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOut
  extends ComplexAnimationBuilder<{ opacity: number }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeOut';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeOut() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
        },
        callback,
      };
    };
  };
}

/**
 * Fade to right animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutRight
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeOutRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeOutRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { translateX: delayFunction(delay, animation(25, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: [
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                0,
                0
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
 * Fade to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutLeft
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeOutLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeOutLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { translateX: delayFunction(delay, animation(-25, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: [
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                0,
                0
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
 * Fade to top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutUp
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeOutUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeOutUp() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { translateY: delayFunction(delay, animation(-25, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: [
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                0,
                0
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
 * Fade to bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutDown
  extends ComplexAnimationBuilder<{
    opacity: number;
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'FadeOutDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadeOutDown() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { translateY: delayFunction(delay, animation(25, config)) },
          ],
        },
        initialValues: {
          opacity: initialValues?.opacity ?? 1,
          transform: [
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                0,
                0
              ),
            },
          ],
        },
        callback,
      };
    };
  };
}
