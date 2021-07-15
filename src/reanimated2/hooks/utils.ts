import { MutableRefObject, useEffect, useRef } from 'react';
import WorkletEventHandler from '../WorkletEventHandler';
import { DependencyObject, WorkletFunction } from './commonTypes';

export function useEvent<T>(
  handler: (event: T) => void,
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
export function buildWorkletsHash(
  handlers: Record<string, WorkletFunction>
): string {
  return Object.keys(handlers).reduce(
    (previousValue, key) =>
      previousValue === null
        ? handlers[key].__workletHash.toString()
        : previousValue + handlers[key].__workletHash.toString(),
    null
  );
}

// builds dependencies array for gesture handlers
export function buildDependencies(
  dependencies: Array<string | DependencyObject>,
  handlers: Record<string, WorkletFunction>
): Array<string | DependencyObject> {
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
export function areDependenciesEqual(
  nextDeps: Array<string | DependencyObject>,
  prevDeps: Array<string | DependencyObject>
): boolean {
  function is(x: number, y: number) {
    /* eslint-disable no-self-compare */
    return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
    /* eslint-enable no-self-compare */
  }
  const objectIs: (
    nextDeps: string | DependencyObject,
    prevDeps: string | DependencyObject
  ) => boolean = typeof Object.is === 'function' ? Object.is : is;

  function areHookInputsEqual(
    nextDeps: Array<string | DependencyObject>,
    prevDeps: Array<string | DependencyObject>
  ): boolean {
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
