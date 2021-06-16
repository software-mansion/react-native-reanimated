import {
  EntryExitAnimationBuilderI,
  EntryExitAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';

export class StretchInX
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): StretchInX {
    return new StretchInX();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleX: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 0 }],
        },
      };
    };
  };
}

export class StretchInY
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): StretchInY {
    return new StretchInY();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleY: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 0 }],
        },
      };
    };
  };
}

export class StretchOutX
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): StretchOutX {
    return new StretchOutX();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleX: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 1 }],
        },
      };
    };
  };
}

export class StretchOutY
  extends BaseAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): StretchOutY {
    return new StretchOutY();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleY: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 1 }],
        },
      };
    };
  };
}
