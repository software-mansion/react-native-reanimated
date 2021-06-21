import {
  IEntryExitAnimationBuilder,
  EntryExitAnimationBuild,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class ZoomIn
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomIn {
    return new ZoomIn();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInRotate {
    return new ZoomInRotate();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const rotate = this.rotateV ? this.rotateV : '0.3';

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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInLeft {
    return new ZoomInLeft();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInRight {
    return new ZoomInRight();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInUp {
    return new ZoomInUp();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInDown {
    return new ZoomInDown();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomInEasyUp {
    return new ZoomInEasyUp();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance() {
    return new ZoomInEasyDown();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOut {
    return new ZoomOut();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutRotate {
    return new ZoomOutRotate();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const rotate = this.rotateV ? this.rotateV : '0.3';

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
      };
    };
  };
}

export class ZoomOutLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutLeft {
    return new ZoomOutLeft();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutRight {
    return new ZoomOutRight();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutUp {
    return new ZoomOutUp();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutDown {
    return new ZoomOutDown();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutEasyUp {
    return new ZoomOutEasyUp();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): ZoomOutEasyDown {
    return new ZoomOutEasyDown();
  }

  build: EntryExitAnimationBuild = () => {
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
