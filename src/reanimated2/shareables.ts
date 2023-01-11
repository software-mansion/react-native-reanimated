import NativeReanimatedModule from './NativeReanimated';
import { ShareableRef } from './commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';
import { registerWorkletStackDetails } from './errors';

// for web/chrome debugger/jest environments this file provides a stub implementation
// where no shareable references are used. Instead, the objects themselves are used
// instead of shareable references, because of the fact that we don't have to deal with
// runnning the code on separate VMs.
const USE_STUB_IMPLEMENTATION = shouldBeUseWeb();

const _shareableCache = new WeakMap<
  Record<string, unknown>,
  ShareableRef<any> | symbol
>();
// the below symbol is used to represent a mapping from the value to itself
// this is used to allow for a converted shareable to be passed to makeShareableClone
const _shareableFlag = Symbol('shareable flag');

export function registerShareableMapping(
  shareable: any,
  shareableRef?: ShareableRef<any>
): void {
  if (USE_STUB_IMPLEMENTATION) {
    return;
  }
  _shareableCache.set(shareable, shareableRef || _shareableFlag);
}

export function makeShareableShadowNodeWrapper<T>(shadowNodeWrapper: T): T {
  const adoptedSNW =
    NativeReanimatedModule.makeShareableClone(shadowNodeWrapper);
  registerShareableMapping(shadowNodeWrapper, adoptedSNW);
  return shadowNodeWrapper;
}

export function makeShareableCloneRecursive<T>(value: any): ShareableRef<T> {
  if (USE_STUB_IMPLEMENTATION) {
    return value;
  }
  // This one actually may be worth to be moved to c++, we also need similar logic to run on the UI thread
  const type = typeof value;
  if ((type === 'object' || type === 'function') && value !== null) {
    const cached = _shareableCache.get(value);
    if (cached === _shareableFlag) {
      return value;
    } else if (cached !== undefined) {
      return cached as ShareableRef<T>;
    } else {
      let toAdapt: any;
      if (Array.isArray(value)) {
        toAdapt = value.map((element) => makeShareableCloneRecursive(element));
      } else if (type === 'function' && value.__workletHash === undefined) {
        // this is a remote function
        toAdapt = value;
      } else {
        if (__DEV__ && value.__workletHash !== undefined) {
          registerWorkletStackDetails(
            value.__workletHash,
            value.__stackDetails
          );
        }
        toAdapt = {};
        for (const [key, element] of Object.entries(value)) {
          toAdapt[key] = makeShareableCloneRecursive(element);
        }
      }
      if (__DEV__) {
        // we freeze objects that are transformed to shareable. This should help
        // detect issues when someone modifies data after it's been converted to
        // shareable. Meaning that they may be doing a faulty assumption in their
        // code expecting that the updates are going to automatically populate to
        // the object sent to the UI thread. If the user really wants some objects
        // to be mutable they should use share values instead.
        Object.freeze(value);
      }
      const adopted = NativeReanimatedModule.makeShareableClone(toAdapt);
      _shareableCache.set(value, adopted);
      _shareableCache.set(adopted, _shareableFlag);
      return adopted;
    }
  }
  return NativeReanimatedModule.makeShareableClone(value);
}

export function makeShareableCloneOnUIRecursive<T>(value: T): ShareableRef<T> {
  'worklet';
  if (USE_STUB_IMPLEMENTATION) {
    // @ts-ignore web is an interesting place where we don't run a secondary VM on the UI thread
    // see more details in the comment where USE_STUB_IMPLEMENTATION is defined.
    return value;
  }
  function cloneRecursive<T>(value: T): ShareableRef<T> {
    const type = typeof value;
    if ((type === 'object' || type === 'function') && value !== null) {
      let toAdapt: any;
      if (Array.isArray(value)) {
        toAdapt = value.map((element) => cloneRecursive(element));
      } else {
        toAdapt = {};
        for (const [key, element] of Object.entries(value)) {
          toAdapt[key] = cloneRecursive(element);
        }
      }
      if (__DEV__) {
        // See the reasoning behind freezing in the other comment above.
        Object.freeze(value);
      }
      return _makeShareableClone(toAdapt);
    }
    return _makeShareableClone(value);
  }
  return cloneRecursive(value);
}

export function makeShareable<T>(value: T): T {
  if (USE_STUB_IMPLEMENTATION) {
    return value;
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return value;
    },
  });
  registerShareableMapping(value, handle);
  return value;
}
