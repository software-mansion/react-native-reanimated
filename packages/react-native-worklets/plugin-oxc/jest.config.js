// Runs the Babel plugin's own test suite against the OXC plugin, unmodified:
// `rootDir` points at ../plugin, `testMatch` selects the bundle-mode suites we
// support, and `moduleNameMapper` swaps the plugin under test for our shim.
const path = require('path');

const pluginDir = path.join(__dirname, '..', 'plugin');

module.exports = {
  ...require('../plugin/jest.config.js'),
  rootDir: pluginDir,
  testMatch: [
    '<rootDir>/__tests__/plugin-bundleMode.test.ts',
    '<rootDir>/__tests__/plugin-shared.test.ts',
  ],
  testNamePattern:
    '^(?!.*bundleless)(?!.*does not flip the flag without bundleMode option)',
  setupFilesAfterEnv: [
    ...(require('../plugin/jest.config.js').setupFilesAfterEnv ?? []),
    path.join(__dirname, 'jest', 'captureEmittedFiles.js'),
  ],
  moduleNameMapper: {
    '^\\.\\./index$': path.join(__dirname, 'jest', 'mockPluginVersion.js'),
  },
};
