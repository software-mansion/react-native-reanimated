import { withSequence, withTiming } from '../../animation';
import {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';

export class SequencedLayout
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder {
  static createInstance(): SequencedLayout {
    return new SequencedLayout();
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.delayV;
    const sequenceDuration = (this.durationV ?? 500) * 2;
    const config = { duration: sequenceDuration };

    return (values) => {
      'worklet';
      return {
        initialValues: {
          originX: values.boriginX,
          originY: values.boriginY,
          width: values.bwidth,
          height: values.bheight,
        },
        animations: {
          originX: delayFunction(
            delay,
            withSequence(
              withTiming(100, config),
              withTiming(values.originX, config)
            )
          ),
          originY: delayFunction(delay, withTiming(values.originY, config)),
          width: delayFunction(delay, withTiming(values.width, config)),
          height: delayFunction(delay, withTiming(values.height, config)),
          // originX: delayFunction(delay, withSequence(withTiming(values.originX, config), withTiming(values.originX, config))),
          // originY: delayFunction(delay, withSequence(withTiming(values.boriginY, config), withTiming(values.originY, config))),
          // width: delayFunction(delay, withSequence(withTiming(values.width, config), withTiming(values.width, config))),
          // height: delayFunction(delay, withSequence(withTiming(values.bheight, config), withTiming(values.height, config))),
        },
        callback: callback,
      };
    };
  };
}
