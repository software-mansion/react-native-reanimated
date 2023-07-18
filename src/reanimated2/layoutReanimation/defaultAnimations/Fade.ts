import type {
  IEntryExitAnimationBuilder,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';

export class FadeIn
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeInRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeInLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeInUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeInDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeOut
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeOutRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeOutLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeOutUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class FadeOutDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}
