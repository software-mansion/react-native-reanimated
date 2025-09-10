'use strict';

import { ComplexAnimationBuilder } from "../animationBuilder/index.js";

/**
 * Slide from right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInRight extends ComplexAnimationBuilder {
  static presetName = 'SlideInRight';
  static createInstance() {
    return new SlideInRight();
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
          originX: delayFunction(delay, animation(values.targetOriginX, config))
        },
        initialValues: {
          originX: values.targetOriginX + values.windowWidth,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide from left animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInLeft extends ComplexAnimationBuilder {
  static presetName = 'SlideInLeft';
  static createInstance() {
    return new SlideInLeft();
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
          originX: delayFunction(delay, animation(values.targetOriginX, config))
        },
        initialValues: {
          originX: values.targetOriginX - values.windowWidth,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide to right animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutRight extends ComplexAnimationBuilder {
  static presetName = 'SlideOutRight';
  static createInstance() {
    return new SlideOutRight();
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
          originX: delayFunction(delay, animation(Math.max(values.currentOriginX + values.windowWidth, values.windowWidth), config))
        },
        initialValues: {
          originX: values.currentOriginX,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide to left animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutLeft extends ComplexAnimationBuilder {
  static presetName = 'SlideOutLeft';
  static createInstance() {
    return new SlideOutLeft();
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
          originX: delayFunction(delay, animation(Math.min(values.currentOriginX - values.windowWidth, -values.windowWidth), config))
        },
        initialValues: {
          originX: values.currentOriginX,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide from top animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInUp extends ComplexAnimationBuilder {
  static presetName = 'SlideInUp';
  static createInstance() {
    return new SlideInUp();
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
          originY: delayFunction(delay, animation(values.targetOriginY, config))
        },
        initialValues: {
          originY: -values.windowHeight,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide from bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideInDown extends ComplexAnimationBuilder {
  static presetName = 'SlideInDown';
  static createInstance() {
    return new SlideInDown();
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
          originY: delayFunction(delay, animation(values.targetOriginY, config))
        },
        initialValues: {
          originY: values.targetOriginY + values.windowHeight,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide to top animation. You can modify the behavior by chaining methods like
 * `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutUp extends ComplexAnimationBuilder {
  static presetName = 'SlideOutUp';
  static createInstance() {
    return new SlideOutUp();
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
          originY: delayFunction(delay, animation(Math.min(values.currentOriginY - values.windowHeight, -values.windowHeight), config))
        },
        initialValues: {
          originY: values.currentOriginY,
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Slide to bottom animation. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#slide
 */
export class SlideOutDown extends ComplexAnimationBuilder {
  static presetName = 'SlideOutDown';
  static createInstance() {
    return new SlideOutDown();
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
          originY: delayFunction(delay, animation(Math.max(values.currentOriginY + values.windowHeight, values.windowHeight), config))
        },
        initialValues: {
          originY: values.currentOriginY,
          ...initialValues
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=Slide.js.map