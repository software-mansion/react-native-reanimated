'use strict';
import type { Component, ElementType, JSX, RefObject } from 'react';
import type {
  FlatList,
  HostInstance,
  ScrollView,
  SectionList,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from 'react-native';
import type { SerializableRef, WorkletFunction } from 'react-native-worklets';

import type { AnyRecord, Maybe } from './common';
import type { CSSAnimationProperties, CSSTransitionProperties } from './css';
import type { EasingFunctionFactory } from './Easing';
import type { AnimatedStyleHandle, DefaultStyle } from './hook/commonTypes';

type LayoutAnimationOptions =
  | 'originX'
  | 'originY'
  | 'width'
  | 'height'
  | 'borderRadius'
  | 'globalOriginX'
  | 'globalOriginY';

type CurrentLayoutAnimationValues = {
  [K in LayoutAnimationOptions as `current${Capitalize<string & K>}`]: number;
};

type TargetLayoutAnimationValues = {
  [K in LayoutAnimationOptions as `target${Capitalize<string & K>}`]: number;
};

interface WindowDimensions {
  windowWidth: number;
  windowHeight: number;
}

export interface KeyframeProps extends StyleProps {
  easing?: EasingFunction | EasingFunctionFactory;
}

type FirstFrame =
  | {
      0: KeyframeProps & { easing?: never };
      from?: never;
    }
  | {
      0?: never;
      from: KeyframeProps & { easing?: never };
    };

type LastFrame =
  | { 100?: KeyframeProps; to?: never }
  | { 100?: never; to: KeyframeProps };

export type ValidKeyframeProps = FirstFrame &
  LastFrame &
  Record<number, KeyframeProps>;

export type MaybeInvalidKeyframeProps = Record<number, KeyframeProps> & {
  to?: KeyframeProps;
  from?: KeyframeProps;
};

export type LayoutAnimation = {
  initialValues: StyleProps;
  animations: AnimatedLayoutStyles;
  callback?: (finished: boolean) => void;
};

/**
 * A single entry inside `AnimatedLayoutStyles.transform`. Each item is a
 * one-key object whose value is the animation driving that transform. The
 * optional `undefined` accepts entries inferred with sibling `?: undefined`
 * exclusion fields (TypeScript's `MaximumOneOf<...>` style narrowing).
 */
export type AnimatedTransformItem = {
  [transformName: string]: AnimationObject | undefined;
};

/**
 * Style object passed to `LayoutAnimation.animations`. Each property holds an
 * `AnimationObject` produced by `withTiming`, `withSpring`, etc.; `transform`
 * holds an array of single-key objects whose values are animation objects.
 */
export interface AnimatedLayoutStyles {
  transform?: AnimatedTransformItem[];
  [key: string]: AnimationObject | AnimatedTransformItem[] | undefined;
}

/**
 * Builder function that creates an animation — `withTiming`/`withSpring`/etc.
 * assigned to this slot via a widening cast that collapses their generic value
 * type to `AnimatableValue`.
 */
export type AnimationFunction = (
  toValue: AnimatableValue,
  config?: BaseBuilderAnimationConfig
) => AnimationObject;

/**
 * Wrapper returned by `BaseAnimationBuilder.getDelayFunction()` — either delays
 * an inner animation via `withDelay`, or stamps `reduceMotion` on it and passes
 * it through.
 */
export type DelayFunction = (
  delayMs: number,
  animation: AnimationObject,
  reduceMotion?: ReduceMotion
) => AnimationObject;

export type EntryAnimationsValues = TargetLayoutAnimationValues &
  WindowDimensions;

export type ExitAnimationsValues = CurrentLayoutAnimationValues &
  WindowDimensions;

export type EntryExitAnimationFunction =
  | ((targetValues: EntryAnimationsValues) => LayoutAnimation)
  | ((targetValues: ExitAnimationsValues) => LayoutAnimation)
  | (() => LayoutAnimation);

export type AnimationConfigFunction<T> = (targetValues: T) => LayoutAnimation;

export type LayoutAnimationValues = CurrentLayoutAnimationValues &
  TargetLayoutAnimationValues &
  WindowDimensions;

export enum LayoutAnimationType {
  ENTERING = 1,
  EXITING = 2,
  LAYOUT = 3,
  SHARED_ELEMENT_TRANSITION = 4,
  SHARED_ELEMENT_TRANSITION_NATIVE_ID = 5,
  SHARED_ELEMENT_TRANSITION_PROGRESS = 6,
  SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID = 7,
}

export type LayoutAnimationFunction = (
  targetValues: LayoutAnimationValues
) => LayoutAnimation;

export type LayoutAnimationStartFunction = (
  tag: number,
  type: LayoutAnimationType,
  yogaValues: Partial<LayoutAnimationValues>,
  config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation
) => void;

export interface ILayoutAnimationBuilder {
  build: () => LayoutAnimationFunction;
}

export interface BaseLayoutAnimationConfig {
  duration?: number;
  easing?: EasingFunction | EasingFunctionFactory;
  type?: AnimationFunction;
  damping?: number;
  dampingRatio?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: number;
  energyThreshold?: number;
}

export interface BaseBuilderAnimationConfig extends BaseLayoutAnimationConfig {
  rotate?: number | string;
}

export type LayoutAnimationAndConfig = [
  AnimationFunction,
  BaseBuilderAnimationConfig,
];

export interface IEntryExitAnimationBuilder {
  build: () => EntryExitAnimationFunction;
}

export interface IEntryAnimationBuilder {
  build: () => AnimationConfigFunction<EntryAnimationsValues>;
}

export interface IExitAnimationBuilder {
  build: () => AnimationConfigFunction<ExitAnimationsValues>;
}

/**
 * Used to configure the `.defaultTransitionType()` shared transition modifier.
 *
 * @experimental
 */

export type EntryExitAnimationsValues =
  | EntryAnimationsValues
  | ExitAnimationsValues;

export type StylePropsWithArrayTransform = StyleProps & {
  transform?: TransformArrayItem[];
};

export interface LayoutAnimationBatchItem {
  viewTag: number;
  type: LayoutAnimationType;
  config: SerializableRef<Keyframe | LayoutAnimationFunction> | undefined;
  sharedTransitionTag?: string;
}

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface StyleProps extends ViewStyle, TextStyle {
  originX?: number;
  originY?: number;
  // RN style sub-objects flow through this index signature with shapes we
  // can't fully enumerate (e.g. user-attached jsProps); `unknown` cascades
  // through too many call sites that read these properties directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * A value that can be used both on the [JavaScript
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#javascript-thread)
 * and the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).
 *
 * Shared values are defined using
 * [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue)
 * hook. You access and modify shared values by their `.value` property.
 */
export interface SharedValue<TValue = unknown> {
  get value(): TValue;
  set value(newValue: ReanimatedValue<TValue>);
  get(): TValue;
  set(value: ReanimatedValue<TValue> | ((value: TValue) => TValue)): void;
  addListener: (listenerID: number, listener: (value: TValue) => void) => void;
  removeListener: (listenerID: number) => void;
  modify: (modifier?: (value: TValue) => TValue, forceUpdate?: boolean) => void;
}

/**
 * Due to pattern of `MaybeSharedValue` type present in `AnimatedProps`
 * (`AnimatedStyle`), contravariance breaks types for animated styles etc.
 * Instead of refactoring the code with small chances of success, we just
 * disable contravariance for `SharedValue` in this problematic case.
 */
type SharedValueDisableContravariance<TValue = unknown> = Omit<
  SharedValue<TValue>,
  'set' | 'modify'
>;

export interface Mutable<TValue = unknown> extends SharedValue<TValue> {
  _isReanimatedSharedValue: true;
  _animation?: AnimationObject | null; // only in Native
  /**
   * `_value` prop should only be accessed by the `valueSetter` implementation
   * which may make the decision about updating the mutable value depending on
   * the provided new value. All other places should only attempt to modify the
   * mutable by assigning to `value` prop directly or by calling the `set`
   * method.
   */
  _value: TValue;
  /**
   * Defined only when enabled with a feature flag
   * `USE_SYNCHRONIZABLE_FOR_MUTABLES`.
   */
  setDirty?: (dirty: boolean) => void;
}

export type MapperRawInputs = unknown[];

export type MapperOutputs = SharedValue[];

export type MapperRegistry = {
  start: (
    mapperID: number,
    worklet: (forceUpdate?: boolean) => void,
    inputs: MapperRawInputs,
    outputs?: MapperOutputs
  ) => void;
  stop: (mapperID: number) => void;
};

export type AnimatedPropsAdapterFunction = (
  props: Record<string, unknown>
) => void;

export type AnimatedPropsAdapterWorklet = WorkletFunction<
  [props: Record<string, unknown>],
  void
>;

export interface NestedObject<T> {
  [key: string]: NestedObjectValues<T>;
}

export type NestedObjectValues<T> =
  | T
  | Array<NestedObjectValues<T>>
  | NestedObject<T>;

type Animatable = number | string | Array<number>;

export type AnimatableValueObject = { [key: string]: Animatable };

export type AnimatableValue = Animatable | AnimatableValueObject;

export interface AnimationObject<TValue = AnimatableValue> {
  // The index signature lets concrete animation subtypes (and the runtime
  // decorator in `animation/util.ts`) attach arbitrary fields without having
  // to declare every one on the base. Kept as `any` — `unknown` cascades
  // through every destructuring site of `Inner*Animation` extenders.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  callback?: AnimationCallback;
  current?: TValue;
  finished?: boolean;
  strippedCurrent?: number;
  cancelled?: boolean;
  reduceMotion?: boolean;

  __prefix?: string;
  __suffix?: string;
  // Declared with `this: void` so the callsites in `animation/util.ts` that
  // detach these methods (`const baseOnFrame = animation.onFrame`) don't trip
  // the `unbound-method` lint, while method syntax preserves the parameter
  // bivariance needed for concrete `Animation<T>` overrides.
  onFrame(
    this: void,
    animation: AnimationObject,
    timestamp: Timestamp
  ): boolean;
  onStart(
    this: void,
    nextAnimation: AnimationObject,
    current: AnimatableValue,
    timestamp: Timestamp,
    previousAnimation: AnimationObject | null
  ): void;
}

/**
 * The value type animated by an `AnimationObject` subtype, recovered from the
 * subtype's `current` property. Used so that
 * `Animation<TimingAnimation<number>>` is structurally an
 * `AnimationObject<number>` — letting downstream hooks (`useDerivedValue`,
 * etc.) infer the underlying value via `T extends AnimationObject<infer V>`.
 */
type AnimatedValueOf<TAnimation extends AnimationObject> = NonNullable<
  TAnimation['current']
>;

export interface Animation<
  TAnimation extends AnimationObject,
> extends AnimationObject<AnimatedValueOf<TAnimation>> {
  onFrame(this: void, animation: TAnimation, timestamp: Timestamp): boolean;
  onStart(
    this: void,
    nextAnimation: TAnimation,
    current: AnimatedValueOf<TAnimation>,
    timestamp: Timestamp,
    previousAnimation: AnimationObject | null
  ): void;
}

/**
 * A value that can be assigned to a Reanimated shared value: either a plain
 * value, an animation object, or a factory producing one. The animation forms
 * are recognized by `valueSetter` and trigger an animated transition instead of
 * an immediate write.
 */
export type ReanimatedValue<TValue> =
  | TValue
  | AnimationObject<TValue>
  | (() => AnimationObject<TValue>);

export enum SensorType {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  GRAVITY = 3,
  MAGNETIC_FIELD = 4,
  ROTATION = 5,
}
export enum IOSReferenceFrame {
  XArbitraryZVertical,
  XArbitraryCorrectedZVertical,
  XMagneticNorthZVertical,
  XTrueNorthZVertical,
  Auto,
}

export type SensorConfig = {
  interval: number | 'auto';
  adjustToInterfaceOrientation: boolean;
  iosReferenceFrame: IOSReferenceFrame;
};

export type AnimatedSensor<T extends Value3D | ValueRotation> = {
  sensor: SharedValue<T>;
  unregister: () => void;
  isAvailable: boolean;
  config: SensorConfig;
};

/**
 * A function called upon animation completion. If the animation is cancelled,
 * the callback will receive `false` as the argument; otherwise, it will receive
 * `true`.
 */
export type AnimationCallback = (
  finished?: boolean,
  current?: AnimatableValue
) => void;

export type Timestamp = number;

export type Value3D = {
  x: number;
  y: number;
  z: number;
  interfaceOrientation: InterfaceOrientation;
};

export type ValueRotation = {
  qw: number;
  qx: number;
  qy: number;
  qz: number;
  yaw: number;
  pitch: number;
  roll: number;
  interfaceOrientation: InterfaceOrientation;
};

export enum InterfaceOrientation {
  ROTATION_0 = 0,
  ROTATION_90 = 90,
  ROTATION_180 = 180,
  ROTATION_270 = 270,
}

export type ShadowNodeWrapper = {
  __nativeStateShadowNodeWrapper: never;
};

export type SettledUpdate = {
  viewTag: number;
  styleProps: StyleProps | null;
};

export enum KeyboardState {
  UNKNOWN = 0,
  OPENING = 1,
  OPEN = 2,
  CLOSING = 3,
  CLOSED = 4,
}

export type AnimatedKeyboardInfo = {
  height: SharedValue<number>;
  state: SharedValue<KeyboardState>;
};

/**
 * @param x - A number representing X coordinate relative to the parent
 *   component.
 * @param y - A number representing Y coordinate relative to the parent
 *   component.
 * @param width - A number representing the width of the component.
 * @param height - A number representing the height of the component.
 * @param pageX - A number representing X coordinate relative to the screen.
 * @param pageY - A number representing Y coordinate relative to the screen.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure#returns
 */
export interface MeasuredDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

export interface AnimatedKeyboardOptions {
  isStatusBarTranslucentAndroid?: boolean;
  isNavigationBarTranslucentAndroid?: boolean;
}

/**
 * @param System - If the `Reduce motion` accessibility setting is enabled on
 *   the device, disable the animation. Otherwise, enable the animation.
 * @param Always - Disable the animation.
 * @param Never - Enable the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility
 */
export enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}

export type EasingFunction = (t: number) => number;

export type TransformArrayItem = Extract<
  TransformsStyle['transform'],
  Array<unknown>
>[number];

type MaybeSharedValue<TValue> =
  | TValue
  | (TValue extends AnimatableValue
      ? SharedValueDisableContravariance<TValue>
      : never);

type MaybeSharedValueRecursive<TValue> = TValue extends readonly (infer TItem)[]
  ?
      | SharedValueDisableContravariance<TItem[]>
      | (MaybeSharedValueRecursive<TItem> | TItem)[]
  : TValue extends object
    ?
        | SharedValueDisableContravariance<TValue>
        | {
            [TKey in keyof TValue]:
              | MaybeSharedValueRecursive<TValue[TKey]>
              | TValue[TKey];
          }
    : MaybeSharedValue<TValue>;

type ReanimatedCSSProps = Partial<
  CSSAnimationProperties & CSSTransitionProperties
>;

// Two candidates — the static intersection keeps generic inference working
// (e.g. `useAnimatedStyle<Style>`); the stripped fallback sidesteps the
// `never`-collapse when a base style augmentation (e.g. Expo's
// `expo-env.d.ts`) declares our CSS keys with conflicting types. See
// https://github.com/software-mansion/react-native-reanimated/issues/9328
type WithReanimatedCSS<TStyle> =
  | (TStyle & ReanimatedCSSProps)
  | (TStyle extends object
      ? Omit<TStyle, keyof ReanimatedCSSProps> & ReanimatedCSSProps
      : never);

// Ideally we want AnimatedStyle to not be generic, but there are
// so many dependencies on it being generic that it's not feasible at the moment.
export type AnimatedStyle<TStyle = DefaultStyle> =
  | WithReanimatedCSS<TStyle>
  | MaybeSharedValueRecursive<TStyle>
  | AnimatedStyleHandle<TStyle>
  | AnimatedTopLevelStyle<TStyle>;

/**
 * Allows top-level style properties — including transform-array entries — to be
 * `AnimationObject`s produced by `withTiming`, `withSpring`, etc., without
 * widening nested style sub-objects (where animations don't apply).
 */
type AnimatedTopLevelStyle<TStyle> = TStyle extends object
  ? {
      [TKey in keyof TStyle]:
        | TStyle[TKey]
        | AnimationObject
        | MaybeSharedValueRecursive<TStyle[TKey]>
        | AnimatedArrayStyle<TStyle[TKey]>;
    }
  : never;

type AnimatedArrayStyle<TStyle> =
  Extract<TStyle, readonly unknown[]> extends readonly (infer TItem)[]
    ? (
        | TItem
        | (TItem extends object
            ? { [TKey in keyof TItem]: TItem[TKey] | AnimationObject }
            : AnimationObject)
      )[]
    : never;

export type AnimatedTransform = MaybeSharedValueRecursive<
  TransformsStyle['transform']
>;

export type StyleUpdaterContainer = RefObject<
  ((forceUpdate: boolean) => void) | undefined
>;

type GetProp<T, K extends PropertyKey> = K extends keyof T ? T[K] : undefined;

type ScrollResponderType = InternalHostInstance &
  Partial<
    ReturnType<
      NonNullable<
        | GetProp<ScrollView, 'getScrollResponder'>
        | GetProp<FlatList, 'getScrollResponder'>
        | GetProp<SectionList, 'getScrollResponder'>
      >
    > &
      JSX.Element
  >;

export type InternalHostInstance = Partial<
  HostInstance & {
    getScrollResponder: () => Maybe<ScrollResponderType>;
    getNativeScrollRef: () => Maybe<
      Partial<InternalHostInstance & typeof ScrollView>
    >;
    // Returns an HTMLElement on web or the scroll component itself on native;
    // typed as `any` to satisfy both call sites without per-site casts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getScrollableNode: () => any;
    __internalInstanceHandle: AnyRecord;
  }
>;

export type InstanceOrElement = InternalHostInstance | ElementType | Component;
