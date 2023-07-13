import { withSequence, withTiming } from '../../animation';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';

export class FadingTransition
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadingTransition() as InstanceType<T>;
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
          originX: values.currentOriginX,
          originY: values.currentOriginY,
          width: values.currentWidth,
          height: values.currentHeight,
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
            withTiming(values.targetOriginX, { duration: 50 })
          ),
          originY: delayFunction(
            delay + duration,
            withTiming(values.targetOriginY, { duration: 50 })
          ),
          width: delayFunction(
            delay + duration,
            withTiming(values.targetWidth, { duration: 50 })
          ),
          height: delayFunction(
            delay + duration,
            withTiming(values.targetHeight, { duration: 50 })
          ),
        },
        callback: callback,
      };
    };
  };
}
