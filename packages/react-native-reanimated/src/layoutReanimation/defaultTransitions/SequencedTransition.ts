'use strict';
import { withSequence, withTiming } from '../../animation';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../../commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';

/**
 * Transforms layout starting from the X-axis and width first, followed by the
 * Y-axis and height. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#sequenced-transition
 */
export class SequencedTransition
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SequencedTransition';

  reversed = false;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SequencedTransition() as InstanceType<T>;
  }

  static reverse(): SequencedTransition {
    const instance = SequencedTransition.createInstance();
    return instance.reverse();
  }

  reverse(): SequencedTransition {
    this.reversed = !this.reversed;
    return this;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.getDelay();
    const halfDuration = (this.durationV ?? 500) / 2;
    const config = { duration: halfDuration };
    const reverse = this.reversed;

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
            withSequence(
              withTiming(
                reverse ? values.currentOriginX : values.targetOriginX,
                config
              ),
              withTiming(values.targetOriginX, config)
            )
          ),
          originY: delayFunction(
            delay,
            withSequence(
              withTiming(
                reverse ? values.targetOriginY : values.currentOriginY,
                config
              ),
              withTiming(values.targetOriginY, config)
            )
          ),
          width: delayFunction(
            delay,
            withSequence(
              withTiming(
                reverse ? values.currentWidth : values.targetWidth,
                config
              ),
              withTiming(values.targetWidth, config)
            )
          ),
          height: delayFunction(
            delay,
            withSequence(
              withTiming(
                reverse ? values.targetHeight : values.currentHeight,
                config
              ),
              withTiming(values.targetHeight, config)
            )
          ),
        },
        callback,
      };
    };
  };
}
