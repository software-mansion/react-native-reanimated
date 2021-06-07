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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: width }],
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: -width }],
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(width, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }],
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateX: delayFunction(delay, animation(-width, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }],
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: -height }],
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: height }],
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(-height, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }],
        },
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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { translateY: delayFunction(delay, animation(height, config)) },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }],
        },
      };
    };
  }
}
