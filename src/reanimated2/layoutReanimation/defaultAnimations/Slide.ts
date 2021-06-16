import {
  EntryExitAnimationBuilderI,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class SlideInRight
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideInRight {
    return new SlideInRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          originX: values.originX + width,
        },
      };
    };
  };
}

export class SlideInLeft
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideInLeft {
    return new SlideInLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          originX: values.originX - width,
        },
      };
    };
  };
}

export class SlideOutRight
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideOutRight {
    return new SlideOutRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(
            delay,
            animation(values.originX + width, config)
          ),
        },
        initialValues: {
          originX: values.originX,
        },
      };
    };
  };
}

export class SlideOutLeft
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideOutLeft {
    return new SlideOutLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(
            delay,
            animation(values.originX - width, config)
          ),
        },
        initialValues: {
          originX: values.originX,
        },
      };
    };
  };
}

export class SlideInUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideInUp {
    return new SlideInUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(delay, animation(values.originY, config)),
        },
        initialValues: {
          originY: height,
        },
      };
    };
  };
}

export class SlideInDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideInDown {
    return new SlideInDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(delay, animation(values.originY, config)),
        },
        initialValues: {
          originY: values.originY - height,
        },
      };
    };
  };
}

export class SlideOutUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideOutUp {
    return new SlideOutUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(
            delay,
            animation(values.originY - height, config)
          ),
        },
        initialValues: {},
      };
    };
  };
}

export class SlideOutDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): SlideOutDown {
    return new SlideOutDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(
            delay,
            animation(values.originY + height, config)
          ),
        },
        initialValues: {},
      };
    };
  };
}
