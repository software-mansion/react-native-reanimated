// Project: https://github.com/software-mansion/react-native-reanimated
// TypeScript Version: 2.8

declare module 'react-native-reanimated' {
  import {
    ComponentClass,
    ReactNode,
    Component,
    RefObject,
    ComponentType,
    ComponentProps,
    FunctionComponent,
  } from 'react';
  import {
    ViewProps,
    TextProps,
    ImageProps,
    ScrollViewProps,
    StyleProp,
    RegisteredStyle,
    ViewStyle,
    TextStyle,
    ImageStyle,
    TransformsStyle,
    View as ReactNativeView,
    Text as ReactNativeText,
    Image as ReactNativeImage,
    ScrollView as ReactNativeScrollView,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ColorValue,
    OpaqueColorValue,
  } from 'react-native';
  import {
    GestureHandlerGestureEvent,
    PanGestureHandlerGestureEvent,
  } from 'react-native-gesture-handler';
  namespace Animated {
    type Nullable<T> = T | null | undefined;

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

    class AnimatedClock extends AnimatedNode<number> {
      constructor();
    }

    export enum Extrapolate {
      EXTEND = 'extend',
      CLAMP = 'clamp',
      IDENTITY = 'identity',
    }

    type ExtrapolateParameter =
      | Extrapolate
      | { extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate };

    interface InterpolationConfig {
      inputRange: ReadonlyArray<Adaptable<number>>;
      outputRange: ReadonlyArray<Adaptable<number | string>>;
      extrapolate?: ExtrapolateParameter;
      extrapolateLeft?: Extrapolate;
      extrapolateRight?: Extrapolate;
    }
    type Value = string | number | boolean;
    class AnimatedValue<T extends Value> extends AnimatedNode<T> {
      constructor(value?: T);

      setValue(value: Adaptable<T>): void;

      interpolate(config: InterpolationConfig): AnimatedNode<number>;
    }

    export type SharedValue<T> = { value: T };
    export type DerivedValue<T> = Readonly<SharedValue<T>>;
    export type Mapping = { [key: string]: Mapping } | Adaptable<any>;
    export type Adaptable<T> =
      | T
      | AnimatedNode<T>
      | ReadonlyArray<T | AnimatedNode<T> | ReadonlyArray<T | AnimatedNode<T>>>;
    type BinaryOperator<T = number> = (
      left: Adaptable<number>,
      right: Adaptable<number>
    ) => AnimatedNode<T>;
    type UnaryOperator = (value: Adaptable<number>) => AnimatedNode<number>;
    type MultiOperator<T = number> = (
      a: Adaptable<number>,
      b: Adaptable<number>,
      ...others: Adaptable<number>[]
    ) => AnimatedNode<T>;

    export interface AnimationState {
      finished: AnimatedValue<number>;
      position: AnimatedValue<number>;
      time: AnimatedValue<number>;
    }

    export interface PhysicsAnimationState extends AnimationState {
      velocity: AnimatedValue<number>;
    }

    export type DecayState = PhysicsAnimationState;

    export interface DecayConfig {
      deceleration: Adaptable<number>;
    }
    export interface WithDecayConfig {
      deceleration?: number;
      velocity?: number;
      clamp?: [number, number];
      velocityFactor?: number;
    }
    export interface BackwardCompatibleWrapper {
      start: (callback?: (data: { finished: boolean }) => any) => void;
      stop: () => void;
    }

    export interface TimingState extends AnimationState {
      frameTime: AnimatedValue<number>;
    }
    export type EasingNodeFunction = (
      value: Adaptable<number>
    ) => AnimatedNode<number>;
    export type EasingFunction = (value: number) => number;
    export interface TimingConfig {
      toValue: Adaptable<number>;
      duration: Adaptable<number>;
      easing: EasingNodeFunction;
    }

    export type SpringState = PhysicsAnimationState;

    export interface SpringConfig {
      damping: Adaptable<number>;
      mass: Adaptable<number>;
      stiffness: Adaptable<number>;
      overshootClamping: Adaptable<number> | boolean;
      restSpeedThreshold: Adaptable<number>;
      restDisplacementThreshold: Adaptable<number>;
      toValue: Adaptable<number>;
    }

    export interface WithSpringConfig {
      damping?: number;
      mass?: number;
      stiffness?: number;
      overshootClamping?: boolean;
      restSpeedThreshold?: number;
      restDisplacementThreshold?: number;
      velocity?: number;
    }

    interface SpringConfigWithOrigamiTensionAndFriction {
      tension: Adaptable<number>;
      mass: Adaptable<number>;
      friction: Adaptable<number>;
      overshootClamping: Adaptable<number> | boolean;
      restSpeedThreshold: Adaptable<number>;
      restDisplacementThreshold: Adaptable<number>;
      toValue: Adaptable<number>;
    }

    interface SpringConfigWithBouncinessAndSpeed {
      bounciness: Adaptable<number>;
      mass: Adaptable<number>;
      speed: Adaptable<number>;
      overshootClamping: Adaptable<number> | boolean;
      restSpeedThreshold: Adaptable<number>;
      restDisplacementThreshold: Adaptable<number>;
      toValue: Adaptable<number>;
    }

    type SpringUtils = {
      makeDefaultConfig: () => SpringConfig;
      makeConfigFromBouncinessAndSpeed: (
        prevConfig: SpringConfigWithBouncinessAndSpeed
      ) => SpringConfig;
      makeConfigFromOrigamiTensionAndFriction: (
        prevConfig: SpringConfigWithOrigamiTensionAndFriction
      ) => SpringConfig;
    };

    export const SpringUtils: SpringUtils;

    export type TransformStyleTypes = TransformsStyle['transform'] extends
      | readonly (infer T)[]
      | undefined
      ? T
      : never;
    export type AdaptTransforms<T> = {
      [P in keyof T]: Adaptable<T[P]>;
    };
    export type AnimatedTransform = AdaptTransforms<TransformStyleTypes>[];

    export type AnimateStyle<S> = {
      [K in keyof S]: K extends 'transform'
        ? AnimatedTransform
        : S[K] extends ReadonlyArray<any>
        ? ReadonlyArray<AnimateStyle<S[K][0]>>
        : S[K] extends object
        ? AnimateStyle<S[K]>
        : S[K] extends ColorValue | undefined
        ? S[K] | number
        :
            | S[K]
            | AnimatedNode<
                // allow `number` where `string` normally is to support colors
                S[K] extends ColorValue | undefined ? S[K] | number : S[K]
              >;
    };

    export type AnimateProps<P extends object> = {
      [K in keyof P]: K extends 'style'
        ? StyleProp<AnimateStyle<P[K]>>
        : P[K] | AnimatedNode<P[K]>;
    } & { animatedProps?: Partial<AnimateProps<P>> };

    type CodeProps = {
      exec?: AnimatedNode<number>;
      children?: () => AnimatedNode<number>;
      dependencies?: Array<any>;
    };

    // components
    export class View extends Component<AnimateProps<ViewProps>> {
      getNode(): ReactNativeView;
    }
    export class Text extends Component<AnimateProps<TextProps>> {
      getNode(): ReactNativeText;
    }
    export class Image extends Component<AnimateProps<ImageProps>> {
      getNode(): ReactNativeImage;
    }
    export class ScrollView extends Component<AnimateProps<ScrollViewProps>> {
      getNode(): ReactNativeScrollView;
    }
    export class Code extends Component<CodeProps> {}

    type Options<P> = {
      setNativeProps: (ref: any, props: P) => void;
    }
    export function createAnimatedComponent<P extends object>(
      component: ComponentClass<P>,
      options?: Options<P>
    ): ComponentClass<AnimateProps<P>>;
    export function createAnimatedComponent<P extends object>(
      component: FunctionComponent<P>,
      options?: Options<P>
    ): FunctionComponent<AnimateProps<P>>;

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
    export const log: UnaryOperator;
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
    export const lessThan: BinaryOperator<0 | 1>;
    export const eq: BinaryOperator<0 | 1>;
    export const greaterThan: BinaryOperator<0 | 1>;
    export const lessOrEq: BinaryOperator<0 | 1>;
    export const greaterOrEq: BinaryOperator<0 | 1>;
    export const neq: BinaryOperator<0 | 1>;
    export const and: MultiOperator<0 | 1>;
    export const or: MultiOperator<0 | 1>;
    export function proc<T extends (Adaptable<Value> | undefined)[]>(
      func: (...args: T) => AnimatedNode<number>
    ): typeof func;
    export function defined(value: Adaptable<any>): AnimatedNode<0 | 1>;
    export function not(value: Adaptable<any>): AnimatedNode<0 | 1>;
    export function set<T extends Value>(
      valueToBeUpdated: AnimatedValue<T>,
      sourceNode: Adaptable<T>
    ): AnimatedNode<T>;
    export function concat(
      ...args: Array<Adaptable<string> | Adaptable<number>>
    ): AnimatedNode<string>;
    export function cond<T1 extends Value = number, T2 extends Value = number>(
      conditionNode: Adaptable<number>,
      ifNode: Adaptable<T1>,
      elseNode?: Adaptable<T2>
    ): AnimatedNode<T1 | T2>;
    export function block<T1 extends Value = number, T2 extends Value = any>(
      items: ReadonlyArray<Adaptable<T2>>
    ): AnimatedNode<T1>;
    export function call<T>(
      args: ReadonlyArray<T | AnimatedNode<T>>,
      callback: (args: ReadonlyArray<T>) => void
    ): AnimatedNode<0>;
    export function debug<T>(
      message: string,
      value: AnimatedNode<T>
    ): AnimatedNode<T>;
    export function onChange(
      value: Adaptable<number>,
      action: Adaptable<number>
    ): AnimatedNode<number>;
    export function startClock(clock: AnimatedClock): AnimatedNode<0>;
    export function stopClock(clock: AnimatedClock): AnimatedNode<0>;
    export function clockRunning(clock: AnimatedClock): AnimatedNode<0 | 1>;
    // the return type for `event` is a lie, but it's the same lie that
    // react-native makes within Animated
    type EventArgFunc<T> = (arg: T) => AnimatedNode<number>;
    type EventMapping<T> = T extends object
      ? { [K in keyof T]?: EventMapping<T[K]> | EventArgFunc<T[K]> }
      : Adaptable<T> | EventArgFunc<T>;
    type EventMappingArray<T> = T extends Array<any>
      ? { [I in keyof T]: EventMapping<T[I]> }
      : [EventMapping<T>];
    export function event<T>(
      argMapping: T extends never
        ? ReadonlyArray<Mapping>
        : Readonly<EventMappingArray<T>>,
      config?: {}
    ): (...args: any[]) => void;

    // derived operations
    export function abs(value: Adaptable<number>): AnimatedNode<number>;
    export function acc(value: Adaptable<number>): AnimatedNode<number>;
    export function color(
      r: Adaptable<number>,
      g: Adaptable<number>,
      b: Adaptable<number>,
      a?: Adaptable<number>
    ): AnimatedNode<number | string>;
    export function diff(value: Adaptable<number>): AnimatedNode<number>;
    export function diffClamp(
      value: Adaptable<number>,
      minVal: Adaptable<number>,
      maxVal: Adaptable<number>
    ): AnimatedNode<number>;
    export function interpolateNode(
      value: Adaptable<number>,
      config: InterpolationConfig
    ): AnimatedNode<number>;
    export function interpolateColors(
      animationValue: Adaptable<number>,
      {
        inputRange,
        outputColorRange,
      }: {
        inputRange: ReadonlyArray<Adaptable<number>>;
        outputColorRange: ReadonlyArray<Adaptable<number | string>>;
      }
    ): AnimatedNode<number | string>;
    export const max: BinaryOperator;
    export const min: BinaryOperator;

    // reanimated2 derived operations
    export function interpolate(
      x: number,
      input: Array<number>,
      output: Array<number>,
      type?: ExtrapolateParameter
    ): number;

    // animations
    export function decay(
      clock: AnimatedClock,
      state: DecayState,
      config: DecayConfig
    ): AnimatedNode<number>;
    export function timing(
      clock: AnimatedClock,
      state: TimingState,
      config: TimingConfig
    ): AnimatedNode<number>;
    export function spring(
      clock: AnimatedClock,
      state: SpringState,
      config: SpringConfig
    ): AnimatedNode<number>;
    // backward compatible API
    export function spring(
      node: AnimatedNode<number>,
      config: SpringConfig
    ): BackwardCompatibleWrapper;
    export function timing(
      node: AnimatedNode<number>,
      config: TimingConfig
    ): BackwardCompatibleWrapper;
    export function decay(
      node: AnimatedNode<number>,
      config: DecayConfig
    ): BackwardCompatibleWrapper;

    // reanimated2 animations
    export interface WithTimingConfig {
      duration?: number;
      easing?: EasingFunction;
    }
    export function withTiming(
      toValue: number | Exclude<ColorValue, OpaqueColorValue>, // string as a color value like `"rgba(20,20,20,0)"`
      userConfig?: WithTimingConfig,
      callback?: (isFinished: boolean) => void
    ): number;
    export function withSpring(
      toValue: number | Exclude<ColorValue, OpaqueColorValue>, // string as a color value like `"rgba(20,20,20,0)"`
      userConfig?: WithSpringConfig,
      callback?: (isFinished: boolean) => void
    ): number;
    export function withDecay(
      userConfig: WithDecayConfig,
      callback?: (isFinished: boolean) => void
    ): number;
    export function cancelAnimation<T>(sharedValue: SharedValue<T>): void;
    export function withDelay(
      delayMS: number,
      delayedAnimation: number
    ): number;
    export function withRepeat(
      animation: number,
      numberOfReps?: number,
      reverse?: boolean,
      callback?: (isFinished: boolean) => void
    ): number;
    export function withSequence(...animations: [number, ...number[]]): number;

    // hooks
    export function useCode(
      exec: () =>
        | Nullable<AnimatedNode<number>[] | AnimatedNode<number>>
        | boolean,
      deps: Array<any>
    ): void;
    export function useValue<T extends Value>(
      initialValue: T
    ): AnimatedValue<T>;

    // reanimated2 functions
    export function runOnUI<A extends any[], R>(
      fn: (...args: A) => R
    ): (...args: Parameters<typeof fn>) => void;
    export function runOnJS<A extends any[], R>(
      fn: (...args: A) => R
    ): (...args: Parameters<typeof fn>) => void;

    type PropsAdapterFunction = (props: Record<string, unknown>) => void;
    export function createAnimatedPropAdapter(
      adapter: PropsAdapterFunction,
      nativeProps?: string[]
    ): PropsAdapterFunction;

    export function processColor(color: number | string): number;
    export function createWorklet<A extends any[], R>(
      fn: (...args: A) => R
    ): (...args: Parameters<typeof fn>) => R;

    export function interpolateColor(
      value: number,
      inputRange: readonly number[],
      outputRange: readonly (string | number)[],
      colorSpace?: 'RGB' | 'HSV'
    ): string | number;

    export function makeMutable<T>(initialValue: T): SharedValue<T>;

    type DependencyList = ReadonlyArray<any>;

    // reanimated2 hooks
    export function useSharedValue<T>(initialValue: T): SharedValue<T>;

    export function useDerivedValue<T>(
      processor: () => T,
      deps?: DependencyList
    ): DerivedValue<T>;

    export function useAnimatedReaction<D>(
      prepare: () => D,
      react: (prepareResult: D, preparePreviousResult: D | null) => void,
      deps?: DependencyList
    ): void;

    export type AnimatedStyleProp<T extends object> =
      | AnimateStyle<T>
      | RegisteredStyle<AnimateStyle<T>>;
    export function useAnimatedStyle<
      T extends AnimatedStyleProp<ViewStyle | ImageStyle | TextStyle>
    >(updater: () => T, deps?: DependencyList | null): T;
    export function useAnimatedProps<T extends {}>(
      updater: () => Partial<T>,
      deps?: DependencyList | null,
      adapters?: PropsAdapterFunction | PropsAdapterFunction[] | null
    ): Partial<T>;
    export function useAnimatedGestureHandler<
      T extends GestureHandlerGestureEvent = PanGestureHandlerGestureEvent,
      TContext extends Context = {}
    >(
      handlers: GestureHandlers<T['nativeEvent'], TContext>,
      deps?: DependencyList
    ): OnGestureEvent<T>;
    export function useAnimatedScrollHandler<TContext extends Context = {}>(
      handler: ScrollHandler<TContext>,
      deps?: DependencyList
    ): OnScroll;
    export function useAnimatedScrollHandler<TContext extends Context = {}>(
      handlers: ScrollHandlers<TContext>,
      deps?: DependencyList
    ): OnScroll;
    export function useWorkletCallback<A extends any[], R>(
      fn: (...args: A) => R,
      deps?: DependencyList
    ): (...args: Parameters<typeof fn>) => R;

    export function useAnimatedRef<T extends Component>(): RefObject<T>;
    export function defineAnimation<T>(starting: any, factory: () => T): number;
    export function measure<T extends Component>(
      ref: RefObject<T>
    ): {
      width: number;
      height: number;
      x: number;
      y: number;
      pageX: number;
      pageY: number;
    };

    export function scrollTo(
      ref: RefObject<ReactNativeScrollView | ScrollView>,
      x: number,
      y: number,
      animated: boolean
    ): void;

    // gesture-handler
    type OnGestureEvent<T extends GestureHandlerGestureEvent> = (
      event: T
    ) => void;

    type Context = Record<string, unknown>;

    type Handler<T, TContext extends Context> = (
      event: T,
      context: TContext
    ) => void;

    export interface GestureHandlers<T, TContext extends Context> {
      onStart?: Handler<T, TContext>;
      onActive?: Handler<T, TContext>;
      onEnd?: Handler<T, TContext>;
      onFail?: Handler<T, TContext>;
      onCancel?: Handler<T, TContext>;
      onFinish?: (
        event: T,
        context: TContext,
        isCanceledOrFailed: boolean
      ) => void;
    }

    // scroll view
    type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

    type ScrollHandler<TContext extends Context> = (
      event: NativeScrollEvent,
      context: TContext
    ) => void;

    export interface ScrollHandlers<TContext extends Context> {
      onScroll?: ScrollHandler<TContext>;
      onBeginDrag?: ScrollHandler<TContext>;
      onEndDrag?: ScrollHandler<TContext>;
      onMomentumBegin?: ScrollHandler<TContext>;
      onMomentumEnd?: ScrollHandler<TContext>;
    }

    // configuration
    export function addWhitelistedNativeProps(props: {
      [key: string]: true;
    }): void;
    export function addWhitelistedUIProps(props: { [key: string]: true }): void;
  }

  export default Animated;

  interface EasingNodeStatic {
    linear: Animated.EasingNodeFunction;
    ease: Animated.EasingNodeFunction;
    quad: Animated.EasingNodeFunction;
    cubic: Animated.EasingNodeFunction;
    poly(n: Animated.Adaptable<number>): Animated.EasingNodeFunction;
    sin: Animated.EasingNodeFunction;
    circle: Animated.EasingNodeFunction;
    exp: Animated.EasingNodeFunction;
    elastic(
      bounciness?: Animated.Adaptable<number>
    ): Animated.EasingNodeFunction;
    back(s?: Animated.Adaptable<number>): Animated.EasingNodeFunction;
    bounce: Animated.EasingNodeFunction;
    bezier(
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ): Animated.EasingNodeFunction;
    in(easing: Animated.EasingNodeFunction): Animated.EasingNodeFunction;
    out(easing: Animated.EasingNodeFunction): Animated.EasingNodeFunction;
    inOut(easing: Animated.EasingNodeFunction): Animated.EasingNodeFunction;
  }

  export const EasingNode: EasingNodeStatic;

  interface EasingStatic {
    linear: Animated.EasingFunction;
    ease: Animated.EasingFunction;
    quad: Animated.EasingFunction;
    cubic: Animated.EasingFunction;
    poly(n: number): Animated.EasingFunction;
    sin: Animated.EasingFunction;
    circle: Animated.EasingFunction;
    exp: Animated.EasingFunction;
    elastic(bounciness?: number): Animated.EasingFunction;
    back(s?: number): Animated.EasingFunction;
    bounce: Animated.EasingFunction;
    bezier(
      x1: number,
      y1: number,
      x2: number,
      y2: number
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
    type?:
      | 'fade'
      | 'scale'
      | 'slide-top'
      | 'slide-bottom'
      | 'slide-right'
      | 'slide-left';
  }

  export class Transition extends Component {
    static In: ComponentClass<TransitionInOutProps>;
    static Out: ComponentClass<TransitionInOutProps>;
    static Change: ComponentClass<TransitionProps>;
    static Together: ComponentClass<{}>;
    static Sequence: ComponentClass<{}>;
  }

  export class Clock extends Animated.Clock {}
  export class Value<
    T extends string | number | boolean
  > extends Animated.Value<T> {}
  export class Node<T> extends Animated.Node<T> {}
  export const add: typeof Animated.add;
  export const sub: typeof Animated.sub;
  export const multiply: typeof Animated.multiply;
  export const divide: typeof Animated.divide;
  export const pow: typeof Animated.pow;
  export const modulo: typeof Animated.modulo;
  export const sqrt: typeof Animated.sqrt;
  export const log: typeof Animated.log;
  export const sin: typeof Animated.sin;
  export const cos: typeof Animated.cos;
  export const exp: typeof Animated.exp;
  export const round: typeof Animated.round;
  export const lessThan: typeof Animated.lessThan;
  export const eq: typeof Animated.eq;
  export const greaterThan: typeof Animated.greaterThan;
  export const lessOrEq: typeof Animated.lessOrEq;
  export const greaterOrEq: typeof Animated.greaterOrEq;
  export const neq: typeof Animated.neq;
  export const and: typeof Animated.and;
  export const or: typeof Animated.or;
  export const defined: typeof Animated.defined;
  export const not: typeof Animated.not;
  export const tan: typeof Animated.tan;
  export const acos: typeof Animated.acos;
  export const asin: typeof Animated.asin;
  export const atan: typeof Animated.atan;
  export const proc: typeof Animated.proc;
  export const block: typeof Animated.block;
  export const concat: typeof Animated.concat;
  export const event: typeof Animated.event;
  export const call: typeof Animated.call;
  export const debug: typeof Animated.debug;
  export const clockRunning: typeof Animated.clockRunning;
  export const stopClock: typeof Animated.stopClock;
  export const startClock: typeof Animated.startClock;
  export const set: typeof Animated.set;
  export const cond: typeof Animated.cond;
  export const abs: typeof Animated.abs;
  export const acc: typeof Animated.acc;
  export const color: typeof Animated.color;
  export const interpolateColors: typeof Animated.interpolateColors;
  export const diff: typeof Animated.diff;
  export const diffClamp: typeof Animated.diffClamp;
  export const interpolateNode: typeof Animated.interpolateNode;
  export const Extrapolate: typeof Animated.Extrapolate;
  export const max: typeof Animated.max;
  export const min: typeof Animated.min;
  export const onChange: typeof Animated.onChange;
  export const floor: typeof Animated.floor;
  export const ceil: typeof Animated.ceil;
  export const useCode: typeof Animated.useCode;
  export const decay: typeof Animated.decay;
  export const timing: typeof Animated.timing;
  export const spring: typeof Animated.spring;
  export const SpringUtils: typeof Animated.SpringUtils;
  export const runOnUI: typeof Animated.runOnUI;
  export const runOnJS: typeof Animated.runOnJS;
  export const createAnimatedPropAdapter: typeof Animated.createAnimatedPropAdapter;
  export const processColor: typeof Animated.processColor;
  export const makeMutable: typeof Animated.makeMutable;
  export const useValue: typeof Animated.useValue;
  export const useSharedValue: typeof Animated.useSharedValue;
  export const useAnimatedStyle: typeof Animated.useAnimatedStyle;
  export const useAnimatedReaction: typeof Animated.useAnimatedReaction;
  export const useAnimatedProps: typeof Animated.useAnimatedProps;
  export const useDerivedValue: typeof Animated.useDerivedValue;
  export const useWorkletCallback: typeof Animated.useWorkletCallback;
  export const createWorklet: typeof Animated.createWorklet;
  export const interpolateColor: typeof Animated.interpolateColor;
  export const useAnimatedGestureHandler: typeof Animated.useAnimatedGestureHandler;
  export const useAnimatedScrollHandler: typeof Animated.useAnimatedScrollHandler;
  export const useAnimatedRef: typeof Animated.useAnimatedRef;
  export const defineAnimation: typeof Animated.defineAnimation;
  export const measure: typeof Animated.measure;
  export const scrollTo: typeof Animated.scrollTo;
  export const withTiming: typeof Animated.withTiming;
  export const withSpring: typeof Animated.withSpring;
  export const withDecay: typeof Animated.withDecay;
  export const cancelAnimation: typeof Animated.cancelAnimation;
  export const withDelay: typeof Animated.withDelay;
  export const withRepeat: typeof Animated.withRepeat;
  export const withSequence: typeof Animated.withSequence;
  export const interpolate: typeof Animated.interpolate;
}
