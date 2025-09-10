'use strict';

import { ComplexAnimationBuilder } from "../animationBuilder/index.js";

/**
 * Stretch animation on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchInX extends ComplexAnimationBuilder {
  static presetName = 'StretchInX';
  static createInstance() {
    return new StretchInX();
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
          transform: [{
            scaleX: delayFunction(delay, animation(1, config))
          }]
        },
        initialValues: {
          transform: [{
            scaleX: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Stretch animation on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchInY extends ComplexAnimationBuilder {
  static presetName = 'StretchInY';
  static createInstance() {
    return new StretchInY();
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
          transform: [{
            scaleY: delayFunction(delay, animation(1, config))
          }]
        },
        initialValues: {
          transform: [{
            scaleY: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Stretch animation on the X axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchOutX extends ComplexAnimationBuilder {
  static presetName = 'StretchOutX';
  static createInstance() {
    return new StretchOutX();
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
          transform: [{
            scaleX: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          transform: [{
            scaleX: 1
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Stretch animation on the Y axis. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#stretch
 */
export class StretchOutY extends ComplexAnimationBuilder {
  static presetName = 'StretchOutY';
  static createInstance() {
    return new StretchOutY();
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
          transform: [{
            scaleY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          transform: [{
            scaleY: 1
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=Stretch.js.map