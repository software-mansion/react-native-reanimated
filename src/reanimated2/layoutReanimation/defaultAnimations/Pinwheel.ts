import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import {
  EntryExitAnimationBuild,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';

export class PinwheelIn
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): PinwheelIn {
    return new PinwheelIn();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (_values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [
            {
              scale: delayFunction(delay, animation(1, config)),
            },
            {
              rotate: delayFunction(delay, animation('0turn', config)),
            },
          ],
        },
        initialValues: {
          opacity: 0,
          transform: [
            {
              scale: 0,
            },
            {
              rotate: '5turn',
            },
          ],
        },
      };
    };
  };
}

export class PinwheelOut
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): PinwheelOut {
    return new PinwheelOut();
  }

  build: EntryExitAnimationBuild = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (_values) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [
            {
              scale: delayFunction(delay, animation(0, config)),
            },
            {
              rotate: delayFunction(delay, animation('5turn', config)),
            },
          ],
        },
        initialValues: {
          opacity: 1,
          transform: [
            {
              scale: 1,
            },
            {
              rotate: '0turn',
            },
          ],
        },
      };
    };
  };
}
