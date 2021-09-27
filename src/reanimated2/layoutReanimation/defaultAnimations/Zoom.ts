import {
  IEntryExitAnimationBuilder,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import { Dimensions } from 'react-native';
import { ComplexAnimationBuilder } from '../animationBuilder';

const { width, height } = Dimensions.get('window');

export class ZoomIn
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomIn {
    return new ZoomIn();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInRotate {
    return new ZoomInRotate();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInLeft {
    return new ZoomInLeft();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInRight {
    return new ZoomInRight();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInUp {
    return new ZoomInUp();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInDown {
    return new ZoomInDown();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInEasyUp {
    return new ZoomInEasyUp();
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
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: -values.height }, { scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomInEasyDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInEasyDown {
    return new ZoomInEasyDown();
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
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
            { scale: delayFunction(delay, animation(1, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: values.height }, { scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class ZoomOut
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOut {
    return new ZoomOut();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutRotate {
    return new ZoomOutRotate();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutLeft {
    return new ZoomOutLeft();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutRight {
    return new ZoomOutRight();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutUp {
    return new ZoomOutUp();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutDown {
    return new ZoomOutDown();
  }

  build = (): EntryExitAnimationFunction => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutEasyUp {
    return new ZoomOutEasyUp();
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
          transform: [
            {
              translateY: delayFunction(
                delay,
                animation(-values.height, config)
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutEasyDown {
    return new ZoomOutEasyDown();
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
          transform: [
            {
              translateY: delayFunction(
                delay,
                animation(values.height, config)
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
