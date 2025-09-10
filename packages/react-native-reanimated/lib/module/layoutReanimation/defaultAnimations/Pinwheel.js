'use strict';

import { ComplexAnimationBuilder } from "../animationBuilder/index.js";

/**
 * Entry with change in rotation, scale, and opacity. You can modify the
 * behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#pinwheel
 */
export class PinwheelIn extends ComplexAnimationBuilder {
  static presetName = 'PinwheelIn';
  static createInstance() {
    return new PinwheelIn();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            scale: delayFunction(delay, animation(1, config))
          }, {
            rotate: delayFunction(delay, animation('0rad', config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            scale: 0
          }, {
            rotate: '5rad'
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Exit with change in rotation, scale, and opacity. You can modify the behavior
 * by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#pinwheel
 */
export class PinwheelOut extends ComplexAnimationBuilder {
  static presetName = 'PinwheelOut';
  static createInstance() {
    return new PinwheelOut();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            scale: delayFunction(delay, animation(0, config))
          }, {
            rotate: delayFunction(delay, animation('5rad', config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            scale: 1
          }, {
            rotate: '0rad'
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=Pinwheel.js.map