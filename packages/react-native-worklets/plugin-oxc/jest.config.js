const path = require('path');

const pluginDir = path.join(__dirname, '..', 'plugin');

module.exports = {
  ...require('../plugin/jest.config.js'),
  rootDir: pluginDir,
  testMatch: [
    '<rootDir>/__tests__/plugin-bundleMode.test.ts',
    '<rootDir>/__tests__/plugin-shared.test.ts',
  ],
  testNamePattern: '^(?!.*bundleless)',
  setupFilesAfterEnv: [
    ...(require('../plugin/jest.config.js').setupFilesAfterEnv ?? []),
    path.join(__dirname, 'jest', 'captureEmittedFiles.js'),
  ],
  moduleNameMapper: {
    '^\\.\\./index$': path.join(__dirname, 'jest', 'mockPluginVersion.js'),
  },
};
