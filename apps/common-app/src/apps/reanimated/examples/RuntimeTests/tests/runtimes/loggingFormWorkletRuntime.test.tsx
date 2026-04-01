import { beforeEach, describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

describe('loggingFromWorkletRuntime', () => {
  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('nativeLoggingHook is set', () => {
      expect(globalThis.nativeLoggingHook);
    });
  }
});
