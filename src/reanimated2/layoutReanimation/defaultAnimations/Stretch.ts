'use strict';
import type {
  IEntryExitAnimationBuilder,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';

export class StretchInX
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchInX() as InstanceType<T>;
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
          transform: [{ scaleX: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class StretchInY
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchInY() as InstanceType<T>;
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
          transform: [{ scaleY: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 0 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class StretchOutX
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchOutX() as InstanceType<T>;
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
          transform: [{ scaleX: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 1 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class StretchOutY
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new StretchOutY() as InstanceType<T>;
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
          transform: [{ scaleY: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 1 }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}
