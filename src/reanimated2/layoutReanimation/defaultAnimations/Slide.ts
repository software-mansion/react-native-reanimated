import type {
  EntryAnimationsValues,
  ExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';

export class SlideInRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideInLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideOutRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideOutLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideInUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideInDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideOutUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}

export class SlideOutDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder
{
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
        callback: callback,
      };
    };
  };
}
