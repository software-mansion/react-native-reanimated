import { ComplexAnimationBuilder } from '../animationBuilder';
import {
  EntryExitAnimationFunction,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

export class RotateInDownLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateInDownLeft {
    return new RotateInDownLeft();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '-90deg' },
            { translateX: values.width / 2 - values.height / 2 },
            { translateY: -(values.width / 2 - values.height / 2) },
          ],
        },
        callback: callback,
      };
    };
  };
}

export class RotateInDownRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateInDownRight {
    return new RotateInDownRight();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '90deg' },
            { translateX: -(values.width / 2 - values.height / 2) },
            { translateY: -(values.width / 2 - values.height / 2) },
          ],
        },
        callback: callback,
      };
    };
  };
}

export class RotateInUpLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateInUpLeft {
    return new RotateInUpLeft();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '90deg' },
            { translateX: values.width / 2 - values.height / 2 },
            { translateY: values.width / 2 - values.height / 2 },
          ],
        },
        callback: callback,
      };
    };
  };
}

export class RotateInUpRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateInUpRight {
    return new RotateInUpRight();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            { rotate: '-90deg' },
            { translateX: -(values.width / 2 - values.height / 2) },
            { translateY: values.width / 2 - values.height / 2 },
          ],
        },
        callback: callback,
      };
    };
  };
}

export class RotateOutDownLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateOutDownLeft {
    return new RotateOutDownLeft();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(values.width / 2 - values.height / 2, config)
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(values.width / 2 - values.height / 2, config)
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class RotateOutDownRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateOutDownRight {
    return new RotateOutDownRight();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('-90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(-(values.width / 2 - values.height / 2), config)
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(values.width / 2 - values.height / 2, config)
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class RotateOutUpLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateOutUpLeft {
    return new RotateOutUpLeft();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('-90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(values.width / 2 - values.height / 2, config)
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(-(values.width / 2 - values.height / 2), config)
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class RotateOutUpRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RotateOutUpRight {
    return new RotateOutUpRight();
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            { rotate: delayFunction(delay, animation('90deg', config)) },
            {
              translateX: delayFunction(
                delay,
                animation(-(values.width / 2 - values.height / 2), config)
              ),
            },
            {
              translateY: delayFunction(
                delay,
                animation(-(values.width / 2 - values.height / 2), config)
              ),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }],
        },
        callback: callback,
      };
    };
  };
}
