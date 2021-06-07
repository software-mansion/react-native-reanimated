// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { BaseAnimationBuilder } from '../defaultAnimationsBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class SlideInRight extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideInRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          originX: values.originX + width,
        },
      };
    };
  }
}

export class SlideInLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideInLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
        },
        initialValues: {
          originX: values.originX - width,
        },
      };
    };
  }
}

export class SlideOutRight extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideOutRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(
            delay,
            animation(values.originX + width, config)
          ),
        },
        initialValues: {
          originX: values.originX,
        },
      };
    };
  }
}

export class SlideOutLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideOutLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originX: delayFunction(
            delay,
            animation(values.originX - width, config)
          ),
        },
        initialValues: {
          originX: values.originX,
        },
      };
    };
  }
}

export class SlideInUp extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideInUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(delay, animation(values.originY, config)),
        },
        initialValues: {
          originY: height,
        },
      };
    };
  }
}

export class SlideInDown extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideInDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(delay, animation(values.originY, config)),
        },
        initialValues: {
          originY: values.originY - height,
        },
      };
    };
  }
}

export class SlideOutUp extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideOutUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(
            delay,
            animation(values.originY - height, config)
          ),
        },
        initialValues: {},
      };
    };
  }
}

export class SlideOutDown extends BaseAnimationBuilder {
  static createInstance() {
    return new SlideOutDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (values) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(
            delay,
            animation(values.originY + height, config)
          ),
        },
        initialValues: {},
      };
    };
  }
}
