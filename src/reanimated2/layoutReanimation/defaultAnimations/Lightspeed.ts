import { Dimensions } from 'react-native';
import { withSequence, withTiming } from '../../animation';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import {
  EntryExitAnimationBuild,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

const { width } = Dimensions.get('window');

export class LightSpeedInRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): LightSpeedInRight {
    return new LightSpeedInRight();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
          opacity: delayFunction(
            delay,
            withTiming(1, { duration: duration * 1.5 })
          ),
          transform: [
            {
              skewX: delayFunction(
                delay,
                withSequence(
                  withTiming('10deg', { duration: duration }),
                  withTiming('-5deg', { duration: duration / 5 }),
                  withTiming('0deg', { duration: duration / 5 })
                )
              ),
            },
          ],
        },
        initialValues: {
          originX: values.originX + width,
          opacity: 0,
          transform: [{ skewX: '-45deg' }],
        },
        callback: callback,
      };
    };
  };
}

export class LightSpeedInLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): LightSpeedInLeft {
    return new LightSpeedInLeft();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
          opacity: delayFunction(
            delay,
            withTiming(1, { duration: duration * 1.5 })
          ),
          transform: [
            {
              skewX: delayFunction(
                delay,
                withSequence(
                  withTiming('-10deg', { duration: duration }),
                  withTiming('5deg', { duration: duration / 5 }),
                  withTiming('0deg', { duration: duration / 5 })
                )
              ),
            },
          ],
        },
        initialValues: {
          originX: values.originX - width,
          opacity: 0,
          transform: [{ skewX: '45deg' }],
        },
        callback: callback,
      };
    };
  };
}

export class LightSpeedOutRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): LightSpeedOutRight {
    return new LightSpeedOutRight();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(
            delay,
            animation(values.originX + width, config)
          ),
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            {
              skewX: delayFunction(delay, animation('-45deg', config)),
            },
          ],
        },
        initialValues: {
          originX: values.originX,
          opacity: 1,
          transform: [{ skewX: '0deg' }],
        },
        callback: callback,
      };
    };
  };
}

export class LightSpeedOutLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): LightSpeedOutLeft {
    return new LightSpeedOutLeft();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const callback = this.callbackV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(
            delay,
            animation(values.originX - width, config)
          ),
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            {
              skewX: delayFunction(delay, animation('45deg', config)),
            },
          ],
        },
        initialValues: {
          originX: values.originX,
          opacity: 1,
          transform: [{ skewX: '0deg' }],
        },
        callback: callback,
      };
    };
  };
}
