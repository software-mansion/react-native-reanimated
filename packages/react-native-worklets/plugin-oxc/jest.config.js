const path = require('path');

const pluginDir = path.join(__dirname, '..', 'plugin');

process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';

/** @type {import('jest').Config} */
module.exports = {
  ...require('../plugin/jest.config.js'),
  rootDir: pluginDir,
  moduleNameMapper: {
    '^\\.\\./index$': path.join(__dirname, 'babel.js'),
  },
  snapshotResolver: path.join(__dirname, 'jest', 'snapshotResolver.js'),
};
