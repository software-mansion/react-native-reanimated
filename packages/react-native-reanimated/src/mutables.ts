'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import type { Mutable } from './commonTypes';
import { shareableMappingCache } from './shareableMappingCache';
import { makeShareableCloneRecursive } from './shareables';
import { executeOnUIRuntimeSync, runOnUI } from './threads';
import { valueSetter } from './valueSetter';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

type Listener<Value> = (newValue: Value) => void;

export function makeMutableUI<Value>(initial: Value): Mutable<Value> {
  'worklet';
  const listeners = new Map<number, Listener<Value>>();
  let value = initial;

  const mutable: Mutable<Value> = {
    get value() {
      return value;
    },
    set value(newValue) {
      valueSetter(mutable, newValue);
    },

    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        mutable,
        modifier !== undefined ? modifier(value) : value,
        forceUpdate
      );
    },
    addListener: (id: number, listener: Listener<Value>) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },

    _animation: null,
    _isReanimatedSharedValue: true,
  } as Mutable<Value>;

  /*
   * _value prop should only be accessed by the valueSetter implementation
   * which may make the decision about updating the mutable value depending
   * on the provided new value. All other places should only attempt to modify
   * the mutable by assigning to value prop directly.
   */
  Object.defineProperty(mutable, '_value', {
    get(): Value {
      return value;
    },
    set(newValue: Value) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },
    configurable: false,
    enumerable: false,
  });

  return mutable;
}

function makeMutableNative<Value>(initial: Value): Mutable<Value> {
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return makeMutableUI(initial);
    },
  });

  const mutable: Mutable<Value> = {
    get value(): Value {
      const uiValueGetter = executeOnUIRuntimeSync((sv: Mutable<Value>) => {
        return sv.value;
      });
      return uiValueGetter(mutable);
    },
    set value(newValue) {
      runOnUI(() => {
        mutable.value = newValue;
      })();
    },

    modify: (modifier, forceUpdate = true) => {
      runOnUI(() => {
        mutable.modify(modifier, forceUpdate);
      })();
    },
    addListener: () => {
      throw new Error(
        '[Reanimated] Adding listeners is only possible on the UI runtime.'
      );
    },
    removeListener: () => {
      throw new Error(
        '[Reanimated] Removing listeners is only possible on the UI runtime.'
      );
    },

    _isReanimatedSharedValue: true,
  } as Omit<Mutable<Value>, '_value'> as Mutable<Value>;

  Object.defineProperty(mutable, '_value', {
    // This way of defining the property makes it hidden for
    // `Object.keys` etc. so if the user accidentally passes it
    // to React he won't get a critical error.
    get() {
      throw new Error(
        '[Reanimated] Reading from `_value` directly is only possible on the UI runtime. Perhaps you wanted to read from `value` instead?'
      );
    },
    set(_newValue: Value) {
      throw new Error(
        '[Reanimated] Setting `_value` directly is only possible on the UI runtime. Perhaps you wanted to assign to `value` instead?'
      );
    },
    configurable: false,
    enumerable: false,
  });

  shareableMappingCache.set(mutable, handle);
  return mutable;
}

function makeMutableWeb<Value>(initial: Value): Mutable<Value> {
  let value: Value = initial;
  const listeners = new Map<number, Listener<Value>>();

  const mutable: Mutable<Value> = {
    get value(): Value {
      return value;
    },
    set value(newValue) {
      valueSetter(mutable, newValue);
    },

    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        mutable,
        modifier !== undefined ? modifier(mutable.value) : mutable.value,
        forceUpdate
      );
    },
    addListener: (id: number, listener: Listener<Value>) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },

    _isReanimatedSharedValue: true,
  } as Omit<Mutable<Value>, '_value'> as Mutable<Value>;

  Object.defineProperty(mutable, '_value', {
    get(): Value {
      return value;
    },
    set(newValue: Value) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },
    configurable: false,
    enumerable: false,
  });

  return mutable;
}

export const makeMutable = SHOULD_BE_USE_WEB
  ? makeMutableWeb
  : makeMutableNative;
