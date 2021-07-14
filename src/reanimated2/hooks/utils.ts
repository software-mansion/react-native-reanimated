import { MutableRefObject, useEffect, useRef } from 'react';
import WorkletEventHandler from '../WorkletEventHandler';

// TODO type event
export function useEvent(
  handler: (event: any) => void,
  eventNames: string[] = [],
  rebuild = false
): MutableRefObject<WorkletEventHandler> {
  const initRef = useRef<WorkletEventHandler>(null);
  if (initRef.current === null) {
    initRef.current = new WorkletEventHandler(handler, eventNames);
  } else if (rebuild) {
    initRef.current.updateWorklet(handler);
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  return initRef;
}

// builds one big hash from multiple worklets' hashes
export function buildWorkletsHash(handlers) {
  return Object.keys(handlers).reduce(
    (previousValue, key) =>
      previousValue === null
        ? handlers[key].__workletHash
        : previousValue.toString() + handlers[key].__workletHash.toString(),
    null
  );
}

// builds dependencies array for gesture handlers
export function buildDependencies(dependencies, handlers) {
  if (!dependencies) {
    dependencies = Object.keys(handlers).map((handlerKey) => {
      const handler = handlers[handlerKey];
      return {
        workletHash: handler.__workletHash,
        closure: handler._closure,
      };
    });
  } else {
    dependencies.push(buildWorkletsHash(handlers));
  }
  return dependencies;
}

// this is supposed to work as useEffect comparison
export function areDependenciesEqual(nextDeps, prevDeps) {
  function is(x, y) {
    /* eslint-disable no-self-compare */
    return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
    /* eslint-enable no-self-compare */
  }
  const objectIs = typeof Object.is === 'function' ? Object.is : is;

  function areHookInputsEqual(nextDeps, prevDeps) {
    if (!nextDeps || !prevDeps || prevDeps.length !== nextDeps.length) {
      return false;
    }
    for (let i = 0; i < prevDeps.length; ++i) {
      if (!objectIs(nextDeps[i], prevDeps[i])) {
        return false;
      }
    }
    return true;
  }

  return areHookInputsEqual(nextDeps, prevDeps);
}
