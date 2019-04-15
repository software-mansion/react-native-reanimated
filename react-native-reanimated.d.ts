// Project: https://github.com/kmagiera/react-native-reanimated
// TypeScript Version: 2.8

declare module 'react-native-reanimated' {
  import { ComponentClass, ReactNode, Component } from 'react';
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
  namespace Animated {
    class AnimatedNode<T> {
      constructor(
        nodeConfig: object,
        inputNodes?: ReadonlyArray<AnimatedNode<any>>,
      );
      isNativelyInitialized(): boolean;
      /**
       * ' __value' is not available at runtime on AnimatedNode<T>. It is
       * necessary to have some discriminating property on a type to know that
       * an AnimatedNode<number> and AnimatedNode<string> are not compatible types.
       */
      ' __value': T;
    }

    class AnimatedClock extends AnimatedNode<number> {
      constructor();
    }

    export enum Extrapolate {
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
    type Value = string | number | boolean;
    class AnimatedValue<T extends Value> extends AnimatedNode<T> {
      constructor(value?: T);

      setValue(value: Adaptable<T>): void;

      interpolate(config: InterpolationConfig): AnimatedNode<number>;
    }

    export type Mapping = { [key: string]: Mapping } | Adaptable<any>;
    export type Adaptable<T> =
      | T
      | AnimatedNode<T>
      | ReadonlyArray<T | AnimatedNode<T> | ReadonlyArray<T | AnimatedNode<T>>>;
    type BinaryOperator = (
      left: Adaptable<number>,
      right: Adaptable<number>
    ) => AnimatedNode<number>;
    type UnaryOperator = (value: Adaptable<number>) => AnimatedNode<number>;
    type MultiOperator = (
      a: Adaptable<number>,
      b: Adaptable<number>,
      ...others: Adaptable<number>[]
    ) => AnimatedNode<number>;

    export interface DecayState {
      finished: AnimatedValue<number>;
      velocity: AnimatedValue<number>;
      position: AnimatedValue<number>;
      time: AnimatedValue<number>;
    }
    export interface DecayConfig {
      deceleration: Adaptable<number>;
    }
    export interface BackwardCompatibleWrapper {
      start: (callback?: (data: { finished: boolean }) => any) => void;
      stop: () => void;
    }

    export interface TimingState {
      finished: AnimatedValue<number>;
      position: AnimatedValue<number>;
      time: AnimatedValue<number>;
      frameTime: AnimatedValue<number>;
    }
    export type EasingFunction = (value: Adaptable<number>) => AnimatedNode<number>;
    export interface TimingConfig {
      toValue: Adaptable<number>;
      duration: Adaptable<number>;
      easing: EasingFunction;
    }

    export interface SpringState {
      finished: AnimatedValue<number>;
      velocity: AnimatedValue<number>;
      position: AnimatedValue<number>;
      time: AnimatedValue<number>;
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

    type CodeProps = {
      exec?: AnimatedNode<number>
      children?: () => AnimatedNode<number>
    };

    // components
    export const View: ComponentClass<AnimateProps<ViewStyle, ViewProps>>;
    export const Text: ComponentClass<AnimateProps<TextStyle, TextProps>>;
    export const Image: ComponentClass<AnimateProps<ImageStyle, ImageProps>>;
    export const ScrollView: ComponentClass<
      AnimateProps<ViewStyle, ScrollViewProps>
    >;
    export const Code: ComponentClass<CodeProps>;
    export function createAnimatedComponent(component: any): any;

    // classes
    export {
      AnimatedClock as Clock,
      AnimatedNode as Node,
      AnimatedValue as Value,
    };

    // base operations
    export const add: MultiOperator;
    export const sub: MultiOperator;
    export const multiply: MultiOperator;
    export const divide: MultiOperator;
    export const pow: MultiOperator;
    export const modulo: MultiOperator;
    export const sqrt: UnaryOperator;
    export const sin: UnaryOperator;
    export const cos: UnaryOperator;
    export const tan: UnaryOperator;
    export const acos: UnaryOperator;
    export const asin: UnaryOperator;
    export const atan: UnaryOperator;
    export const exp: UnaryOperator;
    export const round: UnaryOperator;
    export const floor: UnaryOperator;
    export const ceil: UnaryOperator;
    export const lessThan: BinaryOperator;
    export const eq: BinaryOperator;
    export const greaterThan: BinaryOperator;
    export const lessOrEq: BinaryOperator;
    export const greaterOrEq: BinaryOperator;
    export const neq: BinaryOperator;
    export const and: MultiOperator;
    export const or: MultiOperator;
    export function defined(value: Adaptable<any>): AnimatedNode<0 | 1>;
    export function not(value: Adaptable<any>): AnimatedNode<0 | 1>;
    export function set(
      valueToBeUpdated: AnimatedValue<number>,
      sourceNode: Adaptable<number>,
    ): AnimatedNode<number>;
    export function concat(
      a: AnimatedNode<string>,
      b: AnimatedNode<string>,
      ...others: AnimatedNode<string>[],
    ): AnimatedNode<string>;
    export function cond(
      conditionNode: Adaptable<number>,
      ifNode: Adaptable<number>,
      elseNode?: Adaptable<number>,
    ): AnimatedNode<number>;
    export function block<T>(
      items: ReadonlyArray<Adaptable<T>>,
    ): AnimatedNode<T>;
    export function call<T>(
      args: ReadonlyArray<T | AnimatedNode<T>>,
      callback: (args: ReadonlyArray<T>) => void,
    ): AnimatedNode<0>;
    export function debug<T>(
      message: string,
      value: Adaptable<T>,
    ): AnimatedNode<T>;
    export function onChange(
      value: Adaptable<number>,
      action: Adaptable<number>,
    ): AnimatedNode<number>;
    export function startClock(clock: AnimatedClock): AnimatedNode<0>;
    export function stopClock(clock: AnimatedClock): AnimatedNode<0>;
    export function clockRunning(clock: AnimatedClock): AnimatedNode<0 | 1>;
    // the return type for `event` is a lie, but it's the same lie that
    // react-native makes within Animated
    export function event(
      argMapping: ReadonlyArray<Mapping>,
      config?: {},
    ): (...args: any[]) => void;

    // derived operations
    export function abs(value: Adaptable<number>): AnimatedNode<number>;
    export function acc(value: Adaptable<number>): AnimatedNode<number>;
    export function color(
      r: Adaptable<number>,
      g: Adaptable<number>,
      b: Adaptable<number>,
      a?: Adaptable<number>,
    ): AnimatedNode<number>;
    export function diff(value: Adaptable<number>): AnimatedNode<number>;
    export function diffClamp(
      value: Adaptable<number>,
      minVal: Adaptable<number>,
      maxVal: Adaptable<number>,
    ): AnimatedNode<number>;
    export function interpolate(
      value: Adaptable<number>,
      config: InterpolationConfig,
    ): AnimatedNode<number>;
    export const max: BinaryOperator;
    export const min: BinaryOperator;

    // animations
    export function decay(
      clock: AnimatedClock,
      state: DecayState,
      config: DecayConfig,
    ): AnimatedNode<number>;
    export function timing(
      clock: AnimatedClock,
      state: TimingState,
      config: TimingConfig,
    ): AnimatedNode<number>;
    export function spring(
      clock: AnimatedClock,
      state: SpringState,
      config: SpringConfig,
    ): AnimatedNode<number>;
    // backward compatible API
    export function spring(
      node: AnimatedNode<number>,
      config: SpringConfig,
    ): BackwardCompatibleWrapper;
    export function timing(
      node: AnimatedNode<number>,
      config: TimingConfig,
    ): BackwardCompatibleWrapper;
    export function decay(
      node: AnimatedNode<number>,
      config: DecayConfig,
    ): BackwardCompatibleWrapper;

    // hooks
    export function useCode(
      exec: AnimatedNode<number>,
      deps: Array<any>,
    ): void

    // configuration

    // `addWhitelistedNativeProps` will likely be removed soon, and so is
    // intentionally not exposed to TypeScript. If it is needed, it could be
    // uncommented here, or just use
    // `(Animated as any).addWhitelistedNativeProps({ myProp: true });`

    // addWhitelistedNativeProps(props: { [key: string]: true }): void;
  }

  export default Animated;

  interface EasingStatic {
    linear: Animated.EasingFunction;
    ease: Animated.EasingFunction;
    quad: Animated.EasingFunction;
    cubic: Animated.EasingFunction;
    poly(n: Animated.Adaptable<number>): Animated.EasingFunction;
    sin: Animated.EasingFunction;
    circle: Animated.EasingFunction;
    exp: Animated.EasingFunction;
    elastic(bounciness?: Animated.Adaptable<number>): Animated.EasingFunction;
    back(s?: Animated.Adaptable<number>): Animated.EasingFunction;
    bounce: Animated.EasingFunction;
    bezier(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ): Animated.EasingFunction;
    in(easing: Animated.EasingFunction): Animated.EasingFunction;
    out(easing: Animated.EasingFunction): Animated.EasingFunction;
    inOut(easing: Animated.EasingFunction): Animated.EasingFunction;
  }
  export const Easing: EasingStatic;

  export interface TransitioningViewProps extends ViewProps {
    transition: ReactNode;
  }

  export class TransitioningView extends Component<TransitioningViewProps> {
    animateNextTransition(): void;
  }

  export class Transitioning extends Component {
    static View: typeof TransitioningView;
  }

  export interface TransitionProps {
    delayMs?: number;
    durationMs?: number;
    interpolation?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    propagation?: 'top' | 'bottom' | 'left' | 'right';
  }

  export interface TransitionInOutProps extends TransitionProps {
    type?: 'fade' | 'scale' | 'slide-top' | 'slide-bottom' | 'slide-right' | 'slide-left';
  }

  export class Transition extends Component {
    static In: ComponentClass<TransitionInOutProps>;
    static Out: ComponentClass<TransitionInOutProps>;
    static Change: ComponentClass<TransitionProps>;
    static Together: ComponentClass<{}>;
    static Sequence: ComponentClass<{}>;
  }

}
