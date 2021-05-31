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

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: 
              delayFunction(delay, 
                withSequence(
                  withTiming(1.2, {duration: 250}),
                  withTiming(0.9, {duration: 100}),
                  withTiming(1.1, {duration: 100}),
                  withTiming(1, {duration: 100}),
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

export class BounceOut extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceOut();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: 
              delayFunction(delay, 
                withSequence(
                  withTiming(1.1, {duration: 100}),
                  withTiming(0.9, {duration: 100}),
                  withTiming(1.2, {duration: 100}),
                  withTiming(0, {duration: 250}),
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

export class BounceInDown extends BaseAnimationBuilder {
  static createInstance() {
    return new BounceInDown();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(delay, withSequence(
            withTiming(-20, {duration: 250}),
            withTiming(10, {duration: 100}),
            withTiming(-10, {duration: 100}),
            withTiming(5, {duration: 100}),
          ))
        },
        initialValues: {
          originY: targetValues.originY + height,
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

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          originY: delayFunction(delay, withSequence(
            withTiming(20, {duration: 250}),
            withTiming(-10, {duration: 100}),
            withTiming(10, {duration: 100}),
            withTiming(5, {duration: 100}),
          ))
        },
        initialValues: {
          originY: targetValues.originY - height,
        },
      };
    };
  }
}
