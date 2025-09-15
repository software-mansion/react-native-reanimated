'use strict';

import { withSpring, withTiming } from '../../animation';
import { assertEasingIsWorklet } from '../../animation/util';
import { BaseAnimationBuilder } from './BaseAnimationBuilder';
export class ComplexAnimationBuilder extends BaseAnimationBuilder {
  /**
   * Lets you change the easing curve of the animation. Can be chained alongside
   * other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param easingFunction - An easing function which defines the animation
   *   curve.
   */
  static easing(easingFunction) {
    const instance = this.createInstance();
    return instance.easing(easingFunction);
  }
  easing(easingFunction) {
    if (__DEV__) {
      assertEasingIsWorklet(easingFunction);
    }
    this.easingV = easingFunction;
    return this;
  }

  /**
   * Lets you rotate the element. Can be chained alongside other [layout
   * animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param degree - The rotation degree.
   */
  static rotate(degree) {
    const instance = this.createInstance();
    return instance.rotate(degree);
  }
  rotate(degree) {
    this.rotateV = degree;
    return this;
  }

  /**
   * Enables the spring-based animation configuration. Can be chained alongside
   * other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param duration - An optional duration of the spring animation (in
   *   milliseconds).
   */
  static springify(duration) {
    const instance = this.createInstance();
    return instance.springify(duration);
  }
  springify(duration) {
    this.durationV = duration;
    this.type = withSpring;
    return this;
  }

  /**
   * Lets you adjust the spring animation damping ratio. Can be chained
   * alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param dampingRatio - How damped the spring is.
   */
  static dampingRatio(dampingRatio) {
    const instance = this.createInstance();
    return instance.dampingRatio(dampingRatio);
  }
  dampingRatio(value) {
    this.dampingRatioV = value;
    return this;
  }

  /**
   * Lets you adjust the spring animation damping. Can be chained alongside
   * other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param value - Decides how quickly a spring stops moving. Higher damping
   *   means the spring will come to rest faster.
   */
  static damping(damping) {
    const instance = this.createInstance();
    return instance.damping(damping);
  }
  damping(damping) {
    this.dampingV = damping;
    return this;
  }

  /**
   * Lets you adjust the spring animation mass. Can be chained alongside other
   * [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param mass - The weight of the spring. Reducing this value makes the
   *   animation faster.
   */
  static mass(mass) {
    const instance = this.createInstance();
    return instance.mass(mass);
  }
  mass(mass) {
    this.massV = mass;
    return this;
  }

  /**
   * Lets you adjust the stiffness of the spring animation. Can be chained
   * alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param stiffness - How bouncy the spring is.
   */
  static stiffness(stiffness) {
    const instance = this.createInstance();
    return instance.stiffness(stiffness);
  }
  stiffness(stiffness) {
    this.stiffnessV = stiffness;
    return this;
  }

  /**
   * Lets you adjust overshoot clamping of the spring. Can be chained alongside
   * other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param overshootClamping - Whether a spring can bounce over the final
   *   position.
   */
  static overshootClamping(overshootClamping) {
    const instance = this.createInstance();
    return instance.overshootClamping(overshootClamping);
  }
  overshootClamping(overshootClamping) {
    this.overshootClampingV = overshootClamping;
    return this;
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in the upcoming major version.
   */
  static restDisplacementThreshold(_restDisplacementThreshold) {
    return this.createInstance();
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in the upcoming major version.
   */
  restDisplacementThreshold(_restDisplacementThreshold) {
    return this;
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in a future version.
   */
  static restSpeedThreshold(_restSpeedThreshold) {
    return this.createInstance();
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in a future version.
   */
  restSpeedThreshold(_restSpeedThreshold) {
    return this;
  }

  /**
   * Lets you adjust the energy threshold level to stop the spring animation.
   * Can be chained alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param energyThreshold - Relative energy threshold below which the spring
   *   will snap to `toValue` without further oscillations. Defaults to 6e-9.
   */
  static energyThreshold(energyThreshold) {
    const instance = this.createInstance();
    return instance.energyThreshold(energyThreshold);
  }
  energyThreshold(energyThreshold) {
    this.energyThresholdV = energyThreshold;
    return this;
  }

  /**
   * Lets you override the initial config of the animation
   *
   * @param values - An object containing the styles to override.
   */
  static withInitialValues(values) {
    const instance = this.createInstance();
    return instance.withInitialValues(values);
  }
  withInitialValues(values) {
    this.initialValues = values;
    return this;
  }
  getAnimationAndConfig() {
    const duration = this.durationV;
    const easing = this.easingV;
    const rotate = this.rotateV;
    const type = this.type ? this.type : withTiming;
    const damping = this.dampingV;
    const dampingRatio = this.dampingRatioV;
    const mass = this.massV;
    const stiffness = this.stiffnessV;
    const overshootClamping = this.overshootClampingV;
    const energyThreshold = this.energyThresholdV;
    const animation = type;
    const config = {};
    function maybeSetConfigValue(value, variableName) {
      if (value) {
        config[variableName] = value;
      }
    }
    if (type === withTiming) {
      maybeSetConfigValue(easing, 'easing');
    }
    [{
      variableName: 'damping',
      value: damping
    }, {
      variableName: 'dampingRatio',
      value: dampingRatio
    }, {
      variableName: 'mass',
      value: mass
    }, {
      variableName: 'stiffness',
      value: stiffness
    }, {
      variableName: 'overshootClamping',
      value: overshootClamping
    }, {
      variableName: 'energyThreshold',
      value: energyThreshold
    }, {
      variableName: 'duration',
      value: duration
    }, {
      variableName: 'rotate',
      value: rotate
    }].forEach(({
      value,
      variableName
    }) => maybeSetConfigValue(value, variableName));
    return [animation, config];
  }
}
//# sourceMappingURL=ComplexAnimationBuilder.js.map