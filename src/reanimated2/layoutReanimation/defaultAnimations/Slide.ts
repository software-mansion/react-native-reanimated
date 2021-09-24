import {
  IEntryExitAnimationBuilder,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import { Dimensions } from 'react-native';
import { ComplexAnimationBuilder } from '../animationBuilder';

const { width, height } = Dimensions.get('window');

export class SlideInRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInRight {
    return new SlideInRight();
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
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          originX: values.originX + width,
        },
        callback: callback,
      };
    };
  };
}

export class SlideInLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInLeft {
    return new SlideInLeft();
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
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          originX: values.originX - width,
        },
        callback: callback,
      };
    };
  };
}

export class SlideOutRight
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutRight {
    return new SlideOutRight();
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
          originX: delayFunction(
            delay,
            animation(Math.max(values.originX + width, width), config)
          ),
        },
        initialValues: {
          originX: values.originX,
        },
        callback: callback,
      };
    };
  };
}

export class SlideOutLeft
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutLeft {
    return new SlideOutLeft();
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
          originX: delayFunction(
            delay,
            animation(Math.min(values.originX - width, -width), config)
          ),
        },
        initialValues: {
          originX: values.originX,
        },
        callback: callback,
      };
    };
  };
}

export class SlideInUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInUp {
    return new SlideInUp();
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
          originY: delayFunction(delay, animation(values.originY, config)),
        },
        initialValues: {
          originY: height,
        },
        callback: callback,
      };
    };
  };
}

export class SlideInDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInDown {
    return new SlideInDown();
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
          originY: delayFunction(delay, animation(values.originY, config)),
        },
        initialValues: {
          originY: values.originY - height,
        },
        callback: callback,
      };
    };
  };
}

export class SlideOutUp
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutUp {
    return new SlideOutUp();
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
          originY: delayFunction(
            delay,
            animation(Math.min(values.originY - height, -height), config)
          ),
        },
        initialValues: { originY: values.originY },
        callback: callback,
      };
    };
  };
}

export class SlideOutDown
  extends ComplexAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutDown {
    return new SlideOutDown();
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
          originY: delayFunction(
            delay,
            animation(Math.max(values.originY + height, height), config)
          ),
        },
        initialValues: { originY: values.originY },
        callback: callback,
      };
    };
  };
}
