'use strict';

import { IS_JEST } from './common';
import type { Mutable } from './commonTypes';
import type { Listener } from './mutablesCommon';
import {
  checkInvalidReadDuringRender,
  checkInvalidWriteDuringRender,
} from './mutablesCommon';
import { valueSetter } from './valueSetter';

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function mutableToJSON<TValue>(value: TValue): string {
  return JSON.stringify(value);
}

export function makeMutable<TValue>(initial: TValue): Mutable<TValue> {
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

    get() {
      return mutable.value;
    },
    set(newValue) {
      if (
        typeof newValue === 'function' &&
        !(newValue as Record<string, unknown>).__isAnimationDefinition
      ) {
        mutable.value = (newValue as (value: TValue) => TValue)(mutable.value);
      } else {
        mutable.value = newValue as TValue;
      }
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
  };

  // Hide `_value` from accidental enumeration.
  Object.defineProperties(mutable, {
    _value: {
      configurable: false,
      enumerable: false,
    },
    get: {
      configurable: false,
      enumerable: false,
      writable: false,
    },
    set: {
      configurable: false,
      enumerable: false,
      writable: false,
    },
  });

  if (IS_JEST) {
    (mutable as JestMutable<TValue>).toJSON = () => mutableToJSON(value);
  }

  return mutable;
}
