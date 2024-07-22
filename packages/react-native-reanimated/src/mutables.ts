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

    /**
     * _value prop should only be accessed by the valueSetter implementation
     * which may make the decision about updating the mutable value depending
     * on the provided new value. All other places should only attempt to modify
     * the mutable by assigning to value prop directly.
     */
    get _value(): Value {
      return value;
    },
    set _value(newValue: Value) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
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
  };
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

    get _value(): Value {
      throw new Error(
        '[Reanimated] Reading from `_value` directly is only possible on the UI runtime. Perhaps you passed an Animated Style to a non-animated component?'
      );
    },
    set _value(_newValue: Value) {
      throw new Error(
        '[Reanimated] Setting `_value` directly is only possible on the UI runtime. Perhaps you want to assign to `value` instead?'
      );
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
  };

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

    get _value(): Value {
      return value;
    },
    set _value(newValue: Value) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
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
  };

  return mutable;
}

export const makeMutable = SHOULD_BE_USE_WEB
  ? makeMutableWeb
  : makeMutableNative;
