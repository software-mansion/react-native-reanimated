const path = require('path');

const pluginDir = path.join(__dirname, '..', 'plugin');

process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';

module.exports = {
  ...require('../plugin/jest.config.js'),
  rootDir: pluginDir,
  testMatch: [
    '<rootDir>/__tests__/plugin-bundleMode.test.ts',
    '<rootDir>/__tests__/plugin-shared.test.ts',
  ],
  testNamePattern:
    '^(?!.*bundleless)(?!.*does not flip the flag without bundleMode option)',
  moduleNameMapper: {
    '^\\.\\./index$': path.join(__dirname, 'babel.js'),
  },
};
