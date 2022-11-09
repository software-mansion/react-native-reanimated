import { ShareableRef } from './commonTypes';

export function registerShareableMapping(
  _shareable: any,
  _shareableRef?: ShareableRef<any>
): void {
  // noop
}

export function makeShareableCloneRecursive<T>(value: any): ShareableRef<T> {
  return value;
}

export function makeShareableCloneOnUIRecursive<T>(value: T): ShareableRef<T> {
  'worklet';
  // @ts-ignore web is an interesting place where we don't run a secondary VM on the UI thread
  return value;
}

export function makeShareable<T>(value: T): T {
  return value;
}
