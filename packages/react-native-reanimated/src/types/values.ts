'use strict';

import type { WorkletFunction } from 'react-native-worklets';

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
export interface SharedValue<Value = unknown> {
  value: Value;
  get(): Value;
  set(value: Value | ((value: Value) => Value)): void;
  addListener: (listenerID: number, listener: (value: Value) => void) => void;
  removeListener: (listenerID: number) => void;
  modify: (
    modifier?: <T extends Value>(value: T) => T,
    forceUpdate?: boolean
  ) => void;
}

/**
 * Due to pattern of `MaybeSharedValue` type present in `AnimatedProps`
 * (`AnimatedStyle`), contravariance breaks types for animated styles etc.
 * Instead of refactoring the code with small chances of success, we just
 * disable contravariance for `SharedValue` in this problematic case.
 */
type SharedValueDisableContravariance<Value = unknown> = Omit<
  SharedValue<Value>,
  'set'
>;

export interface Mutable<Value = unknown> extends SharedValue<Value> {
  _isReanimatedSharedValue: true;
  _animation?: AnimationObject<Value> | null; // only in Native
  /**
   * `_value` prop should only be accessed by the `valueSetter` implementation
   * which may make the decision about updating the mutable value depending on
   * the provided new value. All other places should only attempt to modify the
   * mutable by assigning to `value` prop directly or by calling the `set`
   * method.
   */
  _value: Value;
}

export type MapperRawInputs = unknown[];

export type MapperOutputs = SharedValue[];

export type MapperRegistry = {
  start: (
    mapperID: number,
    worklet: () => void,
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

type MaybeSharedValue<Value> =
  | Value
  | (Value extends AnimatableValue
      ? SharedValueDisableContravariance<Value>
      : never);

type MaybeSharedValueRecursive<Value> = Value extends readonly (infer Item)[]
  ?
      | SharedValueDisableContravariance<Item[]>
      | (MaybeSharedValueRecursive<Item> | Item)[]
  : Value extends object
    ?
        | SharedValueDisableContravariance<Value>
        | {
            [Key in keyof Value]:
              | MaybeSharedValueRecursive<Value[Key]>
              | Value[Key];
          }
    : MaybeSharedValue<Value>;
