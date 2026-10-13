'use strict';

import type {
  FixedSynchronizable,
  ShareableGuest,
} from 'react-native-worklets';
import {
  createShareable,
  createSynchronizable,
  runOnUISync,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';

import type { Mutable } from './commonTypes';
import {
  checkInvalidReadDuringRender,
  checkInvalidWriteDuringRender,
  mutableHostDecorator,
} from './mutablesCommon';

function mutableGuestDecorator<TValue>(
  initial: TValue,
  mutable: ShareableGuest<TValue> & Mutable<TValue>,
  dirtyFlag: FixedSynchronizable<boolean>
): ShareableGuest<TValue> & Mutable<TValue> {
  'worklet';
  let latest = initial;

  Object.defineProperties(mutable, {
    value: {
      get() {
        if (globalThis.__RUNTIME_KIND !== 1) {
          latest = mutable.getSync();
        } else {
          checkInvalidReadDuringRender();
          if (dirtyFlag.getDirty()) {
            const uiValueGetter = (svArg: Mutable<TValue>) =>
              runOnUISync((sv) => {
                sv.setDirtyFlag(false);
                return sv.value;
              }, svArg);
            latest = uiValueGetter(mutable as Mutable<TValue>);
          }
        }
        return latest;
      },
      set(newValue) {
        if (globalThis.__RUNTIME_KIND === 1) {
          checkInvalidWriteDuringRender();
          scheduleOnUI(() => {
            mutable.value = newValue;
          });
        } else {
          mutable.setAsync(newValue);
        }
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
      get() {
        throw new Error(
          '[Reanimated] Reading from `_value` directly is only possible on the UI runtime. Perhaps you wanted to access `value` instead?'
        );
      },
      set(_newValue) {
        throw new Error(
          '[Reanimated] Setting `_value` directly is only possible on the UI runtime. Perhaps you wanted to assign to `value` instead?'
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
        throw new Error(
          '[Reanimated] Adding listeners is only possible on the UI runtime.'
        );
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    removeListener: {
      value: () => {
        throw new Error(
          '[Reanimated] Removing listeners is only possible on the UI runtime.'
        );
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },

    setDirtyFlag: {
      value: () => undefined,
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

export function makeMutable<TValue>(initial: TValue): Mutable<TValue> {
  const dirtyFlag = createSynchronizable(false, { fixedType: true });

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
