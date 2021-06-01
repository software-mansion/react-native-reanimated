import { BaseAnimationBuilder } from '../defaultAnimationsBuilder';
import { withSequence, withTiming } from '../../animations';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class BounceIn extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceIn();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: 
              delayFunction(delay, 
                withSequence(
                  withTiming(1.2, {duration: duration}),
                  withTiming(0.9, {duration: duration * 100/250}),
                  withTiming(1.1, {duration: duration * 100/250}),
                  withTiming(1, {duration: duration * 100/250}),
                )
              ) 
            }
          ],
        },
        initialValues: {
          transform: [{ scale: 0 }],
        },
      };
    };
  }
}

export class BounceInDown extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceInDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateY: delayFunction(delay, withSequence(
              withTiming(-20, {duration: duration}),
              withTiming(10, {duration: duration * 100/250}),
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(5, {duration: duration * 100/250}),
            ))
          }]
        },
        initialValues: {
          transform: [{ 
            translateY: targetValues.originY + height, 
          }]
        },
      };
    };
  }
}

export class BounceInUp extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceInUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateY: delayFunction(delay, withSequence(
              withTiming(20, {duration: duration}),
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(10, {duration: duration * 100/250}),
              withTiming(0, {duration: duration * 100/250}),
            ))
          }]
        },
        initialValues: {
          transform: [{ translateY: targetValues.originY - height}],
        },
      };
    };
  }
}

export class BounceInLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceInLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateX: delayFunction(delay, withSequence(
              withTiming(20, {duration: duration}),
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(10, {duration: duration * 100/250}),
              withTiming(0, {duration: duration * 100/250}),
            ))
          }],
        },
        initialValues: {
          transform: [{ translateX: targetValues.originX - width}],
        },
      };
    };
  }
}

export class BounceInRight extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceInRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateX: delayFunction(delay, withSequence(
              withTiming(-20, {duration: duration}),
              withTiming(10, {duration: duration * 100/250}),
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(0, {duration: duration * 100/250}),
            ))
          }],
        },
        initialValues: {
          transform: [{ translateX: targetValues.originX + width}],
        },
      };
    };
  }
}

export class BounceOut extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceOut();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, 
                withSequence(
                  withTiming(1.1, {duration: duration * 100/250}),
                  withTiming(0.9, {duration: duration * 100/250}),
                  withTiming(1.2, {duration: duration * 100/250}),
                  withTiming(0, {duration: duration}),
                )
              ) 
            }
          ],
        },
        initialValues: {
          transform: [{ scale: 1 }],
        },
      };
    };
  }
}

export class BounceOutDown extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceOutDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateY: delayFunction(delay, withSequence(
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(10, {duration: duration * 100/250}),
              withTiming(-20, {duration: duration * 100/250}),
              withTiming(targetValues.originY + height, {duration: duration}),
            ))
          }]
        },
        initialValues: {
          originY: 0,
        },
      };
    };
  }
}

export class BounceOutUp extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceOutUp();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateY: delayFunction(delay, withSequence(
              withTiming(10, {duration: duration * 100/250}),
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(20, {duration: duration * 100/250}),
              withTiming(targetValues.originY - height, {duration: duration}),
            ))
          }]
        },
        initialValues: {
          transform: [{ translateY: 0}],
        },
      };
    };
  }
}

export class BounceOutLeft extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceOutLeft();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateX: delayFunction(delay, withSequence(
              withTiming(10, {duration: duration * 100/250}),
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(20, {duration: duration * 100/250}),
              withTiming(targetValues.originX - width, {duration: duration}),
            ))
          }],
        },
        initialValues: {
          transform: [{ translateX: 0}],
        },
      };
    };
  }
}

export class BounceOutRight extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceOutRight();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [{ 
            translateX: delayFunction(delay, withSequence(
              withTiming(-10, {duration: duration * 100/250}),
              withTiming(10, {duration: duration * 100/250}),
              withTiming(-20, {duration: duration * 100/250}),
              withTiming(targetValues.originX + width, {duration: duration}),
            ))
          }],
        },
        initialValues: {
          transform: [{ translateX: 0}],
        },
      };
    };
  }
}
