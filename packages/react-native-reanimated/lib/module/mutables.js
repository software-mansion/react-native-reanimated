'use strict';

import { createSerializable, createSynchronizable, executeOnUIRuntimeSync, runOnUI, serializableMappingCache } from 'react-native-worklets';
import { IS_JEST, logger, ReanimatedError, SHOULD_BE_USE_WEB } from './common';
import { getStaticFeatureFlag } from './featureFlags';
import { isFirstReactRender, isReactRendering } from './reactUtils';
import { valueSetter } from './valueSetter';
function shouldWarnAboutAccessDuringRender() {
  return __DEV__ && isReactRendering() && !isFirstReactRender();
}
function checkInvalidReadDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn("Reading from `value` during component render. Please ensure that you don't access the `value` property nor use `get` method of a shared value while React is rendering a component.", {
      strict: true
    });
  }
}
function checkInvalidWriteDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn("Writing to `value` during component render. Please ensure that you don't access the `value` property nor use `set` method of a shared value while React is rendering a component.", {
      strict: true
    });
  }
}
/**
 * Adds `get` and `set` methods to the mutable object to handle access to
 * `value` property.
 *
 * React Compiler disallows modifying return values of hooks. Even though
 * assignment to `value` is a setter invocation, Compiler's static analysis
 * doesn't detect it. That's why we provide a second API for users using the
 * Compiler.
 */
function addCompilerSafeGetAndSet(mutable) {
  'worklet';

  Object.defineProperties(mutable, {
    get: {
      value() {
        return mutable.value;
      },
      configurable: false,
      enumerable: false
    },
    set: {
      value(newValue) {
        if (typeof newValue === 'function' &&
        // If we have an animation definition, we don't want to call it here.
        !newValue.__isAnimationDefinition) {
          mutable.value = newValue(mutable.value);
        } else {
          mutable.value = newValue;
        }
      },
      configurable: false,
      enumerable: false
    }
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
function hideInternalValueProp(mutable) {
  'worklet';

  Object.defineProperty(mutable, '_value', {
    configurable: false,
    enumerable: false
  });
}

// eslint-disable-next-line camelcase
function experimental_makeMutableUI(initial, dirtyFlag) {
  'worklet';

  const listeners = new Map();
  let value = initial;
  let isDirty = false;
  const mutable = {
    get value() {
      return value;
    },
    set value(newValue) {
      valueSetter(mutable, newValue);
    },
    get _value() {
      return value;
    },
    set _value(newValue) {
      if (!isDirty) {
        this.setDirty(true);
      }
      value = newValue;
      listeners.forEach(listener => {
        listener(newValue);
      });
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(mutable, modifier !== undefined ? modifier(value) : value, forceUpdate);
    },
    addListener: (id, listener) => {
      listeners.set(id, listener);
    },
    removeListener: id => {
      listeners.delete(id);
    },
    setDirty: dirty => {
      dirtyFlag.setBlocking(dirty);
      isDirty = dirty;
    },
    _animation: null,
    _isReanimatedSharedValue: true
  };
  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);
  return mutable;
}

// eslint-disable-next-line camelcase
export function legacy_makeMutableUI(initial) {
  'worklet';

  const listeners = new Map();
  let value = initial;
  const mutable = {
    get value() {
      return value;
    },
    set value(newValue) {
      valueSetter(mutable, newValue);
    },
    get _value() {
      return value;
    },
    set _value(newValue) {
      value = newValue;
      listeners.forEach(listener => {
        listener(newValue);
      });
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(mutable, modifier !== undefined ? modifier(value) : value, forceUpdate);
    },
    addListener: (id, listener) => {
      listeners.set(id, listener);
    },
    removeListener: id => {
      listeners.delete(id);
    },
    _animation: null,
    _isReanimatedSharedValue: true
  };
  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);
  return mutable;
}
const USE_SYNCHRONIZABLE_FOR_MUTABLES = getStaticFeatureFlag('USE_SYNCHRONIZABLE_FOR_MUTABLES');

// eslint-disable-next-line camelcase
function experimental_makeMutableNative(initial) {
  let latest = initial;
  const dirtyFlag = createSynchronizable(false);
  const handle = createSerializable({
    __init: () => {
      'worklet';

      return experimental_makeMutableUI(initial, dirtyFlag);
    }
  });
  const mutable = {
    get value() {
      checkInvalidReadDuringRender();
      if (dirtyFlag.getBlocking()) {
        const uiValueGetter = executeOnUIRuntimeSync(sv => {
          sv.setDirty(false);
          return sv.value;
        });
        latest = uiValueGetter(mutable);
      }
      return latest;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      runOnUI(() => {
        mutable.value = newValue;
      })();
    },
    get _value() {
      throw new ReanimatedError('Reading from `_value` directly is only possible on the UI runtime. Perhaps you passed an Animated Style to a non-animated component?');
    },
    set _value(_newValue) {
      throw new ReanimatedError('Setting `_value` directly is only possible on the UI runtime. Perhaps you want to assign to `value` instead?');
    },
    modify: (modifier, forceUpdate = true) => {
      runOnUI(() => {
        mutable.modify(modifier, forceUpdate);
      })();
    },
    addListener: () => {
      throw new ReanimatedError('Adding listeners is only possible on the UI runtime.');
    },
    removeListener: () => {
      throw new ReanimatedError('Removing listeners is only possible on the UI runtime.');
    },
    _isReanimatedSharedValue: true
  };
  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);
  serializableMappingCache.set(mutable, handle);
  return mutable;
}
function makeMutableNative(initial) {
  const handle = createSerializable({
    __init: () => {
      'worklet';

      return legacy_makeMutableUI(initial);
    }
  });
  const mutable = {
    get value() {
      checkInvalidReadDuringRender();
      const uiValueGetter = executeOnUIRuntimeSync(sv => {
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
    get _value() {
      throw new ReanimatedError('Reading from `_value` directly is only possible on the UI runtime. Perhaps you passed an Animated Style to a non-animated component?');
    },
    set _value(_newValue) {
      throw new ReanimatedError('Setting `_value` directly is only possible on the UI runtime. Perhaps you want to assign to `value` instead?');
    },
    modify: (modifier, forceUpdate = true) => {
      runOnUI(() => {
        mutable.modify(modifier, forceUpdate);
      })();
    },
    addListener: () => {
      throw new ReanimatedError('Adding listeners is only possible on the UI runtime.');
    },
    removeListener: () => {
      throw new ReanimatedError('Removing listeners is only possible on the UI runtime.');
    },
    _isReanimatedSharedValue: true
  };
  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);
  serializableMappingCache.set(mutable, handle);
  return mutable;
}
function makeMutableWeb(initial) {
  let value = initial;
  const listeners = new Map();
  const mutable = {
    get value() {
      checkInvalidReadDuringRender();
      return value;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      valueSetter(mutable, newValue);
    },
    get _value() {
      return value;
    },
    set _value(newValue) {
      value = newValue;
      listeners.forEach(listener => {
        listener(newValue);
      });
    },
    modify: (modifier, forceUpdate = true) => {
      valueSetter(mutable, modifier !== undefined ? modifier(mutable.value) : mutable.value, forceUpdate);
    },
    addListener: (id, listener) => {
      listeners.set(id, listener);
    },
    removeListener: id => {
      listeners.delete(id);
    },
    _isReanimatedSharedValue: true
  };
  hideInternalValueProp(mutable);
  addCompilerSafeGetAndSet(mutable);
  if (IS_JEST) {
    mutable.toJSON = () => mutableToJSON(value);
  }
  return mutable;
}
export const makeMutable = SHOULD_BE_USE_WEB ? makeMutableWeb : USE_SYNCHRONIZABLE_FOR_MUTABLES ?
// eslint-disable-next-line camelcase
experimental_makeMutableNative : makeMutableNative;
function mutableToJSON(value) {
  return JSON.stringify(value);
}
//# sourceMappingURL=mutables.js.map