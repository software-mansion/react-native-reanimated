import {
  EntryExitAnimationBuilderI,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';

export class FadeIn
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeIn {
    return new FadeIn();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (_) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
        },
        initialValues: {
          opacity: 0,
        },
      };
    };
  };
}

export class FadeInRight
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeInRight {
    return new FadeInRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeInLeft
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeInLeft {
    return new FadeInLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeInUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeInUp {
    return new FadeInUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeInDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeInDown {
    return new FadeInDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeOut
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeOut {
    return new FadeOut();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (_) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          opacity: 1,
        },
      };
    };
  };
}

export class FadeOutRight
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeOutRight {
    return new FadeOutRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeOutLeft
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeOutLeft {
    return new FadeOutLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeOutUp
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeOutUp {
    return new FadeOutUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}

export class FadeOutDown
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): FadeOutDown {
    return new FadeOutDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

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
      };
    };
  };
}
