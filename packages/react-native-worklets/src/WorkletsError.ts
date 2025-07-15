'use strict';

function WorkletsErrorConstructor(message?: string): WorkletsError {
  'worklet';
  const prefix = '[Worklets]';

  // eslint-disable-next-line reanimated/use-worklets-error
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = `WorkletsError`;
  return errorInstance as WorkletsError;
}

/**
 * Registers WorkletsError in the global scope. Register only for Worklet
 * runtimes.
 */
export function registerWorkletsError() {
  'worklet';
  if (globalThis._WORKLET) {
    globalThis.WorkletsError =
      WorkletsErrorConstructor as IWorkletsErrorConstructor;
  }
}

export const WorkletsError =
  WorkletsErrorConstructor as IWorkletsErrorConstructor;

export type WorkletsError = Error & { name: 'Worklets' }; // signed type

export interface IWorkletsErrorConstructor extends Error {
  new (message?: string): WorkletsError;
  (message?: string): WorkletsError;
  readonly prototype: WorkletsError;
}
