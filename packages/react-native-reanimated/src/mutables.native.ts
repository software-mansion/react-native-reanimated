'use strict';

import type { ShareableGuest, Synchronizable } from 'react-native-worklets';
import {
  createShareable,
  createSynchronizable,
  runOnUISync,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';

import {
  addCompilerSafeGetAndSet,
  checkInvalidReadDuringRender,
  checkInvalidWriteDuringRender,
  mutableHostDecorator,
} from './commonMutables';
import type { Mutable } from './commonTypes';
import { getStaticFeatureFlag } from './featureFlags';

export { makeMutableUI } from './commonMutables';

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

export function makeMutable<TValue>(initial: TValue): Mutable<TValue> {
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
