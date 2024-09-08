'use strict';
import type {
  IEntryExitAnimationBuilder,
  EntryExitAnimationFunction,
  EntryAnimationsValues,
  ExitAnimationsValues,
  EntryExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';

/**
 * Scale from center animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomIn
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomIn';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomIn() as InstanceType<T>;
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
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale from center with rotation. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInRotate
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomInRotate';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInRotate() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const rotate = this.rotateV ? this.rotateV : '0.3';
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, animation(1, config)) },
            { rotate: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ scale: 0 }, { rotate }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomInLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: -values.windowWidth }, { scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomInRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: values.windowWidth }, { scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale from top animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomInUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInUp() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: -values.windowHeight }, { scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale from bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomInDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInDown() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: values.windowHeight }, { scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Eased scale from top animation. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInEasyUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static presetName = 'ZoomInEasyUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInEasyUp() as InstanceType<T>;
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
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: -values.targetHeight }, { scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Eased scale from bottom animation. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomInEasyDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static presetName = 'ZoomInEasyDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomInEasyDown() as InstanceType<T>;
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
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: values.targetHeight }, { scale: 0 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale to center animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOut
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomOut';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOut() as InstanceType<T>;
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
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale to center with rotation. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutRotate
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomOutRotate';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutRotate() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const rotate = this.rotateV ? this.rotateV : '0.3';
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, animation(0, config)) },
            { rotate: delayFunction(delay, animation(rotate, config)) },
          ],
        },
        initialValues: {
          transform: [{ scale: 1 }, { rotate: '0' }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomOutLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                animation(-values.windowWidth, config)
              ),
            },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale to right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomOutRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                animation(values.windowWidth, config)
              ),
            },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale to top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomOutUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutUp() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                animation(-values.windowHeight, config)
              ),
            },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }, { scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Scale to bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static presetName = 'ZoomOutDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutDown() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return (values: EntryExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                animation(values.windowHeight, config)
              ),
            },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }, { scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Eased scale to top animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutEasyUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static presetName = 'ZoomOutEasyUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutEasyUp() as InstanceType<T>;
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
          transform: [
            {
              translateY: delayFunction(
                delay,
                animation(-values.currentHeight, config)
              ),
            },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }, { scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Eased scale to bottom animation. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#zoom
 */
export class ZoomOutEasyDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static presetName = 'ZoomOutEasyDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new ZoomOutEasyDown() as InstanceType<T>;
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
          transform: [
            {
              translateY: delayFunction(
                delay,
                animation(values.currentHeight, config)
              ),
            },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }, { scale: 1 }],
          ...initialValues,
        },
        callback,
      };
    };
  };
}
