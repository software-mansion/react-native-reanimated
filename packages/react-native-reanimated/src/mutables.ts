'use strict';
import type { Synchronizable } from 'react-native-worklets';
import {
  createSerializable,
  createSynchronizable,
  executeOnUIRuntimeSync,
  runOnUI,
  serializableMappingCache,
} from 'react-native-worklets';

import { IS_JEST, logger, ReanimatedError, SHOULD_BE_USE_WEB } from './common';
import type { Mutable } from './commonTypes';
import { getStaticFeatureFlag } from './featureFlags';
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

type Listener<Value> = (newValue: Value) => void;

type PartialMutable<Value> = Omit<Mutable<Value>, 'get' | 'set'>;

/**
 * Adds `get` and `set` methods to the mutable object to handle access to
 * `value` property.
 *
 * React Compiler disallows modifying return values of hooks. Even though
 * assignment to `value` is a setter invocation, Compiler's static analysis
 * doesn't detect it. That's why we provide a second API for users using the
 * Compiler.
 */
function addCompilerSafeGetAndSet<Value>(mutable: PartialMutable<Value>): void {
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
function hideInternalValueProp<Value>(mutable: PartialMutable<Value>) {
  'worklet';
  Object.defineProperty(mutable, '_value', {
    configurable: false,
    enumerable: false,
  });
}

// eslint-disable-next-line camelcase
function experimental_makeMutableUI<Value>(
  initial: Value,
  dirtyFlag: Synchronizable<boolean>
): Mutable<Value> {
  'worklet';
  const listeners = new Map<number, Listener<Value>>();
  let value = initial;
  let isDirty = false;

  const mutable: PartialMutable<Value> = {
    get value() {
      return value;
    },
    set value(newValue) {
      valueSetter(mutable as Mutable<Value>, newValue);
    },
    get _value(): Value {
      return value;
    },
    set _value(newValue: Value) {
      if (!isDirty) {
        this.setDirty!(true);
      }
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        mutable as Mutable<Value>,
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
    setDirty: (dirty: boolean) => {
      dirtyFlag.setBlocking(dirty);
      isDirty = dirty;
    },

    _animation: null,
    _isReanimatedSharedValue: true,
  };

  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);

  return mutable as Mutable<Value>;
}

// eslint-disable-next-line camelcase
export function legacy_makeMutableUI<Value>(initial: Value): Mutable<Value> {
  'worklet';
  const listeners = new Map<number, Listener<Value>>();
  let value = initial;

  const mutable: PartialMutable<Value> = {
    get value() {
      return value;
    },
    set value(newValue) {
      valueSetter(mutable as Mutable<Value>, newValue);
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
        mutable as Mutable<Value>,
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
  addCompilerSafeGetAndSet(mutable);

  return mutable as Mutable<Value>;
}

const USE_SYNCHRONIZABLE_FOR_MUTABLES = getStaticFeatureFlag(
  'USE_SYNCHRONIZABLE_FOR_MUTABLES'
);

// eslint-disable-next-line camelcase
function experimental_makeMutableNative<Value>(initial: Value): Mutable<Value> {
  let latest = initial;
  const dirtyFlag = createSynchronizable(false);
  const handle = createSerializable({
    __init: () => {
      'worklet';
      return experimental_makeMutableUI(initial, dirtyFlag);
    },
  });

  const mutable: PartialMutable<Value> = {
    get value(): Value {
      checkInvalidReadDuringRender();
      if (dirtyFlag.getBlocking()) {
        const uiValueGetter = executeOnUIRuntimeSync((sv: Mutable<Value>) => {
          sv.setDirty!(false);
          return sv.value;
        });
        latest = uiValueGetter(mutable as Mutable<Value>);
      }
      return latest;
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
  addCompilerSafeGetAndSet(mutable);

  serializableMappingCache.set(mutable, handle);
  return mutable as Mutable<Value>;
}

function makeMutableNative<Value>(initial: Value): Mutable<Value> {
  const handle = createSerializable({
    __init: () => {
      'worklet';
      return legacy_makeMutableUI(initial);
    },
  });

  const mutable: PartialMutable<Value> = {
    get value(): Value {
      checkInvalidReadDuringRender();
      const uiValueGetter = executeOnUIRuntimeSync((sv: Mutable<Value>) => {
        return sv.value;
      });
      return uiValueGetter(mutable as Mutable<Value>);
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
  addCompilerSafeGetAndSet(mutable);

  serializableMappingCache.set(mutable, handle);
  return mutable as Mutable<Value>;
}

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function makeMutableWeb<Value>(initial: Value): Mutable<Value> {
  let value: Value = initial;
  const listeners = new Map<number, Listener<Value>>();

  const mutable: PartialMutable<Value> = {
    get value(): Value {
      checkInvalidReadDuringRender();
      return value;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      valueSetter(mutable as Mutable<Value>, newValue);
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
        mutable as Mutable<Value>,
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
  addCompilerSafeGetAndSet(mutable);

  if (IS_JEST) {
    (mutable as JestMutable<Value>).toJSON = () => mutableToJSON(value);
  }

  return mutable as Mutable<Value>;
}

export const makeMutable = SHOULD_BE_USE_WEB
  ? makeMutableWeb
  : USE_SYNCHRONIZABLE_FOR_MUTABLES
    ? // eslint-disable-next-line camelcase
      experimental_makeMutableNative
    : makeMutableNative;

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function mutableToJSON<TValue>(value: TValue): string {
  return JSON.stringify(value);
}
