/* eslint-disable camelcase */
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

function experimental_mutableHostDecorator<TValue>(
  shareableHost: ShareableHost<TValue> & Mutable<TValue>,
  dirtyFlag: Synchronizable<boolean>
): ShareableHost<TValue> & Mutable<TValue> {
  'worklet';
  const listeners = new Map<number, Listener<TValue>>();
  let value = shareableHost.value;
  let isDirty = false;

  Object.defineProperties(shareableHost, {
    value: {
      get(): TValue {
        return value;
      },
      set(newValue: TValue) {
        valueSetter(shareableHost, newValue);
      },
    },
    _value: {
      get(): TValue {
        return value;
      },
      set(newValue: TValue) {
        if (!isDirty) {
          this.setDirty!(true);
        }
        value = newValue;
        listeners.forEach((listener) => {
          listener(newValue);
        });
      },
      enumerable: false,
    },
    modify: {
      value: (modifier: (value: TValue) => TValue, forceUpdate = true) => {
        valueSetter(
          shareableHost,
          modifier !== undefined ? modifier(value) : value,
          forceUpdate
        );
      },
    },
    addListener: {
      value: (id: number, listener: Listener<TValue>) => {
        listeners.set(id, listener);
      },
    },
    removeListener: {
      value: (id: number) => {
        listeners.delete(id);
      },
    },
    setDirty: {
      value: (dirty: boolean) => {
        dirtyFlag.setBlocking(dirty);
        isDirty = dirty;
      },
    },
    _animation: {
      value: null,
    },
    _isReanimatedSharedValue: {
      value: true,
    },
  });

  addCompilerSafeGetAndSet(shareableHost);

  return shareableHost;
}

function legacy_mutableHostDecorator<TValue>(
  shareableHost: ShareableHost<TValue> & Mutable<TValue>
): ShareableHost<TValue> & Mutable<TValue> {
  'worklet';
  const listeners = new Map<number, Listener<TValue>>();
  let value = shareableHost.value;

  Object.defineProperties(shareableHost, {
    value: {
      get(): TValue {
        return value;
      },
      set(newValue: TValue) {
        valueSetter(shareableHost, newValue);
      },
    },
    _value: {
      get(): TValue {
        return value;
      },
      set(newValue: TValue) {
        value = newValue;
        listeners.forEach((listener) => {
          listener(newValue);
        });
      },
      enumerable: false,
    },
    modify: {
      value: (modifier: (value: TValue) => TValue, forceUpdate = true) => {
        valueSetter(
          shareableHost,
          modifier !== undefined ? modifier(value) : value,
          forceUpdate
        );
      },
    },
    addListener: {
      value: (id: number, listener: Listener<TValue>) => {
        listeners.set(id, listener);
      },
    },
    removeListener: {
      value: (id: number) => {
        listeners.delete(id);
      },
    },
    _animation: {
      value: null,
    },
    _isReanimatedSharedValue: {
      value: true,
    },
  });

  addCompilerSafeGetAndSet(shareableHost);

  return shareableHost;
}

const USE_SYNCHRONIZABLE_FOR_MUTABLES = getStaticFeatureFlag(
  'USE_SYNCHRONIZABLE_FOR_MUTABLES'
);

function experimental_mutableGuestDecorator<TValue>(
  initial: TValue,
  shareableGuest: ShareableGuest<TValue> & Mutable<TValue>,
  dirtyFlag: Synchronizable<boolean>
): ShareableGuest<TValue> & Mutable<TValue> {
  'worklet';
  let latest = initial;
  Object.defineProperties(shareableGuest, {
    value: {
      get() {
        if (__DEV__ && globalThis.__RUNTIME_KIND === 1) {
          checkInvalidReadDuringRender();
        }
        if (globalThis.__RUNTIME_KIND === 1 && dirtyFlag.getBlocking()) {
          const uiValueGetter = (svArg: Mutable<TValue>) =>
            runOnUISync((sv) => {
              sv.setDirty!(false);
              return sv.value;
            }, svArg);
          latest = uiValueGetter(shareableGuest);
        } else {
          latest = shareableGuest.getSync();
        }
        return latest;
      },
      set(newValue: TValue) {
        if (__DEV__ && globalThis.__RUNTIME_KIND === 1) {
          checkInvalidWriteDuringRender();
        }
        shareableGuest.setSync(newValue);
      },
      configurable: true,
      enumerable: true,
    },

    _value: {
      get(): TValue {
        throw new ReanimatedError(
          'Reading from `_value` directly is only possible on the UI runtime. Perhaps you wanted to access `value` instead?'
        );
      },
      set(_newValue: TValue) {
        throw new ReanimatedError(
          'Setting `_value` directly is only possible on the UI runtime. Perhaps you wanted to assign to `value` instead?'
        );
      },
      configurable: false,
      enumerable: false,
    },

    modify: {
      value: (modifier: (value: TValue) => TValue, forceUpdate = true) => {
        scheduleOnUI(() => {
          shareableGuest.modify(modifier, forceUpdate);
        });
      },
    },
    _isReanimatedSharedValue: {
      value: true,
    },
  });
  addCompilerSafeGetAndSet(shareableGuest);

  return shareableGuest;
}

function legacy_mutableGuestDecorator<TValue>(
  shareableGuest: ShareableGuest<TValue> & Mutable<TValue>
): ShareableGuest<TValue> & Mutable<TValue> {
  'worklet';
  Object.defineProperties(shareableGuest, {
    value: {
      get() {
        if (__DEV__ && globalThis.__RUNTIME_KIND === 1) {
          checkInvalidReadDuringRender();
        }
        return shareableGuest.getSync();
      },
      set(newValue: TValue) {
        if (__DEV__ && globalThis.__RUNTIME_KIND === 1) {
          checkInvalidWriteDuringRender();
        }
        shareableGuest.setSync(newValue);
      },
      configurable: true,
      enumerable: true,
    },
    modify: {
      value: (modifier: (value: TValue) => TValue, forceUpdate = true) => {
        scheduleOnUI(() => {
          shareableGuest.modify(modifier, forceUpdate);
        });
      },
    },
    _isReanimatedSharedValue: {
      value: true,
    },
  });
  addCompilerSafeGetAndSet(shareableGuest);

  return shareableGuest;
}

function experimental_makeMutableNative<TValue>(
  initial: TValue
): Mutable<TValue> {
  const dirtyFlag = createSynchronizable(false);
  const shareable = createShareable<TValue, Mutable<TValue>, Mutable<TValue>>(
    UIRuntimeId,
    initial,
    {
      hostDecorator: (shareableHost) => {
        'worklet';
        return experimental_mutableHostDecorator(shareableHost, dirtyFlag);
      },
      guestDecorator: (shareableGuest) => {
        'worklet';
        return experimental_mutableGuestDecorator(
          initial,
          shareableGuest,
          dirtyFlag
        );
      },
    }
  );

  return shareable;
}

function legacy_makeMutableNative<TValue>(initial: TValue): Mutable<TValue> {
  const shareable = createShareable<TValue, Mutable<TValue>, Mutable<TValue>>(
    UIRuntimeId,
    initial,
    {
      hostDecorator: legacy_mutableHostDecorator,
      guestDecorator: legacy_mutableGuestDecorator,
    }
  );
  return shareable;
}

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function makeMutableWeb<TValue>(initial: TValue): Mutable<TValue> {
  let value: TValue = initial;
  const listeners = new Map<number, Listener<TValue>>();

  const mutable: Mutable<TValue> = {
    get value(): TValue {
      checkInvalidReadDuringRender();
      return value;
    },
    set value(newValue) {
      checkInvalidWriteDuringRender();
      valueSetter(mutable, newValue);
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
        mutable,
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
  } as Mutable<TValue>;

  addCompilerSafeGetAndSet(mutable);

  if (IS_JEST) {
    (mutable as JestMutable<TValue>).toJSON = () => mutableToJSON(value);
  }

  return mutable;
}

export const makeMutable = SHOULD_BE_USE_WEB
  ? makeMutableWeb
  : USE_SYNCHRONIZABLE_FOR_MUTABLES
    ? experimental_makeMutableNative
    : legacy_makeMutableNative;

/** @deprecated Used only in `animationsManager.ts`. Don't use. */
export function legacy_makeMutableUI<TValue>(initial: TValue): Mutable<TValue> {
  'worklet';
  const mutable = legacy_mutableHostDecorator({
    value: initial,
  } as ShareableHost<TValue> & Mutable<TValue>);

  return mutable;
}

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function mutableToJSON<TValue>(value: TValue): string {
  return JSON.stringify(value);
}
