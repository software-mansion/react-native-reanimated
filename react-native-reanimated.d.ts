// Project: https://github.com/kmagiera/react-native-reanimated
// TypeScript Version: 2.8

declare module 'react-native-reanimated' {
  import { ComponentClass } from 'react';
  import {
    ViewProps,
    TextProps,
    ImageProps,
    ScrollViewProps,
    StyleProp,
    ViewStyle,
    TextStyle,
    ImageStyle,
  } from 'react-native';

  class AnimatedNode<T> {
    constructor(
      nodeConfig: object,
      inputNodes?: ReadonlyArray<AnimatedNode<any>>
    );
    isNativelyInitialized(): boolean;
    /**
     * ' __value' is not available at runtime on AnimatedNode<T>. It is
     * necessary to have some discriminating property on a type to know that
     * an AnimatedNode<number> and AnimatedNode<string> are not compatible types.
     */
    ' __value': T;
  }
  // exporting the AnimatedNode as an interface because it is often needed at
  // type-time, but not available at runtime except on the default export
  interface IAnimatedNode<T> extends AnimatedNode<T> {}
  export { IAnimatedNode as AnimatedNode };

  class AnimatedClock extends AnimatedNode<number> {
    constructor();
  }

  enum Extrapolate {
    EXTEND = 'extend',
    CLAMP = 'clamp',
    IDENTITY = 'identity',
  }

  interface InterpolationConfig {
    inputRange: ReadonlyArray<Adaptable<number>>;
    outputRange: ReadonlyArray<Adaptable<number>>;
    extrapolate?: Extrapolate;
    extrapolateLeft?: Extrapolate;
    extrapolateRight?: Extrapolate;
  }
  class AnimatedValue extends AnimatedNode<number> {
    constructor(value: number);

    setValue(value: number): void;

    interpolate(config: InterpolationConfig): AnimatedNode<number>;
  }

  export type Mapping = { [key: string]: Mapping } | AnimatedValue;
  export type Adaptable<T> =
    | T
    | AnimatedNode<T>
    | ReadonlyArray<T | AnimatedNode<T>>;
  type BinaryOperator = (
    left: Adaptable<number>,
    right: Adaptable<number>
  ) => AnimatedNode<number>;
  type UnaryOperator = (value: Adaptable<number>) => AnimatedNode<number>;
  type LogicalOperator = (
    value: Adaptable<number>,
    ...others: Adaptable<number>[]
  ) => AnimatedNode<number>;

  export interface DecayState {
    finished: AnimatedValue;
    velocity: AnimatedValue;
    position: AnimatedValue;
    time: AnimatedValue;
  }
  export interface DecayConfig {
    deceleration: Adaptable<number>;
  }

  export interface TimingState {
    finished: AnimatedValue;
    velocity: AnimatedValue;
    position: AnimatedValue;
    time: AnimatedValue;
  }
  type EasingFunction = (value: Adaptable<number>) => AnimatedNode<number>;
  export interface TimingConfig {
    toValue: Adaptable<number>;
    duration: Adaptable<number>;
    easing: EasingFunction;
  }

  export interface SpringState {
    finished?: AnimatedValue;
    velocity?: AnimatedValue;
    position?: AnimatedValue;
    time?: AnimatedValue;
  }
  export interface SpringConfig {
    damping: Adaptable<number>;
    mass: Adaptable<number>;
    stiffness: Adaptable<number>;
    overshootClamping: Adaptable<number> | boolean;
    restSpeedThreshold: Adaptable<number>;
    restDisplacementThreshold: Adaptable<number>;
    toValue: Adaptable<number>;
  }

  type AnimateStyle<S extends object> = {
    [K in keyof S]: S[K] extends ReadonlyArray<any>
      ? ReadonlyArray<AnimateStyle<S[K][0]>>
      : S[K] extends object
        ? AnimateStyle<S[K]>
        :
            | S[K]
            | AnimatedNode<
                // allow `number` where `string` normally is to support colors
                S[K] extends string ? S[K] | number : S[K]
              >
  };

  type AnimateProps<
    S extends object,
    P extends {
      style?: StyleProp<S>;
    }
  > = {
    [K in keyof P]: K extends 'style'
      ? StyleProp<AnimateStyle<S>>
      : P[K] | AnimatedNode<P[K]>
  };

  interface Animated {
    // components
    View: ComponentClass<AnimateProps<ViewStyle, ViewProps>>;
    Text: ComponentClass<AnimateProps<TextStyle, TextProps>>;
    Image: ComponentClass<AnimateProps<ImageStyle, ImageProps>>;
    ScrollView: ComponentClass<AnimateProps<ViewStyle, ScrollViewProps>>;

    // classes
    Clock: typeof AnimatedClock;
    Value: typeof AnimatedValue;
    Node: typeof AnimatedNode;

    // base operations
    add: BinaryOperator;
    sub: BinaryOperator;
    multiply: BinaryOperator;
    divide: BinaryOperator;
    pow: BinaryOperator;
    modulo: BinaryOperator;
    sqrt: UnaryOperator;
    sin: UnaryOperator;
    cos: UnaryOperator;
    exp: UnaryOperator;
    round: UnaryOperator;
    lessThan: BinaryOperator;
    eq: BinaryOperator;
    greaterThan: BinaryOperator;
    lessOrEq: BinaryOperator;
    greaterOrEq: BinaryOperator;
    neq: BinaryOperator;
    and: LogicalOperator;
    or: LogicalOperator;
    defined(value: Adaptable<any>): AnimatedNode<0 | 1>;
    not(value: Adaptable<any>): AnimatedNode<0 | 1>;
    set(
      valueToBeUpdated: AnimatedValue,
      sourceNode: Adaptable<number>
    ): AnimatedNode<number>;
    cond(
      conditionNode: Adaptable<number>,
      ifNode: Adaptable<number>,
      elseNode?: Adaptable<number>
    ): AnimatedNode<number>;
    block<T>(items: ReadonlyArray<Adaptable<T>>): AnimatedNode<T>;
    call<T>(
      nodes: ReadonlyArray<AnimatedNode<T>>,
      callback: (values: ReadonlyArray<T>) => void
    ): AnimatedNode<0>;
    debug<T>(message: string, value: Adaptable<T>): AnimatedNode<T>;
    onChange(
      value: Adaptable<any>,
      action: Adaptable<any>
    ): AnimatedNode<undefined>;
    startClock(clock: AnimatedClock): AnimatedNode<0>;
    always(item: AnimatedNode<any>): AnimatedNode<0>;
    stopClock(clock: AnimatedClock): AnimatedNode<0>;
    clockRunning(clock: AnimatedClock): AnimatedNode<0 | 1>;
    // the return type for `event` is a lie, but it's the same lie that
    // react-native makes within Animated
    event(
      argMapping: ReadonlyArray<Mapping | null>,
      config?: {}
    ): (...args: any[]) => void;

    // derived operations
    abs(value: Adaptable<number>): AnimatedNode<number>;
    acc(value: Adaptable<number>): AnimatedNode<number>;
    color(
      r: Adaptable<number>,
      g: Adaptable<number>,
      b: Adaptable<number>,
      a?: Adaptable<number>
    ): AnimatedNode<number>;
    diff(value: Adaptable<number>): AnimatedNode<number>;
    diffClamp(
      value: Adaptable<number>,
      minVal: Adaptable<number>,
      maxVal: Adaptable<number>
    ): AnimatedNode<number>;
    interpolate(
      value: Adaptable<number>,
      config: InterpolationConfig
    ): AnimatedNode<number>;
    max: BinaryOperator;
    min: BinaryOperator;
    Extrapolate: typeof Extrapolate;

    // animations
    decay(
      clock: AnimatedClock,
      state: DecayState,
      config: DecayConfig
    ): AnimatedNode<number>;
    timing(
      clock: AnimatedClock,
      state: TimingState,
      config: TimingConfig
    ): AnimatedNode<number>;
    spring(
      clock: AnimatedClock,
      state: SpringState,
      config: SpringConfig
    ): AnimatedNode<number>;

    // configuration

    // `addWhitelistedNativeProps` will likely be removed soon, and so is
    // intentionally not exposed to TypeScript. If it is needed, it could be
    // uncommented here, or just use
    // `(Animated as any).addWhitelistedNativeProps({ myProp: true });`

    // addWhitelistedNativeProps(props: { [key: string]: true }): void;
  }
  const Animated: Animated;
  export default Animated;

  interface EasingStatic {
    linear: EasingFunction;
    ease: EasingFunction;
    quad: EasingFunction;
    cubic: EasingFunction;
    poly(n: Adaptable<number>): EasingFunction;
    sin: EasingFunction;
    circle: EasingFunction;
    exp: EasingFunction;
    elastic(bounciness?: Adaptable<number>): EasingFunction;
    back(s?: Adaptable<number>): EasingFunction;
    bounce: EasingFunction;
    bezier(
      x1: Adaptable<number>,
      y1: Adaptable<number>,
      x2: Adaptable<number>,
      y2: Adaptable<number>
    ): EasingFunction;
    in(easing: EasingFunction): EasingFunction;
    out(easing: EasingFunction): EasingFunction;
    inOut(easing: EasingFunction): EasingFunction;
  }
  export const Easing: EasingStatic;
}
