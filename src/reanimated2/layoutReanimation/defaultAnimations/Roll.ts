import { Dimensions } from 'react-native';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import {
  EntryExitAnimationBuild,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

const { width } = Dimensions.get('window');

export class RollInLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RollInLeft {
    return new RollInLeft();
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
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        initialValues: {
          originX: values.originX - width,
          transform: [{ rotate: '-180deg' }],
        },
      };
    };
  };
}

export class RollInRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RollInRight {
    return new RollInRight();
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
          transform: [
            { rotate: delayFunction(delay, animation('0deg', config)) },
          ],
        },
        initialValues: {
          originX: values.originX + width,
          transform: [{ rotate: '180deg' }],
        },
      };
    };
  };
}

export class RollOutLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RollOutLeft {
    return new RollOutLeft();
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
          transform: [
            { rotate: delayFunction(delay, animation('-180deg', config)) },
          ],
        },
        initialValues: {
          originX: values.originX,
          transform: [{ rotate: '0deg' }],
        },
      };
    };
  };
}

export class RollOutRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): RollOutRight {
    return new RollOutRight();
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
          transform: [
            { rotate: delayFunction(delay, animation('180deg', config)) },
          ],
        },
        initialValues: {
          originX: values.originX,
          transform: [{ rotate: '0deg' }],
        },
      };
    };
  };
}
