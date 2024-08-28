'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import type { Mutable } from './commonTypes';
import { ReanimatedError } from './errors';
import { logger } from './logger';
import { isFirstReactRender, isReactRendering } from './reactUtils';
import { shareableMappingCache } from './shareableMappingCache';
import { makeShareableCloneRecursive } from './shareables';
import { executeOnUIRuntimeSync, runOnUI } from './threads';
import { valueSetter } from './valueSetter';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

function shouldWarnAboutAccessDuringRender() {
  return __DEV__ && isReactRendering() && !isFirstReactRender();
}

function checkInvalidReadDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn(
      'Reading from `value` during component render. Please ensure that you do not access the `value` property while React is rendering a component.',
      { strict: true }
    );
  }
}

function checkInvalidWriteDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn(
      'Writing to `value` during component render. Please ensure that you do not access the `value` property while React is rendering a component.',
      { strict: true }
    );
  }
}

type Listener<Value> = (newValue: Value) => void;

/**
 * Hides the internal `_value` property of a mutable. It won't be visible to:
 * - `Object.keys`,
 * - `const prop in obj`,
 * - etc.
 *
 * This way when the user accidentally sends the SharedValue to React, he won't get an obscure
 * error message.
 *
 * We hide for both _React runtime_ and _Worklet runtime_ mutables for uniformity of behavior.
 */
function hideInternalValueProp(mutable: Mutable) {
  'worklet';
  Object.defineProperty(mutable, '_value', {
    configurable: false,
    enumerable: false,
  });
}

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

  hideInternalValueProp(mutable);

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
      checkInvalidReadDuringRender();
      const uiValueGetter = executeOnUIRuntimeSync((sv: Mutable<Value>) => {
        return sv.value;
      });
      return uiValueGetter(mutable);
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      runOnUI(() => {
        mutable.value = newValue;
      })();
    },

    get _value(): Value {
      throw new ReanimatedError(
        'Reading from `_value` directly is only possible on the UI runtime. Perhaps you passed an Animated Style to a non-animated component?'
      );
    },
    set _value(_newValue: Value) {
      throw new ReanimatedError(
        'Setting `_value` directly is only possible on the UI runtime. Perhaps you want to assign to `value` instead?'
      );
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

  shareableMappingCache.set(mutable, handle);
  return mutable;
}

function makeMutableWeb<Value>(initial: Value): Mutable<Value> {
  let value: Value = initial;
  const listeners = new Map<number, Listener<Value>>();

  const mutable: Mutable<Value> = {
    get value(): Value {
      checkInvalidReadDuringRender();
      return value;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
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

  hideInternalValueProp(mutable);

  return mutable;
}

export const makeMutable = SHOULD_BE_USE_WEB
  ? makeMutableWeb
  : makeMutableNative;
