'use strict';

import type { ShareableHost, Synchronizable } from 'react-native-worklets';

import { logger } from './common';
import type { Mutable } from './commonTypes';
import { isFirstReactRender, isReactRendering } from './reactUtils';
import { valueSetter } from './valueSetter';

function shouldWarnAboutAccessDuringRender() {
  return __DEV__ && isReactRendering() && !isFirstReactRender();
}

export function checkInvalidReadDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn(
      "Reading from `value` during component render. Please ensure that you don't access the `value` property nor use `get` method of a shared value while React is rendering a component.",
      { strict: true }
    );
  }
}

export function checkInvalidWriteDuringRender() {
  if (shouldWarnAboutAccessDuringRender()) {
    logger.warn(
      "Writing to `value` during component render. Please ensure that you don't access the `value` property nor use `set` method of a shared value while React is rendering a component.",
      { strict: true }
    );
  }
}

export type Listener<TValue> = (newValue: TValue) => void;

export function mutableHostDecorator<TValue>(
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

  return mutable;
}
