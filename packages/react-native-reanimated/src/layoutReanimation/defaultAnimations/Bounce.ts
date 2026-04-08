'use strict';
import { withSequence, withTiming } from '../../animation';
import type { Scale, TranslateX, TranslateY } from '../../common';
import type {
  EntryExitAnimationFunction,
  EntryExitAnimationsValues,
  IEntryExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import {
  ComplexAnimationBuilder,
  pickTransformInitialValue,
} from '../animationBuilder';

/**
 * Bounce entering animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceIn
  extends ComplexAnimationBuilder<{
    scale: Scale['scale'];
    /** @deprecated Pass `scale` as a top-level property instead. */
    transform?: [Scale];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceIn';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceIn() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              scale: delayFunction(
                delay,
                withSequence(
                  withTiming(1.2, { duration: duration * 0.55 }),
                  withTiming(0.9, { duration: duration * 0.15 }),
                  withTiming(1.1, { duration: duration * 0.15 }),
                  withTiming(1, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              scale: pickTransformInitialValue(initialValues, 'scale', 0, 0),
            },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Bounce from bottom animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInDown
  extends ComplexAnimationBuilder<{
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceInDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceInDown() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(-20, { duration: duration * 0.55 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                0,
                values.windowHeight
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
 * Bounce from top animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInUp
  extends ComplexAnimationBuilder<{
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceInUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceInUp() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(20, { duration: duration * 0.55 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              translateY: pickTransformInitialValue(
                initialValues,
                'translateY',
                0,
                -values.windowHeight
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
 * Bounce from left animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInLeft
  extends ComplexAnimationBuilder<{
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceInLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceInLeft() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(20, { duration: duration * 0.55 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                0,
                -values.windowWidth
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
 * Bounce from right animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInRight
  extends ComplexAnimationBuilder<{
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceInRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceInRight() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(-20, { duration: duration * 0.55 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              translateX: pickTransformInitialValue(
                initialValues,
                'translateX',
                0,
                values.windowWidth
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
 * Bounce exiting animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOut
  extends ComplexAnimationBuilder<{
    scale: Scale['scale'];
    /** @deprecated Pass `scale` as a top-level property instead. */
    transform?: [Scale];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceOut';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceOut() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              scale: delayFunction(
                delay,
                withSequence(
                  withTiming(1.1, { duration: duration * 0.15 }),
                  withTiming(0.9, { duration: duration * 0.15 }),
                  withTiming(1.2, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.55 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              scale: pickTransformInitialValue(initialValues, 'scale', 0, 1),
            },
          ],
        },
        callback,
      };
    };
  };
}

/**
 * Bounce to bottom animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutDown
  extends ComplexAnimationBuilder<{
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceOutDown';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceOutDown() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-20, { duration: duration * 0.15 }),
                  withTiming(values.windowHeight, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
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
 * Bounce to top animation. You can modify the behavior by chaining methods like
 * `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutUp
  extends ComplexAnimationBuilder<{
    translateY: TranslateY['translateY'];
    /** @deprecated Pass `translateY` as a top-level property instead. */
    transform?: [TranslateY];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceOutUp';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceOutUp() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(20, { duration: duration * 0.15 }),
                  withTiming(-values.windowHeight, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
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
 * Bounce to left animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutLeft
  extends ComplexAnimationBuilder<{
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceOutLeft';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceOutLeft() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(20, { duration: duration * 0.15 }),
                  withTiming(-values.windowWidth, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
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
 * Bounce to right animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutRight
  extends ComplexAnimationBuilder<{
    translateX: TranslateX['translateX'];
    /** @deprecated Pass `translateX` as a top-level property instead. */
    transform?: [TranslateX];
  }>
  implements IEntryExitAnimationBuilder
{
  static presetName = 'BounceOutRight';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new BounceOutRight() as InstanceType<T>;
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
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
                withSequence(
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-20, { duration: duration * 0.15 }),
                  withTiming(values.windowWidth, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
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
