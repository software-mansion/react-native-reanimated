process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION = '1';

/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config.js'),
  moduleNameMapper: {
    '^\\.\\./plugin$': '<rootDir>/plugin-oxc/babel.js',
  },
};
