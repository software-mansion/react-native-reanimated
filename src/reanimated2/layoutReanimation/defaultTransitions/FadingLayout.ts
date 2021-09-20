import { withSequence, withTiming } from '../../animation';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';
import {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';

export class FadingLayout
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder {
  static createInstance(): FadingLayout {
    return new FadingLayout();
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    // const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.delayV;

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
              withTiming(0, { duration: 500 }),
              withTiming(1, { duration: 500 })
            )
          ),
          originX: delayFunction(
            delay,
            withTiming(values.originX, { duration: 1000 })
          ),
          originY: delayFunction(
            delay,
            withTiming(values.originY, { duration: 1000 })
          ),
          width: delayFunction(
            delay,
            withTiming(values.width, { duration: 1000 })
          ),
          height: delayFunction(
            delay,
            withTiming(values.height, { duration: 1000 })
          ),
        },
        callback: callback,
      };
    };
  };
}
