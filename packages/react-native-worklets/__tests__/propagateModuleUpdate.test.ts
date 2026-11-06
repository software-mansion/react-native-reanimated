const mockWorklets = require('../src/mock');

describe('propagateModuleUpdate', () => {
  test('mock exposes propagateModuleUpdate on WorkletsModule', () => {
    expect(typeof mockWorklets.WorkletsModule.propagateModuleUpdate).toBe(
      'function'
    );
    expect(() => {
      mockWorklets.WorkletsModule.propagateModuleUpdate('code', 'source.js');
    }).not.toThrow();
  });
});
