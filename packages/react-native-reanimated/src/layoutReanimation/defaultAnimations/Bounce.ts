'use strict';
import { withSequence, withTiming } from '../../animation';
import type {
  EntryExitAnimationFunction,
  EntryExitAnimationsValues,
  IEntryExitAnimationBuilder,
} from '../../commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type { Scale, TransformsConfig, TranslateX, TranslateY } from './types';
import { pickTransformValues, resolveTransformValue } from './utils';

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
  extends ComplexAnimationBuilder<TransformsConfig<[Scale]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue({ scale: 1 }, 0, targetValues),
                    { duration: duration * 0.15 }
                  )
                )
              ),
            },
          ],
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
 * Bounce from bottom animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInDown
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue({ translateY: 0 }, 0, targetValues),
                    { duration: duration * 0.15 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: values.windowHeight }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue({ translateY: 0 }, 0, targetValues),
                    { duration: duration * 0.15 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateY: -values.windowHeight }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue({ translateX: 0 }, 0, targetValues),
                    { duration: duration * 0.15 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: -values.windowWidth }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue({ translateX: 0 }, 0, targetValues),
                    { duration: duration * 0.15 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues(
            [{ translateX: values.windowWidth }],
            initialValues
          ),
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
  extends ComplexAnimationBuilder<TransformsConfig<[Scale]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue({ scale: 0 }, 0, targetValues),
                    { duration: duration * 0.55 }
                  )
                )
              ),
            },
          ],
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
 * Bounce to bottom animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutDown
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue(
                      { translateY: values.windowHeight },
                      0,
                      targetValues
                    ),
                    {
                      duration: duration * 0.55,
                    }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues([{ translateY: 0 }], initialValues),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateY]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue(
                      { translateY: -values.windowHeight },
                      0,
                      targetValues
                    ),
                    { duration: duration * 0.55 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues([{ translateY: 0 }], initialValues),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue(
                      { translateX: -values.windowWidth },
                      0,
                      targetValues
                    ),
                    { duration: duration * 0.55 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues([{ translateX: 0 }], initialValues),
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
  extends ComplexAnimationBuilder<TransformsConfig<[TranslateX]>>
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
    const targetValues = this.targetValues;

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
                  withTiming(
                    resolveTransformValue(
                      { translateX: values.windowWidth },
                      0,
                      targetValues
                    ),
                    { duration: duration * 0.55 }
                  )
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: pickTransformValues([{ translateX: 0 }], initialValues),
        },
        callback,
      };
    };
  };
}
