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
export class LinearTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'LinearTransition';

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
          opacity: values.currentOpacity,
          backgroundColor: values.currentBackgroundColor,

          borderRadius: values.currentBorderRadius,
          borderTopLeftRadius: values.currentBorderTopLeftRadius,
          borderTopRightRadius: values.currentBorderTopRightRadius,
          borderBottomLeftRadius: values.currentBorderBottomLeftRadius,
          borderBottomRightRadius: values.currentBorderBottomRightRadius,

          shadowRadius: values.currentShadowRadius,
          shadowColor: values.currentShadowColor,
          shadowOpacity: values.currentShadowOpacity,
          shadowOffset: {
            height: values.currentShadowOffsetHeight,
            width: values.currentShadowOffsetWidth,
          },
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
          borderRadius: delayFunction(
            delay,
            animation(values.targetBorderRadius, config)
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
          backgroundColor: delayFunction(
            delay,
            animation(values.targetBackgroundColor, config)
          ),
          shadowColor: delayFunction(
            delay,
            animation(values.targetShadowColor, config)
          ),
          shadowOpacity: delayFunction(
            delay,
            animation(values.targetShadowOpacity, config)
          ),
          shadowOffset: delayFunction(
            delay,
            animation(
              {
                height: values.targetShadowOffsetHeight,
                width: values.targetShadowOffsetWidth,
              },
              config
            )
          ),
        },
        callback,
      };
    };
  };
}

/**
 * @deprecated Please use {@link LinearTransition} instead.
 */
export const Layout = LinearTransition;
