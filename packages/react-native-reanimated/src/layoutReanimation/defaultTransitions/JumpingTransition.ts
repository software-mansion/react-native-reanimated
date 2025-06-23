'use strict';
import { withSequence, withTiming } from '../../animation';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../../commonTypes';
import { Easing } from '../../Easing';
import { BaseAnimationBuilder } from '../animationBuilder';

/**
 * Layout jumps - quite literally - from one position to another. You can modify
 * the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#jumping-transition
 */
export class JumpingTransition
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'JumpingTransition';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new JumpingTransition() as InstanceType<T>;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.getDelay();
    const duration = this.durationV ?? 300;
    const halfDuration = duration / 2;
    const config = { duration };

    return (values) => {
      'worklet';
      const d = Math.max(
        Math.abs(values.targetOriginX - values.currentOriginX),
        Math.abs(values.targetOriginY - values.currentOriginY)
      );
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
            withTiming(values.targetOriginX, config)
          ),
          originY: delayFunction(
            delay,
            withSequence(
              withTiming(
                Math.min(values.targetOriginY, values.currentOriginY) - d,
                {
                  duration: halfDuration,
                  easing: Easing.out(Easing.exp),
                }
              ),
              withTiming(values.targetOriginY, {
                ...config,
                duration: halfDuration,
                easing: Easing.bounce,
              })
            )
          ),
          width: delayFunction(delay, withTiming(values.targetWidth, config)),
          height: delayFunction(delay, withTiming(values.targetHeight, config)),
        },
        callback,
      };
    };
  };
}
