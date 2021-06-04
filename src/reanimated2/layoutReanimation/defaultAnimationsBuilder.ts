// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { withDelay, withSpring, withTiming } from '../animations';

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

export class BaseAnimationBuilder {
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

  static rotate(r) {
    const instance = this.createInstance();
    return instance.rotate(r);
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

export class BaseBounceAnimationBuilder {
  static duration(r) {
    const instance = this.createInstance();
    return instance.duration(r);
  }

  duration(t) {
    this.durationV = t;
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
    const type = withTiming;
    const animation = type;

    const config = {};

    if (easing) {
      config.easing = easing;
    }
    if (duration) {
      config.duration = duration;
    }

    return [animation, config];
  }
}
