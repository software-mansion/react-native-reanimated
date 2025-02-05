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

/**
 * Slide from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static presetName = 'SlideInRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideInRight() as InstanceType<T>;
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
          originX: delayFunction(
            delay,
            animation(values.targetOriginX, config)
          ),
        },
        initialValues: {
          originX: values.targetOriginX + values.windowWidth,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Slide from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static presetName = 'SlideInLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideInLeft() as InstanceType<T>;
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
          originX: delayFunction(
            delay,
            animation(values.targetOriginX, config)
          ),
        },
        initialValues: {
          originX: values.targetOriginX - values.windowWidth,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Slide to right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static presetName = 'SlideOutRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideOutRight() as InstanceType<T>;
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
          originX: delayFunction(
            delay,
            animation(
              Math.max(
                values.currentOriginX + values.windowWidth,
                values.windowWidth
              ),
              config
            )
          ),
        },
        initialValues: {
          originX: values.currentOriginX,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Slide to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static presetName = 'SlideOutLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideOutLeft() as InstanceType<T>;
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
          originX: delayFunction(
            delay,
            animation(
              Math.min(
                values.currentOriginX - values.windowWidth,
                -values.windowWidth
              ),
              config
            )
          ),
        },
        initialValues: {
          originX: values.currentOriginX,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Slide from top animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static presetName = 'SlideInUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideInUp() as InstanceType<T>;
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
          originY: delayFunction(
            delay,
            animation(values.targetOriginY, config)
          ),
        },
        initialValues: {
          originY: -values.windowHeight,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Slide from bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
  static presetName = 'SlideInDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideInDown() as InstanceType<T>;
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
          originY: delayFunction(
            delay,
            animation(values.targetOriginY, config)
          ),
        },
        initialValues: {
          originY: values.targetOriginY + values.windowHeight,
          ...initialValues,
        },
        callback,
      };
    };
  };
}

/**
 * Slide to top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static presetName = 'SlideOutUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideOutUp() as InstanceType<T>;
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
          originY: delayFunction(
            delay,
            animation(
              Math.min(
                values.currentOriginY - values.windowHeight,
                -values.windowHeight
              ),
              config
            )
          ),
        },
        initialValues: { originY: values.currentOriginY, ...initialValues },
        callback,
      };
    };
  };
}

/**
 * Slide to bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
  static presetName = 'SlideOutDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SlideOutDown() as InstanceType<T>;
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
          originY: delayFunction(
            delay,
            animation(
              Math.max(
                values.currentOriginY + values.windowHeight,
                values.windowHeight
              ),
              config
            )
          ),
        },
        initialValues: { originY: values.currentOriginY, ...initialValues },
        callback,
      };
    };
  };
}
