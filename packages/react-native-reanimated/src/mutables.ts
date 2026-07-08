'use strict';

import { IS_JEST } from './common';
import type { Mutable } from './commonTypes';
import type { Listener, PartialMutable } from './mutablesCommon';
import {
  addCompilerSafeGetAndSet,
  checkInvalidReadDuringRender,
  checkInvalidWriteDuringRender,
} from './mutablesCommon';
import { valueSetter } from './valueSetter';

export { makeMutableUI } from './mutablesCommon';

interface JestMutable<TValue> extends Mutable<TValue> {
  toJSON: () => string;
}

function mutableToJSON<TValue>(value: TValue): string {
  return JSON.stringify(value);
}

export function makeMutable<TValue>(initial: TValue): Mutable<TValue> {
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
