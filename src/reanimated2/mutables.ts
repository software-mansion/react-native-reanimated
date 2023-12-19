'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import type { SharedValue } from './commonTypes';
import {
  makeShareableCloneRecursive,
  registerShareableMapping,
} from './shareables';
import { executeOnUIRuntimeSync, runOnUI } from './threads';
import { valueSetter } from './valueSetter';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

function uiValueGetter<T>(sharedValue: SharedValue<T>) {
  'worklet';
  return sharedValue.value;
}

export function makeUIMutable<T>(initial: T) {
  'worklet';

  const listeners = new Map();
  let value = initial;

  const self = {
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
    set _value(newValue: T) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },
    get _value(): T {
      return value;
    },
    modify: (modifier?: (value: T) => T, forceUpdate = true) => {
      valueSetter(
        self,
        modifier !== undefined ? modifier(value) : value,
        forceUpdate
      );
    },
    addListener: (id: number, listener: (newValue: T) => void) => {
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

export function makeMutable<T>(initial: T): SharedValue<T> {
  let value: T = initial;
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return makeUIMutable(initial);
    },
  });
  // listeners can only work on JS thread on Web and jest environments
  const listeners = SHOULD_BE_USE_WEB ? new Map() : undefined;
  const mutable = {
    set value(newValue) {
      if (SHOULD_BE_USE_WEB) {
        valueSetter(mutable, newValue);
      } else {
        runOnUI(() => {
          mutable.value = newValue;
        })();
      }
    },
    get value() {
      if (!SHOULD_BE_USE_WEB) {
        return executeOnUIRuntimeSync(uiValueGetter)(mutable);
      }
      return value;
    },
    set _value(newValue: T) {
      if (!SHOULD_BE_USE_WEB) {
        throw new Error(
          '[Reanimated] Setting `_value` directly is only possible on the UI runtime.'
        );
      }
      value = newValue;
      listeners!.forEach((listener) => {
        listener(newValue);
      });
    },
    get _value(): T {
      if (!SHOULD_BE_USE_WEB) {
        throw new Error(
          '[Reanimated] Reading from `_value` directly is only possible on the UI runtime.'
        );
      }
      return value;
    },
    modify: (modifier?: (value: T) => T, forceUpdate = true) => {
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
    addListener: (id: number, listener: (value: T) => void) => {
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
  registerShareableMapping(mutable, handle);
  return mutable;
}

export function makeRemote<T extends object>(initial: T = {} as T): T {
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return initial;
    },
  });
  registerShareableMapping(initial, handle);
  return initial;
}
