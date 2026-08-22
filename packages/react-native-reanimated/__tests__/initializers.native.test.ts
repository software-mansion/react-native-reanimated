/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
// The recommended Worklets Jest setup for consumers - makes the module-scope
// Worklets calls of the native files below work on the test runtime.
jest.mock('react-native-worklets', () =>
  require('../../react-native-worklets/src/mock')
);

describe('initializers.native under Jest', () => {
  test('initializing the Reanimated module does not throw without the Jest resolver', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Requiring the native file explicitly bypasses the Jest resolver's web
    // redirection - this mimics a consumer project that has not configured
    // the resolver, where this file used to crash at initialization with
    // "[Reanimated] `setCSSEventHandler` is not available in JSReanimated."
    const {
      initializeReanimatedModule,
    } = require('../src/initializers.native');
    const { ReanimatedModule } = require('../src/ReanimatedModule');

    expect(() => initializeReanimatedModule(ReanimatedModule)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('react-native-reanimated/jest/resolver')
    );

    warnSpy.mockRestore();
  });
});
