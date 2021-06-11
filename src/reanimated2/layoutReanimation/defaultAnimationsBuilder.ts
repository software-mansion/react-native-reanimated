import { withDelay, withSpring, withTiming } from '../animations';
import { EasingFn } from '../Easing';

export const DefaultEntering = (targetValues) => {
  // TODO: types
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
  // TODO: types
  'worklet';
  return {
    initialValues: {},
    animations: {},
  };
};

export const DefaultExiting = (startValues) => {
  // TODO: types
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

interface LayoutConfig {
  duration?: number;
  easing?: EasingFn;
  delay?: number;
  type?: any; // TODO: anmation type
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: number;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

// TODO: layout config for spring and timing

export class Layout {
  durationV?: number;
  easingV?: EasingFn;
  delayV?: number;
  type?: any; // TODO: animation type
  dampingV?: number;
  massV?: number;
  stiffnessV?: number;
  overshootClampingV?: number;
  restDisplacementThresholdV?: number;
  restSpeedThresholdV: number;

  static duration(durationMs: number): Layout {
    const instance = new Layout();
    return instance.duration(durationMs);
  }

  duration(durationMs: number): Layout {
    this.durationV = durationMs;
    return this;
  }

  static easing(easingFunction: EasingFn): Layout {
    const instance = new Layout();
    return instance.easing(easingFunction);
  }

  easing(e: any): Layout {
    this.easingV = e;
    return this;
  }

  static delay(durationMs: number): Layout {
    const instance = new Layout();
    return instance.delay(durationMs);
  }

  delay(durationMs: number): Layout {
    this.delayV = durationMs;
    return this;
  }

  static springify(): Layout {
    const instance = new Layout();
    return instance.springify();
  }

  springify(): Layout {
    this.type = withSpring;
    return this;
  }

  static damping(damping: number): Layout {
    const instance = new Layout();
    return instance.damping(damping);
  }

  damping(damping: number): Layout {
    this.dampingV = damping;
    return this;
  }

  static mass(mass: number): Layout {
    const instance = new Layout();
    return instance.mass(mass);
  }

  mass(mass: number): Layout {
    this.massV = mass;
    return this;
  }

  static stiffness(stiffness: number): Layout {
    const instance = new Layout();
    return instance.stiffness(stiffness);
  }

  stiffness(stiffness: number): Layout {
    this.stiffnessV = stiffness;
    return this;
  }

  static overshootClamping(overshootClamping: number): Layout {
    const instance = new Layout();
    return instance.overshootClamping(overshootClamping);
  }

  overshootClamping(overshootClamping: number): Layout {
    this.overshootClampingV = overshootClamping;
    return this;
  }

  static restDisplacementThreshold(restDisplacementThreshold: number): Layout {
    const instance = new Layout();
    return instance.restDisplacementThreshold(restDisplacementThreshold);
  }

  restDisplacementThreshold(restDisplacementThreshold: number): Layout {
    this.restDisplacementThresholdV = restDisplacementThreshold;
    return this;
  }

  static restSpeedThreshold(r: number): Layout {
    const instance = new Layout();
    return instance.restSpeedThreshold(r);
  }

  restSpeedThreshold(restSpeedThreshold: number): Layout {
    this.restSpeedThresholdV = restSpeedThreshold;
    return this;
  }

  static build() {
    // TODO: returned type
    const instance = new Layout();
    return instance.build();
  }

  build() {
    // TODO: returned type
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

    const config: LayoutConfig = {};

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
      // TODO: add type for this worklet
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
  durationV?: number;
  easingV?: EasingFn;
  delayV?: number;
  rotateV?: number | string; // TODO: rotate is not applaying for every type of aninmation
  type?: any; // TODO: animation type
  dampingV?: number;
  massV?: number;
  stiffnessV?: number;
  overshootClampingV?: number;
  restDisplacementThresholdV?: number;
  restSpeedThresholdV: number;

  static duration(durationMs: number): BaseAnimationBuilder {
    const instance = this.createInstance(); // TODO: instnace
    return instance.duration(durationMs);
  }

  duration(durationMs: number): BaseAnimationBuilder {
    this.durationV = durationMs;
    return this;
  }

  static easing(easingFunction: EasingFn): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.easing(easingFunction);
  }

  easing(easingFunction: EasingFn): BaseAnimationBuilder {
    this.easingV = easingFunction;
    return this;
  }

  static delay(delayMs: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.delay(delayMs);
  }

  delay(delayMs: number): BaseAnimationBuilder {
    this.delayV = delayMs;
    return this;
  }

  static rotate(degree: number | string): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.rotate(degree);
  }

  rotate(degree: number | string): BaseAnimationBuilder {
    this.rotateV = degree;
    return this;
  }

  static springify(): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.springify();
  }

  springify(): BaseAnimationBuilder {
    this.type = withSpring;
    return this;
  }

  static damping(damping: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.damping(damping);
  }

  damping(damping: number): BaseAnimationBuilder {
    this.dampingV = damping;
    return this;
  }

  static mass(mass: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.mass(mass);
  }

  mass(mass: number): BaseAnimationBuilder {
    this.massV = mass;
    return this;
  }

  static stiffness(stiffness: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.stiffness(stiffness);
  }

  stiffness(stiffness: number): BaseAnimationBuilder {
    this.stiffnessV = stiffness;
    return this;
  }

  static overshootClamping(overshootClamping: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.overshootClamping(overshootClamping);
  }

  overshootClamping(overshootClamping: number): BaseAnimationBuilder {
    this.overshootClampingV = overshootClamping;
    return this;
  }

  static restDisplacementThreshold(
    restDisplacementThreshold: number
  ): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.restDisplacementThreshold(restDisplacementThreshold);
  }

  restDisplacementThreshold(
    restDisplacementThreshold: number
  ): BaseAnimationBuilder {
    this.restDisplacementThresholdV = restDisplacementThreshold;
    return this;
  }

  static restSpeedThreshold(restSpeedThreshold: number): BaseAnimationBuilder {
    const instance = this.createInstance();
    return instance.restSpeedThreshold(restSpeedThreshold);
  }

  restSpeedThreshold(restSpeedThreshold: number): BaseAnimationBuilder {
    this.restSpeedThresholdV = restSpeedThreshold;
    return this;
  }

  static build() {
    // TODO: returned type
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
    const rotate = this.rotateV;
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
      if (rotate) {
        config.rotate = rotate;
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

  static build() {
    const instance = this.createInstance();
    return instance.build();
  }
}
