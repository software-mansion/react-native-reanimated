'use strict';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type {
  EntryExitAnimationFunction,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

export class PinwheelIn
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new PinwheelIn() as InstanceType<T>;
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
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            {
              scale: delayFunction(delay, animation(1, config)),
            },
            {
              rotate: delayFunction(delay, animation('0', config)),
            },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            {
              scale: 0,
            },
            {
              rotate: '5',
            },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class PinwheelOut
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new PinwheelOut() as InstanceType<T>;
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
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            {
              scale: delayFunction(delay, animation(0, config)),
            },
            {
              rotate: delayFunction(delay, animation('5', config)),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [
            {
              scale: 1,
            },
            {
              rotate: '0',
            },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}
