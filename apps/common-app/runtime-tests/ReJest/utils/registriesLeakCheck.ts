export const NO_LEAKS = 'no leaks';

// Returns NO_LEAKS when no Reanimated registry holds a value, otherwise the
// leaking registries, so a failed check names them.
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
