'use strict';

import { withSequence, withTiming } from "../../animation/index.js";
import { ComplexAnimationBuilder } from "../animationBuilder/index.js";

/**
 * Bounce entering animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceIn extends ComplexAnimationBuilder {
  static presetName = 'BounceIn';
  static createInstance() {
    return new BounceIn();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return () => {
      'worklet';

      return {
        animations: {
          transform: [{
            scale: delayFunction(delay, withSequence(withTiming(1.2, {
              duration: duration * 0.55
            }), withTiming(0.9, {
              duration: duration * 0.15
            }), withTiming(1.1, {
              duration: duration * 0.15
            }), withTiming(1, {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          transform: [{
            scale: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce from bottom animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInDown extends ComplexAnimationBuilder {
  static presetName = 'BounceInDown';
  static createInstance() {
    return new BounceInDown();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateY: delayFunction(delay, withSequence(withTiming(-20, {
              duration: duration * 0.55
            }), withTiming(10, {
              duration: duration * 0.15
            }), withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(0, {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateY: values.windowHeight
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce from top animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInUp extends ComplexAnimationBuilder {
  static presetName = 'BounceInUp';
  static createInstance() {
    return new BounceInUp();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateY: delayFunction(delay, withSequence(withTiming(20, {
              duration: duration * 0.55
            }), withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(10, {
              duration: duration * 0.15
            }), withTiming(0, {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateY: -values.windowHeight
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce from left animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInLeft extends ComplexAnimationBuilder {
  static presetName = 'BounceInLeft';
  static createInstance() {
    return new BounceInLeft();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateX: delayFunction(delay, withSequence(withTiming(20, {
              duration: duration * 0.55
            }), withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(10, {
              duration: duration * 0.15
            }), withTiming(0, {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateX: -values.windowWidth
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce from right animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceInRight extends ComplexAnimationBuilder {
  static presetName = 'BounceInRight';
  static createInstance() {
    return new BounceInRight();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateX: delayFunction(delay, withSequence(withTiming(-20, {
              duration: duration * 0.55
            }), withTiming(10, {
              duration: duration * 0.15
            }), withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(0, {
              duration: duration * 0.15
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateX: values.windowWidth
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce exiting animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOut extends ComplexAnimationBuilder {
  static presetName = 'BounceOut';
  static createInstance() {
    return new BounceOut();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return () => {
      'worklet';

      return {
        animations: {
          transform: [{
            scale: delayFunction(delay, withSequence(withTiming(1.1, {
              duration: duration * 0.15
            }), withTiming(0.9, {
              duration: duration * 0.15
            }), withTiming(1.2, {
              duration: duration * 0.15
            }), withTiming(0, {
              duration: duration * 0.55
            })))
          }]
        },
        initialValues: {
          transform: [{
            scale: 1
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce to bottom animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutDown extends ComplexAnimationBuilder {
  static presetName = 'BounceOutDown';
  static createInstance() {
    return new BounceOutDown();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateY: delayFunction(delay, withSequence(withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(10, {
              duration: duration * 0.15
            }), withTiming(-20, {
              duration: duration * 0.15
            }), withTiming(values.windowHeight, {
              duration: duration * 0.55
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateY: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce to top animation. You can modify the behavior by chaining methods like
 * `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutUp extends ComplexAnimationBuilder {
  static presetName = 'BounceOutUp';
  static createInstance() {
    return new BounceOutUp();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateY: delayFunction(delay, withSequence(withTiming(10, {
              duration: duration * 0.15
            }), withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(20, {
              duration: duration * 0.15
            }), withTiming(-values.windowHeight, {
              duration: duration * 0.55
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateY: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce to left animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutLeft extends ComplexAnimationBuilder {
  static presetName = 'BounceOutLeft';
  static createInstance() {
    return new BounceOutLeft();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateX: delayFunction(delay, withSequence(withTiming(10, {
              duration: duration * 0.15
            }), withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(20, {
              duration: duration * 0.15
            }), withTiming(-values.windowWidth, {
              duration: duration * 0.55
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateX: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Bounce to right animation. You can modify the behavior by chaining methods
 * like `.delay(300)` or `.duration(100)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#bounce
 */
export class BounceOutRight extends ComplexAnimationBuilder {
  static presetName = 'BounceOutRight';
  static createInstance() {
    return new BounceOutRight();
  }
  static getDuration() {
    return 600;
  }
  getDuration() {
    return this.durationV ?? 600;
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    return values => {
      'worklet';

      return {
        animations: {
          transform: [{
            translateX: delayFunction(delay, withSequence(withTiming(-10, {
              duration: duration * 0.15
            }), withTiming(10, {
              duration: duration * 0.15
            }), withTiming(-20, {
              duration: duration * 0.15
            }), withTiming(values.windowWidth, {
              duration: duration * 0.55
            })))
          }]
        },
        initialValues: {
          transform: [{
            translateX: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=Bounce.js.map