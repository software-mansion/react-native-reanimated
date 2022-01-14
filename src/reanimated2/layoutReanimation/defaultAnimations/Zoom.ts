import {
  EntryAnimationsValues,
  ExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import { Dimensions } from 'react-native';
import { ComplexAnimationBuilder } from '../animationBuilder';

const { width, height } = Dimensions.get('window');

export class ZoomIn
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomIn {
    return new ZoomIn();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInRotate
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInRotate {
    return new ZoomInRotate();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const rotate = this.rotateV ? this.rotateV : '0.3';
    const callback = this.callbackV;

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
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInLeft {
    return new ZoomInLeft();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: -width }, { scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInRight {
    return new ZoomInRight();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: width }, { scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInUp {
    return new ZoomInUp();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: -height }, { scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInDown {
    return new ZoomInDown();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: height }, { scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInEasyUp
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInEasyUp {
    return new ZoomInEasyUp();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

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
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInEasyDown
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): ZoomInEasyDown {
    return new ZoomInEasyDown();
  }

  build = (): AnimationConfigFunction<EntryAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

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
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOut
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOut {
    return new ZoomOut();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scale: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutRotate
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutRotate {
    return new ZoomOutRotate();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const rotate = this.rotateV ? this.rotateV : '0.3';
    const callback = this.callbackV;

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
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutLeft {
    return new ZoomOutLeft();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(-width, config)) },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { scale: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutRight {
    return new ZoomOutRight();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(width, config)) },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { scale: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutUp {
    return new ZoomOutUp();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(-height, config)) },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }, { scale: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutDown {
    return new ZoomOutDown();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(height, config)) },
            { scale: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }, { scale: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutEasyUp
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutEasyUp {
    return new ZoomOutEasyUp();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

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
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOutEasyDown
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): ZoomOutEasyDown {
    return new ZoomOutEasyDown();
  }

  build = (): AnimationConfigFunction<ExitAnimationsValues> => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;

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
        },
        callback: callback,
      };
    };
  };
}
