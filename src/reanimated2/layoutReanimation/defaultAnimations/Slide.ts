import {
  IEntryExitAnimationBuilder,
  EntryExitAnimationBuild,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class SlideInRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInRight {
    return new SlideInRight();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInLeft {
    return new SlideInLeft();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutRight {
    return new SlideOutRight();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutLeft {
    return new SlideOutLeft();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInUp {
    return new SlideInUp();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideInDown {
    return new SlideInDown();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutUp {
    return new SlideOutUp();
  }

  build: EntryExitAnimationBuild = () => {
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
  implements IEntryExitAnimationBuilder {
  static createInstance(): SlideOutDown {
    return new SlideOutDown();
  }

  build: EntryExitAnimationBuild = () => {
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
