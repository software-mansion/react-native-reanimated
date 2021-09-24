import {
  EntryExitAnimationFunction,
  IEntryExitAnimationBuilder,
} from '../animationBuilder/commonTypes';
import { withSequence, withTiming } from '../../animation';
import { Dimensions } from 'react-native';
import { BaseAnimationBuilder } from '../animationBuilder/BaseAnimationBuilder';

const { width, height } = Dimensions.get('window');

export class BounceIn
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceIn {
    return new BounceIn();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              scale: delayFunction(
                delay,
                withSequence(
                  withTiming(1.2, { duration: duration * 0.55 }),
                  withTiming(0.9, { duration: duration * 0.15 }),
                  withTiming(1.1, { duration: duration * 0.15 }),
                  withTiming(1, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ scale: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceInDown
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceInDown {
    return new BounceInDown();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(-20, { duration: duration * 0.55 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [
            {
              translateY: height,
            },
          ],
        },
        callback: callback,
      };
    };
  };
}

export class BounceInUp
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceInUp {
    return new BounceInUp();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(20, { duration: duration * 0.55 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateY: -height }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceInLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceInLeft {
    return new BounceInLeft();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(20, { duration: duration * 0.55 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: -width }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceInRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceInRight {
    return new BounceInRight();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(-20, { duration: duration * 0.55 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.15 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: width }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceOut
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceOut {
    return new BounceOut();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              scale: delayFunction(
                delay,
                withSequence(
                  withTiming(1.1, { duration: duration * 0.15 }),
                  withTiming(0.9, { duration: duration * 0.15 }),
                  withTiming(1.2, { duration: duration * 0.15 }),
                  withTiming(0, { duration: duration * 0.55 })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ scale: 1 }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutDown
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceOutDown {
    return new BounceOutDown();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-20, { duration: duration * 0.15 }),
                  withTiming(height, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutUp
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceOutUp {
    return new BounceOutUp();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateY: delayFunction(
                delay,
                withSequence(
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(20, { duration: duration * 0.15 }),
                  withTiming(-height, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateY: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutLeft
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceOutRight {
    return new BounceOutLeft();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(20, { duration: duration * 0.15 }),
                  withTiming(-width, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }],
        },
        callback: callback,
      };
    };
  };
}

export class BounceOutRight
  extends BaseAnimationBuilder
  implements IEntryExitAnimationBuilder {
  static createInstance(): BounceOutRight {
    return new BounceOutRight();
  }

  static getDuration(): number {
    return 600;
  }

  getDuration(): number {
    return this.durationV ?? 600;
  }

  build = (): EntryExitAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    const delay = this.getDelay();
    const duration = this.getDuration();
    const callback = this.callbackV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [
            {
              translateX: delayFunction(
                delay,
                withSequence(
                  withTiming(-10, { duration: duration * 0.15 }),
                  withTiming(10, { duration: duration * 0.15 }),
                  withTiming(-20, { duration: duration * 0.15 }),
                  withTiming(width, {
                    duration: duration * 0.55,
                  })
                )
              ),
            },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }],
        },
        callback: callback,
      };
    };
  };
}
