import { ComplexAnimationBuilder } from '../animationBuilder/ComplexAnimationBuilder';
import {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';

export class LinearTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder {
  static createInstance(): LinearTransition {
    return new LinearTransition();
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
          originX: values.boriginX,
          originY: values.boriginY,
          width: values.bwidth,
          height: values.bheight,
        },
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
          originY: delayFunction(delay, animation(values.originY, config)),
          width: delayFunction(delay, animation(values.width, config)),
          height: delayFunction(delay, animation(values.height, config)),
        },
        callback: callback,
      };
    };
  };
}

export const Layout = LinearTransition;
