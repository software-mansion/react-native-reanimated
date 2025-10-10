'use strict';

import { RuntimeKind } from './runtimeKind';
import type {
  IWorkletsErrorConstructor,
  WorkletsError as IWorkletsError,
} from './workletTypes';

function WorkletsErrorConstructor(message?: string): IWorkletsError {
  'worklet';
  const prefix = '[Worklets]';

  // eslint-disable-next-line reanimated/use-worklets-error
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = `WorkletsError`;
  return errorInstance as IWorkletsError;
}

/**
 * Registers WorkletsError in the global scope. Register only for Worklet
 * runtimes.
 */
export function registerWorkletsError() {
  'worklet';
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    (globalThis as Record<string, unknown>).WorkletsError =
      WorkletsErrorConstructor as IWorkletsErrorConstructor;
  }
}

export const WorkletsError =
  WorkletsErrorConstructor as IWorkletsErrorConstructor;
