type ReanimatedError = Error & 'ReanimatedError'; // signed type

interface ReanimatedErrorConstructor extends Error {
  new (message?: string): ReanimatedError;
  (message?: string): ReanimatedError;
  readonly prototype: ReanimatedError;
}

const ReanimatedErrorConstructor: ReanimatedErrorConstructor =
  function ReanimatedError(message?: string) {
    'worklet';
    const prefix = '[Reanimated]';
    // eslint-disable-next-line reanimated/use-reanimated-error
    const errorInstance = new Error(message ? `${prefix} ${message}` : prefix);
    errorInstance.name = 'ReanimatedError';
    return errorInstance;
  } as ReanimatedErrorConstructor;

export { ReanimatedErrorConstructor as ReanimatedError };
