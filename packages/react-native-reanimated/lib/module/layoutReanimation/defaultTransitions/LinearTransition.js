'use strict';

import { ComplexAnimationBuilder } from '../animationBuilder';

/**
 * Linearly transforms the layout from one position to another. You can modify
 * the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#linear-transition
 */
export class LinearTransition extends ComplexAnimationBuilder {
  static presetName = 'LinearTransition';
  static createInstance() {
    return new LinearTransition();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();
    return values => {
      'worklet';

      return {
        initialValues: {
          originX: values.currentOriginX,
          originY: values.currentOriginY,
          width: values.currentWidth,
          height: values.currentHeight
        },
        animations: {
          originX: delayFunction(delay, animation(values.targetOriginX, config)),
          originY: delayFunction(delay, animation(values.targetOriginY, config)),
          width: delayFunction(delay, animation(values.targetWidth, config)),
          height: delayFunction(delay, animation(values.targetHeight, config))
        },
        callback
      };
    };
  };
}

/** @deprecated Please use {@link LinearTransition} instead. */
export const Layout = LinearTransition;
//# sourceMappingURL=LinearTransition.js.map