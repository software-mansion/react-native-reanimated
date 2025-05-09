'use strict';

// signed type

const ReanimatedErrorConstructor = function ReanimatedError(message) {
  'worklet';

  const prefix = '[Reanimated]';
  // eslint-disable-next-line reanimated/use-reanimated-error
  const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
  errorInstance.name = 'ReanimatedError';
  return errorInstance;
};
export { ReanimatedErrorConstructor as ReanimatedError };
//# sourceMappingURL=errors.js.map