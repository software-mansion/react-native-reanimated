'use strict';

import { withSequence, withTiming } from "../../animation/index.js";
import { ComplexAnimationBuilder } from "../animationBuilder/index.js";
/**
 * Entry from right animation with change in skew and opacity. You can modify
 * the behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#lightspeed
 */
export class LightSpeedInRight extends ComplexAnimationBuilder {
  static presetName = 'LightSpeedInRight';
  static createInstance() {
    return new LightSpeedInRight();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, withTiming(1, {
            duration
          })),
          transform: [{
            translateX: delayFunction(delay, animation(0, {
              ...config,
              duration: duration * 0.7
            }))
          }, {
            skewX: delayFunction(delay, withSequence(withTiming('10deg', {
              duration: duration * 0.7
            }), withTiming('-5deg', {
              duration: duration * 0.15
            }), withTiming('0deg', {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            translateX: values.windowWidth
          }, {
            skewX: '-45deg'
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Entry from left animation with change in skew and opacity. You can modify the
 * behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#lightspeed
 */
export class LightSpeedInLeft extends ComplexAnimationBuilder {
  static presetName = 'LightSpeedInLeft';
  static createInstance() {
    return new LightSpeedInLeft();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, withTiming(1, {
            duration
          })),
          transform: [{
            translateX: delayFunction(delay, animation(0, {
              ...config,
              duration: duration * 0.7
            }))
          }, {
            skewX: delayFunction(delay, withSequence(withTiming('-10deg', {
              duration: duration * 0.7
            }), withTiming('5deg', {
              duration: duration * 0.15
            }), withTiming('0deg', {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            translateX: -values.windowWidth
          }, {
            skewX: '45deg'
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Exit to right animation with change in skew and opacity. You can modify the
 * behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#lightspeed
 */
export class LightSpeedOutRight extends ComplexAnimationBuilder {
  static presetName = 'LightSpeedOutRight';
  static createInstance() {
    return new LightSpeedOutRight();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            translateX: delayFunction(delay, animation(values.windowWidth, config))
          }, {
            skewX: delayFunction(delay, animation('-45deg', config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            translateX: 0
          }, {
            skewX: '0deg'
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Exit to left animation with change in skew and opacity. You can modify the
 * behavior by chaining methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/#lightspeed
 */
export class LightSpeedOutLeft extends ComplexAnimationBuilder {
  static presetName = 'LightSpeedOutLeft';
  static createInstance() {
    return new LightSpeedOutLeft();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            translateX: delayFunction(delay, animation(-values.windowWidth, config))
          }, {
            skewX: delayFunction(delay, animation('45deg', config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            translateX: 0
          }, {
            skewX: '0deg'
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=Lightspeed.js.map