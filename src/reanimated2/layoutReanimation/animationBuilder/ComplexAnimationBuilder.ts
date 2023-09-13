'use strict';
import { withTiming, withSpring } from '../../animation';
import type {
  AnimationFunction,
  BaseBuilderAnimationConfig,
  LayoutAnimationAndConfig,
} from './commonTypes';
import type { EasingFunction } from '../../Easing';
import { BaseAnimationBuilder } from './BaseAnimationBuilder';
import type { StyleProps } from '../../commonTypes';

export class ComplexAnimationBuilder extends BaseAnimationBuilder {
  easingV?: EasingFunction;
  rotateV?: string;
  type?: AnimationFunction;
  dampingV?: number;
  dampingRatioV?: number;
  massV?: number;
  stiffnessV?: number;
  overshootClampingV?: number;
  restDisplacementThresholdV?: number;
  restSpeedThresholdV?: number;
  initialValues?: StyleProps;

  static createInstance: <T extends typeof BaseAnimationBuilder>(
    this: T
  ) => InstanceType<T>;

  static easing<T extends typeof ComplexAnimationBuilder>(
    this: T,
    easingFunction: EasingFunction
  ) {
    const instance = this.createInstance();
    return instance.easing(easingFunction);
  }

  easing(easingFunction: EasingFunction): this {
    this.easingV = easingFunction;
    return this;
  }

  static rotate<T extends typeof ComplexAnimationBuilder>(
    this: T,
    degree: string
  ) {
    const instance = this.createInstance();
    return instance.rotate(degree);
  }

  rotate(degree: string): this {
    this.rotateV = degree;
    return this;
  }

  static springify<T extends typeof ComplexAnimationBuilder>(
    this: T,
    duration?: number
  ): ComplexAnimationBuilder {
    const instance = this.createInstance();
    return instance.springify(duration);
  }

  springify(duration?: number): this {
    this.durationV = duration;
    this.type = withSpring as AnimationFunction;
    return this;
  }

  static dampingRatio<T extends typeof ComplexAnimationBuilder>(
    this: T,
    dampingRatio: number
  ) {
    const instance = this.createInstance();
    return instance.dampingRatio(dampingRatio);
  }

  dampingRatio(dampingRatio: number): this {
    this.dampingRatioV = dampingRatio;
    return this;
  }

  static damping<T extends typeof ComplexAnimationBuilder>(
    this: T,
    damping: number
  ) {
    const instance = this.createInstance();
    return instance.damping(damping);
  }

  damping(damping: number): this {
    this.dampingV = damping;
    return this;
  }

  static mass<T extends typeof ComplexAnimationBuilder>(this: T, mass: number) {
    const instance = this.createInstance();
    return instance.mass(mass);
  }

  mass(mass: number): this {
    this.massV = mass;
    return this;
  }

  static stiffness<T extends typeof ComplexAnimationBuilder>(
    this: T,
    stiffness: number
  ) {
    const instance = this.createInstance();
    return instance.stiffness(stiffness);
  }

  stiffness(stiffness: number): this {
    this.stiffnessV = stiffness;
    return this;
  }

  static overshootClamping<T extends typeof ComplexAnimationBuilder>(
    this: T,
    overshootClamping: number
  ) {
    const instance = this.createInstance();
    return instance.overshootClamping(overshootClamping);
  }

  overshootClamping(overshootClamping: number): this {
    this.overshootClampingV = overshootClamping;
    return this;
  }

  static restDisplacementThreshold<T extends typeof ComplexAnimationBuilder>(
    this: T,
    restDisplacementThreshold: number
  ) {
    const instance = this.createInstance();
    return instance.restDisplacementThreshold(restDisplacementThreshold);
  }

  restDisplacementThreshold(restDisplacementThreshold: number) {
    this.restDisplacementThresholdV = restDisplacementThreshold;
    return this;
  }

  static restSpeedThreshold<T extends typeof ComplexAnimationBuilder>(
    this: T,
    restSpeedThreshold: number
  ) {
    const instance = this.createInstance();
    return instance.restSpeedThreshold(restSpeedThreshold);
  }

  restSpeedThreshold(restSpeedThreshold: number): this {
    this.restSpeedThresholdV = restSpeedThreshold;
    return this;
  }

  static withInitialValues<T extends typeof ComplexAnimationBuilder>(
    this: T,
    values: StyleProps
  ) {
    const instance = this.createInstance();
    return instance.withInitialValues(values);
  }

  withInitialValues(values: StyleProps): this {
    this.initialValues = values;
    return this;
  }

  getAnimationAndConfig(): LayoutAnimationAndConfig {
    const duration = this.durationV;
    const easing = this.easingV;
    const rotate = this.rotateV;
    const type = this.type ? this.type : (withTiming as AnimationFunction);
    const damping = this.dampingV;
    const dampingRatio = this.dampingRatioV;
    const mass = this.massV;
    const stiffness = this.stiffnessV;
    const overshootClamping = this.overshootClampingV;
    const restDisplacementThreshold = this.restDisplacementThresholdV;
    const restSpeedThreshold = this.restSpeedThresholdV;

    const animation = type;

    const config: BaseBuilderAnimationConfig = {};

    function maybeSetConfigValue<Key extends keyof BaseBuilderAnimationConfig>(
      value: BaseBuilderAnimationConfig[Key],
      variableName: Key
    ) {
      if (value) {
        config[variableName] = value;
      }
    }

    if (type === withTiming) {
      maybeSetConfigValue(easing, 'easing');
    }

    (
      [
        { variableName: 'damping', value: damping },
        { variableName: 'dampingRatio', value: dampingRatio },
        { variableName: 'mass', value: mass },
        { variableName: 'stiffness', value: stiffness },
        { variableName: 'overshootClamping', value: overshootClamping },
        {
          variableName: 'restDisplacementThreshold',
          value: restDisplacementThreshold,
        },
        { variableName: 'restSpeedThreshold', value: restSpeedThreshold },
        { variableName: 'duration', value: duration },
        { variableName: 'rotate', value: rotate },
      ] as const
    ).forEach(({ value, variableName }) =>
      maybeSetConfigValue(value, variableName)
    );

    return [animation, config];
  }
}
