'use strict';

import type {
  IWorkletsErrorConstructor,
  WorkletsError as IWorkletsError,
} from './types';

function WorkletsErrorConstructor(message?: string): IWorkletsError {
  const prefix = '[Worklets]';

  // eslint-disable-next-line reanimated/use-worklets-error
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = `WorkletsError`;
  return errorInstance as IWorkletsError;
}

export const WorkletsError =
  WorkletsErrorConstructor as IWorkletsErrorConstructor;
