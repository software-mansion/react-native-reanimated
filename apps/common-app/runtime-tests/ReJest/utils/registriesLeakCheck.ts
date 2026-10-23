export const NO_LEAKS = 'no leaks';

export function leakingRegistries() {
  if (typeof global._registriesLeakCheck !== 'function') {
    return '`_registriesLeakCheck` is missing - it is only installed in a build with IS_REANIMATED_EXAMPLE_APP';
  }

  const leaking = global
    ._registriesLeakCheck()
    .split('\n')
    .filter((line) => line.includes('❌'))
    .map((line) => line.trim())
    .join(', ');

  return leaking === '' ? NO_LEAKS : leaking;
}
