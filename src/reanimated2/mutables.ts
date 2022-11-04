import NativeReanimatedModule from './NativeReanimated';
import { SharedValue, ShareableSyncDataHolderRef } from './commonTypes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
  registerShareableMapping,
} from './shareables';
import { runOnUI } from './threads';
import { valueSetter } from './valueSetter';
export { stopMapper } from './mappers';

export function makeMutable<T>(
  initial: T,
  needSynchronousReadsFromReact = false
): SharedValue<T> {
  let value: T = initial;
  let syncDataHolder: ShareableSyncDataHolderRef<T> | undefined;
  if (needSynchronousReadsFromReact && NativeReanimatedModule.native) {
    // updates are alwatys synchronous when running on web or in Jest environment
    syncDataHolder = NativeReanimatedModule.makeSynchronizedDataHolder(
      makeShareableCloneRecursive(value)
    );
    registerShareableMapping(syncDataHolder);
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';

      const listeners = new Map();
      let value = initial;

      const self = {
        set value(newValue) {
          valueSetter(self, newValue);
        },
        get value() {
          return self._value;
        },
        set _value(newValue: T) {
          value = newValue;
          if (syncDataHolder) {
            _updateDataSynchronously(
              syncDataHolder,
              makeShareableCloneOnUIRecursive(newValue)
            );
          }
          listeners.forEach((listener) => {
            listener(newValue);
          });
        },
        get _value(): T {
          return value;
        },
        addListener: (id: number, listener: (newValue: T) => void) => {
          listeners.set(id, listener);
        },
        removeListener: (id: number) => {
          listeners.delete(id);
        },
        _animation: null,
      };
      return self;
    },
  });
  // listeners can only work on JS thread on Web and jest environments
  const listeners = NativeReanimatedModule.native ? undefined : new Map();
  const mutable = {
    set value(newValue) {
      value = newValue;
      if (NativeReanimatedModule.native) {
        runOnUI(() => {
          'worklet';
          mutable.value = newValue;
        })();
      } else {
        valueSetter(mutable, newValue);
      }
    },
    get value() {
      if (syncDataHolder) {
        return NativeReanimatedModule.getDataSynchronously(syncDataHolder);
      }
      return value;
    },
    set _value(newValue: T) {
      if (NativeReanimatedModule.native) {
        throw new Error(
          'Setting _value direcly is only possible on the UI runtime'
        );
      }
      value = newValue;
      listeners!.forEach((listener) => {
        listener(newValue);
      });
    },
    get _value(): T {
      if (NativeReanimatedModule.native) {
        throw new Error(
          'Reading from _value direcly is only possible on the UI runtime'
        );
      }
      return value;
    },
    modify: (modifier: (value: T) => T) => {
      runOnUI(() => {
        'worklet';
        mutable.value = modifier(mutable.value);
      })();
    },
    addListener: (id: number, listener: (value: T) => void) => {
      if (NativeReanimatedModule.native) {
        throw new Error('adding listeners is only possible on the UI runtime');
      }
      listeners!.set(id, listener);
    },
    removeListener: (id: number) => {
      if (NativeReanimatedModule.native) {
        throw new Error(
          'removing listeners is only possible on the UI runtime'
        );
      }
      listeners!.delete(id);
    },
  };
  registerShareableMapping(mutable, handle);
  return mutable;
}

export function makeRemote<T extends object>(initial: T = {} as T): T {
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return initial;
    },
  });
  registerShareableMapping(initial, handle);
  return initial;
}
