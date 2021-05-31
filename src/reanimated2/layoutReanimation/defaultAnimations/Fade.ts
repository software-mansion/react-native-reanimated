import { BaseAnimationBuilder } from '../defaultAnimationsBuilder';

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