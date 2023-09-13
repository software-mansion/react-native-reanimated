'use strict';
import type {
  EntryExitAnimationFunction,
  EntryExitAnimationsValues,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import { withSequence, withTiming } from '../../animation';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
export class BounceIn
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ scale: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceInDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
              translateY: values.windowHeight,
            },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceInUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateY: -values.windowHeight }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceInLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateX: -values.windowWidth }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceInRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateX: values.windowWidth }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceOut
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ scale: 1 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateX: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ translateX: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}
