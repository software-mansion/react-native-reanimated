'use strict';
import { withDelay, withSequence, withTiming } from '../../animation';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from '../animationBuilder/commonTypes';
import { BaseAnimationBuilder } from '../animationBuilder';

/**
 * Fades out components from one position and shows them in another. You can
 * modify the behavior by chaining methods like `.duration(500)` or
 * `.delay(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#fading-transition
 */
export class FadingTransition
  extends BaseAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'FadingTransition';

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new FadingTransition() as InstanceType<T>;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.getDelay();
    const halfDuration = (this.durationV ?? 500) / 2;

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
              withTiming(0, { duration: halfDuration }),
              withTiming(1, { duration: halfDuration })
            )
          ),
          originX: withDelay(
            delay + halfDuration,
            withTiming(values.targetOriginX, { duration: 0 })
          ),
          originY: withDelay(
            delay + halfDuration,
            withTiming(values.targetOriginY, { duration: 0 })
          ),
          width: withDelay(
            delay + halfDuration,
            withTiming(values.targetWidth, { duration: 0 })
          ),
          height: withDelay(
            delay + halfDuration,
            withTiming(values.targetHeight, { duration: 0 })
          ),
        },
        callback,
      };
    };
  };
}
