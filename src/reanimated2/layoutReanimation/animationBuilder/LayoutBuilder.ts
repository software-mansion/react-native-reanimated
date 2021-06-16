import { withDelay, withTiming, withSpring } from '../../animations';
import {
  AnimationFunction,
  LayoutAnimationBuilderI,
  LayoutAnimationFunction,
  BaseLayoutAnimationConfig,
} from './commonTypes';
import { EasingFn } from '../../Easing';

export class Layout implements LayoutAnimationBuilderI {
  durationV?: number;
  easingV?: EasingFn;
  delayV?: number;
  type?: AnimationFunction;
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

  easing(easingFunction: EasingFn): Layout {
    this.easingV = easingFunction;
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
    this.type = withSpring as AnimationFunction;
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

  static build(): LayoutAnimationFunction {
    const instance = new Layout();
    return instance.build();
  }

  build: () => LayoutAnimationFunction = () => {
    const duration = this.durationV;
    const easing = this.easingV;
    const delay = this.delayV;
    const type = this.type ? this.type : (withTiming as AnimationFunction);
    const damping = this.dampingV;
    const mass = this.massV;
    const stiffness = this.stiffnessV;
    const overshootClamping = this.overshootClampingV;
    const restDisplacementThreshold = this.restDisplacementThresholdV;
    const restSpeedThreshold = this.restSpeedThresholdV;

    const delayFunction: AnimationFunction = delay
      ? withDelay
      : (_, animation: AnimationFunction) => {
          'worklet';
          return animation;
        };

    const animation = type;

    const config: BaseLayoutAnimationConfig = {};

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
  };
}
