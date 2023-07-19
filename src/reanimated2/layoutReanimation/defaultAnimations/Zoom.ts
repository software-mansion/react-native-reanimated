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

export class ZoomIn
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomInRotate
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
          transform: [{ scale: 0 }, { rotate: rotate }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomInRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomInUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomInDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomInEasyUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomInEasyDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOut
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutRotate
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutEasyUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class ZoomOutEasyDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}
