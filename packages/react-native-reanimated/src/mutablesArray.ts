'use strict';
import {
  executeOnUIRuntimeSync,
  logger,
  makeShareableCloneRecursive,
  runOnUI,
  shareableMappingCache,
} from 'react-native-worklets';

import { IS_JEST, ReanimatedError, SHOULD_BE_USE_WEB } from './common';
import type { MutableArray, SharedArrayValueType } from './commonTypes';
import { isFirstReactRender, isReactRendering } from './reactUtils';
import { valueSetter } from './valueSetter';

function shouldWarnAboutAccessDuringRender() {
  return __DEV__ && isReactRendering() && !isFirstReactRender();
}

function checkInvalidReadDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn(
      "Reading from `value` during component render. Please ensure that you don't access the `value` property nor use `get` method of a shared value while React is rendering a component.",
      { strict: true }
    );
  }
}

function checkInvalidWriteDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn(
      "Writing to `value` during component render. Please ensure that you don't access the `value` property nor use `set` method of a shared value while React is rendering a component.",
      { strict: true }
    );
  }
}

type Listener<Value> = (newValue: Value, key?: number | string) => void;

type ArrayMutable<Value> = Omit<
  MutableArray<Value>,
  'get' | 'set' | '_value'
> & {
  modifyValue: (index: number, value: SharedArrayValueType) => void;
};

/**
 * Adds `get` and `set` methods to the mutable object to handle access to
 * `value` property.
 *
 * React Compiler disallows modifying return values of hooks. Even though
 * assignment to `value` is a setter invocation, Compiler's static analysis
 * doesn't detect it. That's why we provide a second API for users using the
 * Compiler.
 */
function addCompilerSafeGetAndSet<Value>(mutable: ArrayMutable<Value>): void {
  'worklet';
  Object.defineProperties(mutable, {
    get: {
      value() {
        return mutable.value;
      },
      configurable: false,
      enumerable: false,
    },
    set: {
      value(newValue: Value | ((value: Value) => Value)) {
        if (
          typeof newValue === 'function' &&
          // If we have an animation definition, we don't want to call it here.
          !(newValue as Record<string, unknown>).__isAnimationDefinition
        ) {
          mutable.value = (newValue as (value: Value) => Value)(mutable.value);
        } else {
          mutable.value = newValue as Value;
        }
      },
      configurable: false,
      enumerable: false,
    },
  });
}
/**
 * Hides the internal `_value` property of a mutable. It won't be visible to:
 *
 * - `Object.keys`,
 * - `const prop in obj`,
 * - Etc.
 *
 * This way when the user accidentally sends the SharedValue to React, he won't
 * get an obscure error message.
 *
 * We hide for both _React runtime_ and _Worklet runtime_ mutables for
 * uniformity of behavior.
 */
function hideInternalValueProp<Value>(mutable: ArrayMutable<Value>) {
  'worklet';
  Object.defineProperty(mutable, '_value', {
    configurable: false,
    enumerable: false,
  });
}

function makeMutableArrayUI(
  initial: Array<SharedArrayValueType>
): MutableArray<Array<SharedArrayValueType>> {
  'worklet';
  const listeners = new Map<number, Listener<Array<SharedArrayValueType>>>();

  let value = initial;

  const mutable: ArrayMutable<Array<SharedArrayValueType>> = {
    get value() {
      return value;
    },
    set value(newValue) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },
    addListener: (
      id: number,
      listener: Listener<Array<SharedArrayValueType>>
    ) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },
    modifyValue: (index: number, newValue: SharedArrayValueType) => {
      value[index] = newValue;
      listeners.forEach((listener) => {
        listener(value, index);
      });
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        mutable as MutableArray<Array<SharedArrayValueType>>,
        modifier !== undefined ? modifier(mutable.value) : mutable.value,
        forceUpdate
      );
    },
    _animation: null,
    _isReanimatedSharedValue: true,
  };

  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);

  return mutable as MutableArray<Array<SharedArrayValueType>>;
}

function makeMutableArrayNative(
  initial: Array<SharedArrayValueType>
): MutableArray<Array<SharedArrayValueType>> {
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return makeMutableArrayUI(initial);
    },
  });

  const mutable: ArrayMutable<Array<SharedArrayValueType>> = {
    get value(): Array<SharedArrayValueType> {
      checkInvalidReadDuringRender();
      const uiValueGetter = executeOnUIRuntimeSync(
        (sv: MutableArray<Array<SharedArrayValueType>>) => {
          return sv.value;
        }
      );
      return uiValueGetter(
        mutable as MutableArray<Array<SharedArrayValueType>>
      );
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      runOnUI(() => {
        mutable.value = newValue;
      })();
    },
    modifyValue: (index: number, newValue: SharedArrayValueType) => {
      runOnUI(() => {
        mutable.modifyValue(index, newValue);
      })();
    },
    modify: (modifier, forceUpdate = true) => {
      runOnUI(() => {
        mutable.modify(modifier, forceUpdate);
      })();
    },
    addListener: () => {
      throw new ReanimatedError(
        'Adding listeners is only possible on the UI runtime.'
      );
    },
    removeListener: () => {
      throw new ReanimatedError(
        'Removing listeners is only possible on the UI runtime.'
      );
    },

    _isReanimatedSharedValue: true,
  };

  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);

  shareableMappingCache.set(mutable, handle);
  return mutable as MutableArray<Array<SharedArrayValueType>>;
}

interface JestMutable<TValue> extends MutableArray<TValue> {
  toJSON: () => string;
}

function makeMutableArrayWeb(
  initial: Array<SharedArrayValueType>
): MutableArray<Array<SharedArrayValueType>> {
  const value: Array<SharedArrayValueType> = initial;
  const listeners = new Map<number, Listener<Array<SharedArrayValueType>>>();

  const mutable: ArrayMutable<Array<SharedArrayValueType>> = {
    get value(): Array<SharedArrayValueType> {
      checkInvalidReadDuringRender();
      return value;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      valueSetter(
        mutable as MutableArray<Array<SharedArrayValueType>>,
        newValue
      );
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        mutable as MutableArray<Array<SharedArrayValueType>>,
        modifier !== undefined ? modifier(mutable.value) : mutable.value,
        forceUpdate
      );
    },
    modifyValue: (index: number, newValue: SharedArrayValueType) => {
      value[index] = newValue;
      listeners.forEach((listener) => {
        listener(value, index);
      });
    },
    addListener: (
      id: number,
      listener: Listener<Array<SharedArrayValueType>>
    ) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },

    _isReanimatedSharedValue: true,
  };

  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);

  if (IS_JEST) {
    (mutable as JestMutable<Array<SharedArrayValueType>>).toJSON = () =>
      mutableToJSON(value);
  }

  return mutable as MutableArray<Array<SharedArrayValueType>>;
}

export const makeMutableArray = SHOULD_BE_USE_WEB
  ? makeMutableArrayWeb
  : makeMutableArrayNative;

interface JestMutable<TValue> extends MutableArray<TValue> {
  toJSON: () => string;
}

function mutableToJSON<TValue>(value: TValue): string {
  return JSON.stringify(value);
}
