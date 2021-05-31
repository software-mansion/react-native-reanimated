import { withDelay, withSpring, withTiming } from '../animations';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const DefaultEntering = (targetValues) => {
  'worklet';
  return {
    initialValues: {
      originX: targetValues.originX,
      originY: targetValues.originY,
      width: targetValues.width,
      height: targetValues.height,
    },
    animations: {},
  };
};

export const DefaultLayout = (_) => {
  'worklet';
  return {
    initialValues: {},
    animations: {},
  };
};

export const DefaultExiting = (startValues) => {
  'worklet';
  return {
    initialValues: {
      originX: startValues.originX,
      originY: startValues.originY,
      width: startValues.width,
      height: startValues.height,
    },
    animations: {},
  };
};

export class Layout {
  static duration(r) {
    const instance = new Layout();
    return instance.duration(r);
  }

  duration(t) {
    this.durationV = t;
    return this;
  }

  static easing(r) {
    const instance = new Layout();
    return instance.easing(r);
  }

  easing(e) {
    this.easingV = e;
    return this;
  }

  static delay(r) {
    const instance = new Layout();
    return instance.delay(r);
  }

  delay(d) {
    this.delayV = d;
    return this;
  }

  rotate(v) {
    this.rotateV = v;
    return this;
  }

  static springify() {
    const instance = new Layout();
    return instance.springify();
  }

  springify() {
    this.type = withSpring;
    return this;
  }

  static damping(r) {
    const instance = new Layout();
    return instance.damping(r);
  }

  damping(d) {
    this.dampingV = d;
    return this;
  }

  static mass(r) {
    const instance = new Layout();
    return instance.mass(r);
  }

  mass(m) {
    this.massV = m;
    return this;
  }

  static stiffness(r) {
    const instance = new Layout();
    return instance.stiffness(r);
  }

  stiffness(s) {
    this.stiffnessV = s;
    return this;
  }

  static overshootClamping(r) {
    const instance = new Layout();
    return instance.overshootClamping(r);
  }

  overshootClamping(o) {
    this.overshootClampingV = o;
    return this;
  }

  static restDisplacementThreshold(r) {
    const instance = new Layout();
    return instance.restDisplacementThreshold(r);
  }

  restDisplacementThreshold(r) {
    this.restDisplacementThresholdV = r;
    return this;
  }

  static restSpeedThreshold(r) {
    const instance = new Layout();
    return instance.restSpeedThreshold(r);
  }

  restSpeedThreshold(r) {
    this.restSpeedThresholdV = r;
    return this;
  }

  static build() {
    const instance = new Layout();
    return instance.build();
  }

  build() {
    const duration = this.durationV;
    const easing = this.easingV;
    const delay = this.delayV;
    const type = this.type ? this.type : withTiming;
    const damping = this.dampingV;
    const mass = this.massV;
    const stiffness = this.stiffnessV;
    const overshootClamping = this.overshootClampingV;
    const restDisplacementThreshold = this.restDisplacementThresholdV;
    const restSpeedThreshold = this.restSpeedThresholdV;

    const delayFunction = delay
      ? withDelay
      : (_, animation) => {
          'worklet';
          return animation;
        };

    const animation = type;

    const config = {};

    if (type === withTiming) {
      if (easing) {
        config.easing = easing;
      }
      if (duration) {
        config.duration = duration;
      }
    } else {
      if (damping) {
        config.damping = damping;
      }
      if (mass) {
        config.mass = mass;
      }
      if (stiffness) {
        config.stiffness = stiffness;
      }
      if (overshootClamping) {
        config.overshootClamping = overshootClamping;
      }
      if (restDisplacementThreshold) {
        config.restDisplacementThreshold = restDisplacementThreshold;
      }
      if (restSpeedThreshold) {
        config.restSpeedThreshold = restSpeedThreshold;
      }
    }

    return (values) => {
      'worklet';
      return {
        initialValues: {
          originX: values.boriginX,
          originY: values.boriginY,
          width: values.bwidth,
          height: values.bheight,
        },
        animations: {
          originX: delayFunction(delay, animation(values.originX, config)),
          originY: delayFunction(delay, animation(values.originY, config)),
          width: delayFunction(delay, animation(values.width, config)),
          height: delayFunction(delay, animation(values.height, config)),
        },
      };
    };
  }
}

class BaseAnimationBuilder {
  static duration(r) {
    const instance = this.createInstance();
    return instance.duration(r);
  }

  duration(t) {
    this.durationV = t;
    return this;
  }

  static easing(r) {
    const instance = this.createInstance();
    return instance.easing(r);
  }

  easing(e) {
    this.easingV = e;
    return this;
  }

  static delay(r) {
    const instance = this.createInstance();
    return instance.delay(r);
  }

  delay(d) {
    this.delayV = d;
    return this;
  }

  rotate(v) {
    this.rotateV = v;
    return this;
  }

  static springify() {
    const instance = this.createInstance();
    return instance.springify();
  }

  springify() {
    this.type = withSpring;
    return this;
  }

  static damping(r) {
    const instance = this.createInstance();
    return instance.damping(r);
  }

  damping(d) {
    this.dampingV = d;
    return this;
  }

  static mass(r) {
    const instance = this.createInstance();
    return instance.mass(r);
  }

  mass(m) {
    this.massV = m;
    return this;
  }

  static stiffness(r) {
    const instance = this.createInstance();
    return instance.stiffness(r);
  }

  stiffness(s) {
    this.stiffnessV = s;
    return this;
  }

  static overshootClamping(r) {
    const instance = this.createInstance();
    return instance.overshootClamping(r);
  }

  overshootClamping(o) {
    this.overshootClampingV = o;
    return this;
  }

  static restDisplacementThreshold(r) {
    const instance = this.createInstance();
    return instance.restDisplacementThreshold(r);
  }

  restDisplacementThreshold(r) {
    this.restDisplacementThresholdV = r;
    return this;
  }

  static restSpeedThreshold(r) {
    const instance = this.createInstance();
    return instance.restSpeedThreshold(r);
  }

  restSpeedThreshold(r) {
    this.restSpeedThresholdV = r;
    return this;
  }

  static build() {
    const instance = this.createInstance();
    return instance.build();
  }

  getDelayFunction() {
    const delay = this.delayV;
    return delay
      ? withDelay
      : (_, animation) => {
          'worklet';
          return animation;
        };
  }

  getAnimationAndConfig() {
    const duration = this.durationV;
    const easing = this.easingV;
    const type = this.type ? this.type : withTiming;
    const damping = this.dampingV;
    const mass = this.massV;
    const stiffness = this.stiffnessV;
    const overshootClamping = this.overshootClampingV;
    const restDisplacementThreshold = this.restDisplacementThresholdV;
    const restSpeedThreshold = this.restSpeedThresholdV;

    const animation = type;

    const config = {};

    if (type === withTiming) {
      if (easing) {
        config.easing = easing;
      }
      if (duration) {
        config.duration = duration;
      }
    } else {
      if (damping) {
        config.damping = damping;
      }
      if (mass) {
        config.mass = mass;
      }
      if (stiffness) {
        config.stiffness = stiffness;
      }
      if (overshootClamping) {
        config.overshootClamping = overshootClamping;
      }
      if (restDisplacementThreshold) {
        config.restDisplacementThreshold = restDisplacementThreshold;
      }
      if (restSpeedThreshold) {
        config.restSpeedThreshold = restSpeedThreshold;
      }
    }
    return [animation, config];
  }
}

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

    return (a) => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, animation(1, config)) },
            { rotate: delayFunction(delay, animation(0, config)) }
          ],
        },
        initialValues: {
          transform: [{ scale: 0 }, { rotate: rotate }],
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

    return (a) => {
      'worklet';
      return {
        animations: {
          transform: [
            { scale: delayFunction(delay, animation(0, config)) },
            { rotate: delayFunction(delay, animation(rotate, config)) }
          ],
        },
        initialValues: {
          transform: [{ scale: 1 }, { rotate: 0 }],
        },
      };
    };
  }
}

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
          originX: values.originX - width,
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
          originX: values.originX + width,
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
        initialValues: {},
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
        initialValues: {},
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
          originY: delayFunction(delay, animation(0, config)),
        },
        initialValues: {
          originY: values.originY + height,
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

export class OpacityIn extends BaseAnimationBuilder {
  static createInstance() {
    return new OpacityIn();
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

export class OpacityOut extends BaseAnimationBuilder {
  static createInstance() {
    return new OpacityOut();
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

export class StretchInX extends BaseAnimationBuilder {
  static createInstance() {
    return new StretchInX();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleX: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 0 }],
        },
      };
    };
  }
}

export class StretchInY extends BaseAnimationBuilder {
  static createInstance() {
    return new StretchInY();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleY: delayFunction(delay, animation(1, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 0 }],
        },
      };
    };
  }
}

export class StretchOutX extends BaseAnimationBuilder {
  static createInstance() {
    return new StretchOutX();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleX: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleX: 1 }],
        },
      };
    };
  }
}

export class StretchOutY extends BaseAnimationBuilder {
  static createInstance() {
    return new StretchOutY();
  }

  build() {
    const delayFunction = this.getDelayFunction();
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.delayV;

    return () => {
      'worklet';
      return {
        animations: {
          transform: [{ scaleY: delayFunction(delay, animation(0, config)) }],
        },
        initialValues: {
          transform: [{ scaleY: 1 }],
        },
      };
    };
  }
}

/* entering={StyleIn.add({}).add({})}
entering={StyleIn.frames({
    0: {

    },
    40: {

    },
    100: {

    },
})} */
