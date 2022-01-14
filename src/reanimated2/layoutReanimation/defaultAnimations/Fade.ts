import {
  EntryAnimationsValues,
  ExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import { ComplexAnimationBuilder } from '../animationBuilder';

export class FadeIn
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): FadeIn {
    return new FadeIn();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (_) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
        },
        initialValues: {
          opacity: 0,
        },
        callback: callback,
      };
    };
  };
}

export class FadeInRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): FadeInRight {
    return new FadeInRight();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeInLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): FadeInLeft {
    return new FadeInLeft();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeInUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): FadeInUp {
    return new FadeInUp();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeInDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): FadeInDown {
    return new FadeInDown();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeOut
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): FadeOut {
    return new FadeOut();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (_) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          opacity: 1,
        },
        callback: callback,
      };
    };
  };
}

export class FadeOutRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): FadeOutRight {
    return new FadeOutRight();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeOutLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): FadeOutLeft {
    return new FadeOutLeft();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeOutUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): FadeOutUp {
    return new FadeOutUp();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}

export class FadeOutDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): FadeOutDown {
    return new FadeOutDown();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
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
        },
        callback: callback,
      };
    };
  };
}
