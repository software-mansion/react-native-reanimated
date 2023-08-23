import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';

export class LinearTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new LinearTransition() as InstanceType<T>;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();

    return (values) => {
      'worklet';
      return {
        initialValues: {
          originX: values.currentOriginX,
          originY: values.currentOriginY,
          width: values.currentWidth,
          height: values.currentHeight,
        },
        animations: {
          originX: delayFunction(
            delay,
            animation(values.targetOriginX, config)
          ),
          originY: delayFunction(
            delay,
            animation(values.targetOriginY, config)
          ),
          width: delayFunction(delay, animation(values.targetWidth, config)),
          height: delayFunction(delay, animation(values.targetHeight, config)),
        },
        callback: callback,
      };
    };
  };
}

// This export is unofficially deprecated because it's
// name makes little sense - should be something among the lines of
// `DefaultLayoutTransition` but it's so long!
export const Layout = LinearTransition;
