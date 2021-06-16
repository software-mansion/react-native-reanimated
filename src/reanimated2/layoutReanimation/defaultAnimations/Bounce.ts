import {
  BaseBounceAnimationBuilder,
  EntryExitAnimationBuilderI,
  EntryExitAnimationFunction,
} from '../defaultAnimationsBuilder';
import { withSequence, withTiming } from '../../animations';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export class BounceIn
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceIn {
    return new BounceIn();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              scale: delayFunction(
                delay,
                withSequence(
                  withTiming(1.2, { duration: duration }),
                  withTiming(0.9, { duration: (duration * 100) / 250 }),
                  withTiming(1.1, { duration: (duration * 100) / 250 }),
                  withTiming(1, { duration: (duration * 100) / 250 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ scale: 0 }],
        },
      };
    };
  };
}

export class BounceInDown
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceInDown {
    return new BounceInDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(-20, { duration: duration }),
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(5, { duration: (duration * 100) / 250 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              translateY: targetValues.originY + height,
            },
          ],
        },
      };
    };
  };
}

export class BounceInUp
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceInUp {
    return new BounceInUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(20, { duration: duration }),
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(0, { duration: (duration * 100) / 250 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateY: targetValues.originY - height }],
        },
      };
    };
  };
}

export class BounceInLeft
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceInLeft {
    return new BounceInLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(20, { duration: duration }),
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(0, { duration: (duration * 100) / 250 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: targetValues.originX - width }],
        },
      };
    };
  };
}

export class BounceInRight
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceInRight {
    return new BounceInRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(-20, { duration: duration }),
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(0, { duration: (duration * 100) / 250 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: targetValues.originX + width }],
        },
      };
    };
  };
}

export class BounceOut
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceOut {
    return new BounceOut();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              scale: delayFunction(
                delay,
                withSequence(
                  withTiming(1.1, { duration: (duration * 100) / 250 }),
                  withTiming(0.9, { duration: (duration * 100) / 250 }),
                  withTiming(1.2, { duration: (duration * 100) / 250 }),
                  withTiming(0, { duration: duration })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ scale: 1 }],
        },
      };
    };
  };
}

export class BounceOutDown
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceOutDown {
    return new BounceOutDown();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(-20, { duration: (duration * 100) / 250 }),
                  withTiming(targetValues.originY + height, {
                    duration: duration,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          originY: 0,
        },
      };
    };
  };
}

export class BounceOutUp
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceOutUp {
    return new BounceOutUp();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(20, { duration: (duration * 100) / 250 }),
                  withTiming(targetValues.originY - height, {
                    duration: duration,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }],
        },
      };
    };
  };
}

export class BounceOutLeft
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceOutRight {
    return new BounceOutLeft();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(20, { duration: (duration * 100) / 250 }),
                  withTiming(targetValues.originX - width, {
                    duration: duration,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }],
        },
      };
    };
  };
}

export class BounceOutRight
  extends BaseBounceAnimationBuilder
  implements EntryExitAnimationBuilderI {
  static createInstance(): BounceOutRight {
    return new BounceOutRight();
  }

  build: () => EntryExitAnimationFunction = () => {
    const delayFunction = this.getDelayFunction();
    const delay = this.delayV;
    const duration = this.durationV ? this.durationV : 250;

    return (targetValues) => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(-10, { duration: (duration * 100) / 250 }),
                  withTiming(10, { duration: (duration * 100) / 250 }),
                  withTiming(-20, { duration: (duration * 100) / 250 }),
                  withTiming(targetValues.originX + width, {
                    duration: duration,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }],
        },
      };
    };
  };
}
