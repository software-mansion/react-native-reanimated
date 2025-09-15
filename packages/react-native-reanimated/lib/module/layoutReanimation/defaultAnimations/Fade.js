'use strict';

import { ComplexAnimationBuilder } from '../animationBuilder';

/**
 * Fade in animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeIn extends ComplexAnimationBuilder {
  static presetName = 'FadeIn';
  static createInstance() {
    return new FadeIn();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config))
        },
        initialValues: {
          opacity: 0,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Fade from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInRight extends ComplexAnimationBuilder {
  static presetName = 'FadeInRight';
  static createInstance() {
    return new FadeInRight();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            translateX: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            translateX: 25
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Fade from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInLeft extends ComplexAnimationBuilder {
  static presetName = 'FadeInLeft';
  static createInstance() {
    return new FadeInLeft();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            translateX: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            translateX: -25
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Fade from top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInUp extends ComplexAnimationBuilder {
  static presetName = 'FadeInUp';
  static createInstance() {
    return new FadeInUp();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            translateY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            translateY: -25
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Fade from bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeInDown extends ComplexAnimationBuilder {
  static presetName = 'FadeInDown';
  static createInstance() {
    return new FadeInDown();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            translateY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            translateY: 25
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Fade out animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOut extends ComplexAnimationBuilder {
  static presetName = 'FadeOut';
  static createInstance() {
    return new FadeOut();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config))
        },
        initialValues: {
          opacity: 1,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Fade to right animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutRight extends ComplexAnimationBuilder {
  static presetName = 'FadeOutRight';
  static createInstance() {
    return new FadeOutRight();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            translateX: delayFunction(delay, animation(25, config))
          }]
        },
        initialValues: {
          opacity: 1,
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
 * Fade to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutLeft extends ComplexAnimationBuilder {
  static presetName = 'FadeOutLeft';
  static createInstance() {
    return new FadeOutLeft();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            translateX: delayFunction(delay, animation(-25, config))
          }]
        },
        initialValues: {
          opacity: 1,
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
 * Fade to top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutUp extends ComplexAnimationBuilder {
  static presetName = 'FadeOutUp';
  static createInstance() {
    return new FadeOutUp();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            translateY: delayFunction(delay, animation(-25, config))
          }]
        },
        initialValues: {
          opacity: 1,
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
 * Fade to bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#fade
 */
export class FadeOutDown extends ComplexAnimationBuilder {
  static presetName = 'FadeOutDown';
  static createInstance() {
    return new FadeOutDown();
  }
  build = () => {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const initialValues = this.initialValues;
    const delay = this.getDelay();
    return () => {
      'worklet';

      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{
            translateY: delayFunction(delay, animation(25, config))
          }]
        },
        initialValues: {
          opacity: 1,
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
//# sourceMappingURL=Fade.js.map