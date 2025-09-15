'use strict';

import { withTiming } from '../../animation';
import { assertEasingIsWorklet } from '../../animation/util';
import { Easing } from '../../Easing';
import { BaseAnimationBuilder } from '../animationBuilder';

/**
 * Layout transitions with a curved animation. You can modify the behavior by
 * chaining methods like `.duration(500)` or `.delay(500)`.
 *
 * You pass it to the `layout` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions#fading-transition
 */
export class CurvedTransition extends BaseAnimationBuilder {
  static presetName = 'CurvedTransition';
  easingXV = Easing.in(Easing.ease);
  easingYV = Easing.out(Easing.ease);
  easingWidthV = Easing.in(Easing.exp);
  easingHeightV = Easing.out(Easing.exp);
  static createInstance() {
    return new CurvedTransition();
  }
  static easingX(easing) {
    const instance = this.createInstance();
    return instance.easingX(easing);
  }
  easingX(easing) {
    if (__DEV__) {
      assertEasingIsWorklet(easing);
    }
    this.easingXV = easing;
    return this;
  }
  static easingY(easing) {
    const instance = this.createInstance();
    return instance.easingY(easing);
  }
  easingY(easing) {
    if (__DEV__) {
      assertEasingIsWorklet(easing);
    }
    this.easingYV = easing;
    return this;
  }
  static easingWidth(easing) {
    const instance = this.createInstance();
    return instance.easingWidth(easing);
  }
  easingWidth(easing) {
    if (__DEV__) {
      assertEasingIsWorklet(easing);
    }
    this.easingWidthV = easing;
    return this;
  }
  static easingHeight(easing) {
    const instance = this.createInstance();
    return instance.easingHeight(easing);
  }
  easingHeight(easing) {
    if (__DEV__) {
      assertEasingIsWorklet(easing);
    }
    this.easingHeightV = easing;
    return this;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const callback = this.callbackV;
    const delay = this.getDelay();
    const duration = this.durationV ?? 300;
    const easing = {
      easingX: this.easingXV,
      easingY: this.easingYV,
      easingWidth: this.easingWidthV,
      easingHeight: this.easingHeightV
    };
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
          originX: delayFunction(delay, withTiming(values.targetOriginX, {
            duration,
            easing: easing.easingX
          })),
          originY: delayFunction(delay, withTiming(values.targetOriginY, {
            duration,
            easing: easing.easingY
          })),
          width: delayFunction(delay, withTiming(values.targetWidth, {
            duration,
            easing: easing.easingWidth
          })),
          height: delayFunction(delay, withTiming(values.targetHeight, {
            duration,
            easing: easing.easingHeight
          }))
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=CurvedTransition.js.map