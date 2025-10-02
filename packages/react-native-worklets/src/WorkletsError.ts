'use strict';

function WorkletsErrorConstructor(message?: string) {
  const prefix = '[Worklets]';

  // eslint-disable-next-line reanimated/use-worklets-error
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = `WorkletsError`;
  return errorInstance;
}

export const WorkletsError = WorkletsErrorConstructor;
