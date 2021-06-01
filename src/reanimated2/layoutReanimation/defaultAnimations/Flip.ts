import { BaseAnimationBuilder } from '../defaultAnimationsBuilder';

export class FlipInXUp extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipInXUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateX: '90deg'},
            { translateY: -targetValues.height },
          ],
        },
        animations: {
          transform: [
            { perspective: 500 },
            { rotateX: delayFunction(delay, animation('0deg', config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        }
      }
    };
  }
}

export class FlipInYLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipInYLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateY: '-90deg'},
            { translateX: -targetValues.width },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        }
      }
    };
  }
}

export class FlipInXDown extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipInXDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateX: '-90deg'},
            { translateY: targetValues.height },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('0deg', config)) },
            { translateY: delayFunction(delay, animation(0, config)) },
          ],
        }
      }
    };
  }
}

export class FlipInYRight extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipInYRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateY: '90deg'},
            { translateX: targetValues.width },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('0deg', config)) },
            { translateX: delayFunction(delay, animation(0, config)) },
          ],
        }
      }
    };
  }
}

export class FlipInEasyX extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipInEasyX();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateX: '90deg'},
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('0deg', config)) },
          ],
        }
      }
    };
  }
}

export class FlipInEasyY extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipInEasyY();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateY: '90deg'},
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('0deg', config)) },
          ],
        }
      }
    };
  }
}

export class FlipOutXUp extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipOutXUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateX: '0deg'},
            { translateY: 0 },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('90deg', config)) },
            { translateY: delayFunction(delay, animation(-targetValues.height, config)) },
          ],
        }
      }
    };
  }
}

export class FlipOutYLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipOutYLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateY: '0deg'},
            { translateX: 0 },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('-90deg', config)) },
            { translateX: delayFunction(delay, animation(-targetValues.width, config)) },
          ],
        }
      }
    };
  }
}

export class FlipOutXDown extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipOutXDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateX: '0deg'},
            { translateY: 0 },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('-90deg', config)) },
            { translateY: delayFunction(delay, animation(targetValues.height, config)) },
          ],
        }
      }
    };
  }
}

export class FlipOutYRight extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipOutYRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateY: '0deg'},
            { translateX: 0 },
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('90deg', config)) },
            { translateX: delayFunction(delay, animation(targetValues.width, config)) },
          ],
        }
      }
    };
  }
}

export class FlipOutEasyX extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipOutEasyX();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateX: '0deg'},
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateX: delayFunction(delay, animation('90deg', config)) },
          ],
        }
      }
    };
  }
}

export class FlipOutEasyY extends BaseAnimationBuilder {
  static createInstance() {
    return new FlipOutEasyY();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        initialValues:{
          transform: [
            { perspective: 500 },
            { rotateY: '0deg'},
          ],
        },
        animations: {
          transform: [
            { perspective: delayFunction(delay, animation(500, config)) },
            { rotateY: delayFunction(delay, animation('90deg', config)) },
          ],
        }
      }
    };
  }
}