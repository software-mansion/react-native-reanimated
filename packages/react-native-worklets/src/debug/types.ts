'use strict';

export type WorkletsError = Error & { name: 'Worklets' }; // signed type

export interface IWorkletsErrorConstructor extends Error {
  new (message?: string): WorkletsError;
  (message?: string): WorkletsError;
  readonly prototype: WorkletsError;
}
