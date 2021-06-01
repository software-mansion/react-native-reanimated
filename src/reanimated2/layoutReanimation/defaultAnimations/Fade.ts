import { BaseAnimationBuilder } from '../defaultAnimationsBuilder';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class FadeIn extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeIn();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (_) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
        },
        initialValues: {
          opacity: 0,
        },
      };
    };
  }
}

export class FadeInRight extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeInRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{ translateX: delayFunction(delay, animation(0, config)) }]
        },
        initialValues: {
          opacity: 0,
          transform: [{ translateX: 25 }]
        },
      };
    };
  }
}

export class FadeInLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeInLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{ translateX: delayFunction(delay, animation(0, config)) }]
        },
        initialValues: {
          opacity: 0,
          transform: [{ translateX: -25 }]
        },
      };
    };
  }
}

export class FadeInUp extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeInUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{ translateY: delayFunction(delay, animation(0, config)) }]
        },
        initialValues: {
          opacity: 0,
          transform: [{ translateY: -25 }]
        },
      };
    };
  }
}

export class FadeInDown extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeInDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(1, config)),
          transform: [{ translateY: delayFunction(delay, animation(0, config)) }]
        },
        initialValues: {
          opacity: 0,
          transform: [{ translateY: 25 }]
        },
      };
    };
  }
}

export class FadeOut extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeOut();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (_) => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          opacity: 1,
        },
      };
    };
  }
}

export class FadeOutRight extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeOutRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{ translateX: delayFunction(delay, animation(25, config)) }]
        },
        initialValues: {
          opacity: 1,
          transform: [{ translateX: 0 }]
        },
      };
    };
  }
}

export class FadeOutLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeOutLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{ translateX: delayFunction(delay, animation(-25, config)) }]
        },
        initialValues: {
          opacity: 1,
          transform: [{ translateX: 0 }]
        },
      };
    };
  }
}

export class FadeOutUp extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeOutUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{ translateY: delayFunction(delay, animation(-25, config)) }]
        },
        initialValues: {
          opacity: 1,
          transform: [{ translateY: 0 }]
        },
      };
    };
  }
}

export class FadeOutDown extends BaseAnimationBuilder {
  static createInstance() {
    return new FadeOutDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          opacity: delayFunction(delay, animation(0, config)),
          transform: [{ translateY: delayFunction(delay, animation(25, config)) }]
        },
        initialValues: {
          opacity: 1,
          transform: [{ translateY: 0 }]
        },
      };
    };
  }
}
