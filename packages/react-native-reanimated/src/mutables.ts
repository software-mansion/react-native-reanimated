'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import type { Mutable } from './commonTypes';
import { makeShareableCloneRecursive } from './shareables';
import { shareableMappingCache } from './shareableMappingCache';
import { executeOnUIRuntimeSync, runOnUI } from './threads';
import { valueSetter } from './valueSetter';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

type Listener<Value> = (newValue: Value) => void;

export function makeUIMutable<Value>(initial: Value): Mutable<Value> {
  'worklet';

  const listeners = new Map<number, Listener<Value>>();
  let value = initial;

  const self: Mutable<Value> = {
    set value(newValue) {
      valueSetter(self, newValue);
    },
    get value() {
      return value;
    },
    /**
     * _value prop should only be accessed by the valueSetter implementation
     * which may make the decision about updating the mutable value depending
     * on the provided new value. All other places should only attempt to modify
     * the mutable by assigning to value prop directly.
     */
    set _value(newValue: Value) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },
    get _value(): Value {
      return value;
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        self,
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
  return self;
}

export function makeMutable<Value>(initial: Value): Mutable<Value> {
  let value: Value = initial;
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return makeUIMutable(initial);
    },
  });
  // listeners can only work on JS thread on Web and jest environments
  const listeners = SHOULD_BE_USE_WEB
    ? new Map<number, Listener<Value>>()
    : undefined;
  const mutable: Mutable<Value> = {
    set value(newValue) {
      if (SHOULD_BE_USE_WEB) {
        valueSetter(mutable, newValue);
      } else {
        runOnUI(() => {
          mutable.value = newValue;
        })();
      }
    },
    get value(): Value {
      if (SHOULD_BE_USE_WEB) {
        return value;
      }
      const uiValueGetter = executeOnUIRuntimeSync((sv: Mutable<Value>) => {
        return sv.value;
      });
      return uiValueGetter(mutable);
    },
    set _value(newValue: Value) {
      if (!SHOULD_BE_USE_WEB) {
        throw new Error(
          '[Reanimated] Setting `_value` directly is only possible on the UI runtime. Perhaps you want to assign to `value` instead?'
        );
      }
      value = newValue;
      listeners!.forEach((listener) => {
        listener(newValue);
      });
    },
    get _value(): Value {
      if (SHOULD_BE_USE_WEB) {
        return value;
      }
      throw new Error(
        '[Reanimated] Reading from `_value` directly is only possible on the UI runtime. Perhaps you passed an Animated Style to a non-animated component?'
      );
    },

    modify: (modifier, forceUpdate = true) => {
      if (!SHOULD_BE_USE_WEB) {
        runOnUI(() => {
          mutable.modify(modifier, forceUpdate);
        })();
      } else {
        valueSetter(
          mutable,
          modifier !== undefined ? modifier(mutable.value) : mutable.value,
          forceUpdate
        );
      }
    },
    addListener: (id: number, listener: Listener<Value>) => {
      if (!SHOULD_BE_USE_WEB) {
        throw new Error(
          '[Reanimated] Adding listeners is only possible on the UI runtime.'
        );
      }
      listeners!.set(id, listener);
    },
    removeListener: (id: number) => {
      if (!SHOULD_BE_USE_WEB) {
        throw new Error(
          '[Reanimated] Removing listeners is only possible on the UI runtime.'
        );
      }
      listeners!.delete(id);
    },
    _isReanimatedSharedValue: true,
  };
  shareableMappingCache.set(mutable, handle);
  return mutable;
}
