/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { RuntimeKind } from 'react-native-worklets';

function ReanimatedErrorConstructor(message: string): ReanimatedError {
  'worklet';
  const prefix = '[Reanimated]';
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = 'ReanimatedError';
  return errorInstance as ReanimatedError;
}

/**
 * Registers ReanimatedError in the global scope. Register only for Worklet
 * runtimes.
 */
export function registerReanimatedError() {
  'worklet';
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    globalThis.ReanimatedError =
      ReanimatedErrorConstructor as IReanimatedErrorConstructor;
  }
}

export const ReanimatedError =
  ReanimatedErrorConstructor as IReanimatedErrorConstructor;

export interface IReanimatedErrorConstructor extends Error {
  new (message?: string): ReanimatedError;
  (message?: string): ReanimatedError;
  readonly prototype: ReanimatedError;
}

export type ReanimatedError = Error & { name: 'Reanimated' }; // signed type
