import { Dimensions } from 'react-native';
import { ComplexAnimationBuilder } from '../animationBuilder';
import {
  EntryAnimationsValues,
  ExitAnimationsValues,
  AnimationConfigFunction,
  IEntryAnimationBuilder,
  IExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

const { width } = Dimensions.get('window');

export class RollInLeft
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): RollInLeft {
    return new RollInLeft();
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
            { translateX: delayFunction(delay, animation(0), config) },
            { rotate: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: -width }, { rotate: '-180deg' }],
        },
        callback: callback,
      };
    };
  };
}

export class RollInRight
  extends ComplexAnimationBuilder
  implements IEntryAnimationBuilder {
  static createInstance(): RollInRight {
    return new RollInRight();
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
            { rotate: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: width }, { rotate: '180deg' }],
        },
        callback: callback,
      };
    };
  };
}

export class RollOutLeft
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): RollOutLeft {
    return new RollOutLeft();
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
            { rotate: delayFunction(delay, animation('-180deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { rotate: '0deg' }],
        },
        callback: callback,
      };
    };
  };
}

export class RollOutRight
  extends ComplexAnimationBuilder
  implements IExitAnimationBuilder {
  static createInstance(): RollOutRight {
    return new RollOutRight();
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
            { rotate: delayFunction(delay, animation('180deg', config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { rotate: '0deg' }],
        },
        callback: callback,
      };
    };
  };
}
