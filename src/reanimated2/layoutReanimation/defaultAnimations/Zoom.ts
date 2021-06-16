import {
  EntryExitAnimationBuilderI,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class ZoomIn
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomIn {
    return new ZoomIn();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scale: 0 }],
        },
      };
    };
  };
}

export class ZoomInRotate
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomInRotate {
    return new ZoomInRotate();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const rotate = this.rotateV ? this.rotateV : 0.3;

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
      };
    };
  };
}

export class ZoomInLeft
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomInLeft {
    return new ZoomInLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originX: values.originX - width,
        },
      };
    };
  };
}

export class ZoomInRight
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomInRight {
    return new ZoomInRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originX: values.originX + width,
        },
      };
    };
  };
}

export class ZoomInUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomInUp {
    return new ZoomInUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: values.originY - height,
        },
      };
    };
  };
}

export class ZoomInDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomInDown {
    return new ZoomInDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: values.originY + height,
        },
      };
    };
  };
}

export class ZoomInEasyUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomInEasyUp {
    return new ZoomInEasyUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: -values.height,
        },
      };
    };
  };
}

export class ZoomInEasyDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance() {
    return new ZoomInEasyDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: values.height,
        },
      };
    };
  };
}

export class ZoomOut
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOut {
    return new ZoomOut();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scale: 1 }],
        },
      };
    };
  };
}

export class ZoomOutRotate
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutRotate {
    return new ZoomOutRotate();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const rotate = this.rotateV ? this.rotateV : 0.3;

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
          transform: [{ scale: 1 }, { rotate: 0 }],
        },
      };
    };
  };
}

export class ZoomOutLeft
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutLeft {
    return new ZoomOutLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originX: delayFunction(
            delay,
            animation(values.originX - width, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originX: values.originX,
        },
      };
    };
  };
}

export class ZoomOutRight
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutRight {
    return new ZoomOutRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originX: delayFunction(
            delay,
            animation(values.originX + width, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originX: values.originX,
        },
      };
    };
  };
}

export class ZoomOutUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutUp {
    return new ZoomOutUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(
            delay,
            animation(values.originY - height, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  };
}

export class ZoomOutDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutDown {
    return new ZoomOutDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(
            delay,
            animation(values.originY + height, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  };
}

export class ZoomOutEasyUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutEasyUp {
    return new ZoomOutEasyUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(delay, animation(-values.height, config)),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  };
}

export class ZoomOutEasyDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): ZoomOutEasyDown {
    return new ZoomOutEasyDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(delay, animation(values.height, config)),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  };
}
