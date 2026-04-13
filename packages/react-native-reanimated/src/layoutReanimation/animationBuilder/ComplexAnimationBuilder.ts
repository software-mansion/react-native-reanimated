'use strict';
import { withSpring, withTiming } from '../../animation';
import { assertEasingIsWorklet } from '../../animation/util';
import type {
  AnimationFunction,
  BaseBuilderAnimationConfig,
  EasingFunction,
  LayoutAnimationAndConfig,
  StyleProps,
} from '../../commonTypes';
import type { EasingFunctionFactory } from '../../Easing';
import { BaseAnimationBuilder } from './BaseAnimationBuilder';

/**
 * `this` type for every static method on {@link ComplexAnimationBuilder}.
 * Represents a subclass constructor that preserves the concrete
 * `TInitialValues` type argument while still exposing the static API inherited
 * from {@link BaseAnimationBuilder}.
 */
type ComplexAnimationBuilderClass<TInitialValues> =
  typeof BaseAnimationBuilder &
    (new () => ComplexAnimationBuilder<TInitialValues>);

export class ComplexAnimationBuilder<
  TInitialValues = StyleProps,
> extends BaseAnimationBuilder {
  easingV?: EasingFunction | EasingFunctionFactory;
  rotateV?: string;
  type?: AnimationFunction;
  dampingV?: number;
  dampingRatioV?: number;
  massV?: number;
  stiffnessV?: number;
  overshootClampingV?: number;
  energyThresholdV?: number;
  initialValues?: Partial<TInitialValues>;

  static createInstance: <T extends typeof BaseAnimationBuilder>(
    this: T
  ) => InstanceType<T>;

  /**
   * Lets you change the easing curve of the animation. Can be chained alongside
   * other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param easingFunction - An easing function which defines the animation
   *   curve.
   */
  static easing<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    easingFunction: EasingFunction | EasingFunctionFactory
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.easing(easingFunction);
  }

  easing(easingFunction: EasingFunction | EasingFunctionFactory): this {
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
  static rotate<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    degree: string
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.rotate(degree);
  }

  rotate(degree: string): this {
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
  static springify<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    duration?: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.springify(duration);
  }

  springify(duration?: number): this {
    this.durationV = duration;
    this.type = withSpring as AnimationFunction;
    return this;
  }

  /**
   * Lets you adjust the spring animation damping ratio. Can be chained
   * alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param dampingRatio - How damped the spring is.
   */
  static dampingRatio<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    dampingRatio: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.dampingRatio(dampingRatio);
  }

  dampingRatio(value: number): this {
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
  static damping<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    value: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.damping(value);
  }

  damping(damping: number): this {
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
  static mass<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    mass: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.mass(mass);
  }

  mass(mass: number): this {
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
  static stiffness<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    stiffness: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.stiffness(stiffness);
  }

  stiffness(stiffness: number): this {
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
  static overshootClamping<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    overshootClamping: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.overshootClamping(overshootClamping);
  }

  overshootClamping(overshootClamping: number): this {
    this.overshootClampingV = overshootClamping;
    return this;
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in the upcoming major version.
   */
  static restDisplacementThreshold<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    _restDisplacementThreshold: number
  ): ComplexAnimationBuilder<TInitialValues> {
    return this.createInstance();
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in the upcoming major version.
   */
  restDisplacementThreshold(_restDisplacementThreshold: number) {
    return this;
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in a future version.
   */
  static restSpeedThreshold<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    _restSpeedThreshold: number
  ): ComplexAnimationBuilder<TInitialValues> {
    return this.createInstance();
  }

  /**
   * @deprecated Use {@link energyThreshold} instead. This method currently does
   *   nothing and will be removed in a future version.
   */
  restSpeedThreshold(_restSpeedThreshold: number): this {
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
  static energyThreshold<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    energyThreshold: number
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.energyThreshold(energyThreshold);
  }

  energyThreshold(energyThreshold: number): this {
    this.energyThresholdV = energyThreshold;
    return this;
  }

  /**
   * Lets you override the initial config of the animation
   *
   * @param values - An object containing the styles to override.
   */
  static withInitialValues<TInitialValues>(
    this: ComplexAnimationBuilderClass<TInitialValues>,
    values: Partial<TInitialValues>
  ): ComplexAnimationBuilder<TInitialValues> {
    const instance = this.createInstance();
    return instance.withInitialValues(values);
  }

  withInitialValues(values: Partial<TInitialValues>): this {
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
    const energyThreshold = this.energyThresholdV;

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
        { variableName: 'energyThreshold', value: energyThreshold },
        { variableName: 'duration', value: duration },
        { variableName: 'rotate', value: rotate },
      ] as const
    ).forEach(({ value, variableName }) =>
      maybeSetConfigValue(value, variableName)
    );

    return [animation, config];
  }
}
