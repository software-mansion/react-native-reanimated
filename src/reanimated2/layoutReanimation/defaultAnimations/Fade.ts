'use strict';
import type {
  IEntryExitAnimationBuilder,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';

/**
 * Fade in animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 *  You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeIn
  extends ComplexAnimationBuilder
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
          opacity: 0,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade from right animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInRight
  extends ComplexAnimationBuilder
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
          opacity: 0,
          transform: [{ translateX: 25 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade from left animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInLeft
  extends ComplexAnimationBuilder
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
          opacity: 0,
          transform: [{ translateX: -25 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade from top animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInUp
  extends ComplexAnimationBuilder
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
          opacity: 0,
          transform: [{ translateY: -25 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade from bottom animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInDown
  extends ComplexAnimationBuilder
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
          opacity: 0,
          transform: [{ translateY: 25 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade out animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOut
  extends ComplexAnimationBuilder
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
          opacity: 1,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade to right animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutRight
  extends ComplexAnimationBuilder
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
          opacity: 1,
          transform: [{ translateX: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade to left animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutLeft
  extends ComplexAnimationBuilder
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
          opacity: 1,
          transform: [{ translateX: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}
/**
 * Fade to top animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutUp
  extends ComplexAnimationBuilder
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
          opacity: 1,
          transform: [{ translateY: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Fade to bottom animation. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutDown
  extends ComplexAnimationBuilder
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
          opacity: 1,
          transform: [{ translateY: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}
