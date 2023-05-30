import {
  ComplexAnimationBuilder,
  BaseAnimationBuilder,
} from '../animationBuilder';
import {
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

export class RollInLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollInLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    // TODO TYPESCRIPT This should be temporary, it was added to get rid of .d.ts file
    return (values: EntryAnimationsValues | ExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0), config) },
            { rotate: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        initialValues: {
          transform: [
            { translateX: -values.windowWidth },
            { rotate: '-180deg' },
          ],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class RollInRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollInRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    // TODO This should be temporary, it was added to get rid of .d.ts file
    return (values: EntryAnimationsValues | ExitAnimationsValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
            { rotate: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: values.windowWidth }, { rotate: '180deg' }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class RollOutLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollOutLeft() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    // TODO TYPESCRIPT This should be temporary, it was added to get rid of .d.ts file
    return (values: EntryAnimationsValues | ExitAnimationsValues) => {
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
            { rotate: delayFunction(delay, animation('-180deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { rotate: '0deg' }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}

export class RollOutRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new RollOutRight() as InstanceType<T>;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;

    // TODO TYPESCRIPT This should be temporary, it was added to get rid of .d.ts file
    return (values: EntryAnimationsValues | ExitAnimationsValues) => {
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
            { rotate: delayFunction(delay, animation('180deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { rotate: '0deg' }],
          ...initialValues,
        },
        callback: callback,
      };
    };
  };
}
