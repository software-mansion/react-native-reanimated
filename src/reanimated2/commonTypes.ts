'use strict';
import type { ViewStyle, TextStyle } from 'react-native';

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export interface StyleProps extends ViewStyle, TextStyle {
  originX?: number;
  originY?: number;
  [key: string]: any;
}

/**
 * A value that can be used both on the [JavaScript thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#javascript-thread) and the [UI thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).
 *
 * Shared values are defined using [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue) hook. You access and modify shared values by their `.value` property.
 */
export interface SharedValue<Value> {
  value: Value;
  addListener: (listenerID: number, listener: (value: any) => void) => void;
  removeListener: (listenerID: number) => void;
  modify: (modifier?: (value: any) => any, forceUpdate?: boolean) => void;
}

// The below type is used for HostObjects returned by the JSI API that don't have
// any accessible fields or methods but can carry data that is accessed from the
// c++ side. We add a field to the type to make it possible for typescript to recognize
// which JSI methods accept those types as arguments and to be able to correctly type
// check other methods that may use them. However, this field is not actually defined
// nor should be used for anything else as assigning any data to those objects will
// throw an error.
export type ShareableRef<T> = {
  __hostObjectShareableJSRef: T;
};

// In case of objects with depth or arrays of objects or arrays of arrays etc.
// we add this utility type that makes it a SharaebleRef of the outermost type.
export type FlatShareableRef<T> = T extends ShareableRef<infer U>
  ? ShareableRef<U>
  : ShareableRef<T>;

export type ShareableSyncDataHolderRef<T> = {
  __hostObjectShareableJSRefSyncDataHolder: T;
};

export type MapperRegistry = {
  start: (
    mapperID: number,
    worklet: () => void,
    inputs: SharedValue<any>[],
    outputs?: SharedValue<any>[]
  ) => void;
  stop: (mapperID: number) => void;
};

type WorkletClosure = Record<string, unknown>;

interface WorkletInitDataCommon {
  code: string;
}

type WorkletInitDataRelease = WorkletInitDataCommon;

interface WorkletInitDataDev extends WorkletInitDataCommon {
  location: string;
  sourceMap: string;
  version: string;
}

interface WorkletBaseCommon {
  __closure: WorkletClosure;
  __workletHash: number;
}

interface WorkletBaseRelease extends WorkletBaseCommon {
  __initData: WorkletInitDataRelease;
}

interface WorkletBaseDev extends WorkletBaseCommon {
  __initData: WorkletInitDataDev;
  __stackDetails: Error;
}

export type WorkletFunction<
  Args extends unknown[] = unknown[],
  ReturnValue = unknown
> = ((...args: Args) => ReturnValue) & (WorkletBaseRelease | WorkletBaseDev);

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

export interface AnimationObject<T = AnimatableValue> {
  [key: string]: any;
  callback?: AnimationCallback;
  current?: T;
  toValue?: AnimationObject<T>['current'];
  startValue?: AnimationObject<T>['current'];
  finished?: boolean;
  strippedCurrent?: number;
  cancelled?: boolean;
  reduceMotion?: boolean;

  __prefix?: string;
  __suffix?: string;
  onFrame: (animation: any, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: any,
    current: any,
    timestamp: Timestamp,
    previousAnimation: any
  ) => void;
}

export interface Animation<T extends AnimationObject> extends AnimationObject {
  onFrame: (animation: T, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: T,
    current: AnimatableValue,
    timestamp: Timestamp,
    previousAnimation: Animation<any> | null | T
  ) => void;
}

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
 * A function called upon animation completion. If the animation is cancelled, the callback will receive `false` as the argument; otherwise, it will receive `true`.
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
  __hostObjectShadowNodeWrapper: never;
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
 * @param x - A number representing X coordinate relative to the parent component.
 * @param y - A number representing Y coordinate relative to the parent component.
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
}

/**
 * @param System - If the `Reduce motion` accessibility setting is enabled on the device, disable the animation. Otherwise, enable the animation.
 * @param Always - Disable the animation.
 * @param Never - Enable the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility
 */
export enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}

// THE LAND OF THE DEPRECATED

/**
 * @deprecated don't use
 */
export interface __WorkletFunction {
  __closure?: Record<string, unknown>;
  __workletHash?: number;
}

/**
 * @deprecated don't use
 */
export interface __BasicWorkletFunction<T> extends __WorkletFunction {
  (): T;
}

/**
 * @deprecated don't use
 */
export interface __ComplexWorkletFunction<A extends any[], R>
  extends __WorkletFunction {
  (...args: A): R;
  __remoteFunction?: (...args: A) => R;
}

/**
 * @deprecated don't use
 */
export interface __AdapterWorkletFunction extends __WorkletFunction {
  (value: NestedObject<string | number | AnimationObject>): void;
}
