'use strict';

import { prepareUIRegistry } from '../FrameCallbackRegistryUI.native';

describe('FrameCallbackRegistryUI (native)', () => {
  beforeEach(() => {
    prepareUIRegistry();
  });

  test('unregistering an unknown callback is a no-op', () => {
    expect(() => {
      global._frameCallbackRegistry.unregisterFrameCallback(42);
    }).not.toThrow();
  });

  test('deactivating an unknown callback is a no-op', () => {
    expect(() => {
      global._frameCallbackRegistry.manageStateFrameCallback(42, false);
    }).not.toThrow();
  });

  test('activating an unknown callback is a no-op', () => {
    global._frameCallbackRegistry.manageStateFrameCallback(42, true);

    expect(global._frameCallbackRegistry.activeFrameCallbacks.has(42)).toBe(
      false
    );
  });
});
