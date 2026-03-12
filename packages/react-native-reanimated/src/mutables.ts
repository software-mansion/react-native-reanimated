'use strict';

import type {
  ShareableGuest,
  ShareableHost,
  Synchronizable,
} from 'react-native-worklets';
import {
  createShareable,
  createSynchronizable,
  runOnUISync,
  scheduleOnUI,
  UIRuntimeId,
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

type Listener<TValue> = (newValue: TValue) => void;

type PartialMutable<TValue> = Omit<Mutable<TValue>, 'get' | 'set'>;

/**
 * Adds `get` and `set` methods to the mutable object to handle access to
 * `value` property.
 *
 * React Compiler disallows modifying return values of hooks. Even though
 * assignment to `value` is a setter invocation, Compiler's static analysis
 * doesn't detect it. That's why we provide a second API for users using the
 * Compiler.
 */
function addCompilerSafeGetAndSet<TValue>(
  mutable: PartialMutable<TValue>
): void {
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
      value(newValue: TValue | ((value: TValue) => TValue)) {
        if (
          typeof newValue === 'function' &&
          // If we have an animation definition, we don't want to call it here.
          !(newValue as Record<string, unknown>).__isAnimationDefinition
        ) {
          mutable.value = (newValue as (value: TValue) => TValue)(
            mutable.value
          );
        } else {
          mutable.value = newValue as TValue;
        }
      },
      configurable: false,
      enumerable: false,
    },
  });
}

function mutableHostDecorator<TValue>(
  mutable: ShareableHost<TValue> & Mutable<TValue>,
  dirtyFlag?: Synchronizable<boolean>
): ShareableHost<TValue> & Mutable<TValue> {
  'worklet';
  const listeners = new Map<number, Listener<TValue>>();
  let value = mutable.value;
  let isDirty = false;

  Object.defineProperties(mutable, {
    value: {
      get() {
        return value;
      },
      set(newValue) {
        valueSetter(mutable, newValue);
      },
      enumerable: true,
      configurable: true,
    },

    _value: {
      get(): TValue {
        return value;
      },
      set(newValue: TValue) {
        if (!isDirty) {
          this.setDirty(true);
        }
        value = newValue;
        listeners.forEach((listener) => {
          listener(newValue);
        });
      },
    },

    modify: {
      value: (modifier: (value: TValue) => TValue, forceUpdate = true) => {
        valueSetter(
          mutable as Mutable<TValue>,
          modifier !== undefined ? modifier(value) : value,
          forceUpdate
        );
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    addListener: {
      value: (id: number, listener: Listener<TValue>) => {
        listeners.set(id, listener);
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    removeListener: {
      value: (id: number) => {
        listeners.delete(id);
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    setDirty: {
      value: (dirty: boolean) => {
        dirtyFlag?.setBlocking(dirty);
        isDirty = dirty;
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    _animation: {
      value: null,
      writable: true,
      enumerable: true,
      configurable: true,
    },

    _isReanimatedSharedValue: {
      value: true,
      writable: true,
      enumerable: true,
      configurable: true,
    },
  });

  addCompilerSafeGetAndSet(mutable);

  return mutable;
}

const USE_SYNCHRONIZABLE_FOR_MUTABLES = getStaticFeatureFlag(
  'USE_SYNCHRONIZABLE_FOR_MUTABLES'
);

function mutableGuestDecorator<TValue>(
  initial: TValue,
  mutable: ShareableGuest<TValue> & Mutable<TValue>,
  dirtyFlag?: Synchronizable<boolean>
): ShareableGuest<TValue> & Mutable<TValue> {
  'worklet';
  let latest = initial;

  Object.defineProperties(mutable, {
    value: {
      get() {
        if (globalThis.__RUNTIME_KIND === 1) {
          checkInvalidReadDuringRender();
        }

        if (globalThis.__RUNTIME_KIND !== 1 || dirtyFlag === undefined) {
          latest = mutable.getSync();
        } else if (dirtyFlag.getBlocking()) {
          const uiValueGetter = (svArg: Mutable<TValue>) =>
            runOnUISync((sv) => {
              sv.setDirty?.(false);
              return sv.value;
            }, svArg);
          latest = uiValueGetter(mutable as Mutable<TValue>);
        }
        return latest;
      },
      set(newValue) {
        if (globalThis.__RUNTIME_KIND === 1) {
          checkInvalidWriteDuringRender();
        }
        mutable.setAsync(newValue);
      },
      enumerable: true,
      configurable: true,
    },

    _value: {
      get() {
        throw new ReanimatedError(
          'Reading from `_value` directly is only possible on the UI runtime. Perhaps you wanted to access `value` instead?'
        );
      },
      set(_newValue) {
        throw new ReanimatedError(
          'Setting `_value` directly is only possible on the UI runtime. Perhaps you wanted to assign to `value` instead?'
        );
      },
    },

    modify: {
      value: (modifier: (value: TValue) => TValue, forceUpdate = true) => {
        scheduleOnUI(() => {
          mutable.modify(modifier, forceUpdate);
        });
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    addListener: {
      value: () => {
        throw new ReanimatedError(
          'Adding listeners is only possible on the UI runtime.'
        );
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    removeListener: {
      value: () => {
        throw new ReanimatedError(
          'Removing listeners is only possible on the UI runtime.'
        );
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    _isReanimatedSharedValue: {
      value: true,
      writable: true,
      enumerable: true,
      configurable: true,
    },
  });

  addCompilerSafeGetAndSet(mutable);

  return mutable;
}

function makeMutableWeb<TValue>(initial: TValue): Mutable<TValue> {
  let value: TValue = initial;
  const listeners = new Map<number, Listener<TValue>>();

  const mutable: PartialMutable<TValue> = {
    get value(): TValue {
      checkInvalidReadDuringRender();
      return value;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      valueSetter(mutable as Mutable<TValue>, newValue);
    },

    get _value(): TValue {
      return value;
    },
    set _value(newValue: TValue) {
      value = newValue;
      listeners.forEach((listener) => {
        listener(newValue);
      });
    },

    modify: (modifier, forceUpdate = true) => {
      valueSetter(
        mutable as Mutable<TValue>,
        modifier !== undefined ? modifier(mutable.value) : mutable.value,
        forceUpdate
      );
    },
    addListener: (id: number, listener: Listener<TValue>) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },

    _isReanimatedSharedValue: true,
  };

  // Hide `_value` from accidental enumeration.
  Object.defineProperty(mutable, '_value', {
    configurable: false,
    enumerable: false,
  });

  addCompilerSafeGetAndSet(mutable);

  if (IS_JEST) {
    (mutable as JestMutable<TValue>).toJSON = () => mutableToJSON(value);
  }

  return mutable as Mutable<TValue>;
}

function makeMutableNative<TValue>(initial: TValue): Mutable<TValue> {
  const dirtyFlag = USE_SYNCHRONIZABLE_FOR_MUTABLES
    ? createSynchronizable(false)
    : undefined;

  const shareable = createShareable<TValue, Mutable<TValue>, Mutable<TValue>>(
    UIRuntimeId,
    initial,
    {
      hostDecorator: (shareableHost) => {
        'worklet';
        return mutableHostDecorator(shareableHost, dirtyFlag);
      },
      guestDecorator: (shareableGuest) => {
        'worklet';
        return mutableGuestDecorator(initial, shareableGuest, dirtyFlag);
      },
    }
  );

  return shareable;
}

export const makeMutable = SHOULD_BE_USE_WEB
  ? makeMutableWeb
  : makeMutableNative;

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function mutableToJSON<TValue>(value: TValue): string {
  return JSON.stringify(value);
}

/** @deprecated Used only in `animationsManager.ts`. Don't use. */
export function makeMutableUI<TValue>(initial: TValue): Mutable<TValue> {
  'worklet';
  const mutable = mutableHostDecorator({
    value: initial,
  } as ShareableHost<TValue> & Mutable<TValue>);

  return mutable;
}
