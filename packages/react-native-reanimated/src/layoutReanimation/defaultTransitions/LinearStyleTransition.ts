'use strict';
import type { BaseAnimationBuilder } from '../animationBuilder';
import { ComplexAnimationBuilder } from '../animationBuilder';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';

/**
 * Linearly transforms the layout from one position to another. You can modify the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#linear-transition
 */
export class LinearStyleTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'LinearStyleTransition';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new LinearStyleTransition() as InstanceType<T>;
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
          opacity: values.currentOpacity,
          backgroundColor: values.currentBackgroundColor,

          borderTopLeftRadius: values.currentBorderTopLeftRadius,
          borderTopRightRadius: values.currentBorderTopRightRadius,
          borderBottomLeftRadius: values.currentBorderBottomLeftRadius,
          borderBottomRightRadius: values.currentBorderBottomRightRadius,

          borderTopWidth: values.currentBorderTopWidth,
          borderBottomWidth: values.currentBorderBottomWidth,
          borderLeftWidth: values.currentBorderLeftWidth,
          borderRightWidth: values.currentBorderRightWidth,
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
          opacity: delayFunction(
            delay,
            animation(values.targetOpacity, config)
          ),

          borderTopLeftRadius: delayFunction(
            delay,
            animation(values.targetBorderTopLeftRadius, config)
          ),
          borderTopRightRadius: delayFunction(
            delay,
            animation(values.targetBorderTopRightRadius, config)
          ),
          borderBottomLeftRadius: delayFunction(
            delay,
            animation(values.targetBorderBottomLeftRadius, config)
          ),
          borderBottomRightRadius: delayFunction(
            delay,
            animation(values.targetBorderBottomRightRadius, config)
          ),

          borderTopWidth: delayFunction(
            delay,
            animation(values.targetBorderTopWidth, config)
          ),
          borderBottomWidth: delayFunction(
            delay,
            animation(values.targetBorderBottomWidth, config)
          ),
          borderLeftWidth: delayFunction(
            delay,
            animation(values.targetBorderLeftWidth, config)
          ),
          borderRightWidth: delayFunction(
            delay,
            animation(values.targetBorderRightWidth, config)
          ),

          backgroundColor: delayFunction(
            delay,
            animation(values.targetBackgroundColor, config)
          ),
        },
        callback,
      };
    };
  };
}
