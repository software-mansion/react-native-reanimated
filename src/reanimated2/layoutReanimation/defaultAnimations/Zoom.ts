// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { BaseAnimationBuilder } from '../defaultAnimationsBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class ZoomIn extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomIn();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scale: 0 }],
        },
      };
    };
  }
}

export class ZoomInRotate extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInRotate();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const rotate = this.rotateV ? this.rotateV : 0.3;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, animation(1, config)) },
            { rotate: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ scale: 0 }, { rotate: rotate }],
        },
      };
    };
  }
}

export class ZoomInLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originX: values.originX - width,
        },
      };
    };
  }
}

export class ZoomInRight extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originX: values.originX + width,
        },
      };
    };
  }
}

export class ZoomInUp extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: values.originY - height,
        },
      };
    };
  }
}

export class ZoomInDown extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: values.originY + height,
        },
      };
    };
  }
}

export class ZoomInEasyUp extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInEasyUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: -values.height,
        },
      };
    };
  }
}

export class ZoomInEasyDown extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomInEasyDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(1, config)) }],
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          transform: [{ scale: 0 }],
          originY: values.height,
        },
      };
    };
  }
}

export class ZoomOut extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOut();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scale: 1 }],
        },
      };
    };
  }
}

export class ZoomOutRotate extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutRotate();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    const rotate = this.rotateV ? this.rotateV : 0.3;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, animation(0, config)) },
            { rotate: delayFunction(delay, animation(rotate, config)) },
          ],
        },
        initialValues: {
          transform: [{ scale: 1 }, { rotate: 0 }],
        },
      };
    };
  }
}

export class ZoomOutLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originX: delayFunction(
            delay,
            animation(values.originX - width, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originX: values.originX,
        },
      };
    };
  }
}

export class ZoomOutRight extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originX: delayFunction(
            delay,
            animation(values.originX + width, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originX: values.originX,
        },
      };
    };
  }
}

export class ZoomOutUp extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(
            delay,
            animation(values.originY - height, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  }
}

export class ZoomOutDown extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(
            delay,
            animation(values.originY + height, config)
          ),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  }
}

export class ZoomOutEasyUp extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutEasyUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(delay, animation(-values.height, config)),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  }
}

export class ZoomOutEasyDown extends BaseAnimationBuilder {
  static createInstance() {
    return new ZoomOutEasyDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;
    return (values) => {
      'worklet';
      return {
        animations: {
          transform: [{ scale: delayFunction(delay, animation(0, config)) }],
          originY: delayFunction(delay, animation(values.height, config)),
        },
        initialValues: {
          transform: [{ scale: 1 }],
          originY: 0,
        },
      };
    };
  }
}
