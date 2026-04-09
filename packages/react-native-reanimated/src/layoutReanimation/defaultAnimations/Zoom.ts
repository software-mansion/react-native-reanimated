'use strict';
import type {
  AnimationConfigFunction,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  EntryExitAnimationsValues,
  ExitAnimationsValues,
  IEntryAnimationBuilder,
  IEntryExitAnimationBuilder,
  IExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type {
  Rotate,
  Scale,
  TransformsConfig,
  TranslateX,
  TranslateY,
} from './types';
import { animateTransformToValues, pickTransformValues } from './utils';

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
  extends ComplexAnimationBuilder<TransformsConfig<[Scale]>>
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
            [{ scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues([{ scale: 0 }], initialValues),
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
  extends ComplexAnimationBuilder<TransformsConfig<[Scale, Rotate]>>
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
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const rotate = this.rotateV ? this.rotateV : '0.3';
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ scale: 1 }, { rotate: '0rad' }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ scale: 0 }, { rotate: `${rotate}rad` }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Scale]>>
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
            [{ translateX: 0 }, { scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: -values.windowWidth }, { scale: 0 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Scale]>>
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
            [{ translateX: 0 }, { scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: values.windowWidth }, { scale: 0 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
            [{ translateY: 0 }, { scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: -values.windowHeight }, { scale: 0 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
            [{ translateY: 0 }, { scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: values.windowHeight }, { scale: 0 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateY: 0 }, { scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: -values.targetHeight }, { scale: 0 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateY: 0 }, { scale: 1 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: values.targetHeight }, { scale: 0 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[Scale]>>
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
            [{ scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues([{ scale: 1 }], initialValues),
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
  extends ComplexAnimationBuilder<TransformsConfig<[Scale, Rotate]>>
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
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const rotate = this.rotateV ? this.rotateV : '0.3';
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ scale: 0 }, { rotate }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ scale: 1 }, { rotate: '0rad' }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Scale]>>
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
            [{ translateX: -values.windowWidth }, { scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: 0 }, { scale: 1 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX, Scale]>>
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
            [{ translateX: values.windowWidth }, { scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: 0 }, { scale: 1 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
            [{ translateY: -values.windowHeight }, { scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: 0 }, { scale: 1 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
            [{ translateY: values.windowHeight }, { scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: 0 }, { scale: 1 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateY: -values.currentHeight }, { scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: 0 }, { scale: 1 }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY, Scale]>>
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
    const animationAndConfig = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const targetValues = this.targetValues;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: animateTransformToValues(
            [{ translateY: values.currentHeight }, { scale: 0 }],
            targetValues,
            animationAndConfig,
            delayFunction,
            delay
          ),
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: 0 }, { scale: 1 }],
            initialValues
          ),
        },
        callback,
      };
    };
  };
}
