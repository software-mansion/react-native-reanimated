import {
  EntryAnimationsValues,
  ExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import { ComplexAnimationBuilder } from '../animationBuilder';

export class StretchInX
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): StretchInX {
    return new StretchInX();
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
          transform: [{ scaleX: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class StretchInY
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): StretchInY {
    return new StretchInY();
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
          transform: [{ scaleY: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class StretchOutX
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): StretchOutX {
    return new StretchOutX();
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
          transform: [{ scaleX: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class StretchOutY
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): StretchOutY {
    return new StretchOutY();
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
          transform: [{ scaleY: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 1 }],
        },
        callback: callback,
      };
    };
  };
}
