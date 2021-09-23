import { withSequence, withTiming } from '../../animation';
import {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';

export class FadingTransition
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder {
  static createInstance(): FadingTransition {
    return new FadingTransition();
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.getDelay();
    const duration = this.durationV ?? 500;

    return (values) => {
      'worklet';
      return {
        initialValues: {
          opacity: 1,
          originX: values.boriginX,
          originY: values.boriginY,
          width: values.bwidth,
          height: values.bheight,
        },
        animations: {
          opacity: delayFunction(
            delay,
            withSequence(
              withTiming(0, { duration: duration }),
              withTiming(1, { duration: duration })
            )
          ),
          originX: delayFunction(
            delay + duration,
            withTiming(values.originX, { duration: 50 })
          ),
          originY: delayFunction(
            delay + duration,
            withTiming(values.originY, { duration: 50 })
          ),
          width: delayFunction(
            delay + duration,
            withTiming(values.width, { duration: 50 })
          ),
          height: delayFunction(
            delay + duration,
            withTiming(values.height, { duration: 50 })
          ),
        },
        callback: callback,
      };
    };
  };
}
