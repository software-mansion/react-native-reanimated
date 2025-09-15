'use strict';

import { ComplexAnimationBuilder } from '../animationBuilder';

/**
 * Rotate to bottom from left edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInDownLeft extends ComplexAnimationBuilder {
  static presetName = 'RotateInDownLeft';
  static createInstance() {
    return new RotateInDownLeft();
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
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            rotate: delayFunction(delay, animation('0deg', config))
          }, {
            translateX: delayFunction(delay, animation(0, config))
          }, {
            translateY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            rotate: '-90deg'
          }, {
            translateX: values.targetWidth / 2 - values.targetHeight / 2
          }, {
            translateY: -(values.targetWidth / 2 - values.targetHeight / 2)
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Rotate to bottom from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInDownRight extends ComplexAnimationBuilder {
  static presetName = 'RotateInDownRight';
  static createInstance() {
    return new RotateInDownRight();
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
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            rotate: delayFunction(delay, animation('0deg', config))
          }, {
            translateX: delayFunction(delay, animation(0, config))
          }, {
            translateY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            rotate: '90deg'
          }, {
            translateX: -(values.targetWidth / 2 - values.targetHeight / 2)
          }, {
            translateY: -(values.targetWidth / 2 - values.targetHeight / 2)
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Rotate to top from left edge. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInUpLeft extends ComplexAnimationBuilder {
  static presetName = 'RotateInUpLeft';
  static createInstance() {
    return new RotateInUpLeft();
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
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            rotate: delayFunction(delay, animation('0deg', config))
          }, {
            translateX: delayFunction(delay, animation(0, config))
          }, {
            translateY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            rotate: '90deg'
          }, {
            translateX: values.targetWidth / 2 - values.targetHeight / 2
          }, {
            translateY: values.targetWidth / 2 - values.targetHeight / 2
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Rotate to top from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `entering` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateInUpRight extends ComplexAnimationBuilder {
  static presetName = 'RotateInUpRight';
  static createInstance() {
    return new RotateInUpRight();
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
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{
            rotate: delayFunction(delay, animation('0deg', config))
          }, {
            translateX: delayFunction(delay, animation(0, config))
          }, {
            translateY: delayFunction(delay, animation(0, config))
          }]
        },
        initialValues: {
          opacity: 0,
          transform: [{
            rotate: '-90deg'
          }, {
            translateX: -(values.targetWidth / 2 - values.targetHeight / 2)
          }, {
            translateY: values.targetWidth / 2 - values.targetHeight / 2
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}

/**
 * Rotate to bottom from left edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutDownLeft extends ComplexAnimationBuilder {
  static presetName = 'RotateOutDownLeft';
  static createInstance() {
    return new RotateOutDownLeft();
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
            rotate: delayFunction(delay, animation('90deg', config))
          }, {
            translateX: delayFunction(delay, animation(values.currentWidth / 2 - values.currentHeight / 2, config))
          }, {
            translateY: delayFunction(delay, animation(values.currentWidth / 2 - values.currentHeight / 2, config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            rotate: '0deg'
          }, {
            translateX: 0
          }, {
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
 * Rotate to bottom from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutDownRight extends ComplexAnimationBuilder {
  static presetName = 'RotateOutDownRight';
  static createInstance() {
    return new RotateOutDownRight();
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
            rotate: delayFunction(delay, animation('-90deg', config))
          }, {
            translateX: delayFunction(delay, animation(-(values.currentWidth / 2 - values.currentHeight / 2), config))
          }, {
            translateY: delayFunction(delay, animation(values.currentWidth / 2 - values.currentHeight / 2, config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            rotate: '0deg'
          }, {
            translateX: 0
          }, {
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
 * Rotate to top from left edge. You can modify the behavior by chaining methods
 * like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutUpLeft extends ComplexAnimationBuilder {
  static presetName = 'RotateOutUpLeft';
  static createInstance() {
    return new RotateOutUpLeft();
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
            rotate: delayFunction(delay, animation('-90deg', config))
          }, {
            translateX: delayFunction(delay, animation(values.currentWidth / 2 - values.currentHeight / 2, config))
          }, {
            translateY: delayFunction(delay, animation(-(values.currentWidth / 2 - values.currentHeight / 2), config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            rotate: '0deg'
          }, {
            translateX: 0
          }, {
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
 * Rotate to top from right edge. You can modify the behavior by chaining
 * methods like `.springify()` or `.duration(500)`.
 *
 * You pass it to the `exiting` prop on [an Animated
 * component](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animated-component).
 *
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations#rotate
 */
export class RotateOutUpRight extends ComplexAnimationBuilder {
  static presetName = 'RotateOutUpRight';
  static createInstance() {
    return new RotateOutUpRight();
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
            rotate: delayFunction(delay, animation('90deg', config))
          }, {
            translateX: delayFunction(delay, animation(-(values.currentWidth / 2 - values.currentHeight / 2), config))
          }, {
            translateY: delayFunction(delay, animation(-(values.currentWidth / 2 - values.currentHeight / 2), config))
          }]
        },
        initialValues: {
          opacity: 1,
          transform: [{
            rotate: '0deg'
          }, {
            translateX: 0
          }, {
            translateY: 0
          }],
          ...initialValues
        },
        callback
      };
    };
  };
}
//# sourceMappingURL=Rotate.js.map